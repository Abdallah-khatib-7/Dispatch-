import { apiRequest } from './client';
import type { ApplicationStatus, ReviewActionResult, ReviewQueueItem } from './types';

export const listReviewQueue = (limit = 50, offset = 0): Promise<ReviewQueueItem[]> =>
  apiRequest<{ queue: ReviewQueueItem[] }>('/api/review', { query: { limit, offset } }).then(
    (r) => r.queue,
  );

export interface CorrectPayload {
  company?: string;
  role?: string;
  status?: ApplicationStatus;
}

export const confirmApplication = (id: number): Promise<ReviewActionResult> =>
  apiRequest<ReviewActionResult>(`/api/review/${id}`, { method: 'POST', body: { action: 'confirm' } });

export const rejectApplication = (id: number): Promise<ReviewActionResult> =>
  apiRequest<ReviewActionResult>(`/api/review/${id}`, { method: 'POST', body: { action: 'reject' } });

export const correctApplication = (id: number, fields: CorrectPayload): Promise<ReviewActionResult> =>
  apiRequest<ReviewActionResult>(`/api/review/${id}`, {
    method: 'POST',
    body: { action: 'correct', ...fields },
  });
