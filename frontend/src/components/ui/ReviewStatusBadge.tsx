import type { ReviewStatus } from '@/lib/api/types';
import { REVIEW_LABEL } from '@/lib/format';

const STYLE: Record<ReviewStatus, string> = {
  auto_confirmed: 'text-teal border-teal-dim bg-teal-dim/20',
  confirmed: 'text-teal border-teal-dim bg-teal-dim/20',
  needs_review: 'text-amber border-amber-dim bg-amber-dim/20',
  rejected: 'text-rust border-rust-dim bg-rust-dim/20',
};

export const ReviewStatusBadge = ({ status }: { status: ReviewStatus }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 font-data text-[0.7rem] uppercase tracking-wide ${STYLE[status]}`}
  >
    {REVIEW_LABEL[status]}
  </span>
);
