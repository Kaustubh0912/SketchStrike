'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, fullWidth = true, className = '', ...rest },
  ref,
) {
  return (
    <label className={`block ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <span className="block mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          {label}
        </span>
      )}
      <input
        ref={ref}
        {...rest}
        className={[
          'bx-sm w-full px-4 min-h-[48px] bg-[var(--paper)] text-[var(--ink)] font-semibold placeholder:text-[var(--muted)] placeholder:font-medium',
          'focus:outline-none focus-visible:outline-3 focus-visible:outline-[var(--ring)]',
          error ? 'bg-[color:color-mix(in_srgb,var(--danger)_18%,var(--paper))]' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {(hint || error) && (
        <span
          className={`block mt-1.5 text-xs font-medium ${
            error ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
          }`}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
});

export default Input;
