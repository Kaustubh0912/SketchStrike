'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  applyMode,
  applyTheme,
  loadMode,
  loadTheme,
  saveMode,
  saveTheme,
  THEMES,
  THEME_META,
  type ModeName,
  type ThemeName,
} from '@/lib/theme';
import Icon from './Icon';
import { CardLabel } from './ui/Card';

export default function Settings() {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeName | null>(null);
  const [mode, setModeState] = useState<ModeName | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThemeState(loadTheme());
    setModeState(loadMode());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickTheme(name: ThemeName) {
    setThemeState(name);
    saveTheme(name);
    applyTheme(name);
  }

  function pickMode(name: ModeName) {
    setModeState(name);
    saveMode(name);
    applyMode(name);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 bx-sm bx-press w-12 h-12 grid place-items-center bg-[var(--paper)] text-[var(--ink)]"
      >
        <Icon name="gear" className="text-lg" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Settings"
            className="fixed bottom-20 right-4 sm:right-4 left-4 sm:left-auto z-40 bx bg-[var(--paper)] p-4 sm:p-5 sm:w-[320px] origin-bottom-right"
          >
            <CardLabel className="mb-2">Theme</CardLabel>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {THEMES.map((name) => {
                const meta = THEME_META[name];
                const active = theme === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickTheme(name)}
                    aria-pressed={active}
                    aria-label={`${meta.label} theme — ${meta.tagline}`}
                    title={`${meta.label} · ${meta.tagline}`}
                    className={`bx-sm overflow-hidden h-16 transition relative ${
                      active ? 'ring-4 ring-offset-2 ring-[var(--ink)]' : 'bx-press'
                    }`}
                    style={{ background: meta.swatches.bg }}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1/3"
                      style={{ background: meta.swatches.primary }}
                    />
                    <span
                      className="absolute right-0 top-0 bottom-0 w-1/3"
                      style={{ background: meta.swatches.accent }}
                    />
                    {active && (
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="bx-sm bg-[var(--paper)] text-[var(--ink)] w-7 h-7 grid place-items-center">
                          <Icon name="check" className="text-xs" />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <CardLabel className="mb-2">Appearance</CardLabel>
            <div
              role="radiogroup"
              aria-label="Light or dark mode"
              className="grid grid-cols-2 gap-2"
            >
              <ModeButton
                active={mode === 'light'}
                onClick={() => pickMode('light')}
                icon="sun"
                label="Light"
              />
              <ModeButton
                active={mode === 'dark'}
                onClick={() => pickMode('dark')}
                icon="moon"
                label="Dark"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: 'sun' | 'moon';
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={active}
      className={`bx-sm bx-press min-h-[44px] flex items-center justify-center gap-2 font-bold text-sm ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)]'
          : 'bg-[var(--bg-tile)] text-[var(--ink)]'
      }`}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
