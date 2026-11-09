import type { AssetType, AssetClass } from '@shared/api/types';

// Varlık ikon/renk metası — yatırım kartları + güncel kur panosu ortak kullanır.
export const ASSET_ICON: Record<AssetType, string> = {
  goldGram: 'gold', goldQuarter: 'gold', goldHalf: 'gold', goldFull: 'gold', goldRepublic: 'gold',
  usd: 'currency-usd', cad: 'currency-usd', aud: 'currency-usd', eur: 'currency-eur',
  gbp: 'currency-gbp', jpy: 'currency-jpy', chf: 'cash', sar: 'cash',
  btc: 'bitcoin', eth: 'ethereum', usdt: 'hexagon-multiple', bnb: 'hexagon-multiple',
  sol: 'hexagon-multiple', xrp: 'hexagon-multiple', ada: 'hexagon-multiple', doge: 'hexagon-multiple',
  trx: 'hexagon-multiple', avax: 'hexagon-multiple', dot: 'hexagon-multiple', link: 'hexagon-multiple',
  thyao: 'chart-line', garan: 'chart-line', akbnk: 'chart-line', asels: 'chart-line',
  kchol: 'chart-line', sise: 'chart-line', eregl: 'chart-line', bimas: 'chart-line',
  tuprs: 'chart-line', sahol: 'chart-line', froto: 'chart-line', tcell: 'chart-line',
  tefasFund: 'chart-box-outline',
};

export const ASSET_COLOR: Record<AssetType, string> = {
  goldGram: '#C99846', goldQuarter: '#C99846', goldHalf: '#C99846', goldFull: '#C99846', goldRepublic: '#C99846',
  usd: '#5B8A72', eur: '#4A6D8C', gbp: '#7E6C97', chf: '#B05F47', jpy: '#9C5A8A',
  cad: '#6E8B3D', aud: '#3D7E8C', sar: '#8A7240',
  btc: '#E8A33D', eth: '#6E7BB8', usdt: '#7E6C97', bnb: '#7E6C97', sol: '#7E6C97', xrp: '#7E6C97',
  ada: '#7E6C97', doge: '#7E6C97', trx: '#7E6C97', avax: '#7E6C97', dot: '#7E6C97', link: '#7E6C97',
  thyao: '#3D7E8C', garan: '#3D7E8C', akbnk: '#3D7E8C', asels: '#3D7E8C', kchol: '#3D7E8C', sise: '#3D7E8C',
  eregl: '#3D7E8C', bimas: '#3D7E8C', tuprs: '#3D7E8C', sahol: '#3D7E8C', froto: '#3D7E8C', tcell: '#3D7E8C',
  tefasFund: '#A0566E',
};

// Varlık sınıfı → o sınıftaki varlıklar (seçici listeleri için). TEK KAYNAK.
export const ASSET_GROUPS: Record<AssetClass, AssetType[]> = {
  gold: ['goldGram', 'goldQuarter', 'goldHalf', 'goldFull', 'goldRepublic'],
  currency: ['usd', 'eur', 'gbp', 'chf', 'jpy', 'cad', 'aud', 'sar'],
  crypto: ['btc', 'eth', 'usdt', 'bnb', 'sol', 'xrp', 'ada', 'doge', 'trx', 'avax', 'dot', 'link'],
  stock: ['thyao', 'garan', 'akbnk', 'asels', 'kchol', 'sise', 'eregl', 'bimas', 'tuprs', 'sahol', 'froto', 'tcell'],
  // TEFAS — somut fon kodu formda serbest girilir (tek "tefasFund" işareti).
  tefasFund: ['tefasFund'],
};

export function classOfAsset(asset: AssetType): AssetClass {
  return (Object.keys(ASSET_GROUPS) as AssetClass[]).find((c) => ASSET_GROUPS[c].includes(asset)) ?? 'gold';
}

// Pano sıralaması: altın → döviz → kripto → hisse.
export const CLASS_ORDER: AssetClass[] = ['gold', 'currency', 'crypto', 'stock', 'tefasFund'];
export const CLASS_ICON: Record<AssetClass, string> = {
  gold: 'gold', currency: 'cash-multiple', crypto: 'bitcoin', stock: 'chart-line-variant', tefasFund: 'chart-box-outline',
};
