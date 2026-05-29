'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession, computeTotalTonnage } from '@/constants/workout';
import { Play, Flame, Award, Dumbbell, Calendar, Moon, Minus, Plus, ShieldCheck, AlertTriangle, Droplet } from 'lucide-react';
import { UserProfile } from '@/types/workout';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

const MOTIVATIONAL_QUOTES = [
  "Strip away feeds and streaks. Physical form should reflect the same essence as your professional craft.",
  "Discipline is choosing between what you want now and what you want most.",
  "Consistency beats intensity. Show up, execute, and build the foundation.",
  "Physical strength is the outward reflection of inner resolve. Do the work.",
  "Your body is a physical structure built by your choices. Construct it with precision.",
  "Progress lies in the details. One extra rep, one consistent meal, one perfect set.",
  "The resistance you meet in the gym builds the capacity you need in life.",
  "The iron never lies to you. It is the ultimate mirror of your dedication.",
  "Peak form is not a destination; it is a daily maintenance architecture.",
  "Do not wish for lighter loads; build a stronger back.",
  "Excellence is not an act, but a habit. You are what you repeatedly do.",
  "The bridge between dreams and reality is called discipline.",
  "True grit is staying with your program long after the initial mood has left you.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "The quality of your training dictates the quality of your physical structure.",
  "Great things are not done by impulse, but by a series of small things brought together.",
  "Strength does not come from physical capacity. It comes from an indomitable will.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Do today what others won't, so you can do tomorrow what others can't."
];

const getDayOfYearIndex = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day % MOTIVATIONAL_QUOTES.length;
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  return start;
};

const getDayOfWeekVal = (day: number) => {
  return day === 0 ? 7 : day; // Sunday is 7, Monday is 1, ..., Saturday is 6
};

const exerciseTargets: Record<string, Record<string, number>> = {
  'incline-db-press': { Chest: 1.0, Shoulders: 0.3, Arms: 0.2 },
  'flat-bench-press': { Chest: 1.0, Shoulders: 0.3, Arms: 0.2 },
  'lat-pulldowns': { Back: 1.0, Arms: 0.3 },
  'seated-cable-rows': { Back: 1.0, Arms: 0.3 },
  'bent-over-rows': { Back: 1.0, Arms: 0.3 },
  'face-pulls': { Back: 0.5, Shoulders: 0.5 },
  'overhead-press': { Shoulders: 1.0, Arms: 0.2 },
  'lateral-raises': { Shoulders: 1.0 },
  'bicep-curls-db': { Arms: 1.0 },
  'tricep-overhead-extensions': { Arms: 1.0 },
  'goblet-squat': { Quads: 1.0, Core: 0.3 },
  'leg-press': { Quads: 0.8, Hamstrings: 0.2 },
  'leg-extensions': { Quads: 1.0 },
  'walking-lunges': { Quads: 0.6, Hamstrings: 0.4 },
  'romanian-deadlifts': { Hamstrings: 1.0, Core: 0.3 },
  'leg-curls': { Hamstrings: 1.0 },
  'hanging-leg-raises': { Core: 1.0 },
  'planks': { Core: 1.0 },
  'weighted-russian-twists': { Core: 1.0 }
};

/**
 * Resolve muscle targets for an exercise.
 * Falls back to parsing the targetGroup string for custom/user-added exercises.
 */
const resolveExerciseTargets = (exId: string, sessions: WorkoutSession[]): Record<string, number> | null => {
  // Check the hardcoded map first
  if (exerciseTargets[exId]) return exerciseTargets[exId];

  // Fallback: find the exercise in session definitions and parse targetGroup
  for (const session of sessions) {
    const ex = session.exercises?.find(e => e.id === exId);
    if (ex) {
      const group = ex.targetGroup.toLowerCase();
      if (group.includes('chest')) return { Chest: 1.0 };
      if (group.includes('lat') || group.includes('back') || group.includes('rhomboid')) return { Back: 1.0 };
      if (group.includes('shoulder') || group.includes('delt')) return { Shoulders: 1.0 };
      if (group.includes('bicep') || group.includes('tricep') || group.includes('arm')) return { Arms: 1.0 };
      if (group.includes('quad')) return { Quads: 1.0 };
      if (group.includes('hamstring') || group.includes('glute')) return { Hamstrings: 0.7, Quads: 0.3 };
      if (group.includes('core') || group.includes('ab') || group.includes('oblique')) return { Core: 1.0 };
      // Generic fallback — assign to closest match or skip
      return null;
    }
  }
  return null;
};

const calculateMuscleRecovery = (workoutHistory: any[], sessions: WorkoutSession[], sleepHours: number = 8.0): Record<string, number> => {
  const muscleFatigue: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Quads: 0,
    Hamstrings: 0,
    Core: 0
  };

  const baseDecayRates: Record<string, number> = {
    Chest: 0.015,       // ~72h
    Back: 0.015,        // ~72h
    Quads: 0.015,       // ~72h
    Hamstrings: 0.015,  // ~72h
    Shoulders: 0.025,   // ~40h
    Arms: 0.025,        // ~40h
    Core: 0.035         // ~24h
  };

  // Modulate decay rates by sleep quality: poor sleep = slower recovery
  const sleepFactor = sleepHours >= 8 ? 1.0 : sleepHours >= 7 ? 0.9 : sleepHours >= 6 ? 0.75 : 0.6;
  const decayRates: Record<string, number> = {};
  Object.keys(baseDecayRates).forEach(muscle => {
    decayRates[muscle] = baseDecayRates[muscle] * sleepFactor;
  });

  const now = new Date().getTime();
  const sortedHistory = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let lastEventTime: number | null = null;

  sortedHistory.forEach(log => {
    const logTime = new Date(log.date).getTime();

    // Decay accumulated fatigue from the last event up to the time of this new log
    if (lastEventTime !== null) {
      const hoursElapsed = Math.max(0, (logTime - lastEventTime) / (1000 * 60 * 60));
      Object.keys(muscleFatigue).forEach(muscle => {
        const rate = decayRates[muscle] || 0.02;
        muscleFatigue[muscle] = muscleFatigue[muscle] * Math.exp(-rate * hoursElapsed);
      });
    }

    // Accumulate the fatigue from the exercises in this log, weighted by RPE
    if (log.logs) {
      Object.keys(log.logs).forEach(exId => {
        const sets = log.logs[exId];
        if (!Array.isArray(sets) || sets.length === 0) return;

        const setCount = sets.length;
        const avgRpe = sets.reduce((sum: number, s: any) => sum + (s.rpe || 8), 0) / setCount;
        const rpeMultiplier = avgRpe / 8; // normalize around RPE 8 as baseline

        const targets = resolveExerciseTargets(exId, sessions);
        if (targets) {
          Object.keys(targets).forEach(muscle => {
            const factor = targets[muscle];
            muscleFatigue[muscle] = Math.min(100, (muscleFatigue[muscle] || 0) + setCount * 15 * factor * rpeMultiplier);
          });
        }
      });
    }

    lastEventTime = logTime;
  });

  // Decay the final accumulated fatigue from the last logged event up to the current time (now)
  if (lastEventTime !== null) {
    const hoursElapsed = Math.max(0, (now - lastEventTime) / (1000 * 60 * 60));
    Object.keys(muscleFatigue).forEach(muscle => {
      const rate = decayRates[muscle] || 0.02;
      muscleFatigue[muscle] = muscleFatigue[muscle] * Math.exp(-rate * hoursElapsed);
    });
  }

  const recovery: Record<string, number> = {};
  Object.keys(muscleFatigue).forEach(muscle => {
    recovery[muscle] = Math.max(0, Math.round(100 - muscleFatigue[muscle]));
  });

  return recovery;
};

interface HorizonViewProps {
  sessions: WorkoutSession[];
  workoutHistory: any[];
  onStartWorkout: (session: WorkoutSession) => void;
  onShareWorkout?: (session: any) => void;
  userProfile?: UserProfile;
  onEditProgram?: () => void;
}

export default function HorizonView({ sessions, workoutHistory, onStartWorkout, onShareWorkout, userProfile, onEditProgram }: HorizonViewProps) {
  const { theme } = useApp();
  const [quoteIdx, setQuoteIdx] = React.useState(getDayOfYearIndex());
  const [sleepHours, setSleepHours] = React.useState<number>(8.0);
  const [isSleepModalOpen, setIsSleepModalOpen] = React.useState(false);
  const [waterIntake, setWaterIntake] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<0 | 1>(0);
  const waterTarget = 3.0; // 3 Liters
  
  const [scrolled, setScrolled] = React.useState(false);
  const [selectedMuscle, setSelectedMuscle] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Swipe touch/mouse handlers
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const mouseStartX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    
    // Only trigger tab switch if the swipe was horizontal and exceeded threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setActiveTab(1);
      } else {
        setActiveTab(0);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    mouseStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diffX = mouseStartX.current - e.clientX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        setActiveTab(1);
      } else {
        setActiveTab(0);
      }
    }
    mouseStartX.current = null;
  };

  // Sync sleepHours and waterIntake from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSleep = localStorage.getItem('forma_sleep_hours');
      if (storedSleep) {
        setSleepHours(parseFloat(storedSleep));
      }
      
      const todayStr = new Date().toDateString();
      const storedWater = localStorage.getItem(`forma_water_intake_${todayStr}`);
      if (storedWater) {
        setWaterIntake(parseFloat(storedWater));
      }
    }
  }, []);

  const adjustSleep = (amount: number) => {
    const newSleep = Math.max(3.0, Math.min(12.0, sleepHours + amount));
    setSleepHours(newSleep);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_sleep_hours', newSleep.toFixed(1));
    }
  };

  const adjustWater = (amount: number) => {
    const newIntake = Math.max(0, waterIntake + amount);
    setWaterIntake(newIntake);
    if (typeof window !== 'undefined') {
      const todayStr = new Date().toDateString();
      localStorage.setItem(`forma_water_intake_${todayStr}`, newIntake.toFixed(2));
    }
  };

  const calculateWorkoutStreak = (history: any[]): number => {
    if (!history || history.length === 0) return 0;
    
    // Group workouts with actualTonnage > 0 by calendar week (Monday as start)
    const workoutsByWeek = new Map<string, number>();
    
    history.forEach(log => {
      if (log.actualTonnage && log.actualTonnage > 0) {
        const logDate = new Date(log.date);
        const day = logDate.getDay();
        const diff = logDate.getDate() - day + (day === 0 ? -6 : 1);
        const logDateClone = new Date(logDate.getTime());
        const startOfWeek = new Date(logDateClone.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        const weekKey = startOfWeek.toDateString();
        workoutsByWeek.set(weekKey, (workoutsByWeek.get(weekKey) || 0) + 1);
      }
    });

    // Current week Monday
    const today = new Date();
    const todayDay = today.getDay();
    const todayDiff = today.getDate() - todayDay + (todayDay === 0 ? -6 : 1);
    const todayClone = new Date(today.getTime());
    const currentWeekMonday = new Date(todayClone.setDate(todayDiff));
    currentWeekMonday.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkWeek = new Date(currentWeekMonday);
    
    // Check current week
    const currentWeekCount = workoutsByWeek.get(checkWeek.toDateString()) || 0;
    if (currentWeekCount >= 4) {
      streak++;
    }
    
    // Check previous weeks
    while (true) {
      const nextCheckWeek = new Date(checkWeek.getTime());
      nextCheckWeek.setDate(nextCheckWeek.getDate() - 7);
      checkWeek = nextCheckWeek;
      const weekKey = checkWeek.toDateString();
      const count = workoutsByWeek.get(weekKey) || 0;
      if (count >= 4) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const workoutStreak = calculateWorkoutStreak(workoutHistory);

  const handleCycleQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const recovery = calculateMuscleRecovery(workoutHistory, sessions, sleepHours);

  const getMuscleColor = (muscleName: string) => {
    const score = recovery[muscleName] !== undefined ? recovery[muscleName] : 100;
    if (score >= 70) return '#00f0ff'; // Cyan
    if (score >= 40) return '#ffaa00'; // Amber
    return '#ff3355'; // Crimson
  };

  const getGlowId = (muscleName: string) => {
    const score = recovery[muscleName] !== undefined ? recovery[muscleName] : 100;
    if (score >= 70) return 'cyan-glow';
    if (score >= 40) return 'amber-glow';
    return 'crimson-glow';
  };

  const getMuscleClass = (muscleName: string) => {
    const score = recovery[muscleName] !== undefined ? recovery[muscleName] : 100;
    if (score >= 70) return 'muscle-cyan';
    if (score >= 40) return 'muscle-amber';
    return 'muscle-crimson';
  };

  // If sessions haven't loaded yet, return safety default
  if (!sessions || sessions.length === 0) return null;

  const isImperial = userProfile?.units === 'imperial';
  
  // Determine if a workout has already been logged today
  const hasCompletedToday = workoutHistory.length > 0 &&
    new Date(workoutHistory[0].date).toDateString() === new Date().toDateString();

  const lastLogged = workoutHistory[0];
  
  // If completed today, Today's Blueprint shows that completed session.
  // Otherwise, show the session corresponding to the current day of the week.
  const getTodaySessionIndex = () => {
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    if (day === 1) return 0; // Monday
    if (day === 2) return 1; // Tuesday
    if (day === 3) return 2; // Wednesday
    if (day === 4) return 3; // Thursday
    if (day === 5) return 4; // Friday
    return 5; // Sat/Sun
  };

  const todayWorkoutIndex = hasCompletedToday
    ? sessions.findIndex(s => s.id === lastLogged.sessionId)
    : getTodaySessionIndex();

  const todaySessionIndex = todayWorkoutIndex !== -1 ? todayWorkoutIndex : getTodaySessionIndex();
  const todayWorkout = sessions[todaySessionIndex]; 

  // Calculate workouts completed in this calendar week for progress stats
  const startOfWeek = getStartOfWeek();

  const completedWorkouts = workoutHistory.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= startOfWeek && log.actualTonnage > 0;
  }).length;
  
  const weeklyWorkoutTarget = 4;
  const weeklyWorkoutProgressPercent = Math.min(100, Math.round((completedWorkouts / weeklyWorkoutTarget) * 100));

  // Calculate completed days in current week (0 = Mon, 1 = Tue ... 6 = Sun)
  const completedDays = Array(7).fill(false);
  workoutHistory.forEach(log => {
    const logDate = new Date(log.date);
    if (logDate >= startOfWeek && log.actualTonnage > 0) {
      const day = logDate.getDay();
      const index = day === 0 ? 6 : day - 1;
      if (index >= 0 && index < 7) {
        completedDays[index] = true;
      }
    }
  });

  // Determine dynamic consistency status
  const currentDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon ...
  let consistencyStatus = "ON TRACK";
  let statusColorClass = "text-emerald-400 border-emerald-950 bg-emerald-950/20";
  
  if (completedWorkouts >= weeklyWorkoutTarget) {
    consistencyStatus = "GOAL ACHIEVED";
    statusColorClass = "text-cyan-400 border-cyan-950 bg-cyan-950/20";
  } else if (
    (currentDayOfWeek >= 4 && completedWorkouts < 2) || 
    (currentDayOfWeek >= 6 && completedWorkouts < 3)
  ) {
    consistencyStatus = "BEHIND TARGET";
    statusColorClass = "text-amber-500 border-amber-950/20 bg-amber-950/5";
  }

  // 2. Treadmill Incline Walk duration accumulator (this week, goal 120 mins)
  let totalWalkMins = 0;
  workoutHistory.forEach(log => {
    const logDate = new Date(log.date);
    if (logDate >= startOfWeek) {
      if (log.cardioDetails?.duration) {
        totalWalkMins += Number(log.cardioDetails.duration);
      }
      if (log.recoveryDetails?.duration) {
        totalWalkMins += Number(log.recoveryDetails.duration);
      }
      if (log.restDetails?.walkLogged) {
        totalWalkMins += 30; // standard rest walk duration
      }
    }
  });
  
  const treadmillWalkTarget = 120;
  const walkProgressPercent = Math.min(100, Math.round((totalWalkMins / treadmillWalkTarget) * 100));

  // 3. Today's Target Lift (previous best or target setup)
  const keyLift = todayWorkout && todayWorkout.exercises && todayWorkout.exercises.length > 0
    ? (todayWorkout.exercises.find(e => e.keyMovement) || todayWorkout.exercises[0])
    : null;
  const ghostBest = keyLift ? keyLift.ghostSets[0] : null;

  let prevBestSetString = "No previous log";
  if (keyLift && workoutHistory.length > 0) {
    let bestSet: any = null;
    workoutHistory.forEach(log => {
      const sets = log.logs?.[keyLift.id];
      if (sets && Array.isArray(sets) && sets.length > 0) {
        sets.forEach((set: any) => {
          if (!bestSet || set.weight > bestSet.weight || (set.weight === bestSet.weight && set.reps > bestSet.reps)) {
            bestSet = set;
          }
        });
      }
    });
    
    if (bestSet) {
      const displayW = isImperial ? (bestSet.weight * 2.20462).toFixed(1) : bestSet.weight.toFixed(1);
      const unitLabel = isImperial ? 'lbs' : 'kg';
      prevBestSetString = `${displayW} ${unitLabel} x ${bestSet.reps}`;
    }
  }

  if (prevBestSetString === "No previous log" && keyLift && ghostBest) {
    const displayW = isImperial ? (ghostBest.weight * 2.20462).toFixed(1) : ghostBest.weight.toFixed(1);
    const unitLabel = isImperial ? 'lbs' : 'kg';
    prevBestSetString = `${displayW} ${unitLabel} x ${ghostBest.reps} (Target)`;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pb-36 pt-6 px-4 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col gap-6"
    >
      {/* Brand Header Logo */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-white/5">
        <div className="w-16" /> {/* spacer for balance */}
        <Image
          src="/Frame 166.png"
          alt="FORMA Logo"
          width={120}
          height={28}
          priority
          style={{ height: 'auto' }}
          className={`h-5 md:h-6 w-auto object-contain animate-fade-in ${theme === 'light' ? 'invert' : ''}`}
        />
        <div className="w-16" />
      </div>

      {/* Greetings Section */}
      <motion.div variants={itemVariants} className="px-1 flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-white-adj font-sans">
          {(() => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            return 'Good Evening';
          })()}, {userProfile?.name?.split(' ')[0] || 'Athlete'}
        </h2>
        <p className="text-xs text-zinc-400-adj font-sans leading-normal">
          {todayWorkout ? (
            todayWorkout.type === 'workout' ? (
              <>Ready to execute? Today's focus is <span className="text-white-adj font-semibold">{todayWorkout.title}</span> ({todayWorkout.focus}).</>
            ) : (
              <>Recovery phase active. Today is designated for <span className="text-white-adj font-semibold">{todayWorkout.title}</span>.</>
            )
          ) : (
            'Welcome back. Ready for your next session?'
          )}
        </p>
      </motion.div>

      {/* Responsive Dashboard Split Grid (stacked on mobile, side-by-side on desktop) */}
      <div className="grid grid-cols-12 gap-6 w-full items-start">
        
        {/* Left Column: Bento Box + Heatmap */}
        <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Dynamic Performance Bento Box Grid with Switcher */}
          <motion.div variants={itemVariants} className="w-full flex flex-col gap-2">
            
            {/* Tab switcher capsule */}
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                {activeTab === 0 ? 'Performance Split' : 'Biophysical Wellness'}
              </span>
              <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5 relative">
                <button
                  onClick={() => setActiveTab(0)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === 0 ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Focus
                </button>
                <button
                  onClick={() => setActiveTab(1)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === 1 ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Health
                </button>
              </div>
            </div>

            {/* Swipeable Tabs Container */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              className="relative overflow-hidden w-full select-none cursor-ew-resize"
            >
              <motion.div
                className="flex w-[200%]"
                animate={{ x: activeTab === 0 ? '0%' : '-50%' }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              >
                {/* Tab 1: Performance Focus (5-span Map, 7-span Pills) */}
                <div className="w-1/2 flex-shrink-0 grid grid-cols-12 gap-3 sm:gap-4 pr-1.5 sm:pr-2">
                  
                  {/* Left: Weekly Progress Circle Map Redesigned */}
                  <div className="col-span-5 bg-card-1 border border-white/5 rounded-[24px] sm:rounded-[28px] p-3 sm:p-4 flex flex-col items-center justify-between min-h-[180px] sm:min-h-[216px] relative overflow-hidden">
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      Consistency
                    </span>

                    <div className="relative flex items-center justify-center my-1">
                      <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="weekly-progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00f0ff" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="stroke-zinc-800/40 dark:stroke-zinc-800/60 fill-transparent"
                          strokeWidth="7"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="fill-transparent"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * weeklyWorkoutProgressPercent) / 100}
                          transform="rotate(-90 50 50)"
                          style={{
                            stroke: 'url(#weekly-progress-grad)',
                            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm sm:text-base font-extrabold text-white-adj font-mono leading-none">
                          {completedWorkouts}
                        </span>
                        <span className="text-[6px] sm:text-[7px] text-zinc-500-adj uppercase font-bold tracking-wider mt-0.5">
                          of 4 days
                        </span>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between items-center px-0.5">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                          const completed = completedDays[idx];
                          const isToday = currentDayOfWeek === (idx === 6 ? 0 : idx + 1);
                          
                          return (
                            <div key={idx} className="flex flex-col items-center gap-0.5">
                              <span className={`text-[6px] sm:text-[7px] font-bold ${isToday ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                {day}
                              </span>
                              <div 
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[7px] transition-all duration-300 ${
                                  completed 
                                    ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                                    : isToday 
                                      ? 'border border-cyan-500/50 bg-cyan-950/10 text-cyan-400 animate-pulse'
                                      : 'border border-white/5 bg-white/[0.02] text-zinc-600'
                                }`}
                              >
                                {completed && (
                                  <svg className="w-1.5 h-1.5 stroke-[3px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: 3 stacked pills */}
                  <div className="col-span-7 flex flex-col gap-2.5 sm:gap-3 justify-between">
                    
                    {/* Card 1: Treadmill Walk */}
                    <div className="bg-treadmill-bg border border-white/5 rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden group">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-treadmill-icon-bg flex-shrink-0">
                        <Flame size={15} className="text-treadmill-icon sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-treadmill-muted font-semibold font-sans">
                          Treadmill Walk
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-treadmill-text font-sans leading-tight truncate">
                          {totalWalkMins} / {treadmillWalkTarget} Mins
                        </span>
                      </div>
                      <span className="ml-auto text-[9px] sm:text-xs font-bold text-treadmill-text font-sans whitespace-nowrap">
                        {walkProgressPercent}%
                      </span>
                    </div>

                    {/* Card 2: Today's Target Lift */}
                    <div className="bg-card-3 border border-white/5 rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-card-1 flex-shrink-0" style={{ backgroundColor: 'var(--card-3-icon-bg)' }}>
                        <Dumbbell size={15} className="text-white-adj sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-sans">
                          Today's Target
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-white-adj font-sans leading-tight truncate">
                          {keyLift ? keyLift.name.split(' (')[0].split(' or ')[0] : 'Active Recovery'}
                        </span>
                      </div>
                      {keyLift && (
                        <span className="ml-auto text-[9px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-300 font-sans bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg px-1.5 sm:px-2 py-0.5 whitespace-nowrap truncate max-w-[50px] sm:max-w-none">
                          {prevBestSetString.replace(' (Target)', '')}
                        </span>
                      )}
                    </div>

                    {/* Card 3: Workout Streak (Flame Pill) */}
                    <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10 dark:border-orange-500/20 rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-orange-500/10 dark:bg-orange-500/20 flex-shrink-0">
                        <Flame size={15} className="text-orange-600 dark:text-orange-400 fill-orange-500/20 sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-sans">
                          Workout Streak
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-white-adj font-sans leading-tight truncate">
                          {workoutStreak} Week Streak
                        </span>
                      </div>
                      <span className="ml-auto text-[8px] font-mono text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded px-2 py-0.5 uppercase whitespace-nowrap">
                        {workoutStreak > 0 ? '🔥 Active' : 'No Streak'}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Tab 2: Biophysical Wellness (5-span Water, 7-span Pills) */}
                <div className="w-1/2 flex-shrink-0 grid grid-cols-12 gap-3 sm:gap-4 pl-1.5 sm:pl-2">
                  
                  {/* Left: Water Intake Bento Card */}
                  <div className="col-span-5 bg-card-1 border border-white/5 rounded-[24px] sm:rounded-[28px] p-3 sm:p-5 flex flex-col justify-between min-h-[180px] sm:min-h-[216px] relative overflow-hidden group">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-[#2f80ed]/10 transition-all duration-700 pointer-events-none" 
                      style={{ height: `${Math.min(100, (waterIntake / waterTarget) * 100)}%` }}
                    />
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center relative z-10 gap-1">
                      <div className="flex items-center gap-1.5">
                        <Droplet size={12} className="text-blue-400 fill-blue-400/20" />
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-sans">
                          Hydration
                        </span>
                      </div>
                      <span className="text-[7px] font-mono text-blue-400 bg-blue-950/20 border border-blue-900/30 rounded px-1.5 py-0.5 uppercase self-start sm:self-auto whitespace-nowrap">
                        Water Log
                      </span>
                    </div>
                    <div className="my-1.5 sm:my-2 text-center relative z-10">
                      <p className="text-xl sm:text-3xl font-extrabold text-white-adj font-mono leading-none">
                        {waterIntake.toFixed(2)}<span className="text-[10px] sm:text-xs font-bold text-zinc-500">L</span>
                      </p>
                      <p className="text-[8px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1 font-medium font-mono">
                        Target: {waterTarget.toFixed(2)} L
                      </p>
                    </div>
                    <div className="flex justify-center items-center gap-1 sm:gap-4 relative z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); adjustWater(-0.25); }}
                        className="w-6 h-6 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white-adj cursor-pointer transition-all active:scale-90"
                        title="Subtract 250ml"
                      >
                        <Minus size={10} className="sm:w-[14px] sm:h-[14px]" />
                      </button>
                      <span className="text-[7px] sm:text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-wider whitespace-nowrap px-0.5">
                        250 ml
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); adjustWater(0.25); }}
                        className="w-6 h-6 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white-adj cursor-pointer transition-all active:scale-90"
                        title="Add 250ml"
                      >
                        <Plus size={10} className="sm:w-[14px] sm:h-[14px]" />
                      </button>
                    </div>
                  </div>

                  {/* Right: 3 wellness pills */}
                  <div className="col-span-7 flex flex-col gap-2.5 sm:gap-3 justify-between">
                    
                    {/* Card 1: Sleep Duration (Purple Pill) */}
                    <div 
                      onClick={() => setIsSleepModalOpen(true)}
                      className="bg-sleep-bg border border-white/5 rounded-full p-2 sm:p-2.5 pr-4 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-sleep-icon-bg flex-shrink-0">
                        <Moon size={15} className="text-sleep-icon sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-sleep-muted font-semibold font-sans">
                          Sleep Duration
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-sleep-text font-sans leading-tight">
                          {Math.floor(sleepHours)}h {Math.round((sleepHours - Math.floor(sleepHours)) * 60) > 0 ? `${Math.round((sleepHours - Math.floor(sleepHours)) * 60)}m` : '00m'}
                        </span>
                      </div>
                      <span className="ml-auto text-[7px] sm:text-[9px] uppercase tracking-wider text-sleep-muted font-semibold font-sans font-mono border border-white/5 bg-black/10 rounded px-1.5 py-0.5">
                        Log
                      </span>
                    </div>

                    {/* Card 2: CNS Readiness State */}
                    <div className={`rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] border border-white/5 relative overflow-hidden ${
                      sleepHours < 7.0 
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' 
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                    }`}>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        sleepHours < 7.0 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'
                      } flex-shrink-0`}>
                        {sleepHours < 7.0 ? (
                          <AlertTriangle size={15} className="text-amber-700 dark:text-amber-400" />
                        ) : (
                          <ShieldCheck size={15} className="text-emerald-700 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-sans">
                          CNS Readiness
                        </span>
                        <span className={`text-[11px] sm:text-sm font-bold font-sans leading-tight truncate ${
                          sleepHours < 7.0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {sleepHours < 7.0 ? 'Deload Rec.' : 'CNS Optimal'}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Hydration Stats Pill */}
                    <div className="bg-blue-50 dark:bg-[#2f80ed]/10 border border-blue-200 dark:border-[#2f80ed]/20 rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-[#2f80ed]/20 flex-shrink-0">
                        <Droplet size={15} className="text-blue-600 dark:text-blue-400 fill-blue-500/20" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-blue-800 dark:text-blue-300 font-semibold font-sans">
                          Hydration Stats
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-white-adj font-sans leading-tight truncate">
                          {waterIntake >= waterTarget ? 'Goal Achieved' : 'Drink More Water'}
                        </span>
                      </div>
                      <span className="ml-auto text-[9px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 font-sans whitespace-nowrap">
                        {Math.round((waterIntake / waterTarget) * 100)}%
                      </span>
                    </div>

                  </div>
                </div>

              </motion.div>
            </div>

            {/* Apple style page dots indicators */}
            <div className="flex justify-center gap-1.5 mt-2">
              <button 
                onClick={() => setActiveTab(0)} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 0 ? 'bg-white w-3' : 'bg-white/20'}`}
                title="Overview"
              />
              <button 
                onClick={() => setActiveTab(1)} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 1 ? 'bg-white w-3' : 'bg-white/20'}`}
                title="Wellness"
              />
            </div>

          </motion.div>
          
          {/* Standalone Today's Plan Card (Formal Start Workout Card) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-[#121214] border border-white/5 rounded-[28px] p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
              {/* Header: Circle indicator + TODAY'S PLAN */}
              <div className="flex items-center text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-zinc-600 mr-2 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest font-sans">
                  Today's Plan
                </span>
              </div>

              {/* Title & Focus */}
              <div className="flex flex-col">
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none font-sans">
                  {todayWorkout?.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium tracking-wide mt-1.5 font-sans">
                  Focus: <span className="text-zinc-300 font-semibold">{todayWorkout?.focus}</span>
                </p>
              </div>

              {/* Divider line */}
              <hr className="border-white/5" />

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column: TARGET LIFTED */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-sans">
                    Target Lifted
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-white font-sans">
                    {todayWorkout?.type === 'workout' 
                      ? `${(isImperial ? Math.round(computeTotalTonnage(todayWorkout) * 2.20462) : Math.round(computeTotalTonnage(todayWorkout))).toLocaleString()} ${isImperial ? 'lbs' : 'kg'}`
                      : `0 ${isImperial ? 'lbs' : 'kg'}`}
                  </span>
                </div>

                {/* Right Column: TARGET TO BEAT */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-sans">
                    Target to Beat
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white font-sans truncate leading-tight">
                    {todayWorkout?.type === 'workout' && keyLift 
                      ? keyLift.name.split(' (')[0].split(' or ')[0]
                      : todayWorkout?.type === 'recovery'
                      ? 'Cardio Flush'
                      : 'CNS Recharge'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    {todayWorkout?.type === 'workout'
                      ? prevBestSetString.replace(' (Target)', '')
                      : todayWorkout?.type === 'recovery'
                      ? '30 Mins Walk'
                      : 'Light Stretching'}
                  </span>
                </div>
              </div>

              {/* Description quote */}
              <div className="text-xs text-zinc-400 italic font-light font-sans leading-relaxed mt-1">
                "{todayWorkout?.primaryGoal}"
              </div>

              {/* Start/Share Button */}
              {hasCompletedToday ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (onShareWorkout) onShareWorkout(lastLogged);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 mt-2 font-sans"
                >
                  <Award size={14} /> Share Workout Summary
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onStartWorkout(todayWorkout)}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2 font-sans"
                >
                  <Play size={12} fill="black" /> Start Workout
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Muscle Recovery Heatmap Card */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="glass-panel rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                    BIOPHYSICAL DIAGNOSTIC
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    Muscle Recovery Heatmap
                  </h3>
                </div>
                <span className="text-[8px] font-mono text-zinc-400 bg-white/5 border border-white/5 rounded px-2 py-0.5 uppercase">
                  Decay Engine
                </span>
              </div>

              <div className="flex gap-4 items-center">
                {/* SVG Wireframe Heatmap */}
                <div className="w-1/2 flex justify-center bg-black/25 rounded-2xl p-2 border border-white/5 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-auto max-h-[170px]" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.02))' }}>
                    <style>{`
                      @keyframes cyanPulse {
                        0%, 100% { opacity: 0.85; stroke-width: 1.2px; }
                        50% { opacity: 1.0; stroke-width: 1.6px; }
                      }
                      @keyframes amberPulse {
                        0%, 100% { opacity: 0.6; stroke-width: 1.2px; }
                        50% { opacity: 1.0; stroke-width: 1.8px; }
                      }
                      @keyframes crimsonPulse {
                        0%, 100% { opacity: 0.5; stroke-width: 1.2px; }
                        50% { opacity: 1.0; stroke-width: 2.0px; }
                      }
                      .muscle-cyan {
                        animation: cyanPulse 5s ease-in-out infinite;
                        transition: all 0.3s ease;
                        filter: url(#cyan-glow);
                        will-change: opacity;
                      }
                      .muscle-amber {
                        animation: amberPulse 2.5s ease-in-out infinite;
                        transition: all 0.3s ease;
                        filter: url(#amber-glow);
                        will-change: opacity;
                      }
                      .muscle-crimson {
                        animation: crimsonPulse 1.5s ease-in-out infinite;
                        transition: all 0.3s ease;
                        filter: url(#crimson-glow);
                        will-change: opacity;
                      }
                    `}</style>
                    <defs>
                      <filter id="cyan-glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      <filter id="amber-glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      <filter id="crimson-glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>

                    {/* Left Side: FRONT VIEW */}
                    <g transform="translate(-10, 0)">
                      <text x="30" y="8" fill="#71717a" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">FRONT</text>
                      
                      {/* Head */}
                      <circle cx="30" cy="18" r="4" fill="none" stroke="#3f3f46" strokeWidth="1" />
                      
                      {/* Shoulders */}
                      <ellipse cx="20" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} className={`${getMuscleClass('Shoulders')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Shoulders')} />
                      <ellipse cx="40" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} className={`${getMuscleClass('Shoulders')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Shoulders')} />
                      
                      {/* Chest */}
                      <path d="M 23 26 L 37 26 L 37 34 L 30 37 L 23 34 Z" fill="none" stroke={getMuscleColor('Chest')} strokeWidth="1.2" filter={`url(#${getGlowId('Chest')})`} className={`${getMuscleClass('Chest')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Chest')} />
                      
                      {/* Abs (Core) */}
                      <rect x="25" y="36" width="10" height="15" fill="none" stroke={getMuscleColor('Core')} strokeWidth="1.2" filter={`url(#${getGlowId('Core')})`} className={`${getMuscleClass('Core')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Core')} />
                      
                      {/* Arms */}
                      <rect x="15" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} className={`${getMuscleClass('Arms')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Arms')} />
                      <rect x="41.5" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} className={`${getMuscleClass('Arms')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Arms')} />
                      
                      {/* Quads */}
                      <rect x="22" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Quads')} strokeWidth="1.2" filter={`url(#${getGlowId('Quads')})`} className={`${getMuscleClass('Quads')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Quads')} />
                      <rect x="32" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Quads')} strokeWidth="1.2" filter={`url(#${getGlowId('Quads')})`} className={`${getMuscleClass('Quads')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Quads')} />
                    </g>

                    {/* Right Side: BACK VIEW */}
                    <g transform="translate(30, 0)">
                      <text x="30" y="8" fill="#71717a" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">BACK</text>
                      
                      {/* Head */}
                      <circle cx="30" cy="18" r="4" fill="none" stroke="#3f3f46" strokeWidth="1" />
                      
                      {/* Shoulders */}
                      <ellipse cx="20" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} className={`${getMuscleClass('Shoulders')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Shoulders')} />
                      <ellipse cx="40" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} className={`${getMuscleClass('Shoulders')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Shoulders')} />
                      
                      {/* Upper/Lower Back */}
                      <path d="M 22 26 L 38 26 L 35 44 L 30 51 L 25 44 Z" fill="none" stroke={getMuscleColor('Back')} strokeWidth="1.2" filter={`url(#${getGlowId('Back')})`} className={`${getMuscleClass('Back')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Back')} />
                      
                      {/* Arms */}
                      <rect x="15" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} className={`${getMuscleClass('Arms')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Arms')} />
                      <rect x="41.5" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} className={`${getMuscleClass('Arms')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Arms')} />
                      
                      {/* Hamstrings / Glutes */}
                      <rect x="22" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Hamstrings')} strokeWidth="1.2" filter={`url(#${getGlowId('Hamstrings')})`} className={`${getMuscleClass('Hamstrings')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Hamstrings')} />
                      <rect x="32" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Hamstrings')} strokeWidth="1.2" filter={`url(#${getGlowId('Hamstrings')})`} className={`${getMuscleClass('Hamstrings')} cursor-pointer hover:opacity-80`} onClick={() => setSelectedMuscle('Hamstrings')} />
                    </g>
                  </svg>
                </div>

                {/* List panel */}
                <div className="w-1/2 flex flex-col gap-1.5">
                  {['Quads', 'Hamstrings', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core'].map(muscle => {
                    const val = recovery[muscle] !== undefined ? recovery[muscle] : 100;
                    let desc = 'Full';
                    let colorClass = 'text-cyan-400';
                    if (val < 40) {
                      desc = 'Deload';
                      colorClass = 'text-red-400';
                    } else if (val < 70) {
                      desc = 'Fatigued';
                      colorClass = 'text-amber-400';
                    }
                    return (
                      <div 
                        key={muscle} 
                        onClick={() => setSelectedMuscle(muscle)}
                        className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1 cursor-pointer hover:bg-white/5 px-1 rounded transition-colors"
                      >
                        <span className="text-zinc-400 font-medium">{muscle}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] uppercase tracking-wider font-semibold ${colorClass} bg-white/[0.02] border border-white/5 rounded px-1`}>
                            {desc}
                          </span>
                          <span className={`font-mono font-bold ${colorClass}`}>
                            {val}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: Schedule Scroll/Grid + Quote */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col gap-6 w-full">
          
          {/* Genesis Split Program Schedule */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Workout Schedule
              </span>
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">
                4-Day Split
              </span>
            </div>

            {/* Scrollable on mobile, stacks cleanly on desktop */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-4 pb-4 md:pb-0 px-1 no-scrollbar scroll-snap-x snap-mandatory md:snap-none">
              {sessions.map((session, index) => {
                const startOfWeek = getStartOfWeek();
                const weeklyLogs = workoutHistory.filter(log => new Date(log.date) >= startOfWeek);
                const isLoggedThisWeek = weeklyLogs.some(log => log.sessionId === session.id);
                const historyItem = weeklyLogs.find(log => log.sessionId === session.id);

                const currentDayOfWeekVal = getDayOfWeekVal(new Date().getDay());
                const targetDayOfWeekVal = index === 5 ? 6 : index + 1; // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat/Sun=6
                const isToday = index === 5 ? (currentDayOfWeekVal === 6 || currentDayOfWeekVal === 7) : (targetDayOfWeekVal === currentDayOfWeekVal);
                const hasPassed = index === 5 ? false : (targetDayOfWeekVal < currentDayOfWeekVal);

                let cardStyle = 'hover:border-white/20 border-white/5';
                if (isLoggedThisWeek) {
                  cardStyle = 'border-emerald-950/20 bg-emerald-950/[0.02] opacity-60';
                } else if (hasPassed) {
                  cardStyle = 'border-red-950/20 bg-red-950/[0.02] opacity-60';
                } else if (isToday) {
                  cardStyle = 'border-blue-500/20 bg-blue-950/5 ring-1 ring-blue-500/10';
                }

                // Safe extraction for workout exercise metrics
                const splitKeyLift = session.type === 'workout' ? (session.exercises.find(e => e.keyMovement) || session.exercises[0]) : null;
                const splitGhostBest = splitKeyLift ? splitKeyLift.ghostSets[0] : null;

                let isDecayed = false;
                let decayedMuscleName = '';
                if (session.type === 'workout' && session.exercises) {
                  session.exercises.forEach(ex => {
                    const targets = exerciseTargets[ex.id];
                    if (targets) {
                      Object.keys(targets).forEach(muscle => {
                        const mScore = recovery[muscle] !== undefined ? recovery[muscle] : 100;
                        if (mScore < 40) {
                          isDecayed = true;
                          decayedMuscleName = muscle;
                        }
                      });
                    }
                  });
                }

                return (
                  <motion.div
                    key={session.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (isLoggedThisWeek) {
                        if (onShareWorkout) {
                          if (historyItem) {
                            onShareWorkout(historyItem);
                          } else {
                            // Fallback summary template if real history item is not found
                            onShareWorkout({
                              sessionId: session.id,
                              sessionTitle: session.title,
                              sessionFocus: session.focus,
                              date: new Date().toISOString(),
                              actualTonnage: session.totalTonnage || 0,
                              logs: session.exercises ? session.exercises.reduce((acc: any, ex: any) => {
                                acc[ex.id] = ex.ghostSets.map((gs: any, sIdx: number) => ({
                                  setNumber: sIdx + 1,
                                  weight: gs.weight,
                                  reps: gs.reps,
                                  rpe: gs.rpe
                                }));
                                return acc;
                              }, {}) : {},
                              cardioDetails: session.type === 'workout' ? {
                                duration: 30,
                                distance: isImperial ? 2.0 : 3.2,
                                calories: 250,
                                speed: isImperial ? 4.0 : 6.4,
                                incline: 5,
                                units: isImperial ? 'imperial' : 'metric'
                              } : undefined,
                              recoveryDetails: session.type === 'recovery' ? {
                                activity: 'Walking',
                                duration: 30,
                                recoveryRate: 8,
                                distance: isImperial ? 2.0 : 3.2,
                                calories: 200,
                                avgSpeed: isImperial ? 4.0 : 6.4
                              } : undefined
                            });
                          }
                        }
                      } else {
                        onStartWorkout(session);
                      }
                    }}
                    className={`flex-none w-[260px] md:w-full snap-start glass-panel rounded-2xl p-5 cursor-pointer select-none transition-all duration-300 ${cardStyle}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                          Day {index + 1}
                        </span>
                        {isLoggedThisWeek ? (
                          <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide">
                            Done
                          </span>
                        ) : hasPassed ? (
                          <span className="text-[8px] bg-red-950 text-red-400 border border-red-900 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide">
                            Missed
                          </span>
                        ) : isToday ? (
                          <span className="text-[8px] bg-blue-950 text-blue-400 border border-blue-900 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide">
                            Today
                          </span>
                        ) : (
                          <span className="text-[8px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide">
                            Pending
                          </span>
                        )}
                        {isDecayed && !isLoggedThisWeek && (
                          <span className="text-[7px] bg-red-950/40 text-red-400 border border-red-900/30 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide flex items-center gap-0.5 animate-pulse">
                            ⚠️ Atrophy Risk ({decayedMuscleName})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-400-adj font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 uppercase">
                        {session.day.slice(0, 3)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white-adj tracking-tight mb-1">
                      {session.title}
                    </h3>
                    <p className="text-xs text-zinc-400-adj font-medium tracking-wide mb-4">
                      {session.focus}
                    </p>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      {session.type === 'workout' && splitGhostBest && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Key Lift Target
                            </span>
                            <span className="text-white-adj font-bold truncate max-w-[140px] tabular-nums">
                              {isImperial ? `${Math.round(splitGhostBest.weight * 2.20462)} lbs` : `${splitGhostBest.weight} kg`} x {splitGhostBest.reps}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Target Lifts
                            </span>
                            <span className="text-white-adj font-bold tabular-nums">
                              {(isImperial ? Math.round(computeTotalTonnage(session) * 2.20462) : Math.round(computeTotalTonnage(session))).toLocaleString()} {isImperial ? 'lbs' : 'kg'}
                            </span>
                          </div>
                        </>
                      )}

                      {session.type === 'recovery' && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Activity
                            </span>
                            <span className="text-cyan-400 font-bold uppercase tracking-wider">
                              Cardio Walk
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Target Time
                            </span>
                            <span className="text-white-adj font-bold">
                              20-30 mins
                            </span>
                          </div>
                        </>
                      )}

                      {session.type === 'rest' && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Recovery State
                            </span>
                            <span className="text-emerald-400 font-bold uppercase tracking-wider">
                              Full Rest
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500-adj uppercase font-medium tracking-wider">
                              Recommendation
                            </span>
                            <span className="text-white-adj font-bold">
                              Light stretching
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Edit Program / Split Button */}
          {onEditProgram && (
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.99 }}
              onClick={onEditProgram}
              className="w-full py-3.5 border border-white/10 hover:border-white/20 bg-white/5 rounded-2xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm font-mono"
            >
              Edit Workout Split
            </motion.button>
          )}

          {/* Philosophy Quote */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.02)' }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCycleQuote}
            className="text-center py-6 px-8 border border-white/5 bg-white/[0.01] rounded-2xl cursor-pointer select-none relative group transition-all w-full"
            title="Tap to cycle motivation"
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 group-hover:text-zinc-400 transition-colors">
              Daily Motivation
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed font-light transition-all duration-300">
              "{MOTIVATIONAL_QUOTES[quoteIdx]}"
            </p>
            <span className="absolute bottom-2 right-4 text-[7px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity font-mono uppercase tracking-wider">
              Tap to Cycle
            </span>
          </motion.div>

        </div>
      </div>

      {/* Sticky Collapsed Header - Always mounted to avoid flash, animates opacity and scale/y offset */}
      <motion.div
        initial={false}
        animate={{
          y: scrolled ? 0 : -8,
          opacity: scrolled ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-40 bg-[#020202]/90 backdrop-blur-md border-b border-white/5 py-3.5 px-4"
        style={{ pointerEvents: scrolled ? 'auto' : 'none' }}
      >
        <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/Frame 166.png"
              alt="FORMA Logo"
              width={120}
              height={28}
              priority
              style={{ height: 'auto' }}
              className="h-5 md:h-6 w-auto object-contain"
            />
            <span className="text-[10px] text-zinc-500 font-mono border-l border-white/10 pl-2">
              {todayWorkout?.title}
            </span>
          </div>
          {onEditProgram && (
            <button
              onClick={onEditProgram}
              className="px-2.5 py-1 rounded text-[8px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
            >
              Edit Split
            </button>
          )}
        </div>
      </motion.div>

      {/* Anatomical Muscle Recovery Drawer */}
      <AnimatePresence>
        {selectedMuscle && (
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedMuscle(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel border-white/10 bg-obsidian rounded-t-[32px] p-6 w-full max-w-md shadow-2xl relative"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">{selectedMuscle} Status</h3>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 border rounded uppercase ${
                  (recovery[selectedMuscle] !== undefined ? recovery[selectedMuscle] : 100) >= 70 
                    ? 'text-cyan-400 border-cyan-950 bg-cyan-950/20' 
                    : (recovery[selectedMuscle] !== undefined ? recovery[selectedMuscle] : 100) >= 40 
                    ? 'text-amber-400 border-amber-950 bg-amber-950/20' 
                    : 'text-red-400 border-red-950 bg-red-950/20'
                }`}>
                  {recovery[selectedMuscle] !== undefined ? recovery[selectedMuscle] : 100}% Recovered
                </span>
              </div>
              
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-6 font-light">
                {(() => {
                  const score = recovery[selectedMuscle] !== undefined ? recovery[selectedMuscle] : 100;
                  if (score >= 70) return 'CNS state is optimal. This muscle group is fully recovered, glycogen stores are restored, and it is ready for high-intensity progressive overloading.';
                  if (score >= 40) return 'Moderate muscle fatigue is present. Standard hypertrophy weights are acceptable, but you should avoid hitting absolute failure and ensure strict control.';
                  return 'Under-recovered muscle tissue. Atrophy indicators are active. Deload weights by 10% or apply passive rest to prevent chronic tissue damage.';
                })()}
              </p>

              {/* History list for this muscle */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold block mb-1">
                  Fatigue History (Last 3 Workouts)
                </span>
                {(() => {
                  const logsWithThisMuscle = workoutHistory.filter(log => {
                    if (!log.logs) return false;
                    return Object.keys(log.logs).some(exId => {
                      const targets = exerciseTargets[exId];
                      return targets && targets[selectedMuscle] !== undefined;
                    });
                  }).slice(0, 3);

                  if (logsWithThisMuscle.length === 0) {
                    return <p className="text-[10px] text-zinc-600 italic py-2">No recent training stimulus found in database ledger.</p>;
                  }

                  return logsWithThisMuscle.map((log, idx) => {
                    const exercises = Object.keys(log.logs).filter(exId => {
                      const targets = exerciseTargets[exId];
                      return targets && targets[selectedMuscle] !== undefined;
                    }).map(exId => exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

                    return (
                      <div key={idx} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2">
                        <div>
                          <span className="text-zinc-300 font-medium block">{exercises.join(', ')}</span>
                          <span className="text-zinc-600 font-mono text-[8px] block mt-0.5">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <span className="text-white font-mono font-bold bg-white/5 border border-white/5 rounded px-2 py-0.5">
                          {log.actualTonnage > 0 ? `${(log.actualTonnage / 1000).toFixed(1)}t vol` : 'Recovery'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setSelectedMuscle(null)}
                className="w-full mt-6 py-3.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                Close Drawer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Sleep Modal */}
      <AnimatePresence>
        {isSleepModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSleepModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-[28px] p-6 relative overflow-hidden flex flex-col gap-5 shadow-2xl font-sans"
            >
              {/* Decorative grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              
              <div className="text-center relative z-10">
                <span className="text-[9px] uppercase tracking-[0.3em] font-extrabold text-zinc-500 block mb-1">
                  Biophysical Log
                </span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  Sleep Duration
                </h2>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[240px] mx-auto leading-normal">
                  Log your hours slept last night to calibrate CNS readiness recommendations.
                </p>
              </div>

              {/* Slider panel */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative z-10">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase">
                  <span>Logged Hours</span>
                  <span className="text-lg font-extrabold text-white font-mono">
                    {Math.floor(sleepHours)}h {Math.round((sleepHours - Math.floor(sleepHours)) * 60) > 0 ? `${Math.round((sleepHours - Math.floor(sleepHours)) * 60)}m` : '00m'}
                  </span>
                </div>

                <input
                  type="range"
                  min="4"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSleepHours(val);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('forma_sleep_hours', val.toFixed(1));
                    }
                  }}
                  className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                />

                <div className="flex justify-between text-[9px] text-zinc-500 font-semibold font-mono">
                  <span>4.0h</span>
                  <span>8.0h (Recommended)</span>
                  <span>12.0h</span>
                </div>
              </div>

              {/* Recommendation Feedback */}
              <div className={`glass-panel border rounded-xl p-4 flex items-start gap-3 relative z-10 transition-all duration-300 ${
                sleepHours < 7.0 
                  ? 'bg-amber-950/20 border-amber-900/30' 
                  : 'bg-emerald-950/20 border-emerald-900/30'
              }`}>
                <div className="mt-0.5">
                  {sleepHours < 7.0 ? (
                    <AlertTriangle className="text-amber-400" size={18} />
                  ) : (
                    <ShieldCheck className="text-emerald-400" size={18} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      sleepHours < 7.0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {sleepHours < 7.0 ? 'Deload Recommended' : 'Optimal CNS State'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-light">
                    {sleepHours < 7.0 
                      ? 'CNS fatigue warning: target weights reduced by 15% recommended.' 
                      : 'Green light to push for a new record!'}
                  </p>
                </div>
              </div>

              {/* Close/Save CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSleepModalOpen(false)}
                className="w-full bg-white text-black font-semibold text-xs uppercase py-3.5 rounded-xl flex items-center justify-center cursor-pointer shadow-lg active-glow relative z-10"
              >
                Confirm & Apply
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
