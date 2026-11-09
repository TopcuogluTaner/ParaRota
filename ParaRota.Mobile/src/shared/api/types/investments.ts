// Faz 6 — yatırım/portföy. Backend enum'ları camelCase string serialize edilir.
export type AssetType =
  | 'goldGram' | 'goldQuarter' | 'goldHalf' | 'goldFull' | 'goldRepublic'
  | 'usd' | 'eur' | 'gbp' | 'chf' | 'jpy' | 'cad' | 'aud' | 'sar'
  | 'btc' | 'eth' | 'usdt' | 'bnb' | 'sol' | 'xrp' | 'ada' | 'doge' | 'trx' | 'avax' | 'dot' | 'link'
  | 'thyao' | 'garan' | 'akbnk' | 'asels' | 'kchol' | 'sise' | 'eregl' | 'bimas' | 'tuprs' | 'sahol' | 'froto' | 'tcell'
  // TEFAS yatırım fonu — somut fon `fundCode` ile gelir (tek "tefasFund" işareti).
  | 'tefasFund';

// TEFAS fon kodu doğrulama yanıtı (güncel pay değeri + resmi ad).
export interface TefasFundQuote {
  code: string;
  name: string;
  price: number;
  asOf: string;
}

// TEFAS fon arama sonucu satırı (aramalı seçici için).
export interface TefasFundSummary {
  code: string;
  name: string;
  price: number;
}

export interface HoldingDto {
  id: number;
  assetType: AssetType;
  // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
  fundCode?: string | null;
  fundName?: string | null;
  quantity: number;
  investedAmount: number;
  unitPriceAtPurchase: number;
  purchaseDate: string;
  currency: string;
  linkedTransactionId?: number | null;
  note?: string | null;
  // Değerleme (backend hesaplar):
  currentUnitPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
  priceAsOf?: string | null;
}

export type AssetClass = 'gold' | 'currency' | 'crypto' | 'stock' | 'tefasFund';

export interface AssetRateDto {
  assetType: AssetType;
  assetClass: AssetClass;
  // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
  fundCode?: string | null;
  fundName?: string | null;
  sell: number | null;
  buy: number | null;
  asOf: string | null;
}

export interface PortfolioDto {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  lastUpdated?: string | null;
  items: HoldingDto[];
}

export interface CreateHoldingRequest {
  assetType: AssetType;
  // AssetType === 'tefasFund' iken zorunlu: TEFAS fon kodu (ör. "AFA").
  fundCode?: string | null;
  purchaseDate: string;
  // Çift giriş: biri gönderilir, diğeri backend'de o günkü kurdan türetilir.
  investedAmount?: number | null;
  quantity?: number | null;
  linkToCashFlow: boolean;
  note?: string | null;
  householdId?: number | null;
}

export interface UpdateHoldingRequest {
  purchaseDate: string;
  investedAmount?: number | null;
  quantity?: number | null;
  note?: string | null;
}

export interface SellHoldingRequest {
  saleDate: string;
  quantity?: number | null; // null/boş = tümünü sat
  linkToCashFlow: boolean;
}

export interface SellResultDto {
  proceeds: number;
  realizedProfitLoss: number;
  fullyClosed: boolean;
}
