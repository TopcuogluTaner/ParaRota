// Admin sistem durumu. Backend: GET /system-status.
export interface RecurringJobStatusDto {
  id: string;
  cron?: string | null;
  lastExecution?: string | null;
  nextExecution?: string | null;
  lastState?: string | null;
}

export interface HangfireStatusDto {
  succeeded: number;
  failed: number;
  processing: number;
  scheduled: number;
  enqueued: number;
  servers: number;
  recurring: number;
  jobs: RecurringJobStatusDto[];
}

export interface SystemCountsDto {
  users: number;
  transactions: number;
  households: number;
}

export interface SystemStatusDto {
  serverTime: string;
  timeZone: string;
  environment: string;
  startedAt: string;
  uptimeSeconds: number;
  appVersion: string;
  dotnetVersion: string;
  osDescription: string;
  databaseConnected: boolean;
  hangfire: HangfireStatusDto;
  counts: SystemCountsDto;
}
