'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--primary-fg)]',
  accent: 'bg-[var(--accent)] text-[var(--accent-fg)]',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-fg)]',
  ghost: 'bg-[var(--paper)] text-[var(--ink)]',
  danger: 'bg-[var(--danger)] text-[var(--danger-fg)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 min-h-[40px] text-sm',
  md: 'px-5 min-h-[48px] text-base',
  lg: 'px-7 min-h-[56px] text-lg',
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={[
        'bx-sm bx-press font-bold tracking-tight inline-flex items-center justify-center gap-2 leading-none',
        VARIANT_BG[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
});

export default Button;
