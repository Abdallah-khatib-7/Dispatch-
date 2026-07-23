// Application lifecycle status. Union + const array instead of a TS enum so the
// source stays erasable (runs directly under Node type-stripping).
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
  'auto_confirmed', // extraction cleared the confidence threshold
  'needs_review', // below threshold, awaiting human decision
  'confirmed', // human confirmed
  'rejected', // human rejected (not a real application)
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type Extractor = 'openai' | 'heuristic';

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: Date;
  snippet: string;
  bodyText: string;
}

export interface ExtractionResult {
  company: string | null;
  role: string | null;
  status: ApplicationStatus;
  confidence: number; // 0..1
  reasoning: string;
  extractor: Extractor;
  isJobApplication: boolean;
}

export interface DedupCandidate {
  account: string;
  companyNormalized: string;
  roleNormalized: string;
  receivedAt: Date;
}
