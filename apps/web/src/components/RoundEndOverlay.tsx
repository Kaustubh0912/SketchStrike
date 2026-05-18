'use client';

import { motion } from 'framer-motion';
import type { RoundSummary } from '@sketchstrike/shared';
import Card, { CardLabel } from './ui/Card';
import Badge from './ui/Badge';

interface Props {
  summary: RoundSummary;
}

export default function RoundEndOverlay({ summary }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 grid place-items-center p-4 bg-[color:color-mix(in_srgb,var(--ink)_55%,transparent)] backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 30, scale: 0.95, rotate: -1 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      >
        <Card tone="paper" size="lg" className="max-w-md w-full">
          <div className="text-center">
            <CardLabel>Round over</CardLabel>
            <p className="mt-2 text-base font-semibold text-[var(--ink-soft)]">
              The word was
            </p>
            <div className="mt-2 inline-block bx-sm bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2 font-black text-3xl uppercase tracking-wider tilt-r">
              {summary.word}
            </div>
          </div>
          <ul className="mt-6 space-y-2">
            {[...summary.results]
              .sort((a, b) => b.gained - a.gained)
              .map((r) => (
                <li
                  key={r.playerId}
                  className="bx-sm flex items-center justify-between px-3 py-2 bg-[var(--bg-tile)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold truncate">{r.username}</span>
                    {r.playerId === summary.drawerId && (
                      <Badge tone="primary" size="xs">Drawer</Badge>
                    )}
                  </div>
                  <span
                    className={`font-mono font-black text-lg ${
                      r.gained > 0 ? 'text-[var(--success)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    {r.gained > 0 ? '+' : ''}
                    {r.gained}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </motion.div>
    </motion.div>
  );
}
