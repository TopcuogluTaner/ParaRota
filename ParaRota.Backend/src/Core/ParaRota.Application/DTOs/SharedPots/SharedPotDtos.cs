using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.SharedPots;

// ── Liste ───────────────────────────────────────────────────────────────────
public class SharedPotListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";
    public SharedPotStatus Status { get; set; }
    public int MemberCount { get; set; }
    public int ExpenseCount { get; set; }
    public decimal TotalSpent { get; set; }
    /// <summary>Kullanıcı kasada bağlı üyeyse net bakiyesi (+ alacaklı / − borçlu); değilse null.</summary>
    public decimal? MyBalance { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ── Detay ───────────────────────────────────────────────────────────────────
public class SharedPotDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";
    public string? Note { get; set; }
    public SharedPotStatus Status { get; set; }
    public bool IsOwner { get; set; }
    /// <summary>Kullanıcının bu kasadaki üye Id'si (bağlıysa); değilse null.</summary>
    public int? MyMemberId { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime CreatedDate { get; set; }
    public IReadOnlyList<SharedPotMemberDto> Members { get; set; } = [];
    public IReadOnlyList<SharedExpenseDto> Expenses { get; set; } = [];
    public IReadOnlyList<SharedSettlementDto> Settlements { get; set; } = [];
    /// <summary>"Kim kime borçlu" — minimum transferle sadeleştirilmiş ödeme önerileri.</summary>
    public IReadOnlyList<SettlementSuggestionDto> Suggestions { get; set; } = [];
}

public class SharedPotMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? LinkedUserId { get; set; }
    public bool IsSelf { get; set; }
    public decimal Paid { get; set; }
    public decimal Owed { get; set; }
    /// <summary>Net bakiye: + alacaklı, − borçlu.</summary>
    public decimal Balance { get; set; }
}

public class SharedExpenseDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public int PayerMemberId { get; set; }
    public string PayerName { get; set; } = string.Empty;
    public ExpenseSplitType SplitType { get; set; }
    public string? Note { get; set; }
    public bool CanEdit { get; set; }
    public IReadOnlyList<SharedExpenseShareDto> Shares { get; set; } = [];
    public DateTime CreatedDate { get; set; }
}

public class SharedExpenseShareDto
{
    public int MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public decimal ShareAmount { get; set; }
}

public class SharedSettlementDto
{
    public int Id { get; set; }
    public int FromMemberId { get; set; }
    public string FromName { get; set; } = string.Empty;
    public int ToMemberId { get; set; }
    public string ToName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime SettledOn { get; set; }
    public string? Note { get; set; }
    public bool CanEdit { get; set; }
}

public class SettlementSuggestionDto
{
    public int FromMemberId { get; set; }
    public string FromName { get; set; } = string.Empty;
    public int ToMemberId { get; set; }
    public string ToName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class SharedPotCandidateDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
}

// ── Create / Update ─────────────────────────────────────────────────────────
public class CreateSharedPotDto
{
    public string Name { get; set; } = string.Empty;
    public string? Currency { get; set; }
    public string? Note { get; set; }
    /// <summary>Sahip (creator) otomatik eklenir; buraya ek üyeler (serbest isim ya da aile üyesi).</summary>
    public List<CreateSharedPotMemberDto> Members { get; set; } = [];
}

public class CreateSharedPotMemberDto
{
    public string? Name { get; set; }
    public int? LinkedUserId { get; set; }
}

public class UpdateSharedPotDto
{
    public string Name { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class AddSharedPotMemberDto
{
    public string? Name { get; set; }
    public int? LinkedUserId { get; set; }
}

public class CreateSharedExpenseDto
{
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime? ExpenseDate { get; set; }
    public int PayerMemberId { get; set; }
    public ExpenseSplitType SplitType { get; set; }
    /// <summary>Equal: bu üyelere eşit bölünür (boşsa tüm üyeler).</summary>
    public List<int> ParticipantMemberIds { get; set; } = [];
    /// <summary>Exact: üye → tutar (toplamı Amount'a eşit olmalı).</summary>
    public List<ExpenseShareInputDto>? ExactShares { get; set; }
    public string? Note { get; set; }
}

public class ExpenseShareInputDto
{
    public int MemberId { get; set; }
    public decimal ShareAmount { get; set; }
}

public class CreateSettlementDto
{
    public int FromMemberId { get; set; }
    public int ToMemberId { get; set; }
    public decimal Amount { get; set; }
    public DateTime? SettledOn { get; set; }
    public string? Note { get; set; }
}
