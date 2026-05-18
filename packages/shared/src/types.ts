export type GameMode = 'classic' | 'strike';
export type RoomStatus = 'lobby' | 'choosing' | 'playing' | 'round-end' | 'ended';
export type DrawTool = 'draw' | 'erase';

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  roundSeconds: number;
  guessesPerRound: number;
  hintsEnabled: boolean;
  isPublic: boolean;
  gameMode: GameMode;
}

export interface PublicPlayer {
  id: string;
  username: string;
  avatarColor: string;
  score: number;
  guessesRemaining: number;
  hasGuessedCorrectly: boolean;
  isLocked: boolean;
  isConnected: boolean;
  isHost: boolean;
  isDrawing: boolean;
}

export interface PublicRoomState {
  roomId: string;
  hostId: string;
  settings: RoomSettings;
  players: PublicPlayer[];
  currentDrawerId: string | null;
  maskedWord: string | null;
  round: number;
  timerRemaining: number;
  status: RoomStatus;
}

export interface DrawEvent {
  type: DrawTool;
  points: number[];
  color: string;
  brushSize: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  text: string;
  kind: 'chat' | 'system' | 'correct' | 'close' | 'locked';
  timestamp: number;
}

export interface RoundSummary {
  word: string;
  drawerId: string;
  results: Array<{ playerId: string; username: string; gained: number }>;
}

export interface GameOverPayload {
  rankings: Array<{
    playerId: string;
    username: string;
    score: number;
    rank: number;
  }>;
}
