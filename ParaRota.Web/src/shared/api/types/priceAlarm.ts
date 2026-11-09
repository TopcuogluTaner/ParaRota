// Fiyat Alarmı — bir varlığın güncel TL fiyatı eşiği aşınca bildirim. Enum'lar camelCase serialize.
import type { AssetType } from './investments';

export type AlarmDirection = 'above' | 'below';
export type AlarmStatus = 'active' | 'triggered';

export interface PriceAlarmDto {
  id: number;
  assetType: AssetType;
  // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
  fundCode?: string | null;
  fundName?: string | null;
  direction: AlarmDirection;
  thresholdPrice: number;
  status: AlarmStatus;
  lastPrice?: number | null;
  lastCheckedAt?: string | null;
  triggeredPrice?: number | null;
  triggeredAt?: string | null;
  note?: string | null;
  currentPrice?: number | null;
  createdDate: string;
}

export interface CreatePriceAlarmRequest {
  assetType: AssetType;
  // AssetType === 'tefasFund' iken zorunlu: TEFAS fon kodu (ör. "AFA").
  fundCode?: string | null;
  direction: AlarmDirection;
  thresholdPrice: number;
  note?: string | null;
}

export interface UpdatePriceAlarmRequest {
  direction: AlarmDirection;
  thresholdPrice: number;
  note?: string | null;
}
