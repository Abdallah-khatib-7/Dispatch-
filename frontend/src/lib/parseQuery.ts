import type { ApplicationStatus, ReviewStatus } from '@/lib/api/types';

export interface ParsedQuery {
  status?: ApplicationStatus | '';
  reviewStatus?: ReviewStatus | '';
  company?: string;
}

const STATUS_WORDS: Record<string, ApplicationStatus> = {
  applied: 'applied',
  application: 'applied',
  assessment: 'assessment',
  assessments: 'assessment',
  oa: 'assessment',
  interview: 'interview',
  interviewing: 'interview',
  interviews: 'interview',
  offer: 'offer',
  offers: 'offer',
  rejected: 'rejected',
  rejection: 'rejected',
  rejections: 'rejected',
  declined: 'rejected',
};

const REVIEW_PHRASES: [RegExp, ReviewStatus][] = [
  [/needs?[\s-]?review/i, 'needs_review'],
  [/pending[\s-]?review/i, 'needs_review'],
  [/auto[\s-]?confirmed/i, 'auto_confirmed'],
  [/human[\s-]?confirmed/i, 'confirmed'],
  [/\bconfirmed\b/i, 'confirmed'],
];

// A deliberately small, deterministic parser -- not a call to an LLM. It
// recognizes status/review-state keywords and an "at/from <company>" clause,
// and falls back to treating the remainder as a company substring. Good
// enough for "interview at Anchor Systems" or "needs review" without the
// cost, latency, or opacity of a real model call for something this
// mechanical.
export const parseQuery = (raw: string): ParsedQuery => {
  let text = raw.trim();
  const result: ParsedQuery = {};

  for (const [pattern, review] of REVIEW_PHRASES) {
    if (pattern.test(text)) {
      result.reviewStatus = review;
      text = text.replace(pattern, ' ');
      break;
    }
  }

  const companyMatch = /\b(?:at|from|for)\s+([a-z0-9][\w .&'-]{1,60})/i.exec(text);
  if (companyMatch) {
    result.company = companyMatch[1]!.trim();
    text = text.replace(companyMatch[0], ' ');
  }

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const status = STATUS_WORDS[word];
    if (status) {
      result.status = status;
      text = text.replace(new RegExp(`\\b${word}\\b`, 'i'), ' ');
      break;
    }
  }

  if (result.company === undefined) {
    const remainder = text.trim();
    if (remainder.length > 1) result.company = remainder;
  }

  return result;
};
