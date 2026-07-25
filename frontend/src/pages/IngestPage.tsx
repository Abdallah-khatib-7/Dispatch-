import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { runIngest, getUsage } from '@/lib/api/ingest';
import type { IngestSummary } from '@/lib/api/types';
import { setLastRunAt } from '@/lib/ingestHistory';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const RESULT_FIELDS: { key: keyof IngestSummary; label: string; accent: string }[] = [
  { key: 'scanned', label: 'Emails scanned', accent: 'text-white' },
  { key: 'alreadyIngested', label: 'Already ingested', accent: 'text-steel' },
  { key: 'newApplications', label: 'New applications', accent: 'text-teal' },
  { key: 'deduped', label: 'Merged into existing', accent: 'text-teal' },
  { key: 'needsReview', label: 'Sent to review queue', accent: 'text-amber' },
  { key: 'notApplications', label: 'Not applications', accent: 'text-steel' },
  { key: 'llmCalls', label: 'LLM calls used', accent: 'text-mist' },
  { key: 'llmRateLimited', label: 'LLM rate-limited', accent: 'text-rust' },
];

export const IngestPage = () => {
  const queryClient = useQueryClient();
  const [maxResults, setMaxResults] = useState(25);
  const [query, setQuery] = useState('');

  const usage = useQuery({ queryKey: ['llm-usage'], queryFn: getUsage });

  const ingest = useMutation({
    mutationFn: () => runIngest({ maxResults, query: query.trim() || undefined }),
    onSuccess: () => {
      setLastRunAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['llm-usage'] });
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Ingest</h1>
      <p className="mt-1 text-sm text-steel">
        Manually pull the latest matching emails from Gmail, run extraction and dedup, and see
        exactly what changed.
      </p>

      <Card className="mt-6">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <label className="flex flex-col gap-1 text-xs text-steel">
            Max emails
            <input
              type="number"
              min={1}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="rounded-md border border-ink-line bg-ink px-2 py-1.5 font-data text-sm text-white focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-steel">
            Gmail search override (optional)
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Defaults to newer_than:90d application-shaped subjects'
              className="rounded-md border border-ink-line bg-ink px-2 py-1.5 font-data text-xs text-white placeholder:text-steel focus:border-teal"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <Button variant="primary" disabled={ingest.isPending} onClick={() => ingest.mutate()}>
            {ingest.isPending ? 'Scanning inbox…' : 'Run ingest now'}
          </Button>
          {usage.data && (
            <p className="font-data text-xs text-steel">
              LLM budget today: {usage.data.used}/{usage.data.cap}
              {!usage.data.allowed && ' — capped, falling back to heuristics'}
            </p>
          )}
        </div>

        {ingest.isError && (
          <p className="mt-4 text-sm text-rust">
            The ingest run failed. Check that a Google account is connected and the backend can
            reach Gmail.
          </p>
        )}
      </Card>

      {ingest.data && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-white">Result</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RESULT_FIELDS.map((field) => (
              <Card key={field.key} className="p-4">
                <p className="font-data text-[0.65rem] uppercase tracking-wide text-steel">
                  {field.label}
                </p>
                <p className={`mt-1 font-data text-2xl tabular ${field.accent}`}>
                  {ingest.data![field.key]}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
