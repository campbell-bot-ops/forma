'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Moon, ShieldCheck, AlertTriangle, Play } from 'lucide-react';

interface CnsSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (score: number, scale: number) => void;
}

export default function CnsSurveyModal({ isOpen, onClose, onComplete }: CnsSurveyModalProps) {
  const [sleep, setSleep] = useState(4);
  const [soreness, setSoreness] = useState(4);
  const [focus, setFocus] = useState(4);

  if (!isOpen) return null;

  const score = Math.round(((sleep + soreness + focus) / 15) * 100);
  
  let status = 'READY';
  let scale = 1.0;
  let statusColor = 'text-emerald-400';
  let statusBg = 'bg-emerald-950/20 border-emerald-900/30';
  let desc = 'Ready to train. Target weights are at 100%. Automatic progression is active.';
  let icon = <ShieldCheck className="text-emerald-400 animate-pulse" size={24} />;

  if (score < 50) {
    status = 'FATIGUED (10% DELOAD)';
    scale = 0.9;
    statusColor = 'text-red-400';
    statusBg = 'bg-red-950/20 border-red-900/30';
    desc = 'High fatigue detected. Today\'s target weights will be automatically reduced by 10% to prevent overtraining.';
    icon = <AlertTriangle className="text-red-400 animate-bounce" size={24} />;
  } else if (score < 75) {
    status = 'MODERATE FATIGUE';
    scale = 1.0;
    statusColor = 'text-amber-400';
    statusBg = 'bg-amber-950/20 border-amber-900/30';
    desc = 'Moderate fatigue. Train at normal weights today, but listen to your body and adjust intensity.';
    icon = <Activity className="text-amber-400" size={24} />;
  }

  const handleSubmit = () => {
    onComplete(score, scale);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#020202] border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-6 shadow-2xl"
      >
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Title */}
        <div className="text-center relative z-10">
          <span className="text-[9px] uppercase tracking-[0.3em] font-extrabold text-zinc-500 block mb-1">
            Pre-Workout Calibration
          </span>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            Daily Readiness Survey
          </h2>
          <p className="text-[10px] text-zinc-500 leading-normal max-w-[280px] mx-auto mt-1">
            Adjust your target weights based on how you feel today.
          </p>
        </div>

        {/* Sliders Container */}
        <div className="flex flex-col gap-4 relative z-10">
          {/* Sleep */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5"><Moon size={12} className="text-zinc-500" /> Sleep Quality</span>
              <span className="text-white">{sleep}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={sleep}
              onChange={(e) => setSleep(parseInt(e.target.value))}
              className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[8px] text-zinc-600 font-semibold">
              <span>1 - Poor Sleep</span>
              <span>5 - Rested</span>
            </div>
          </div>

          {/* Soreness */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5"><Activity size={12} className="text-zinc-500" /> Muscle Soreness</span>
              <span className="text-white">{soreness}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={soreness}
              onChange={(e) => setSoreness(parseInt(e.target.value))}
              className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[8px] text-zinc-600 font-semibold">
              <span>1 - Very Sore</span>
              <span>5 - No Soreness</span>
            </div>
          </div>

          {/* Focus */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5"><Brain size={12} className="text-zinc-500" /> Energy & Focus Level</span>
              <span className="text-white">{focus}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={focus}
              onChange={(e) => setFocus(parseInt(e.target.value))}
              className="w-full accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[8px] text-zinc-600 font-semibold">
              <span>1 - Tired</span>
              <span>5 - Focused</span>
            </div>
          </div>
        </div>

        {/* Readiness Readout */}
        <div className={`glass-panel border rounded-2xl p-4 flex items-start gap-4 transition-all duration-300 ${statusBg}`}>
          <div className="mt-0.5">{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>{status}</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/5 rounded px-1">{score}%</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-light">
              {desc}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow relative z-10"
        >
          <Play size={12} fill="black" /> Start Workout
        </motion.button>
      </motion.div>
    </div>
  );
}
