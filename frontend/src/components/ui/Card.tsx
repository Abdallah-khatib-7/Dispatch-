import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      'rounded-lg border border-ink-line bg-ink-raised p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
      className,
    )}
    {...props}
  />
);
