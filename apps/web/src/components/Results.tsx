'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore, selectMe } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import { clearSession } from '@/lib/session';
import Button from './ui/Button';
import Card, { CardLabel } from './ui/Card';
import Badge from './ui/Badge';
import Settings from './Settings';
import Icon from './Icon';

const PODIUM_TONES = ['primary', 'secondary', 'accent'] as const;

export default function Results() {
  const router = useRouter();
  const gameOver = useGameStore((s) => s.gameOver);
  const me = useGameStore(selectMe);
  if (!gameOver || !me) return null;
  const socket = getSocket();

  function rematch() {
    socket.emit('request_rematch');
  }

  function home() {
    socket.emit('leave_room');
    clearSession();
    router.replace('/');
  }

  const winner = gameOver.rankings[0];

  return (
    <main className="min-h-screen p-4 sm:p-8 grid place-items-center">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg"
      >
        <Card tone="paper" size="lg">
          <div className="text-center">
            <CardLabel>Final scores</CardLabel>
            <motion.h1
              initial={{ scale: 0.85, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220 }}
              className="mt-2 text-4xl sm:text-5xl font-black tracking-tight flex items-center justify-center gap-3"
            >
              <span
                className="bx-sm bg-[var(--accent)] text-[var(--accent-fg)] w-14 h-14 grid place-items-center text-2xl tilt-l"
                aria-hidden
              >
                <Icon name="trophy" />
              </span>
              {winner ? winner.username : 'Winner'}
            </motion.h1>
            <p className="mt-1 text-sm text-[var(--ink-soft)] font-semibold">
              took the crown
            </p>
          </div>

          <ul className="mt-6 space-y-2">
            {gameOver.rankings.map((r, i) => {
              const isMe = r.playerId === me.id;
              const tone = i < 3 ? PODIUM_TONES[i] : null;
              return (
                <motion.li
                  key={r.playerId}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bx-sm flex items-center justify-between px-4 py-3 ${
                    tone === 'primary'
                      ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                      : tone === 'secondary'
                        ? 'bg-[var(--secondary)] text-[var(--secondary-fg)]'
                        : tone === 'accent'
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--bg-tile)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-black w-7 flex items-center justify-center">
                      {i < 3 ? <Icon name="medal" className="text-lg" /> : `#${r.rank}`}
                    </span>
                    <span className="font-bold truncate">{r.username}</span>
                    {isMe && <Badge tone="ink" size="xs">You</Badge>}
                  </div>
                  <span className="font-mono font-black tabular-nums">{r.score}</span>
                </motion.li>
              );
            })}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            {me.isHost && (
              <Button onClick={rematch} variant="primary" size="lg">
                <Icon name="rotate" />
                Rematch
              </Button>
            )}
            <Button onClick={home} variant="ghost" size="lg">
              <Icon name="house" />
              Home
            </Button>
          </div>
        </Card>
      </motion.div>
      <Settings />
    </main>
  );
}
