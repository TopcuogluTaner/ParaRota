// Admin sistem logları (ErrorLog). Backend: GET /system-logs (paged), DELETE /system-logs.
export interface ErrorLogDto {
  id: number;
  createdDate: string;
  statusCode: number;
  message: string;
  source?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  userId?: string | null;
  stackTrace?: string | null;
}

export interface SystemLogListParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  minStatusCode?: number;
}
