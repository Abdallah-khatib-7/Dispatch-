import { useQuery } from '@tanstack/react-query';
import { getStats } from '@/lib/api/applications';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Reveal } from '@/components/ui/Reveal';
import { ByDayChart } from '@/components/charts/ByDayChart';
import { StatusBreakdown } from '@/components/charts/StatusBreakdown';
import { getLastRunAt } from '@/lib/ingestHistory';
import { relativeTime } from '@/lib/format';

export const DashboardPage = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 60_000,
  });

  const lastRunAt = getLastRunAt();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-steel">
        What Dispatch has confirmed, what's still waiting on you, and when it last checked your
        inbox.
      </p>

      {isError && (
        <p className="mt-6 text-sm text-rust">
          Could not load stats from the backend. Confirm it is running and reachable.
        </p>
      )}

      {!isError && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Confirmed applications"
              value={stats?.totalCounted ?? 0}
              accent="teal"
              caption="Auto-confirmed + human-confirmed"
            />
            <StatTile
              label="Needs your review"
              value={stats?.needsReview ?? 0}
              accent="amber"
              caption="Below the 75% cutoff"
              to="/app/review"
            />
            <StatTile
              label="Rejected"
              value={stats?.rejected ?? 0}
              accent="rust"
              caption="Marked not-a-match"
            />
            <StatTile
              label="Last checked"
              display={lastRunAt ? relativeTime(lastRunAt) : '—'}
              accent="steel"
              caption={lastRunAt ? 'From this browser' : 'Not run from this browser yet'}
              to="/app/ingest"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <Card>
                <h2 className="font-display text-base font-semibold text-white">
                  Applications by day
                </h2>
                <p className="text-xs text-steel">Trailing 30 days, counted records only</p>
                <div className="mt-4">
                  {isLoading || !stats ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-steel">
                      Loading…
                    </div>
                  ) : stats.byDay.length === 0 ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-steel">
                      No confirmed applications yet.
                    </div>
                  ) : (
                    <ByDayChart data={stats.byDay} />
                  )}
                </div>
              </Card>
            </Reveal>

            <Reveal className="lg:col-span-2">
              <Card>
                <h2 className="font-display text-base font-semibold text-white">
                  Status breakdown
                </h2>
                <p className="text-xs text-steel">Counted applications only</p>
                <div className="mt-5">
                  {stats && Object.values(stats.byStatus).some((v) => v > 0) ? (
                    <StatusBreakdown byStatus={stats.byStatus} />
                  ) : (
                    <p className="py-8 text-center text-sm text-steel">Nothing to break down yet.</p>
                  )}
                </div>
              </Card>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
};
