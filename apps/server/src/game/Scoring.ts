interface GuesserScoreInput {
  roundSeconds: number;
  timeRemaining: number;
  guessesRemaining: number;
  maxGuesses: number;
  rankAmongCorrect: number;
}

export function scoreGuesser({
  roundSeconds,
  timeRemaining,
  guessesRemaining,
  maxGuesses,
  rankAmongCorrect,
}: GuesserScoreInput): number {
  const speedFraction = Math.max(0, Math.min(1, timeRemaining / roundSeconds));
  const base = 200 + Math.round(speedFraction * 600);
  const rankBonus = Math.max(0, 200 - rankAmongCorrect * 50);
  const guessRatio = maxGuesses > 0 ? guessesRemaining / maxGuesses : 0;
  const strikeBonus = Math.round(guessRatio * 200);
  return base + rankBonus + strikeBonus;
}

export function scoreDrawer(correctCount: number, totalGuessers: number): number {
  if (totalGuessers <= 0) return 0;
  const ratio = correctCount / totalGuessers;
  return Math.round(150 + ratio * 450);
}
