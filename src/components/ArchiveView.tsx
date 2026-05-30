'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { TrendingUp, BarChart2, ShieldAlert, ChevronDown, ChevronUp, Share2, Award, Trash2, Dumbbell } from 'lucide-react';
import { ARCHIVE_WEEKLY_AUDIT, computeEstimated1RM, computeTotalTargetSets } from '@/constants/workout';
import { useApp } from '@/context/AppContext';

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

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

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

const resolveExerciseTargets = (exId: string, allSessions: any[]): Record<string, number> => {
  if (exerciseTargets[exId]) return exerciseTargets[exId];
  for (const session of allSessions || []) {
    const ex = session.exercises?.find((e: any) => e.id === exId);
    if (ex) {
      const group = ex.targetGroup.toLowerCase();
      if (group.includes('chest')) return { Chest: 1.0 };
      if (group.includes('lat') || group.includes('back') || group.includes('rhomboid')) return { Back: 1.0 };
      if (group.includes('shoulder') || group.includes('delt')) return { Shoulders: 1.0 };
      if (group.includes('bicep') || group.includes('tricep') || group.includes('arm')) return { Arms: 1.0 };
      if (group.includes('quad')) return { Quads: 1.0 };
      if (group.includes('hamstring') || group.includes('glute')) return { Hamstrings: 0.7, Quads: 0.3 };
      if (group.includes('core') || group.includes('ab') || group.includes('oblique')) return { Core: 1.0 };
      break;
    }
  }
  return { Back: 1.0 }; // fallback
};

interface MuscleAudit {
  [muscle: string]: number;
}

interface PeriodReport {
  periodKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
  workouts: any[];
  tonnage: number;
  prevTonnageChange: string;
  consistencyScore: number;
  muscleAudit: MuscleAudit;
  avgCnsScore: number;
  workoutCount: number;
  recoveryCount: number;
  restCount: number;
}

const getWeeklyReports = (history: any[], allSessions: any[], isImperial: boolean) => {
  if (history.length === 0) return [];
  
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weeklyGroups: { [key: string]: any[] } = {};
  
  sortedHistory.forEach(log => {
    const d = new Date(log.date);
    const mon = getMonday(d);
    const key = mon.toISOString().slice(0, 10);
    if (!weeklyGroups[key]) {
      weeklyGroups[key] = [];
    }
    weeklyGroups[key].push(log);
  });
  
  const sortedWeekKeys = Object.keys(weeklyGroups).sort();
  const reports: PeriodReport[] = [];
  
  sortedWeekKeys.forEach((key, index) => {
    const workouts = weeklyGroups[key];
    const monDate = new Date(key);
    const sunDate = new Date(monDate);
    sunDate.setDate(sunDate.getDate() + 6);
    sunDate.setHours(23, 59, 59, 999);
    
    const label = `${monDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    const tonnage = workouts.reduce((acc, w) => acc + (w.actualTonnage || 0), 0);
    
    let prevTonnageChange = 'N/A';
    if (index > 0) {
      const prevReport = reports[index - 1];
      if (prevReport.tonnage > 0) {
        const pct = ((tonnage - prevReport.tonnage) / prevReport.tonnage) * 100;
        prevTonnageChange = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      } else if (tonnage > 0) {
        prevTonnageChange = '+100%';
      } else {
        prevTonnageChange = '0.0%';
      }
    }
    
    let loggedSets = 0;
    let targetSets = 0;
    let workoutCount = 0;
    let recoveryCount = 0;
    let restCount = 0;
    let cnsSum = 0;
    let cnsCount = 0;
    
    const muscleAudit: MuscleAudit = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Arms: 0,
      Quads: 0,
      Hamstrings: 0,
      Core: 0
    };
    
    workouts.forEach(log => {
      if (log.actualTonnage > 0) {
        workoutCount++;
      } else if (log.recoveryDetails) {
        recoveryCount++;
      } else if (log.restDetails) {
        restCount++;
      }
      
      if (log.cnsScore !== undefined) {
        cnsSum += log.cnsScore;
        cnsCount++;
      }
      
      if (log.logs && log.actualTonnage > 0) {
        Object.keys(log.logs).forEach(exId => {
          const sets = log.logs[exId] || [];
          const workingSets = sets.filter((s: any) => !s.isWarmup);
          loggedSets += workingSets.length;
          
          const targets = resolveExerciseTargets(exId, allSessions);
          Object.keys(targets).forEach(muscle => {
            const contribution = workingSets.length * targets[muscle];
            if (muscleAudit[muscle] !== undefined) {
              muscleAudit[muscle] += contribution;
            }
          });
        });
        
        const sessionDef = allSessions?.find((s: any) => s.id === log.sessionId);
        if (sessionDef) {
          targetSets += computeTotalTargetSets(sessionDef);
        } else {
          targetSets += 15;
        }
      }
    });
    
    const consistencyScore = targetSets > 0 ? Math.min(100, (loggedSets / targetSets) * 100) : 0;
    const avgCnsScore = cnsCount > 0 ? Math.round(cnsSum / cnsCount) : 0;
    
    reports.push({
      periodKey: key,
      label,
      startDate: monDate,
      endDate: sunDate,
      workouts,
      tonnage,
      prevTonnageChange,
      consistencyScore,
      muscleAudit,
      avgCnsScore,
      workoutCount,
      recoveryCount,
      restCount
    });
  });
  
  return reports;
};

const getMonthlyReports = (history: any[], allSessions: any[], isImperial: boolean) => {
  if (history.length === 0) return [];
  
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const monthlyGroups: { [key: string]: any[] } = {};
  
  sortedHistory.forEach(log => {
    const d = new Date(log.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = [];
    }
    monthlyGroups[key].push(log);
  });
  
  const sortedMonthKeys = Object.keys(monthlyGroups).sort();
  const reports: PeriodReport[] = [];
  
  sortedMonthKeys.forEach((key, index) => {
    const workouts = monthlyGroups[key];
    const [year, month] = key.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const label = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const tonnage = workouts.reduce((acc, w) => acc + (w.actualTonnage || 0), 0);
    
    let prevTonnageChange = 'N/A';
    if (index > 0) {
      const prevReport = reports[index - 1];
      if (prevReport.tonnage > 0) {
        const pct = ((tonnage - prevReport.tonnage) / prevReport.tonnage) * 100;
        prevTonnageChange = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      } else if (tonnage > 0) {
        prevTonnageChange = '+100%';
      } else {
        prevTonnageChange = '0.0%';
      }
    }
    
    let loggedSets = 0;
    let targetSets = 0;
    let workoutCount = 0;
    let recoveryCount = 0;
    let restCount = 0;
    let cnsSum = 0;
    let cnsCount = 0;
    
    const muscleAudit: MuscleAudit = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Arms: 0,
      Quads: 0,
      Hamstrings: 0,
      Core: 0
    };
    
    workouts.forEach(log => {
      if (log.actualTonnage > 0) {
        workoutCount++;
      } else if (log.recoveryDetails) {
        recoveryCount++;
      } else if (log.restDetails) {
        restCount++;
      }
      
      if (log.cnsScore !== undefined) {
        cnsSum += log.cnsScore;
        cnsCount++;
      }
      
      if (log.logs && log.actualTonnage > 0) {
        Object.keys(log.logs).forEach(exId => {
          const sets = log.logs[exId] || [];
          const workingSets = sets.filter((s: any) => !s.isWarmup);
          loggedSets += workingSets.length;
          
          const targets = resolveExerciseTargets(exId, allSessions);
          Object.keys(targets).forEach(muscle => {
            const contribution = workingSets.length * targets[muscle];
            if (muscleAudit[muscle] !== undefined) {
              muscleAudit[muscle] += contribution;
            }
          });
        });
        
        const sessionDef = allSessions?.find((s: any) => s.id === log.sessionId);
        if (sessionDef) {
          targetSets += computeTotalTargetSets(sessionDef);
        } else {
          targetSets += 15;
        }
      }
    });
    
    const consistencyScore = targetSets > 0 ? Math.min(100, (loggedSets / targetSets) * 100) : 0;
    const avgCnsScore = cnsCount > 0 ? Math.round(cnsSum / cnsCount) : 0;
    
    reports.push({
      periodKey: key,
      label,
      startDate,
      endDate,
      workouts,
      tonnage,
      prevTonnageChange,
      consistencyScore,
      muscleAudit,
      avgCnsScore,
      workoutCount,
      recoveryCount,
      restCount
    });
  });
  
  return reports;
};

interface ArchiveViewProps {
  workoutHistory: any[];
  onShareWorkout?: (session: any) => void;
  units?: 'metric' | 'imperial';
}

export default function ArchiveView({ workoutHistory, onShareWorkout, units = 'metric' }: ArchiveViewProps) {
  const { sessions: allSessions, deleteWorkout, showToast, setActiveTab } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'prWall'>('timeline');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    date: string;
    sessionId: string;
    id?: string;
    name: string;
    dateStr: string;
  } | null>(null);
  const [chartRange, setChartRange] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const [activeDurationHoverIdx, setActiveDurationHoverIdx] = useState<number | null>(null);
  const [selectedReportIdx, setSelectedReportIdx] = useState(0);
  const [reportMode, setReportMode] = useState<'weekly' | 'monthly'>('weekly');
  const [prSortOption, setPrSortOption] = useState<'name' | 'weight' | 'date'>('name');
  const [prSearchQuery, setPrSearchQuery] = useState('');
  const isImperial = units === 'imperial';

  const calculatePersonalRecords = (history: any[]) => {
    const prs: { [exId: string]: any } = {};
    
    history.forEach(log => {
      if (log.logs) {
        Object.keys(log.logs).forEach(exId => {
          const sets = log.logs[exId];
          if (Array.isArray(sets)) {
            // Calculate total volume for this exercise in this specific workout log
            const sessionVolume = sets.reduce((sum: number, s: any) => sum + (s.isWarmup ? 0 : (s.weight || 0) * (s.reps || 0)), 0);
            
            sets.forEach((set: any) => {
              if (set.isWarmup) return; // ignore warmups in PRs
              const weight = set.weight || 0;
              const reps = set.reps || 0;
              const est1RM = computeEstimated1RM(weight, reps);
              
              if (!prs[exId]) {
                prs[exId] = {
                  exerciseId: exId,
                  exerciseName: exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  maxWeight: weight,
                  maxWeightDate: log.date,
                  max1RM: est1RM,
                  max1RMDate: log.date,
                  maxVolume: sessionVolume,
                  maxVolumeDate: log.date
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
                if (sessionVolume > current.maxVolume) {
                  current.maxVolume = sessionVolume;
                  current.maxVolumeDate = log.date;
                }
              }
            });
          }
        });
      }
    });
    
    return Object.values(prs).filter((pr: any) => pr.maxWeight > 0);
  };

  const personalRecords = React.useMemo(() => {
    const rawPrs = calculatePersonalRecords(workoutHistory);
    let filtered = rawPrs;
    if (prSearchQuery.trim() !== '') {
      const query = prSearchQuery.toLowerCase();
      filtered = filtered.filter(pr => pr.exerciseName.toLowerCase().includes(query));
    }
    
    if (prSortOption === 'name') {
      filtered.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
    } else if (prSortOption === 'weight') {
      filtered.sort((a, b) => b.maxWeight - a.maxWeight);
    } else if (prSortOption === 'date') {
      filtered.sort((a, b) => new Date(b.maxWeightDate).getTime() - new Date(a.maxWeightDate).getTime());
    }
    
    return filtered;
  }, [workoutHistory, prSortOption, prSearchQuery]);

  // Lifetime biophysical diagnostics calculations
  let lifetimeTonnage = 0;
  let lifetimeLissMins = 0;
  let weightSessionsCount = 0;
  let recoverySessionsCount = 0;
  let restSessionsCount = 0;
  let totalSessionSeconds = 0;
  let sessionsWithDurationCount = 0;
  
  const muscleGroupsVolume: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Quads: 0,
    Hamstrings: 0,
    Core: 0
  };

  workoutHistory.forEach(log => {
    lifetimeTonnage += log.actualTonnage || 0;
    
    // LISS cardio walk duration accumulator
    if (log.cardioDetails?.duration) lifetimeLissMins += Number(log.cardioDetails.duration);
    if (log.recoveryDetails?.duration) lifetimeLissMins += Number(log.recoveryDetails.duration);
    if (log.restDetails?.walkLogged) lifetimeLissMins += 30;

    // Accumulate strength session duration
    if (log.cardioDetails?.workoutDuration) {
      totalSessionSeconds += log.cardioDetails.workoutDuration;
      sessionsWithDurationCount++;
    }

    // Workout type ratio
    if (log.actualTonnage > 0) {
      weightSessionsCount++;
    } else if (log.recoveryDetails) {
      recoverySessionsCount++;
    } else if (log.restDetails) {
      restSessionsCount++;
    }

    // Accumulate sets per muscle group (ignoring warmups)
    if (log.logs) {
      Object.keys(log.logs).forEach(exId => {
        const sets = log.logs[exId] || [];
        const workingSets = sets.filter((s: any) => !s.isWarmup);
        const setCount = workingSets.length;
        
        const targets = resolveExerciseTargets(exId, allSessions);
        Object.keys(targets).forEach(muscle => {
          if (muscleGroupsVolume[muscle] !== undefined) {
            muscleGroupsVolume[muscle] += setCount * targets[muscle];
          }
        });
      });
    }
  });

  const avgSessionMins = sessionsWithDurationCount > 0
    ? Math.round(totalSessionSeconds / sessionsWithDurationCount / 60)
    : 0;

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
    // Calculate real strength progress using best 1RM from recent vs previous sessions
    const recentSession = workoutHistory[0];
    const previousSessions = workoutHistory.slice(1);
    
    // Tonnage comparison
    if (previousSessions.length > 0) {
      const avgPrevTonnage = previousSessions.reduce((acc: number, s: any) => acc + s.actualTonnage, 0) / previousSessions.length;
      const tonnagePctDiff = avgPrevTonnage > 0 ? ((recentSession.actualTonnage - avgPrevTonnage) / avgPrevTonnage) * 100 : 0;
      tonnageChangeText = `${tonnagePctDiff >= 0 ? '+' : ''}${tonnagePctDiff.toFixed(1)}%`;
    } else {
      tonnageChangeText = 'Locked';
    }

    // Real strength progress: compare best 1RM per exercise from most recent session vs average best 1RM from previous, then average those percentages
    const recentSessionLogs = recentSession.logs || {};
    const exercisesProgress: number[] = [];

    Object.keys(recentSessionLogs).forEach(exId => {
      const recentSets = recentSessionLogs[exId];
      if (!Array.isArray(recentSets) || recentSets.length === 0) return;

      // Best 1RM in recent session for this exercise (ignoring warmups)
      let recentBest1RM = 0;
      recentSets.forEach((s: any) => {
        if (s.isWarmup) return;
        const est = computeEstimated1RM(s.weight || 0, s.reps || 0);
        if (est > recentBest1RM) recentBest1RM = est;
      });

      if (recentBest1RM === 0) return; // skip bodyweight/invalid

      // Find all previous sessions that logged this exercise
      const prevBests: number[] = [];
      previousSessions.forEach(prevSession => {
        const prevSets = prevSession.logs ? prevSession.logs[exId] : null;
        if (Array.isArray(prevSets) && prevSets.length > 0) {
          let prevBest = 0;
          prevSets.forEach((s: any) => {
            if (s.isWarmup) return;
            const est = computeEstimated1RM(s.weight || 0, s.reps || 0);
            if (est > prevBest) prevBest = est;
          });
          if (prevBest > 0) {
            prevBests.push(prevBest);
          }
        }
      });

      if (prevBests.length > 0) {
        const avgPrevBest1RM = prevBests.reduce((sum, val) => sum + val, 0) / prevBests.length;
        const pctDiff = ((recentBest1RM - avgPrevBest1RM) / avgPrevBest1RM) * 100;
        exercisesProgress.push(pctDiff);
      }
    });

    if (exercisesProgress.length > 0) {
      const avgStrengthPctDiff = exercisesProgress.reduce((sum, val) => sum + val, 0) / exercisesProgress.length;
      strengthGainedText = `${avgStrengthPctDiff >= 0 ? '+' : ''}${avgStrengthPctDiff.toFixed(1)}%`;
    } else {
      strengthGainedText = previousSessions.length > 0 ? '0.0%' : 'Initial';
    }
    
    // Volume Consistency: only count workout-type sessions, compute target sets dynamically (ignoring warmups)
    let totalLoggedSets = 0;
    let totalTargetSets = 0;
    
    workoutHistory.forEach(log => {
      // Only count sessions with actual exercise logs (not recovery/rest)
      if (log.logs && log.actualTonnage > 0) {
        let logSets = 0;
        Object.keys(log.logs).forEach(exId => {
          logSets += log.logs[exId]?.filter((s: any) => !s.isWarmup).length || 0;
        });
        totalLoggedSets += logSets;

        // Find the session definition to get target sets
        const sessionDef = allSessions?.find((s: any) => s.id === log.sessionId);
        if (sessionDef) {
          totalTargetSets += computeTotalTargetSets(sessionDef);
        } else {
          totalTargetSets += 15; // fallback estimate
        }
      }
    });

    const computedConsistency = totalTargetSets > 0 ? Math.min(100, (totalLoggedSets / totalTargetSets) * 100) : 0;
    volumeConsistencyText = `${computedConsistency.toFixed(1)}%`;
  }

  // Get filtered history based on chartRange
  const getFilteredHistoryForChart = () => {
    if (isHistoryEmpty) return [];
    
    const now = new Date();
    let cutoffTime = 0;
    if (chartRange === '1W') {
      cutoffTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (chartRange === '1M') {
      cutoffTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (chartRange === '3M') {
      cutoffTime = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    } else {
      return [...workoutHistory]; // ALL
    }
    
    return workoutHistory.filter(log => new Date(log.date).getTime() >= cutoffTime);
  };

  const filteredHistory = getFilteredHistoryForChart();

  // 2. Dynamic multi-axis Chart mapping
  const chartData = isHistoryEmpty
    ? ARCHIVE_WEEKLY_AUDIT.recentLogs.map((log, index) => ({
        week: log.week,
        name: `Week ${index + 1} Projected Workout`,
        tonnage: log.tonnage,
        cnsScore: 90 - index * 4,
        strength1RM: 75 + index * 6
      }))
    : filteredHistory.slice(0, 10).reverse().map((log, index) => {
        let max1RM = 0;
        if (log.logs) {
          Object.keys(log.logs).forEach(exId => {
            const sets = log.logs[exId];
            if (Array.isArray(sets)) {
              sets.forEach((set: any) => {
                if (set.isWarmup) return; // ignore warmups in chart max 1RM
                const est = computeEstimated1RM(set.weight || 0, set.reps || 0);
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

  // Process workout duration trends
  const durationData = isHistoryEmpty
    ? [
        { label: 'Push', durationMins: 45, efficiency: 80, date: '05-24' },
        { label: 'Pull', durationMins: 52, efficiency: 85, date: '05-25' },
        { label: 'Legs', durationMins: 60, efficiency: 78, date: '05-26' },
        { label: 'Rest', durationMins: 0, efficiency: 0, date: '05-27' },
        { label: 'Push', durationMins: 48, efficiency: 82, date: '05-28' },
        { label: 'Pull', durationMins: 50, efficiency: 84, date: '05-29' },
        { label: 'Legs', durationMins: 65, efficiency: 75, date: '05-30' }
      ]
    : filteredHistory.slice(0, 15).reverse().map((log, index) => {
        let durationMins = 0;
        let setsCount = 0;
        
        // 1. Resolve duration
        if (log.cardioDetails?.workoutDuration) {
          durationMins = Math.round(log.cardioDetails.workoutDuration / 60);
        } else if (log.recoveryDetails?.duration) {
          durationMins = log.recoveryDetails.duration;
        } else if (log.restDetails) {
          durationMins = 0; // rest days don't have duration
        }
        
        // 2. Count working sets
        if (log.logs) {
          Object.keys(log.logs).forEach(exId => {
            const sets = log.logs[exId];
            if (Array.isArray(sets)) {
              sets.forEach((s: any) => {
                if (!s.isWarmup) setsCount++;
              });
            }
          });
        }
        
        // 3. Compute efficiency: (working sets * 45 seconds of active lifting) / (total duration in seconds)
        // Capped at 95% maximum to keep it realistic. Default to 80% if duration is 0 but sets logged.
        const totalDurationSecs = (log.cardioDetails?.workoutDuration) || (durationMins * 60);
        let efficiency = 0;
        if (totalDurationSecs > 0 && setsCount > 0) {
          efficiency = Math.min(95, Math.round(((setsCount * 45) / totalDurationSecs) * 100));
        } else if (setsCount > 0) {
          efficiency = 80;
        }

        const dateObj = new Date(log.date);
        const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        return {
          label: log.sessionTitle ? log.sessionTitle.slice(0, 8) : 'Session',
          durationMins,
          efficiency,
          date: dateStr
        };
      });

  // Calculate duration summary stats
  const workoutsWithDuration = durationData.filter(d => d.durationMins > 0);
  const totalHoursTrained = workoutsWithDuration.reduce((acc, d) => acc + d.durationMins, 0) / 60;
  const avgWorkoutDuration = workoutsWithDuration.length > 0
    ? workoutsWithDuration.reduce((acc, d) => acc + d.durationMins, 0) / workoutsWithDuration.length
    : 0;
  const avgEfficiency = workoutsWithDuration.length > 0
    ? workoutsWithDuration.reduce((acc, d) => acc + d.efficiency, 0) / workoutsWithDuration.length
    : 0;

  const maxDurationVal = Math.max(...durationData.map(d => d.durationMins), 60);

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

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isHistoryEmpty || chartData.length === 0 || !chartContainerRef.current) return;
    const touch = e.touches[0];
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;
    
    const viewBoxX = (x / width) * 320;
    const count = chartData.length;
    const spacing = 300 / (count + 1);
    
    let closestIdx = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < count; i++) {
      const pointX = 10 + spacing * (i + 1);
      const distance = Math.abs(viewBoxX - pointX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = i;
      }
    }
    
    closestIdx = Math.max(0, Math.min(count - 1, closestIdx));
    setActiveHoverIdx(closestIdx);
  };

  const weeklyReports = getWeeklyReports(workoutHistory, allSessions || [], isImperial);
  const monthlyReports = getMonthlyReports(workoutHistory, allSessions || [], isImperial);
  const activeReports = reportMode === 'weekly' ? weeklyReports : monthlyReports;
  const currentReportIdx = Math.min(selectedReportIdx, Math.max(0, activeReports.length - 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmTarget) {
          setDeleteConfirmTarget(null);
        } else if (selectedExercise) {
          setSelectedExercise(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmTarget, selectedExercise]);

  useEffect(() => {
    if (!deleteConfirmTarget) return;
    
    const handleFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (!modalRef.current) return;
      
      const focusableElements = modalRef.current.querySelectorAll('button');
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll('button');
      if (focusable && focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }, 50);
    
    window.addEventListener('keydown', handleFocus);
    return () => window.removeEventListener('keydown', handleFocus);
  }, [deleteConfirmTarget]);

  if (isHistoryEmpty) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="pb-36 pt-6 px-4 max-w-md mx-auto flex flex-col gap-6 items-center justify-center min-h-[60vh]"
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

        {/* Premium Onboarding Empty State Card */}
        <motion.div
          variants={itemVariants}
          className="relative w-full glass-panel bg-white/[0.01] border-white/5 rounded-3xl p-6 flex flex-col gap-6 items-center text-center shadow-2xl"
        >
          {/* Neon-glowing SVG Illustration */}
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full scale-75" />
            <div className="relative p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Dumbbell size={32} className="animate-pulse" />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Begin Your Fitness Odyssey
            </h2>
            <p className="text-[10px] text-zinc-400 max-w-[280px] leading-relaxed mx-auto">
              Your workouts, splits, and biometrics history will appear here once you finalize a training session. Follow these simple steps to start:
            </p>
          </div>

          {/* Step-by-Step Onboarding Highlights */}
          <div className="w-full flex flex-col gap-3 text-left border-t border-b border-white/5 py-4 my-1">
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-cyan-400 font-mono flex items-center justify-center">
                1
              </span>
              <div>
                <h4 className="text-[10.5px] font-bold text-zinc-200">Configure Your Profile</h4>
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Go to the Profile Settings to set your target weight, goals, and preferred units (metric vs. imperial).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-cyan-400 font-mono flex items-center justify-center">
                2
              </span>
              <div>
                <h4 className="text-[10.5px] font-bold text-zinc-200">Select or Create a Split</h4>
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Visit the main Dashboard to view pre-configured workout splits or build your custom training session.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-cyan-400 font-mono flex items-center justify-center">
                3
              </span>
              <div>
                <h4 className="text-[10.5px] font-bold text-zinc-200">Initiate the Crucible</h4>
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Log your workouts in real time with the warmup tracker, target volume audits, and interactive rest timers.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-cyan-400 font-mono flex items-center justify-center">
                4
              </span>
              <div>
                <h4 className="text-[10.5px] font-bold text-zinc-200">Analyze Your Progress</h4>
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Return here to view dynamic multi-axis plots, personal records, and monthly muscle stimulation audits.
                </p>
              </div>
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={() => setActiveTab('horizon')}
            className="w-full py-3 bg-white text-black hover:bg-zinc-200 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]"
          >
            Start Your First Workout
          </button>
        </motion.div>
      </motion.div>
    );
  }

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

        {/* Right Column: Dynamic interactive chart & Analytical Reports */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-6">
          <div 
            ref={chartContainerRef}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setActiveHoverIdx(null)}
            className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative w-full overflow-hidden"
          >
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
                LIVE HISTORY
              </span>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg w-fit self-end">
              {(['1W', '1M', '3M', 'ALL'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    chartRange === range
                      ? 'bg-white text-black font-extrabold shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {range === '1W' ? '1W' : range === '1M' ? '1M' : range === '3M' ? '3M' : 'ALL'}
                </button>
              ))}
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
              {activeHoverIdx !== null && activeHoverIdx < chartData.length && (() => {
                const count = chartData.length;
                const spacing = 300 / (count + 1);
                const xVal = 10 + spacing * (activeHoverIdx + 1);
                const leftPercent = (xVal / 320) * 100;
                
                const item = chartData[activeHoverIdx];
                const displayTonnage = isImperial ? item.tonnage * 2.20462 : item.tonnage;
                const display1RM = isImperial ? item.strength1RM * 2.20462 : item.strength1RM;
                const unitLabel = isImperial ? 'lbs' : 'kg';

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
                      {item.week}
                    </p>
                    <div className="flex flex-col gap-0.5 text-[9px] text-zinc-400 font-mono">
                      <div className="flex justify-between gap-3">
                        <span>Volume:</span>
                        <span className="text-white font-bold">{Math.round(displayTonnage).toLocaleString()} {unitLabel}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Est 1RM:</span>
                        <span className="text-cyan-400 font-bold">{Math.round(display1RM)} {unitLabel}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>CNS Status:</span>
                        <span className="text-amber-400 font-bold">{Math.round(item.cnsScore)}%</span>
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
                Drag or Touch across grid columns to inspect metrics
              </span>
            </div>
          </div>

          {/* Workout Duration & Volume Efficiency Card */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative w-full overflow-hidden">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                  Workout Duration Trends
                </span>
                <h3 className="text-xs font-semibold text-white mt-0.5">
                  Volume Efficiency & Time Invested
                </h3>
              </div>
              <span className="text-[8px] text-zinc-500 bg-white/5 border border-white/5 rounded px-1.5 font-mono font-bold">
                METRICS
              </span>
            </div>

            {/* Summary Statistics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full bg-white/[0.01] border border-white/5 rounded-xl p-3">
              <div className="flex flex-col">
                <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-bold">Total Time</span>
                <span className="text-sm font-extrabold text-white mt-0.5 tabular-nums">
                  {totalHoursTrained.toFixed(1)} <span className="text-[8px] font-normal text-zinc-500">hrs</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-bold">Avg Length</span>
                <span className="text-sm font-extrabold text-white mt-0.5 tabular-nums">
                  {Math.round(avgWorkoutDuration)} <span className="text-[8px] font-normal text-zinc-500">mins</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-bold">Avg Efficiency</span>
                <span className="text-sm font-extrabold text-cyan-400 mt-0.5 tabular-nums">
                  {Math.round(avgEfficiency)}<span className="text-[8px] font-normal text-cyan-600">%</span>
                </span>
              </div>
            </div>

            {/* Duration Chart SVG */}
            <div className="relative h-28 w-full mt-1">
              {/* Tooltip Overlay */}
              <AnimatePresence>
                {activeDurationHoverIdx !== null && activeDurationHoverIdx < durationData.length && (() => {
                  const count = durationData.length;
                  const spacing = 300 / (count + 1);
                  const xVal = 10 + spacing * (activeDurationHoverIdx + 1);
                  const leftPercent = (xVal / 320) * 100;
                  
                  const item = durationData[activeDurationHoverIdx];

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute z-20 glass-panel border-white/10 bg-black/90 rounded-xl p-2.5 shadow-xl pointer-events-none flex flex-col gap-1 min-w-[120px]"
                      style={{
                        left: `${leftPercent}%`,
                        transform: 'translateX(-50%)',
                        top: '-30px',
                      }}
                    >
                      <p className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-0.5 text-center">
                        {item.date}
                      </p>
                      <div className="flex flex-col gap-0.5 text-[9px] text-zinc-400 font-mono">
                        <div className="flex justify-between gap-3">
                          <span>Length:</span>
                          <span className="text-white font-bold">{item.durationMins} mins</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Efficiency:</span>
                          <span className="text-cyan-400 font-bold">{item.efficiency}%</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <svg viewBox="0 0 320 80" className="w-full h-full overflow-visible">
                {/* Horizontal reference lines */}
                <line x1="10" y1="15" x2="310" y2="15" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="10" y1="40" x2="310" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="10" y1="65" x2="310" y2="65" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Duration Bars */}
                {durationData.map((d: any, idx: number) => {
                  const count = durationData.length;
                  const spacing = 300 / (count + 1);
                  const x = 10 + spacing * (idx + 1);
                  
                  // Height scale (max height is 50px, from y=15 to y=65)
                  const barHeight = d.durationMins > 0 ? (d.durationMins / maxDurationVal) * 50 : 2;
                  const y = 65 - barHeight;

                  // Color based on range
                  let barColor = 'rgba(255,255,255,0.15)'; // Rest/none
                  let barStroke = 'rgba(255,255,255,0.2)';
                  if (d.durationMins > 0) {
                    if (d.durationMins >= 45 && d.durationMins <= 75) {
                      barColor = 'rgba(16, 185, 129, 0.2)'; // Emerald - optimal
                      barStroke = '#10b981';
                    } else if (d.durationMins > 75) {
                      barColor = 'rgba(239, 68, 68, 0.2)'; // Red - high fatigue
                      barStroke = '#ef4444';
                    } else {
                      barColor = 'rgba(6, 182, 212, 0.2)'; // Cyan - short/recovery
                      barStroke = '#06b6d4';
                    }
                  }

                  return (
                    <g key={`dur-${idx}`}>
                      <rect
                        x={x - 6}
                        y={y}
                        width="12"
                        height={barHeight}
                        fill={barColor}
                        stroke={barStroke}
                        strokeWidth="0.75"
                        rx="1"
                      />

                      {/* Dot for efficiency */}
                      {d.durationMins > 0 && (
                        <circle
                          cx={x}
                          cy={65 - (d.efficiency / 100) * 50}
                          r="1.5"
                          fill="#f59e0b"
                        />
                      )}

                      {/* X Axis Label */}
                      <text x={x} y="75" fill="#71717a" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                        {d.date}
                      </text>

                      {/* Interactive Hover Area */}
                      <rect
                        x={x - spacing / 2}
                        y="0"
                        width={spacing}
                        height="80"
                        fill="transparent"
                        className="cursor-crosshair pointer-events-auto"
                        onMouseEnter={() => setActiveDurationHoverIdx(idx)}
                        onTouchStart={() => setActiveDurationHoverIdx(idx)}
                        onMouseLeave={() => setActiveDurationHoverIdx(null)}
                        onTouchEnd={() => setActiveDurationHoverIdx(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div className="flex items-center justify-center gap-4 text-[7px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500/20 border border-emerald-500 rounded-sm" />
                <span>Optimal (45-75m)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cyan-500/20 border border-cyan-500 rounded-sm" />
                <span>Short Lifts (&lt;45m)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500/20 border border-red-500 rounded-sm" />
                <span>Fatigue Risk (&gt;75m)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <span className="text-amber-500">Volume Efficiency</span>
              </div>
            </div>
          </div>

          {/* Analytical Progress Reports Card */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative w-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                  Analytical Progress Reports
                </span>
                <h3 className="text-xs font-semibold text-white mt-0.5">
                  Weekly & Monthly Summaries
                </h3>
              </div>
              
              <div className="flex gap-1.5 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg">
                {(['weekly', 'monthly'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setReportMode(mode);
                      setSelectedReportIdx(0);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      reportMode === mode
                        ? 'bg-white text-black font-extrabold shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {mode === 'weekly' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            {activeReports.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 italic text-[10px]">
                No reports generated yet. Log more workouts!
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-2 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                    Select Period:
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentReportIdx >= activeReports.length - 1}
                      onClick={() => setSelectedReportIdx(prev => prev + 1)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      &larr;
                    </button>
                    
                    <span className="text-[10px] font-bold font-mono text-cyan-400 select-none text-center min-w-[130px]">
                      {activeReports[currentReportIdx].label}
                    </span>
                    
                    <button
                      disabled={currentReportIdx === 0}
                      onClick={() => setSelectedReportIdx(prev => prev - 1)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                {(() => {
                  const r = activeReports[currentReportIdx];
                  const displayTonnage = isImperial ? r.tonnage * 2.20462 : r.tonnage;
                  const unitLabel = isImperial ? 'lbs' : 'kg';
                  
                  return (
                    <div className="flex flex-col gap-4 mt-1">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2 flex flex-col justify-between min-h-[70px]">
                          <span className="text-[7.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            Volume
                          </span>
                          <p className="text-xs font-bold text-white font-mono leading-none">
                            {Math.round(displayTonnage).toLocaleString()} <span className="text-[8px] font-bold text-zinc-500">{unitLabel}</span>
                          </p>
                          <span className={`text-[7px] font-bold font-mono mt-1 block ${r.prevTonnageChange.startsWith('+') ? 'text-emerald-400' : r.prevTonnageChange === 'N/A' || r.prevTonnageChange === '0.0%' ? 'text-zinc-500' : 'text-rose-400'}`}>
                            {r.prevTonnageChange === 'N/A' ? 'Trend N/A' : `${r.prevTonnageChange} vs prev`}
                          </span>
                        </div>

                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2 flex flex-col justify-between min-h-[70px]">
                          <span className="text-[7.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            Consistency
                          </span>
                          <p className="text-xs font-bold text-emerald-400 font-mono leading-none">
                            {r.consistencyScore.toFixed(1)}%
                          </p>
                          <span className="text-[7.5px] text-zinc-500 font-medium mt-1 block">
                            Target Sets Met
                          </span>
                        </div>

                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2 flex flex-col justify-between min-h-[70px]">
                          <span className="text-[7.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            Avg Readiness
                          </span>
                          <p className="text-xs font-bold text-amber-400 font-mono leading-none">
                            {r.avgCnsScore > 0 ? `${r.avgCnsScore}%` : 'N/A'}
                          </p>
                          <span className="text-[7.5px] text-zinc-500 font-medium mt-1 block">
                            CNS Load State
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] font-mono border-t border-b border-white/5 py-2 px-1 text-zinc-400">
                        <span>Workouts: <span className="text-white font-bold">{r.workoutCount}</span></span>
                        <span>Recovery: <span className="text-cyan-400 font-bold">{r.recoveryCount}</span></span>
                        <span>Rest Days: <span className="text-zinc-500 font-bold">{r.restCount}</span></span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[8.5px] uppercase tracking-wider text-zinc-500 font-bold font-mono">
                            Muscle Stimulation Audit (Working Sets)
                          </span>
                          <span className="text-[7px] text-zinc-500 font-mono">
                            Red Dash = Target Volume
                          </span>
                        </div>

                        {/* Interactive SVG Bar Chart */}
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 relative">
                          <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                            <defs>
                              <linearGradient id="muscle-optimal-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                                <stop offset="100%" stopColor="#059669" stopOpacity="0.2"/>
                              </linearGradient>
                              <linearGradient id="muscle-maintenance-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8"/>
                                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2"/>
                              </linearGradient>
                              <linearGradient id="muscle-under-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8"/>
                                <stop offset="100%" stopColor="#d97706" stopOpacity="0.2"/>
                              </linearGradient>
                            </defs>

                            {/* Grid Lines */}
                            <line x1="25" y1="90" x2="310" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            <line x1="25" y1="50" x2="310" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                            <line x1="25" y1="10" x2="310" y2="10" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

                            {(() => {
                              const muscles = ['Chest', 'Back', 'Shoulders', 'Arms', 'Quads', 'Hamstrings', 'Core'];
                              const mult = reportMode === 'weekly' ? 1 : 4;
                              const maxVal = Math.max(...muscles.map(m => r.muscleAudit[m] || 0), 12 * mult);
                              const spacing = (320 - 35) / muscles.length;

                              return muscles.map((muscle, idx) => {
                                const value = r.muscleAudit[muscle] || 0;
                                const target = (muscle === 'Shoulders' ? 8 : ['Arms', 'Core'].includes(muscle) ? 6 : 10) * mult;
                                const pct = value / target;

                                const barWidth = 18;
                                const x = 30 + idx * spacing + (spacing - barWidth) / 2;
                                const barHeight = (value / maxVal) * 80;
                                const y = 90 - barHeight;
                                const targetY = 90 - (target / maxVal) * 80;

                                let gradId = 'muscle-maintenance-grad';
                                if (pct >= 1.0) gradId = 'muscle-optimal-grad';
                                else if (pct < 0.6) gradId = 'muscle-under-grad';

                                const label = muscle === 'Shoulders' ? 'Shld' : muscle === 'Hamstrings' ? 'Hams' : muscle;

                                return (
                                  <g key={muscle}>
                                    {/* Shaded target line for this bar */}
                                    <line 
                                      x1={x - 2} 
                                      y1={targetY} 
                                      x2={x + barWidth + 2} 
                                      y2={targetY} 
                                      stroke="#ef4444" 
                                      strokeWidth="1.2" 
                                      strokeDasharray="1 1"
                                      opacity="0.6"
                                    />
                                    
                                    {/* Volume Bar */}
                                    <rect
                                      x={x}
                                      y={y}
                                      width={barWidth}
                                      height={Math.max(2, barHeight)}
                                      fill={`url(#${gradId})`}
                                      stroke={pct >= 1.0 ? '#10b981' : pct < 0.6 ? '#f59e0b' : '#00f0ff'}
                                      strokeWidth="0.75"
                                      rx="2"
                                    />

                                    {/* Sets Count Text */}
                                    <text 
                                      x={x + barWidth / 2} 
                                      y={y - 4} 
                                      fill="#ffffff" 
                                      fontSize="7" 
                                      textAnchor="middle" 
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                    >
                                      {value % 1 === 0 ? value : value.toFixed(1)}
                                    </text>

                                    {/* Muscle Label */}
                                    <text 
                                      x={x + barWidth / 2} 
                                      y="104" 
                                      fill="#71717a" 
                                      fontSize="7" 
                                      textAnchor="middle" 
                                      fontFamily="sans-serif"
                                      fontWeight="bold"
                                    >
                                      {label}
                                    </text>
                                  </g>
                                );
                              });
                            })()}
                          </svg>
                        </div>

                        {/* Balance Analysis */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-[9px] font-sans text-zinc-400">
                          <span className="text-[7.5px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1 font-mono">
                            Biomechanical Balance Analysis
                          </span>
                          {(() => {
                            const muscles = ['Chest', 'Back', 'Shoulders', 'Arms', 'Quads', 'Hamstrings', 'Core'];
                            const mult = reportMode === 'weekly' ? 1 : 4;
                            const lagging: string[] = [];
                            
                            muscles.forEach(m => {
                              const val = r.muscleAudit[m] || 0;
                              const target = (m === 'Shoulders' ? 8 : ['Arms', 'Core'].includes(m) ? 6 : 10) * mult;
                              if (val < target * 0.6) {
                                lagging.push(m);
                              }
                            });

                            if (lagging.length === 0) {
                              return (
                                <p className="text-emerald-400 font-medium">
                                  ✓ Calibrated Balance: All major muscle groups are meeting target stimulation volume. Hypertrophy architecture is optimal.
                                </p>
                              );
                            }

                            return (
                              <p className="text-zinc-300 leading-normal">
                                <span className="text-amber-500 font-bold">⚠ Volume Deficit:</span> {lagging.join(', ')} {lagging.length === 1 ? 'is' : 'are'} receiving sub-optimal stimulation. Consider adding exercises to your split targeting these groups.
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </motion.div>

      </div>

      {/* Lifetime Biophysical Diagnostics */}
      <motion.div variants={itemVariants} className="w-full flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase px-1">
          Lifetime Biophysical Diagnostics
        </span>
        <div className="glass-panel rounded-3xl p-5 flex flex-col gap-6 w-full">
          
           {/* Top: 3 grid boxes for Lifetime Tonnage, LISS Duration, and Avg Session Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Lifetime Tonnage
              </span>
              <p className="text-base font-extrabold text-white font-mono leading-none">
                {isImperial ? Math.round(lifetimeTonnage * 2.20462).toLocaleString() : Math.round(lifetimeTonnage).toLocaleString()} <span className="text-[9px] font-bold text-zinc-500">{isImperial ? 'lbs' : 'kg'}</span>
              </p>
              <span className="text-[8px] text-zinc-500 mt-1 block leading-tight">Total Workload</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                LISS Duration
              </span>
              <p className="text-base font-extrabold text-cyan-400 font-mono leading-none">
                {lifetimeLissMins} <span className="text-[9px] font-bold text-zinc-500">Mins</span>
              </p>
              <span className="text-[8px] text-zinc-500 mt-1 block leading-tight">Zone 2 Cardio</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Avg Duration
              </span>
              <p className="text-base font-extrabold text-emerald-400 font-mono leading-none">
                {avgSessionMins} <span className="text-[9px] font-bold text-zinc-500">Mins</span>
              </p>
              <span className="text-[8px] text-zinc-500 mt-1 block leading-tight">Strength Session</span>
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
      {/* Timeline of Completed Workout Logs & PR Wall Toggle */}
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
                        {historyItem.tags && historyItem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {historyItem.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[7px] font-extrabold uppercase rounded bg-white/5 border border-white/5 text-zinc-400 font-mono tracking-wider"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono font-bold text-white-adj tabular-nums">
                          {isImperial ? `${Math.round(historyItem.actualTonnage * 2.20462).toLocaleString()} lbs` : `${Math.round(historyItem.actualTonnage).toLocaleString()} kg`}
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
                          {historyItem.notes && (
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 mb-3 text-[10px] text-zinc-300 italic leading-relaxed font-sans">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1 font-mono not-italic">
                                Session Notes:
                              </span>
                              "{historyItem.notes}"
                            </div>
                          )}
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
                                    <td className="py-1 text-center font-mono">
                                      {set.isWarmup ? `W${Math.abs(set.setNumber)}` : set.setNumber}
                                    </td>
                                    <td className="py-1 text-right font-mono text-white-adj tabular-nums font-semibold">
                                      {isImperial ? `${Math.round(set.weight * 2.20462)} lbs` : `${set.weight} kg`}
                                    </td>
                                    <td className="py-1 text-right font-mono text-white-adj tabular-nums">{set.reps}</td>
                                    <td className="py-1 text-right font-mono text-white-adj tabular-nums">{set.isWarmup ? '-' : set.rpe}</td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                          
                          <div className="flex justify-end mt-4 pt-3 border-t border-white/5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmTarget({
                                  date: historyItem.date,
                                  sessionId: historyItem.sessionId,
                                  id: historyItem.id,
                                  name: historyItem.sessionTitle,
                                  dateStr: completedDate
                                });
                              }}
                              className="px-3 py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-[9px] font-bold uppercase tracking-wider rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 size={10} /> Delete Workout Log
                            </button>
                          </div>
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
          <div className="flex flex-col gap-4 w-full">
            {/* PR Controls: Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white/[0.01] border border-white/5 rounded-2xl p-4">
              <input
                type="text"
                placeholder="Search exercises..."
                value={prSearchQuery}
                onChange={(e) => setPrSearchQuery(e.target.value)}
                className="w-full sm:w-60 bg-black/40 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 font-mono">Sort By:</span>
                <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
                  {(['name', 'weight', 'date'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPrSortOption(opt)}
                      className={`px-2.5 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        prSortOption === opt
                          ? 'bg-white text-black font-extrabold shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {opt === 'name' ? 'Name' : opt === 'weight' ? 'Weight' : 'Date'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {personalRecords.length > 0 ? (
                personalRecords.map((pr) => {
                  const displayMaxWeight = isImperial ? (pr.maxWeight * 2.20462).toFixed(1) : pr.maxWeight.toFixed(1);
                  const displayMax1RM = isImperial ? (pr.max1RM * 2.20462).toFixed(1) : pr.max1RM.toFixed(1);
                  const displayMaxVolume = isImperial ? (pr.maxVolume * 2.20462).toFixed(0) : pr.maxVolume.toFixed(0);
                  const unitLabel = isImperial ? 'lbs' : 'kg';
                  
                  const maxWeightDateStr = new Date(pr.maxWeightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const max1RMDateStr = new Date(pr.max1RMDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const maxVolumeDateStr = new Date(pr.maxVolumeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <ScrollReveal key={pr.exerciseId}>
                      <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xs font-bold text-white-adj uppercase tracking-wide truncate max-w-[150px] sm:max-w-[180px]">
                            {pr.exerciseName}
                          </h4>
                          <Award size={14} className="text-amber-400 fill-amber-400/10 animate-pulse" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                              Abs. Max
                            </span>
                            <span className="text-[11px] font-bold text-white-adj font-mono truncate">
                              {displayMaxWeight} {unitLabel}
                            </span>
                            <span className="text-[6px] text-zinc-500 mt-0.5 font-mono truncate">
                              {maxWeightDateStr}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                            <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                              Est. 1RM
                            </span>
                            <span className="text-[11px] font-bold text-cyan-400 font-mono truncate">
                              {displayMax1RM} {unitLabel}
                            </span>
                            <span className="text-[6px] text-zinc-500 mt-0.5 font-mono truncate">
                              {max1RMDateStr}
                            </span>
                          </div>

                          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                            <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                              Max Vol
                            </span>
                            <span className="text-[11px] font-bold text-amber-500 font-mono truncate">
                              {displayMaxVolume} {unitLabel}
                            </span>
                            <span className="text-[6px] text-zinc-500 mt-0.5 font-mono truncate">
                              {maxVolumeDateStr}
                            </span>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 glass-panel rounded-xl py-12 text-center text-zinc-500 italic text-[11px]">
                  {prSearchQuery ? 'No personal records match your search.' : 'No personal records detected. Log workouts with weight and reps to build your PR wall!'}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

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

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmTarget(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm glass-panel bg-black/80 border-white/10 rounded-3xl p-6 flex flex-col gap-4 text-center z-10 shadow-2xl"
            >
              <div className="mx-auto p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 w-fit">
                <Trash2 size={24} />
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">
                  Delete Workout Log?
                </h3>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Are you sure you want to permanently delete the log for <span className="text-white font-bold">{deleteConfirmTarget.name}</span> on <span className="text-zinc-300 font-bold font-mono">{deleteConfirmTarget.dateStr}</span>? This action is irreversible.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteWorkout(deleteConfirmTarget.date, deleteConfirmTarget.sessionId, deleteConfirmTarget.id);
                    showToast("Workout log deleted successfully");
                    setDeleteConfirmTarget(null);
                    setExpandedLogId(null);
                  }}
                  className="px-4 py-2 bg-red-950/40 border border-red-900/50 hover:bg-red-900/40 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-all cursor-pointer"
                >
                  Delete Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
