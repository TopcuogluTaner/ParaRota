using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Application.Services;
using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Repositories;
using ParaRota.Persistence.Context;
using ParaRota.Persistence.Repositories;
using ParaRota.Persistence.Services;

namespace ParaRota.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var environment = configuration["AppSettings:Environment"] ?? "TEST";
        var connectionString =
            configuration[$"EnvConfig:{environment}:ConnectionStrings:DefaultConnection"]
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                $"Connection string bulunamadı. AppSettings:Environment={environment}");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, b =>
                b.MigrationsAssembly(AssemblyReference.Assembly.GetName().Name)));

        services.Configure<DebtReminderSettings>(configuration.GetSection(DebtReminderSettings.SectionName));
        services.Configure<Application.Common.Settings.GoogleAuthSettings>(
            configuration.GetSection(Application.Common.Settings.GoogleAuthSettings.SectionName));
        services.Configure<Application.Common.Settings.AppleAuthSettings>(
            configuration.GetSection(Application.Common.Settings.AppleAuthSettings.SectionName));

        services
            .AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;

                // Hesap kilitleme (lockout) — brute-force koruması.
                // Tekrarlı hatalı parola denemesinde hesap geçici kilitlenir.
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IRecurringRuleService, RecurringRuleService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IGoalService, GoalService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IDeviceTokenService, DeviceTokenService>();
        services.AddScoped<IHouseholdService, HouseholdService>();
        services.AddScoped<IDebtService, DebtService>();
        services.AddScoped<IGoldDayService, GoldDayService>();
        services.AddScoped<IPriceAlarmService, PriceAlarmService>();
        services.AddScoped<ISharedPotService, SharedPotService>();
        services.AddScoped<IExportService, ExportService>();
        services.AddScoped<IMarketDataService, MarketDataService>();
        services.AddScoped<IInvestmentService, InvestmentService>();
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<ISubscriptionCatalogService, SubscriptionCatalogService>();
        services.AddScoped<ISeveranceCeilingService, SeveranceCeilingService>();
        services.AddScoped<ISystemLogService, SystemLogService>();
        services.AddScoped<IMonthlyDigestService, MonthlyDigestService>();
        services.AddScoped<IWeeklyDigestService, WeeklyDigestService>();
        services.AddScoped<IMonthlyPdfEmailService, MonthlyPdfEmailService>();
        services.AddScoped<IAiAssistService, AiAssistService>();

        return services;
    }
}
