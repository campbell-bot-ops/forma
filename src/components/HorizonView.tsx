'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession, computeTotalTonnage } from '@/constants/workout';
import { Play, Flame, Award, Dumbbell, Calendar, Moon, Minus, Plus, ShieldCheck, AlertTriangle, Droplet, Sparkles, Activity, Brain, Zap } from 'lucide-react';
import { UserProfile } from '@/types/workout';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { db } from '@/utils/db';

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

const MOBILITY_ROUTINES = [
  {
    id: 'full-body',
    title: 'Full Body Flow',
    duration: 10,
    description: 'Decompress neural pathways and restore muscle length.',
    stretches: [
      { name: 'Downward Dog Hold', duration: 60, cues: 'Drive heels down. Press chest to thighs.' },
      { name: 'World Greatest Stretch (L)', duration: 60, cues: 'Step left foot forward. Rotate left hand to sky.' },
      { name: 'World Greatest Stretch (R)', duration: 60, cues: 'Step right foot forward. Rotate right hand to sky.' },
      { name: '90/90 Hip Switch', duration: 60, cues: 'Keep spine tall. Rotate hips side to side.' },
      { name: 'Couch Stretch (L)', duration: 60, cues: 'Lunge left knee back against wall. Squeeze glute.' },
      { name: 'Couch Stretch (R)', duration: 60, cues: 'Lunge right knee back against wall. Squeeze glute.' },
      { name: 'Child Pose Decompression', duration: 60, cues: 'Sink hips to heels. Reach fingertips forward.' }
    ]
  },
  {
    id: 'lower-body',
    title: 'Lower Body Release',
    duration: 8,
    description: 'Release hip flexors, hamstrings, and glutes after lifting.',
    stretches: [
      { name: 'Hamstring Sweep', duration: 60, cues: 'Hinge at hips. Sweep hands down and up.' },
      { name: 'Pigeon Pose (L)', duration: 60, cues: 'Left shin parallel to front of mat. Sink deep.' },
      { name: 'Pigeon Pose (R)', duration: 60, cues: 'Right shin parallel to front of mat. Sink deep.' },
      { name: 'Frog Stretch', duration: 60, cues: 'Widen knees. Sink hips back.' },
      { name: 'Calf & Achilles Stretch', duration: 60, cues: 'Pedal feet in plank position.' }
    ]
  },
  {
    id: 'upper-body',
    title: 'Upper Body Opening',
    duration: 8,
    description: 'Open chest, thoracic spine, and shoulders.',
    stretches: [
      { name: 'Thoracic Extension (Roller)', duration: 60, cues: 'Support neck. Lean back over roller.' },
      { name: 'Thread the Needle (L)', duration: 60, cues: 'Reach left arm under chest. Shoulder to ground.' },
      { name: 'Thread the Needle (R)', duration: 60, cues: 'Reach right arm under chest. Shoulder to ground.' },
      { name: 'Puppy Pose', duration: 60, cues: 'Chest to floor. Keep hips high.' },
      { name: 'Chest Opener Wall Hold', duration: 60, cues: 'Hand against wall. Rotate body away.' }
    ]
  }
];

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const { theme, showToast, cnsScore, setWorkoutHistory, triggerHaptic } = useApp();
  const [quoteIdx, setQuoteIdx] = React.useState(getDayOfYearIndex());
  const [sleepHours, setSleepHours] = React.useState<number>(8.0);
  const [sleepQuality, setSleepQuality] = React.useState<number>(8);
  const [sleepHistory, setSleepHistory] = React.useState<Array<{ date: string; hours: number; quality: number }>>([]);
  const [isSleepModalOpen, setIsSleepModalOpen] = React.useState(false);
  const [waterIntake, setWaterIntake] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<0 | 1>(0);
  const waterTarget = 3.0; // 3 Liters
  
  // Deload Mode State
  const [deloadMode, setDeloadMode] = React.useState(false);

  // Guided Mobility Player State
  const [activeMobilityRoutine, setActiveMobilityRoutine] = React.useState<any | null>(null);
  const [mobilityTimerActive, setMobilityTimerActive] = React.useState(false);
  const [currentStretchIdx, setCurrentStretchIdx] = React.useState(0);
  const [mobilityTimeLeft, setMobilityTimeLeft] = React.useState(0);
  const [isMobilityPaused, setIsMobilityPaused] = React.useState(false);

  const playBeep = (freq = 880, duration = 0.15) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  };

  const speakStretch = (name: string, cues: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const text = `${name}. Cues: ${cues}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
    }
  };

  const startMobilityRoutine = (routine: any) => {
    setActiveMobilityRoutine(routine);
    setCurrentStretchIdx(0);
    setMobilityTimeLeft(routine.stretches[0].duration);
    setMobilityTimerActive(true);
    setIsMobilityPaused(false);
    triggerHaptic([40, 40]);
    speakStretch(routine.stretches[0].name, routine.stretches[0].cues);
  };

  const completeMobilityRoutine = async () => {
    if (!activeMobilityRoutine) return;
    setMobilityTimerActive(false);
    
    const completedRecovery = {
      sessionId: 'mobility-' + activeMobilityRoutine.id,
      sessionTitle: activeMobilityRoutine.title,
      sessionFocus: 'Mobility & Stretching',
      date: new Date().toISOString(),
      actualTonnage: 0,
      logs: {
        'mobility-stretch': [
          {
            setNumber: 1,
            weight: 0,
            reps: activeMobilityRoutine.duration,
            rpe: 5
          }
        ]
      },
      recoveryDetails: {
        duration: activeMobilityRoutine.duration,
        activity: 'Mobility Routine',
        recoveryRate: 8,
        distance: 0,
        calories: activeMobilityRoutine.duration * 4
      }
    };

    try {
      const newHistory = await db.logWorkout(completedRecovery);
      setWorkoutHistory(newHistory);
      showToast(`${activeMobilityRoutine.title} logged! Consistency heatmap updated.`);
    } catch (e) {
      console.error("Failed to log recovery workout:", e);
    }

    setActiveMobilityRoutine(null);
  };
  
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

  // Sync sleep history and water intake from database & localStorage
  React.useEffect(() => {
    async function loadSleepAndWater() {
      try {
        const history = await db.getSleepHistory();
        setSleepHistory(history);
        const todayStr = getLocalDateString(new Date());
        const todaySleep = history.find(s => s.date === todayStr);
        if (todaySleep) {
          setSleepHours(todaySleep.hours);
          setSleepQuality(todaySleep.quality);
        } else {
          const storedSleep = localStorage.getItem('forma_sleep_hours');
          if (storedSleep) {
            setSleepHours(parseFloat(storedSleep));
          }
          const storedQuality = localStorage.getItem('forma_sleep_quality');
          if (storedQuality) {
            setSleepQuality(parseInt(storedQuality));
          }
        }
      } catch (e) {
        console.warn("Failed to load sleep history:", e);
      }

      if (typeof window !== 'undefined') {
        const todayStr = new Date().toDateString();
        const storedWater = localStorage.getItem(`forma_water_intake_${todayStr}`);
        if (storedWater) {
          setWaterIntake(parseFloat(storedWater));
        }

        // Sync deload state
        setDeloadMode(localStorage.getItem('forma_deload_mode') === 'true');
      }
    }
    loadSleepAndWater();
  }, []);

  const saveSleepLog = async (hours: number, quality: number) => {
    try {
      const updated = await db.logSleep(hours, quality);
      setSleepHistory(updated);
      setSleepHours(hours);
      setSleepQuality(quality);
      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_sleep_hours', hours.toFixed(1));
        localStorage.setItem('forma_sleep_quality', quality.toString());
      }
      showToast("Sleep log applied to CNS index.");
    } catch (e) {
      showToast("Failed to save sleep log.");
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

  const toggleDeloadMode = () => {
    const nextVal = !deloadMode;
    setDeloadMode(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_deload_mode', String(nextVal));
    }
    showToast(nextVal ? "Deload Mode Activated. Target weights scaled by -20%." : "Deload Mode Deactivated. Standard targets restored.");
  };

  // Concentric Readiness Score Calculation
  const readinessScore = React.useMemo(() => {
    const sleepHoursRatio = Math.max(0, 100 * (1 - Math.abs(sleepHours - 8) / 4));
    const sleepQualityRatio = sleepQuality * 10;
    
    // Volume strain penalty (up to -15%): deducted if total tonnage in the last 48 hours is exceptionally high
    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    const recentVolume = workoutHistory
      .filter(log => new Date(log.date).getTime() >= fortyEightHoursAgo)
      .reduce((sum, log) => sum + (log.actualTonnage || 0), 0);
    
    let volumeStrainPenalty = 0;
    if (recentVolume > 15000) volumeStrainPenalty = 15;
    else if (recentVolume > 7500) volumeStrainPenalty = 7.5;
    
    const score = 0.4 * cnsScore + 0.3 * sleepHoursRatio + 0.3 * sleepQualityRatio - volumeStrainPenalty;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [cnsScore, sleepHours, sleepQuality, workoutHistory]);

  const strokeDashoffset = 188.5 - (188.5 * readinessScore) / 100;

  const { readinessGrad, readinessStatus, readinessStatusClass } = React.useMemo(() => {
    if (readinessScore >= 80) {
      return {
        readinessGrad: 'readiness-cyan-grad',
        readinessStatus: 'Optimal',
        readinessStatusClass: 'text-cyan-400'
      };
    } else if (readinessScore >= 50) {
      return {
        readinessGrad: 'readiness-amber-grad',
        readinessStatus: 'Fair',
        readinessStatusClass: 'text-amber-500'
      };
    } else {
      return {
        readinessGrad: 'readiness-crimson-grad',
        readinessStatus: 'Fatigued',
        readinessStatusClass: 'text-rose-500'
      };
    }
  }, [readinessScore]);

  // AI coach fatigue analyzer
  const fatigueAnalysis = React.useMemo(() => {
    let avgSleepHours = sleepHours;
    let avgSleepQuality = sleepQuality;
    if (sleepHistory && sleepHistory.length > 0) {
      const recentSleeps = sleepHistory.slice(-7);
      const sumH = recentSleeps.reduce((sum, s) => sum + s.hours, 0);
      const sumQ = recentSleeps.reduce((sum, s) => sum + s.quality, 0);
      avgSleepHours = sumH / recentSleeps.length;
      avgSleepQuality = sumQ / recentSleeps.length;
    }
    const sleepDeficit = avgSleepHours < 7.0 || avgSleepQuality < 6.0;

    let avgRpeVal = 0;
    let rpeCount = 0;
    const last3Workouts = workoutHistory.filter(w => w.actualTonnage > 0).slice(0, 3);
    last3Workouts.forEach(w => {
      if (w.logs) {
        Object.keys(w.logs).forEach(exId => {
          const sets = w.logs[exId];
          if (Array.isArray(sets)) {
            sets.forEach(s => {
              if (s.rpe && !s.isWarmup) {
                avgRpeVal += s.rpe;
                rpeCount++;
              }
            });
          }
        });
      }
    });
    const avgRpe = rpeCount > 0 ? avgRpeVal / rpeCount : 7.5;
    const highIntensity = avgRpe >= 8.8;

    // WoW Tonnage growth
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const week1Volume = workoutHistory
      .filter(w => now - new Date(w.date).getTime() < oneWeekMs && w.actualTonnage > 0)
      .reduce((sum, w) => sum + w.actualTonnage, 0);
    const week2Volume = workoutHistory
      .filter(w => {
        const diff = now - new Date(w.date).getTime();
        return diff >= oneWeekMs && diff < 2 * oneWeekMs && w.actualTonnage > 0;
      })
      .reduce((sum, w) => sum + w.actualTonnage, 0);
    const week3Volume = workoutHistory
      .filter(w => {
        const diff = now - new Date(w.date).getTime();
        return diff >= 2 * oneWeekMs && diff < 3 * oneWeekMs && w.actualTonnage > 0;
      })
      .reduce((sum, w) => sum + w.actualTonnage, 0);

    let overAccumulation = false;
    if (week3Volume > 0 && week2Volume > 0 && week1Volume > 0) {
      const growth1 = (week2Volume - week3Volume) / week3Volume;
      const growth2 = (week1Volume - week2Volume) / week2Volume;
      if (growth1 > 0.15 && growth2 > 0.15) {
        overAccumulation = true;
      }
    }

    let recommendation = 'Maintain';
    let reasoning = 'Fatigue levels are stable and sleep is within target ranges.';
    if (sleepDeficit && highIntensity) {
      recommendation = 'Deload Recommended';
      reasoning = 'High training intensity combined with severe sleep deficit detected. Neural systems require rest.';
    } else if (overAccumulation || highIntensity) {
      recommendation = 'Deload Recommended';
      reasoning = 'Neural fatigue accumulation warning: weekly tonnage growth is too aggressive.';
    } else if (sleepDeficit) {
      recommendation = 'Maintain';
      reasoning = 'Sleep deficit is present. Keep weights constant and focus on lifestyle recovery.';
    } else if (!sleepDeficit && !highIntensity && !overAccumulation) {
      recommendation = 'Push Intensity';
      reasoning = 'Optimal recovery, high sleep quality, and low systemic fatigue. Green light to push progressive overload.';
    }

    return {
      recommendation,
      reasoning,
      sleepDeficit,
      highIntensity,
      overAccumulation
    };
  }, [workoutHistory, sleepHistory, sleepHours, sleepQuality]);

  // Mobility Timer tick interval
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (mobilityTimerActive && activeMobilityRoutine && !isMobilityPaused) {
      intervalId = setInterval(() => {
        setMobilityTimeLeft(prev => {
          if (prev <= 1) {
            playBeep(880, 0.4);
            triggerHaptic([40, 40]);
            
            const nextIdx = currentStretchIdx + 1;
            if (nextIdx < activeMobilityRoutine.stretches.length) {
              setCurrentStretchIdx(nextIdx);
              const nextStretch = activeMobilityRoutine.stretches[nextIdx];
              speakStretch(nextStretch.name, nextStretch.cues);
              return nextStretch.duration;
            } else {
              if (intervalId) clearInterval(intervalId);
              completeMobilityRoutine();
              return 0;
            }
          } else {
            if (prev - 1 <= 3) {
              playBeep(440, 0.1);
            }
            return prev - 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mobilityTimerActive, activeMobilityRoutine, currentStretchIdx, isMobilityPaused]);

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

  const getCalendarHeatmapData = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the Monday of the current week
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(today.getDate() + diffToMonday);
    
    // Go back 4 weeks from this Monday to get a total of 5 weeks (35 days)
    const startMonday = new Date(mondayOfCurrentWeek);
    startMonday.setDate(mondayOfCurrentWeek.getDate() - 28);
    
    const days: Array<{ date: Date; dateStr: string; activity: 'workout' | 'recovery' | 'rest' | 'none'; tonnage: number; minutes: number; isFuture: boolean }> = [];
    const runner = new Date(startMonday);
    
    for (let i = 0; i < 35; i++) {
      const dateStr = getLocalDateString(runner);
      days.push({
        date: new Date(runner),
        dateStr,
        activity: 'none',
        tonnage: 0,
        minutes: 0,
        isFuture: runner > today
      });
      runner.setDate(runner.getDate() + 1);
    }
    
    workoutHistory?.forEach(log => {
      const logDate = new Date(log.date);
      const dateStr = getLocalDateString(logDate);
      const match = days.find(day => day.dateStr === dateStr);
      if (match) {
        if (log.actualTonnage > 0) {
          match.activity = 'workout';
          match.tonnage = log.actualTonnage;
        } else if (log.recoveryDetails?.duration) {
          match.activity = 'recovery';
          match.minutes = log.recoveryDetails.duration;
        } else if (log.restDetails) {
          match.activity = 'rest';
        }
      }
    });
    
    const weeks: Array<typeof days> = [];
    for (let i = 0; i < 35; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [workoutHistory]);

  const calculateActivityStreak = React.useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return 0;

    const loggedDates = new Set<string>();
    workoutHistory.forEach(log => {
      loggedDates.add(getLocalDateString(new Date(log.date)));
    });

    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayStr = getLocalDateString(checkDate);
    const yesterday = new Date(checkDate);
    yesterday.setDate(checkDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let startDate = checkDate;
    if (!loggedDates.has(todayStr)) {
      if (loggedDates.has(yesterdayStr)) {
        startDate = yesterday;
      } else {
        return 0;
      }
    }

    const runner = new Date(startDate);
    while (true) {
      const dateStr = getLocalDateString(runner);
      if (loggedDates.has(dateStr)) {
        streak++;
        runner.setDate(runner.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [workoutHistory]);

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

                {/* Tab 2: Biophysical Wellness (5-span Readiness circle, 7-span Pills) */}
                <div className="w-1/2 flex-shrink-0 grid grid-cols-12 gap-3 sm:gap-4 pl-1.5 sm:pl-2">
                  
                  {/* Left: Recovery Readiness Score Bento Card */}
                  <div className="col-span-5 bg-card-1 border border-white/5 rounded-[24px] sm:rounded-[28px] p-3 sm:p-4 flex flex-col items-center justify-between min-h-[180px] sm:min-h-[216px] relative overflow-hidden">
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono text-center">
                      Readiness Index
                    </span>

                    <div className="relative flex items-center justify-center my-1">
                      <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="readiness-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00f0ff" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                          <linearGradient id="readiness-amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffaa00" />
                            <stop offset="100%" stopColor="#ff7700" />
                          </linearGradient>
                          <linearGradient id="readiness-crimson-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff3355" />
                            <stop offset="100%" stopColor="#ff0000" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="50"
                          cy="50"
                          r="30"
                          className="stroke-zinc-800/40 dark:stroke-zinc-800/60 fill-transparent"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="30"
                          className="fill-transparent"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray="188.5"
                          strokeDashoffset={strokeDashoffset}
                          transform="rotate(-90 50 50)"
                          style={{
                            stroke: `url(#${readinessGrad})`,
                            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm sm:text-base font-extrabold text-white-adj font-mono leading-none">
                          {readinessScore}%
                        </span>
                      </div>
                    </div>

                    <div className="text-center w-full">
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${readinessStatusClass}`}>
                        {readinessStatus}
                      </span>
                      <p className="text-[6px] sm:text-[7px] text-zinc-500 font-mono mt-0.5">
                        CNS: {cnsScore}% &bull; Sleep: {Math.round(sleepHours * 10)}%
                      </p>
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
                          Sleep Log
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-sleep-text font-sans leading-tight">
                          {Math.floor(sleepHours)}h {Math.round((sleepHours - Math.floor(sleepHours)) * 60) > 0 ? `${Math.round((sleepHours - Math.floor(sleepHours)) * 60)}m` : '00m'} &bull; Q{sleepQuality}
                        </span>
                      </div>
                      <span className="ml-auto text-[7px] sm:text-[9px] uppercase tracking-wider text-sleep-muted font-semibold font-sans font-mono border border-white/5 bg-black/10 rounded px-1.5 py-0.5">
                        Log
                      </span>
                    </div>

                    {/* Card 2: Hydration Stats Pill */}
                    <div className="bg-blue-50 dark:bg-[#2f80ed]/10 border border-blue-200 dark:border-[#2f80ed]/20 rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] relative overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-[#2f80ed]/20 flex-shrink-0">
                        <Droplet size={15} className="text-blue-600 dark:text-blue-400 fill-blue-500/20" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-blue-800 dark:text-blue-300 font-semibold font-sans">
                          Water Intake
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-white-adj font-sans leading-tight truncate">
                          {waterIntake.toFixed(2)}L / {waterTarget.toFixed(2)}L
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); adjustWater(-0.25); }}
                          className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                          title="Subtract 250ml"
                        >
                          <Minus size={8} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); adjustWater(0.25); }}
                          className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                          title="Add 250ml"
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                    </div>

                    {/* Card 3: CNS Readiness State */}
                    <div className={`rounded-full p-2 sm:p-2.5 pr-4 sm:pr-6 flex items-center gap-2 sm:gap-3.5 h-[52px] sm:h-[64px] border border-white/5 relative overflow-hidden ${
                      cnsScore < 70 
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' 
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                    }`}>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        cnsScore < 70 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'
                      } flex-shrink-0`}>
                        {cnsScore < 70 ? (
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
                          cnsScore < 70 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {cnsScore}% &mdash; {cnsScore < 70 ? 'Deload advised' : 'Optimal'}
                        </span>
                      </div>
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

          {/* AI Coach & Deload Advisor */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-[#131316] via-[#0b0b0d] to-[#17171c] p-6 shadow-2xl transition-all duration-300 hover:border-white/10 group">
              
              {/* Radial Glow Overlay based on recommendation */}
              <div className={`absolute -right-16 -bottom-16 w-44 h-44 rounded-full blur-[70px] pointer-events-none transition-all duration-500 opacity-40 ${
                fatigueAnalysis.recommendation === 'Deload Recommended'
                  ? 'bg-rose-500/20'
                  : fatigueAnalysis.recommendation === 'Push Intensity'
                  ? 'bg-cyan-500/20'
                  : 'bg-amber-500/20'
              }`} />

              {/* Grid backdrop pattern for extra premium look */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-[28px]" />

              <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start justify-between">
                
                {/* Visual Core & Left Column Info */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Glowing Animated Visual Neural Core */}
                  <div className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.02] border border-white/10 overflow-hidden shadow-inner">
                    {/* Ring animations */}
                    <div className={`absolute inset-1 rounded-full border border-dashed animate-[spin_10s_linear_infinite] opacity-30 ${
                      fatigueAnalysis.recommendation === 'Deload Recommended'
                        ? 'border-rose-400'
                        : fatigueAnalysis.recommendation === 'Push Intensity'
                        ? 'border-cyan-400'
                        : 'border-amber-400'
                    }`} />
                    
                    {/* Glowing Aura inside Core */}
                    <div className={`absolute w-8 h-8 rounded-full blur-md opacity-25 ${
                      fatigueAnalysis.recommendation === 'Deload Recommended'
                        ? 'bg-rose-500'
                        : fatigueAnalysis.recommendation === 'Push Intensity'
                        ? 'bg-cyan-500'
                        : 'bg-amber-500'
                    }`} />
                    
                    {/* Dynamic Center Icon: Custom AI Processor Logo */}
                    <svg 
                      className="w-7 h-7 relative z-10" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      {/* Outer chip boundary */}
                      <rect 
                        x="4" 
                        y="4" 
                        width="16" 
                        height="16" 
                        rx="3" 
                        strokeWidth="1.5" 
                        className={
                          fatigueAnalysis.recommendation === 'Deload Recommended'
                            ? 'text-rose-500'
                            : fatigueAnalysis.recommendation === 'Push Intensity'
                            ? 'text-cyan-400'
                            : 'text-amber-500'
                        } 
                      />
                      {/* Circuit pins */}
                      <path 
                        d="M8 1v3M12 1v3M16 1v3M8 20v3M12 20v3M16 20v3M1 8h3M1 12h3M1 16h3M20 8h3M20 12h3M20 16h3" 
                        strokeWidth="1" 
                        strokeLinecap="round" 
                        className="text-zinc-600/80" 
                      />
                      {/* AI styled text */}
                      <text 
                        x="12" 
                        y="13" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="7" 
                        fontWeight="bold" 
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" 
                        className={
                          fatigueAnalysis.recommendation === 'Deload Recommended'
                            ? 'fill-rose-400'
                            : fatigueAnalysis.recommendation === 'Push Intensity'
                            ? 'fill-cyan-300'
                            : 'fill-amber-400'
                        }
                      >
                        AI
                      </text>
                    </svg>
                  </div>

                  {/* Recommendation Title */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] tracking-[0.2em] font-black uppercase text-zinc-500 font-mono">
                      AI Coach
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-1.5 leading-tight font-sans">
                      System Advice
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        fatigueAnalysis.recommendation === 'Deload Recommended'
                          ? 'bg-rose-500 animate-ping'
                          : fatigueAnalysis.recommendation === 'Push Intensity'
                          ? 'bg-cyan-400'
                          : 'bg-amber-500'
                      }`} />
                    </h4>
                    <span className={`text-[10px] font-extrabold tracking-wide mt-1 font-mono transition-all duration-300 uppercase ${
                      fatigueAnalysis.recommendation === 'Deload Recommended'
                        ? 'text-rose-400'
                        : fatigueAnalysis.recommendation === 'Push Intensity'
                        ? 'text-cyan-400'
                        : 'text-amber-500'
                    }`}>
                      {fatigueAnalysis.recommendation}
                    </span>
                  </div>
                </div>

                {/* Sub-telemetry Metrics Board (Mini-Chips) */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {/* Sleep Deficit Chip */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-bold uppercase tracking-wider font-mono ${
                    fatigueAnalysis.sleepDeficit
                      ? 'bg-rose-950/20 border-rose-900/30 text-rose-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                  }`}>
                    <Moon size={9} />
                    <span>Sleep: {fatigueAnalysis.sleepDeficit ? 'Deficit' : 'Charged'}</span>
                  </div>

                  {/* Intensity Load Chip */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-bold uppercase tracking-wider font-mono ${
                    fatigueAnalysis.highIntensity
                      ? 'bg-amber-950/20 border-amber-900/30 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                  }`}>
                    <Activity size={9} />
                    <span>RPE: {fatigueAnalysis.highIntensity ? 'Aggressive' : 'Optimal'}</span>
                  </div>

                  {/* Overaccumulation Chip */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-bold uppercase tracking-wider font-mono ${
                    fatigueAnalysis.overAccumulation
                      ? 'bg-rose-950/20 border-rose-900/30 text-rose-400 animate-pulse'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                  }`}>
                    <Flame size={9} />
                    <span>Volume: {fatigueAnalysis.overAccumulation ? 'Surging' : 'Steady'}</span>
                  </div>
                </div>

              </div>

              {/* Reasoning Description */}
              <div className="mt-4 text-[11px] text-zinc-400 leading-relaxed font-light font-sans border-l-2 border-white/5 pl-3 group-hover:border-white/10 transition-colors">
                {fatigueAnalysis.reasoning}
              </div>

              {/* Toggler Area */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 font-sans">
                    Deload Mode Protocol
                  </span>
                  <span className="text-[8.5px] text-zinc-500 font-mono mt-0.5 leading-tight">
                    Limits training targets by -20% and caps max recommended RPE to 7.0
                  </span>
                </div>
                
                <button
                  onClick={toggleDeloadMode}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all duration-300 cursor-pointer border ${
                    deloadMode
                      ? 'bg-[#14b8a6] text-black border-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:bg-teal-400 active:scale-[0.98]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white active:scale-[0.98]'
                  }`}
                >
                  {deloadMode ? '⚠️ PROTOCOL ACTIVE' : 'ACTIVATE DELOAD'}
                </button>
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

          {/* Monthly Activity Calendar Heatmap Card */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="glass-panel rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                    PHYSICAL CONSISTENCY HEATMAP
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    Monthly Activity Calendar
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5 text-[8.5px] font-mono font-bold text-orange-400">
                  <Flame size={10} className="fill-orange-400/20 animate-pulse" />
                  <span>{calculateActivityStreak} DAY STREAK</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* 5x7 Grid Wrapper */}
                <div className="flex gap-2.5 items-center justify-center py-2 bg-black/20 rounded-2xl border border-white/5">
                  {/* Y-axis Labels */}
                  <div className="flex flex-col justify-between text-[7.5px] text-zinc-600 font-bold h-[82px] pr-1.5 font-mono text-right uppercase leading-none">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>

                  <div className="flex gap-2">
                    {getCalendarHeatmapData.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-2">
                        {week.map((day) => {
                          let bgClass = 'bg-zinc-900/40 border-white/5';
                          let titleText = `${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: No Activity`;

                          if (day.isFuture) {
                            bgClass = 'border-dashed border-white/[0.03] bg-transparent';
                            titleText = `${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Future)`;
                          } else if (day.activity === 'workout') {
                            bgClass = 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]';
                            titleText = `${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Workout logged (${Math.round(isImperial ? day.tonnage * 2.20462 : day.tonnage)} ${isImperial ? 'lbs' : 'kg'})`;
                          } else if (day.activity === 'recovery') {
                            bgClass = 'bg-teal-600/70 border-teal-500/30';
                            titleText = `${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Active Recovery logged (${day.minutes} mins)`;
                          } else if (day.activity === 'rest') {
                            bgClass = 'bg-zinc-700/60 border-zinc-600/20';
                            titleText = `${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Rest Day logged`;
                          }

                          return (
                            <div
                              key={day.dateStr}
                              className={`w-2.5 h-2.5 rounded-[2px] border transition-all duration-300 cursor-pointer ${bgClass}`}
                              title={titleText}
                              onClick={() => {
                                if (!day.isFuture) {
                                  showToast(titleText);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 px-1">
                  <span>Past 5 Weeks</span>
                  <div className="flex gap-2 items-center">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-zinc-900/40 border border-white/5" />
                      <span>None</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-zinc-700/60 border border-zinc-600/20" />
                      <span>Rest</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-teal-600/70 border border-teal-500/30" />
                      <span>Rec</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-cyan-500 border border-cyan-400" />
                      <span>Wkt</span>
                    </span>
                  </div>
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

          {/* Guided Stretching & Mobility */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="glass-panel rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4 border border-white/5 bg-[#121214]">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                  Guided Restoration
                </span>
                <h3 className="text-sm font-semibold text-white mt-0.5">
                  Mobility & Muscle Release
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {MOBILITY_ROUTINES.map(routine => (
                  <div key={routine.id} className="flex justify-between items-center border-b border-white/5 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <span className="text-xs font-bold text-zinc-200 truncate">{routine.title}</span>
                      <span className="text-[10px] text-zinc-500 line-clamp-1">{routine.description}</span>
                    </div>
                    <button
                      onClick={() => startMobilityRoutine(routine)}
                      className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-extrabold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 cursor-pointer transition-all active:scale-95 flex-shrink-0"
                    >
                      {routine.duration} mins
                    </button>
                  </div>
                ))}
              </div>
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
                  Sleep & Recovery
                </h2>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[240px] mx-auto leading-normal">
                  Log your sleep details to calibrate CNS readiness and deload advisories.
                </p>
              </div>

              {/* Sliders panel */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col gap-6 relative z-10">
                {/* Hours Slider */}
                <div className="flex flex-col gap-2">
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
                    }}
                    className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-semibold font-mono">
                    <span>4.0h</span>
                    <span>8.0h (Recommended)</span>
                    <span>12.0h</span>
                  </div>
                </div>

                {/* Quality Slider */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase">
                    <span>Sleep Quality</span>
                    <span className="text-lg font-extrabold text-white font-mono">
                      {sleepQuality}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={sleepQuality}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSleepQuality(val);
                    }}
                    className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-semibold font-mono">
                    <span>1 (Poor)</span>
                    <span>8 (Restful)</span>
                    <span>10 (Optimal)</span>
                  </div>
                </div>
              </div>

              {/* Recommendation Feedback */}
              <div className={`glass-panel border rounded-xl p-4 flex items-start gap-3 relative z-10 transition-all duration-300 ${
                sleepHours < 7.0 || sleepQuality < 6
                  ? 'bg-amber-950/20 border-amber-900/30' 
                  : 'bg-emerald-950/20 border-emerald-900/30'
              }`}>
                <div className="mt-0.5">
                  {sleepHours < 7.0 || sleepQuality < 6 ? (
                    <AlertTriangle className="text-amber-400" size={18} />
                  ) : (
                    <ShieldCheck className="text-emerald-400" size={18} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      sleepHours < 7.0 || sleepQuality < 6 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {sleepHours < 7.0 || sleepQuality < 6 ? 'Deload Recommended' : 'Optimal CNS State'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-light">
                    {sleepHours < 7.0 || sleepQuality < 6 
                      ? 'CNS fatigue warning: target weights reduced by 15% recommended.' 
                      : 'Green light to push for a new record!'}
                  </p>
                </div>
              </div>

              {/* Close/Save CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  saveSleepLog(sleepHours, sleepQuality);
                  setIsSleepModalOpen(false);
                }}
                className="w-full bg-white text-black font-semibold text-xs uppercase py-3.5 rounded-xl flex items-center justify-center cursor-pointer shadow-lg active-glow relative z-10"
              >
                Confirm & Apply
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guided Stretching & Mobility Player Overlay */}
      <AnimatePresence>
        {activeMobilityRoutine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020203]/98 backdrop-blur-md flex flex-col justify-between p-6 select-none font-sans"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-extrabold font-mono">
                  Guided Mobility
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                  {activeMobilityRoutine.title}
                </span>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
                  setActiveMobilityRoutine(null);
                  setMobilityTimerActive(false);
                }}
                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Minus size={20} />
              </button>
            </div>

            {/* Circular Timer Display */}
            <div className="flex flex-col items-center justify-center my-auto gap-8">
              <div className="relative flex items-center justify-center">
                <svg className="w-48 h-48 sm:w-56 sm:h-56" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="mobility-timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-zinc-800/40 fill-transparent"
                    strokeWidth="6"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="fill-transparent"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="439.8"
                    strokeDashoffset={439.8 - (439.8 * mobilityTimeLeft) / (activeMobilityRoutine.stretches[currentStretchIdx]?.duration || 60)}
                    transform="rotate(-90 80 80)"
                    style={{
                      stroke: 'url(#mobility-timer-grad)',
                      transition: 'stroke-dashoffset 1s linear'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono leading-none tabular-nums">
                    {mobilityTimeLeft}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold mt-1">
                    seconds left
                  </span>
                </div>
              </div>

              {/* Stretch Details */}
              <div className="text-center max-w-xs flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#14b8a6] font-bold font-mono">
                  Stretch {currentStretchIdx + 1} of {activeMobilityRoutine.stretches.length}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                  {activeMobilityRoutine.stretches[currentStretchIdx]?.name}
                </h2>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  {activeMobilityRoutine.stretches[currentStretchIdx]?.cues}
                </p>
              </div>

              {/* Up Next Preview */}
              <div className="text-center bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-2.5">
                <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold font-mono block">
                  Up Next
                </span>
                <span className="text-[11px] font-bold text-zinc-300">
                  {currentStretchIdx < activeMobilityRoutine.stretches.length - 1
                    ? activeMobilityRoutine.stretches[currentStretchIdx + 1].name
                    : 'Routine Finished'}
                </span>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex gap-4 w-full justify-between items-center border-t border-white/5 pt-6">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
                  setActiveMobilityRoutine(null);
                  setMobilityTimerActive(false);
                }}
                className="flex-1 py-3.5 border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer text-center"
              >
                Quit Flow
              </button>
              
              <button
                onClick={() => setIsMobilityPaused(!isMobilityPaused)}
                className="w-14 h-14 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center cursor-pointer transition-all active:scale-95 flex-shrink-0"
              >
                {isMobilityPaused ? (
                  <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => {
                  triggerHaptic([30]);
                  const nextIdx = currentStretchIdx + 1;
                  if (nextIdx < activeMobilityRoutine.stretches.length) {
                    setCurrentStretchIdx(nextIdx);
                    const nextStretch = activeMobilityRoutine.stretches[nextIdx];
                    speakStretch(nextStretch.name, nextStretch.cues);
                    setMobilityTimeLeft(nextStretch.duration);
                  } else {
                    completeMobilityRoutine();
                  }
                }}
                className="flex-1 py-3.5 bg-[#14b8a6] hover:bg-teal-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Skip Stretch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
