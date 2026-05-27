'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession } from '@/constants/workout';
import { Play, Flame, Award, Dumbbell, Calendar, Moon, Minus, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { UserProfile } from '@/utils/db';
import Image from 'next/image';

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
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(today.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

const getDayOfWeekVal = (day: number) => {
  return day === 0 ? 7 : day; // Sunday is 7, Monday is 1, ..., Saturday is 6
};

const calculateMuscleRecovery = (workoutHistory: any[]): Record<string, number> => {
  const muscleFatigue: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Quads: 0,
    Hamstrings: 0,
    Core: 0
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

  const decayRates: Record<string, number> = {
    Chest: 0.015,       // ~72h
    Back: 0.015,        // ~72h
    Quads: 0.015,       // ~72h
    Hamstrings: 0.015,  // ~72h
    Shoulders: 0.025,   // ~40h
    Arms: 0.025,        // ~40h
    Core: 0.035         // ~24h
  };

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

    // Accumulate the fatigue from the exercises in this log
    if (log.logs) {
      Object.keys(log.logs).forEach(exId => {
        const setCount = log.logs[exId]?.length || 0;
        const targets = exerciseTargets[exId];
        if (targets) {
          Object.keys(targets).forEach(muscle => {
            const factor = targets[muscle];
            muscleFatigue[muscle] = Math.min(100, (muscleFatigue[muscle] || 0) + setCount * 15 * factor);
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
    recovery[muscle] = Math.round(100 - muscleFatigue[muscle]);
  });

  return recovery;
};

interface HorizonViewProps {
  sessions: WorkoutSession[];
  workoutHistory: any[];
  onStartWorkout: (session: WorkoutSession) => void;
  onShareWorkout?: (session: any) => void;
  userProfile?: UserProfile;
}

export default function HorizonView({ sessions, workoutHistory, onStartWorkout, onShareWorkout, userProfile }: HorizonViewProps) {
  const [quoteIdx, setQuoteIdx] = React.useState(getDayOfYearIndex());
  const [sleepHours, setSleepHours] = React.useState<number>(8.0);
  const [isSleepModalOpen, setIsSleepModalOpen] = React.useState(false);

  // Sync sleepHours from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forma_sleep_hours');
      if (stored) {
        setSleepHours(parseFloat(stored));
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

  const handleCycleQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const recovery = calculateMuscleRecovery(workoutHistory);

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
      <div className="flex flex-col items-center justify-center py-3">
        <Image
          src="/Frame 166.png"
          alt="FORMA Logo"
          width={120}
          height={28}
          priority
          style={{ height: 'auto' }}
          className="h-7 w-auto object-contain"
        />
      </div>

      {/* Responsive Dashboard Split Grid (stacked on mobile, side-by-side on desktop) */}
      <div className="grid grid-cols-12 gap-6 w-full items-start">
        
        {/* Left Column: Bento Box + Heatmap */}
        <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Dynamic Performance Bento Box Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-12 gap-3 sm:gap-4 w-full">
            
            {/* Left Bento Card: Weekly Progress Circle Map */}
            <div className="col-span-5 bg-[#1c1c1e] rounded-[24px] sm:rounded-[28px] p-3 sm:p-5 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[216px] relative overflow-hidden">
              {/* Circular progress SVG */}
              <div className="relative flex items-center justify-center">
                <svg className="w-full h-auto max-w-[124px] sm:max-w-[150px] aspect-square" viewBox="0 0 128 128">
                  <defs>
                    <path id="top-curve" d="M 20,64 A 44,44 0 0,1 108,64" fill="transparent" />
                    <path id="bottom-curve" d="M 108,64 A 44,44 0 0,1 20,64" fill="transparent" />
                  </defs>
                  {/* Background track */}
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="stroke-zinc-800 fill-transparent"
                    strokeWidth="11"
                  />
                  {/* Progress indicator */}
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="stroke-white fill-transparent"
                    strokeWidth="11"
                    strokeDasharray="339.3"
                    strokeDashoffset={339.3 - (339.3 * weeklyWorkoutProgressPercent) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 64 64)"
                    style={{
                      transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                  {/* Curved Top Text */}
                  <text className="fill-zinc-500 text-[8px] sm:text-[9px] font-bold tracking-[0.15em] uppercase font-sans">
                    <textPath href="#top-curve" startOffset="50%" textAnchor="middle">
                      Weekly Map
                    </textPath>
                  </text>
                  {/* Center Percentage */}
                  <text x="64" y="73" className="fill-white text-2xl sm:text-3xl font-extrabold font-sans tracking-tighter" textAnchor="middle">
                    {weeklyWorkoutProgressPercent}%
                  </text>
                  {/* Curved Bottom Text */}
                  <text className="fill-zinc-500 text-[7px] sm:text-[8px] font-bold tracking-wider uppercase font-sans">
                    <textPath href="#bottom-curve" startOffset="50%" textAnchor="middle">
                      {completedWorkouts} of 4 Days
                    </textPath>
                  </text>
                </svg>
                
                {/* Overlapping Blue Badge */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#2f80ed] text-white rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-extrabold shadow-lg shadow-blue-500/25 w-6 h-6 sm:w-7 sm:h-7 border-2 border-[#1c1c1e]">
                  +{completedWorkouts}
                </div>
              </div>
            </div>

            {/* Right Bento Column: 3 Horizontal Pill Cards */}
            <div className="col-span-7 flex flex-col gap-2.5 sm:gap-3 justify-between">
              
              {/* Card 1: Weekly Incline Walk (Teal Pill) */}
              <div className="bg-[#064e43] rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#042d26] flex-shrink-0">
                  <Flame size={15} className="text-white sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-teal-200/60 font-semibold font-sans">
                    Treadmill Walk
                  </span>
                  <span className="text-[11px] sm:text-sm font-bold text-white font-sans leading-tight truncate">
                    {totalWalkMins} / {treadmillWalkTarget} Mins
                  </span>
                </div>
                <span className="ml-auto text-[9px] sm:text-xs font-bold text-teal-200/80 font-sans whitespace-nowrap">
                  {walkProgressPercent}%
                </span>
              </div>

              {/* Card 2: Today's Target Lift (Grey Pill) */}
              <div className="bg-[#2a2b2d] rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#1e1f21] flex-shrink-0">
                  <Dumbbell size={15} className="text-white sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-sans">
                    Today's Target
                  </span>
                  <span className="text-[11px] sm:text-sm font-bold text-white font-sans leading-tight truncate">
                    {keyLift ? keyLift.name.split(' (')[0].split(' or ')[0] : 'Active Recovery'}
                  </span>
                </div>
                {keyLift && (
                  <span className="ml-auto text-[9px] sm:text-[10px] font-medium text-zinc-300 font-sans bg-white/5 border border-white/10 rounded-lg px-1.5 sm:px-2 py-0.5 whitespace-nowrap truncate max-w-[50px] sm:max-w-none">
                    {prevBestSetString.replace(' (Target)', '')}
                  </span>
                )}
              </div>

              {/* Card 3: Interactive Sleep & Recovery (Purple Pill) */}
              <div 
                onClick={() => setIsSleepModalOpen(true)}
                className="bg-[#5c3b9b] rounded-full p-2 sm:p-2.5 pr-4 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#391e6b] flex-shrink-0">
                  <Moon size={15} className="text-white sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold font-sans">
                    Sleep Duration
                  </span>
                  <span className="text-[11px] sm:text-sm font-bold text-white font-sans leading-tight">
                    {Math.floor(sleepHours)} h {Math.round((sleepHours - Math.floor(sleepHours)) * 60) > 0 ? `${Math.round((sleepHours - Math.floor(sleepHours)) * 60)} m` : '00 m'}
                  </span>
                </div>
                
                {/* Visual indicator that it's clickable/editable */}
                <span className="ml-auto text-[7px] sm:text-[9px] uppercase tracking-wider text-purple-200/40 font-semibold font-sans font-mono border border-white/5 bg-black/10 rounded px-1.5 py-0.5">
                  Log
                </span>
              </div>

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
                      ? `${todayWorkout?.totalTonnage.toLocaleString()} kg`
                      : '0 kg'}
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
                      <ellipse cx="20" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} />
                      <ellipse cx="40" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} />
                      
                      {/* Chest */}
                      <path d="M 23 26 L 37 26 L 37 34 L 30 37 L 23 34 Z" fill="none" stroke={getMuscleColor('Chest')} strokeWidth="1.2" filter={`url(#${getGlowId('Chest')})`} />
                      
                      {/* Abs (Core) */}
                      <rect x="25" y="36" width="10" height="15" fill="none" stroke={getMuscleColor('Core')} strokeWidth="1.2" filter={`url(#${getGlowId('Core')})`} />
                      
                      {/* Arms */}
                      <rect x="15" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} />
                      <rect x="41.5" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} />
                      
                      {/* Quads */}
                      <rect x="22" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Quads')} strokeWidth="1.2" filter={`url(#${getGlowId('Quads')})`} />
                      <rect x="32" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Quads')} strokeWidth="1.2" filter={`url(#${getGlowId('Quads')})`} />
                    </g>

                    {/* Right Side: BACK VIEW */}
                    <g transform="translate(30, 0)">
                      <text x="30" y="8" fill="#71717a" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">BACK</text>
                      
                      {/* Head */}
                      <circle cx="30" cy="18" r="4" fill="none" stroke="#3f3f46" strokeWidth="1" />
                      
                      {/* Shoulders */}
                      <ellipse cx="20" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} />
                      <ellipse cx="40" cy="26" rx="3" ry="2.5" fill="none" stroke={getMuscleColor('Shoulders')} strokeWidth="1.2" filter={`url(#${getGlowId('Shoulders')})`} />
                      
                      {/* Upper/Lower Back */}
                      <path d="M 22 26 L 38 26 L 35 44 L 30 51 L 25 44 Z" fill="none" stroke={getMuscleColor('Back')} strokeWidth="1.2" filter={`url(#${getGlowId('Back')})`} />
                      
                      {/* Arms */}
                      <rect x="15" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} />
                      <rect x="41.5" y="29" width="3.5" height="16" rx="1.5" fill="none" stroke={getMuscleColor('Arms')} strokeWidth="1.2" filter={`url(#${getGlowId('Arms')})`} />
                      
                      {/* Hamstrings / Glutes */}
                      <rect x="22" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Hamstrings')} strokeWidth="1.2" filter={`url(#${getGlowId('Hamstrings')})`} />
                      <rect x="32" y="54" width="6" height="22" rx="2" fill="none" stroke={getMuscleColor('Hamstrings')} strokeWidth="1.2" filter={`url(#${getGlowId('Hamstrings')})`} />
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
                      <div key={muscle} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1">
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
                      <div className="flex items-center gap-1.5">
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
                      </div>
                      <span className="text-[9px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5 uppercase">
                        {session.day.slice(0, 3)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white tracking-tight mb-1">
                      {session.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide mb-4">
                      {session.focus}
                    </p>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      {session.type === 'workout' && splitGhostBest && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Key Lift Target
                            </span>
                            <span className="text-white font-bold truncate max-w-[140px] tabular-nums">
                              {splitGhostBest.weight}kg x {splitGhostBest.reps}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Target Lifts
                            </span>
                            <span className="text-white font-bold tabular-nums">
                              {session.totalTonnage.toLocaleString()} kg
                            </span>
                          </div>
                        </>
                      )}

                      {session.type === 'recovery' && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Activity
                            </span>
                            <span className="text-cyan-400 font-bold uppercase tracking-wider">
                              Cardio Walk
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Target Time
                            </span>
                            <span className="text-white font-bold">
                              20-30 mins
                            </span>
                          </div>
                        </>
                      )}

                      {session.type === 'rest' && (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Recovery State
                            </span>
                            <span className="text-emerald-400 font-bold uppercase tracking-wider">
                              Full Rest
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 uppercase font-medium tracking-wider">
                              Recommendation
                            </span>
                            <span className="text-white font-bold">
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
