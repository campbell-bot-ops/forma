'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { WorkoutSession } from '@/constants/workout';
import { ArrowLeft, Check, Moon, Shield, Info, Clipboard } from 'lucide-react';

interface RestViewProps {
  session: WorkoutSession;
  onBack: () => void;
  onLogRest: (logs: { walkLogged: boolean; stretchLogged: boolean; notes: string }) => void;
}

export default function RestView({ session, onBack, onLogRest }: RestViewProps) {
  const [walkLogged, setWalkLogged] = useState(false);
  const [stretchLogged, setStretchLogged] = useState(false);
  const [notes, setNotes] = useState('');

  const handleLog = () => {
    onLogRest({
      walkLogged,
      stretchLogged,
      notes: notes || 'General passive rest'
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground flex flex-col justify-between pt-6 pb-12 px-4 max-w-md mx-auto relative overflow-hidden">
      
      {/* Soft emerald glow backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-emerald-400">
            Weekend Rest
          </span>
          <h1 className="text-sm font-semibold text-white uppercase tracking-wider">
            {session.title} &mdash; {session.focus}
          </h1>
        </div>
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-950/20 border border-emerald-900/20 text-emerald-400">
          <Moon size={14} className="animate-pulse" />
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 flex flex-col justify-center gap-6 relative z-10"
      >
        {/* Concept Card */}
        <motion.div variants={itemVariants} className="glass-panel border-emerald-950/20 bg-emerald-950/5 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <Shield size={16} />
            <span className="text-[10px] uppercase font-bold tracking-widest">
              The Importance of Rest
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-light">
            "Muscles grow when you rest, not when you lift. Rest days help your body recover, prevent injury, and restore your energy."
          </p>
        </motion.div>

        {/* Activity checklist */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">
            Active Rest Checklist
          </span>
          
          <div className="flex flex-col gap-2">
            {/* Walk toggle */}
            <button
              onClick={() => setWalkLogged(prev => !prev)}
              className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                walkLogged
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-white'
                  : 'border-white/5 bg-white/[0.01] text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider">Long Walk Completed</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5">Light aerobic movement to flush muscles</p>
              </div>
              <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                walkLogged ? 'bg-emerald-500 border-emerald-500' : 'border-white/10'
              }`}>
                {walkLogged && <Check size={10} className="text-black stroke-[3px]" />}
              </div>
            </button>

            {/* Stretch toggle */}
            <button
              onClick={() => setStretchLogged(prev => !prev)}
              className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                stretchLogged
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-white'
                  : 'border-white/5 bg-white/[0.01] text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider">Light Stretching Session</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5">Joint decompression and flexibility restoration</p>
              </div>
              <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                stretchLogged ? 'bg-emerald-500 border-emerald-500' : 'border-white/10'
              }`}>
                {stretchLogged && <Check size={10} className="text-black stroke-[3px]" />}
              </div>
            </button>
          </div>
        </motion.div>

        {/* Notes input */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold px-1 flex items-center gap-1.5">
            <Clipboard size={10} />
            Workout Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Felt well recovered, did 45 mins foam rolling and dynamic walks."
            className="w-full bg-white/[0.01] border border-white/5 focus:border-white/20 text-white rounded-2xl p-4 text-xs h-20 focus:outline-none transition-all placeholder:text-zinc-600 resize-none"
          />
        </motion.div>

        {/* CTA Log */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLog}
          className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow"
        >
          <Check size={14} strokeWidth={2.5} />
          Log Rest Day
        </motion.button>
      </motion.div>

      {/* Info footer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01] mt-6 relative z-10">
        <Info size={16} className="text-zinc-600 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-zinc-500 leading-normal font-light">
          Rest days are saved in your history to keep track of your weekly schedule and consistency.
        </p>
      </div>
    </div>
  );
}
