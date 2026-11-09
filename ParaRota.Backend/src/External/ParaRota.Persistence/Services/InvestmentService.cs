using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class InvestmentService(
    AppDbContext context,
    IMapper mapper,
    IMarketDataService market,
    ICurrentUserService currentUser) : IInvestmentService
{
    public async Task<ApiResponse<PortfolioDto>> GetPortfolioAsync(int userId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var q = scope.HasValue
            ? context.InvestmentHoldings.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.InvestmentHoldings.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        var holdings = await q
            .OrderByDescending(x => x.PurchaseDate)
            .Take(500)
            .ToListAsync(cancellationToken);

        // Güncel fiyatı (varlık, fon kodu) başına bir kez çöz (snapshot okuması). TEFAS fonları
        // aynı AssetType altında FundCode ile ayrışır → anahtar (AssetType, FundCode).
        var keys = holdings.Select(h => (h.AssetType, h.FundCode)).Distinct().ToList();
        var spot = new Dictionary<(AssetType, string?), decimal?>();
        foreach (var (a, code) in keys)
            spot[(a, code)] = await market.GetSpotPriceAsync(a, code, cancellationToken);

        var assetTypes = holdings.Select(h => h.AssetType).Distinct().ToList();
        DateTime? lastUpdated = assetTypes.Count == 0
            ? null
            : await context.AssetPriceSnapshots.AsNoTracking()
                .Where(x => assetTypes.Contains(x.AssetType))
                .Select(x => (DateTime?)x.AsOf)
                .MaxAsync(cancellationToken);

        var items = new List<HoldingDto>(holdings.Count);
        decimal totalInvested = 0m, totalCurrent = 0m;

        foreach (var h in holdings)
        {
            var price = spot.TryGetValue((h.AssetType, h.FundCode), out var p) ? p : null;
            var dto = BuildDto(h, price, lastUpdated);
            items.Add(dto);
            totalInvested += h.InvestedAmount;
            totalCurrent += dto.CurrentValue;
        }

        var portfolio = new PortfolioDto
        {
            TotalInvested = totalInvested,
            TotalCurrentValue = totalCurrent,
            TotalProfitLoss = totalCurrent - totalInvested,
            TotalProfitLossPct = totalInvested > 0m ? Math.Round((totalCurrent - totalInvested) / totalInvested * 100m, 2, MidpointRounding.AwayFromZero) : 0m,
            LastUpdated = lastUpdated,
            Items = items,
        };

        return ApiResponse<PortfolioDto>.Success(portfolio);
    }

    public async Task<ApiResponse<HoldingDto>> CreateAsync(int userId, CreateHoldingDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<HoldingDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<HoldingDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        // TEFAS fonu ise kodu doğrula + adını yakala (ekleme anında tek istek; geçersiz kod
        // çöp kayıt oluşturmasın).
        string? fundCode = null;
        string? fundName = null;
        decimal fundPrice = 0m;
        if (dto.AssetType.IsTefas())
        {
            if (string.IsNullOrWhiteSpace(dto.FundCode))
                return ApiResponse<HoldingDto>.Fail("Fon kodu girilmeli.", 400, errorCode: ErrorCodes.FundCodeRequired);

            var quote = await market.LookupTefasFundAsync(dto.FundCode, cancellationToken);
            if (quote is null)
                return ApiResponse<HoldingDto>.Fail("Geçersiz TEFAS fon kodu.", 400, errorCode: ErrorCodes.FundCodeInvalid);
            fundCode = quote.Code;
            fundName = quote.Name;
            fundPrice = quote.Price;
        }

        // Alış günü birim fiyatı (çift giriş için).
        var unitPrice = await market.GetUnitPriceAsync(dto.AssetType, fundCode, dto.PurchaseDate, cancellationToken);
        if (unitPrice is null || unitPrice.Value <= 0m)
            return ApiResponse<HoldingDto>.Fail("Alış günü için fiyat verisi alınamadı. Lütfen sonra tekrar dene.", 502, errorCode: ErrorCodes.MarketDataUnavailable);

        if (!TryResolveQuantityAndInvested(dto.Quantity, dto.InvestedAmount, unitPrice.Value, out var quantity, out var invested))
            return ApiResponse<HoldingDto>.Fail("Tutar ya da adet/gram girilmeli.", 400, errorCode: ErrorCodes.HoldingAmountOrQuantityRequired);

        await using var trx = await context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            int? linkedTxId = null;
            if (dto.LinkToCashFlow)
            {
                var categoryId = await EnsureSystemCategoryAsync("Yatırım", TransactionType.Expense, "mdi:trending-up", "#2E7D32", cancellationToken);

                var tx = new Transaction
                {
                    UserId = userId,
                    HouseholdId = targetHouseholdId,
                    Type = TransactionType.Expense,
                    Nature = TransactionNature.Variable,
                    Status = TransactionStatus.Completed,
                    Source = TransactionSource.Manual,
                    CategoryId = categoryId,
                    Amount = invested,
                    Currency = "TRY",
                    TransactionDate = dto.PurchaseDate,
                    Notes = string.IsNullOrWhiteSpace(dto.Note) ? "Yatırım alımı" : dto.Note,
                };
                await context.Transactions.AddAsync(tx, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
                linkedTxId = tx.Id;
            }

            var entity = new InvestmentHolding
            {
                UserId = userId,
                HouseholdId = targetHouseholdId,
                AssetType = dto.AssetType,
                FundCode = fundCode,
                FundName = fundName,
                Quantity = quantity,
                InvestedAmount = invested,
                UnitPriceAtPurchase = unitPrice.Value,
                Currency = "TRY",
                PurchaseDate = dto.PurchaseDate,
                LinkedTransactionId = linkedTxId,
                Note = dto.Note,
            };
            await context.InvestmentHoldings.AddAsync(entity, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            await trx.CommitAsync(cancellationToken);

            // TEFAS: fiyatı snapshot'a yaz → pano/değerleme ertesi günkü job'u beklemeden görür.
            if (entity.AssetType.IsTefas() && fundCode is not null)
                await market.SaveTefasSnapshotAsync(fundCode, fundPrice, cancellationToken);

            var spot = await market.GetSpotPriceAsync(entity.AssetType, entity.FundCode, cancellationToken);
            return ApiResponse<HoldingDto>.Success(BuildDto(entity, spot, null), "Varlık eklendi.", 201);
        }
        catch
        {
            await trx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ApiResponse<HoldingDto>> UpdateAsync(int userId, int id, UpdateHoldingDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<HoldingDto>.Fail("Varlık bulunamadı.", 404, errorCode: ErrorCodes.HoldingNotFound);

        if (entity.UserId != userId)
            return ApiResponse<HoldingDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        var unitPrice = await market.GetUnitPriceAsync(entity.AssetType, entity.FundCode, dto.PurchaseDate, cancellationToken);
        if (unitPrice is null || unitPrice.Value <= 0m)
            return ApiResponse<HoldingDto>.Fail("Alış günü için fiyat verisi alınamadı.", 502, errorCode: ErrorCodes.MarketDataUnavailable);

        if (!TryResolveQuantityAndInvested(dto.Quantity, dto.InvestedAmount, unitPrice.Value, out var quantity, out var invested))
            return ApiResponse<HoldingDto>.Fail("Tutar ya da adet/gram girilmeli.", 400, errorCode: ErrorCodes.HoldingAmountOrQuantityRequired);

        // Not: bağlı işlem (LinkedTransaction) burada ezilmez — gerçek nakit hareketi kullanıcıya ait.
        entity.PurchaseDate = dto.PurchaseDate;
        entity.Quantity = quantity;
        entity.InvestedAmount = invested;
        entity.UnitPriceAtPurchase = unitPrice.Value;
        entity.Note = dto.Note;

        await context.SaveChangesAsync(cancellationToken);

        var spot = await market.GetSpotPriceAsync(entity.AssetType, entity.FundCode, cancellationToken);
        return ApiResponse<HoldingDto>.Success(BuildDto(entity, spot, null), "Varlık güncellendi.");
    }

    public async Task<ApiResponse<SellResultDto>> SellAsync(int userId, int id, SellHoldingDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<SellResultDto>.Fail("Varlık bulunamadı.", 404, errorCode: ErrorCodes.HoldingNotFound);

        if (entity.UserId != userId)
            return ApiResponse<SellResultDto>.Fail("Bu kaydı yalnız oluşturan satabilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Satılacak miktar: belirtilmemişse (null/0) tamamı; aksi halde mevcutla sınırlı.
        var qtyToSell = dto.Quantity is > 0m ? Math.Min(dto.Quantity.Value, entity.Quantity) : entity.Quantity;
        if (qtyToSell <= 0m)
            return ApiResponse<SellResultDto>.Fail("Satılacak miktar girilmeli.", 400, errorCode: ErrorCodes.HoldingAmountOrQuantityRequired);

        var salePrice = await market.GetUnitPriceAsync(entity.AssetType, entity.FundCode, dto.SaleDate, cancellationToken);
        if (salePrice is null || salePrice.Value <= 0m)
            return ApiResponse<SellResultDto>.Fail("Satış günü için fiyat verisi alınamadı.", 502, errorCode: ErrorCodes.MarketDataUnavailable);

        // Ortalama maliyetle gerçekleşen K/Z.
        var avgCost = entity.Quantity > 0m ? entity.InvestedAmount / entity.Quantity : 0m;
        var proceeds = Math.Round(qtyToSell * salePrice.Value, 2, MidpointRounding.AwayFromZero);
        var costBasis = Math.Round(qtyToSell * avgCost, 2, MidpointRounding.AwayFromZero);
        var realized = proceeds - costBasis;
        var fullyClosed = qtyToSell >= entity.Quantity;

        await using var trx = await context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (dto.LinkToCashFlow)
            {
                var categoryId = await EnsureSystemCategoryAsync("Yatırım Geliri", TransactionType.Income, "mdi:cash-plus", "#1FB585", cancellationToken);

                var tx = new Transaction
                {
                    UserId = userId,
                    HouseholdId = entity.HouseholdId,
                    Type = TransactionType.Income,
                    Nature = TransactionNature.Variable,
                    Status = TransactionStatus.Completed,
                    Source = TransactionSource.Manual,
                    CategoryId = categoryId,
                    Amount = proceeds,
                    Currency = "TRY",
                    TransactionDate = dto.SaleDate,
                    Notes = "Yatırım satışı",
                };
                await context.Transactions.AddAsync(tx, cancellationToken);
            }

            if (fullyClosed)
            {
                context.InvestmentHoldings.Remove(entity);
            }
            else
            {
                entity.Quantity -= qtyToSell;
                entity.InvestedAmount = Math.Round(entity.InvestedAmount - costBasis, 2, MidpointRounding.AwayFromZero);
            }

            await context.SaveChangesAsync(cancellationToken);
            await trx.CommitAsync(cancellationToken);

            var result = new SellResultDto { Proceeds = proceeds, RealizedProfitLoss = realized, FullyClosed = fullyClosed };
            return ApiResponse<SellResultDto>.Success(result, "Satış tamamlandı.");
        }
        catch
        {
            await trx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.InvestmentHoldings.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Varlık bulunamadı.", 404, errorCode: ErrorCodes.HoldingNotFound);

        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        // Bağlı işlem korunur (gerçek nakit hareketi) — yalnız holding soft-delete edilir.
        context.InvestmentHoldings.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
        return ApiResponse<string>.Success("", "Varlık silindi.");
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    // Çift giriş: biri girilirse diğeri o günkü kurdan türetilir.
    private static bool TryResolveQuantityAndInvested(
        decimal? quantityInput, decimal? investedInput, decimal unitPrice,
        out decimal quantity, out decimal invested)
    {
        if (quantityInput is > 0m)
        {
            quantity = quantityInput.Value;
            invested = Math.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);
            return true;
        }
        if (investedInput is > 0m)
        {
            invested = investedInput.Value;
            quantity = Math.Round(invested / unitPrice, 6, MidpointRounding.AwayFromZero);
            return true;
        }
        quantity = 0m;
        invested = 0m;
        return false;
    }

    // Sistem kategorisini bulur; yoksa anında oluşturur (backend restart'ı gerekmesin —
    // "Yatırım Geliri" gibi sonradan eklenen kategori seed'i çalışmamış olsa bile satış/alım
    // nakit bağlama 500 vermeden çalışır).
    private async Task<int> EnsureSystemCategoryAsync(string name, TransactionType type, string icon, string color, CancellationToken ct)
    {
        var id = await context.Categories
            .Where(c => c.IsSystem && c.UserId == null && c.Name == name && c.Type == type)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(ct);
        if (id != 0) return id;

        var category = new Category { Name = name, Icon = icon, Color = color, Type = type, UserId = null, IsSystem = true };
        await context.Categories.AddAsync(category, ct);
        await context.SaveChangesAsync(ct);
        return category.Id;
    }

    private HoldingDto BuildDto(InvestmentHolding h, decimal? spotPrice, DateTime? asOf)
    {
        var dto = mapper.Map<HoldingDto>(h);
        if (spotPrice is > 0m)
        {
            dto.CurrentUnitPrice = spotPrice.Value;
            dto.CurrentValue = Math.Round(h.Quantity * spotPrice.Value, 2, MidpointRounding.AwayFromZero);
            dto.ProfitLoss = dto.CurrentValue - h.InvestedAmount;
            dto.ProfitLossPct = h.InvestedAmount > 0m ? Math.Round(dto.ProfitLoss / h.InvestedAmount * 100m, 2, MidpointRounding.AwayFromZero) : 0m;
        }
        else
        {
            // Fiyat verisi henüz yok (job çalışmadı / ağ) → yanıltıcı %−100 yerine maliyeti
            // nötr göster. CurrentUnitPrice=0 → frontend "fiyat bekleniyor" gösterir.
            dto.CurrentUnitPrice = 0m;
            dto.CurrentValue = h.InvestedAmount;
            dto.ProfitLoss = 0m;
            dto.ProfitLossPct = 0m;
        }
        dto.PriceAsOf = asOf;
        return dto;
    }
}
