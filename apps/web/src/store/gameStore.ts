'use client';

import { create } from 'zustand';
import type {
  ChatMessage,
  DrawEvent,
  GameOverPayload,
  PublicPlayer,
  PublicRoomState,
  RoundSummary,
} from '@sketchstrike/shared';

export interface GameState {
  connected: boolean;
  joining: boolean;
  joinError: string | null;
  room: PublicRoomState | null;
  playerId: string | null;
  token: string | null;
  drawerWord: string | null;
  wordChoices: { words: string[]; chooseSeconds: number } | null;
  timerRemaining: number;
  messages: ChatMessage[];
  lastRoundSummary: RoundSummary | null;
  gameOver: GameOverPayload | null;
  canvasReplay: DrawEvent[] | null;
  canvasClearedAt: number;
  flash: { playerId: string; gained: number } | null;

  setConnected: (connected: boolean) => void;
  setJoining: (joining: boolean) => void;
  setJoinError: (error: string | null) => void;
  setRoom: (room: PublicRoomState) => void;
  setIdentity: (id: { playerId: string; token: string }) => void;
  setDrawerWord: (word: string | null) => void;
  setWordChoices: (payload: { words: string[]; chooseSeconds: number } | null) => void;
  setTimer: (remaining: number) => void;
  appendMessage: (msg: ChatMessage) => void;
  setRoundSummary: (summary: RoundSummary | null) => void;
  setGameOver: (payload: GameOverPayload | null) => void;
  setCanvasReplay: (events: DrawEvent[] | null) => void;
  bumpCanvasCleared: () => void;
  setFlash: (flash: { playerId: string; gained: number } | null) => void;
  reset: () => void;
}

type StateData = Pick<
  GameState,
  | 'connected'
  | 'joining'
  | 'joinError'
  | 'room'
  | 'playerId'
  | 'token'
  | 'drawerWord'
  | 'wordChoices'
  | 'timerRemaining'
  | 'messages'
  | 'lastRoundSummary'
  | 'gameOver'
  | 'canvasReplay'
  | 'canvasClearedAt'
  | 'flash'
>;

const initialState: StateData = {
  connected: false,
  joining: false,
  joinError: null,
  room: null,
  playerId: null,
  token: null,
  drawerWord: null,
  wordChoices: null,
  timerRemaining: 0,
  messages: [],
  lastRoundSummary: null,
  gameOver: null,
  canvasReplay: null,
  canvasClearedAt: 0,
  flash: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setConnected: (connected) => set({ connected }),
  setJoining: (joining) => set({ joining }),
  setJoinError: (joinError) => set({ joinError }),
  setRoom: (room) => set({ room, timerRemaining: room.timerRemaining }),
  setIdentity: ({ playerId, token }) => set({ playerId, token }),
  setDrawerWord: (drawerWord) => set({ drawerWord }),
  setWordChoices: (wordChoices) => set({ wordChoices }),
  setTimer: (timerRemaining) => set({ timerRemaining }),
  appendMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg].slice(-200) })),
  setRoundSummary: (lastRoundSummary) => set({ lastRoundSummary }),
  setGameOver: (gameOver) => set({ gameOver }),
  setCanvasReplay: (canvasReplay) => set({ canvasReplay }),
  bumpCanvasCleared: () => set({ canvasClearedAt: Date.now() }),
  setFlash: (flash) => set({ flash }),
  reset: () => set({ ...initialState, connected: false, messages: [] }),
}));

export function selectMe(state: GameState): PublicPlayer | null {
  if (!state.room || !state.playerId) return null;
  return state.room.players.find((p) => p.id === state.playerId) ?? null;
}

export function selectIsDrawing(state: GameState): boolean {
  return !!state.room && state.room.currentDrawerId === state.playerId;
}
