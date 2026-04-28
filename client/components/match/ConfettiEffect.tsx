'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  active: boolean;
  color: string;
}

export function ConfettiEffect({ active, color }: ConfettiEffectProps) {
  useEffect(() => {
    if (!active) return;
    const end = Date.now() + 2500;
    const colors = [color, '#f5a623', '#ffffff'];
    let rafId: number;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [active, color]);

  return null;
}
