const USERNAME_KEY = 'sketchstrike:username';
const SESSION_KEY = 'sketchstrike:session';

export interface PersistedSession {
  roomId: string;
  playerId: string;
  token: string;
}

export function loadUsername(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(USERNAME_KEY) ?? '';
}

export function saveUsername(name: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERNAME_KEY, name);
}

export function loadSession(roomId: string): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.roomId !== roomId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}
