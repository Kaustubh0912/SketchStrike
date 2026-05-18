'use client';

import { useEffect } from 'react';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { applyMode, applyTheme, loadMode, loadTheme } from '@/lib/theme';

// Stop FA from injecting its CSS at runtime — we import it explicitly above.
config.autoAddCss = false;

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(loadTheme());
    applyMode(loadMode());
  }, []);
  return <>{children}</>;
}
