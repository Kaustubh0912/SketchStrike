import type {
  ChatMessage,
  DrawEvent,
  GameOverPayload,
  PublicRoomState,
  RoomSettings,
  RoundSummary,
} from './types.js';

export interface ClientToServerEvents {
  create_room: (
    payload: { username: string; settings?: Partial<RoomSettings> },
    ack: (res: AckResult<{ roomId: string; playerId: string; token: string }>) => void,
  ) => void;

  join_room: (
    payload: { roomId: string; username: string; token?: string },
    ack: (res: AckResult<{ playerId: string; token: string }>) => void,
  ) => void;

  leave_room: () => void;
  update_settings: (settings: Partial<RoomSettings>) => void;
  kick_player: (payload: { playerId: string }) => void;
  start_game: () => void;

  choose_word: (payload: { word: string }) => void;
  drawing_data: (payload: DrawEvent) => void;
  clear_canvas: () => void;
  undo_canvas: () => void;
  submit_guess: (payload: { text: string }) => void;
  request_rematch: () => void;
}

export interface ServerToClientEvents {
  room_updated: (state: PublicRoomState) => void;
  word_choices: (payload: { words: string[]; chooseSeconds: number }) => void;
  round_started: (payload: { drawerId: string; maskedWord: string; round: number }) => void;
  canvas_event: (payload: DrawEvent) => void;
  canvas_cleared: () => void;
  canvas_undo: () => void;
  canvas_replay: (payload: { events: DrawEvent[] }) => void;
  drawer_word: (payload: { word: string }) => void;
  masked_word_updated: (payload: { maskedWord: string }) => void;
  timer_updated: (payload: { remaining: number }) => void;
  chat_message: (msg: ChatMessage) => void;
  player_guessed_correct: (payload: { playerId: string; gained: number }) => void;
  player_locked: (payload: { playerId: string }) => void;
  guesses_updated: (payload: { playerId: string; guessesRemaining: number }) => void;
  round_ended: (summary: RoundSummary) => void;
  game_over: (payload: GameOverPayload) => void;
  error_message: (payload: { message: string }) => void;
}

export type AckResult<T> = { ok: true; data: T } | { ok: false; error: string };
