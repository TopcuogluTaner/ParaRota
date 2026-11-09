using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Context;

public class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IHttpContextAccessor? httpContextAccessor = null)
    : IdentityDbContext<AppUser, AppRole, int>(options)
{
    private readonly IHttpContextAccessor? _httpContextAccessor = httpContextAccessor;

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ErrorLog> ErrorLogs => Set<ErrorLog>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<RecurringRule> RecurringRules => Set<RecurringRule>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();

    public DbSet<Household> Households => Set<Household>();
    public DbSet<HouseholdMember> HouseholdMembers => Set<HouseholdMember>();
    public DbSet<HouseholdInvite> HouseholdInvites => Set<HouseholdInvite>();

    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<DebtPayment> DebtPayments => Set<DebtPayment>();

    public DbSet<InvestmentHolding> InvestmentHoldings => Set<InvestmentHolding>();
    public DbSet<AssetPriceSnapshot> AssetPriceSnapshots => Set<AssetPriceSnapshot>();

    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();

    public DbSet<SubscriptionCatalogItem> SubscriptionCatalogItems => Set<SubscriptionCatalogItem>();
    public DbSet<SeveranceCeiling> SeveranceCeilings => Set<SeveranceCeiling>();

    public DbSet<GoldDay> GoldDays => Set<GoldDay>();
    public DbSet<GoldDayMember> GoldDayMembers => Set<GoldDayMember>();
    public DbSet<GoldDayMeeting> GoldDayMeetings => Set<GoldDayMeeting>();
    public DbSet<GoldDayContribution> GoldDayContributions => Set<GoldDayContribution>();

    public DbSet<PriceAlarm> PriceAlarms => Set<PriceAlarm>();

    public DbSet<SharedPot> SharedPots => Set<SharedPot>();
    public DbSet<SharedPotMember> SharedPotMembers => Set<SharedPotMember>();
    public DbSet<SharedExpense> SharedExpenses => Set<SharedExpense>();
    public DbSet<SharedExpenseShare> SharedExpenseShares => Set<SharedExpenseShare>();
    public DbSet<SharedSettlement> SharedSettlements => Set<SharedSettlement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(AssemblyReference.Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var property = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                var notDeleted = Expression.Equal(property, Expression.Constant(false));
                var lambda = Expression.Lambda(notDeleted, parameter);

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChanges();
    }

    private void ApplyAuditAndSoftDelete()
    {
        var currentUser = _httpContextAccessor?.HttpContext?.User?.Identity?.Name;
        var now = DateTime.Now;

        foreach (EntityEntry entry in ChangeTracker.Entries())
        {
            if (entry.Entity is IAuditable auditable)
            {
                if (entry.State == EntityState.Added)
                {
                    auditable.CreatedDate = now;
                    auditable.CreatedUser = currentUser;
                }
                else if (entry.State == EntityState.Modified)
                {
                    auditable.EditDate = now;
                    auditable.EditUser = currentUser;
                }
            }

            if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable soft)
            {
                entry.State = EntityState.Modified;
                soft.IsDeleted = true;
                if (entry.Entity is IAuditable a)
                {
                    a.EditDate = now;
                    a.EditUser = currentUser;
                }
            }
        }
    }
}
