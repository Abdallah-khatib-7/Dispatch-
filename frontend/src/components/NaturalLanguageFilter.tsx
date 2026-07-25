import { useState, type FormEvent } from 'react';
import { parseQuery, type ParsedQuery } from '@/lib/parseQuery';
import { STATUS_LABEL, REVIEW_LABEL } from '@/lib/format';

interface Props {
  onParsed: (parsed: ParsedQuery) => void;
}

const EXAMPLES = ['interview at Anchor Systems', 'needs review', 'rejected from Meta'];

// Reads a plain-language line and turns it into the same structured filters
// the dropdowns below produce. Runs entirely in the browser (see
// lib/parseQuery.ts) -- there's no backend endpoint for free-text question
// answering over applications, so this is a real, working filter rather than
// a chat box that quietly does nothing.
export const NaturalLanguageFilter = ({ onParsed }: Props) => {
  const [text, setText] = useState('');
  const [lastParsed, setLastParsed] = useState<ParsedQuery | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const parsed = parseQuery(text);
    setLastParsed(parsed);
    onParsed(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-ink-line bg-ink-raised p-4">
      <label htmlFor="nl-filter" className="font-data text-xs uppercase tracking-wide text-steel">
        Describe what you're looking for
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="nl-filter"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`e.g. "${EXAMPLES[0]}"`}
          className="flex-1 rounded-md border border-ink-line bg-ink px-3 py-2 font-body text-sm text-mist placeholder:text-steel focus:border-teal"
        />
        <button
          type="submit"
          className="rounded-md bg-amber px-4 py-2 font-body text-sm font-medium text-ink-text hover:bg-amber/90"
        >
          Apply
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-data text-xs text-steel">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setText(ex);
              const parsed = parseQuery(ex);
              setLastParsed(parsed);
              onParsed(parsed);
            }}
            className="underline decoration-ink-line underline-offset-4 hover:text-mist"
          >
            {ex}
          </button>
        ))}
      </div>
      {lastParsed && (
        <p className="mt-3 font-data text-xs text-teal">
          Read as:{' '}
          {[
            lastParsed.status && STATUS_LABEL[lastParsed.status],
            lastParsed.reviewStatus && REVIEW_LABEL[lastParsed.reviewStatus],
            lastParsed.company && `company contains "${lastParsed.company}"`,
          ]
            .filter(Boolean)
            .join(' · ') || 'no recognizable filters — showing everything'}
        </p>
      )}
    </form>
  );
};
