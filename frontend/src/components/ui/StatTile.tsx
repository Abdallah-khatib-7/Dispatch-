import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useReveal } from '@/hooks/useReveal';
import { useCountUp } from '@/hooks/useCountUp';

const ACCENT: Record<'teal' | 'amber' | 'rust' | 'steel', string> = {
  teal: 'border-l-teal',
  amber: 'border-l-amber',
  rust: 'border-l-rust',
  steel: 'border-l-steel',
};

interface Props {
  label: string;
  accent: 'teal' | 'amber' | 'rust' | 'steel';
  caption?: ReactNode;
  to?: string;
  /** A running count -- animates in with useCountUp. Omit and pass `display` instead for non-numeric readouts (e.g. a timestamp). */
  value?: number;
  display?: ReactNode;
}

export const StatTile = ({ label, value, display: displayOverride, accent, caption, to }: Props) => {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  const counted = useCountUp(value ?? 0, visible && value !== undefined);

  const body = (
    <div
      ref={ref}
      className={clsx(
        'rounded-lg border border-ink-line border-l-4 bg-ink-raised p-5 transition-colors',
        ACCENT[accent],
        to && 'hover:border-ink-line/60 hover:bg-ink-raised/80',
      )}
    >
      <p className="font-data text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-data text-3xl tabular text-white">
        {displayOverride ?? counted}
      </p>
      {caption && <p className="mt-1 text-xs text-steel">{caption}</p>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {body}
      </Link>
    );
  }
  return body;
};
