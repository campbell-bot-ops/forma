'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, Info, ToggleLeft, ToggleRight, Trash2, TrendingUp, Heart, Bell, Smartphone, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { db } from '@/utils/db';
import { useApp } from '@/context/AppContext';

export default function ProfileView() {
  const {
    userProfile,
    updateProfile: onUpdateProfile,
    zeroUiEnabled,
    toggleZeroUi: setZeroUiEnabled,
    autoOverloadEnabled,
    toggleAutoOverload: setAutoOverloadEnabled,
    theme,
    toggleTheme: onToggleTheme,
    hapticEnabled,
    toggleHaptic,
    resetData: onResetData,
    signOut: onSignOut,
    triggerHaptic,
    setShowOnboarding
  } = useApp();

  const [weightHistory, setWeightHistory] = useState<Array<{ date: string; weight: number }>>([]);
  const [newWeight, setNewWeight] = useState('');
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  // Avatar and initials helpers
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAvatar = localStorage.getItem('forma_user_avatar');
      if (storedAvatar) {
        setAvatar(storedAvatar);
      }
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        localStorage.setItem('forma_user_avatar', base64String);
        triggerHaptic([40]);
      };
      reader.readAsDataURL(file);
    }
  };

  const getGradientForName = (name: string) => {
    const code = (name || 'User').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-cyan-500 to-blue-600',
      'from-purple-500 to-indigo-600',
      'from-emerald-400 to-cyan-500',
      'from-amber-400 to-orange-500',
      'from-rose-500 to-purple-600',
      'from-fuchsia-500 to-pink-600',
    ];
    return gradients[code % gradients.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Health and notification states
  const [healthConnected, setHealthConnected] = useState<'none' | 'apple' | 'google'>('none');
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedHealthPlatform, setSelectedHealthPlatform] = useState<'apple' | 'google' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isImperial = userProfile.units === 'imperial';

  useEffect(() => {
    async function loadHistory() {
      const history = await db.getWeightHistory();
      setWeightHistory(history);
    }
    loadHistory();

    if (typeof window !== 'undefined') {
      const storedHealth = localStorage.getItem('forma_health_sync') as 'none' | 'apple' | 'google' | null;
      if (storedHealth) {
        setHealthConnected(storedHealth);
      }
      
      const storedNotify = localStorage.getItem('forma_notifications_enabled') === 'true';
      setNotificationsEnabled(storedNotify);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newWeight);
    if (!parsed || parsed <= 0) return;

    // Convert input lbs to kg internally if imperial
    const weightInKg = isImperial ? parsed / 2.20462 : parsed;
    const updated = await db.logWeight(weightInKg);
    setWeightHistory(updated);
    setNewWeight('');

    onUpdateProfile({
      ...userProfile,
      weight: parseFloat(weightInKg.toFixed(1))
    });

    if (healthConnected !== 'none') {
      setShowToast(`Weight synced to ${healthConnected === 'apple' ? 'Apple Health' : 'Google Fit'}`);
      triggerHaptic([40]);
      setTimeout(() => setShowToast(null), 2500);
    } else {
      triggerHaptic([40]);
    }
  };

  const handleDeleteWeight = async (dateStr: string) => {
    if (confirm('Delete this weight log?')) {
      const updated = await db.deleteWeightLog(dateStr);
      setWeightHistory(updated);

      if (updated.length > 0) {
        const mostRecent = [...updated].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        onUpdateProfile({
          ...userProfile,
          weight: mostRecent.weight
        });
      } else {
        onUpdateProfile({
          ...userProfile,
          weight: 0
        });
      }
    }
  };

  const handleConnectPlatform = (platform: 'apple' | 'google') => {
    setHealthConnected(platform);
    localStorage.setItem('forma_health_sync', platform);
    setShowHealthModal(false);
    triggerHaptic([30, 60, 30]); // double vibrate on connect success
    
    setShowToast(`Linked successfully to ${platform === 'apple' ? 'Apple Health' : 'Google Fit'}!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('forma_notifications_enabled', 'true');
          triggerHaptic([30, 50, 30]);
          
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('FORMA Integrated', {
              body: 'System sync active. You will receive daily mobility and water reminders.',
              icon: '/Frame 166.png',
              badge: '/Frame 166.png'
            });
          } else {
            new Notification('FORMA Integrated', {
              body: 'System sync active. You will receive daily mobility and water reminders.',
              icon: '/Frame 166.png'
            });
          }
          
          setShowToast('Daily reminders active!');
          setTimeout(() => setShowToast(null), 2500);
        } else {
          setNotificationsEnabled(false);
          localStorage.setItem('forma_notifications_enabled', 'false');
          setShowToast('Notification permission denied.');
          setTimeout(() => setShowToast(null), 2500);
        }
      } catch (e) {
        // Fallback for ios/unsupported browsers
        setNotificationsEnabled(true);
        localStorage.setItem('forma_notifications_enabled', 'true');
        triggerHaptic([30, 50, 30]);
        setShowToast('Daily reminders active (Simulated)!');
        setTimeout(() => setShowToast(null), 2500);
      }
    } else {
      setNotificationsEnabled(true);
      localStorage.setItem('forma_notifications_enabled', 'true');
      triggerHaptic([30, 50, 30]);
      setShowToast('Daily reminders active (Simulated)!');
      setTimeout(() => setShowToast(null), 2500);
    }
  };

  // Sparkline Chart Calculations
  const chartPoints = weightHistory.map(h => ({
    date: h.date,
    weight: isImperial ? h.weight * 2.20462 : h.weight
  }));

  const weights = chartPoints.map(p => p.weight);
  const minW = weights.length > 0 ? Math.min(...weights) - 1.0 : 70;
  const maxW = weights.length > 0 ? Math.max(...weights) + 1.0 : 90;
  const rangeW = maxW - minW || 1;

  // Chart size
  const chartWidth = 320;
  const chartHeight = 80;
  const paddingX = 10;
  const paddingY = 15;

  const getSvgCoordinates = () => {
    if (chartPoints.length === 0) return [];
    const pointsCount = chartPoints.length;
    return chartPoints.map((p, idx) => {
      const x = paddingX + (idx / Math.max(1, pointsCount - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - ((p.weight - minW) / rangeW) * (chartHeight - paddingY * 2);
      return { x, y };
    });
  };

  const coords = getSvgCoordinates();
  
  // Construct paths
  let linePath = '';
  let areaPath = '';
  if (coords.length > 0) {
    linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${chartHeight} L ${coords[0].x.toFixed(1)} ${chartHeight} Z`;
  }

  const bmi = (userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1);
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
      className="pb-36 pt-6 px-4 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col gap-6"
    >
      {/* Title */}
      <div className="text-center py-2">
        <h1 className="text-xl font-bold tracking-tight text-white-adj uppercase">
          Profile & Settings
        </h1>
        <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500-adj font-medium">
          Your biometrics and settings
        </p>
      </div>

      {/* Main Grid Layout for Tablet/Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
        
        {/* Left Column: Profile Card + Biometrics */}
        <div className="flex flex-col gap-6 w-full">
          {/* User Card */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden">
            <div 
              onClick={() => document.getElementById('avatar-upload-input')?.click()}
              className="w-16 h-16 rounded-full flex items-center justify-center relative cursor-pointer group overflow-hidden border border-white/10 shadow-lg bg-black/20"
              title="Click to upload profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getGradientForName(userProfile.name)} flex items-center justify-center text-white font-extrabold text-lg tracking-tight`}>
                  {getInitials(userProfile.name)}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                <span className="text-[7px] uppercase tracking-wider text-white font-bold font-mono">Upload</span>
              </div>
              <input 
                type="file" 
                id="avatar-upload-input" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange} 
              />
            </div>
            
            <div>
              <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
                USER PROFILE
              </span>
              <h2 className="text-xl font-bold text-white-adj tracking-tight">
                {userProfile.name}
              </h2>
              <p className="text-xs text-zinc-400-adj font-mono mt-0.5">
                Genesis 4-Day Split
              </p>
            </div>
          </motion.div>

          {/* Biometrics Summary */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 text-center">
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500-adj font-bold block mb-1">
                Weight
              </span>
              <p className="text-base font-bold text-white-adj font-mono">
                {weightText}
              </p>
              <span className="text-[8px] text-zinc-500-adj mt-1 block">Baseline</span>
            </div>
            
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500-adj font-bold block mb-1">
                Height
              </span>
              <p className="text-base font-bold text-white-adj font-mono">
                {heightText}
              </p>
              <span className="text-[8px] text-zinc-500-adj mt-1 block">BMI {bmi}</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500-adj font-bold block mb-1">
                Body Fat
              </span>
              <p className="text-base font-bold text-white-adj font-mono">
                {userProfile.bodyFat}%
              </p>
              <span className="text-[8px] text-zinc-500-adj mt-1 block">Target: 10%</span>
            </div>
          </motion.div>

          {/* Body Weight Tracker Card */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  Body Weight Tracker
                </span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400 bg-white/5 border border-white/5 rounded px-2 py-0.5 uppercase">
                Sparkline Log
              </span>
            </div>

            {/* Sparkline Chart */}
            {chartPoints.length > 0 ? (
              <div className="relative w-full h-[80px] bg-black/10 rounded-2xl border border-white/5 overflow-visible">
                {/* Tooltip Overlay */}
                {activeHoverIdx !== null && chartPoints[activeHoverIdx] && (
                  <div className="absolute top-1 left-2 bg-black/90 border border-white/10 rounded px-2 py-0.5 text-[8px] font-mono text-cyan-400 z-10 pointer-events-none">
                    {new Date(chartPoints[activeHoverIdx].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {chartPoints[activeHoverIdx].weight.toFixed(1)} {isImperial ? 'lbs' : 'kg'}
                  </div>
                )}
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="weight-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                  
                  {/* Area fill */}
                  {areaPath && <path d={areaPath} fill="url(#weight-gradient)" />}
                  
                  {/* Line path */}
                  {linePath && <path d={linePath} fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                  
                  {/* Interactive hover points & markers */}
                  {coords.map((c, idx) => (
                    <g key={idx}>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={activeHoverIdx === idx ? 4 : 2}
                        fill={activeHoverIdx === idx ? '#fff' : '#00f0ff'}
                        stroke="#020202"
                        strokeWidth={1}
                      />
                      <rect
                        x={c.x - (chartWidth / Math.max(1, coords.length)) / 2}
                        y={0}
                        width={chartWidth / Math.max(1, coords.length)}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-crosshair pointer-events-auto"
                        onMouseEnter={() => setActiveHoverIdx(idx)}
                        onTouchStart={() => setActiveHoverIdx(idx)}
                        onMouseLeave={() => setActiveHoverIdx(null)}
                        onTouchEnd={() => setActiveHoverIdx(null)}
                      />
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="w-full h-[80px] bg-black/10 rounded-2xl border border-white/5 flex items-center justify-center text-[10px] text-zinc-500 italic">
                No weigh-ins logged yet.
              </div>
            )}

            <form onSubmit={handleAddWeight} className="relative flex items-center w-full">
              <input
                type="number"
                step="0.1"
                required
                placeholder={`Weight (${isImperial ? 'lbs' : 'kg'})`}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-24 py-2.5 text-xs text-white-adj focus:outline-none focus:border-zinc-400 font-mono"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 bg-white hover:bg-zinc-200 text-black text-[10px] font-bold px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                Log Today
              </button>
            </form>

            {/* Weigh-in history logs list */}
            {weightHistory.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto no-scrollbar pt-1">
                {weightHistory.slice().reverse().map((log) => {
                  const dateFormatted = new Date(log.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const dispW = isImperial ? `${(log.weight * 2.20462).toFixed(1)} lbs` : `${log.weight.toFixed(1)} kg`;
                  return (
                    <div key={log.date} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1">
                      <span className="text-zinc-500-adj font-mono">{dateFormatted}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white-adj font-mono font-semibold">{dispW}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteWeight(log.date)}
                          className="text-zinc-600 hover:text-red-400 p-1 cursor-pointer transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Advanced Body Composition readouts */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Settings size={14} className="text-zinc-500-adj" />
              <span className="text-[10px] font-bold text-zinc-400-adj uppercase tracking-widest font-mono">
                Body Composition & TDEE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
                  Lean Muscle Mass
                </span>
                <span className="text-xl font-bold text-white-adj font-mono">
                  {isImperial ? `${(leanMassKg * 2.20462).toFixed(1)} lbs` : `${leanMassKg.toFixed(1)} kg`}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
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
                <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
                  FFMI (Fat-Free Mass)
                </span>
                <span className="text-sm font-semibold text-white-adj font-mono">
                  {ffmi.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-zinc-500-adj uppercase tracking-widest font-bold font-mono">
                  Height-Adjusted FFMI
                </span>
                <span className="text-sm font-semibold text-white-adj font-mono">
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
        </div>

        {/* Right Column: Settings & Actions */}
        <div className="flex flex-col gap-6 w-full">
          {/* System Settings & Core Engines */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3 w-full">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase px-1">
              Workout Features
            </span>
            
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
              {/* Toggle 1: Zero-UI Input */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Smart Set Prediction
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Pre-fill weights and reps from your last workout for faster logging.
                  </p>
                </div>
                <button
                  onClick={setZeroUiEnabled}
                  className="text-white-adj focus:outline-none cursor-pointer transition-colors"
                >
                  {zeroUiEnabled ? <ToggleRight size={38} className="text-zinc-300-adj" /> : <ToggleLeft size={38} className="text-zinc-600" />}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Toggle 2: Auto-Regulated Overload */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Automatic Weight Progression
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Automatically add weight next week if your sets feel too easy (RPE 7 or lower).
                  </p>
                </div>
                <button
                  onClick={setAutoOverloadEnabled}
                  className="text-white-adj focus:outline-none cursor-pointer transition-colors"
                >
                  {autoOverloadEnabled ? <ToggleRight size={38} className="text-zinc-300-adj" /> : <ToggleLeft size={38} className="text-zinc-600" />}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Toggle 3: Haptic Feedback */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Haptic Vibrations
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Physical vibration confirmations on logged sets, rest timer completions, and milestones.
                  </p>
                </div>
                <button
                  onClick={toggleHaptic}
                  className="text-white-adj focus:outline-none cursor-pointer transition-colors"
                >
                  {hapticEnabled ? <ToggleRight size={38} className="text-zinc-300-adj" /> : <ToggleLeft size={38} className="text-zinc-600" />}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Health Sync Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Health Integrations
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Synchronize your weight logs, energy burned, and workouts to Apple Health or Google Fit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (healthConnected !== 'none') {
                      setHealthConnected('none');
                      localStorage.setItem('forma_health_sync', 'none');
                      setShowToast('Disconnected from health platforms.');
                      setTimeout(() => setShowToast(null), 2500);
                    } else {
                      setShowHealthModal(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    healthConnected !== 'none'
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-white-adj'
                  }`}
                >
                  {healthConnected === 'apple' ? 'Apple Connected' : healthConnected === 'google' ? 'Google Connected' : 'Connect Health'}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Push Notifications Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    PWA Reminders
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Enable daily mobility, water, and rest day check-in reminders.
                  </p>
                </div>
                <button
                  onClick={requestNotificationPermission}
                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    notificationsEnabled
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-white-adj'
                  }`}
                >
                  {notificationsEnabled ? 'Reminders Active' : 'Enable Reminders'}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Measurement Units */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Measurement Units
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Switch between Metric (kg, cm, km) and Imperial (lbs, feet-inches, miles).
                  </p>
                </div>
                <button
                  onClick={() => {
                    const nextUnits = userProfile.units === 'imperial' ? 'metric' : 'imperial';
                    onUpdateProfile({ ...userProfile, units: nextUnits });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white-adj uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                >
                  {userProfile.units === 'imperial' ? 'Imperial' : 'Metric'}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    Interface Theme
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Switch between Obsidian Dark and Swiss Minimalist Light modes.
                  </p>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white-adj uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                >
                  {theme === 'light' ? 'Light' : 'Dark'}
                </button>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Onboarding Tour */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xs font-semibold text-white-adj">
                    App Introduction
                  </h3>
                  <p className="text-[10px] text-zinc-500-adj mt-0.5 leading-normal font-light">
                    Replay the 3-slide introduction guide to muscle decay and CNS auto-overloads.
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white-adj uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                >
                  Replay Tour
                </button>
              </div>
            </div>
          </motion.div>

          {/* Program Parameters */}
          <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-5 w-full">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={14} className="text-zinc-500-adj" />
              <span className="text-[10px] font-bold text-zinc-400-adj uppercase tracking-widest">
                Training Targets
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500-adj">Suggested Workout Time</span>
                <span className="text-white-adj font-mono">60 Minutes</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500-adj">Scheduled Days</span>
                <span className="text-white-adj font-mono">Mon / Tue / Thu / Fri</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500-adj">Cardio Target</span>
                <span className="text-white-adj font-mono">30 Min LISS Incline Walking</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500-adj">Program Status</span>
                <span className="text-white-adj font-mono text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                  On Track
                </span>
              </div>
            </div>
          </motion.div>

          {/* Advanced Control (Sign Out & Reset) */}
          <motion.div variants={itemVariants} className="w-full grid grid-cols-2 gap-4">
            <button
              onClick={onSignOut}
              className="py-4 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs text-white-adj font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Sign Out
            </button>
            <button
              onClick={() => {
                setShowResetConfirm(true);
              }}
              className="py-4 border border-red-950/20 bg-red-950/5 hover:bg-red-950/15 text-xs text-red-400 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 size={12} />
              Reset Data
            </button>
          </motion.div>
        </div>

      </div>

      {/* Info Warning */}
      <motion.div
        variants={itemVariants}
        className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01] w-full"
      >
        <Info size={16} className="text-zinc-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 leading-normal">
          Your workout history is synchronized to Supabase and cached locally in your browser.
        </p>
      </motion.div>

      {/* Premium Sliding Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 z-50 p-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-3 max-w-sm mx-auto pointer-events-none"
          >
            <Sparkles className="text-cyan-400 flex-shrink-0 animate-pulse" size={18} />
            <p className="text-xs text-white font-medium">{showToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apple Health / Google Fit Mock Consent Modal */}
      <AnimatePresence>
        {showHealthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border-white/10 bg-obsidian rounded-3xl p-6 max-w-sm w-full text-center relative z-50 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-950/20 border border-cyan-900/30 flex items-center justify-center mx-auto mb-4 text-cyan-400">
                <Heart size={24} className="animate-pulse" />
              </div>
              
              <h3 className="text-lg font-bold text-white-adj mb-2">Connect Health Platform</h3>
              <p className="text-xs text-zinc-400-adj mb-6 leading-relaxed">
                FORMA requires read/write access to sync workouts, active energy, weight history, and heart rate details.
              </p>
              
              <div className="space-y-2 mb-6 text-left border-y border-white/5 py-4">
                <div className="flex items-center gap-2.5 text-xs text-zinc-300-adj">
                  <Check size={14} className="text-emerald-400" />
                  <span>Workouts & Fitness Records</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-300-adj">
                  <Check size={14} className="text-emerald-400" />
                  <span>Active Energy (Calories Burned)</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-300-adj">
                  <Check size={14} className="text-emerald-400" />
                  <span>Body Mass & Weight ledger</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => handleConnectPlatform('apple')}
                  className="py-3 bg-white text-black text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200 transition-colors"
                >
                  <Smartphone size={12} />
                  Apple Health
                </button>
                <button
                  onClick={() => handleConnectPlatform('google')}
                  className="py-3 bg-white text-black text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200 transition-colors"
                >
                  <Smartphone size={12} />
                  Google Fit
                </button>
              </div>
              
              <button
                onClick={() => setShowHealthModal(false)}
                className="w-full py-2.5 border border-white/5 bg-white/5 hover:bg-white/10 text-white-adj text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border-red-950/30 bg-obsidian rounded-3xl p-6 max-w-sm w-full text-center relative z-50 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-400 animate-pulse">
                <AlertTriangle size={24} />
              </div>
              
              <h3 className="text-lg font-bold text-white-adj mb-2">Reset Entire Training History?</h3>
              <p className="text-xs text-zinc-400-adj mb-6 leading-relaxed">
                This is a structural reset. Your entire workout history, target progressions, and custom split parameters will be completely wiped from the database. This action is irreversible.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white-adj text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowResetConfirm(false);
                    await onResetData();
                    setShowToast('All workout data has been reset.');
                    setTimeout(() => setShowToast(null), 3000);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active-glow shadow-lg shadow-red-600/25"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
