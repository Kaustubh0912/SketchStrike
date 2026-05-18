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

  /*
   * Top status bar layout
   * ─ Mobile (portrait): row 1 = [Timer | Guesses], row 2 = [Word full-width]
   * ─ sm+              : single row = [Timer | Word | Guesses]
   * We use CSS `order` + `col-span` to flip layout without duplicating DOM.
   */
  return (
    <main className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <header className="mb-3 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-[auto_1fr_auto] items-stretch">
        <TimerBadge
          seconds={timer}
          max={room.settings.roundSeconds}
          className="order-1"
        />
        <WordDisplay
          value={wordDisplay}
          isDrawing={isDrawing}
          round={room.round}
          maxRounds={room.settings.rounds}
          className="order-3 col-span-2 sm:order-2 sm:col-span-1"
        />
        <GuessBadge
          remaining={me.guessesRemaining}
          max={room.settings.guessesPerRound}
          locked={me.isLocked}
          hidden={isDrawing || room.settings.gameMode !== 'strike'}
          guessedCorrectly={me.hasGuessedCorrectly}
          className="order-2 sm:order-3"
        />
      </header>

      {/*
       * Main grid
       * ─ Mobile order: Canvas → Chat → Scoreboard
       * ─ Desktop order: Scoreboard | Canvas | Chat
       * Chat panel is capped on desktop so messages scroll internally
       * instead of stretching the page.
       */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-3">
        <aside className="order-3 lg:order-1">
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

        <aside className="order-2 lg:order-3 h-[420px] lg:h-[min(calc(100vh-7rem),760px)]">
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
  className = '',
}: {
  value: string;
  isDrawing: boolean;
  round: number;
  maxRounds: number;
  className?: string;
}) {
  return (
    <Card
      tone="paper"
      size="sm"
      className={`text-center flex flex-col justify-center min-w-0 ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-0.5">
        <CardLabel className="!text-[var(--muted)]">
          {isDrawing ? 'Your word' : 'Word'}
        </CardLabel>
        <Badge tone="ink" size="xs">
          R{round}/{maxRounds}
        </Badge>
      </div>
      {/*
       * Fluid font-size: shrinks on narrow screens, caps at 30px on wide.
       * Tighter letter-spacing on mobile so long words like "spiderman"
       * fit on a single row without truncating.
       */}
      <div
        className="font-mono font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis"
        style={{
          fontSize: 'clamp(1rem, 4.6vw, 1.875rem)',
          letterSpacing: 'clamp(0.05em, 0.6vw, 0.25em)',
        }}
      >
        {value || '…'}
      </div>
    </Card>
  );
}

function TimerBadge({
  seconds,
  max,
  className = '',
}: {
  seconds: number;
  max: number;
  className?: string;
}) {
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
      } ${className}`}
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
  className = '',
}: {
  remaining: number;
  max: number;
  locked: boolean;
  hidden: boolean;
  guessedCorrectly: boolean;
  className?: string;
}) {
  if (hidden) {
    return (
      <Card
        tone="tile"
        size="sm"
        className={`flex items-center justify-center font-bold text-sm text-[var(--muted)] gap-2 ${className}`}
      >
        <Icon name={guessedCorrectly ? 'check' : 'penNib'} />
        {guessedCorrectly ? 'You got it' : 'Drawing'}
      </Card>
    );
  }
  if (guessedCorrectly) {
    return (
      <Card
        tone="success"
        size="sm"
        className={`flex flex-col items-center justify-center ${className}`}
      >
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
      } ${className}`}
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
