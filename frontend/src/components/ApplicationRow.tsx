import { Link } from 'react-router-dom';
import type { ApplicationRow as ApplicationRowType } from '@/lib/api/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatConfidence, formatDate } from '@/lib/format';

const RAIL_TONE: Record<ApplicationRowType['review_status'], string> = {
  auto_confirmed: 'bg-teal',
  confirmed: 'bg-teal',
  needs_review: 'bg-amber',
  rejected: 'bg-rust',
};

export const ApplicationRow = ({ application }: { application: ApplicationRowType }) => (
  <Link
    to={`/app/applications/${application.id}`}
    className="relative grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-md px-4 py-3 pl-5 transition-colors hover:bg-ink-raised sm:grid-cols-[1.5fr_1.5fr_1fr_0.8fr_0.6fr]"
  >
    <span
      className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${RAIL_TONE[application.review_status]}`}
      aria-hidden="true"
    />
    <div className="min-w-0">
      <p className="truncate font-body text-sm font-medium text-white">{application.company}</p>
      <p className="truncate font-data text-xs text-steel">{application.role ?? 'role unknown'}</p>
    </div>
    <div className="hidden sm:block">
      <StatusBadge status={application.status} />
    </div>
    <p className="hidden font-data text-xs text-steel sm:block">
      {formatDate(application.first_seen_at)}
    </p>
    <p className="hidden font-data text-xs tabular text-mist sm:block">
      {formatConfidence(application.confidence)}%
    </p>
    <p className="font-data text-xs tabular text-steel">
      {application.source_count} {application.source_count === 1 ? 'source' : 'sources'}
    </p>
  </Link>
);
