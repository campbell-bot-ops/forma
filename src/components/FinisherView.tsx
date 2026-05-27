'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Pause, CheckCircle } from 'lucide-react';

interface FinisherViewProps {
  onComplete: (cardioStats?: {
    duration: number;
    distance: number;
    calories: number;
    speed: number;
    incline: number;
    units: 'metric' | 'imperial';
  }) => void;
  weight: number;
  units: 'metric' | 'imperial';
}

export default function FinisherView({ onComplete, weight, units }: FinisherViewProps) {
  const totalDuration = 30 * 60; // 30 minutes
  const [secondsLeft, setSecondsLeft] = useState(totalDuration);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (!isPaused && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, secondsLeft]);

  // Format time
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Heartbeat waveform heights/animation values
  const numBars = 12;
  
  // Progress calculations
  const progressPercent = ((totalDuration - secondsLeft) / totalDuration) * 100;

  // Real-time ACSM treadmill math
  // Speed is 3.0 mph = 80.4 m/min. Incline is 12% grade = 0.12.
  // Vo2 = (0.1 * 80.4) + (1.8 * 80.4 * 0.12) + 3.5 = 28.91 mL/kg/min.
  // METs = Vo2 / 3.5 = 8.26.
  // Calories = METs * 3.5 * weight / 200 = 8.26 * 3.5 * weight / 200 per minute
  const elapsedSeconds = totalDuration - secondsLeft;
  const speedMph = 3.0;
  const speedDisplay = units === 'imperial' ? speedMph : speedMph * 1.60934;
  
  const distanceMiles = speedMph * (elapsedSeconds / 3600);
  const distanceDisplay = units === 'imperial' ? distanceMiles : distanceMiles * 1.60934;

  const metValue = 8.26;
  const caloriesBurned = ((metValue * 3.5 * weight) / 200) * (elapsedSeconds / 60);

  const handleComplete = () => {
    onComplete({
      duration: Math.round(elapsedSeconds / 60) || 1,
      distance: parseFloat(distanceDisplay.toFixed(2)),
      calories: Math.round(caloriesBurned),
      speed: parseFloat(speedDisplay.toFixed(1)),
      incline: 12,
      units: units
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] to-[#0A192F] text-foreground flex flex-col justify-between pt-8 pb-12 px-4 max-w-md mx-auto relative overflow-hidden transition-colors duration-1000">
      
      {/* Absolute Ambient Background Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="text-center relative z-10">
        <span className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-blue-400">
          Phase 2: The Metabolic Interlock
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          TREADMILL LISS
        </h1>
        <p className="text-xs text-zinc-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
          Glycogen is depleted. Doing Zone 2 incline walking forces adipose mobilization.
        </p>
      </div>

      {/* Center Circle Timer */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 relative z-10">
        <div className="relative w-64 h-64 flex items-center justify-center">
          
          {/* Progress Circle SVGs */}
          <svg className="w-full h-full transform -rotate-90">
            <defs>
              <filter id="cardio-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="128"
              cy="128"
              r="100"
              className="stroke-white/5 fill-transparent"
              strokeWidth="4"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="100"
              className="stroke-blue-400 fill-transparent"
              strokeWidth="4"
              strokeDasharray="628.3"
              strokeDashoffset={628.3 - (628.3 * progressPercent) / 100}
              strokeLinecap="round"
              filter="url(#cardio-glow)"
              transition={{ ease: 'linear' }}
            />
          </svg>

          {/* Clock Text */}
          <div className="absolute text-center flex flex-col items-center justify-center">
            <Timer className="text-blue-400 animate-pulse mb-2" size={24} />
            <p className="text-5xl font-extrabold tracking-tighter text-white font-mono tabular-nums leading-none">
              {formatTime(secondsLeft)}
            </p>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 mt-2 font-mono">
              Zone 2 Oxidation
            </span>
          </div>
        </div>

        {/* LISS Live Stats Card */}
        <div className="mt-8 glass-panel border-blue-900/30 bg-blue-950/10 rounded-2xl p-4 w-full flex justify-around text-center max-w-[340px]">
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Incline</span>
            <p className="text-sm font-bold text-white font-mono">12%</p>
          </div>
          <div className="w-[1px] bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Speed</span>
            <p className="text-sm font-bold text-white font-mono">
              {speedDisplay.toFixed(1)} <span className="text-[8px] text-zinc-400">{units === 'imperial' ? 'mph' : 'km/h'}</span>
            </p>
          </div>
          <div className="w-[1px] bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Distance</span>
            <p className="text-sm font-bold text-white font-mono">
              {distanceDisplay.toFixed(2)} <span className="text-[8px] text-zinc-400">{units === 'imperial' ? 'mi' : 'km'}</span>
            </p>
          </div>
          <div className="w-[1px] bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Burn</span>
            <p className="text-sm font-bold text-emerald-400 font-mono">
              {Math.round(caloriesBurned)} <span className="text-[8px] text-zinc-400">kcal</span>
            </p>
          </div>
        </div>
      </div>

      {/* Rhythmic Waveform and Actions Footer */}
      <div className="flex flex-col gap-6 relative z-10">
        
        {/* Heart Rate Waveform */}
        <div className="h-16 flex items-end justify-center gap-1.5 px-4 mb-2">
          {Array.from({ length: numBars }).map((_, i) => {
            const delay = (i * 0.1) % 0.6;
            const duration = 0.8 + (i % 3) * 0.2;
            
            return (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-full"
                animate={{
                  height: [12, 48, 12],
                }}
                transition={{
                  repeat: Infinity,
                  duration: duration,
                  delay: delay,
                  ease: 'easeInOut',
                }}
                style={{
                  height: 12,
                }}
              />
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setIsPaused(prev => !prev)}
            className="py-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-semibold uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isPaused ? (
              <>
                <Play size={12} fill="white" /> Resume
              </>
            ) : (
              <>
                <Pause size={12} fill="white" /> Pause
              </>
            )}
          </button>
          
          <button
            onClick={handleComplete}
            className="py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active-glow shadow-lg shadow-blue-500/20"
          >
            <CheckCircle size={12} /> Complete
          </button>
        </div>
      </div>
    </div>
  );
}
