import type { GoalStatus, Priority } from './common';

export interface GoalDto {
  id: number;
  name: string;
  target: number;
  current: number;
  targetDate: string;
  priority: Priority;
  status: GoalStatus;
  emoji?: string;
}

export interface GoalCreateRequest {
  name: string;
  target: number;
  targetDate: string;
  priority: Priority;
  emoji?: string;
}

export interface GoalUpdateRequest {
  name: string;
  target: number;
  current: number;
  targetDate: string;
  priority: Priority;
  status: GoalStatus;
  emoji?: string;
}
