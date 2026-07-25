import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { useReveal } from '@/hooks/useReveal';

export const Reveal = ({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const { ref, visible } = useReveal<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={clsx(
        'transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      style={style}
      {...props}
    />
  );
};
