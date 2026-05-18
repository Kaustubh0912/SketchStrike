import type { Server, Socket } from 'socket.io';
import {
  AVATAR_COLORS,
  DEFAULT_SETTINGS,
  LIMITS,
  type ChatMessage,
  type ClientToServerEvents,
  type DrawEvent,
  type PublicPlayer,
  type PublicRoomState,
  type RoomSettings,
  type RoomStatus,
  type ServerToClientEvents,
} from '@sketchstrike/shared';
import { newMessageId, newPlayerId, newRoomCode, newToken } from '../utils/id.js';
import { sanitizeChat, sanitizeCustomWords } from '../utils/normalize.js';
import { GameLoop } from './GameLoop.js';

export interface InternalPlayer {
  id: string;
  username: string;
  avatarColor: string;
  token: string;
  socketId: string | null;
  score: number;
  lastRoundGained: number;
  guessesRemaining: number;
  hasGuessedCorrectly: boolean;
  isLocked: boolean;
  isHost: boolean;
  joinedAt: number;
  lastGuessAt: number;
  disconnectedAt: number | null;
}

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class Room {
  readonly id: string;
  hostId: string;
  settings: RoomSettings;
  status: RoomStatus = 'lobby';
  players = new Map<string, InternalPlayer>();
  drawHistory: DrawEvent[] = [];
  currentDrawerId: string | null = null;
  currentWord: string | null = null;
  maskedWord: string | null = null;
  round = 0;
  drawerQueue: string[] = [];
  drawersUsedThisRound = new Set<string>();
  recentWords: string[] = [];
  loop: GameLoop;

  constructor(
    private readonly io: IoServer,
    hostId: string,
    settings: RoomSettings,
  ) {
    this.id = newRoomCode();
    this.hostId = hostId;
    this.settings = settings;
    this.loop = new GameLoop(this);
  }

  get io_() {
    return this.io;
  }

  publicPlayers(): PublicPlayer[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      username: p.username,
      avatarColor: p.avatarColor,
      score: p.score,
      guessesRemaining: p.guessesRemaining,
      hasGuessedCorrectly: p.hasGuessedCorrectly,
      isLocked: p.isLocked,
      isConnected: p.socketId !== null,
      isHost: p.id === this.hostId,
      isDrawing: p.id === this.currentDrawerId,
    }));
  }

  publicState(): PublicRoomState {
    return {
      roomId: this.id,
      hostId: this.hostId,
      settings: this.settings,
      players: this.publicPlayers(),
      currentDrawerId: this.currentDrawerId,
      maskedWord: this.maskedWord,
      round: this.round,
      timerRemaining: this.loop.timerRemaining,
      status: this.status,
    };
  }

  broadcastState() {
    this.io.to(this.id).emit('room_updated', this.publicState());
  }

  systemMessage(text: string, kind: ChatMessage['kind'] = 'system') {
    const msg: ChatMessage = {
      id: newMessageId(),
      playerId: 'system',
      username: 'System',
      text,
      kind,
      timestamp: Date.now(),
    };
    this.io.to(this.id).emit('chat_message', msg);
  }

  chatMessage(player: InternalPlayer, text: string, kind: ChatMessage['kind'] = 'chat') {
    const clean = sanitizeChat(text, LIMITS.maxChatLength);
    if (!clean) return;
    const msg: ChatMessage = {
      id: newMessageId(),
      playerId: player.id,
      username: player.username,
      text: clean,
      kind,
      timestamp: Date.now(),
    };
    this.io.to(this.id).emit('chat_message', msg);
  }

  addPlayer(username: string, isHost: boolean): InternalPlayer {
    const id = newPlayerId();
    const usedColors = new Set([...this.players.values()].map((p) => p.avatarColor));
    const color =
      AVATAR_COLORS.find((c) => !usedColors.has(c)) ??
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ??
      '#a78bfa';
    const player: InternalPlayer = {
      id,
      username,
      avatarColor: color,
      token: newToken(),
      socketId: null,
      score: 0,
      lastRoundGained: 0,
      guessesRemaining: this.settings.guessesPerRound,
      hasGuessedCorrectly: false,
      isLocked: false,
      isHost,
      joinedAt: Date.now(),
      lastGuessAt: 0,
      disconnectedAt: null,
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    if (this.players.size === 0) return;
    if (this.hostId === playerId) {
      const next = [...this.players.values()][0];
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
      }
    }
    if (this.currentDrawerId === playerId && this.status === 'playing') {
      this.loop.endRound('drawer-left');
    }
  }

  attachSocket(player: InternalPlayer, socket: IoSocket) {
    player.socketId = socket.id;
    player.disconnectedAt = null;
    socket.join(this.id);
  }

  detachSocket(player: InternalPlayer) {
    player.socketId = null;
    player.disconnectedAt = Date.now();
  }

  resetForNewGame() {
    this.round = 0;
    this.drawerQueue = [...this.players.keys()].sort(() => Math.random() - 0.5);
    this.drawersUsedThisRound.clear();
    this.recentWords = [];
    this.drawHistory = [];
    for (const p of this.players.values()) {
      p.score = 0;
      p.lastRoundGained = 0;
      p.guessesRemaining = this.settings.guessesPerRound;
      p.hasGuessedCorrectly = false;
      p.isLocked = false;
    }
  }

  resetForRound() {
    this.drawHistory = [];
    this.currentDrawerId = null;
    this.currentWord = null;
    this.maskedWord = null;
    for (const p of this.players.values()) {
      p.guessesRemaining = this.settings.guessesPerRound;
      p.hasGuessedCorrectly = false;
      p.isLocked = false;
      p.lastRoundGained = 0;
    }
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketIndex = new Map<string, { roomId: string; playerId: string }>();

  constructor(private readonly io: IoServer) {}

  createRoom(socket: IoSocket, username: string, settings: Partial<RoomSettings> | undefined) {
    const finalSettings = this.normalizeSettings({ ...DEFAULT_SETTINGS, ...settings });
    const placeholderId = 'pending';
    const room = new Room(this.io, placeholderId, finalSettings);
    const player = room.addPlayer(username, true);
    room.hostId = player.id;
    room.attachSocket(player, socket);
    this.rooms.set(room.id, room);
    this.socketIndex.set(socket.id, { roomId: room.id, playerId: player.id });
    room.systemMessage(`${player.username} created the room`);
    room.broadcastState();
    return { room, player };
  }

  joinRoom(
    socket: IoSocket,
    roomId: string,
    username: string,
    token: string | undefined,
  ):
    | { error: string }
    | { room: Room; player: InternalPlayer; reconnected: boolean } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { error: 'Room not found' };

    if (token) {
      const existing = [...room.players.values()].find((p) => p.token === token);
      if (existing) {
        room.attachSocket(existing, socket);
        this.socketIndex.set(socket.id, { roomId: room.id, playerId: existing.id });
        room.broadcastState();
        return { room, player: existing, reconnected: true };
      }
    }

    if (room.players.size >= room.settings.maxPlayers) return { error: 'Room is full' };
    if (room.status === 'ended') return { error: 'Game already ended' };

    const player = room.addPlayer(username, false);
    room.attachSocket(player, socket);
    this.socketIndex.set(socket.id, { roomId: room.id, playerId: player.id });
    room.systemMessage(`${player.username} joined`);
    room.broadcastState();
    return { room, player, reconnected: false };
  }

  getContext(socketId: string): { room: Room; player: InternalPlayer } | null {
    const idx = this.socketIndex.get(socketId);
    if (!idx) return null;
    const room = this.rooms.get(idx.roomId);
    if (!room) return null;
    const player = room.players.get(idx.playerId);
    if (!player) return null;
    return { room, player };
  }

  handleDisconnect(socketId: string) {
    const ctx = this.getContext(socketId);
    this.socketIndex.delete(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    room.detachSocket(player);
    room.broadcastState();

    setTimeout(() => {
      if (player.socketId !== null) return;
      const stillThere = room.players.get(player.id);
      if (!stillThere || stillThere.socketId !== null) return;
      room.systemMessage(`${stillThere.username} left`);
      room.removePlayer(stillThere.id);
      if (room.players.size === 0) {
        room.loop.cancelTimers();
        this.rooms.delete(room.id);
      } else {
        room.broadcastState();
      }
    }, LIMITS.reconnectGraceMs);
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  private normalizeSettings(s: RoomSettings): RoomSettings {
    return {
      maxPlayers: clamp(s.maxPlayers, LIMITS.minPlayers, LIMITS.maxPlayers),
      rounds: clamp(s.rounds, LIMITS.minRounds, LIMITS.maxRounds),
      roundSeconds: clamp(s.roundSeconds, LIMITS.minRoundSeconds, LIMITS.maxRoundSeconds),
      guessesPerRound: clamp(s.guessesPerRound, LIMITS.minGuesses, LIMITS.maxGuesses),
      hintsEnabled: !!s.hintsEnabled,
      isPublic: !!s.isPublic,
      gameMode: s.gameMode === 'classic' ? 'classic' : 'strike',
      customWords: sanitizeCustomWords(s.customWords),
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
