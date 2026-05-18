'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, selectIsDrawing, selectMe } from '@/store/gameStore';
import PlayerChip from './PlayerChip';
import ChatPanel from './ChatPanel';
import WordChoiceModal from './WordChoiceModal';
import RoundEndOverlay from './RoundEndOverlay';
import Settings from './Settings';
import Badge from './ui/Badge';
import Card, { CardLabel } from './ui/Card';
import Icon from './Icon';

const DrawingCanvas = dynamic(() => import('./DrawingCanvas'), { ssr: false });

export default function GameScreen() {
  const room = useGameStore((s) => s.room);
  const timer = useGameStore((s) => s.timerRemaining);
  const drawerWord = useGameStore((s) => s.drawerWord);
  const isDrawing = useGameStore(selectIsDrawing);
  const me = useGameStore(selectMe);
  const summary = useGameStore((s) => s.lastRoundSummary);
  const wordChoices = useGameStore((s) => s.wordChoices);

  if (!room || !me) return null;

  const wordDisplay = isDrawing ? drawerWord ?? '' : room.maskedWord ?? '';

  return (
    <main className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <header className="mb-3 grid grid-cols-3 sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-3 items-stretch">
        <TimerBadge seconds={timer} max={room.settings.roundSeconds} />
        <WordDisplay
          value={wordDisplay}
          isDrawing={isDrawing}
          round={room.round}
          maxRounds={room.settings.rounds}
        />
        <GuessBadge
          remaining={me.guessesRemaining}
          max={room.settings.guessesPerRound}
          locked={me.isLocked}
          hidden={isDrawing || room.settings.gameMode !== 'strike'}
          guessedCorrectly={me.hasGuessedCorrectly}
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-3">
        <aside className="order-2 lg:order-1">
          <Card tone="paper" size="sm">
            <CardLabel className="mb-3">
              <Icon name="users" /> Scoreboard
            </CardLabel>
            <ul className="space-y-1.5">
              {[...room.players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <li key={p.id}>
                    <PlayerChip player={p} rank={i + 1} isMe={p.id === me.id} />
                  </li>
                ))}
            </ul>
          </Card>
        </aside>

        <section className="order-1 lg:order-2">
          <DrawingCanvas canDraw={isDrawing && room.status === 'playing'} />
        </section>

        <aside className="order-3 h-[400px] lg:h-auto">
          <ChatPanel />
        </aside>
      </div>

      <AnimatePresence>
        {wordChoices && isDrawing && room.status === 'choosing' && <WordChoiceModal />}
      </AnimatePresence>
      <AnimatePresence>{summary && <RoundEndOverlay summary={summary} />}</AnimatePresence>

      <Settings />
    </main>
  );
}

function WordDisplay({
  value,
  isDrawing,
  round,
  maxRounds,
}: {
  value: string;
  isDrawing: boolean;
  round: number;
  maxRounds: number;
}) {
  return (
    <Card tone="paper" size="sm" className="text-center flex flex-col justify-center min-w-0">
      <div className="flex items-center justify-center gap-2 mb-0.5">
        <CardLabel className="!text-[var(--muted)]">
          {isDrawing ? 'Your word' : 'Word'}
        </CardLabel>
        <Badge tone="ink" size="xs">
          R{round}/{maxRounds}
        </Badge>
      </div>
      <div className="font-mono font-black text-2xl sm:text-3xl tracking-[0.25em] truncate uppercase">
        {value || '…'}
      </div>
    </Card>
  );
}

function TimerBadge({ seconds, max }: { seconds: number; max: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, seconds / max)) : 0;
  const urgent = seconds <= 10 && seconds > 0;
  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.55, repeat: urgent ? Infinity : 0 }}
      className={`bx-sm flex flex-col items-center justify-center px-3 py-2 ${
        urgent
          ? 'bg-[var(--danger)] text-[var(--danger-fg)]'
          : 'bg-[var(--secondary)] text-[var(--secondary-fg)]'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1">
        <Icon name="stopwatch" /> Time
      </div>
      <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{seconds}</div>
      <div className="w-full h-1.5 rounded mt-1 overflow-hidden bg-[var(--paper)] border border-[var(--ink)]">
        <div
          className="h-full bg-[var(--ink)] transition-all"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </motion.div>
  );
}

function GuessBadge({
  remaining,
  max,
  locked,
  hidden,
  guessedCorrectly,
}: {
  remaining: number;
  max: number;
  locked: boolean;
  hidden: boolean;
  guessedCorrectly: boolean;
}) {
  if (hidden) {
    return (
      <Card
        tone="tile"
        size="sm"
        className="flex items-center justify-center font-bold text-sm text-[var(--muted)] gap-2"
      >
        <Icon name={guessedCorrectly ? 'check' : 'penNib'} />
        {guessedCorrectly ? 'You got it' : 'You are drawing'}
      </Card>
    );
  }
  if (guessedCorrectly) {
    return (
      <Card tone="success" size="sm" className="flex flex-col items-center justify-center">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Status</div>
        <div className="text-xl sm:text-2xl font-black flex items-center gap-1">
          <Icon name="check" />
          NAILED IT
        </div>
      </Card>
    );
  }
  const lowLeft = !locked && remaining <= 1;
  return (
    <motion.div
      animate={lowLeft ? { rotate: [-1.5, 1.5, -1.5, 0] } : { rotate: 0 }}
      transition={{ duration: 0.5, repeat: lowLeft ? Infinity : 0, repeatDelay: 1.2 }}
      className={`bx-sm flex flex-col items-center justify-center px-3 py-2 ${
        locked
          ? 'bg-[var(--danger)] text-[var(--danger-fg)]'
          : lowLeft
            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
            : 'bg-[var(--primary)] text-[var(--primary-fg)]'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1">
        <Icon name={locked ? 'lock' : 'bullseye'} />
        {locked ? 'Status' : 'Guesses'}
      </div>
      <div className="text-xl sm:text-2xl font-black tabular-nums leading-tight">
        {locked ? 'LOCKED' : `${remaining}/${max}`}
      </div>
      {!locked && (
        <div className="flex gap-0.5 mt-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-3 rounded-sm border border-[var(--ink)] ${
                i < remaining ? 'bg-[var(--ink)]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
