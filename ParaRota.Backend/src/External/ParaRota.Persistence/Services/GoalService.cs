using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class GoalService(
    AppDbContext context,
    IMapper mapper,
    INotificationDispatcher dispatcher,
    ICurrentUserService currentUser) : IGoalService
{
    public async Task<ApiResponse<IReadOnlyList<GoalDto>>> GetAllAsync(int userId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var q = scope.HasValue
            ? context.Goals.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Goals.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        // Memory safety: paginated DTO eklenene kadar 500'lük üst sınır.
        var items = await q
            .OrderByDescending(x => x.Priority)
            .ThenBy(x => x.TargetDate)
            .Take(500)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(mapper.Map<GoalDto>).ToList();
        return ApiResponse<IReadOnlyList<GoalDto>>.Success(dtos);
    }

    public async Task<ApiResponse<GoalDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Goals.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Goals.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<GoalDto>.Fail("Hedef bulunamadı.", 404, errorCode: ErrorCodes.GoalNotFound);

        return ApiResponse<GoalDto>.Success(mapper.Map<GoalDto>(entity));
    }

    public async Task<ApiResponse<GoalDto>> CreateAsync(int userId, CreateGoalDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<GoalDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<GoalDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        var entity = new Goal
        {
            UserId = userId,
            HouseholdId = targetHouseholdId,
            Name = dto.Name,
            TargetAmount = dto.Target,
            CurrentAmount = 0m,
            TargetDate = dto.TargetDate,
            Priority = dto.Priority,
            Status = GoalStatus.Active,
            Emoji = dto.Emoji,
            Currency = "TRY",
        };

        await context.Goals.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        var created = await context.Goals
            .AsNoTracking()
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<GoalDto>.Success(mapper.Map<GoalDto>(created), "Hedef eklendi.", 201);
    }

    public async Task<ApiResponse<GoalDto>> UpdateAsync(int userId, int id, UpdateGoalDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Goals.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Goals.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<GoalDto>.Fail("Hedef bulunamadı.", 404, errorCode: ErrorCodes.GoalNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<GoalDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Eski status'u trigger için sakla.
        var previousStatus = entity.Status;

        entity.Name = dto.Name;
        entity.TargetAmount = dto.Target;
        entity.CurrentAmount = dto.Current;
        entity.TargetDate = dto.TargetDate;
        entity.Priority = dto.Priority;
        entity.Status = dto.Status;
        entity.Emoji = dto.Emoji;

        await context.SaveChangesAsync(cancellationToken);

        // Hedef tamamlandı tetiği: current >= target VE önceki status Completed değildiyse.
        if (previousStatus != GoalStatus.Completed
            && entity.CurrentAmount >= entity.TargetAmount
            && entity.TargetAmount > 0m)
        {
            var payload = JsonSerializer.Serialize(new
            {
                goalName = entity.Name,
                target = entity.TargetAmount,
                current = entity.CurrentAmount,
            });

            var envelope = new NotificationEnvelope(
                UserId: userId,
                Type: NotificationType.GoalCompleted,
                Severity: NotificationSeverity.Success,
                TitleKey: "notif_goal_completed_title",
                MessageKey: "notif_goal_completed_body",
                Payload: payload,
                RefType: "goal",
                RefId: entity.Id,
                DedupKey: $"goal:{entity.Id}:completed",
                PushTitle: "Hedef tamamlandı",
                PushBody: $"{entity.Name} hedefine ulaştın!");

            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }

        var updated = await context.Goals
            .AsNoTracking()
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<GoalDto>.Success(mapper.Map<GoalDto>(updated), "Hedef güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Goals.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Goals.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Hedef bulunamadı.", 404, errorCode: ErrorCodes.GoalNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        context.Goals.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
        return ApiResponse<string>.Success("", "Hedef silindi.");
    }
}
