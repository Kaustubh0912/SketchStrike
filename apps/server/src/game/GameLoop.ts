import { LIMITS, type RoundSummary } from '@sketchstrike/shared';
import type { Room } from './RoomManager.js';
import { maskWord, pickHintIndices } from './GuessValidator.js';
import { scoreDrawer } from './Scoring.js';
import { pickWordChoices } from './WordBank.js';

type EndReason = 'timer' | 'all-guessed' | 'all-locked' | 'drawer-left' | 'manual';

export class GameLoop {
  private roundTimer: NodeJS.Timeout | null = null;
  private wordChoiceTimer: NodeJS.Timeout | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private endsAt = 0;
  private wordChoiceFor: string | null = null;
  private wordChoices: string[] = [];
  private revealedIndices = new Set<number>();
  private correctOrder: string[] = [];

  constructor(private readonly room: Room) {}

  get timerRemaining(): number {
    if (this.endsAt === 0) return 0;
    return Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
  }

  cancelTimers() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.wordChoiceTimer) clearTimeout(this.wordChoiceTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.hintTimer) clearInterval(this.hintTimer);
    this.roundTimer = null;
    this.wordChoiceTimer = null;
    this.tickTimer = null;
    this.hintTimer = null;
  }

  startGame() {
    if (this.room.players.size < LIMITS.minPlayers) {
      this.room.systemMessage('Need at least 2 players to start');
      return;
    }
    this.room.resetForNewGame();
    this.room.round = 1;
    this.room.status = 'choosing';
    this.room.systemMessage('Game starting!');
    this.room.broadcastState();
    this.beginNextTurn();
  }

  private beginNextTurn() {
    if (this.room.status === 'ended') return;
    this.correctOrder = [];

    const connectedIds = [...this.room.players.values()]
      .filter((p) => p.socketId !== null)
      .map((p) => p.id);
    if (connectedIds.length < LIMITS.minPlayers) {
      this.endGame();
      return;
    }

    let nextDrawerId = this.room.drawerQueue.find(
      (id) => !this.room.drawersUsedThisRound.has(id) && this.room.players.has(id),
    );

    if (!nextDrawerId) {
      if (this.room.round >= this.room.settings.rounds) {
        this.endGame();
        return;
      }
      this.room.round += 1;
      this.room.drawersUsedThisRound.clear();
      this.room.drawerQueue = [...this.room.players.keys()].sort(() => Math.random() - 0.5);
      nextDrawerId = this.room.drawerQueue[0];
    }

    if (!nextDrawerId) {
      this.endGame();
      return;
    }

    this.room.resetForRound();
    this.room.currentDrawerId = nextDrawerId;
    this.room.drawersUsedThisRound.add(nextDrawerId);
    this.room.status = 'choosing';

    this.wordChoices = pickWordChoices(3, {
      exclude: new Set(this.room.recentWords),
      customPool: this.room.settings.customWords,
    });
    this.wordChoiceFor = nextDrawerId;

    const drawer = this.room.players.get(nextDrawerId);
    if (!drawer || drawer.socketId === null) {
      this.beginNextTurn();
      return;
    }

    this.room.io_
      .to(drawer.socketId)
      .emit('word_choices', { words: this.wordChoices, chooseSeconds: LIMITS.wordChoiceSeconds });
    this.room.systemMessage(`${drawer.username} is picking a word...`);
    this.room.broadcastState();

    this.wordChoiceTimer = setTimeout(() => {
      const word = this.wordChoices[Math.floor(Math.random() * this.wordChoices.length)];
      if (word) this.commitWord(word, drawer.id);
    }, LIMITS.wordChoiceSeconds * 1000);
  }

  chooseWord(playerId: string, word: string) {
    if (this.wordChoiceFor !== playerId) return;
    if (!this.wordChoices.includes(word)) return;
    this.commitWord(word, playerId);
  }

  private commitWord(word: string, drawerId: string) {
    if (this.wordChoiceTimer) clearTimeout(this.wordChoiceTimer);
    this.wordChoiceTimer = null;
    this.wordChoiceFor = null;
    this.wordChoices = [];

    this.room.currentWord = word;
    this.room.recentWords = [word, ...this.room.recentWords].slice(0, 20);
    this.revealedIndices = new Set<number>();
    this.room.maskedWord = maskWord(word, this.revealedIndices);
    this.room.status = 'playing';

    const drawer = this.room.players.get(drawerId);
    if (drawer && drawer.socketId) {
      this.room.io_.to(drawer.socketId).emit('drawer_word', { word });
    }
    this.room.io_.to(this.room.id).emit('round_started', {
      drawerId,
      maskedWord: this.room.maskedWord,
      round: this.room.round,
    });
    this.room.broadcastState();

    const durationMs = this.room.settings.roundSeconds * 1000;
    this.endsAt = Date.now() + durationMs;

    this.tickTimer = setInterval(() => {
      const remaining = this.timerRemaining;
      this.room.io_.to(this.room.id).emit('timer_updated', { remaining });
      if (remaining <= 0 && this.tickTimer) clearInterval(this.tickTimer);
    }, 1000);

    this.roundTimer = setTimeout(() => this.endRound('timer'), durationMs);

    if (this.room.settings.hintsEnabled) {
      const totalLetters = [...word].filter((c) => c !== ' ').length;
      const maxReveals = Math.max(1, Math.floor(totalLetters / 2));
      const interval = Math.max(5000, Math.floor(durationMs / (maxReveals + 1)));
      let revealed = 0;
      this.hintTimer = setInterval(() => {
        if (revealed >= maxReveals || !this.room.currentWord) {
          if (this.hintTimer) clearInterval(this.hintTimer);
          return;
        }
        this.revealedIndices = pickHintIndices(this.room.currentWord, 1, this.revealedIndices);
        this.room.maskedWord = maskWord(this.room.currentWord, this.revealedIndices);
        revealed += 1;
        this.room.io_.to(this.room.id).emit('masked_word_updated', {
          maskedWord: this.room.maskedWord,
        });
      }, interval);
    }
  }

  notifyCorrectGuess(playerId: string) {
    if (!this.correctOrder.includes(playerId)) {
      this.correctOrder.push(playerId);
    }
    this.maybeEndEarly();
  }

  rankAmongCorrect(playerId: string): number {
    const idx = this.correctOrder.indexOf(playerId);
    return idx === -1 ? this.correctOrder.length : idx;
  }

  maybeEndEarly() {
    if (this.room.status !== 'playing') return;
    const guessers = [...this.room.players.values()].filter(
      (p) => p.id !== this.room.currentDrawerId,
    );
    if (guessers.length === 0) return;
    const allDone = guessers.every((p) => p.hasGuessedCorrectly || p.isLocked);
    if (allDone) {
      const allCorrect = guessers.every((p) => p.hasGuessedCorrectly);
      this.endRound(allCorrect ? 'all-guessed' : 'all-locked');
    }
  }

  endRound(reason: EndReason) {
    if (this.room.status !== 'playing' && this.room.status !== 'choosing') return;
    this.cancelTimers();

    const word = this.room.currentWord ?? '';
    const drawerId = this.room.currentDrawerId ?? '';

    const guessers = [...this.room.players.values()].filter((p) => p.id !== drawerId);
    const correctCount = guessers.filter((p) => p.hasGuessedCorrectly).length;

    let drawerGained = 0;
    const drawer = drawerId ? this.room.players.get(drawerId) : null;
    if (drawer && reason !== 'drawer-left') {
      drawerGained = scoreDrawer(correctCount, guessers.length);
      drawer.score += drawerGained;
    }

    const results = [...this.room.players.values()].map((p) => ({
      playerId: p.id,
      username: p.username,
      gained: p.id === drawerId ? drawerGained : p.lastRoundGained,
    }));

    const summary: RoundSummary = { word, drawerId, results };
    this.room.status = 'round-end';
    this.room.currentWord = null;
    this.room.maskedWord = null;

    if (reason === 'timer') this.room.systemMessage(`Time's up! Word was "${word}"`);
    else if (reason === 'all-guessed') this.room.systemMessage(`Everyone got it! Word was "${word}"`);
    else if (reason === 'all-locked') this.room.systemMessage(`Everyone is locked. Word was "${word}"`);
    else if (reason === 'drawer-left') this.room.systemMessage('Drawer left, skipping round.');

    this.room.io_.to(this.room.id).emit('round_ended', summary);
    this.room.broadcastState();

    setTimeout(() => {
      if (this.room.status === 'round-end') this.beginNextTurn();
    }, 4000);
  }

  private endGame() {
    this.cancelTimers();
    this.room.status = 'ended';
    const ranked = [...this.room.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        playerId: p.id,
        username: p.username,
        score: p.score,
        rank: i + 1,
      }));
    this.room.io_.to(this.room.id).emit('game_over', { rankings: ranked });
    this.room.broadcastState();
  }

  isWordChoiceFor(playerId: string): boolean {
    return this.wordChoiceFor === playerId;
  }

  getWordChoices(): string[] {
    return [...this.wordChoices];
  }
}
