'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WorkoutSession } from '@/constants/workout';
import { Play, Flame, Award, Dumbbell, Calendar, CheckSquare } from 'lucide-react';
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
  // Otherwise, show the next scheduled session.
  const todayWorkoutIndex = hasCompletedToday
    ? sessions.findIndex(s => s.id === lastLogged.sessionId)
    : (workoutHistory.length % sessions.length);

  const todaySessionIndex = todayWorkoutIndex !== -1 ? todayWorkoutIndex : (workoutHistory.length % sessions.length);
  const todayWorkout = sessions[todaySessionIndex]; 
  
  const keyLift = todayWorkout.exercises && todayWorkout.exercises.length > 0
    ? (todayWorkout.exercises.find(e => e.keyMovement) || todayWorkout.exercises[0])
    : null;
  const ghostBest = keyLift ? keyLift.ghostSets[0] : null;

  // Calculate workouts completed in the last 7 days for progress stats
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const completedThisWeek = workoutHistory.filter(log => new Date(log.date) >= oneWeekAgo).length;
  const weeklyTarget = sessions.length; // 4-day split target
  const weeklyProgressPercent = Math.min(100, (completedThisWeek / weeklyTarget) * 100);

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
      className="pb-36 pt-6 px-4 max-w-md mx-auto flex flex-col gap-6"
    >
      {/* Brand Header Logo */}
      <div className="flex flex-col items-center justify-center py-4">
        <Image
          src="/Frame 166.png"
          alt="FORMA Logo"
          width={180}
          height={40}
          priority
          style={{ height: 'auto' }}
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Weekly Progress Tracker Banner */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Weekly Target
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Completed {completedThisWeek} of {weeklyTarget} sessions
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5 w-24">
            <span className="text-[10px] font-mono text-white font-bold">{Math.round(weeklyProgressPercent)}%</span>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyProgressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* The Morning Brief (Horizon Card) */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="glass-panel glass-panel-glow rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <span className={`h-1.5 w-1.5 rounded-full animate-ping ${hasCompletedToday ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
            <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              {hasCompletedToday ? 'Workout Logged' : "Today's Plan"}
            </span>
          </div>

          <div className="mb-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
              {todayWorkout.title}
            </h2>
            <p className="text-xs text-zinc-400 font-medium tracking-wide">
              Focus: <span className="text-white">{todayWorkout.focus}</span>
            </p>
          </div>

          {hasCompletedToday ? (
            <>
              {/* Completed today specs */}
              <div className="grid grid-cols-2 gap-4 py-4 my-2 border-y border-white/5">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Weight Lifted
                  </p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {lastLogged.actualTonnage > 0 
                      ? `${lastLogged.actualTonnage.toLocaleString()} kg` 
                      : lastLogged.recoveryDetails?.distance 
                      ? `${lastLogged.recoveryDetails.distance} ${isImperial ? 'miles' : 'km'}`
                      : 'Logged'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Status
                  </p>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {lastLogged.actualTonnage > 0 ? 'COMPLETED' : 'RECOVERED'}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {new Date(lastLogged.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 mb-5 leading-relaxed font-light">
                Today's workout is complete. Your stats have been saved to your history.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (onShareWorkout) onShareWorkout(lastLogged);
                }}
                className="w-full bg-emerald-500 text-white font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                <Award size={14} /> View Workout Summary
              </motion.button>
            </>
          ) : (
            <>
              {/* Blueprint Specs */}
              <div className="grid grid-cols-2 gap-4 py-4 my-2 border-y border-white/5">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Target Lifted
                  </p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {todayWorkout.totalTonnage > 0 ? `${todayWorkout.totalTonnage.toLocaleString()} kg` : '0 kg'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                    Target to Beat
                  </p>
                  {keyLift && ghostBest ? (
                    <>
                      <p className="text-xs font-bold text-white truncate">
                        {keyLift.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 tabular-nums">
                        {ghostBest.weight}kg x {ghostBest.reps} @ RPE {ghostBest.rpe}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-zinc-400">
                      {todayWorkout.type === 'recovery' ? 'Cardio Walk' : 'Rest Day'}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-500 italic mb-5 leading-relaxed">
                "{todayWorkout.primaryGoal}"
              </p>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartWorkout(todayWorkout)}
                className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow"
              >
                <Play size={14} fill="black" />
                Start Workout
              </motion.button>
            </>
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

      {/* Genesis Split Horizontal Scroll */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Workout Schedule
          </span>
          <span className="text-[9px] text-zinc-500 tabular-nums uppercase">
            4-Day Split
          </span>
        </div>

        {/* Scrollable Container */}
        <div className="flex overflow-x-auto gap-4 pb-4 px-1 no-scrollbar scroll-snap-x snap-mandatory">
          {sessions.map((session, index) => {
            const isCompleted = index < todaySessionIndex || (workoutHistory.length > 0 && index === todaySessionIndex && workoutHistory[0].sessionId === session.id);
            const historyItem = workoutHistory.find(log => log.sessionId === session.id);
            
            // Safe extraction for workout exercise metrics
            const splitKeyLift = session.type === 'workout' ? (session.exercises.find(e => e.keyMovement) || session.exercises[0]) : null;
            const splitGhostBest = splitKeyLift ? splitKeyLift.ghostSets[0] : null;

            return (
              <motion.div
                key={session.id}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isCompleted) {
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
                className={`flex-none w-[260px] snap-start glass-panel rounded-2xl p-5 cursor-pointer select-none transition-all duration-300 ${
                  isCompleted ? 'border-white/5 opacity-60' : 'hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Day {index + 1}
                    </span>
                    {isCompleted && (
                      <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 rounded px-1.5 py-0.2 font-semibold uppercase tracking-wide">
                        Done
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
        className="text-center py-6 px-8 border border-white/5 bg-white/[0.01] rounded-2xl cursor-pointer select-none relative group transition-all"
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
    </motion.div>
  );
}
