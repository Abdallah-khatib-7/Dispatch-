import type { ApplicationStatus } from '@/lib/api/types';
import { APPLICATION_STATUSES } from '@/lib/api/types';
import { STATUS_LABEL } from '@/lib/format';

const BAR_COLOR: Record<ApplicationStatus, string> = {
  applied: 'bg-steel',
  assessment: 'bg-amber-dim',
  interview: 'bg-amber',
  offer: 'bg-teal',
  rejected: 'bg-rust',
  other: 'bg-steel',
};

export const StatusBreakdown = ({ byStatus }: { byStatus: Record<string, number> }) => {
  const max = Math.max(1, ...Object.values(byStatus));
  const rows = APPLICATION_STATUSES.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
  })).filter((row) => row.count > 0 || row.status !== 'other');

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.status} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-mist">{STATUS_LABEL[row.status]}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-line">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${BAR_COLOR[row.status]}`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-data text-sm tabular text-white">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
};
