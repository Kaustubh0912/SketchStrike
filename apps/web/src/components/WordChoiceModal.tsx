'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import Card, { CardLabel } from './ui/Card';
import Icon from './Icon';

export default function WordChoiceModal() {
  const choices = useGameStore((s) => s.wordChoices);
  const [remaining, setRemaining] = useState(choices?.chooseSeconds ?? 15);

  useEffect(() => {
    if (!choices) return;
    setRemaining(choices.chooseSeconds);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setRemaining(Math.max(0, Math.ceil(choices.chooseSeconds - elapsed)));
    }, 250);
    return () => clearInterval(id);
  }, [choices]);

  if (!choices) return null;
  const socket = getSocket();
  const ringColors = ['var(--primary)', 'var(--accent)', 'var(--secondary)'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-[color:color-mix(in_srgb,var(--ink)_60%,transparent)] backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        <Card tone="paper" size="lg" className="max-w-md w-full">
          <div className="text-center mb-5">
            <CardLabel>Pick a word</CardLabel>
            <div className="mt-2 inline-flex items-center gap-2 bx-sm bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1 font-black">
              <Icon name="stopwatch" /> {remaining}s
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)] font-semibold">
              Random pick if you wait.
            </p>
          </div>
          <div className="space-y-2">
            {choices.words.map((word, i) => (
              <motion.button
                key={word}
                whileHover={{ x: -3, y: -3 }}
                whileTap={{ x: 2, y: 2 }}
                onClick={() => socket.emit('choose_word', { word })}
                className="bx-sm w-full px-5 py-4 text-lg font-black uppercase tracking-wider bg-[var(--paper)] hover:bg-[var(--bg-tile)] flex items-center gap-3"
                style={{ borderLeft: `8px solid ${ringColors[i % ringColors.length]}` }}
              >
                <span className="text-xs font-bold opacity-50">0{i + 1}</span>
                <span>{word}</span>
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
