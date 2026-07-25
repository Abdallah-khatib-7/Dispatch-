import type { ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';
import clsx from 'clsx';

export interface TraceEvent {
  id: string | number;
  time: string;
  title: string;
  detail?: ReactNode;
  tone: 'teal' | 'amber' | 'rust' | 'steel';
}

const TONE_DOT: Record<TraceEvent['tone'], string> = {
  teal: 'bg-teal',
  amber: 'bg-amber',
  rust: 'bg-rust',
  steel: 'bg-steel',
};

// The signature element: every application's history is a chain of custody --
// raw email in, extraction out, dedup decision, human review -- rendered as a
// single evidentiary timeline rather than scattered across separate widgets.
export const TraceRail = ({ events }: { events: TraceEvent[] }) => {
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);

  return (
    <div ref={ref} className="relative pl-6">
      <div
        className={clsx(
          'absolute left-[3px] top-1 bottom-1 w-px origin-top bg-ink-line',
          visible && 'animate-rail-draw',
        )}
        aria-hidden="true"
      />
      <ol className="flex flex-col gap-6">
        {events.map((event, i) => (
          <li
            key={event.id}
            className={clsx('relative', visible && 'animate-tick-in')}
            style={visible ? { animationDelay: `${i * 70}ms` } : undefined}
          >
            <span
              className={clsx(
                'absolute -left-6 top-1.5 h-2 w-2 rounded-full ring-4 ring-ink',
                TONE_DOT[event.tone],
              )}
              aria-hidden="true"
            />
            <p className="font-data text-xs text-steel">{event.time}</p>
            <p className="font-body text-sm font-medium text-white">{event.title}</p>
            {event.detail && <div className="mt-1 text-sm text-mist">{event.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
};
