'use client';

import { Button } from '@ezstart/ui/components';
import { callApi } from '@ezstart/ui/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function StartGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = async () => {
    try {
      const response = await callApi(`/api/games/${gameId}/start`, {
        method: 'POST',
      });

      if (!response?.ok) {
        throw new Error('Game could not be started');
      }

      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error('[games:start]', err);
      // Optionnel : affichage d’un toast ou d’un message
    } finally {
      cancelCountdown();
    }
  };

  const initiateCountdown = () => {
    if (countdown !== null) return; // prevent double click
    setCountdown(5);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setCountdown(null);
      startGame();
    }, 5000);
  };

  const cancelCountdown = () => {
    clearTimeout(timeoutRef.current!);
    clearInterval(intervalRef.current!);
    setCountdown(null);
  };

  useEffect(() => {
    // Exemple : écouteur socket ou autre condition d'annulation
    // socket.on('lobby:playerLeft', cancelCountdown);
    return () => {
      clearTimeout(timeoutRef.current!);
      clearInterval(intervalRef.current!);
    };
  }, []);

  return (
    <Button onClick={initiateCountdown} disabled={countdown !== null}>
      {countdown !== null ? `Starting in ${countdown}s...` : 'Start Game'}
    </Button>
  );
}
