import type { ApplicationStatus } from '@/lib/api/types';
import { STATUS_LABEL } from '@/lib/format';

const DOT: Record<ApplicationStatus, string> = {
  applied: 'bg-steel',
  assessment: 'bg-amber-dim',
  interview: 'bg-amber',
  offer: 'bg-teal',
  rejected: 'bg-rust',
  other: 'bg-steel',
};

export const StatusBadge = ({ status }: { status: ApplicationStatus }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-line bg-ink-raised px-2.5 py-1 font-data text-[0.7rem] uppercase tracking-wide text-mist">
    <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
    {STATUS_LABEL[status]}
  </span>
);
