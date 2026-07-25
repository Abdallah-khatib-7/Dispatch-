import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-amber text-ink-text hover:bg-amber/90 disabled:bg-amber/40',
  secondary:
    'bg-transparent border border-ink-line text-mist hover:border-teal hover:text-white disabled:opacity-40',
  ghost: 'bg-transparent text-mist hover:text-white disabled:opacity-40',
  danger:
    'bg-transparent border border-rust-dim text-rust hover:bg-rust-dim/30 disabled:opacity-40',
};

export const Button = ({ variant = 'primary', className, ...props }: Props) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-body text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed',
      VARIANT_CLASS[variant],
      className,
    )}
    {...props}
  />
);
