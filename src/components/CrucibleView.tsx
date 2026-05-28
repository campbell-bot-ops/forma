'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession, Exercise, LoggedSet } from '@/constants/workout';
import { ArrowLeft, Check, Timer, ArrowRight, Zap, RefreshCw, CheckCircle2, Dumbbell, Minus, Plus } from 'lucide-react';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { useApp } from '@/context/AppContext';

interface CrucibleViewProps {
  session: WorkoutSession;
  onBack: () => void;
  onFinishWorkout: (logs: { [exId: string]: LoggedSet[] }, duration: number) => void;
  zeroUiEnabled: boolean;
  autoOverloadEnabled: boolean;
  onUpdateWeight: (exerciseId: string, newWeight: number) => void;
  cnsScale: number;
  units: 'metric' | 'imperial';
  workoutHistory?: any[];
}

const calculatePlates = (targetWeight: number, isImperial: boolean) => {
  const barWeight = isImperial ? 45 : 20;
  const platesList = isImperial 
    ? [45, 35, 25, 10, 5, 2.5] 
    : [25, 20, 15, 10, 5, 2.5, 1.25];
  
  if (targetWeight <= barWeight) {
    return { plates: [], remaining: 0, barWeight };
  }

  let weightPerSide = (targetWeight - barWeight) / 2;
  const result: { plate: number; count: number }[] = [];

  for (const plate of platesList) {
    const count = Math.floor(weightPerSide / plate);
    if (count > 0) {
      result.push({ plate, count });
      weightPerSide -= count * plate;
    }
  }

  return {
    plates: result,
    remaining: weightPerSide,
    barWeight
  };
};

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
  const { triggerHaptic } = useApp();
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
  
  // Confirmation states
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  // Global elapsed workout timer state
  const [elapsedTime, setElapsedTime] = useState(0);

  // Exercise history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Overload Alert
  const [overloadNotice, setOverloadNotice] = useState<string | null>(null);

  // Plate Calculator state
  const [showPlateCalc, setShowPlateCalc] = useState(false);

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
        // Workout fully complete! Show confirmation to finalize
        setShowEndConfirm(true);
      }
    }
  };

  // Ref to always call latest version of advanceWorkflow from timer interval
  const advanceWorkflowRef = useRef(advanceWorkflow);
  useEffect(() => {
    advanceWorkflowRef.current = advanceWorkflow;
  }, [advanceWorkflow]);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (timerActive) {
      intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            setTimerActive(false);
            triggerHaptic([30, 50, 30]); // double vibrate on rest timer completion
            advanceWorkflowRef.current();
            return 90;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerActive]);

  // Global elapsed workout timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      triggerHaptic([30, 50, 30]); // double vibrate on PR milestone
      setTimeout(() => setShowOverloadGlow(false), 2200);
    } else {
      triggerHaptic([40]); // standard vibrate on regular set log
    }

    const newSet: LoggedSet = {
      setNumber: currentSetIdx + 1,
      weight: parseFloat(weightInKg.toFixed(1)),
      reps: parsedReps,
      rpe: rpe
    };
    
    const updatedSets = [...(workoutLogs[currentExercise.id] || []), newSet];
    setWorkoutLogs(prev => ({
      ...prev,
      [currentExercise.id]: updatedSets
    }));

    // Auto-Regulated Overload Trigger Check (run only on last set, average RPE across all sets)
    if (currentSetIdx === totalSets - 1 && autoOverloadEnabled && cnsScale >= 1.0) {
      const totalRpe = updatedSets.reduce((sum, s) => sum + s.rpe, 0);
      const avgRpe = totalRpe / updatedSets.length;
      
      const targetsMet = updatedSets.every((s, idx) => {
        const targetReps = currentExercise.ghostSets[idx]?.reps || currentExercise.ghostSets[currentExercise.ghostSets.length - 1].reps;
        return s.reps >= targetReps;
      });

      if (targetsMet && avgRpe <= 7) {
        const nextWeight = weightInKg + 2.5;
        onUpdateWeight(currentExercise.id, parseFloat(nextWeight.toFixed(1)));
        const overloadWeightDisplay = units === 'imperial' 
          ? `${(nextWeight * 2.20462).toFixed(1)} lbs` 
          : `${nextWeight.toFixed(1)} kg`;
        setOverloadNotice(`Auto-Overload Triggered! Avg RPE: ${avgRpe.toFixed(1)}. Next week baseline updated to ${overloadWeightDisplay}.`);
        triggerHaptic([30, 50, 30]);
        setTimeout(() => setOverloadNotice(null), 4500);
      }
    }

    // Enter Rest Timer
    setTimeLeft(90);
    setTimerActive(true);
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

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const parts = [];
    if (h > 0) parts.push(h);
    parts.push(m < 10 && h > 0 ? `0${m}` : m);
    parts.push(s < 10 ? `0${s}` : s);
    
    return parts.join(':');
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
      
      {/* RPE Ambient Exertion Pulse */}
      {!timerActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            key={rpe}
            animate={
              rpe <= 7
                ? {
                    scale: [1, 1.05, 1],
                    opacity: [0.12, 0.2, 0.12],
                  }
                : rpe <= 9
                ? {
                    scale: [1, 1.08, 1],
                    opacity: [0.18, 0.32, 0.18],
                  }
                : {
                    scale: [1, 1.15, 1],
                    opacity: [0.28, 0.55, 0.28],
                  }
            }
            transition={{
              duration: rpe <= 7 ? 4.5 : rpe <= 9 ? 3.0 : 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full blur-[100px] transition-all duration-700 ${
              rpe <= 7
                ? 'bg-cyan-500/20'
                : rpe <= 9
                ? 'bg-amber-500/25'
                : 'bg-red-600/35'
            }`}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button 
          onClick={() => setShowExitConfirm(true)} 
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
          <div className="flex items-center justify-center gap-1 mt-0.5 text-zinc-500">
            <Timer size={10} className="animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider tabular-nums font-bold">
              {formatElapsed(elapsedTime)}
            </span>
          </div>
        </div>
        <div className="w-12 h-6 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-[10px] text-zinc-400 font-mono">
          {currentExerciseIdx + 1}/{session.exercises.length}
        </div>
      </div>

      {/* Exercise Plan Checklist / Overview Slider */}
      <div className="flex gap-2 pb-3 mb-4 overflow-x-auto no-scrollbar border-b border-white/5 relative z-10">
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
      <div className="flex-1 flex flex-col justify-center relative z-10">
        <AnimatePresence custom={direction} mode="wait">
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
                
                <h2 
                  onClick={() => setHistoryModalOpen(true)}
                  className="text-2xl font-bold text-white tracking-tight mb-1 hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-2 group"
                >
                  {currentExercise.name}
                  <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-mono font-bold border border-white/10 bg-white/5 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    History
                  </span>
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
                <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                      Load ({units === 'imperial' ? 'lbs' : 'kg'})
                    </label>
                    <button
                      onClick={() => setShowPlateCalc(true)}
                      className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 border border-cyan-900/30 rounded px-1.5 py-0.5 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      Plates
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <button
                      onClick={() => setWeight(prev => {
                        const val = parseFloat(prev) || 0;
                        const step = units === 'imperial' ? 5 : 2.5;
                        return Math.max(0, val - step).toFixed(1);
                      })}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-16 text-center bg-transparent text-white font-bold text-2xl focus:outline-none tabular-nums"
                    />
                    <button
                      onClick={() => setWeight(prev => {
                        const val = parseFloat(prev) || 0;
                        const step = units === 'imperial' ? 5 : 2.5;
                        return (val + step).toFixed(1);
                      })}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-2 justify-center">
                    {(units === 'imperial' ? [5, 10, 25] : [2.5, 5, 10]).map(val => (
                      <button
                        key={val}
                        onClick={() => setWeight(prev => {
                          const currentVal = parseFloat(prev) || 0;
                          return (currentVal + val).toFixed(1);
                        })}
                        className="px-1.5 py-0.5 text-[8px] font-mono border border-white/10 rounded bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-2">
                    <div className="flex justify-between items-center text-[9px] text-zinc-600 font-semibold">
                      <span>Target: {units === 'imperial' ? `${(ghostSet.weight * 2.20462).toFixed(1)} lbs` : `${ghostSet.weight} kg`}</span>
                      {((units === 'imperial' ? (ghostSet.weight * cnsScale * 2.20462).toFixed(1) : (ghostSet.weight * cnsScale).toFixed(1)) !== weight) && (
                        <button
                          onClick={() => {
                            const scaledW = ghostSet.weight * cnsScale;
                            setWeight(units === 'imperial' ? (scaledW * 2.20462).toFixed(1) : scaledW.toFixed(1));
                          }}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer ml-1"
                          title="Sync predicted"
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}
                    </div>
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
                  <div className="flex items-center justify-between mt-1">
                    <button
                      onClick={() => setReps(prev => {
                        const val = parseInt(prev) || 0;
                        return Math.max(0, val - 1).toString();
                      })}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      className="w-16 text-center bg-transparent text-white font-bold text-2xl focus:outline-none tabular-nums"
                    />
                    <button
                      onClick={() => setReps(prev => {
                        const val = parseInt(prev) || 0;
                        return (val + 1).toString();
                      })}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-5">
                    <div className="flex justify-between items-center text-[9px] text-zinc-600 font-semibold">
                      <span>Target: {ghostSet.reps} reps</span>
                      {ghostSet.reps.toString() !== reps && (
                        <button
                          onClick={() => setReps(ghostSet.reps.toString())}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer ml-1"
                          title="Sync predicted"
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}
                    </div>
                    {prevBestSet && (
                      <span className="text-[9px] text-emerald-400/80 font-medium font-mono">
                        Prev: {prevBestSet.reps} reps
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RPE Selector & Confirm Button OR Rest Timer Panel */}
              {!timerActive ? (
                <>
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
                </>
              ) : (
                /* Rest Timer Panel (appears in place of RPE & Confirm button during rest) */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel border-emerald-950/30 bg-emerald-950/10 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-pulse" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex items-center justify-center w-14 h-14 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            className="stroke-zinc-800 fill-transparent"
                            strokeWidth="3.5"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            className="stroke-emerald-400 fill-transparent"
                            strokeWidth="3.5"
                            strokeDasharray="150.8"
                            strokeDashoffset={150.8 - (150.8 * (90 - timeLeft)) / 90}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                          />
                        </svg>
                        <span className="absolute text-xs font-bold text-white font-mono tracking-tighter tabular-nums">
                          {timeLeft}s
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 font-extrabold font-mono flex items-center gap-1.5">
                          <Timer size={10} className="animate-pulse" /> Rest Active
                        </span>
                        <span className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
                          Prepare for Set {currentSetIdx + 1} of {totalSets}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setTimeLeft(prev => Math.min(300, prev + 30))}
                        className="px-3 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-xl text-zinc-300 transition-all cursor-pointer font-mono"
                      >
                        +30s
                      </button>
                      <button
                        onClick={skipTimer}
                        className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Footer */}
      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 relative z-10">
        <div>
          <span className="font-semibold text-zinc-400">Next exercise:</span>{' '}
          {currentExerciseIdx < session.exercises.length - 1
            ? session.exercises[currentExerciseIdx + 1].name
            : 'Cardio Finisher'}
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="flex items-center gap-1 font-semibold text-white hover:text-zinc-300 transition-colors cursor-pointer animate-pulse"
        >
          End workout <ArrowRight size={12} />
        </button>
      </div>

      {/* Exercise History Per Movement Modal */}
      <AnimatePresence>
        {historyModalOpen && (
          <ExerciseHistoryModal
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            exerciseId={currentExercise.id}
            exerciseName={currentExercise.name}
            workoutHistory={workoutHistory}
            units={units}
          />
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border-white/10 bg-obsidian rounded-3xl p-6 max-w-sm w-full text-center relative z-50 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Pause & Exit Workout?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Your current sets logged will remain cached, but this session won't be finalized into your history ledger yet.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Keep Lifting
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    onBack();
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active-glow shadow-lg shadow-red-500/20"
                >
                  Exit Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* End Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border-white/10 bg-obsidian rounded-3xl p-6 max-w-sm w-full text-center relative z-50 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Finalize & Log Workout?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Ready to seal this training session? Your completed sets and volume tonnage will be saved to your ledger.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Keep Lifting
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    onFinishWorkout(workoutLogs, elapsedTime);
                  }}
                  className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all cursor-pointer active-glow"
                >
                  Finalize Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barbell Plate Calculator Drawer */}
      <AnimatePresence>
        {showPlateCalc && (
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowPlateCalc(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel border-white/10 bg-obsidian rounded-t-[32px] p-6 w-full max-w-sm shadow-2xl relative"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Plate Calculator</h3>
                <span className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/5 rounded px-2 py-0.5 uppercase">
                  {units === 'imperial' ? 'Lbs Mode' : 'Kg Mode'}
                </span>
              </div>

              {/* Weight Adjustment row inside calculator */}
              <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3 mb-6">
                <button
                  onClick={() => {
                    const step = units === 'imperial' ? 5 : 2.5;
                    setWeight(prev => Math.max(0, (parseFloat(prev) || 0) - step).toFixed(1));
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white cursor-pointer active:scale-95 transition-all"
                >
                  <Minus size={12} />
                </button>
                <div className="text-center">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Target Weight</span>
                  <span className="text-2xl font-black text-white font-mono leading-none">
                    {weight || '0'} <span className="text-xs font-bold text-zinc-400">{units === 'imperial' ? 'lbs' : 'kg'}</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    const step = units === 'imperial' ? 5 : 2.5;
                    setWeight(prev => ((parseFloat(prev) || 0) + step).toFixed(1));
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white cursor-pointer active:scale-95 transition-all"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Calculation Output */}
              {(() => {
                const targetW = parseFloat(weight) || 0;
                const { plates, remaining, barWeight } = calculatePlates(targetW, units === 'imperial');
                
                // Color mapping for plates
                const getPlateColor = (p: number) => {
                  if (units === 'imperial') {
                    if (p >= 45) return 'bg-red-500 border-red-400';
                    if (p >= 35) return 'bg-blue-500 border-blue-400';
                    if (p >= 25) return 'bg-yellow-500 border-yellow-400';
                    if (p >= 10) return 'bg-green-500 border-green-400';
                    if (p >= 5) return 'bg-zinc-400 border-zinc-300 text-black';
                    return 'bg-zinc-600 border-zinc-500';
                  } else {
                    if (p >= 25) return 'bg-red-500 border-red-400';
                    if (p >= 20) return 'bg-blue-500 border-blue-400';
                    if (p >= 15) return 'bg-yellow-500 border-yellow-400';
                    if (p >= 10) return 'bg-green-500 border-green-400';
                    if (p >= 5) return 'bg-zinc-400 border-zinc-300 text-black';
                    if (p >= 2.5) return 'bg-zinc-600 border-zinc-500';
                    return 'bg-zinc-300 border-zinc-200 text-black';
                  }
                };

                const getPlateHeightClass = (p: number) => {
                  if (units === 'imperial') {
                    if (p >= 45) return 'h-24 w-4';
                    if (p >= 35) return 'h-22 w-4';
                    if (p >= 25) return 'h-20 w-4';
                    if (p >= 10) return 'h-16 w-3';
                    if (p >= 5) return 'h-14 w-3';
                    return 'h-12 w-2.5';
                  } else {
                    if (p >= 25) return 'h-24 w-4';
                    if (p >= 20) return 'h-22 w-4';
                    if (p >= 15) return 'h-20 w-4';
                    if (p >= 10) return 'h-18 w-3';
                    if (p >= 5) return 'h-15 w-3';
                    if (p >= 2.5) return 'h-13 w-2.5';
                    return 'h-11 w-2';
                  }
                };

                return (
                  <div className="flex flex-col gap-5">
                    {/* Visual Barbell Graphic */}
                    <div className="h-32 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-4 overflow-x-auto relative">
                      {plates.length === 0 ? (
                        <div className="text-[10px] text-zinc-500 text-center font-mono">
                          {targetW <= barWeight 
                            ? `Load only the empty ${barWeight}${units === 'imperial' ? 'lb' : 'kg'} bar.` 
                            : 'Set weight above bar weight to view plates.'}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {/* Bar sleeve */}
                          <div className="w-10 h-3 bg-zinc-700 rounded-l border border-zinc-600 relative flex-shrink-0" />
                          {/* Inner collar */}
                          <div className="w-2.5 h-10 bg-zinc-500 border border-zinc-400 relative flex-shrink-0 z-10" />
                          
                          {/* Stacked plates */}
                          <div className="flex items-center gap-[1px] relative z-10">
                            {plates.map(({ plate, count }, pIdx) => (
                              <React.Fragment key={pIdx}>
                                {Array.from({ length: count }).map((_, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className={`rounded-md flex items-center justify-center font-mono text-[8px] font-black text-white shadow-md border ${getPlateColor(plate)} ${getPlateHeightClass(plate)}`}
                                  >
                                    <span className="rotate-90 origin-center whitespace-nowrap">{plate}</span>
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                          
                          {/* Bar sleeve extension */}
                          <div className="w-12 h-2 bg-zinc-600 rounded-r border border-zinc-500 flex-shrink-0" />
                        </div>
                      )}
                    </div>

                    {/* Breakdown list details */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                        Plates Per Side (Double for total)
                      </span>
                      {plates.length === 0 ? (
                        <div className="text-[10px] text-zinc-500 italic">No plates required.</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {plates.map(({ plate, count }, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] border border-white/5 bg-white/[0.02] rounded-xl px-3 py-2 font-mono">
                              <span className="text-zinc-400 font-medium">{plate} {units === 'imperial' ? 'lbs' : 'kg'}</span>
                              <span className="text-white font-extrabold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                x {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {remaining > 0 && (
                        <div className="text-[9px] text-amber-500 font-mono mt-1 text-center">
                          * Remaining discrepancy: {remaining.toFixed(2)} {units === 'imperial' ? 'lbs' : 'kg'} (microplates recommended).
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowPlateCalc(false)}
                      className="w-full mt-2 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-xl transition-all cursor-pointer text-center"
                    >
                      Close Calculator
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
