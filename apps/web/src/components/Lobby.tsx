'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LIMITS, type RoomSettings } from '@sketchstrike/shared';
import { useGameStore, selectMe } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import { clearSession } from '@/lib/session';
import Button from './ui/Button';
import Card, { CardLabel } from './ui/Card';
import Badge from './ui/Badge';
import PlayerChip from './PlayerChip';
import Icon from './Icon';
import Settings from './Settings';

export default function Lobby() {
  const router = useRouter();
  const room = useGameStore((s) => s.room);
  const me = useGameStore(selectMe);
  const [copied, setCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  if (!room || !me) return null;

  const isHost = me.isHost;
  const socket = getSocket();
  const enoughPlayers = room.players.length >= LIMITS.minPlayers;

  function update<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
    socket.emit('update_settings', { [key]: value } as Partial<RoomSettings>);
  }

  function leave() {
    socket.emit('leave_room');
    clearSession();
    router.replace('/');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room!.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function shareInvite() {
    const url = `${window.location.origin}/room/${room!.roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SketchStrike', text: 'Join my SketchStrike game!', url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkShared(true);
      setTimeout(() => setLinkShared(false), 1500);
    } catch {}
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="bx-sm bg-[var(--primary)] text-[var(--primary-fg)] w-11 h-11 grid place-items-center text-lg tilt-l">
            <Icon name="penNib" />
          </div>
          <h1 className="font-black text-2xl tracking-tight">Lobby</h1>
        </div>
        <Button onClick={leave} variant="ghost" size="sm">
          <Icon name="leave" />
          <span>Leave</span>
        </Button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card tone="accent" size="lg" className="text-center">
          <CardLabel className="!text-[var(--accent-fg)] opacity-70">Room code</CardLabel>
          <div className="mt-1 font-mono font-black text-5xl sm:text-7xl tracking-[0.3em] sm:tracking-[0.4em]">
            {room.roomId}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button onClick={copyCode} variant="ghost" size="sm">
              <Icon name={copied ? 'check' : 'copy'} />
              <span>{copied ? 'Copied' : 'Copy code'}</span>
            </Button>
            <Button onClick={shareInvite} variant="ghost" size="sm">
              <Icon name={linkShared ? 'check' : 'share'} />
              <span>{linkShared ? 'Link copied!' : 'Share link'}</span>
            </Button>
          </div>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
        <Card tone="paper">
          <div className="flex items-center justify-between mb-4">
            <CardLabel>
              <Icon name="users" /> Players · {room.players.length}/{room.settings.maxPlayers}
            </CardLabel>
            {!enoughPlayers && <Badge tone="danger" size="xs">Need 2+</Badge>}
          </div>
          <ul className="space-y-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <PlayerChip player={p} isMe={p.id === me.id} compact />
                </div>
                {isHost && p.id !== me.id && (
                  <Button
                    onClick={() => socket.emit('kick_player', { playerId: p.id })}
                    variant="danger"
                    size="sm"
                  >
                    <Icon name="kick" />
                    <span className="hidden sm:inline">Kick</span>
                  </Button>
                )}
              </li>
            ))}
            {Array.from({
              length: Math.max(0, room.settings.maxPlayers - room.players.length),
            }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="bx-sm border-dashed bg-[var(--bg-tile)] opacity-50 px-3 py-2 text-sm text-[var(--muted)]"
              >
                Empty slot
              </li>
            ))}
          </ul>
        </Card>

        <Card tone="paper">
          <CardLabel className="mb-4">
            Settings {!isHost && '(host controls)'}
          </CardLabel>
          <div className="space-y-4">
            <div>
              <CardLabel className="!text-[var(--ink-soft)] mb-2">Mode</CardLabel>
              <div className="grid grid-cols-2 gap-2">
                <ModePill
                  active={room.settings.gameMode === 'strike'}
                  onClick={() => isHost && update('gameMode', 'strike')}
                  disabled={!isHost}
                  icon="bullseye"
                  label="Strike"
                  desc="Limited guesses"
                />
                <ModePill
                  active={room.settings.gameMode === 'classic'}
                  onClick={() => isHost && update('gameMode', 'classic')}
                  disabled={!isHost}
                  icon="palette"
                  label="Classic"
                  desc="Unlimited guesses"
                />
              </div>
            </div>

            <Slider
              label="Rounds"
              value={room.settings.rounds}
              min={LIMITS.minRounds}
              max={LIMITS.maxRounds}
              disabled={!isHost}
              onChange={(v) => update('rounds', v)}
            />
            <Slider
              label="Round time"
              suffix="s"
              value={room.settings.roundSeconds}
              min={LIMITS.minRoundSeconds}
              max={LIMITS.maxRoundSeconds}
              step={10}
              disabled={!isHost}
              onChange={(v) => update('roundSeconds', v)}
            />
            <Slider
              label="Guesses / round"
              value={room.settings.guessesPerRound}
              min={LIMITS.minGuesses}
              max={LIMITS.maxGuesses}
              disabled={!isHost || room.settings.gameMode !== 'strike'}
              onChange={(v) => update('guessesPerRound', v)}
            />

            <Toggle
              label="Hints (letter reveals)"
              value={room.settings.hintsEnabled}
              disabled={!isHost}
              onChange={(v) => update('hintsEnabled', v)}
            />

            <CustomWordsField
              value={room.settings.customWords}
              disabled={!isHost}
              onChange={(words) => update('customWords', words)}
            />
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {isHost ? (
          <Button
            onClick={() => socket.emit('start_game')}
            disabled={!enoughPlayers}
            size="lg"
            variant="primary"
          >
            <Icon name="play" />
            Start game
          </Button>
        ) : (
          <Card tone="tile" size="sm" padded={false}>
            <div className="px-4 py-2 text-sm font-bold text-[var(--ink-soft)] flex items-center gap-2">
              <Icon name="hourglass" />
              Waiting for host to start…
            </div>
          </Card>
        )}
      </div>
      <Settings />
    </main>
  );
}

function ModePill({
  active,
  onClick,
  disabled,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: 'bullseye' | 'palette';
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`bx-sm text-left px-3 py-2.5 transition ${
        active
          ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
          : 'bg-[var(--bg-tile)] text-[var(--ink)]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'bx-press'}`}
    >
      <div className="flex items-center gap-2 font-black">
        <Icon name={icon} />
        <span>{label}</span>
      </div>
      <div className="text-[11px] opacity-80 mt-0.5">{desc}</div>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={disabled ? 'opacity-60' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <CardLabel className="!text-[var(--ink-soft)]">{label}</CardLabel>
        <Badge tone="ink" size="sm">
          {value}
          {suffix}
        </Badge>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function CustomWordsField({
  value,
  disabled,
  onChange,
}: {
  value: string[];
  disabled: boolean;
  onChange: (words: string[]) => void;
}) {
  const [local, setLocal] = useState(() => value.join(', '));
  const [focused, setFocused] = useState(false);
  // Track the last value we emitted so we can detect server-normalized echoes
  // and only resync the textarea when the server's view actually changed.
  const lastEmittedRef = useRef(value.join(', '));

  useEffect(() => {
    if (focused) return;
    const incoming = value.join(', ');
    if (incoming === lastEmittedRef.current) return;
    setLocal(incoming);
    lastEmittedRef.current = incoming;
  }, [value, focused]);

  const parsed = useMemo(
    () =>
      local
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [local],
  );

  function commit() {
    const normalized = parsed.join(', ');
    if (normalized === lastEmittedRef.current) return;
    lastEmittedRef.current = normalized;
    onChange(parsed);
  }

  const usingCustom = value.length >= LIMITS.minCustomWords;
  const overLimit = parsed.length > LIMITS.maxCustomWords;
  const tooFew = parsed.length > 0 && parsed.length < LIMITS.minCustomWords;

  return (
    <div className={disabled && value.length === 0 ? 'opacity-60' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <CardLabel className="!text-[var(--ink-soft)]">Custom words</CardLabel>
        <Badge tone={usingCustom ? 'success' : 'ink'} size="sm">
          {parsed.length} {parsed.length === 1 ? 'word' : 'words'}
        </Badge>
      </div>
      <textarea
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        placeholder="pizza, ramen, taco, sushi, donut…"
        rows={3}
        spellCheck={false}
        className="bx-sm w-full px-3 py-2 min-h-[88px] bg-[var(--paper)] text-[var(--ink)] font-medium placeholder:text-[var(--muted)] placeholder:font-medium focus:outline-none focus-visible:outline-3 focus-visible:outline-[var(--ring)] resize-y"
      />
      <p className="mt-1.5 text-xs text-[var(--muted)] font-semibold">
        {overLimit ? (
          <span className="text-[var(--danger)]">
            Max {LIMITS.maxCustomWords} words — extras will be dropped.
          </span>
        ) : tooFew ? (
          <span>
            Add {LIMITS.minCustomWords - parsed.length} more to use these instead of the default bank.
          </span>
        ) : usingCustom ? (
          <span className="text-[var(--success)]">Using your custom bank.</span>
        ) : (
          <span>Comma-separated. Leave empty for the default word bank.</span>
        )}
      </p>
    </div>
  );
}

function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`bx-sm w-full flex items-center justify-between px-3 py-2.5 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'bx-press'
      } bg-[var(--bg-tile)]`}
    >
      <span className="font-bold text-sm">{label}</span>
      <span
        className={`w-12 h-7 rounded-full border-2 border-[var(--ink)] relative transition ${
          value ? 'bg-[var(--ink)]' : 'bg-[var(--paper)]'
        }`}
      >
        <span
          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition border-2 border-[var(--ink)] ${
            value ? 'left-[24px] bg-[var(--paper)]' : 'left-[2px] bg-[var(--paper)]'
          }`}
        />
      </span>
    </button>
  );
}
