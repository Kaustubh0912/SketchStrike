'use client';

import { motion } from 'framer-motion';
import type { PublicPlayer } from '@sketchstrike/shared';
import { useGameStore } from '@/store/gameStore';
import Badge from './ui/Badge';
import Icon from './Icon';

interface Props {
  player: PublicPlayer;
  rank?: number;
  compact?: boolean;
  isMe?: boolean;
}

export default function PlayerChip({ player, rank, compact = false, isMe = false }: Props) {
  const flash = useGameStore((s) => s.flash);
  const isFlashing = flash?.playerId === player.id;

  return (
    <div
      className={`relative flex items-center gap-3 px-3 py-2 bx-sm bg-[var(--bg-tile)] ${
        player.isDrawing ? 'bg-[var(--accent)]' : ''
      } ${player.isLocked ? 'opacity-60' : ''} ${!player.isConnected ? 'opacity-50' : ''} ${
        isMe ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''
      }`}
    >
      {rank !== undefined && (
        <div className="text-xs font-black w-5 text-[var(--muted)] tabular-nums">
          #{rank}
        </div>
      )}
      <div
        className="w-10 h-10 rounded-md grid place-items-center text-base font-black text-[var(--ink)] border-2 border-[var(--ink)] shrink-0"
        style={{ background: player.avatarColor }}
      >
        {player.username.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="truncate font-bold text-sm">{player.username}</span>
          {player.isHost && <Badge tone="ink" size="xs">Host</Badge>}
          {player.isDrawing && <Badge tone="primary" size="xs">Drawing</Badge>}
          {player.hasGuessedCorrectly && !player.isDrawing && (
            <Badge tone="success" size="xs">
              <Icon name="check" />
            </Badge>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)] mt-0.5">
            <span className="font-bold tabular-nums">{player.score} pts</span>
            {!player.isDrawing && !player.hasGuessedCorrectly && (
              <span
                className={
                  player.isLocked
                    ? 'text-[var(--danger)] font-bold'
                    : player.guessesRemaining === 1
                      ? 'text-[var(--danger)] font-bold'
                      : 'text-[var(--muted)]'
                }
              >
                · {player.isLocked ? 'LOCKED' : `${player.guessesRemaining} left`}
              </span>
            )}
          </div>
        )}
      </div>
      {flash && isFlashing && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bx-sm bg-[var(--success)] text-[var(--success-fg)] text-sm font-black px-2 py-1"
        >
          +{flash.gained}
        </motion.div>
      )}
    </div>
  );
}
