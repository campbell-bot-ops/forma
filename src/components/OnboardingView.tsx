'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert, Award, ArrowRight } from 'lucide-react';

interface OnboardingViewProps {
  onFinished: () => void;
}

const SLIDES = [
  {
    icon: <Activity size={48} className="text-cyan-400 fill-cyan-400/10" />,
    title: "Performance Architecture",
    description: "Welcome to FORMA. A fitness science companion built to strip away feed distractions and streaks. Construct your physical form with engineering precision.",
    accent: "text-cyan-400 border-cyan-500/20 bg-cyan-950/20"
  },
  {
    icon: <ShieldAlert size={48} className="text-amber-400 fill-amber-400/10" />,
    title: "CNS Regulated Overload",
    description: "Integrate sleep logs and pre-workout CNS checks. The auto-overload engine dynamically regulates target weights to match your recovery state, auto-generating deloads when fatigued.",
    accent: "text-amber-400 border-amber-500/20 bg-amber-950/20"
  },
  {
    icon: <Award size={48} className="text-emerald-400 fill-emerald-400/10" />,
    title: "Biophysical Ledger",
    description: "Track precise weight trends, view muscle recovery heatmaps, and export aesthetic share cards with custom barcodes of your sets. Ready to execute your Split?",
    accent: "text-emerald-400 border-emerald-500/20 bg-emerald-950/20"
  }
];

export default function OnboardingView({ onFinished }: OnboardingViewProps) {
  const [slideIdx, setSlideIdx] = useState(0);

  const handleNext = () => {
    if (slideIdx < SLIDES.length - 1) {
      setSlideIdx(prev => prev + 1);
    } else {
      onFinished();
    }
  };

  const slide = SLIDES[slideIdx];

  return (
    <div className="min-h-screen w-full bg-obsidian flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative gradient glowing orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/[0.01] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col justify-between h-[450px] relative z-10">
        
        {/* Slide contents with animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex-1 flex flex-col items-center text-center justify-center"
          >
            <div className="mb-6 p-4 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner">
              {slide.icon}
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight text-white-adj font-sans mb-3">
              {slide.title}
            </h1>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-light px-4">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation Controls */}
        <div className="flex flex-col gap-6 items-center">
          
          {/* Apple-style Pagination Indicators */}
          <div className="flex gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSlideIdx(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  slideIdx === idx ? 'bg-white w-5' : 'bg-white/20 w-1.5'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow"
          >
            {slideIdx === SLIDES.length - 1 ? (
              <>
                Let's Begin <ArrowRight size={14} />
              </>
            ) : (
              "Next"
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
