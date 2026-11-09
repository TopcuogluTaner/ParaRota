// Dashboard widget'larına seçili ay/yıl'ı taşımak için ortak prop tipi.
// DashboardPage'deki ay seçici state'i tüm widget'lara bu props ile iner;
// hepsi aynı (month, year) ile useDashboardSummaryQuery çağırınca tek fetch yapılır.
export interface DashboardPeriodProps {
  month: number;
  year: number;
}
