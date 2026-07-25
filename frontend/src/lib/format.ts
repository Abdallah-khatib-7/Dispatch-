import type { ApplicationStatus, ReviewStatus } from '@/lib/api/types';

export const formatConfidence = (raw: string | number): number => Math.round(Number(raw) * 100);

export const formatDate = (iso: string): string =>
  new Date(iso.replace(' ', 'T')).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatDateTime = (iso: string): string =>
  new Date(iso.replace(' ', 'T')).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const relativeTime = (iso: string): string => {
  const then = new Date(iso.replace(' ', 'T')).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  assessment: 'Assessment',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  other: 'Other',
};

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  auto_confirmed: 'Auto-confirmed',
  needs_review: 'Needs review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};
