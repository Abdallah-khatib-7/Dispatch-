// Mirrors backend/src/types/index.ts and the row shapes in
// backend/src/models/application.ts exactly. Decimal columns arrive as
// strings over JSON (mysql2 behavior for DECIMAL) -- callers parse with
// Number(...) rather than assuming a numeric type here.

export const APPLICATION_STATUSES = [
  'applied',
  'assessment',
  'interview',
  'offer',
  'rejected',
  'other',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const REVIEW_STATUSES = [
  'auto_confirmed',
  'needs_review',
  'confirmed',
  'rejected',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type Extractor = 'openai' | 'heuristic';

export interface ApplicationRow {
  id: number;
  account: string;
  company: string;
  company_normalized: string;
  role: string | null;
  role_normalized: string;
  status: ApplicationStatus;
  review_status: ReviewStatus;
  confidence: string;
  source_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface SourceRow {
  id: number;
  application_id: number;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string | null;
  from_address: string | null;
  received_at: string;
  extracted_company: string | null;
  extracted_role: string | null;
  extracted_status: string | null;
  confidence: string;
  reasoning: string | null;
  extractor: string;
  snippet: string | null;
  created_at: string;
}

export interface Stats {
  totalCounted: number;
  needsReview: number;
  rejected: number;
  byStatus: Record<string, number>;
  byDay: { day: string; count: number }[];
  byWeek: { week: string; count: number }[];
}

export interface ListApplicationsParams {
  status?: ApplicationStatus;
  reviewStatus?: ReviewStatus;
  company?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface IngestSummary {
  scanned: number;
  alreadyIngested: number;
  newSources: number;
  newApplications: number;
  deduped: number;
  needsReview: number;
  notApplications: number;
  llmCalls: number;
  llmRateLimited: number;
}

export interface RateDecision {
  allowed: boolean;
  used: number;
  cap: number;
}

export interface ReviewQueueItem {
  application: ApplicationRow;
  sources: SourceRow[];
}

export type ReviewAction = 'confirm' | 'reject' | 'correct';

export interface ReviewActionResult {
  ok: true;
  id: number;
  reviewStatus: ReviewStatus;
  corrected?: { company?: string; role?: string; status?: ApplicationStatus };
}

export interface OAuthCallbackResult {
  connected: true;
  account: string;
  apiToken: string;
  note: string;
}
