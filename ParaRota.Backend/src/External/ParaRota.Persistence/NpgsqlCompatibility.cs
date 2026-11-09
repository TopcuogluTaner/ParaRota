using System.Runtime.CompilerServices;

namespace ParaRota.Persistence;

internal static class NpgsqlCompatibility
{
    [ModuleInitializer]
    internal static void Initialize()
    {
        // Project rule: DateTime.Now (Kind=Local) kullanılır.
        // Npgsql 6+ varsayılanda timestamptz'e yalnız UTC yazılmasını ister; legacy mode bunu gevşetir.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
        AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);
    }
}
