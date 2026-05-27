'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession, Exercise, LoggedSet } from '@/constants/workout';
import { ArrowLeft, Check, Timer, ArrowRight, Zap, RefreshCw, CheckCircle2, Dumbbell } from 'lucide-react';

interface CrucibleViewProps {
  session: WorkoutSession;
  onBack: () => void;
  onFinishWorkout: (logs: { [exId: string]: LoggedSet[] }) => void;
  zeroUiEnabled: boolean;
  autoOverloadEnabled: boolean;
  onUpdateWeight: (exerciseId: string, newWeight: number) => void;
  cnsScale: number;
  units: 'metric' | 'imperial';
  workoutHistory?: any[];
}

export default function CrucibleView({
  session,
  onBack,
  onFinishWorkout,
  zeroUiEnabled,
  autoOverloadEnabled,
  onUpdateWeight,
  cnsScale,
  units,
  workoutHistory = []
}: CrucibleViewProps) {
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  
  const currentExercise = session.exercises[currentExerciseIdx];
  const totalSets = currentExercise.defaultSets;
  const ghostSet = currentExercise.ghostSets[currentSetIdx] || currentExercise.ghostSets[currentExercise.ghostSets.length - 1];

  // Progressive Overload calculations
  const lastSessionLog = workoutHistory?.find(h => h.sessionId === session.id);
  const prevExerciseSets = lastSessionLog?.logs?.[currentExercise.id];
  const prevBestSet = prevExerciseSets && prevExerciseSets.length > 0
    ? [...prevExerciseSets].sort((a: any, b: any) => b.weight - a.weight || b.reps - a.reps)[0]
    : null;

  const [showOverloadGlow, setShowOverloadGlow] = useState(false);

  // Inputs
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState(8);

  const effectiveRepsVal = Math.max(0, Math.min(parseInt(reps) || 0, 5 - (10 - rpe)));

  // Log state
  const [workoutLogs, setWorkoutLogs] = useState<{ [exId: string]: LoggedSet[] }>({});
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Overload Alert
  const [overloadNotice, setOverloadNotice] = useState<string | null>(null);

  // Zero-UI Input Prediction sync
  useEffect(() => {
    const activeGhost = currentExercise.ghostSets[currentSetIdx] || currentExercise.ghostSets[currentExercise.ghostSets.length - 1];
    if (zeroUiEnabled) {
      const scaledWeight = activeGhost.weight * cnsScale;
      const displayWeight = units === 'imperial' 
        ? (scaledWeight * 2.20462).toFixed(1) 
        : scaledWeight.toFixed(1);
      setWeight(displayWeight);
      setReps(activeGhost.reps.toString());
      setRpe(activeGhost.rpe);
    } else {
      setReps(activeGhost.reps.toString());
      setRpe(activeGhost.rpe);
      setWeight('');
    }
  }, [currentExerciseIdx, currentSetIdx, zeroUiEnabled, currentExercise, cnsScale, units]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      advanceWorkflow();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  const handleLogSet = () => {
    const parsedInputWeight = parseFloat(weight) || 0;
    const parsedReps = parseInt(reps) || 0;
    
    // Convert weight back to kg for standard internal DB storage
    const weightInKg = units === 'imperial' ? parsedInputWeight / 2.20462 : parsedInputWeight;
    
    // Check Progressive Overload achievement
    let achievedOverload = false;
    if (prevBestSet) {
      if (
        weightInKg > prevBestSet.weight + 0.1 ||
        (Math.abs(weightInKg - prevBestSet.weight) <= 0.15 && parsedReps > prevBestSet.reps)
      ) {
        achievedOverload = true;
      }
    } else if (parsedReps > 0 && parsedInputWeight > 0) {
      achievedOverload = true; // First time logging split counts as overload progress
    }

    if (achievedOverload) {
      setShowOverloadGlow(true);
      setTimeout(() => setShowOverloadGlow(false), 2200);
    }

    // Auto-Regulated Overload Trigger Check
    if (autoOverloadEnabled && parsedReps >= ghostSet.reps && rpe <= 7 && cnsScale >= 1.0) {
      const nextWeight = weightInKg + 2.5;
      onUpdateWeight(currentExercise.id, parseFloat(nextWeight.toFixed(1)));
      const overloadWeightDisplay = units === 'imperial' 
        ? `${(nextWeight * 2.20462).toFixed(1)} lbs` 
        : `${nextWeight.toFixed(1)} kg`;
      setOverloadNotice(`Auto-Overload Triggered: Baseline weight updated to ${overloadWeightDisplay} for next week.`);
      setTimeout(() => setOverloadNotice(null), 4500);
    }

    const newSet: LoggedSet = {
      setNumber: currentSetIdx + 1,
      weight: parseFloat(weightInKg.toFixed(1)),
      reps: parsedReps,
      rpe: rpe
    };
    
    setWorkoutLogs(prev => ({
      ...prev,
      [currentExercise.id]: [...(prev[currentExercise.id] || []), newSet]
    }));

    // Enter Rest Timer
    setTimeLeft(90);
    setTimerActive(true);
  };

  const advanceWorkflow = () => {
    if (currentSetIdx < totalSets - 1) {
      setCurrentSetIdx(prev => prev + 1);
    } else {
      // Completed all sets for this exercise. If there is a next exercise, go to it.
      if (currentExerciseIdx < session.exercises.length - 1) {
        setDirection(1);
        setCurrentExerciseIdx(prev => prev + 1);
        setCurrentSetIdx(0);
      } else {
        // Workout fully complete! Trigger history log
        onFinishWorkout(workoutLogs);
      }
    }
  };

  const handleNavigateToExercise = (index: number) => {
    if (index === currentExerciseIdx) return;
    setDirection(index > currentExerciseIdx ? 1 : -1);
    setCurrentExerciseIdx(index);
    setCurrentSetIdx(0);
  };

  const skipTimer = () => {
    setTimerActive(false);
    advanceWorkflow();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const strokeDashoffset = 502.6 - (502.6 * (90 - timeLeft)) / 90;

  // Slide variant configurations
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 380, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: {
        x: { type: 'spring' as const, stiffness: 380, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div className={`min-h-screen relative flex flex-col pt-6 pb-36 px-4 max-w-md mx-auto transition-colors duration-500 overflow-hidden ${timerActive ? 'animate-rest-pulse' : 'bg-obsidian'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-zinc-500">
            Workout Session
          </span>
          <h1 className="text-sm font-semibold text-white uppercase tracking-wider">
            {session.title} &mdash; {session.focus}
          </h1>
        </div>
        <div className="w-12 h-6 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-[10px] text-zinc-400 font-mono">
          {currentExerciseIdx + 1}/{session.exercises.length}
        </div>
      </div>

      {/* Exercise Plan Checklist / Overview Slider */}
      <div className="flex gap-2 pb-3 mb-4 overflow-x-auto no-scrollbar border-b border-white/5">
        {session.exercises.map((ex, idx) => {
          const isCompleted = (workoutLogs[ex.id]?.length || 0) >= ex.defaultSets;
          const isActive = idx === currentExerciseIdx;
          
          return (
            <button
              key={ex.id}
              onClick={() => handleNavigateToExercise(idx)}
              className={`flex-none px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${
                isActive
                  ? 'bg-white border-white text-black font-bold'
                  : isCompleted
                  ? 'border-emerald-950/20 bg-emerald-950/5 text-emerald-400 border-emerald-900/30'
                  : 'border-white/5 bg-white/[0.01] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isCompleted ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Dumbbell size={10} />}
              <span className="truncate max-w-[70px]">{ex.name}</span>
            </button>
          );
        })}
      </div>

      {/* Overload Alert Notification */}
      <AnimatePresence>
        {overloadNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-4 p-4 rounded-xl bg-white/10 border border-white/20 flex items-start gap-3 shadow-lg z-20"
          >
            <Zap className="text-amber-300 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-[11px] text-zinc-200 leading-normal font-semibold">
              {overloadNotice}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Workout Card & Sliding transition wrapper */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence custom={direction} mode="wait">
          {!timerActive ? (
            <motion.div
              key={currentExercise.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-6 w-full"
            >
              {/* Focus Card Details */}
              <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                <AnimatePresence>
                  {showOverloadGlow && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 border-2 border-emerald-500 rounded-3xl pointer-events-none z-30"
                      style={{ boxShadow: 'inset 0 0 30px rgba(16, 185, 129, 0.25), 0 0 30px rgba(16, 185, 129, 0.15)' }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showOverloadGlow && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-4 right-4 bg-emerald-500 text-black font-extrabold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider z-40"
                    >
                      Overload Beaten!
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                    CURRENT EXERCISE
                  </span>
                  {currentExercise.keyMovement && (
                    <span className="text-[9px] text-black font-semibold bg-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                      <Zap size={10} fill="black" /> FOCUS LIFT
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                  {currentExercise.name}
                </h2>
                <p className="text-xs text-zinc-400 font-semibold mb-4 uppercase tracking-wider">
                  Target Reps: <span className="text-white">{currentExercise.targetRepsRange}</span> &bull; Plan: <span className="text-white">{totalSets} Sets</span>
                </p>

                {/* Progress Indicators */}
                <div className="flex gap-2 mb-2">
                  {Array.from({ length: totalSets }).map((_, i) => {
                    const loggedSet = workoutLogs[currentExercise.id]?.[i];
                    return (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 relative ${
                          i === currentSetIdx
                            ? 'bg-white scale-y-125'
                            : loggedSet
                            ? 'bg-zinc-400'
                            : 'bg-zinc-800'
                        }`}
                      >
                        {loggedSet && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="sr-only">Set {i+1} Logged</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Set {currentSetIdx + 1} of {totalSets}</span>
                  <span className="font-semibold text-zinc-400">
                    Target Setup: {ghostSet.weight}kg x {ghostSet.reps} @ RPE {ghostSet.rpe}
                  </span>
                </div>
              </div>

              {/* Set Input values */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Load ({units === 'imperial' ? 'lbs' : 'kg'})
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-transparent text-white font-bold text-3xl focus:outline-none tabular-nums"
                    />
                    {((units === 'imperial' ? (ghostSet.weight * cnsScale * 2.20462).toFixed(1) : (ghostSet.weight * cnsScale).toFixed(1)) !== weight) && (
                      <button
                        onClick={() => {
                          const scaledW = ghostSet.weight * cnsScale;
                          setWeight(units === 'imperial' ? (scaledW * 2.20462).toFixed(1) : scaledW.toFixed(1));
                        }}
                        className="absolute right-0 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                        title="Sync predicted"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-zinc-600 font-semibold">
                      Target: {units === 'imperial' ? `${(ghostSet.weight * 2.20462).toFixed(1)} lbs` : `${ghostSet.weight} kg`} {cnsScale < 1.0 ? '(Deload)' : ''}
                    </span>
                    {prevBestSet && (
                      <span className="text-[9px] text-emerald-400/80 font-medium font-mono">
                        Prev: {units === 'imperial' ? `${(prevBestSet.weight * 2.20462).toFixed(1)} lbs` : `${prevBestSet.weight} kg`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Reps
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      className="w-full bg-transparent text-white font-bold text-3xl focus:outline-none tabular-nums"
                    />
                    {ghostSet.reps.toString() !== reps && (
                      <button
                        onClick={() => setReps(ghostSet.reps.toString())}
                        className="absolute right-0 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                        title="Sync predicted"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-zinc-600 font-semibold">
                      Target Setup: {ghostSet.reps} reps
                    </span>
                    {prevBestSet && (
                      <span className="text-[9px] text-emerald-400/80 font-medium font-mono">
                        Prev: {prevBestSet.reps} reps
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RPE Selector */}
              <div className="glass-panel rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                    Difficulty / Rate of Perceived Exertion (RPE)
                  </label>
                  <span className="text-xs font-bold text-white tracking-wide">
                    RPE {rpe} &mdash; {effectiveRepsVal} Growth Reps
                  </span>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {[6, 7, 8, 9, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => setRpe(val)}
                      className={`py-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        rpe === val
                          ? 'bg-white border-white text-black font-extrabold shadow'
                          : 'border-white/5 hover:border-white/10 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-[9px] text-zinc-500 flex justify-between font-medium">
                  <span>RPE 7: 3 reps left (Prompts overload)</span>
                  <span>RPE 10: Absolute failure</span>
                </div>
              </div>

              {/* Confirm button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogSet}
                className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow"
              >
                <Check size={14} strokeWidth={2.5} />
                Confirm & Log Set {currentSetIdx + 1}
              </motion.button>
            </motion.div>
          ) : (
            /* Rest Timer Overlay State */
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-6"
            >
              <div className="relative flex items-center justify-center w-64 h-64">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <filter id="rest-glow" x="-20%" y="-20%" width="140%" height="140%">
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
                    r="80"
                    className="stroke-white/5 fill-transparent"
                    strokeWidth="4"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="80"
                    className="stroke-white fill-transparent"
                    strokeWidth="4"
                    strokeDasharray="502.6"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    filter="url(#rest-glow)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                
                <div className="absolute text-center flex flex-col items-center justify-center">
                  <Timer size={24} className="text-white animate-pulse mb-2" />
                  <p className="text-5xl font-extrabold tracking-tighter text-white font-mono tabular-nums leading-none">
                    {formatTime(timeLeft)}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-2 font-mono">
                    Resting
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setTimeLeft(prev => prev + 30)}
                  className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-semibold rounded-lg text-zinc-300 transition-all cursor-pointer"
                >
                  +30s
                </button>
                <button
                  onClick={skipTimer}
                  className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Skip Rest
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Footer */}
      {!timerActive && (
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
          <div>
            <span className="font-semibold text-zinc-400">Next exercise:</span>{' '}
            {currentExerciseIdx < session.exercises.length - 1
              ? session.exercises[currentExerciseIdx + 1].name
              : 'Cardio Finisher'}
          </div>
          <button
            onClick={() => onFinishWorkout(workoutLogs)}
            className="flex items-center gap-1 font-semibold text-white hover:text-zinc-300 transition-colors cursor-pointer"
          >
            End workout <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
