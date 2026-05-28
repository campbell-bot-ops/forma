'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface LoadingScreenProps {
  onFinished: () => void;
}

export default function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Avoid showing the loading screen on repeat visits/reloads
    if (typeof window !== 'undefined' && sessionStorage.getItem('forma_loading_shown') === 'true') {
      onFinished();
      return;
    }
    setShouldRender(true);

    // Increment progress line over 2.2 seconds
    const duration = 2200;
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const nextProgress = Math.min(100, (currentStep / steps) * 100);
      setProgress(nextProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        // Add a brief delay before finishing to let the user see the full progress bar
        setTimeout(() => {
          onFinished();
        }, 300);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onFinished]);

  if (!shouldRender) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-obsidian z-50 flex flex-col items-center justify-center px-6"
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* Background Soft Ambient Light */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
        className="absolute w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Animated Brand Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          <Image
            src="/Frame 166.png"
            alt="FORMA Logo"
            width={160}
            height={36}
            priority
            style={{ height: 'auto' }}
            className="h-8 w-auto object-contain"
          />
        </motion.div>

        {/* Minimalist Linear Progress Bar */}
        <div className="w-[180px] h-[1px] bg-white/5 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-[8px] tracking-[0.4em] text-zinc-400 uppercase font-semibold text-center"
        >
          Aligning Physical Architecture
        </motion.p>
      </div>
    </motion.div>
  );
}
