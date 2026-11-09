// Ortak Kasa — grup masrafı + "kim kime borçlu". Enum'lar camelCase string serialize.
export type SharedPotStatus = 'active' | 'archived';
export type ExpenseSplitType = 'equal' | 'exact';

export interface SharedPotListItemDto {
  id: number;
  name: string;
  currency: string;
  status: SharedPotStatus;
  memberCount: number;
  expenseCount: number;
  totalSpent: number;
  myBalance?: number | null;
  createdDate: string;
}

export interface SharedPotMemberDto {
  id: number;
  name: string;
  linkedUserId?: number | null;
  isSelf: boolean;
  paid: number;
  owed: number;
  balance: number;
}

export interface SharedExpenseShareDto {
  memberId: number;
  memberName: string;
  shareAmount: number;
}

export interface SharedExpenseDto {
  id: number;
  description: string;
  amount: number;
  expenseDate: string;
  payerMemberId: number;
  payerName: string;
  splitType: ExpenseSplitType;
  note?: string | null;
  canEdit: boolean;
  shares: SharedExpenseShareDto[];
  createdDate: string;
}

export interface SharedSettlementDto {
  id: number;
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
  settledOn: string;
  note?: string | null;
  canEdit: boolean;
}

export interface SettlementSuggestionDto {
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
}

export interface SharedPotDetailDto {
  id: number;
  name: string;
  currency: string;
  note?: string | null;
  status: SharedPotStatus;
  isOwner: boolean;
  myMemberId?: number | null;
  totalSpent: number;
  createdDate: string;
  members: SharedPotMemberDto[];
  expenses: SharedExpenseDto[];
  settlements: SharedSettlementDto[];
  suggestions: SettlementSuggestionDto[];
}

export interface SharedPotCandidateDto {
  userId: number;
  name: string;
}

// ── İstek gövdeleri ──
export interface CreateSharedPotMemberInput {
  name?: string | null;
  linkedUserId?: number | null;
}
export interface CreateSharedPotRequest {
  name: string;
  currency?: string | null;
  note?: string | null;
  members: CreateSharedPotMemberInput[];
}
export interface UpdateSharedPotRequest {
  name: string;
  note?: string | null;
}
export interface AddSharedPotMemberRequest {
  name?: string | null;
  linkedUserId?: number | null;
}
export interface ExpenseShareInput {
  memberId: number;
  shareAmount: number;
}
export interface CreateSharedExpenseRequest {
  description: string;
  amount: number;
  expenseDate?: string | null;
  payerMemberId: number;
  splitType: ExpenseSplitType;
  participantMemberIds: number[];
  exactShares?: ExpenseShareInput[] | null;
  note?: string | null;
}
export interface CreateSettlementRequest {
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  settledOn?: string | null;
  note?: string | null;
}
