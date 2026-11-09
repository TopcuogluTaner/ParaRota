namespace ParaRota.Domain.Enums;

/// <summary>Fiyat alarmı yönü.</summary>
public enum AlarmDirection
{
    /// <summary>Fiyat eşiğin üstüne çıkınca tetiklenir.</summary>
    Above = 1,

    /// <summary>Fiyat eşiğin altına inince tetiklenir.</summary>
    Below = 2,
}
