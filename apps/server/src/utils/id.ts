import { customAlphabet, nanoid } from 'nanoid';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 5);

export function newRoomCode(): string {
  return generateRoomCode();
}

export function newPlayerId(): string {
  return nanoid(12);
}

export function newToken(): string {
  return nanoid(32);
}

export function newMessageId(): string {
  return nanoid(10);
}
