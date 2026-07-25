import { apiRequest } from './client';
import type { ApplicationRow, ListApplicationsParams, SourceRow, Stats } from './types';

export const getStats = (): Promise<Stats> => apiRequest<Stats>('/api/applications/stats');

export const listApplications = (params: ListApplicationsParams): Promise<ApplicationRow[]> =>
  apiRequest<{ applications: ApplicationRow[] }>('/api/applications', {
    query: {
      status: params.status,
      reviewStatus: params.reviewStatus,
      company: params.company,
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
    },
  }).then((r) => r.applications);

export interface ApplicationDetail {
  application: ApplicationRow;
  sources: SourceRow[];
}

export const getApplication = (id: number): Promise<ApplicationDetail> =>
  apiRequest<ApplicationDetail>(`/api/applications/${id}`);
