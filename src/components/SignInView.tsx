'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/utils/db';
import { UserSession } from '@/types/workout';
import { Mail, Lock, ShieldAlert, CheckCircle2, ArrowRight, User, Dumbbell, Ruler, Percent } from 'lucide-react';
import Image from 'next/image';

interface SignInViewProps {
  onSuccess: (session: UserSession) => void;
}

export default function SignInView({ onSuccess }: SignInViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Credentials states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Biometrics states
  const [weight, setWeight] = useState('78');
  const [height, setHeight] = useState('180');
  const [bodyFat, setBodyFat] = useState('12');

  // Loading & statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleAuthMode = () => {
    setIsSignUp(prev => !prev);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let session;
      if (isSignUp) {
        session = await db.signUp(
          email,
          password,
          name,
          parseFloat(weight) || 75,
          parseFloat(height) || 180,
          parseFloat(bodyFat) || 12
        );
      } else {
        session = await db.signIn(email, password);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess(session);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Action failed. Please review credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground flex flex-col justify-center px-6 py-12 max-w-md mx-auto relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-full relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Image
            src="/Frame 166.png"
            alt="FORMA Logo"
            width={120}
            height={28}
            priority
            style={{ height: 'auto' }}
            className="h-7 w-auto object-contain mb-2"
          />
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase font-semibold">
            Workout Tracker
          </p>
        </div>

        {/* Input Form Panel */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-6">
          
          {/* Header toggles */}
          <div className="flex border-b border-white/5 pb-4 mb-6 justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isSignUp ? 'Create Profile' : 'Sign In'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-light">
                {isSignUp ? 'Enter your biometrics' : 'Enter email and password to log in'}
              </p>
            </div>
            
            <button
              onClick={toggleAuthMode}
              className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl border border-red-950/20 bg-red-950/5 text-red-400 flex items-start gap-2.5 text-[11px] leading-relaxed"
              >
                <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-xl border border-emerald-950/20 bg-emerald-950/5 text-emerald-400 flex items-center gap-2.5 text-[11px] font-semibold"
              >
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Logged In! Loading...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Conditional fields for Sign Up */}
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Name field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User size={16} className="absolute left-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="Alexander Thorne"
                        value={name}
                        disabled={loading || success}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 focus:bg-white/[0.04] text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Biometrics Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Weight */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                        Weight (kg)
                      </label>
                      <div className="relative flex items-center">
                        <Dumbbell size={12} className="absolute left-3 text-zinc-600" />
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={weight}
                          disabled={loading || success}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 text-white rounded-lg pl-8 pr-2 py-2 text-xs focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Height */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                        Height (cm)
                      </label>
                      <div className="relative flex items-center">
                        <Ruler size={12} className="absolute left-3 text-zinc-600" />
                        <input
                          type="number"
                          required
                          value={height}
                          disabled={loading || success}
                          onChange={(e) => setHeight(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 text-white rounded-lg pl-8 pr-2 py-2 text-xs focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Body Fat */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                        Body Fat (%)
                      </label>
                      <div className="relative flex items-center">
                        <Percent size={12} className="absolute left-3 text-zinc-600" />
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={bodyFat}
                          disabled={loading || success}
                          onChange={(e) => setBodyFat(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 text-white rounded-lg pl-8 pr-2 py-2 text-xs focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-4 text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="alex@forma.dev"
                  value={email}
                  disabled={loading || success}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 focus:bg-white/[0.04] text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-40"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-4 text-zinc-500 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  disabled={loading || success}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 focus:bg-white/[0.04] text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-40"
                />
              </div>
            </div>

            {/* CTA action button */}
            <motion.button
              whileHover={!loading && !success ? { scale: 1.01 } : {}}
              whileTap={!loading && !success ? { scale: 0.98 } : {}}
              type="submit"
              disabled={loading || success}
              className={`w-full py-4 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                success
                  ? 'bg-emerald-500 text-white'
                  : loading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-zinc-200 active-glow shadow-lg'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              ) : success ? (
                <span>Connected</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight size={13} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Guest access hint */}
        <p className="text-center text-[10px] text-zinc-500 mt-6 leading-relaxed px-4 font-light">
          {isSignUp 
            ? 'Your weight, height, and body fat are used to calculate calories burned and target weight goals.'
            : 'Guest Access: Use alex@forma.dev with password 1234 to bypass registration.'
          }
        </p>
      </motion.div>
    </div>
  );
}
