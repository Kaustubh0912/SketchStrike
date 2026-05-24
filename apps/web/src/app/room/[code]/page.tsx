'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LIMITS } from '@sketchstrike/shared';
import { useGameStore } from '@/store/gameStore';
import { useSocketBindings } from '@/lib/bindSocket';
import { getSocket } from '@/lib/socket';
import {
  clearSession,
  loadSession,
  loadUsername,
  saveSession,
  saveUsername,
} from '@/lib/session';
import Lobby from '@/components/Lobby';
import GameScreen from '@/components/GameScreen';
import Results from '@/components/Results';
import Card, { CardLabel } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/Icon';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = useMemo(() => (params?.code ?? '').toUpperCase(), [params]);

  useSocketBindings();

  const room = useGameStore((s) => s.room);
  const joining = useGameStore((s) => s.joining);
  const joinError = useGameStore((s) => s.joinError);
  const gameOver = useGameStore((s) => s.gameOver);
  const setJoining = useGameStore((s) => s.setJoining);
  const setJoinError = useGameStore((s) => s.setJoinError);
  const setIdentity = useGameStore((s) => s.setIdentity);
  const reset = useGameStore((s) => s.reset);

  const [name, setName] = useState('');
  const [needName, setNeedName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const join = useCallback(
    (username: string) => {
      const socket = getSocket();
      const session = loadSession(roomCode);
      setJoining(true);
      socket.emit(
        'join_room',
        { roomId: roomCode, username, token: session?.token },
        (res) => {
          setJoining(false);
          if (!res.ok) {
            setJoinError(res.error);
            clearSession();
            return;
          }
          setIdentity({ playerId: res.data.playerId, token: res.data.token });
          saveSession({ roomId: roomCode, playerId: res.data.playerId, token: res.data.token });
        },
      );
    },
    [roomCode, setIdentity, setJoinError, setJoining],
  );

  useEffect(() => {
    if (!roomCode) return;
    const existing = loadUsername();
    if (existing) {
      setName(existing);
      join(existing);
    } else {
      // Arrived via a shared link without a saved name — ask for one in place
      // rather than bouncing to the home page and losing the room code.
      setNeedName(true);
    }
    return () => reset();
  }, [roomCode, join, reset]);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const u = name.trim();
    if (u.length < 2) return setNameError('Pick a name with at least 2 characters');
    if (u.length > LIMITS.maxUsernameLength) {
      return setNameError(`Max ${LIMITS.maxUsernameLength} characters`);
    }
    setNameError(null);
    saveUsername(u);
    setNeedName(false);
    setJoinError(null);
    join(u);
  }

  if (needName && !room) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card tone="paper" size="lg" className="w-full max-w-sm">
          <div className="text-center">
            <CardLabel>You&apos;re invited to</CardLabel>
            <div className="font-mono font-black text-4xl tracking-[0.3em] mt-1 mb-5">
              {roomCode}
            </div>
          </div>
          <form onSubmit={submitName} className="space-y-4">
            <Input
              label="Your name"
              value={name}
              maxLength={LIMITS.maxUsernameLength}
              onChange={(e) => setName(e.target.value)}
              placeholder="captain doodle"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={joining}>
              <Icon name="doorOpen" />
              {joining ? 'Joining…' : 'Join game'}
            </Button>
            {nameError && (
              <div className="bx-sm bg-[var(--danger)] text-[var(--danger-fg)] px-4 py-3 text-sm font-bold flex items-center gap-2">
                <Icon name="warning" />
                {nameError}
              </div>
            )}
          </form>
        </Card>
      </main>
    );
  }

  if (joining && !room) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card tone="paper" size="md" className="text-center min-w-[260px]">
          <div
            className="bx-sm bg-[var(--primary)] text-[var(--primary-fg)] w-12 h-12 mx-auto mb-3 grid place-items-center text-xl animate-pulse"
            aria-hidden
          >
            <Icon name="penNib" />
          </div>
          <CardLabel>Joining</CardLabel>
          <div className="font-mono font-black text-3xl tracking-[0.3em] mt-1">{roomCode}</div>
        </Card>
      </main>
    );
  }

  if (joinError && !room) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card tone="paper" size="lg" className="text-center max-w-md">
          <div
            className="bx-sm bg-[var(--danger)] text-[var(--danger-fg)] w-14 h-14 mx-auto mb-3 grid place-items-center text-2xl"
            aria-hidden
          >
            <Icon name="warning" />
          </div>
          <CardLabel>Couldn&apos;t join</CardLabel>
          <p className="mt-2 font-bold text-[var(--danger)]">{joinError}</p>
          <Button
            onClick={() => router.replace('/')}
            variant="primary"
            size="md"
            className="mt-5"
          >
            <Icon name="house" />
            Back to home
          </Button>
        </Card>
      </main>
    );
  }

  if (!room) return null;

  // Only show Results while the server says the game is actually over.
  // After a rematch the status transitions back to 'choosing'/'playing',
  // so we should fall through to GameScreen even if stale gameOver data lingers.
  if (gameOver && room.status === 'ended') return <Results />;
  if (room.status === 'lobby') return <Lobby />;
  return <GameScreen />;
}
