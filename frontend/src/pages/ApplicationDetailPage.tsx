import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApplication } from '@/lib/api/applications';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { Card } from '@/components/ui/Card';
import { TraceRail, type TraceEvent } from '@/components/TraceRail';
import { formatConfidence, formatDate, formatDateTime } from '@/lib/format';
import type { SourceRow } from '@/lib/api/types';

const sourceToEvent = (source: SourceRow): TraceEvent => {
  const confidence = formatConfidence(source.confidence);
  return {
    id: source.id,
    time: formatDateTime(source.received_at),
    title: source.subject || '(no subject line)',
    tone: confidence >= 75 ? 'teal' : 'amber',
    detail: (
      <div className="flex flex-col gap-2">
        <p className="font-data text-xs text-steel">
          From {source.from_address ?? 'unknown sender'} · read by{' '}
          <span className="text-mist">{source.extractor === 'openai' ? 'OpenAI extractor' : 'heuristic extractor'}</span>
        </p>
        {source.reasoning && (
          <p className="text-sm italic text-mist">"{source.reasoning}"</p>
        )}
        <div className="max-w-xs">
          <ConfidenceMeter percent={confidence} />
        </div>
        {source.snippet && (
          <p className="rounded border border-ink-line bg-ink px-3 py-2 font-data text-xs leading-relaxed text-steel">
            {source.snippet}
          </p>
        )}
        <p className="font-data text-[0.65rem] text-steel">
          Gmail message {source.gmail_message_id} · thread {source.gmail_thread_id}
        </p>
      </div>
    ),
  };
};

export const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const applicationId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => getApplication(applicationId),
    enabled: Number.isInteger(applicationId) && applicationId > 0,
  });

  if (isLoading) return <p className="text-sm text-steel">Loading…</p>;
  if (isError || !data) {
    return (
      <div>
        <p className="text-sm text-rust">Could not load this application.</p>
        <Link to="/app/applications" className="mt-2 inline-block text-sm text-teal">
          Back to applications
        </Link>
      </div>
    );
  }

  const { application, sources } = data;
  const confidence = formatConfidence(application.confidence);

  return (
    <div>
      <Link
        to="/app/applications"
        className="font-data text-xs text-steel hover:text-mist"
      >
        ← Back to applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">{application.company}</h1>
          <p className="mt-1 font-body text-base text-mist">
            {application.role ?? 'Role not captured from the source email'}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={application.status} />
          <ReviewStatusBadge status={application.review_status} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card className="sm:col-span-1">
          <p className="font-data text-xs uppercase text-steel">First seen</p>
          <p className="mt-1 font-data text-sm text-white">{formatDate(application.first_seen_at)}</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="font-data text-xs uppercase text-steel">Last seen</p>
          <p className="mt-1 font-data text-sm text-white">{formatDate(application.last_seen_at)}</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="font-data text-xs uppercase text-steel">Sources merged</p>
          <p className="mt-1 font-data text-sm text-white">{application.source_count}</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="font-data text-xs uppercase text-steel">Account</p>
          <p className="mt-1 truncate font-data text-sm text-white" title={application.account}>
            {application.account}
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="font-data text-xs uppercase text-steel">Overall confidence</p>
        <div className="mt-2 max-w-sm">
          <ConfidenceMeter percent={confidence} />
        </div>
        {application.review_status === 'needs_review' && (
          <p className="mt-3 text-sm text-amber">
            This is sitting in the review queue.{' '}
            <Link to="/app/review" className="underline underline-offset-4">
              Resolve it there
            </Link>
            .
          </p>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-white">Chain of custody</h2>
        <p className="mb-6 text-sm text-steel">
          Every raw email that contributed to this record, in the order Dispatch saw them.
        </p>
        {sources.length === 0 ? (
          <p className="text-sm text-steel">No source emails recorded.</p>
        ) : (
          <TraceRail events={sources.map(sourceToEvent)} />
        )}
      </div>
    </div>
  );
};
