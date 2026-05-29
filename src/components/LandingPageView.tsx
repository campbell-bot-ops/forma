'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import {
  Flame, ShieldCheck, Dumbbell, Award, Zap, Wifi, WifiOff, Eye,
  ArrowRight, Check, X, Star, Users, BarChart3, Clock, Target,
  Settings, TrendingUp, ChevronDown, Code2, MessageCircle, Globe
} from 'lucide-react';
import { computeEstimated1RM } from '@/constants/workout';
import Image from 'next/image';

/* ─── Helper: Animated Counter ─── */
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const startTime = performance.now();
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [inView, value]);

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

/* ─── Helper: 3D Tilt Card ─── */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, []);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Shared reveal animation props ─── */
const reveal = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  viewport: { once: true, amount: 0.15 },
};

const staggerItem = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

/* ─── Data ─── */
const testimonials = [
  { name: 'Marcus T.', role: 'Competitive Powerlifter', quote: 'The CNS deload system prevented me from burning out on my peaking cycle. FORMA changed how I approach periodization entirely.', rating: 5 },
  { name: 'Sarah K.', role: 'Home Gym Athlete', quote: 'Finally a tracker that works in my basement with zero signal. Log everything offline, it syncs the moment I walk upstairs.', rating: 5 },
  { name: 'James R.', role: 'Intermediate Lifter', quote: 'Auto-overload takes the guesswork out of progressive overload. My bench went from 100kg to 120kg in 3 months of using FORMA.', rating: 5 },
];

const comparisonFeatures = [
  { feature: 'Offline-First Architecture', forma: true, others: false },
  { feature: 'CNS Fatigue Auto-Deload', forma: true, others: false },
  { feature: 'Automated Progressive Overload', forma: true, others: false },
  { feature: 'Mathematical 1RM Tracking', forma: true, others: 'partial' as const },
  { feature: 'Volume Tonnage Analytics', forma: true, others: 'partial' as const },
  { feature: 'No Vanity Streaks or Gamification', forma: true, others: false },
  { feature: 'Zero Subscription Cost', forma: true, others: false },
  { feature: 'Dark Glassmorphic Interface', forma: true, others: false },
];

/* ═══════════════════════════════════════════════════════ */

interface LandingPageViewProps {
  onEnterCrucible: () => void;
}

export default function LandingPageView({ onEnterCrucible }: LandingPageViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Scroll tracking ───
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 80));

  // ─── Parallax transforms ───
  const heroVideoY = useTransform(scrollY, [0, 800], [0, 300]);
  const heroContentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroContentY = useTransform(scrollY, [0, 500], [0, 80]);

  // ─── Mouse tracking for orbs ───
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleHeroMouse = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setMousePos({ x: (clientX - cx) * 0.02, y: (clientY - cy) * 0.02 });
  }, []);

  // ─── Sandbox state: CNS Simulator ───
  const [sleepHours, setSleepHours] = useState(8);
  const [sorenessLevel, setSorenessLevel] = useState(3);
  const [cnsScore, setCnsScore] = useState(90);
  const [deloadMultiplier, setDeloadMultiplier] = useState(1.0);

  // ─── Sandbox state: 1RM Calculator ───
  const [calcWeight, setCalcWeight] = useState(100);
  const [calcReps, setCalcReps] = useState(5);
  const [est1RM, setEst1RM] = useState(115);

  // ─── Sandbox state: Offline Sync ───
  const [mockOffline, setMockOffline] = useState(false);
  const [syncedLogsCount, setSyncedLogsCount] = useState(4);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // ─── Effects ───
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.55;
  }, []);

  useEffect(() => {
    const sleepFactor = Math.min(100, (sleepHours / 8) * 100);
    const sorenessDeduction = (sorenessLevel - 1) * 3.8;
    const computed = Math.max(25, Math.round(sleepFactor - sorenessDeduction));
    setCnsScore(computed);
    if (computed >= 75) setDeloadMultiplier(1.0);
    else if (computed >= 60) setDeloadMultiplier(0.95);
    else if (computed >= 50) setDeloadMultiplier(0.90);
    else setDeloadMultiplier(0.85);
  }, [sleepHours, sorenessLevel]);

  useEffect(() => {
    setEst1RM(Math.round(computeEstimated1RM(calcWeight, calcReps)));
  }, [calcWeight, calcReps]);

  const handleSimulateOfflineSet = () => {
    setSyncedLogsCount(prev => prev + 1);
    if (!mockOffline) {
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 1200);
    }
  };

  useEffect(() => {
    if (!mockOffline && syncStatus === 'idle') {
      setSyncStatus('syncing');
      const timer = setTimeout(() => setSyncStatus('synced'), 1500);
      return () => clearTimeout(timer);
    }
  }, [mockOffline]);

  // ═══ RENDER ═══
  return (
    <div className="w-full min-h-screen bg-[#020202] text-zinc-300 relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-white">

      {/* ━━━ Scroll Progress Bar ━━━ */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* ━━━ Navbar ━━━ */}
      <header className={`w-full fixed top-[2px] left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30'
          : 'bg-transparent backdrop-blur-sm border-b border-white/[0.03]'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center transition-all duration-500" style={{ height: scrolled ? 56 : 64 }}>
          <Image
            src="/Frame 166.png"
            alt="FORMA Logo"
            width={120}
            height={28}
            priority
            className="h-6 w-auto object-contain"
          />
          <div className="flex items-center gap-6">
            <a href="#features" className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">How It Works</a>
            <a href="#sandbox" className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Sandbox</a>
            <motion.button
              onClick={onEnterCrucible}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shimmer px-4 py-2 bg-white text-black hover:bg-zinc-200 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-lg"
            >
              Sign In
            </motion.button>
          </div>
        </div>
      </header>

      {/* ━━━ Hero Section ━━━ */}
      <section
        className="relative w-full h-screen flex flex-col justify-center items-center overflow-hidden"
        onMouseMove={handleHeroMouse}
      >
        {/* Parallax Video */}
        <motion.div className="absolute inset-0 w-full h-full" style={{ y: heroVideoY }}>
          <video
            ref={videoRef}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none brightness-[0.4] contrast-125"
          >
            <source src="https://res.cloudinary.com/ddm5ca6u8/video/upload/v1/119967-719443875_srnwpy.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px] bg-center pointer-events-none z-10" />

        {/* Scan Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none z-10 animate-scan" />

        {/* Mouse-Reactive Ambient Orbs */}
        <motion.div
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[160px] pointer-events-none z-0 animate-float-drift"
          animate={{ x: mousePos.x * 15, y: mousePos.y * 15 }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
        />
        <motion.div
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[140px] pointer-events-none z-0 animate-float-drift-alt"
          animate={{ x: mousePos.x * -10, y: mousePos.y * -10 }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
        />
        <motion.div
          className="absolute bottom-[20%] left-[40%] w-[300px] h-[300px] bg-emerald-500/[0.025] rounded-full blur-[120px] pointer-events-none z-0 animate-float-drift"
          animate={{ x: mousePos.x * 8, y: mousePos.y * -8 }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
        />

        {/* Gradient Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#020202_90%)] z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#020202] to-transparent z-10 pointer-events-none" />

        {/* Staggered Hero Content */}
        <motion.div
          className="relative z-20 max-w-4xl px-6 text-center flex flex-col items-center gap-6 select-none"
          style={{ opacity: heroContentOpacity, y: heroContentY }}
        >
          <motion.span
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono"
          >
            AUTONOMIC OVERLOAD ENGINE
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl md:text-7xl font-black text-white tracking-tight uppercase leading-[0.95]"
          >
            Forge Your Ultimate <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              Physical Form
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed font-light"
          >
            Strip away vanity streaks. FORMA is a mathematical strength ledger designed for offline reliability. Calibrate loads against CNS readiness, track true progress, and automate overload.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap gap-4 justify-center mt-2"
          >
            <motion.button
              onClick={onEnterCrucible}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shimmer px-8 py-4 bg-white text-black hover:bg-zinc-200 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xl hover:shadow-white/10"
            >
              <Zap size={13} className="fill-black" /> Enter The Crucible
            </motion.button>
            <motion.a
              href="#sandbox"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md"
            >
              <Eye size={13} /> Test Systems
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-600 font-mono">Scroll</span>
          <ChevronDown size={16} className="text-zinc-600 animate-bounce" />
        </motion.div>
      </section>

      {/* ━━━ Stats / Social Proof Bar ━━━ */}
      <motion.section
        {...reveal}
        className="w-full border-y border-white/5 bg-white/[0.01] py-12 md:py-16"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {[
            { value: 12400, suffix: '+', label: 'Sets Logged', icon: BarChart3, color: 'text-cyan-400' },
            { value: 850, suffix: '+', label: 'Active Lifters', icon: Users, color: 'text-emerald-400' },
            { value: 47, suffix: 'min', label: 'Avg Session', icon: Clock, color: 'text-amber-400' },
            { value: 99, suffix: '.9%', label: 'Sync Uptime', icon: ShieldCheck, color: 'text-violet-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center gap-2">
              <stat.icon size={18} className={`${stat.color} opacity-60`} />
              <p className={`text-2xl md:text-3xl font-extrabold font-mono ${stat.color}`}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ━━━ Feature Cards ━━━ */}
      <motion.section
        id="features"
        {...staggerContainer}
        className="w-full py-24 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...staggerItem} className="mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400 font-mono">CORE SYSTEMS</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">Built for Serious Lifters</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Dumbbell, color: 'cyan', title: 'Mathematical 1RM Progression', desc: 'Calculated per exercise using hybrid Brzycki and Epley equations. Build your PR wall with precision, not guesswork.' },
              { icon: Flame, color: 'amber', title: 'Autonomic Fatigue Regulation', desc: 'Deload recommendations mapped directly to your daily autonomic survey. Train with optimal intensity based on biological capacity.' },
              { icon: ShieldCheck, color: 'emerald', title: 'Offline-First Synchronization', desc: 'Your workout ledger operates independently offline. Database writes automatically queue and resolve when connection is restored.' },
            ].map((card, i) => (
              <motion.div key={card.title} {...staggerItem}>
                <TiltCard className={`glass-panel glass-panel-glow hover:border-${card.color}-500/20 hover:shadow-[0_8px_30px_rgba(6,182,212,0.03)] transition-all duration-300 rounded-2xl p-6 flex flex-col gap-3 group h-full`}>
                  <div className={`p-3 rounded-xl bg-${card.color}-500/10 border border-${card.color}-500/20 text-${card.color}-${card.color === 'amber' ? '500' : '400'} w-fit group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-1">{card.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-light">{card.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ━━━ How It Works ━━━ */}
      <motion.section
        id="how-it-works"
        {...staggerContainer}
        className="w-full py-24 border-t border-white/5 scroll-mt-20"
      >
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...staggerItem} className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400 font-mono">WORKFLOW</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">Three Steps to Optimal Training</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-cyan-500/20 via-amber-500/20 to-emerald-500/20" />

            {[
              { step: '01', icon: Settings, color: 'cyan', title: 'Configure Your Split', desc: 'Define your weekly training split with target exercises, ghost sets, and rest protocols. Import defaults or build from scratch.' },
              { step: '02', icon: Target, color: 'amber', title: 'Calibrate Under CNS', desc: 'Complete a 30-second autonomic survey before each session. FORMA scales your working weights to match your readiness.' },
              { step: '03', icon: TrendingUp, color: 'emerald', title: 'Auto-Overload & Progress', desc: 'After each session, the engine calculates your next target weights. Progressive overload happens mathematically.' },
            ].map((s) => (
              <motion.div key={s.step} {...staggerItem} className="flex flex-col items-center text-center gap-4">
                <div className={`relative w-24 h-24 rounded-full bg-${s.color}-500/5 border border-${s.color}-500/15 flex items-center justify-center`}>
                  <s.icon size={28} className={`text-${s.color}-${s.color === 'amber' ? '500' : '400'}`} />
                  <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-${s.color}-500/20 border border-${s.color}-500/30 flex items-center justify-center text-[10px] font-extrabold text-${s.color}-${s.color === 'amber' ? '500' : '400'} font-mono`}>
                    {s.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{s.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-light max-w-[280px]">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ━━━ App Dashboard Mockup ━━━ */}
      <motion.section {...reveal} className="w-full py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400 font-mono">INTERFACE</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">Designed for Zero Distraction</h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 8 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ perspective: 1200 }}
            className="relative mx-auto max-w-3xl"
          >
            {/* Browser Chrome */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-black/50">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0f0f0f]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 text-center text-[9px] text-zinc-600 font-mono tracking-wide">forma.dev</div>
              </div>

              {/* Mock Dashboard */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Mock header */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Today&apos;s Session</div>
                    <div className="text-sm font-bold text-white mt-0.5">Push Day — Chest / Shoulders / Triceps</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider font-mono">
                    CNS: 92%
                  </div>
                </div>

                {/* Mock exercise cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Barbell Bench Press', sets: '4×8', weight: '85kg', e1rm: '107kg' },
                    { name: 'Overhead Press', sets: '3×10', weight: '52.5kg', e1rm: '70kg' },
                    { name: 'Incline DB Flyes', sets: '3×12', weight: '22kg', e1rm: '—' },
                    { name: 'Cable Lateral Raise', sets: '4×15', weight: '12.5kg', e1rm: '—' },
                  ].map((ex) => (
                    <div key={ex.name} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-semibold text-white">{ex.name}</div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{ex.sets} @ {ex.weight}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-zinc-600 uppercase font-mono">e1RM</div>
                        <div className="text-[11px] font-bold text-cyan-400 font-mono">{ex.e1rm}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mock tonnage bar */}
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-2">
                    <span>Session Tonnage</span>
                    <span className="text-white font-bold">4,280 kg</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ambient glow behind mockup */}
            <div className="absolute -inset-8 bg-cyan-500/[0.02] rounded-3xl blur-3xl -z-10 pointer-events-none" />
          </motion.div>
        </div>
      </motion.section>

      {/* ━━━ Interactive System Sandbox ━━━ */}
      <motion.section
        id="sandbox"
        {...staggerContainer}
        className="w-full py-24 border-t border-white/5 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...staggerItem} className="mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400 font-mono">SYSTEM SIMULATOR</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">Test Core Logic Engine</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Widget 01: CNS Fatigue Deloader */}
            <motion.div {...staggerItem}>
              <div className="glass-panel glass-panel-glow hover:border-amber-500/10 transition-all duration-300 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-6 right-6 text-amber-400/20"><Flame size={48} className="animate-pulse" /></div>
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-amber-500 font-bold font-mono">WIDGET 01</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">CNS Fatigue Deload Simulator</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed font-light">Drag settings to check how sleep and soreness scale training parameters dynamically.</p>
                </div>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                      <span>Sleep Quality:</span>
                      <span className="text-white font-bold">{sleepHours} Hours</span>
                    </div>
                    <input type="range" min="4" max="10" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(parseFloat(e.target.value))} className="w-full accent-amber-500 bg-white/5 h-1 rounded-full cursor-ew-resize outline-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                      <span>Muscle Soreness:</span>
                      <span className="text-white font-bold">Level {sorenessLevel}/10</span>
                    </div>
                    <input type="range" min="1" max="10" step="1" value={sorenessLevel} onChange={(e) => setSorenessLevel(parseInt(e.target.value))} className="w-full accent-amber-500 bg-white/5 h-1 rounded-full cursor-ew-resize outline-none" />
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex justify-between items-center mt-2">
                  <div>
                    <span className="text-[8px] uppercase text-zinc-500 font-bold font-mono">Autonomic Score</span>
                    <motion.p key={cnsScore} initial={{ scale: 1.15, color: '#22d3ee' }} animate={{ scale: 1, color: '#ffffff' }} className="text-2xl font-extrabold font-mono mt-0.5">{cnsScore}%</motion.p>
                  </div>
                  <div className="w-[1px] h-10 bg-white/5" />
                  <div className="text-right">
                    <span className="text-[8px] uppercase text-zinc-500 font-bold font-mono">Deload Multiplier</span>
                    <motion.p key={deloadMultiplier} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-2xl font-extrabold text-amber-400 font-mono mt-0.5">
                      {deloadMultiplier === 1.0 ? '100% Load' : `${Math.round(deloadMultiplier * 100)}% Load`}
                    </motion.p>
                  </div>
                </div>
                <div className="p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl text-[10px] leading-relaxed text-zinc-400 font-light">
                  <span className="font-bold text-white block mb-0.5 uppercase tracking-wide">SYSTEM SUGGESTION:</span>
                  {cnsScore >= 75
                    ? 'Autonomic load capacity is optimal. Execute training split at 100% target intensity.'
                    : `Autonomic load exceeds fatigue threshold. Applying auto-regulated deload of ${Math.round((1 - deloadMultiplier) * 100)}% to prevent overtraining.`}
                </div>
              </div>
            </motion.div>

            {/* Right Column: Widget 02 + 03 */}
            <div className="flex flex-col gap-8 w-full">
              {/* Widget 02: 1RM Calculator */}
              <motion.div {...staggerItem}>
                <div className="glass-panel glass-panel-glow hover:border-cyan-500/10 transition-all duration-300 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden">
                  <div className="absolute top-6 right-6 text-cyan-400/20"><Dumbbell size={48} className="animate-pulse" /></div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-cyan-500 font-bold font-mono">WIDGET 02</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Hybrid 1-Rep Max Calculator</h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed font-light">Calculate strength metrics on a dynamic hybrid Brzycki &amp; Epley logic structure.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] uppercase text-zinc-500 font-bold font-mono">Weight (kg)</label>
                      <input type="number" value={calcWeight} onChange={(e) => setCalcWeight(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] uppercase text-zinc-500 font-bold font-mono">Reps Completed</label>
                      <input type="number" value={calcReps} onChange={(e) => setCalcReps(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-white/[0.02] border border-white/5 focus:border-white/20 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none" />
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <span className="text-[8px] uppercase text-zinc-500 font-bold font-mono">Estimated 1RM</span>
                      <motion.p key={est1RM} initial={{ scale: 1.15, color: '#67e8f9' }} animate={{ scale: 1, color: '#22d3ee' }} className="text-2xl font-extrabold font-mono mt-0.5">{est1RM} kg</motion.p>
                    </div>
                    <div className="text-right text-[10px] text-zinc-500 font-mono">Formula: {calcReps <= 10 ? 'Brzycki' : 'Epley'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Widget 03: Offline Sync */}
              <motion.div {...staggerItem}>
                <div className="glass-panel glass-panel-glow hover:border-emerald-500/10 transition-all duration-300 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-emerald-500 font-bold font-mono">WIDGET 03</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide">Network &amp; Sync Sandbox</h3>
                    </div>
                    <button onClick={() => setMockOffline(!mockOffline)} className={`px-3 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${mockOffline ? 'bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-950/40' : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40'}`}>
                      {mockOffline ? <><WifiOff size={11} /> Disconnected</> : <><Wifi size={11} /> Connected</>}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>Logged Workouts (Database):</span>
                    <span className="text-white font-bold font-mono">{syncedLogsCount} Logs</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500 border-b border-white/5 pb-3">
                    <span>Sync Status Indicator:</span>
                    <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest font-mono rounded ${mockOffline ? 'bg-red-500/10 text-red-400' : syncStatus === 'syncing' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {mockOffline ? 'Queueing Offline' : syncStatus === 'syncing' ? 'Syncing...' : 'Synced (Online)'}
                    </span>
                  </div>
                  <button onClick={handleSimulateOfflineSet} className="w-full py-3 bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
                    Log Session (Mock)
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ━━━ Testimonials ━━━ */}
      <motion.section {...staggerContainer} className="w-full py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...staggerItem} className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-400 font-mono">TESTIMONIALS</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">Trusted by Lifters</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} {...staggerItem}>
                <div className="glass-panel glass-panel-glow rounded-2xl p-6 flex flex-col gap-4 h-full hover:border-white/15 transition-all duration-300">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-auto pt-3 border-t border-white/5">
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ━━━ Comparison Table ━━━ */}
      <motion.section {...reveal} className="w-full py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400 font-mono">COMPARISON</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">FORMA vs. Generic Trackers</h2>
          </div>

          <div className="glass-panel glass-panel-glow rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px] md:grid-cols-[1fr_120px_120px] text-center border-b border-white/5">
              <div className="text-left px-5 py-4 text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono">Feature</div>
              <div className="px-3 py-4 text-[9px] uppercase tracking-widest text-cyan-400 font-bold font-mono border-l border-white/5 bg-cyan-500/[0.03]">FORMA</div>
              <div className="px-3 py-4 text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono border-l border-white/5">Others</div>
            </div>
            {comparisonFeatures.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-[1fr_80px_80px] md:grid-cols-[1fr_120px_120px] text-center ${i < comparisonFeatures.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className="text-left px-5 py-3.5 text-[11px] text-zinc-300 font-light">{row.feature}</div>
                <div className="px-3 py-3.5 flex items-center justify-center border-l border-white/5 bg-cyan-500/[0.03]">
                  <Check size={14} className="text-cyan-400" />
                </div>
                <div className="px-3 py-3.5 flex items-center justify-center border-l border-white/5">
                  {row.others === 'partial' ? (
                    <span className="text-[9px] text-zinc-500 font-mono">Partial</span>
                  ) : (
                    <X size={14} className="text-zinc-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ━━━ Final CTA ━━━ */}
      <motion.section {...reveal} className="w-full py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="glass-panel border-cyan-950/20 bg-cyan-950/5 rounded-3xl p-10 md:p-16 flex flex-col items-center text-center gap-6 relative overflow-hidden select-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 relative z-10 w-fit">
              <Award size={32} />
            </div>
            <div className="relative z-10 max-w-lg">
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">Ready to Begin?</h3>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed font-light">
                Create your training profile, import default target sessions, and analyze recovery telemetry under zero distractions. No subscription, no streaks, no noise.
              </p>
            </div>
            <motion.button
              onClick={onEnterCrucible}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shimmer relative z-10 px-10 py-5 bg-white text-black hover:bg-zinc-200 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-xl hover:shadow-cyan-500/10 flex items-center gap-2"
            >
              Initialize Your Ledger <ArrowRight size={14} />
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* ━━━ Footer ━━━ */}
      <footer className="w-full border-t border-white/5 bg-[#020202]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <span className="text-white font-extrabold uppercase tracking-[0.25em] text-sm">FORMA</span>
              <p className="text-xs text-zinc-500 mt-3 leading-relaxed font-light max-w-sm">
                A mathematical strength ledger built for serious lifters. Offline-first, zero-fluff, powered by autonomic recovery science.
              </p>
              <div className="flex gap-3 mt-5">
                <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-500 hover:text-white hover:border-white/15 transition-all"><Code2 size={14} /></a>
                <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-500 hover:text-white hover:border-white/15 transition-all"><MessageCircle size={14} /></a>
                <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-500 hover:text-white hover:border-white/15 transition-all"><Globe size={14} /></a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">Features</a></li>
                <li><a href="#how-it-works" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">How It Works</a></li>
                <li><a href="#sandbox" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">System Sandbox</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">Documentation</a></li>
                <li><a href="#" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">Privacy Policy</a></li>
                <li><a href="#" className="text-xs text-zinc-500 hover:text-white transition-colors font-light">Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-zinc-600 font-mono tracking-wider">© {new Date().getFullYear()} FORMA. All rights reserved.</p>
            <p className="text-[10px] text-zinc-600 font-light">Built with precision for those who train with intent.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
