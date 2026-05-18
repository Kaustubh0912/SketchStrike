'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LIMITS } from '@sketchstrike/shared';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Icon, { type IconName } from '@/components/Icon';
import Settings from '@/components/Settings';
import { getSocket } from '@/lib/socket';
import { loadUsername, saveSession, saveUsername } from '@/lib/session';

export default function LandingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(loadUsername());
  }, []);

  function validate(): string | null {
    const u = username.trim();
    if (u.length < 2) return 'Pick a name with at least 2 characters';
    if (u.length > LIMITS.maxUsernameLength) return `Max ${LIMITS.maxUsernameLength} characters`;
    return null;
  }

  function handleCreate() {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setBusy('create');
    saveUsername(username.trim());
    const socket = getSocket();
    socket.emit('create_room', { username: username.trim() }, (res) => {
      setBusy(null);
      if (!res.ok) return setError(res.error);
      saveSession({ roomId: res.data.roomId, playerId: res.data.playerId, token: res.data.token });
      router.push(`/room/${res.data.roomId}`);
    });
  }

  function handleJoin() {
    const err = validate();
    if (err) return setError(err);
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return setError('Enter a valid room code');
    setError(null);
    setBusy('join');
    saveUsername(username.trim());
    const socket = getSocket();
    socket.emit('join_room', { roomId: code, username: username.trim() }, (res) => {
      setBusy(null);
      if (!res.ok) return setError(res.error);
      saveSession({ roomId: code, playerId: res.data.playerId, token: res.data.token });
      router.push(`/room/${code}`);
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-12 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <header className="mb-8 sm:mb-12">
          <Logo />
        </header>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <Card tone="accent" className="inline-block tilt-l" size="sm" padded={false}>
              <div className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon name="bullseye" />
                Skribbl, but every wrong guess costs you
              </div>
            </Card>
            <h1 className="text-5xl sm:text-7xl font-black leading-[0.95] tracking-tight">
              Draw it.<br />
              Guess it.<br />
              <span className="inline-block bg-[var(--primary)] text-[var(--primary-fg)] px-3 border-[3px] border-[var(--ink)] rounded-md tilt-r">
                Don&apos;t miss.
              </span>
            </h1>
            <p className="text-lg text-[var(--ink-soft)] max-w-md">
              You get <strong>limited guesses</strong> each round. Spam and you&apos;re locked
              out. Strategy beats speed.
            </p>

            <ul className="grid sm:grid-cols-3 gap-3 pt-2">
              <Feature icon="bullseye" title="Strike mode" body="Every wrong guess burns a try." />
              <Feature icon="bolt" title="Realtime" body="Stroke-by-stroke sync." />
              <Feature icon="mobile" title="Anywhere" body="Phone or desktop, same fun." />
            </ul>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card size="lg" tone="paper" className="space-y-5">
              <Input
                label="Your name"
                value={username}
                maxLength={LIMITS.maxUsernameLength}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="captain doodle"
                autoComplete="off"
                spellCheck={false}
              />

              <Button
                onClick={handleCreate}
                disabled={busy !== null}
                size="lg"
                fullWidth
                variant="primary"
              >
                <Icon name="rocket" />
                {busy === 'create' ? 'Creating…' : 'Create new room'}
              </Button>

              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[var(--muted)] font-bold">
                <span className="h-[3px] flex-1 bg-[var(--ink)] rounded" />
                or join
                <span className="h-[3px] flex-1 bg-[var(--ink)] rounded" />
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Input
                  value={joinCode}
                  maxLength={6}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="uppercase tracking-[0.4em] text-center font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button onClick={handleJoin} disabled={busy !== null} size="md" variant="accent">
                  <Icon name="doorOpen" />
                  {busy === 'join' ? '…' : 'Join'}
                </Button>
              </div>

              {error && (
                <div className="bx-sm bg-[var(--danger)] text-[var(--danger-fg)] px-4 py-3 text-sm font-bold flex items-center gap-2">
                  <Icon name="warning" />
                  {error}
                </div>
              )}
            </Card>
          </motion.section>
        </div>
      </div>
      <Settings />
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="bx-sm bg-[var(--primary)] text-[var(--primary-fg)] w-11 h-11 grid place-items-center text-xl font-black tilt-l">
        <Icon name="penNib" />
      </div>
      <div className="font-black text-2xl tracking-tight">SketchStrike</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <Card tone="tile" size="sm" className="space-y-1.5">
      <div
        className="bx-sm bg-[var(--primary)] text-[var(--primary-fg)] w-9 h-9 grid place-items-center text-sm"
        aria-hidden
      >
        <Icon name={icon} />
      </div>
      <div className="font-bold">{title}</div>
      <div className="text-xs text-[var(--ink-soft)]">{body}</div>
    </Card>
  );
}
