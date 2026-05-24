import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@sketchstrike/shared';
import { RoomManager } from './game/RoomManager.js';
import { registerHandlers } from './socket/handlers.js';
import { ConnectionCounter, RateLimiter, clientIp } from './utils/security.js';

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Abuse limits — generous enough for friends, protective against an open URL.
const MAX_ROOMS = Number(process.env.MAX_ROOMS ?? 1000);
const MAX_CONNECTIONS_PER_IP = Number(process.env.MAX_CONNECTIONS_PER_IP ?? 30);
const ROOM_CREATE_PER_MIN = Number(process.env.ROOM_CREATE_PER_MIN ?? 12);

const app = express();
// Render and most PaaS hosts sit behind a proxy; trust it so client IPs resolve.
app.set('trust proxy', true);
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN, credentials: true },
  maxHttpBufferSize: 1e6,
});

const connections = new ConnectionCounter();
const roomCreateLimiter = new RateLimiter(ROOM_CREATE_PER_MIN, 60_000);

// Reject connections once an IP is holding too many sockets.
io.use((socket, next) => {
  const ip = clientIp(socket);
  if (connections.increment(ip) > MAX_CONNECTIONS_PER_IP) {
    connections.decrement(ip);
    return next(new Error('Too many connections from your network'));
  }
  next();
});
io.on('connection', (socket) => {
  socket.on('disconnect', () => connections.decrement(clientIp(socket)));
});

const manager = new RoomManager(io);
registerHandlers(io, manager, { roomCreateLimiter, maxRooms: MAX_ROOMS });

// Drop idle rate-limit buckets so the maps don't grow without bound.
const sweepTimer = setInterval(() => roomCreateLimiter.sweep(), 60_000);
sweepTimer.unref();

// In-memory state means a hard crash drops every active game, so we log
// unexpected errors and keep the process alive rather than letting them bubble
// up to a fatal exit. Handlers are already wrapped (see registerHandlers); this
// is the last-resort net.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[sketchstrike] ${signal} received — draining connections`);
  io.close(() => {
    httpServer.close(() => {
      // eslint-disable-next-line no-console
      console.log('[sketchstrike] closed cleanly');
      process.exit(0);
    });
  });
  // Don't hang forever if a socket refuses to close.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sketchstrike] server listening on :${PORT}`);
});
