'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, CheckCircle, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { computeTotalTonnage } from '@/constants/workout';
import ConfettiCanvas from '@/components/ConfettiCanvas';

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

const ConcentricRings = ({ tonnagePct, repsPct, durationPct }: { tonnagePct: number; repsPct: number; durationPct: number }) => {
  // Radius calculations
  // Ring 1 (Outer) - R=80. Circumference = 2 * PI * 80 = 502.65
  // Ring 2 (Middle) - R=58. Circumference = 2 * PI * 58 = 364.42
  // Ring 3 (Inner) - R=36. Circumference = 2 * PI * 36 = 226.19
  
  const r1Circ = 502.65;
  const r2Circ = 364.42;
  const r3Circ = 226.19;

  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        {/* Ring 1 Track */}
        <circle cx="100" cy="100" r="80" className="stroke-white/5 fill-transparent" strokeWidth="8" />
        {/* Ring 1 Active */}
        <motion.circle
          cx="100" cy="100" r="80" className="stroke-white fill-transparent" strokeWidth="8"
          strokeDasharray={r1Circ}
          initial={{ strokeDashoffset: r1Circ }}
          animate={{ strokeDashoffset: r1Circ - (r1Circ * Math.min(100, tonnagePct)) / 100 }}
          strokeLinecap="round"
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        />

        {/* Ring 2 Track */}
        <circle cx="100" cy="100" r="58" className="stroke-white/5 fill-transparent" strokeWidth="8" />
        {/* Ring 2 Active */}
        <motion.circle
          cx="100" cy="100" r="58" className="stroke-cyan-400 fill-transparent" strokeWidth="8"
          strokeDasharray={r2Circ}
          initial={{ strokeDashoffset: r2Circ }}
          animate={{ strokeDashoffset: r2Circ - (r2Circ * Math.min(100, repsPct)) / 100 }}
          strokeLinecap="round"
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.8 }}
        />

        {/* Ring 3 Track */}
        <circle cx="100" cy="100" r="36" className="stroke-white/5 fill-transparent" strokeWidth="8" />
        {/* Ring 3 Active */}
        <motion.circle
          cx="100" cy="100" r="36" className="stroke-emerald-400 fill-transparent" strokeWidth="8"
          strokeDasharray={r3Circ}
          initial={{ strokeDashoffset: r3Circ }}
          animate={{ strokeDashoffset: r3Circ - (r3Circ * Math.min(100, durationPct)) / 100 }}
          strokeLinecap="round"
          transition={{ duration: 1.5, ease: "easeOut", delay: 1.1 }}
        />
      </svg>
      
      {/* Small center label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-white font-black text-lg leading-none font-mono">100%</span>
        <span className="text-zinc-500 font-mono text-[7px] uppercase tracking-widest mt-0.5">FORMA</span>
      </div>
    </div>
  );
};

export default function FinisherView({ onComplete, weight, units }: FinisherViewProps) {
  const { sessions, recentCompletedWorkout } = useApp();

  const totalDuration = 30 * 60; // 30 minutes
  const [secondsLeft, setSecondsLeft] = useState(totalDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMph, setSpeedMph] = useState(3.0);
  const [incline, setIncline] = useState(12); // in percent

  // Completion states
  const [isCompleteView, setIsCompleteView] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Timer logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (!isPaused && secondsLeft > 0 && !isCompleteView) {
      intervalId = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPaused, isCompleteView]);

  // Flip trigger delay
  useEffect(() => {
    if (isCompleteView) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isCompleteView]);

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
  const elapsedSeconds = totalDuration - secondsLeft;
  const speedDisplay = units === 'imperial' ? speedMph : speedMph * 1.60934;
  
  const distanceMiles = speedMph * (elapsedSeconds / 3600);
  const distanceDisplay = units === 'imperial' ? distanceMiles : distanceMiles * 1.60934;

  // Dynamic MET based on speed (m/min) and grade
  const speed_m_min = speedMph * 26.8224;
  const grade = incline / 100;
  const metValue = (0.1 * speed_m_min + 1.8 * speed_m_min * grade + 3.5) / 3.5;
  const caloriesBurned = ((metValue * 3.5 * weight) / 200) * (elapsedSeconds / 60);

  const handleComplete = () => {
    onComplete({
      duration: Math.round(elapsedSeconds / 60) || 1,
      distance: parseFloat(distanceDisplay.toFixed(2)),
      calories: Math.round(caloriesBurned),
      speed: parseFloat(speedDisplay.toFixed(1)),
      incline: incline,
      units: units
    });
  };

  // Tonnage & reps calculation from database
  const sessionObj = sessions?.find(s => s.id === recentCompletedWorkout?.sessionId);
  const isImperial = units === 'imperial';

  // Tonnage calculation
  const rawTargetTonnage = sessionObj ? computeTotalTonnage(sessionObj) : 4000;
  const rawActualTonnage = recentCompletedWorkout?.actualTonnage || 0;
  
  const displayTargetTonnage = isImperial ? Math.round(rawTargetTonnage * 2.20462) : rawTargetTonnage;
  const displayActualTonnage = isImperial ? Math.round(rawActualTonnage * 2.20462) : rawActualTonnage;
  const tonnageProgress = Math.min(100, Math.round((rawActualTonnage / rawTargetTonnage) * 100)) || 100;

  // Reps calculation
  let targetReps = 0;
  if (sessionObj?.exercises) {
    sessionObj.exercises.forEach(ex => {
      if (ex.ghostSets) {
        ex.ghostSets.forEach(gs => {
          targetReps += gs.reps || 0;
        });
      }
    });
  }
  if (targetReps === 0) targetReps = 60;

  let actualReps = 0;
  if (recentCompletedWorkout?.logs) {
    Object.values(recentCompletedWorkout.logs).forEach((sets: any) => {
      if (Array.isArray(sets)) {
        sets.forEach(s => {
          actualReps += s.reps || 0;
        });
      }
    });
  }
  if (actualReps === 0) actualReps = 65;
  const repsProgress = Math.min(100, Math.round((actualReps / targetReps) * 100)) || 100;

  // Duration calculation
  const rawActualDuration = recentCompletedWorkout?.cardioDetails?.workoutDuration || 0;
  const actualDurationMins = Math.round(rawActualDuration / 60) || 45;
  const targetDurationMins = 45;
  const durationProgress = Math.min(100, Math.round((actualDurationMins / targetDurationMins) * 100)) || 100;

  if (isCompleteView) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground flex flex-col justify-between pt-8 pb-12 px-4 max-w-md mx-auto relative overflow-hidden">
        {/* Confetti Burst */}
        <ConfettiCanvas />

        {/* Absolute Ambient Background Lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center relative z-10">
          <span className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-blue-400">
            Training Summary
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            WORKOUT FINALIZED
          </h1>
          <p className="text-xs text-zinc-400 mt-2">
            Dynamic biophysical metrics successfully analyzed.
          </p>
        </div>

        {/* 3D Card Flip Layout */}
        <div 
          className="flex-1 flex items-center justify-center py-6"
          style={{ perspective: 1200 }}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            className="relative w-80 h-[380px] cursor-pointer"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* FRONT FACE */}
            <div 
              className="absolute inset-0 w-full h-full glass-panel border-white/10 bg-[#0c0c0e]/80 rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-2xl"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400 animate-bounce">
                <Award size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Calibrating Stats</h3>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px] mx-auto">
                Tap to rotate card and inspect completed session metrics.
              </p>
              <div className="mt-8 flex gap-1 justify-center items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-300" />
              </div>
            </div>

            {/* BACK FACE */}
            <div 
              className="absolute inset-0 w-full h-full glass-panel border-white/10 bg-[#0c0c0e]/95 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl"
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)' 
              }}
            >
              {/* Concentric Rings Visual */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <ConcentricRings 
                  tonnagePct={tonnageProgress} 
                  repsPct={repsProgress} 
                  durationPct={durationProgress} 
                />
              </div>

              {/* Stats Breakdown List */}
              <div className="space-y-2.5 my-3.5">
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-zinc-400 font-medium">Tonnage</span>
                  </div>
                  <span className="text-white font-extrabold">
                    {displayActualTonnage} / {displayTargetTonnage} {isImperial ? 'lbs' : 'kg'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-zinc-400 font-medium">Completed Reps</span>
                  </div>
                  <span className="text-white font-extrabold">
                    {actualReps} / {targetReps}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-zinc-400 font-medium">Active Duration</span>
                  </div>
                  <span className="text-white font-extrabold">
                    {actualDurationMins} / {targetDurationMins} mins
                  </span>
                </div>
              </div>

              <div className="text-[8px] text-zinc-500 font-mono text-center mb-1">
                Tap card to rotate back.
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA Footer */}
        <div className="relative z-10 px-2">
          <button
            onClick={handleComplete}
            className="w-full py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-widest cursor-pointer shadow-lg active-glow text-center"
          >
            Proceed to Archive
          </button>
        </div>
      </div>
    );
  }

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
        <div className="mt-8 glass-panel border-blue-900/30 bg-blue-950/10 rounded-2xl p-4 w-full flex justify-around text-center max-w-[340px] items-center">
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Incline</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <button 
                onClick={() => setIncline(prev => Math.max(0, prev - 1))}
                className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-[10px] font-bold border border-white/5 cursor-pointer transition-colors"
              >-</button>
              <span className="text-sm font-bold text-white font-mono leading-none">{incline}%</span>
              <button 
                onClick={() => setIncline(prev => Math.min(20, prev + 1))}
                className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-[10px] font-bold border border-white/5 cursor-pointer transition-colors"
              >+</button>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Speed</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <button 
                onClick={() => setSpeedMph(prev => Math.max(1.0, parseFloat((prev - 0.1).toFixed(1))))}
                className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-[10px] font-bold border border-white/5 cursor-pointer transition-colors"
              >-</button>
              <span className="text-sm font-bold text-white font-mono leading-none">{speedDisplay.toFixed(1)}</span>
              <button 
                onClick={() => setSpeedMph(prev => Math.min(10.0, parseFloat((prev + 0.1).toFixed(1))))}
                className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-[10px] font-bold border border-white/5 cursor-pointer transition-colors"
              >+</button>
            </div>
            <span className="text-[7px] text-zinc-500 font-mono block mt-0.5 uppercase tracking-wider">{units === 'imperial' ? 'mph' : 'km/h'}</span>
          </div>
          <div className="w-[1px] h-8 bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Distance</span>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              {distanceDisplay.toFixed(2)}
            </p>
            <span className="text-[7px] text-zinc-500 font-mono block mt-0.5 uppercase tracking-wider">{units === 'imperial' ? 'mi' : 'km'}</span>
          </div>
          <div className="w-[1px] h-8 bg-white/5" />
          <div>
            <span className="text-[9px] uppercase text-zinc-500 tracking-wider font-bold block mb-1">Burn</span>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {Math.round(caloriesBurned)}
            </p>
            <span className="text-[7px] text-zinc-500 font-mono block mt-0.5 uppercase tracking-wider">kcal</span>
          </div>
        </div>
        <p className="text-[8px] text-zinc-500 font-bold tracking-widest mt-2.5 text-center uppercase opacity-60">
          * Calorie calculations are estimated based on dynamic ACSM MET formulas *
        </p>
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
            onClick={() => setIsCompleteView(true)}
            className="py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active-glow shadow-lg shadow-blue-500/20"
          >
            <CheckCircle size={12} /> Complete
          </button>
        </div>
      </div>
    </div>
  );
}
