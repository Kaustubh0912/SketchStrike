'use client';

import type { HTMLAttributes } from 'react';

type Tone = 'primary' | 'accent' | 'secondary' | 'danger' | 'success' | 'ink';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: 'xs' | 'sm';
}

const TONE_BG: Record<Tone, string> = {
  primary: 'bg-[var(--primary)] text-[var(--primary-fg)]',
  accent: 'bg-[var(--accent)] text-[var(--accent-fg)]',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-fg)]',
  danger: 'bg-[var(--danger)] text-[var(--danger-fg)]',
  success: 'bg-[var(--success)] text-[var(--success-fg)]',
  ink: 'bg-[var(--ink)] text-[var(--paper)]',
};

const SIZE: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-1',
};

export default function Badge({
  tone = 'primary',
  size = 'sm',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <span
      {...rest}
      className={[
        'inline-flex items-center gap-1 font-bold uppercase tracking-wider border-2 border-[var(--ink)] rounded',
        TONE_BG[tone],
        SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
