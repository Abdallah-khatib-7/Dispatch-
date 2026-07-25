// The 0.75 mark is the backend's real auto-confirm cutoff (env.confidenceThreshold
// in backend/src/config/env.ts) -- drawn on the meter itself so the boundary
// that decides auto-confirmed vs. needs-review is never just an abstract number.
const THRESHOLD_PCT = 75;

export const ConfidenceMeter = ({ percent }: { percent: number }) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const clears = clamped >= THRESHOLD_PCT;
  return (
    <div className="w-full">
      <div className="relative h-1.5 w-full overflow-visible rounded-full bg-ink-line">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            clears ? 'bg-teal' : 'bg-amber'
          }`}
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-mist/50"
          style={{ left: `${THRESHOLD_PCT}%` }}
          title="Auto-confirm threshold: 75%"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 font-data text-xs text-steel">
        <span className={clears ? 'text-teal' : 'text-amber'}>{clamped}% confidence</span>
        <span>cutoff 75%</span>
      </div>
    </div>
  );
};
