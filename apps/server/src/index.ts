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

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

const app = express();
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

const manager = new RoomManager(io);
registerHandlers(io, manager);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sketchstrike] server listening on :${PORT}`);
});
