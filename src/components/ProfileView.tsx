'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Info, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { UserProfile } from '@/utils/db';

interface ProfileViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  zeroUiEnabled: boolean;
  setZeroUiEnabled: () => void;
  autoOverloadEnabled: boolean;
  setAutoOverloadEnabled: () => void;
  onResetData: () => void;
  onSignOut: () => void;
}

export default function ProfileView({
  userProfile,
  onUpdateProfile,
  zeroUiEnabled,
  setZeroUiEnabled,
  autoOverloadEnabled,
  setAutoOverloadEnabled,
  onResetData,
  onSignOut
}: ProfileViewProps) {
  const bmi = (userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1);
  const isImperial = userProfile.units === 'imperial';
  const weightText = isImperial 
    ? `${(userProfile.weight * 2.20462).toFixed(1)} lbs` 
    : `${userProfile.weight.toFixed(1)} kg`;
  
  const heightText = isImperial
    ? `${Math.floor((userProfile.height / 2.54) / 12)}'${Math.round((userProfile.height / 2.54) % 12)}"`
    : `${userProfile.height} cm`;

  // Advanced Biophysical Calculations
  const bodyFatFraction = (userProfile.bodyFat || 12) / 100;
  const leanMassKg = userProfile.weight * (1 - bodyFatFraction);
  const heightMeters = userProfile.height / 100;
  
  const ffmi = heightMeters > 0 ? (leanMassKg / Math.pow(heightMeters, 2)) : 0;
  const normalizedFfmi = ffmi > 0 ? (ffmi + 6.1 * (1.8 - heightMeters)) : 0;

  // TDEE via Katch-McArdle Equation
  const bmr = 370 + 21.6 * leanMassKg;
  const tdee = Math.round(bmr * 1.45); // Moderate athletic activity multiplier (1.45)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pb-36 pt-6 px-4 max-w-md mx-auto flex flex-col gap-6"
    >
      {/* Title */}
      <div className="text-center py-2">
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">
          Profile & Settings
        </h1>
        <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
          Your biometrics and settings
        </p>
      </div>

      {/* User Card */}
      <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
          <User size={28} className="text-zinc-400" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center text-[9px] text-black font-extrabold">
            {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>
        
        <div>
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
            USER PROFILE
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {userProfile.name}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Genesis 4-Day Split
          </p>
        </div>
      </motion.div>

      {/* Biometrics Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 text-center">
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
            Weight
          </span>
          <p className="text-base font-bold text-white font-mono">
            {weightText}
          </p>
          <span className="text-[8px] text-zinc-500 mt-1 block">Baseline</span>
        </div>
        
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
            Height
          </span>
          <p className="text-base font-bold text-white font-mono">
            {heightText}
          </p>
          <span className="text-[8px] text-zinc-500 mt-1 block">BMI {bmi}</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
            Body Fat
          </span>
          <p className="text-base font-bold text-white font-mono">
            {userProfile.bodyFat}%
          </p>
          <span className="text-[8px] text-zinc-500 mt-1 block">Target: 10%</span>
        </div>
      </motion.div>

      {/* Advanced Body Composition readouts */}
      <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <Settings size={14} className="text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Body Composition & TDEE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
              Lean Muscle Mass
            </span>
            <span className="text-xl font-bold text-white font-mono">
              {isImperial ? `${(leanMassKg * 2.20462).toFixed(1)} lbs` : `${leanMassKg.toFixed(1)} kg`}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
              TDEE Maintenance
            </span>
            <span className="text-xl font-bold text-cyan-400 font-mono">
              {tdee} kcal
            </span>
          </div>
        </div>

        <div className="h-[1px] bg-white/5 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
              Fat-Free Mass Index (FFMI)
            </span>
            <span className="text-sm font-semibold text-white font-mono">
              {ffmi.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
              Height-Adjusted FFMI
            </span>
            <span className="text-sm font-semibold text-white font-mono">
              {normalizedFfmi.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2.5">
          <Info size={12} className="text-zinc-500 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-zinc-500 leading-normal font-light">
            FFMI is a premium hypertrophy metric tracking muscle density. Scores between 18–21 reflect average athletic builds, while 22–25 indicate exceptional muscularity.
          </p>
        </div>
      </motion.div>

      {/* System Settings & Core Engines */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase px-1">
          Workout Features
        </span>
        
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
          {/* Toggle 1: Zero-UI Input */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xs font-semibold text-white">
                Smart Set Prediction
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                Pre-fill weights and reps from your last workout for faster logging.
              </p>
            </div>
            <button
              onClick={setZeroUiEnabled}
              className="text-white focus:outline-none cursor-pointer transition-colors"
            >
              {zeroUiEnabled ? <ToggleRight size={38} className="text-zinc-300" /> : <ToggleLeft size={38} className="text-zinc-600" />}
            </button>
          </div>

          <div className="h-[1px] bg-white/5" />

          {/* Toggle 2: Auto-Regulated Overload */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xs font-semibold text-white">
                Automatic Weight Progression
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                Automatically add weight next week if your sets feel too easy (RPE 7 or lower).
              </p>
            </div>
            <button
              onClick={setAutoOverloadEnabled}
              className="text-white focus:outline-none cursor-pointer transition-colors"
            >
              {autoOverloadEnabled ? <ToggleRight size={38} className="text-zinc-300" /> : <ToggleLeft size={38} className="text-zinc-600" />}
            </button>
          </div>

          <div className="h-[1px] bg-white/5" />

          {/* Measurement Units */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xs font-semibold text-white">
                Measurement Units
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                Switch between Metric (kg, cm, km) and Imperial (lbs, feet-inches, miles).
              </p>
            </div>
            <button
              onClick={() => {
                const nextUnits = userProfile.units === 'imperial' ? 'metric' : 'imperial';
                onUpdateProfile({ ...userProfile, units: nextUnits });
              }}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
            >
              {userProfile.units === 'imperial' ? 'Imperial' : 'Metric'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Program Parameters */}
      <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={14} className="text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Training Targets
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-zinc-500">Suggested Workout Time</span>
            <span className="text-white font-mono">60 Minutes</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-zinc-500">Scheduled Days</span>
            <span className="text-white font-mono">Mon / Tue / Thu / Fri</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-zinc-500">Cardio Target</span>
            <span className="text-white font-mono">30 Min LISS Incline Walking</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-500">Program Status</span>
            <span className="text-white font-mono text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
              On Track
            </span>
          </div>
        </div>
      </motion.div>

      {/* Advanced Control (Sign Out & Reset) */}
      <motion.div variants={itemVariants} className="w-full grid grid-cols-2 gap-4">
        <button
          onClick={onSignOut}
          className="py-4 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs text-zinc-300 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          Sign Out
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to reset all workout history and targets? This action is irreversible.')) {
              onResetData();
            }
          }}
          className="py-4 border border-red-950/20 bg-red-950/5 hover:bg-red-950/15 text-xs text-red-400 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Trash2 size={12} />
          Reset Data
        </button>
      </motion.div>

      {/* Info Warning */}
      <motion.div
        variants={itemVariants}
        className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]"
      >
        <Info size={16} className="text-zinc-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 leading-normal">
          Your workout history is saved locally in your browser.
        </p>
      </motion.div>
    </motion.div>
  );
}
