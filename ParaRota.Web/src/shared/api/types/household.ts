export type HouseholdMemberRole = 'owner' | 'admin' | 'member';
export type HouseholdMemberStatus = 'active' | 'removed';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type LeaveMode = 'transfer' | 'personal' | 'delete';

export interface HouseholdDto {
  id: number;
  name: string;
  ownerUserId: number;
  ownerName: string;
  currency: string;
  memberCount: number;
  myRole: HouseholdMemberRole;
  createdDate: string;
}

export interface HouseholdMemberDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: HouseholdMemberRole;
  status: HouseholdMemberStatus;
  joinedAt: string;
}

export interface HouseholdInviteDto {
  id: number;
  email: string;
  token: string;
  expiresAt: string;
  status: InviteStatus;
  invitedByName: string;
  createdDate: string;
}

/** Yeni aile oluştururken mevcut kişisel verilerle ne yapılacağını belirler. */
export const HouseholdTransferMode = {
  /** Mevcut veriler kişisel kalır; sadece yeni kayıtlar ailede olur (varsayılan). */
  None: 0,
  /** Mevcut kayıtların HouseholdId taşınır → kişisel hesap BOŞALIR. */
  Move: 1,
} as const;
export type HouseholdTransferMode = (typeof HouseholdTransferMode)[keyof typeof HouseholdTransferMode];

export interface CreateHouseholdRequest {
  name: string;
  currency?: string;
  /** 0=None | 1=Move. */
  transferMode: HouseholdTransferMode;
}

export interface UpdateHouseholdRequest {
  name: string;
}

export interface InviteToHouseholdRequest {
  email: string;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface AcceptInviteResult {
  householdId: number;
  householdName: string;
}

export interface LeaveHouseholdRequest {
  mode: LeaveMode;
  /** Mode='transfer' iken zorunlu — yeni owner kullanıcı id'si. */
  targetUserId?: number;
}

export interface TransferOwnershipRequest {
  newOwnerUserId: number;
}

export interface UpdateMemberRoleRequest {
  role: HouseholdMemberRole;
}
