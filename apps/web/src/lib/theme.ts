export const THEMES = ['loud', 'sharp', 'cozy'] as const;
export type ThemeName = (typeof THEMES)[number];

export const MODES = ['light', 'dark'] as const;
export type ModeName = (typeof MODES)[number];

export interface ThemeMeta {
  label: string;
  tagline: string;
  swatches: { bg: string; primary: string; accent: string };
}

export const THEME_META: Record<ThemeName, ThemeMeta> = {
  loud: {
    label: 'Loud',
    tagline: 'Bright. Bouncy. Party energy.',
    swatches: { bg: '#fef6e4', primary: '#f582ae', accent: '#ffd803' },
  },
  sharp: {
    label: 'Sharp',
    tagline: 'Tense. Esports. Big numbers.',
    swatches: { bg: '#f5f5f5', primary: '#d4002e', accent: '#ffe53b' },
  },
  cozy: {
    label: 'Cozy',
    tagline: 'Soft. Chill. Sunday afternoon.',
    swatches: { bg: '#faf3e7', primary: '#81b29a', accent: '#f2cc8f' },
  },
};

export const DEFAULT_THEME: ThemeName = 'loud';
export const DEFAULT_MODE: ModeName = 'light';
const THEME_KEY = 'sketchstrike:theme';
const MODE_KEY = 'sketchstrike:mode';

function isTheme(v: string | null): v is ThemeName {
  return v != null && (THEMES as readonly string[]).includes(v);
}
function isMode(v: string | null): v is ModeName {
  return v != null && (MODES as readonly string[]).includes(v);
}

export function loadTheme(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const raw = window.localStorage.getItem(THEME_KEY);
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

export function loadMode(): ModeName {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const raw = window.localStorage.getItem(MODE_KEY);
  return isMode(raw) ? raw : DEFAULT_MODE;
}

export function saveTheme(name: ThemeName) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_KEY, name);
}

export function saveMode(name: ModeName) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODE_KEY, name);
}

// Keep the browser UI / PWA status-bar color (<meta name="theme-color">) in
// sync with whatever the active theme + mode resolve to for --bg.
function syncThemeColor() {
  if (typeof document === 'undefined') return;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim();
  if (!bg) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg);
}

export function applyTheme(name: ThemeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', name);
  syncThemeColor();
}

export function applyMode(name: ModeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-mode', name);
  syncThemeColor();
}
