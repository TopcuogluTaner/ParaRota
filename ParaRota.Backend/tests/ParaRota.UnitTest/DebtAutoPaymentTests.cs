using AutoMapper;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;
using ParaRota.Persistence.Services;

namespace ParaRota.UnitTest;

/// <summary>
/// Borç finansal mantığı için entegrasyon testleri (EF Core InMemory):
///   1) Basit (düz) faiz: stored Amount = anapara × (1 + oran/100).
///   2) Off-by-one: auto kuralın EndDate'i tam N taksit üretecek şekilde (Start + (N-1)·freq).
///   3) Auto-mod taksit ödemesi: RunDueAsync üretilen taksitleri borca işler, son taksitte
///      tam kalanı kapatır (yuvarlama artığı), borcu Completed yapar; idempotenttir.
/// Not: DB-seviyesi kısıtlar (unique index 23505) provider'a özgü olduğundan burada test
/// edilmez (prod pre-flight + review ile kapatıldı); bu testler MANTIĞI doğrular.
/// </summary>
public class DebtAutoPaymentTests
{
    private const int UserId = 1;

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            // CreateAsync transaction kullanıyor; InMemory transaction'ı yok sayar.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static Category SeedDebtCategory(AppDbContext ctx)
    {
        var cat = new Category
        {
            Name = "Borç Ödeme",
            Type = TransactionType.Expense,
            IsSystem = true,
            UserId = null,
        };
        ctx.Categories.Add(cat);
        ctx.SaveChanges();
        return cat;
    }

    private static (DebtService debt, RecurringRuleService recurring) BuildServices(AppDbContext ctx)
    {
        var mapper = new Mock<IMapper>();
        // DebtService, linked rule'un Id'sini okuyor — bu maplemeyi gerçekçi tut.
        mapper.Setup(m => m.Map<RecurringRuleDto>(It.IsAny<RecurringRule>()))
              .Returns((RecurringRule r) => new RecurringRuleDto { Id = r.Id });

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(x => x.ActiveHouseholdId).Returns((int?)null);

        var dispatcher = new Mock<INotificationDispatcher>();
        dispatcher.Setup(d => d.DispatchAsync(It.IsAny<NotificationEnvelope>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        var payroll = new Mock<IPayrollService>();

        var recurring = new RecurringRuleService(
            ctx, mapper.Object, NullLogger<RecurringRuleService>.Instance, dispatcher.Object, payroll.Object, currentUser.Object);

        var debt = new DebtService(
            ctx, mapper.Object, currentUser.Object, recurring, dispatcher.Object,
            Options.Create(new DebtReminderSettings()), NullLogger<DebtService>.Instance);

        return (debt, recurring);
    }

    [Fact]
    public async Task CreateAsync_ManualWithInterest_BakesInterestIntoAmount()
    {
        using var ctx = NewContext();
        SeedDebtCategory(ctx);
        var (debtSvc, _) = BuildServices(ctx);

        var dto = new CreateDebtDto
        {
            Title = "Kredi",
            Kind = DebtKind.Payable,
            Amount = 1000m,
            Currency = "TRY",
            CounterpartyName = "Banka",
            InterestRate = 10m,
            StartDate = DateTime.Now,
            PaymentMode = PaymentMode.Manual,
        };

        var res = await debtSvc.CreateAsync(UserId, dto);

        res.IsSuccess.Should().BeTrue();
        var debt = ctx.Debts.Single();
        debt.Amount.Should().Be(1100m);          // 1000 × 1.10
        debt.RemainingAmount.Should().Be(1100m);
    }

    [Fact]
    public async Task CreateAsync_Auto_LinkedRule_GeneratesExactlyNInstallments()
    {
        using var ctx = NewContext();
        SeedDebtCategory(ctx);
        var (debtSvc, _) = BuildServices(ctx);

        var start = DateTime.Now.Date;
        var dto = new CreateDebtDto
        {
            Title = "Taksitli",
            Kind = DebtKind.Payable,
            Amount = 1000m,
            Currency = "TRY",
            CounterpartyName = "Mağaza",
            InterestRate = 0m,
            StartDate = start,
            InstallmentCount = 3,
            InstallmentFrequency = DebtFrequency.Monthly,
            PaymentMode = PaymentMode.Auto,
        };

        var res = await debtSvc.CreateAsync(UserId, dto);

        res.IsSuccess.Should().BeTrue();
        ctx.Debts.Single().Amount.Should().Be(1000m); // faiz 0

        var rule = ctx.RecurringRules.Single();
        // Off-by-one: son taksit Start + (N-1)·freq; EndDate buraya kadar (kapsayıcı döngü → tam N).
        rule.EndDate.Should().Be(start.AddMonths(2));
        rule.Amount.Should().Be(333.33m);              // round(1000/3, AwayFromZero)
    }

    [Fact]
    public async Task RunDueAsync_AutoDebt_PaysDownToZero_AbsorbsResidue_AndIsIdempotent()
    {
        using var ctx = NewContext();
        var cat = SeedDebtCategory(ctx);
        var (_, recurring) = BuildServices(ctx);

        var now = DateTime.Now;
        // 3 aylık taksit hepsi vadesi gelmiş olacak şekilde, ama kural hâlâ aktif (EndDate gelecekte)
        // ki RunDueAsync due-filtresine (NextRunDate<=now && EndDate>=now) takılsın.
        var start = now.AddDays(-70);
        var rule = new RecurringRule
        {
            UserId = UserId,
            Type = TransactionType.Expense,
            Nature = TransactionNature.Fixed,
            CategoryId = cat.Id,
            Amount = 366.67m,                 // round(1100/3, AwayFromZero)
            Currency = "TRY",
            Frequency = RecurringFrequency.Monthly,
            StartDate = start,
            EndDate = now.AddDays(30),
            NextRunDate = start,
            AutoApprove = true,
            IsActive = true,
            Description = "Borç taksiti",
        };
        ctx.RecurringRules.Add(rule);
        ctx.SaveChanges();

        var debt = new Debt
        {
            UserId = UserId,
            Title = "Auto borç",
            Kind = DebtKind.Payable,
            Amount = 1100m,
            RemainingAmount = 1100m,
            Currency = "TRY",
            CounterpartyName = "Banka",
            InstallmentCount = 3,
            InstallmentFrequency = DebtFrequency.Monthly,
            PaymentMode = PaymentMode.Auto,
            LinkedRecurringRuleId = rule.Id,
            Status = DebtStatus.Active,
            StartDate = start,
        };
        ctx.Debts.Add(debt);
        ctx.SaveChanges();

        await recurring.RunDueAsync();

        // Tam 3 taksit işlemi üretildi.
        ctx.Transactions.Count(t => t.RecurringRuleId == rule.Id).Should().Be(3);

        var reloaded = ctx.Debts.Single(d => d.Id == debt.Id);
        reloaded.RemainingAmount.Should().Be(0m);
        reloaded.Status.Should().Be(DebtStatus.Completed);

        var payments = ctx.DebtPayments.Where(p => p.DebtId == debt.Id).OrderBy(p => p.PaymentDate).ToList();
        payments.Should().HaveCount(3);
        payments.Sum(p => p.Amount).Should().Be(1100m);   // yuvarlama artığı son taksitte kapandı
        payments[^1].Amount.Should().Be(366.66m);          // 1100 − 2×366.67

        // İdempotency: tekrar çalıştır → çift ödeme yok, durum değişmez.
        await recurring.RunDueAsync();
        ctx.DebtPayments.Count(p => p.DebtId == debt.Id).Should().Be(3);
        ctx.Debts.Single(d => d.Id == debt.Id).RemainingAmount.Should().Be(0m);
    }

    [Fact]
    public async Task CreateAsync_AutoTodayStart_AppliesFirstInstallmentImmediately()
    {
        using var ctx = NewContext();
        SeedDebtCategory(ctx);
        var (debtSvc, _) = BuildServices(ctx);

        var dto = new CreateDebtDto
        {
            Title = "Bugün başlayan",
            Kind = DebtKind.Payable,
            Amount = 1000m,
            Currency = "TRY",
            CounterpartyName = "Mağaza",
            InterestRate = 0m,
            StartDate = DateTime.Now.Date,
            InstallmentCount = 3,
            InstallmentFrequency = DebtFrequency.Monthly,
            PaymentMode = PaymentMode.Auto,
        };

        var res = await debtSvc.CreateAsync(UserId, dto);
        res.IsSuccess.Should().BeTrue();

        // Immediate-execute ilk taksiti üretti; DebtService link sonrası reconcile onu borca işledi
        // (eskiden bu ödeme bir sonraki Hangfire run'ına kadar görünmüyordu).
        var debt = ctx.Debts.Single();
        var payments = ctx.DebtPayments.Where(p => p.DebtId == debt.Id).ToList();
        payments.Should().HaveCount(1);
        payments[0].Amount.Should().Be(333.33m);     // round(1000/3)
        debt.RemainingAmount.Should().Be(666.67m);    // 1000 − 333.33
        debt.Status.Should().Be(DebtStatus.Active);   // 1/3 ödendi, henüz tamamlanmadı
    }
}
