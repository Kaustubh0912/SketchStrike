import type { RoomSettings } from './types.js';

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  roundSeconds: 80,
  guessesPerRound: 5,
  hintsEnabled: true,
  isPublic: false,
  gameMode: 'strike',
};

export const LIMITS = {
  minPlayers: 2,
  maxPlayers: 12,
  minRounds: 1,
  maxRounds: 10,
  minRoundSeconds: 30,
  maxRoundSeconds: 180,
  minGuesses: 1,
  maxGuesses: 15,
  maxUsernameLength: 20,
  maxChatLength: 60,
  wordChoiceSeconds: 15,
  guessCooldownMs: 600,
  reconnectGraceMs: 30_000,
} as const;

export const AVATAR_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#818cf8',
  '#f43f5e',
] as const;
