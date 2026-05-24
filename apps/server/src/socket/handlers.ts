import type { Server, Socket } from 'socket.io';
import {
  LIMITS,
  type ClientToServerEvents,
  type DrawEvent,
  type RoomSettings,
  type ServerToClientEvents,
} from '@sketchstrike/shared';
import { judgeGuess } from '../game/GuessValidator.js';
import type { Room, RoomManager } from '../game/RoomManager.js';
import { scoreGuesser } from '../game/Scoring.js';
import { newMessageId as newGuessMessageId } from '../utils/id.js';
import { sanitizeChat, sanitizeCustomWords } from '../utils/normalize.js';
import { clientIp, type RateLimiter } from '../utils/security.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface HandlerGuards {
  /** Per-IP limiter for room creation. */
  roomCreateLimiter: RateLimiter;
  /** Hard ceiling on concurrent rooms across the whole server. */
  maxRooms: number;
}

/**
 * Wraps an event handler so a thrown error is logged instead of bubbling up to
 * `uncaughtException` — one bad payload must never take down every live game.
 */
function safe<A extends unknown[]>(
  event: string,
  fn: (...args: A) => void,
): (...args: A) => void {
  return (...args: A) => {
    try {
      fn(...args);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[handler:${event}]`, err);
    }
  };
}

export function registerHandlers(io: IoServer, manager: RoomManager, guards: HandlerGuards) {
  io.on('connection', (socket: IoSocket) => {
    socket.on('create_room', safe('create_room', (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (!guards.roomCreateLimiter.allow(clientIp(socket))) {
        return ack({ ok: false, error: 'Creating rooms too quickly — wait a moment.' });
      }
      if (manager.roomCount >= guards.maxRooms) {
        return ack({ ok: false, error: 'Server is at capacity. Please try again later.' });
      }
      const username = cleanUsername(payload?.username);
      if (!username) return ack({ ok: false, error: 'Username required' });
      const { room, player } = manager.createRoom(socket, username, payload?.settings);
      ack({ ok: true, data: { roomId: room.id, playerId: player.id, token: player.token } });
    }));

    socket.on('join_room', safe('join_room', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const username = cleanUsername(payload?.username);
      if (!username) return ack({ ok: false, error: 'Username required' });
      const result = manager.joinRoom(socket, payload.roomId, username, payload.token);
      if ('error' in result) return ack({ ok: false, error: result.error });
      const { player, room, reconnected } = result;
      ack({ ok: true, data: { playerId: player.id, token: player.token } });

      if (reconnected && room.drawHistory.length > 0) {
        socket.emit('canvas_replay', { events: room.drawHistory });
      }
      if (reconnected && room.currentWord && player.id === room.currentDrawerId) {
        socket.emit('drawer_word', { word: room.currentWord });
      }
    }));

    socket.on('leave_room', safe('leave_room', () => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      room.systemMessage(`${player.username} left`);
      room.removePlayer(player.id);
      socket.leave(room.id);
      if (room.players.size === 0) {
        room.loop.cancelTimers();
        manager.removeRoom(room.id);
      } else {
        room.broadcastState();
      }
    }));

    socket.on('update_settings', safe('update_settings', (settings) => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.hostId) return;
      if (room.status !== 'lobby') return;
      room.settings = applySettings(room.settings, settings);
      for (const p of room.players.values()) {
        p.guessesRemaining = room.settings.guessesPerRound;
      }
      room.broadcastState();
    }));

    socket.on('kick_player', safe('kick_player', (payload) => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.hostId) return;
      const target = room.players.get(payload.playerId);
      if (!target || target.id === player.id) return;
      if (target.socketId) {
        io.to(target.socketId).emit('error_message', { message: 'You were kicked' });
        io.sockets.sockets.get(target.socketId)?.leave(room.id);
      }
      room.systemMessage(`${target.username} was kicked`);
      room.removePlayer(target.id);
      room.broadcastState();
    }));

    socket.on('start_game', safe('start_game', () => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.hostId) return;
      if (room.status !== 'lobby' && room.status !== 'ended') return;
      room.loop.startGame();
    }));

    socket.on('choose_word', safe('choose_word', (payload) => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      room.loop.chooseWord(player.id, payload.word);
    }));

    socket.on('drawing_data', safe('drawing_data', (payload) => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (room.status !== 'playing') return;
      if (player.id !== room.currentDrawerId) return;
      const safeEvent = sanitizeDrawEvent(payload);
      if (!safeEvent) return;
      room.drawHistory.push(safeEvent);
      if (room.drawHistory.length > 5000) room.drawHistory.shift();
      socket.to(room.id).emit('canvas_event', safeEvent);
    }));

    socket.on('clear_canvas', safe('clear_canvas', () => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.currentDrawerId) return;
      room.drawHistory = [];
      io.to(room.id).emit('canvas_cleared');
    }));

    socket.on('undo_canvas', safe('undo_canvas', () => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.currentDrawerId) return;
      room.drawHistory.pop();
      io.to(room.id).emit('canvas_replay', { events: room.drawHistory });
    }));

    socket.on('submit_guess', safe('submit_guess', (payload) => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      handleGuess(io, ctx.room, ctx.player.id, payload?.text ?? '');
    }));

    socket.on('request_rematch', safe('request_rematch', () => {
      const ctx = manager.getContext(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      if (player.id !== room.hostId) return;
      if (room.status !== 'ended') return;
      room.loop.startGame();
    }));

    socket.on('disconnect', safe('disconnect', () => {
      manager.handleDisconnect(socket.id);
    }));
  });
}

function handleGuess(io: IoServer, room: Room, playerId: string, rawText: string) {
  const player = room.players.get(playerId);
  if (!player) return;
  if (room.status !== 'playing') return;
  if (player.id === room.currentDrawerId) return;
  if (player.hasGuessedCorrectly) return;
  if (player.isLocked) return;

  const text = sanitizeChat(rawText, LIMITS.maxChatLength);
  if (!text) return;

  const now = Date.now();
  if (now - player.lastGuessAt < LIMITS.guessCooldownMs) {
    if (player.socketId) {
      io.to(player.socketId).emit('error_message', { message: 'Slow down a bit!' });
    }
    return;
  }
  player.lastGuessAt = now;

  const word = room.currentWord ?? '';
  const judgement = judgeGuess(text, word);

  if (judgement.kind === 'empty') return;

  if (judgement.kind === 'correct') {
    player.hasGuessedCorrectly = true;
    const rank = room.loop.rankAmongCorrect(player.id);
    const gained = scoreGuesser({
      roundSeconds: room.settings.roundSeconds,
      timeRemaining: room.loop.timerRemaining,
      guessesRemaining: player.guessesRemaining,
      maxGuesses: room.settings.guessesPerRound,
      rankAmongCorrect: rank,
    });
    player.score += gained;
    player.lastRoundGained += gained;
    room.loop.notifyCorrectGuess(player.id);
    room.systemMessage(`${player.username} guessed it!`, 'correct');
    io.to(room.id).emit('player_guessed_correct', { playerId: player.id, gained });
    room.broadcastState();
    return;
  }

  if (judgement.kind === 'close') {
    // Only the guesser sees the "close" marker so they can't leak the word range to others.
    if (player.socketId) {
      io.to(player.socketId).emit('chat_message', {
        id: newGuessMessageId(),
        playerId: player.id,
        username: player.username,
        text,
        kind: 'close',
        timestamp: Date.now(),
      });
    }
  } else {
    room.chatMessage(player, text, 'chat');
  }

  if (room.settings.gameMode === 'strike') {
    player.guessesRemaining = Math.max(0, player.guessesRemaining - 1);
    io.to(room.id).emit('guesses_updated', {
      playerId: player.id,
      guessesRemaining: player.guessesRemaining,
    });
    if (player.guessesRemaining === 0) {
      player.isLocked = true;
      io.to(room.id).emit('player_locked', { playerId: player.id });
      room.systemMessage(`${player.username} is locked out!`, 'locked');
      room.loop.maybeEndEarly();
    }
    room.broadcastState();
  }
}

function cleanUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = sanitizeChat(input, LIMITS.maxUsernameLength);
  if (cleaned.length < 2) return null;
  return cleaned;
}

function sanitizeDrawEvent(input: DrawEvent | undefined): DrawEvent | null {
  if (!input || typeof input !== 'object') return null;
  if (input.type !== 'draw' && input.type !== 'erase') return null;
  if (!Array.isArray(input.points) || input.points.length < 2 || input.points.length > 4000) return null;
  if (input.points.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return null;
  const color = typeof input.color === 'string' ? input.color.slice(0, 9) : '#000000';
  const brushSize = typeof input.brushSize === 'number' ? Math.max(1, Math.min(60, input.brushSize)) : 4;
  return { type: input.type, points: input.points, color, brushSize };
}

function applySettings(current: RoomSettings, incoming: Partial<RoomSettings>): RoomSettings {
  const merged: RoomSettings = { ...current, ...incoming };
  return {
    maxPlayers: clamp(merged.maxPlayers, LIMITS.minPlayers, LIMITS.maxPlayers),
    rounds: clamp(merged.rounds, LIMITS.minRounds, LIMITS.maxRounds),
    roundSeconds: clamp(merged.roundSeconds, LIMITS.minRoundSeconds, LIMITS.maxRoundSeconds),
    guessesPerRound: clamp(merged.guessesPerRound, LIMITS.minGuesses, LIMITS.maxGuesses),
    hintsEnabled: !!merged.hintsEnabled,
    isPublic: !!merged.isPublic,
    gameMode: merged.gameMode === 'classic' ? 'classic' : 'strike',
    customWords: sanitizeCustomWords(merged.customWords),
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
