'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { TrendingUp, BarChart2, ShieldAlert, ChevronDown, ChevronUp, Share2, Award } from 'lucide-react';
import { ARCHIVE_WEEKLY_AUDIT } from '@/constants/workout';

const formatWorkoutDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

// Scroll Reveal Wrapper Component
function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

// Stats Roll Up Counter Component
interface CountUpProps {
  value: string;
}

function CountUp({ value }: CountUpProps) {
  const isPercent = value.includes('%');
  const isPlus = value.startsWith('+');
  const numericStr = value.replace(/[+%]/g, '');
  const numericVal = parseFloat(numericStr);

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isNaN(numericVal)) {
      setDisplayValue(0);
      return;
    }
    
    let start = 0;
    const end = numericVal;
    const duration = 800; // 0.8s
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      start += increment;
      if (step >= steps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [numericVal]);

  if (isNaN(numericVal)) {
    return <span>{value}</span>;
  }

  const formattedNum = displayValue.toFixed(1);
  return (
    <span>
      {isPlus ? '+' : ''}
      {formattedNum}
      {isPercent ? '%' : ''}
    </span>
  );
}

import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';

interface ArchiveViewProps {
  workoutHistory: any[];
  onShareWorkout?: (session: any) => void;
  units?: 'metric' | 'imperial';
}

export default function ArchiveView({ workoutHistory, onShareWorkout, units = 'metric' }: ArchiveViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'prWall'>('timeline');

  const calculatePersonalRecords = (history: any[]) => {
    const prs: { [exId: string]: any } = {};
    
    history.forEach(log => {
      if (log.logs) {
        Object.keys(log.logs).forEach(exId => {
          const sets = log.logs[exId];
          if (Array.isArray(sets)) {
            sets.forEach((set: any) => {
              const weight = set.weight || 0;
              const reps = set.reps || 0;
              const est1RM = reps > 0 ? weight / (1.0278 - 0.0278 * reps) : 0;
              
              if (!prs[exId]) {
                prs[exId] = {
                  exerciseId: exId,
                  exerciseName: exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  maxWeight: weight,
                  maxWeightDate: log.date,
                  max1RM: est1RM,
                  max1RMDate: log.date
                };
              } else {
                const current = prs[exId];
                if (weight > current.maxWeight) {
                  current.maxWeight = weight;
                  current.maxWeightDate = log.date;
                }
                if (est1RM > current.max1RM) {
                  current.max1RM = est1RM;
                  current.max1RMDate = log.date;
                }
              }
            });
          }
        });
      }
    });
    
    return Object.values(prs).sort((a: any, b: any) => a.exerciseName.localeCompare(b.exerciseName)) as any[];
  };

  const personalRecords = calculatePersonalRecords(workoutHistory);

  const isImperial = units === 'imperial';

  // Lifetime biophysical diagnostics calculations
  let lifetimeTonnage = 0;
  let lifetimeLissMins = 0;
  let weightSessionsCount = 0;
  let recoverySessionsCount = 0;
  let restSessionsCount = 0;
  
  const muscleGroupsVolume: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Quads: 0,
    Hamstrings: 0,
    Core: 0
  };

  const exerciseMuscleMapping: Record<string, string> = {
    'incline-db-press': 'Chest',
    'flat-bench-press': 'Chest',
    'lat-pulldowns': 'Back',
    'seated-cable-rows': 'Back',
    'bent-over-rows': 'Back',
    'face-pulls': 'Shoulders',
    'overhead-press': 'Shoulders',
    'lateral-raises': 'Shoulders',
    'bicep-curls-db': 'Arms',
    'tricep-overhead-extensions': 'Arms',
    'goblet-squat': 'Quads',
    'leg-press': 'Quads',
    'leg-extensions': 'Quads',
    'walking-lunges': 'Quads',
    'romanian-deadlifts': 'Hamstrings',
    'leg-curls': 'Hamstrings',
    'hanging-leg-raises': 'Core',
    'planks': 'Core',
    'weighted-russian-twists': 'Core'
  };

  workoutHistory.forEach(log => {
    lifetimeTonnage += log.actualTonnage || 0;
    
    // LISS cardio walk duration accumulator
    if (log.cardioDetails?.duration) lifetimeLissMins += Number(log.cardioDetails.duration);
    if (log.recoveryDetails?.duration) lifetimeLissMins += Number(log.recoveryDetails.duration);
    if (log.restDetails?.walkLogged) lifetimeLissMins += 30;

    // Workout type ratio
    if (log.actualTonnage > 0) {
      weightSessionsCount++;
    } else if (log.recoveryDetails) {
      recoverySessionsCount++;
    } else if (log.restDetails) {
      restSessionsCount++;
    }

    // Accumulate sets per muscle group
    if (log.logs) {
      Object.keys(log.logs).forEach(exId => {
        const setCount = log.logs[exId]?.length || 0;
        const muscle = exerciseMuscleMapping[exId] || 'Back';
        if (muscleGroupsVolume[muscle] !== undefined) {
          muscleGroupsVolume[muscle] += setCount;
        }
      });
    }
  });

  const totalSetsLogged = Object.values(muscleGroupsVolume).reduce((a, b) => a + b, 0) || 1;

  // Motion values for 3D card tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 20 });

  const layer1TranslateX = useTransform(x, [-0.5, 0.5], [-4, 4]);
  const layer1TranslateY = useTransform(y, [-0.5, 0.5], [-4, 4]);
  const layer2TranslateX = useTransform(x, [-0.5, 0.5], [-9, 9]);
  const layer2TranslateY = useTransform(y, [-0.5, 0.5], [-9, 9]);
  const layer3TranslateX = useTransform(x, [-0.5, 0.5], [-15, 15]);
  const layer3TranslateY = useTransform(y, [-0.5, 0.5], [-15, 15]);

  const [hasOrientation, setHasOrientation] = useState(false);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event;
      if (beta !== null && gamma !== null) {
        setHasOrientation(true);
        const normX = Math.max(-1, Math.min(1, gamma / 15));
        const normY = Math.max(-1, Math.min(1, (beta - 60) / 20));
        x.set(normX);
        y.set(normY);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [x, y]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (hasOrientation) return;
    const element = cardRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const relativeX = (event.clientX - rect.left) / width - 0.5;
    const relativeY = (event.clientY - rect.top) / height - 0.5;
    
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Compile Dynamic Metrics based on real workoutHistory state
  const isHistoryEmpty = workoutHistory.length === 0;

  // 1. Tonnage Progression Calculation
  const totalWorkouts = workoutHistory.length;
  
  // Calculate tonnage statistics
  let strengthGainedText = ARCHIVE_WEEKLY_AUDIT.strengthChange; // default
  let tonnageChangeText = ARCHIVE_WEEKLY_AUDIT.tonnageChange; // default
  let volumeConsistencyText = ARCHIVE_WEEKLY_AUDIT.volumeConsistency;

  if (!isHistoryEmpty) {
    // If we have actual logs, let's display real calculations
    const recentSession = workoutHistory[0];
    const previousSessions = workoutHistory.slice(1);
    
    if (previousSessions.length > 0) {
      const avgPrevTonnage = previousSessions.reduce((acc, s) => acc + s.actualTonnage, 0) / previousSessions.length;
      const tonnagePctDiff = avgPrevTonnage > 0 ? ((recentSession.actualTonnage - avgPrevTonnage) / avgPrevTonnage) * 100 : 0;
      tonnageChangeText = `${tonnagePctDiff >= 0 ? '+' : ''}${tonnagePctDiff.toFixed(1)}%`;
      strengthGainedText = `${tonnagePctDiff >= 0 ? '+' : ''}${(tonnagePctDiff * 1.2).toFixed(1)}%`; // strength proportional scale
    } else {
      tonnageChangeText = 'Locked';
      strengthGainedText = 'Initial';
    }
    
    // Volume Consistency calculation
    let totalLoggedSets = 0;
    let totalTargetSets = 15; // default estimation
    workoutHistory.forEach(log => {
      if (log.logs) {
        Object.keys(log.logs).forEach(exId => {
          totalLoggedSets += log.logs[exId]?.length || 0;
        });
      }
    });
    const computedConsistency = Math.min(100, (totalLoggedSets / (totalTargetSets * totalWorkouts)) * 100);
    volumeConsistencyText = `${computedConsistency.toFixed(1)}%`;
  }

  // 2. Dynamic multi-axis Chart mapping
  const chartData = isHistoryEmpty
    ? ARCHIVE_WEEKLY_AUDIT.recentLogs.map((log, index) => ({
        week: log.week,
        name: `Week ${index + 1} Projected Workout`,
        tonnage: log.tonnage,
        cnsScore: 90 - index * 4,
        strength1RM: 75 + index * 6
      }))
    : workoutHistory.slice(0, 5).reverse().map((log, index) => {
        let max1RM = 0;
        if (log.logs) {
          Object.keys(log.logs).forEach(exId => {
            const sets = log.logs[exId];
            if (Array.isArray(sets)) {
              sets.forEach((set: any) => {
                const est = set.reps > 0 ? set.weight / (1.0278 - 0.0278 * set.reps) : 0;
                if (est > max1RM) max1RM = est;
              });
            }
          });
        }
        return {
          week: log.sessionTitle ? log.sessionTitle.slice(0, 7) + ` ${index + 1}` : `Log ${index + 1}`,
          name: `${log.sessionTitle || 'Session'} (${log.sessionFocus || 'Focus'})`,
          tonnage: log.actualTonnage,
          cnsScore: log.cnsScore || 90,
          strength1RM: max1RM || (log.actualTonnage / 15)
        };
      });

  const maxTonnageVal = Math.max(...chartData.map(d => d.tonnage), 10000);
  const max1RMVal = Math.max(...chartData.map(d => d.strength1RM), 100);

  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
  };

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pb-36 pt-6 px-4 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col gap-6"
    >
      {/* Title */}
      <div className="text-center py-2">
        <h1 className="text-xl font-bold tracking-tight text-white-adj uppercase">
          Workout History
        </h1>
        <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500-adj font-medium">
          Workout History Logs
        </p>
      </div>

      {/* Responsive splits (side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
        
        {/* Left Column: 3D showcase Card & warnings */}
        <div className="flex flex-col gap-6 w-full">
          {/* 3D Depth Card (Main Parallax showcase) */}
          <motion.div
            variants={itemVariants}
            className="w-full flex justify-center"
            style={{ perspective: 1000 }}
          >
            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                rotateX: rotateX,
                rotateY: rotateY,
                transformStyle: 'preserve-3d',
              }}
              className="relative w-full h-[280px] glass-panel rounded-3xl p-6 cursor-grab active:cursor-grabbing select-none overflow-hidden flex flex-col justify-between"
            >
              {/* Layer 1: Ambient Grid Backdrop */}
              <motion.div
                style={{
                  x: layer1TranslateX,
                  y: layer1TranslateY,
                  translateZ: 10,
                }}
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none rounded-3xl"
              />

              {/* Layer 2: Vector Waveform Graph */}
              <motion.div
                style={{
                  x: layer2TranslateX,
                  y: layer2TranslateY,
                  translateZ: 25,
                }}
                className="absolute bottom-1/3 left-6 right-6 h-20 opacity-30 pointer-events-none"
              >
                <svg viewBox="0 0 300 100" className="w-full h-full">
                  <path
                    d="M0,80 Q50,40 100,60 T200,30 T300,15"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  />
                  <circle cx="0" cy="80" r="3" fill="white" />
                  <circle cx="100" cy="60" r="3" fill="white" />
                  <circle cx="200" cy="30" r="3" fill="white" />
                  <circle cx="300" cy="15" r="3" fill="white" />
                </svg>
              </motion.div>

              {/* Card Content Top */}
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
                    WORKOUT SUMMARY
                  </span>
                  <span className="text-[8px] text-zinc-400-adj bg-white/5 border border-foreground/5 rounded-full px-2 py-0.5 uppercase tracking-wider font-mono">
                    {isHistoryEmpty ? 'PROJECTION' : 'LIVE DATA'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white-adj tracking-tight">
                  Workout Progress
                </h2>
                <p className="text-[10px] text-zinc-400-adj">
                  {isHistoryEmpty 
                    ? 'Estimated goals based on your weekly schedule'
                    : 'Real stats from your workout history'
                  }
                </p>
              </div>
 
              {/* Layer 3: High Contrast Stats Overlay */}
              <motion.div
                style={{
                  x: layer3TranslateX,
                  y: layer3TranslateY,
                  translateZ: 50,
                }}
                className="relative z-20 flex items-end justify-between"
              >
                <div>
                  <p className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold mb-1">
                    Estimated Strength
                  </p>
                  <p className="text-4xl font-extrabold text-white-adj tracking-tight tabular-nums">
                    <CountUp value={strengthGainedText} />
                  </p>
                </div>
 
                <div className="text-right">
                  <p className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold mb-1">
                    Workout Consistency
                  </p>
                  <p className="text-xl font-bold text-white-adj tabular-nums">
                    <CountUp value={volumeConsistencyText} />
                  </p>
                </div>
              </motion.div>
 
              <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-semibold">
                  {hasOrientation ? 'Tilt Device Active' : 'Hover Card to Rotate 3D'}
                </span>
              </div>
            </motion.div>
          </motion.div>
 
          {/* Grid of Key Sub-Metrics */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 w-full">
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-[120px]">
              <div className="flex items-center justify-between text-zinc-500-adj">
                <span className="text-[9px] uppercase tracking-wider font-bold">Strength Progress</span>
                <TrendingUp size={16} className="text-white-adj" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white-adj tabular-nums">
                  <CountUp value={strengthGainedText} />
                </h3>
                <p className="text-[10px] text-zinc-500-adj mt-1 font-light leading-snug">
                  Your estimated progress over time
                </p>
              </div>
            </div>
 
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-[120px]">
              <div className="flex items-center justify-between text-zinc-500-adj">
                <span className="text-[9px] uppercase tracking-wider font-bold">Weight Lifted</span>
                <BarChart2 size={16} className="text-white-adj" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white-adj tabular-nums">
                  <CountUp value={tonnageChangeText} />
                </h3>
                <p className="text-[10px] text-zinc-500-adj mt-1 font-light leading-snug">
                  Total weight lifted compared to last week
                </p>
              </div>
            </div>
          </motion.div>

          {/* Muscle Atrophy Warning System */}
          <motion.div variants={itemVariants} className="glass-panel border-amber-950/20 bg-amber-950/5 rounded-2xl p-5 flex items-start gap-4 w-full">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/10 text-amber-500 flex-shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                Training Consistency
              </span>
              <h4 className="text-xs font-semibold text-white mt-1">
                Muscle Retention: OPTIMAL
              </h4>
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-light">
                Your training volume is very consistent. Your muscles are getting the perfect stimulus to grow and stay strong.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Dynamic interactive chart */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative w-full">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                  Interactive Diagnostic Plot
                </span>
                <h3 className="text-xs font-semibold text-white mt-0.5">
                  Strength, Volume & Autonomic Load
                </h3>
              </div>
              <span className="text-[8px] text-zinc-500 bg-white/5 border border-white/5 rounded px-1.5 font-mono font-bold">
                {isHistoryEmpty ? 'PROJECTED' : 'LIVE HISTORY'}
              </span>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-white/20 rounded" />
                <span>Tonnage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-cyan-400" />
                <span className="text-cyan-400">1RM Strength</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400" />
                <span className="text-amber-400">CNS Readiness</span>
              </div>
            </div>

            {/* Tooltip Overlay */}
            <AnimatePresence>
              {activeHoverIdx !== null && (() => {
                const count = chartData.length;
                const spacing = 300 / (count + 1);
                const xVal = 10 + spacing * (activeHoverIdx + 1);
                const leftPercent = (xVal / 320) * 100;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute z-20 glass-panel border-white/10 bg-black/90 rounded-xl p-2.5 shadow-xl pointer-events-none flex flex-col gap-1 min-w-[130px]"
                    style={{
                      left: `${leftPercent}%`,
                      transform: 'translateX(-50%)',
                      top: '20px',
                    }}
                  >
                    <p className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-0.5 text-center">
                      {chartData[activeHoverIdx].week}
                    </p>
                    <div className="flex flex-col gap-0.5 text-[9px] text-zinc-400 font-mono">
                      <div className="flex justify-between gap-3">
                        <span>Volume:</span>
                        <span className="text-white font-bold">{Math.round(chartData[activeHoverIdx].tonnage).toLocaleString()} kg</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Est 1RM:</span>
                        <span className="text-cyan-400 font-bold">{Math.round(chartData[activeHoverIdx].strength1RM)} kg</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>CNS Status:</span>
                        <span className="text-amber-400 font-bold">{Math.round(chartData[activeHoverIdx].cnsScore)}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Chart Canvas drawing area (SVG) */}
            <div className="relative h-44 w-full mt-2">
              <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* SVG definitions for gradient fills */}
                <defs>
                  <linearGradient id="strength-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="cns-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#ffaa00" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid background horizontal lines */}
                <line x1="10" y1="20" x2="310" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="10" y1="50" x2="310" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="10" y1="80" x2="310" y2="80" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="10" y1="95" x2="310" y2="95" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Render bars and lines */}
                {chartData.map((d: any, idx: number) => {
                  const count = chartData.length;
                  const spacing = 300 / (count + 1);
                  const x = 10 + spacing * (idx + 1);

                  const yTonnage = 95 - (d.tonnage / maxTonnageVal) * 70;
                  const y1RM = 95 - (d.strength1RM / max1RMVal) * 70;
                  const yCNS = 95 - (d.cnsScore / 100) * 70;

                  return (
                    <g key={idx}>
                      {/* Tonnage volume bar (gray fills) */}
                      <rect
                        x={x - 8}
                        y={yTonnage}
                        width="16"
                        height={95 - yTonnage}
                        fill="rgba(255,255,255,0.03)"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="0.5"
                        rx="1.5"
                        className="transition-all duration-300"
                      />

                      {/* Scrub helper hover lines and indicator dots */}
                      {activeHoverIdx === idx && (
                        <>
                          <line x1={x} y1="10" x2={x} y2="95" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 2" />
                          <circle cx={x} cy={y1RM} r="3" fill="#00f0ff" stroke="#020202" strokeWidth="1" />
                          <circle cx={x} cy={yCNS} r="3" fill="#ffaa00" stroke="#020202" strokeWidth="1" />
                        </>
                      )}

                      {/* Day Label */}
                      <text x={x} y="108" fill="#71717a" fontSize="7" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                        {d.week.slice(0, 5)}
                      </text>
                    </g>
                  );
                })}

                {/* Draw 1RM Area & Line Path */}
                {chartData.length >= 2 && (() => {
                  const count = chartData.length;
                  const spacing = 300 / (count + 1);
                  let pathStr = "";
                  chartData.forEach((d: any, idx: number) => {
                    const x = 10 + spacing * (idx + 1);
                    const y = 95 - (d.strength1RM / max1RMVal) * 70;
                    pathStr += `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  });

                  const firstX = 10 + spacing;
                  const lastX = 10 + spacing * count;
                  const areaStr = `${pathStr} L ${lastX} 95 L ${firstX} 95 Z`;

                  return (
                    <g>
                      <path d={areaStr} fill="url(#strength-area-gradient)" />
                      <path d={pathStr} fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  );
                })()}

                {/* Draw CNS Readiness Area & Line Path */}
                {chartData.length >= 2 && (() => {
                  const count = chartData.length;
                  const spacing = 300 / (count + 1);
                  let pathStr = "";
                  chartData.forEach((d: any, idx: number) => {
                    const x = 10 + spacing * (idx + 1);
                    const y = 95 - (d.cnsScore / 100) * 70;
                    pathStr += `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  });

                  const firstX = 10 + spacing;
                  const lastX = 10 + spacing * count;
                  const areaStr = `${pathStr} L ${lastX} 95 L ${firstX} 95 Z`;

                  return (
                    <g>
                      <path d={areaStr} fill="url(#cns-area-gradient)" />
                      <path d={pathStr} fill="none" stroke="#ffaa00" strokeWidth="1.2" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  );
                })()}

                {/* Interactive invisible hover rectangles */}
                {chartData.map((d: any, idx: number) => {
                  const count = chartData.length;
                  const spacing = 300 / (count + 1);
                  const x = 10 + spacing * (idx + 1);
                  return (
                    <rect
                      key={`hover-${idx}`}
                      x={x - spacing / 2}
                      y="0"
                      width={spacing}
                      height="115"
                      fill="transparent"
                      className="cursor-crosshair pointer-events-auto"
                      onMouseEnter={() => setActiveHoverIdx(idx)}
                      onTouchStart={() => setActiveHoverIdx(idx)}
                      onMouseLeave={() => setActiveHoverIdx(null)}
                      onTouchEnd={() => setActiveHoverIdx(null)}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="text-center pointer-events-none mt-2">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-semibold">
                Drag or Hover across grid columns to inspect metrics
              </span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Lifetime Biophysical Diagnostics */}
      <motion.div variants={itemVariants} className="w-full flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase px-1">
          Lifetime Biophysical Diagnostics
        </span>
        <div className="glass-panel rounded-3xl p-5 flex flex-col gap-6 w-full">
          
          {/* Top: 2 grid boxes for Lifetime Tonnage and LISS Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Lifetime Tonnage
              </span>
              <p className="text-xl font-extrabold text-white font-mono leading-none">
                {isImperial ? Math.round(lifetimeTonnage * 2.20462).toLocaleString() : Math.round(lifetimeTonnage).toLocaleString()} <span className="text-[10px] font-bold text-zinc-500">{isImperial ? 'lbs' : 'kg'}</span>
              </p>
              <span className="text-[8px] text-zinc-500 mt-1 block">Total Workload Lifted</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                LISS Duration
              </span>
              <p className="text-xl font-extrabold text-cyan-400 font-mono leading-none">
                {lifetimeLissMins} <span className="text-[10px] font-bold text-zinc-500">Mins</span>
              </p>
              <span className="text-[8px] text-zinc-500 mt-1 block">Accumulated Zone 2 Cardio</span>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          {/* Middle: Muscle Group Volume Distribution */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-3 font-mono">
              Volume Distribution (Sets Logged)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.keys(muscleGroupsVolume).map((muscle) => {
                const sets = muscleGroupsVolume[muscle];
                const pct = Math.round((sets / totalSetsLogged) * 100);
                
                return (
                  <div key={muscle} className="flex flex-col gap-1 text-[10px]">
                    <div className="flex justify-between font-medium">
                      <span className="text-white-adj font-semibold">{muscle}</span>
                      <span className="text-zinc-500 font-mono">{sets} sets ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          {/* Bottom: Workout Types Ratio */}
          <div className="flex justify-around items-center py-1 text-center font-mono">
            <div>
              <span className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Weights</span>
              <p className="text-sm font-bold text-white">{weightSessionsCount} sessions</p>
            </div>
            <div className="w-[1px] h-6 bg-white/5" />
            <div>
              <span className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Recovery</span>
              <p className="text-sm font-bold text-cyan-400">{recoverySessionsCount} sessions</p>
            </div>
            <div className="w-[1px] h-6 bg-white/5" />
            <div>
              <span className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Rest</span>
              <p className="text-sm font-bold text-zinc-500">{restSessionsCount} sessions</p>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Timeline of Completed Workout Logs & PR Wall Toggle */}
      {!isHistoryEmpty ? (
        <motion.div variants={itemVariants} className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 px-1">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              {activeSubTab === 'timeline' ? 'Workout Logs' : 'Personal Records Wall'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('timeline')}
                className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeSubTab === 'timeline'
                    ? 'bg-white text-black font-extrabold shadow'
                    : 'text-zinc-500 hover:text-zinc-300-adj'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveSubTab('prWall')}
                className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeSubTab === 'prWall'
                    ? 'bg-white text-black font-extrabold shadow'
                    : 'text-zinc-500 hover:text-zinc-300-adj'
                }`}
              >
                PR Wall
              </button>
            </div>
          </div>

          {activeSubTab === 'timeline' ? (
            <div className="flex flex-col gap-3 w-full">
              {workoutHistory.map((historyItem: any, idx: number) => {
                const uniqueId = `${historyItem.date}-${idx}`;
                const isExpanded = expandedLogId === uniqueId;
                const completedDate = new Date(historyItem.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <ScrollReveal key={uniqueId}>
                    <div className="glass-panel rounded-xl p-4 flex flex-col gap-2 w-full">
                      <div 
                        onClick={() => toggleExpandLog(uniqueId)}
                        className="flex justify-between items-center cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-white-adj uppercase tracking-wide">
                            {historyItem.sessionTitle} &mdash; {historyItem.sessionFocus}
                          </h4>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <span>{completedDate}</span>
                            {historyItem.cardioDetails?.workoutDuration && (
                              <>
                                <span className="text-zinc-700">&bull;</span>
                                <span className="text-zinc-400">
                                  ⏱️ {formatWorkoutDuration(historyItem.cardioDetails.workoutDuration)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono font-bold text-white-adj tabular-nums">
                            {historyItem.actualTonnage.toLocaleString()} kg
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onShareWorkout) {
                                onShareWorkout(historyItem);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white-adj bg-white/5 border border-white/5 transition-colors cursor-pointer"
                            title="Share Workout"
                          >
                            <Share2 size={12} />
                          </button>
                          {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                        </div>
                      </div>

                      {/* Expanded Detail logs showing individual sets */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-2 border-t border-white/5 mt-1"
                          >
                            <table className="w-full text-left text-[10px] text-zinc-400">
                              <thead>
                                <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider">
                                  <th className="py-1">Exercise</th>
                                  <th className="py-1 text-center">Set</th>
                                  <th className="py-1 text-right">Load</th>
                                  <th className="py-1 text-right">Reps</th>
                                  <th className="py-1 text-right">RPE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.keys(historyItem.logs).map((exId) => {
                                  const sets = historyItem.logs[exId];
                                  return sets.map((set: any, setIdx: number) => (
                                    <tr key={`${exId}-${setIdx}`} className="border-b border-white/5 hover:bg-white/[0.01]">
                                      <td 
                                        className={`py-1 text-white-adj truncate max-w-[120px] font-medium ${setIdx === 0 ? 'hover:text-cyan-400 cursor-pointer transition-colors' : ''}`}
                                        onClick={() => {
                                          if (setIdx === 0) {
                                            setSelectedExercise({
                                              id: exId,
                                              name: exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                            });
                                          }
                                        }}
                                      >
                                        {setIdx === 0 ? exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''}
                                      </td>
                                      <td className="py-1 text-center font-mono">{set.setNumber}</td>
                                      <td className="py-1 text-right font-mono text-white-adj tabular-nums">{set.weight} kg</td>
                                      <td className="py-1 text-right font-mono text-white-adj tabular-nums">{set.reps}</td>
                                      <td className="py-1 text-right font-mono text-white-adj tabular-nums">{set.rpe}</td>
                                    </tr>
                                  ));
                                })}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            /* PR Wall View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {personalRecords.length > 0 ? (
                personalRecords.map((pr) => {
                  const displayMaxWeight = units === 'imperial' ? (pr.maxWeight * 2.20462).toFixed(1) : pr.maxWeight.toFixed(1);
                  const displayMax1RM = units === 'imperial' ? (pr.max1RM * 2.20462).toFixed(1) : pr.max1RM.toFixed(1);
                  const unitLabel = units === 'imperial' ? 'lbs' : 'kg';
                  
                  const maxWeightDateStr = new Date(pr.maxWeightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const max1RMDateStr = new Date(pr.max1RMDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <ScrollReveal key={pr.exerciseId}>
                      <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xs font-bold text-white-adj uppercase tracking-wide truncate max-w-[150px] sm:max-w-[180px]">
                            {pr.exerciseName}
                          </h4>
                          <Award size={14} className="text-amber-400 fill-amber-400/10" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                              Absolute Max
                            </span>
                            <span className="text-sm font-bold text-white-adj font-mono">
                              {displayMaxWeight} {unitLabel}
                            </span>
                            <span className="text-[7px] text-zinc-500 mt-0.5 font-mono">
                              {maxWeightDateStr}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-3">
                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                              Est. 1RM Max
                            </span>
                            <span className="text-sm font-bold text-cyan-400 font-mono">
                              {displayMax1RM} {unitLabel}
                            </span>
                            <span className="text-[7px] text-zinc-500 mt-0.5 font-mono">
                              {max1RMDateStr}
                            </span>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 glass-panel rounded-xl py-12 text-center text-zinc-500 italic text-[11px]">
                  No personal records detected. Log workouts with weight and reps to build your PR wall!
                </div>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        /* Skeletons and Empty State Fallback */
        <motion.div variants={itemVariants} className="flex flex-col gap-6 w-full items-center justify-center py-6 text-center">
          {/* Skeletons to mimic the layout cards loading */}
          <div className="w-full flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase text-left px-1">
              Workout Logs (Simulation)
            </span>
            <div className="glass-panel rounded-2xl p-4 w-full flex flex-col gap-3 animate-pulse opacity-50">
              <div className="flex justify-between items-center">
                <div className="h-3 w-32 bg-white/10 rounded animate-shimmer" />
                <div className="h-3 w-16 bg-white/10 rounded animate-shimmer" />
              </div>
              <div className="h-[1px] bg-white/5" />
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-white/10 rounded animate-shimmer" />
                <div className="h-4 w-12 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-4 w-full flex flex-col gap-3 animate-pulse opacity-25">
              <div className="flex justify-between items-center">
                <div className="h-3 w-28 bg-white/10 rounded animate-shimmer" />
                <div className="h-3 w-20 bg-white/10 rounded animate-shimmer" />
              </div>
              <div className="h-[1px] bg-white/5" />
              <div className="flex justify-between items-center">
                <div className="h-4 w-36 bg-white/10 rounded animate-shimmer" />
                <div className="h-4 w-16 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full my-2" />

          {/* Premium Empty State Graphic */}
          <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-3xl bg-white/[0.01] border-white/5 w-full max-w-sm">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-zinc-600 mb-4 stroke-zinc-700 animate-bounce">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M12 8v8M8 12h8" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">
              Ledger is Empty
            </h3>
            <p className="text-[10px] text-zinc-500 max-w-[240px] leading-relaxed mb-4">
              Your workouts, splits, and biometrics history will appear here once you finalize a training session.
            </p>
          </div>
        </motion.div>
      )}

      {/* Exercise History Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <ExerciseHistoryModal
            isOpen={!!selectedExercise}
            onClose={() => setSelectedExercise(null)}
            exerciseId={selectedExercise.id}
            exerciseName={selectedExercise.name}
            workoutHistory={workoutHistory}
            units={units}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
