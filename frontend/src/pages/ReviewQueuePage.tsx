import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listReviewQueue, confirmApplication, rejectApplication, correctApplication } from '@/lib/api/review';
import { APPLICATION_STATUSES, type ApplicationStatus, type ReviewQueueItem } from '@/lib/api/types';
import { STATUS_LABEL, formatConfidence, formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal } from '@/components/ui/Reveal';

const ReviewCard = ({ item }: { item: ReviewQueueItem }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState(item.application.company);
  const [role, setRole] = useState(item.application.role ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(item.application.status);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  };

  const confirm = useMutation({ mutationFn: () => confirmApplication(item.application.id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => rejectApplication(item.application.id), onSuccess: invalidate });
  const correct = useMutation({
    mutationFn: () => correctApplication(item.application.id, { company, role, status }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const busy = confirm.isPending || reject.isPending || correct.isPending;
  const latestSource = item.sources[item.sources.length - 1];
  const confidence = formatConfidence(item.application.confidence);

  return (
    <Reveal>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to={`/app/applications/${item.application.id}`}
              className="font-display text-lg font-semibold text-white hover:text-teal"
            >
              {item.application.company}
            </Link>
            <p className="font-data text-sm text-steel">
              {item.application.role ?? 'role unknown'}
            </p>
          </div>
          <div className="w-full max-w-[220px] sm:w-56">
            <ConfidenceMeter percent={confidence} />
          </div>
        </div>

        {latestSource && (
          <div className="mt-4 rounded-md border border-ink-line bg-ink p-3">
            <p className="font-data text-xs text-steel">
              {formatDateTime(latestSource.received_at)} · from {latestSource.from_address ?? 'unknown sender'}
            </p>
            <p className="mt-1 font-body text-sm text-white">{latestSource.subject}</p>
            {latestSource.reasoning && (
              <p className="mt-1 text-sm italic text-mist">"{latestSource.reasoning}"</p>
            )}
            {latestSource.snippet && (
              <p className="mt-2 font-data text-xs leading-relaxed text-steel">{latestSource.snippet}</p>
            )}
          </div>
        )}

        {editing ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-ink-line pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-steel">
                Company
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="rounded-md border border-ink-line bg-ink px-2 py-1.5 font-body text-sm text-white focus:border-teal"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-steel">
                Role
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-md border border-ink-line bg-ink px-2 py-1.5 font-body text-sm text-white focus:border-teal"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-steel">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="rounded-md border border-ink-line bg-ink px-2 py-1.5 font-body text-sm text-white focus:border-teal"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" disabled={busy} onClick={() => correct.mutate()}>
                Save and confirm
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-line pt-4">
            <Button variant="primary" disabled={busy} onClick={() => confirm.mutate()}>
              Confirm as-is
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
              Correct then confirm
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => reject.mutate()}>
              Reject
            </Button>
          </div>
        )}
      </Card>
    </Reveal>
  );
};

export const ReviewQueuePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => listReviewQueue(100, 0),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Review queue</h1>
      <p className="mt-1 text-sm text-steel">
        Extractions below the 75% confidence cutoff. Nothing here counts toward your total until
        you decide.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {isError && <p className="text-sm text-rust">Could not load the review queue.</p>}
        {isLoading && <p className="text-sm text-steel">Loading…</p>}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState
            title="Queue is empty"
            detail="Every extraction Dispatch has made so far cleared the confidence cutoff on its own."
          />
        )}
        {data?.map((item) => (
          <ReviewCard key={item.application.id} item={item} />
        ))}
      </div>
    </div>
  );
};
