// Gün / Altın günü — backend enum'ları camelCase string olarak gelir.
export type GoldDayType = 'gold' | 'currency';
export type GoldDayFrequency = 'monthly' | 'weekly' | 'biweekly';
export type GoldDayStatus = 'active' | 'completed';

export interface GoldDayListItemDto {
  id: number;
  name: string;
  contributionType: GoldDayType;
  contributionUnit: string;
  contributionAmount: number;
  status: GoldDayStatus;
  memberCount: number;
  nextMeetingDate?: string | null;
  nextHostName?: string | null;
  completedMeetings: number;
  potValueTry?: number | null;
}

export interface GoldDayMemberDto {
  id: number;
  name: string;
  order: number;
  isSelf: boolean;
}

export interface GoldDayContributionDto {
  id: number;
  memberId: number;
  memberName: string;
  isPaid: boolean;
  paidDate?: string | null;
}

export interface GoldDayMeetingDto {
  id: number;
  sequenceNo: number;
  meetingDate: string;
  hostMemberId: number;
  hostName: string;
  isCompleted: boolean;
  paidCount: number;
  contributionCount: number;
  contributions: GoldDayContributionDto[];
}

export interface GoldDayDetailDto {
  id: number;
  name: string;
  contributionType: GoldDayType;
  contributionUnit: string;
  contributionAmount: number;
  frequency: GoldDayFrequency;
  startDate: string;
  status: GoldDayStatus;
  potUnits: number;
  unitPriceTry?: number | null;
  potValueTry?: number | null;
  currentMeetingId?: number | null;
  members: GoldDayMemberDto[];
  meetings: GoldDayMeetingDto[];
}

export interface CreateGoldDayRequest {
  name: string;
  contributionType: GoldDayType;
  contributionUnit: string;
  contributionAmount: number;
  frequency: GoldDayFrequency;
  startDate: string;
  members: { name: string; isSelf: boolean }[];
}

export interface UpdateGoldDayRequest {
  name: string;
}
