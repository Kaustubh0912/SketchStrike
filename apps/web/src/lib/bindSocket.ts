'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from './socket';

export function useSocketBindings() {
  const store = useGameStore;

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => store.getState().setConnected(true);
    const onDisconnect = () => store.getState().setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    socket.on('room_updated', (state) => {
      // Clear stale game-over data once the server says we've left the 'ended'
      // status (i.e. on a rematch). Otherwise the Results screen would keep
      // rendering even after the next game starts.
      if (state.status !== 'ended' && store.getState().gameOver) {
        store.getState().setGameOver(null);
      }
      store.getState().setRoom(state);
    });

    socket.on('word_choices', (payload) => {
      store.getState().setWordChoices(payload);
    });

    socket.on('round_started', () => {
      store.getState().setRoundSummary(null);
      store.getState().setCanvasReplay([]);
      store.getState().bumpCanvasCleared();
    });

    socket.on('canvas_event', (ev) => {
      const prev = store.getState().canvasReplay ?? [];
      store.getState().setCanvasReplay([...prev, ev]);
    });

    socket.on('canvas_cleared', () => {
      store.getState().setCanvasReplay([]);
      store.getState().bumpCanvasCleared();
    });

    socket.on('canvas_replay', (payload) => {
      store.getState().setCanvasReplay(payload.events);
      store.getState().bumpCanvasCleared();
    });

    socket.on('drawer_word', ({ word }) => {
      store.getState().setDrawerWord(word);
    });

    socket.on('masked_word_updated', ({ maskedWord }) => {
      const room = store.getState().room;
      if (room) store.getState().setRoom({ ...room, maskedWord });
    });

    socket.on('timer_updated', ({ remaining }) => {
      store.getState().setTimer(remaining);
    });

    socket.on('chat_message', (msg) => {
      store.getState().appendMessage(msg);
    });

    socket.on('player_guessed_correct', ({ playerId, gained }) => {
      store.getState().setFlash({ playerId, gained });
      setTimeout(() => {
        const f = store.getState().flash;
        if (f && f.playerId === playerId) store.getState().setFlash(null);
      }, 1200);
    });

    socket.on('player_locked', () => {});
    socket.on('guesses_updated', () => {});

    socket.on('round_ended', (summary) => {
      store.getState().setRoundSummary(summary);
      store.getState().setDrawerWord(null);
      store.getState().setWordChoices(null);
    });

    socket.on('game_over', (payload) => {
      store.getState().setGameOver(payload);
      store.getState().setDrawerWord(null);
      store.getState().setWordChoices(null);
    });

    socket.on('error_message', ({ message }) => {
      store.getState().setJoinError(message);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated');
      socket.off('word_choices');
      socket.off('round_started');
      socket.off('canvas_event');
      socket.off('canvas_cleared');
      socket.off('canvas_replay');
      socket.off('drawer_word');
      socket.off('masked_word_updated');
      socket.off('timer_updated');
      socket.off('chat_message');
      socket.off('player_guessed_correct');
      socket.off('player_locked');
      socket.off('guesses_updated');
      socket.off('round_ended');
      socket.off('game_over');
      socket.off('error_message');
    };
  }, [store]);
}
