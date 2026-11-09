export type CurrencyOption = { code: string; symbol: string };

export const CURRENCIES: readonly CurrencyOption[] = [
  { code: 'TRY', symbol: '₺' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
] as const;

export const CURRENCY_CODES: readonly string[] = CURRENCIES.map((c) => c.code);

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
