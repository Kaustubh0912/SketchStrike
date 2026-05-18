'use client';

import type { HTMLAttributes } from 'react';

type Tone = 'paper' | 'tile' | 'primary' | 'accent' | 'secondary' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  size?: Size;
  padded?: boolean;
  hoverable?: boolean;
}

const TONE_BG: Record<Tone, string> = {
  paper: 'bg-[var(--paper)]',
  tile: 'bg-[var(--bg-tile)]',
  primary: 'bg-[var(--primary)] text-[var(--primary-fg)]',
  accent: 'bg-[var(--accent)] text-[var(--accent-fg)]',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-fg)]',
  danger: 'bg-[var(--danger)] text-[var(--danger-fg)]',
  success: 'bg-[var(--success)] text-[var(--success-fg)]',
};

const PAD: Record<Size, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  tone = 'paper',
  size = 'md',
  padded = true,
  hoverable = false,
  className = '',
  children,
  ...rest
}: Props) {
  const base = size === 'sm' ? 'bx-sm' : size === 'lg' ? 'bx-lg' : 'bx';
  return (
    <div
      {...rest}
      className={[
        base,
        TONE_BG[tone],
        padded ? PAD[size] : '',
        hoverable ? 'bx-press cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

export function CardLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] ${className}`}
    >
      {children}
    </div>
  );
}
