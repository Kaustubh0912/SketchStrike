'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useSocketBindings } from '@/lib/bindSocket';
import { getSocket } from '@/lib/socket';
import { clearSession, loadSession, loadUsername, saveSession } from '@/lib/session';
import Lobby from '@/components/Lobby';
import GameScreen from '@/components/GameScreen';
import Results from '@/components/Results';
import Card, { CardLabel } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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

  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();
    const username = loadUsername();
    if (!username) {
      router.replace('/');
      return;
    }
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

    return () => {
      reset();
    };
  }, [roomCode, router, setIdentity, setJoinError, setJoining, reset]);

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

  if (gameOver) return <Results />;
  if (room.status === 'lobby') return <Lobby />;
  return <GameScreen />;
}
