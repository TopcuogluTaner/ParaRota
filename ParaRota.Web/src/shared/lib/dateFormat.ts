import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

export const formatDate = (date?: string | Date | null, fmt = 'DD.MM.YYYY') =>
  date ? dayjs(date).format(fmt) : '';

export const formatDateTime = (date?: string | Date | null, fmt = 'DD.MM.YYYY HH:mm') =>
  date ? dayjs(date).format(fmt) : '';

export const formatCurrency = (amount: number, currency = 'TRY') => {
  const code = currency?.trim() ? currency.trim().toUpperCase() : 'TRY';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: code }).format(amount);
  } catch {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
};

export const formatNumber = (amount: number, decimals = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);

export { dayjs };
