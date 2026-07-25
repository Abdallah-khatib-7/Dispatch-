import { apiRequest } from './client';
import type { IngestSummary, RateDecision } from './types';

export interface RunIngestParams {
  maxResults?: number;
  query?: string;
}

export const runIngest = (params: RunIngestParams = {}): Promise<IngestSummary> =>
  apiRequest<{ ok: true; summary: IngestSummary }>('/api/ingest/run', {
    method: 'POST',
    body: params,
  }).then((r) => r.summary);

export const getUsage = (): Promise<RateDecision> => apiRequest<RateDecision>('/api/ingest/usage');
