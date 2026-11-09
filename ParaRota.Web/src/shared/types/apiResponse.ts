export interface ApiResponse<T = unknown> {
  isSuccess: boolean;
  statusCode?: number;
  message?: string;
  /** Dilden bağımsız stabil hata kodu; `errors:<CODE>` i18n anahtarına çevrilir. Yoksa `message` fallback. */
  errorCode?: string;
  /** FluentValidation alan hataları: { alanAdı: [mesaj, ...] } */
  errors?: Record<string, string[]>;
  data: T;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
