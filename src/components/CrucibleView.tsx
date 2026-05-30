'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession, Exercise, LoggedSet, computeEstimated1RM } from '@/constants/workout';
import { ArrowLeft, Check, Timer, ArrowRight, Zap, RefreshCw, CheckCircle2, Dumbbell, Minus, Plus, Flame } from 'lucide-react';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { useApp } from '@/context/AppContext';

interface CrucibleViewProps {
  session: WorkoutSession;
  onBack: () => void;
  onFinishWorkout: (logs: { [exId: string]: LoggedSet[] }, duration: number, notes?: string, tags?: string[], extraCardio?: any) => void;
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
  const { triggerHaptic, showToast } = useApp();
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [brokenPrs, setBrokenPrs] = useState<string[]>([]);

  // Deload Mode State
  const [deloadModeActive, setDeloadModeActive] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeloadModeActive(localStorage.getItem('forma_deload_mode') === 'true');
    }
  }, []);

  const dummyGhostSet = { weight: 0, reps: 0, rpe: 8 };

  const getScaledGhostSet = (originalSet: any) => {
    if (!originalSet) return dummyGhostSet;
    if (!deloadModeActive) return originalSet;
    return {
      ...originalSet,
      weight: originalSet.weight * 0.8,
      reps: Math.min(originalSet.reps, 8),
      rpe: Math.min(originalSet.rpe, 7.0)
    };
  };

  const currentExercise = session?.exercises?.[currentExerciseIdx];
  const totalSets = currentExercise?.defaultSets || 0;
  const ghostSet = currentExercise
    ? getScaledGhostSet(currentExercise.ghostSets[currentSetIdx] || currentExercise.ghostSets[currentExercise.ghostSets.length - 1])
    : dummyGhostSet;

  // Heart Rate Monitor & Calorie state variables
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [hrmConnected, setHrmConnected] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [isSimulatedHrm, setIsSimulatedHrm] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const hrmDeviceRef = useRef<any>(null);
  const hrmCharRef = useRef<any>(null);
  const heartRatesList = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBluetoothSupported(!!(navigator as any).bluetooth);
    }
  }, []);

  // Update Bluetooth Support check if navigator or user changes
  useEffect(() => {
    if (heartRate !== null && heartRate > 0) {
      heartRatesList.current.push(heartRate);
    }
  }, [heartRate]);

  const connectHrm = async () => {
    if (!(navigator as any).bluetooth) {
      showToast("Web Bluetooth is not supported in this browser.");
      return;
    }
    try {
      showToast("Searching for heart rate monitors...");
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }]
      });
      hrmDeviceRef.current = device;
      
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('heart_rate');
      const characteristic = await service?.getCharacteristic('heart_rate_measurement');
      hrmCharRef.current = characteristic;

      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', handleHrmValue);
      
      setHrmConnected(true);
      setIsSimulatedHrm(false);
      showToast("Heart Rate Monitor connected!");

      device.addEventListener('gattserverdisconnected', onHrmDisconnected);
    } catch (err: any) {
      console.error("Bluetooth connection error:", err);
      showToast(`Connection failed: ${err.message || err}`);
    }
  };

  const handleHrmValue = (event: any) => {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const isUint16 = (flags & 0x01) !== 0;
    let bpm = 0;
    if (isUint16) {
      bpm = value.getUint16(1, true);
    } else {
      bpm = value.getUint8(1);
    }
    setHeartRate(bpm);
  };

  const onHrmDisconnected = () => {
    setHrmConnected(false);
    setHeartRate(null);
    showToast("HRM disconnected");
  };

  const disconnectHrm = async () => {
    if (hrmCharRef.current) {
      try {
        await hrmCharRef.current.stopNotifications();
      } catch (e) {}
    }
    if (hrmDeviceRef.current && hrmDeviceRef.current.gatt?.connected) {
      hrmDeviceRef.current.gatt.disconnect();
    }
    setHrmConnected(false);
    setHeartRate(null);
    setIsSimulatedHrm(false);
    showToast("HRM disconnected");
  };

  const startSimulatedHrm = () => {
    setIsSimulatedHrm(true);
    setHrmConnected(true);
    setHeartRate(75);
    showToast("Simulated HRM active");
  };

  const getAverageHeartRate = () => {
    if (heartRatesList.current.length === 0) return undefined;
    const sum = heartRatesList.current.reduce((a, b) => a + b, 0);
    return Math.round(sum / heartRatesList.current.length);
  };

  // Progressive Overload calculations
  const lastSessionLog = workoutHistory?.find(h => h.sessionId === session?.id);
  const prevExerciseSets = currentExercise ? lastSessionLog?.logs?.[currentExercise.id] : undefined;
  const prevBestSet = prevExerciseSets && prevExerciseSets.length > 0
    ? [...prevExerciseSets].sort((a: any, b: any) => b.weight - a.weight || b.reps - a.reps)[0]
    : null;

  // All-time PR calculations
  const allTimeBestSet = React.useMemo(() => {
    if (!currentExercise) return { maxWeightSet: null, maxEst1RMSet: null };
    let maxWeight = 0;
    let maxEst1RM = 0;
    let maxWeightSet: any = null;
    let maxEst1RMSet: any = null;

    workoutHistory?.forEach((h: any) => {
      const sets = h.logs?.[currentExercise.id];
      if (Array.isArray(sets)) {
        sets.forEach((set: any) => {
          if (set.isWarmup) return;
          const weight = set.weight || 0;
          const reps = set.reps || 0;
          const est1RM = computeEstimated1RM(weight, reps);
          
          if (weight > maxWeight) {
            maxWeight = weight;
            maxWeightSet = { ...set, date: h.date };
          }
          if (est1RM > maxEst1RM) {
            maxEst1RM = est1RM;
            maxEst1RMSet = { ...set, date: h.date, est1RM };
          }
        });
      }
    });

    return { maxWeightSet, maxEst1RMSet };
  }, [workoutHistory, currentExercise?.id]);

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
  const [isWarmup, setIsWarmup] = useState(false);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [restDuration, setRestDuration] = useState(90);
  const [customRestTimes, setCustomRestTimes] = useState<Record<string, number>>({});

  // Global elapsed workout timer state
  const [elapsedTime, setElapsedTime] = useState(0);

  // Exercise history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Overload Alert
  const [overloadNotice, setOverloadNotice] = useState<string | null>(null);

  // Plate Calculator state
  const [showPlateCalc, setShowPlateCalc] = useState(false);

  // Workout Notes & Tags states
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Calorie burn logic
  useEffect(() => {
    if (elapsedTime <= 0) return;
    
    // Weight in kg (default 78.4)
    const weightKg = units === 'imperial' ? (parseFloat(weight) || 78.4) / 2.20462 : (parseFloat(weight) || 78.4);
    
    setCaloriesBurned(prev => {
      const durationMins = 1 / 60;
      if (hrmConnected && heartRate) {
        // Men calorie model (Alexander Thorne is male, default model)
        const hrFactor = 0.6309 * heartRate + 0.1988 * weightKg - 0.2017 * 28 - 55.0969;
        const calPerMin = Math.max(0, hrFactor / 4.184);
        return prev + calPerMin * durationMins;
      } else {
        // METs = 6.0: 0.105 * weightKg * durationMins
        const calPerMin = 6.0 * 3.5 * weightKg / 200;
        return prev + calPerMin * durationMins;
      }
    });
  }, [elapsedTime, hrmConnected, heartRate, units, weight]);

  // Simulated HRM Fluctuation
  useEffect(() => {
    if (!isSimulatedHrm || !hrmConnected) return;

    const interval = setInterval(() => {
      setHeartRate(prev => {
        if (prev === null) return 75;
        if (timerActive) {
          const target = 75;
          const diff = target - prev;
          const step = Math.sign(diff) * (Math.random() > 0.5 ? 1 : 0);
          return Math.max(70, Math.min(160, prev + step + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)));
        } else {
          const target = 80 + rpe * 7;
          const diff = target - prev;
          const step = Math.sign(diff) * (Math.random() > 0.4 ? 2 : 1);
          return Math.max(70, Math.min(160, prev + step + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulatedHrm, hrmConnected, timerActive, rpe]);

  // Zero-UI Input Prediction sync
  useEffect(() => {
    if (!currentExercise || !currentExercise.ghostSets || currentExercise.ghostSets.length === 0) return;
    const activeGhost = getScaledGhostSet(currentExercise.ghostSets[currentSetIdx] || currentExercise.ghostSets[currentExercise.ghostSets.length - 1]);
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
  }, [currentExerciseIdx, currentSetIdx, zeroUiEnabled, currentExercise, cnsScale, units, deloadModeActive]);

  const advanceWorkflow = () => {
    if (!session?.exercises || session.exercises.length === 0) return;
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
    if (timerActive && currentExercise) {
      intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            setTimerActive(false);
            triggerHaptic([30, 50, 30]); // double vibrate on rest timer completion
            advanceWorkflowRef.current();
            const nextDefault = currentExercise.keyMovement ? 180 : 90;
            return customRestTimes[currentExercise.id] || nextDefault;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerActive, currentExercise, customRestTimes, triggerHaptic]);

  // Global elapsed workout timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!session || !session.exercises || session.exercises.length === 0 || !currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-obsidian text-zinc-400">
        <Dumbbell className="text-zinc-600 mb-4 animate-bounce" size={48} />
        <h3 className="text-lg font-bold text-white mb-2">No Exercises Defined</h3>
        <p className="text-xs text-zinc-500 mb-6 text-center max-w-xs">
          This workout session does not contain any exercises or is loading.
        </p>
        <button onClick={onBack} className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  const handleLogSet = () => {
    const parsedInputWeight = parseFloat(weight) || 0;
    const parsedReps = parseInt(reps) || 0;
    
    // Convert weight back to kg for standard internal DB storage
    const weightInKg = units === 'imperial' ? parsedInputWeight / 2.20462 : parsedInputWeight;
    
    // Check Progressive Overload achievement
    let achievedOverload = false;
    if (!isWarmup) {
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
    }

    // Check All-Time PR achievement
    let achievedPR = false;
    let prType: 'weight' | '1rm' | 'both' | null = null;
    if (!isWarmup && parsedReps > 0 && weightInKg > 0 && allTimeBestSet.maxWeightSet) {
      const currentEst1RM = computeEstimated1RM(weightInKg, parsedReps);
      const allTimeWeight = allTimeBestSet.maxWeightSet.weight;
      const allTimeEst1RM = allTimeBestSet.maxEst1RMSet ? allTimeBestSet.maxEst1RMSet.est1RM : 0;
      
      const brokeWeight = weightInKg > allTimeWeight + 0.05;
      const broke1RM = currentEst1RM > allTimeEst1RM + 0.05;
      
      if (brokeWeight && broke1RM) {
        achievedPR = true;
        prType = 'both';
      } else if (brokeWeight) {
        achievedPR = true;
        prType = 'weight';
      } else if (broke1RM) {
        achievedPR = true;
        prType = '1rm';
      }
    }

    if (achievedPR) {
      setShowOverloadGlow(true);
      triggerHaptic([30, 80, 30, 80, 30]); // special long haptic rhythm for all-time PR
      
      const prWeightText = units === 'imperial'
        ? `${Math.round(parsedInputWeight)} lbs`
        : `${weightInKg.toFixed(1)} kg`;
        
      if (prType === 'both' || prType === 'weight') {
        showToast(`🏆 ALL-TIME PR! ${currentExercise.name}: ${prWeightText}`);
      } else {
        const est1RMText = units === 'imperial'
          ? `${Math.round(computeEstimated1RM(weightInKg, parsedReps) * 2.20462)} lbs`
          : `${computeEstimated1RM(weightInKg, parsedReps).toFixed(1)} kg`;
        showToast(`🏆 NEW EST. 1RM RECORD! ${currentExercise.name}: ${est1RMText}`);
      }
      
      if (!brokenPrs.includes(currentExercise.name)) {
        setBrokenPrs(prev => [...prev, currentExercise.name]);
      }
      setTimeout(() => setShowOverloadGlow(false), 2500);
    } else if (achievedOverload) {
      setShowOverloadGlow(true);
      triggerHaptic([30, 50, 30]); // double vibrate on PR milestone
      setTimeout(() => setShowOverloadGlow(false), 2200);
    } else {
      triggerHaptic([40]); // standard vibrate on regular set log
    }

    const warmupCount = (workoutLogs[currentExercise.id] || []).filter(s => s.isWarmup).length;

    const newSet: LoggedSet = {
      setNumber: isWarmup ? -(warmupCount + 1) : currentSetIdx + 1,
      weight: parseFloat(weightInKg.toFixed(1)),
      reps: parsedReps,
      rpe: isWarmup ? 6 : rpe,
      isWarmup: isWarmup
    };
    
    const updatedSets = [...(workoutLogs[currentExercise.id] || []), newSet];
    setWorkoutLogs(prev => ({
      ...prev,
      [currentExercise.id]: updatedSets
    }));

    if (isWarmup) {
      // Warmup logged - reset inputs to ghostSet target working values for next set
      const targetW = ghostSet.weight;
      setWeight(units === 'imperial' ? (targetW * 2.20462).toFixed(1) : targetW.toFixed(1));
      setReps(ghostSet.reps.toString());
      setIsWarmup(false);
      return;
    }

    // Auto-Regulated Overload Trigger Check (run only on last set)
    if (currentSetIdx === totalSets - 1 && autoOverloadEnabled && cnsScale >= 1.0) {
      // Find all past workouts logging this exercise to verify minimum history of 2 workouts
      const pastLogsWithExercise = workoutHistory.filter(
        h => h.logs && h.logs[currentExercise.id] && Array.isArray(h.logs[currentExercise.id]) && h.logs[currentExercise.id].length > 0
      );

      if (pastLogsWithExercise.length >= 2) {
        const workingUpdatedSets = updatedSets.filter(s => !s.isWarmup);
        // Targets met in current session
        const currentTargetsMet = workingUpdatedSets.every((s, idx) => {
          const targetReps = currentExercise.ghostSets[idx]?.reps || currentExercise.ghostSets[currentExercise.ghostSets.length - 1].reps;
          return s.reps >= targetReps;
        });

        if (currentTargetsMet) {
          // Compute rolling average RPE (current session + up to 2 past sessions)
          const currentAvgRpe = workingUpdatedSets.reduce((sum, s) => sum + s.rpe, 0) / workingUpdatedSets.length;
          let rpeSum = currentAvgRpe;
          let sessionsCount = 1;

          pastLogsWithExercise.slice(0, 2).forEach(log => {
            const sets = log.logs[currentExercise.id];
            const avgRpe = sets.reduce((sum: number, s: any) => sum + (s.rpe || 8), 0) / sets.length;
            rpeSum += avgRpe;
            sessionsCount++;
          });

          const rollingAvgRpe = rpeSum / sessionsCount;
          const rpeThreshold = currentExercise.keyMovement ? 7.5 : 7.0;

          if (rollingAvgRpe <= rpeThreshold) {
            // Determine increment: key movement gets 2.5kg / 5lbs; isolation gets 1.25kg / 2.5lbs
            let incrementKg = 2.5;
            if (units === 'imperial') {
              incrementKg = currentExercise.keyMovement ? (5 / 2.20462) : (2.5 / 2.20462);
            } else {
              incrementKg = currentExercise.keyMovement ? 2.5 : 1.25;
            }

            const nextWeight = weightInKg + incrementKg;
            onUpdateWeight(currentExercise.id, parseFloat(nextWeight.toFixed(1)));

            const overloadWeightDisplay = units === 'imperial'
              ? `${(nextWeight * 2.20462).toFixed(1)} lbs`
              : `${nextWeight.toFixed(1)} kg`;

            setOverloadNotice(
              `Auto-Overload Triggered! Rolling Avg RPE: ${rollingAvgRpe.toFixed(1)}. Next week baseline updated to ${overloadWeightDisplay}.`
            );
            triggerHaptic([30, 50, 30]);
            setTimeout(() => setOverloadNotice(null), 4500);
          }
        }
      }
    }

    // Enter Rest Timer based on exercise type and preferences
    const defaultDuration = currentExercise.keyMovement ? 180 : 90;
    const preferredDuration = customRestTimes[currentExercise.id] || defaultDuration;
    setRestDuration(preferredDuration);
    setTimeLeft(preferredDuration);
    setTimerActive(true);
  };

  const adjustRestTime = (amount: number) => {
    setTimeLeft(prev => {
      const newTime = Math.max(10, Math.min(300, prev + amount));
      setRestDuration(currDuration => {
        const updated = Math.max(10, Math.min(300, currDuration + amount));
        setCustomRestTimes(prevMap => ({
          ...prevMap,
          [currentExercise.id]: updated
        }));
        return updated;
      });
      return newTime;
    });
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

  const strokeDashoffset = 502.6 - (502.6 * (restDuration - timeLeft)) / restDuration;

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
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.15); }
          40% { transform: scale(1.02); }
          60% { transform: scale(1.12); }
        }
      `}</style>
      
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
          const workingSetsCount = (workoutLogs[ex.id] || []).filter(s => !s.isWarmup).length;
          const isCompleted = workingSetsCount >= ex.defaultSets;
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

      {/* Deload Mode Active Banner */}
      {deloadModeActive && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-400 text-center font-bold text-[9px] tracking-wider uppercase animate-pulse relative z-10 flex items-center justify-center gap-1.5">
          <Zap size={11} className="fill-cyan-400/20 animate-bounce" />
          <span>Deload Mode Active — Targets scaled down by 20%</span>
        </div>
      )}

      {/* Heart Rate / Bluetooth Sync Indicator */}
      <div className="mb-4 glass-panel rounded-2xl p-3 border border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
            <Flame 
              size={16} 
              className={`${hrmConnected && heartRate ? 'text-red-500 fill-red-500/20' : 'text-zinc-500'}`}
              style={{
                animation: hrmConnected && heartRate 
                  ? `heartbeat ${60 / heartRate}s infinite ease-in-out` 
                  : 'none'
              }}
            />
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold font-mono">
              Heart Rate Tracker
            </div>
            <div className="text-[11px] font-bold text-white leading-tight">
              {hrmConnected && heartRate ? (
                <span>
                  {heartRate} <span className="text-[8px] font-mono text-zinc-500 font-normal">BPM</span>
                  <span className="mx-1.5 text-zinc-600">&bull;</span>
                  {Math.round(caloriesBurned)} <span className="text-[8px] font-mono text-zinc-500 font-normal">KCAL</span>
                </span>
              ) : (
                <span className="text-zinc-500">Not Connected ({Math.round(caloriesBurned)} kcal)</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {hrmConnected ? (
            <button
              onClick={disconnectHrm}
              className="px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30 text-[9px] font-extrabold uppercase tracking-wider text-red-400 cursor-pointer transition-all hover:bg-red-950/40 active:scale-95"
            >
              Disconnect
            </button>
          ) : (
            <>
              {bluetoothSupported && (
                <button
                  onClick={connectHrm}
                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-extrabold uppercase tracking-wider text-zinc-300 hover:text-white cursor-pointer transition-all active:scale-95"
                >
                  Sync Sensor
                </button>
              )}
              <button
                onClick={startSimulatedHrm}
                className="px-2.5 py-1 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 text-[9px] font-extrabold uppercase tracking-wider text-[#60a5fa] cursor-pointer transition-all active:scale-95"
              >
                Simulate HR
              </button>
            </>
          )}
        </div>
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

                {/* Logged Warm-ups List */}
                {(() => {
                  const warmups = (workoutLogs[currentExercise.id] || []).filter(s => s.isWarmup);
                  if (warmups.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mb-3.5 items-center justify-start">
                      <span className="text-[8px] font-extrabold text-amber-500 uppercase tracking-widest mr-1">Logged Warm-ups:</span>
                      {warmups.map((w, idx) => {
                        const displayW = units === 'imperial' ? Math.round(w.weight * 2.20462) : w.weight;
                        const unitLabel = units === 'imperial' ? 'lbs' : 'kg';
                        return (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-semibold text-amber-400 font-mono">
                            {displayW}{unitLabel} x {w.reps}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Progress Indicators */}
                <div className="flex gap-2 mb-2">
                  {Array.from({ length: totalSets }).map((_, i) => {
                    const loggedSet = (workoutLogs[currentExercise.id] || []).filter(s => !s.isWarmup)[i];
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
                    Target Setup: {units === 'imperial' ? `${(ghostSet.weight * 2.20462).toFixed(1)} lbs` : `${ghostSet.weight} kg`} x {ghostSet.reps} @ RPE {ghostSet.rpe}
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
                    {allTimeBestSet.maxWeightSet && (
                      <span className="text-[9px] text-amber-400/90 font-medium font-mono">
                        PR: {units === 'imperial' ? `${(allTimeBestSet.maxWeightSet.weight * 2.20462).toFixed(1)} lbs` : `${allTimeBestSet.maxWeightSet.weight} kg`} x {allTimeBestSet.maxWeightSet.reps}
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
                    {allTimeBestSet.maxEst1RMSet && (
                      <span className="text-[9px] text-cyan-400/90 font-medium font-mono">
                        PR 1RM: {units === 'imperial' ? `${Math.round(allTimeBestSet.maxEst1RMSet.est1RM * 2.20462)} lbs` : `${allTimeBestSet.maxEst1RMSet.est1RM.toFixed(1)} kg`}
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

                  {/* Warmup Set Toggle */}
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-xl p-3.5 my-1">
                    <div className="flex items-center gap-2">
                      <Flame size={14} className={isWarmup ? "text-amber-500 animate-pulse" : "text-zinc-500"} />
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Warm-up Set</span>
                        <span className="text-[8px] text-zinc-500 font-medium leading-normal">Excludes set from volume stats & overload checks</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWarmup(!isWarmup)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer ${
                        isWarmup ? "bg-amber-500" : "bg-zinc-800"
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 rounded-full bg-white shadow-md"
                        animate={{ x: isWarmup ? 16 : 0 }}
                      />
                    </button>
                  </div>

                  {/* Warmup Suggestions pyramid */}
                  {isWarmup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="glass-panel border-amber-950/20 bg-amber-950/5 rounded-xl p-3 flex flex-col gap-2 text-left"
                    >
                      <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest font-mono">
                        Warm-up Pyramid Suggestions:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { pct: 0.5, reps: 8, label: '50% (8 reps)' },
                          { pct: 0.7, reps: 5, label: '70% (5 reps)' },
                          { pct: 0.85, reps: 3, label: '85% (3 reps)' }
                        ].map((item, idx) => {
                          const wKg = ghostSet.weight * item.pct;
                          const w = units === 'imperial' ? wKg * 2.20462 : wKg;
                          const step = units === 'imperial' ? 2.5 : 1.25;
                          const sugW = (Math.round(w / step) * step).toFixed(1);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setWeight(sugW);
                                setReps(item.reps.toString());
                              }}
                              className="px-2 py-1.5 rounded-lg border border-amber-900/30 bg-amber-950/20 hover:bg-amber-950/40 text-[9px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer text-center"
                            >
                              <div className="font-mono font-extrabold">{sugW} {units === 'imperial' ? 'lbs' : 'kg'}</div>
                              <div className="text-[7px] text-amber-500 font-semibold mt-0.5">{item.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

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
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
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
                            strokeDashoffset={150.8 - (150.8 * (restDuration - timeLeft)) / restDuration}
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

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => adjustRestTime(-30)}
                        className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-xl text-zinc-300 transition-all cursor-pointer font-mono text-center"
                      >
                        -30s
                      </button>
                      <button
                        onClick={() => adjustRestTime(30)}
                        className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-xl text-zinc-300 transition-all cursor-pointer font-mono text-center"
                      >
                        +30s
                      </button>
                      <button
                        onClick={skipTimer}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-white hover:bg-zinc-200 text-black text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center font-bold"
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
              className="glass-panel border-white/10 bg-[#0f0f11] rounded-[28px] p-6 max-w-md w-full text-left relative z-50 shadow-2xl flex flex-col gap-4"
            >
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Finalize & Log Workout</h3>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Ready to seal this training session? Add any notes or tags below.
                </p>
              </div>

              {/* Workout Notes */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold font-mono">
                  Workout Notes
                </label>
                <textarea
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="How did you feel? Left shoulder tight, high energy..."
                  className="w-full bg-black/30 border border-white/5 focus:border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none h-16 font-sans leading-relaxed transition-colors"
                />
              </div>

              {/* Workout Tags */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold font-mono">
                  Session Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {['Heavy Load', 'High Volume', 'Great Pump', 'Stiff Joints', 'Low Energy', 'Focus Peak'].map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev => 
                            isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-md border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40' 
                            : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Keep Lifting
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    const finalTags = [...selectedTags, ...brokenPrs.map(exName => `🏆 PR: ${exName}`)];
                    const avgHr = getAverageHeartRate();
                    const extraCardio = avgHr 
                      ? { avgHeartRate: avgHr, caloriesBurned: Math.round(caloriesBurned) } 
                      : { caloriesBurned: Math.round(caloriesBurned) };
                    onFinishWorkout(workoutLogs, elapsedTime, workoutNotes, finalTags, extraCardio);
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
