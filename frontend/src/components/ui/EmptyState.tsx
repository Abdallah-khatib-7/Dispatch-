import type { ReactNode } from 'react';

export const EmptyState = ({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-line px-6 py-16 text-center">
    <h3 className="font-display text-lg text-white">{title}</h3>
    <p className="max-w-sm text-sm text-steel">{detail}</p>
    {action}
  </div>
);
