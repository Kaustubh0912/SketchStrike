import { levenshtein } from '../utils/levenshtein.js';
import { normalizeGuess } from '../utils/normalize.js';

export type GuessJudgement =
  | { kind: 'correct' }
  | { kind: 'close' }
  | { kind: 'wrong' }
  | { kind: 'empty' };

export function judgeGuess(rawGuess: string, secretWord: string): GuessJudgement {
  const guess = normalizeGuess(rawGuess);
  const target = normalizeGuess(secretWord);
  if (!guess) return { kind: 'empty' };
  if (guess === target) return { kind: 'correct' };

  const threshold = target.length <= 4 ? 1 : target.length <= 8 ? 2 : 3;
  const distance = levenshtein(guess, target);
  if (distance <= threshold) return { kind: 'close' };
  return { kind: 'wrong' };
}

export function maskWord(word: string, revealedIndices: Set<number> = new Set()): string {
  return [...word]
    .map((char, i) => {
      if (char === ' ') return ' ';
      if (revealedIndices.has(i)) return char.toUpperCase();
      return '_';
    })
    .join(' ');
}

export function pickHintIndices(word: string, totalToReveal: number, already: Set<number>): Set<number> {
  const candidates: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ' && !already.has(i)) candidates.push(i);
  }
  const next = new Set(already);
  while (next.size - already.size < totalToReveal && candidates.length > 0) {
    const idx = Math.floor(Math.random() * candidates.length);
    const pick = candidates[idx];
    if (pick !== undefined) next.add(pick);
    candidates.splice(idx, 1);
  }
  return next;
}
