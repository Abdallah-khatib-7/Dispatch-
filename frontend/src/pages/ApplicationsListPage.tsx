import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listApplications } from '@/lib/api/applications';
import { APPLICATION_STATUSES, REVIEW_STATUSES, type ApplicationStatus, type ReviewStatus } from '@/lib/api/types';
import { STATUS_LABEL, REVIEW_LABEL } from '@/lib/format';
import { ApplicationRow } from '@/components/ApplicationRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { NaturalLanguageFilter } from '@/components/NaturalLanguageFilter';

type SortKey = 'recent' | 'company' | 'confidence';

const selectClass =
  'rounded-md border border-ink-line bg-ink px-3 py-2 font-body text-sm text-mist focus:border-teal';

export const ApplicationsListPage = () => {
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | ''>('');
  const [company, setCompany] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const filters = { status: status || undefined, reviewStatus: reviewStatus || undefined, company: company || undefined, limit: 100 };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', filters],
    queryFn: () => listApplications(filters),
  });

  const sorted = useMemo(() => {
    const rows = data ?? [];
    const copy = [...rows];
    if (sortKey === 'company') copy.sort((a, b) => a.company.localeCompare(b.company));
    if (sortKey === 'confidence') copy.sort((a, b) => Number(b.confidence) - Number(a.confidence));
    // 'recent' keeps the backend's first_seen_at DESC order as-is.
    return copy;
  }, [data, sortKey]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Applications</h1>
      <p className="mt-1 text-sm text-steel">
        Every record Dispatch has extracted, filterable by status and traceable to source.
      </p>

      <div className="mt-6">
        <NaturalLanguageFilter
          onParsed={(parsed) => {
            if (parsed.status !== undefined) setStatus(parsed.status);
            if (parsed.reviewStatus !== undefined) setReviewStatus(parsed.reviewStatus);
            if (parsed.company !== undefined) setCompany(parsed.company);
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Filter by company"
          className={`${selectClass} min-w-[180px] flex-1 sm:flex-none`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')}
          className={selectClass}
        >
          <option value="">Any status</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value as ReviewStatus | '')}
          className={selectClass}
        >
          <option value="">Any review state</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REVIEW_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={selectClass}
        >
          <option value="recent">Newest first</option>
          <option value="company">Company, A-Z</option>
          <option value="confidence">Confidence, high to low</option>
        </select>
        {(status || reviewStatus || company) && (
          <button
            type="button"
            onClick={() => {
              setStatus('');
              setReviewStatus('');
              setCompany('');
            }}
            className="font-body text-sm text-steel underline decoration-ink-line underline-offset-4 hover:text-mist"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-6">
        {isError && <p className="text-sm text-rust">Could not load applications from the backend.</p>}
        {isLoading && <p className="text-sm text-steel">Loading…</p>}
        {!isLoading && !isError && sorted.length === 0 && (
          <EmptyState
            title="No applications match"
            detail="Nothing in this account fits the current filters yet. Try widening them, or run an ingest to pull in more email."
          />
        )}
        {sorted.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="hidden px-4 font-data text-[0.65rem] uppercase tracking-wide text-steel sm:grid sm:grid-cols-[1.5fr_1.5fr_1fr_0.8fr_0.6fr]">
              <span>Company / role</span>
              <span>Status</span>
              <span>First seen</span>
              <span>Confidence</span>
              <span>Sources</span>
            </div>
            {sorted.map((application) => (
              <ApplicationRow key={application.id} application={application} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

