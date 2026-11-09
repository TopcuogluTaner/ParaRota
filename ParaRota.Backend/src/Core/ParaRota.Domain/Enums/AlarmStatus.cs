namespace ParaRota.Domain.Enums;

/// <summary>Fiyat alarmı durumu.</summary>
public enum AlarmStatus
{
    /// <summary>İzleniyor.</summary>
    Active = 1,

    /// <summary>Eşik aşıldı, tetiklendi (yeniden kurulana dek sessiz).</summary>
    Triggered = 2,
}
