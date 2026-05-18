'use client';

import { useEffect, useRef, useState } from 'react';
import { LIMITS, type ChatMessage } from '@sketchstrike/shared';
import { useGameStore, selectIsDrawing, selectMe } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import Button from './ui/Button';
import { CardLabel } from './ui/Card';
import Icon from './Icon';

export default function ChatPanel() {
  const messages = useGameStore((s) => s.messages);
  const isDrawing = useGameStore(selectIsDrawing);
  const me = useGameStore(selectMe);
  const room = useGameStore((s) => s.room);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const socket = getSocket();
  const canGuess =
    !!room &&
    room.status === 'playing' &&
    !isDrawing &&
    !!me &&
    !me.hasGuessedCorrectly &&
    !me.isLocked;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (!canGuess) return;
    socket.emit('submit_guess', { text: value });
    setText('');
  }

  const placeholder = isDrawing
    ? 'You are drawing'
    : me?.isLocked
      ? 'Locked out'
      : me?.hasGuessedCorrectly
        ? 'You got it!'
        : 'Type your guess…';

  return (
    <div className="flex flex-col h-full bx bg-[var(--paper)] overflow-hidden">
      <div className="px-3 py-2 border-b-[3px] border-[var(--ink)] bg-[var(--bg-tile)]">
        <CardLabel>Chat &amp; guesses</CardLabel>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-2 space-y-1.5"
      >
        {messages.map((m) => (
          <ChatLine key={m.id} msg={m} mePlayerId={me?.id ?? null} />
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-[var(--muted)] text-center mt-6 font-semibold">
            No messages yet. Type a guess to play.
          </p>
        )}
      </div>
      <form
        onSubmit={submit}
        className="border-t-[3px] border-[var(--ink)] p-2 flex gap-2 bg-[var(--bg-tile)]"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={LIMITS.maxChatLength}
          disabled={!canGuess}
          placeholder={placeholder}
          className="bx-sm flex-1 px-3 min-h-[44px] bg-[var(--paper)] text-[var(--ink)] font-semibold placeholder:text-[var(--muted)] placeholder:font-medium disabled:opacity-60 focus:outline-none focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
        />
        <Button type="submit" disabled={!canGuess || !text.trim()} size="md" variant="primary">
          <Icon name="send" />
        </Button>
      </form>
    </div>
  );
}

function ChatLine({ msg, mePlayerId }: { msg: ChatMessage; mePlayerId: string | null }) {
  if (msg.kind === 'system') {
    return (
      <div className="text-[11px] text-[var(--muted)] italic px-2 py-0.5 font-semibold">
        — {msg.text}
      </div>
    );
  }
  if (msg.kind === 'correct') {
    return (
      <div className="text-sm font-bold text-[var(--success-fg)] bg-[var(--success)] border-2 border-[var(--ink)] rounded-md px-2 py-1 flex items-center gap-2">
        <Icon name="check" /> {msg.text}
      </div>
    );
  }
  if (msg.kind === 'locked') {
    return (
      <div className="text-sm font-bold text-[var(--danger-fg)] bg-[var(--danger)] border-2 border-[var(--ink)] rounded-md px-2 py-1 flex items-center gap-2">
        <Icon name="lock" /> {msg.text}
      </div>
    );
  }
  if (msg.kind === 'close') {
    return (
      <div className="text-sm font-bold text-[var(--accent-fg)] bg-[var(--accent)] border-2 border-[var(--ink)] rounded-md px-2 py-1 flex items-center gap-2">
        <Icon name="fire" />
        <span>{msg.text}</span>
        <span className="ml-1 text-[10px] uppercase opacity-70">so close!</span>
      </div>
    );
  }
  const mine = msg.playerId === mePlayerId;
  return (
    <div
      className={`text-sm text-[var(--ink)] ${
        mine ? 'pl-2 border-l-[3px] border-[var(--primary)]' : ''
      }`}
    >
      <span className="font-black">
        {msg.username}
        {mine ? ' (you)' : ''}:
      </span>{' '}
      <span className="font-medium">{msg.text}</span>
    </div>
  );
}
