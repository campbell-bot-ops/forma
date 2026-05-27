'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Determine if it is a touch device to optimize touch scroll
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const lenis = new Lenis({
      duration: 0.8, // Reduced from 1.4s for a much snappier, responsive scroll feel
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // snappier easing
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      // Disable smooth scroll overrides on mobile screens so touch scrolling remains perfectly native
      syncTouch: !isTouch,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
