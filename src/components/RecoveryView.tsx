'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSession } from '@/constants/workout';
import { ArrowLeft, Check, Compass, Info, Heart, Play, Pause, Square, Navigation, MapPin } from 'lucide-react';

interface RecoveryViewProps {
  session: WorkoutSession;
  onBack: () => void;
  onLogRecovery: (logs: {
    activity: string;
    duration: number;
    recoveryRate: number;
    distance?: number;
    calories?: number;
    avgSpeed?: number;
    path?: Array<{ lat: number; lng: number; time: number }>;
  }) => void;
  weight: number;
  units: 'metric' | 'imperial';
}

export default function RecoveryView({ session, onBack, onLogRecovery, weight, units }: RecoveryViewProps) {
  const [activity, setActivity] = useState('Fast Walking');
  const [recoveryRate, setRecoveryRate] = useState(8);

  // GPS Tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [gpsPath, setGpsPath] = useState<Array<{ lat: number; lng: number; time: number }>>([]);
  const [gpsSimulator, setGpsSimulator] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Off');

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activities = [
    { name: 'Jogging', desc: 'Heart rate Zone 2 focus', met: 7.5 },
    { name: 'Swimming', desc: 'Full body decompression', met: 6.0 },
    { name: 'Fast Walking', desc: 'Low stress joint flush', met: 3.8 }
  ];

  const activeMet = activities.find(a => a.name === activity)?.met || 3.8;

  // Convert Units for display
  const isImperial = units === 'imperial';
  const speedDisplay = isImperial ? currentSpeedKmh * 0.621371 : currentSpeedKmh;
  const distanceDisplay = isImperial ? distanceKm * 0.621371 : distanceKm;

  // Haversine formula to compute distance between two coords in km
  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Timer tick effect
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const nextSecs = prev + 1;
          
          // ACSM recovery calories formula
          // CaloriesPerMinute = METs * 3.5 * weight / 200
          const calsPerMin = (activeMet * 3.5 * weight) / 200;
          setCaloriesBurned((calsPerMin * nextSecs) / 60);

          // Simulated GPS updates (runs on mock coordinates)
          if (gpsSimulator && nextSecs % 3 === 0) {
            // Generate circular path starting from mock base location
            const baseLat = 37.7749;
            const baseLng = -122.4194;
            const angle = (nextSecs / 120) * Math.PI * 2;
            const radius = 0.0015; // path radius scale
            
            const newLat = baseLat + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.0001;
            const newLng = baseLng + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.0001;

            setGpsPath(prevPath => {
              const newCoord = { lat: newLat, lng: newLng, time: Date.now() };
              const updatedPath = [...prevPath, newCoord];
              
              if (prevPath.length > 0) {
                const prevCoord = prevPath[prevPath.length - 1];
                const segmentDist = calculateHaversine(prevCoord.lat, prevCoord.lng, newLat, newLng);
                setDistanceKm(d => d + segmentDist);
                
                // Speed in km/h: distance in km / time in hours
                const timeDiffHours = 3 / 3600; // 3 seconds segment
                setCurrentSpeedKmh(segmentDist / timeDiffHours);
              } else {
                setCurrentSpeedKmh(activity === 'Jogging' ? 9.5 : 5.2);
              }
              
              return updatedPath;
            });
          }

          return nextSecs;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTracking, isPaused, activeMet, weight, gpsSimulator, activity]);

  // Canvas map drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    canvas.width = canvas.parentElement?.clientWidth || 360;
    canvas.height = 200;

    // Fill background
    ctx.fillStyle = '#060B12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw procedural grid (diagonal avenues)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let offset = -canvas.height; offset < canvas.width; offset += 80) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + canvas.height, canvas.height);
    }
    ctx.stroke();

    // Draw building blocks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.005)';
    const blockSz = 60;
    for (let x = 10; x < canvas.width; x += 90) {
      for (let y = 10; y < canvas.height; y += 80) {
        ctx.fillRect(x, y, blockSz, blockSz - 10);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.strokeRect(x, y, blockSz, blockSz - 10);
      }
    }

    // Draw coordinate radar grids
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Canvas Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    if (gpsPath.length < 2) {
      // Draw locking target
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '9px monospace';
      ctx.fillText(
        isTracking ? 'AUTONOMIC PATH PLOTTER: GPS LOCK ACTIVE' : 'GPS LOCK PENDING... START LOGGING',
        canvas.width / 2,
        canvas.height / 2
      );

      // Radar rings
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Map GPS latitude/longitude bounding box to local canvas layout
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    gpsPath.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;

    // Add 15% padding
    const latPadding = latRange * 0.15;
    const lngPadding = lngRange * 0.15;

    const paddedMinLat = minLat - latPadding;
    const paddedMaxLat = maxLat + latPadding;
    const paddedMinLng = minLng - lngPadding;
    const paddedMaxLng = maxLng + lngPadding;

    const paddedLatRange = paddedMaxLat - paddedMinLat;
    const paddedLngRange = paddedMaxLng - paddedMinLng;

    // Draw speed segments
    for (let i = 1; i < gpsPath.length; i++) {
      const prevPt = gpsPath[i - 1];
      const pt = gpsPath[i];

      const x1 = ((prevPt.lng - paddedMinLng) / paddedLngRange) * canvas.width;
      const y1 = ((paddedMaxLat - prevPt.lat) / paddedLatRange) * canvas.height;
      const x2 = ((pt.lng - paddedMinLng) / paddedLngRange) * canvas.width;
      const y2 = ((paddedMaxLat - pt.lat) / paddedLatRange) * canvas.height;

      // Haversine distance
      const dLat = ((pt.lat - prevPt.lat) * Math.PI) / 180;
      const dLon = ((pt.lng - prevPt.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prevPt.lat * Math.PI) / 180) *
          Math.cos((pt.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c; // in km

      const timeDiffHrs = (pt.time - prevPt.time) / 3600000;
      const segmentSpeed = timeDiffHrs > 0 ? dist / timeDiffHrs : 0;

      // Color rules: Fast (>= 5.5 km/h) = cyan, moderate (3.5 to 5.5) = amber, slow/paused (< 3.5) = crimson
      let color = '#22D3EE'; // Cyan
      if (segmentSpeed < 3.5) {
        color = '#FF3355'; // Crimson
      } else if (segmentSpeed < 5.5) {
        color = '#FFAA00'; // Amber
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw Start Marker (green)
    const startX = ((gpsPath[0].lng - paddedMinLng) / paddedLngRange) * canvas.width;
    const startY = ((paddedMaxLat - gpsPath[0].lat) / paddedLatRange) * canvas.height;
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(startX, startY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Pulsing Current Location Marker (red)
    const curPt = gpsPath[gpsPath.length - 1];
    const curX = ((curPt.lng - paddedMinLng) / paddedLngRange) * canvas.width;
    const curY = ((paddedMaxLat - curPt.lat) / paddedLatRange) * canvas.height;
    
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(curX, curY, 12, 0, Math.PI * 2);
    ctx.stroke();
  }, [gpsPath, isTracking]);

  const handleStartTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    setGpsStatus(gpsSimulator ? 'Mock Active' : 'Searching GPS...');

    if (!gpsSimulator) {
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          position => {
            const { latitude, longitude, speed } = position.coords;
            setGpsStatus('GPS Locked');

            setGpsPath(prevPath => {
              const newCoord = { lat: latitude, lng: longitude, time: Date.now() };
              const updatedPath = [...prevPath, newCoord];

              if (prevPath.length > 0) {
                const prevPt = prevPath[prevPath.length - 1];
                const segmentDist = calculateHaversine(prevPt.lat, prevPt.lng, latitude, longitude);
                
                // Filter out small GPS jitter noise (< 3 meters)
                if (segmentDist > 0.003) {
                  setDistanceKm(d => d + segmentDist);
                  if (speed !== null && speed >= 0) {
                    setCurrentSpeedKmh(speed * 3.6); // m/s to km/h
                  } else {
                    // Estimate speed
                    const timeDiffHrs = (Date.now() - prevPt.time) / 3600000;
                    setCurrentSpeedKmh(segmentDist / timeDiffHrs);
                  }
                }
              } else {
                setCurrentSpeedKmh(speed !== null && speed >= 0 ? speed * 3.6 : 0);
              }

              return updatedPath;
            });
          },
          err => {
            console.error(err);
            setGpsStatus('GPS Error: ' + err.message);
          },
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        setGpsStatus('Geolocation Unsupported');
      }
    }
  };

  const handlePauseTracking = () => {
    setIsPaused(prev => !prev);
  };

  const handleStopAndLog = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    setIsTracking(false);

    // Call callback to store stats
    onLogRecovery({
      activity,
      duration: Math.round(elapsedSeconds / 60) || 1,
      recoveryRate,
      distance: parseFloat(distanceKm.toFixed(2)),
      calories: Math.round(caloriesBurned),
      avgSpeed: parseFloat((elapsedSeconds > 0 ? (distanceKm / (elapsedSeconds / 3600)) : 0).toFixed(1)),
      path: gpsPath
    });
  };

  // Cleanup watchers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const formatElapsedTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs.toString() + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    <div className="min-h-screen bg-obsidian text-foreground flex flex-col justify-between pt-6 pb-12 px-4 max-w-md mx-auto relative overflow-y-auto">
      
      {/* Soft blue glow backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-cyan-400">
            Wednesday: Recovery Day
          </span>
          <h1 className="text-sm font-semibold text-white uppercase tracking-wider">
            {session.title} &mdash; {session.focus}
          </h1>
        </div>
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-cyan-950/20 border border-cyan-900/20 text-cyan-400">
          <Heart size={14} className="animate-pulse" />
        </div>
      </div>

      {/* Main Container */}
      {!isTracking ? (
        /* Configuration Screen */
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 flex flex-col justify-center gap-6 relative z-10"
        >
          {/* Concept Card */}
          <motion.div variants={itemVariants} className="glass-panel border-cyan-950/20 bg-cyan-950/5 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-3 text-cyan-400">
              <Compass size={16} />
              <span className="text-[10px] uppercase font-bold tracking-widest">
                Recovery System
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              Steady cardio helps muscles recover and improves heart health. Turn on GPS tracking to log your route, distance, and calories burned.
            </p>
          </motion.div>

          {/* Activity selector */}
          <motion.div variants={itemVariants} className="flex flex-col gap-2.5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">
              Select Activity
            </span>
            
            <div className="flex flex-col gap-2">
              {activities.map((act) => {
                const isSelected = act.name === activity;
                return (
                  <button
                    key={act.name}
                    onClick={() => setActivity(act.name)}
                    className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500/30 bg-cyan-950/20 text-white shadow-lg'
                        : 'border-white/5 bg-white/[0.01] text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider">{act.name}</h3>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{act.desc}</p>
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Settings block for Simulator */}
          <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-4 flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-white block">GPS Route Simulator</span>
              <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">Simulate mock coordinates path. Use for indoor/testing checks.</p>
            </div>
            <input
              type="checkbox"
              checked={gpsSimulator}
              onChange={(e) => setGpsSimulator(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </motion.div>

          {/* Recovery rate index */}
          <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                How Recovered Do You Feel?
              </label>
              <span className="text-xs font-bold text-cyan-400 tabular-nums">
                {recoveryRate}/10
              </span>
            </div>
            
            <div className="flex gap-1 py-1">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRecoveryRate(i + 1)}
                  className={`h-6 flex-1 rounded-sm border transition-colors cursor-pointer ${
                    i < recoveryRate
                      ? 'bg-cyan-500/20 border-cyan-500/30'
                      : 'border-white/5 bg-white/5'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* CTA Start GPS Tracking */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartTracking}
            className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow"
          >
            <Navigation size={14} className="animate-pulse" />
            Start GPS Tracking
          </motion.button>
        </motion.div>
      ) : (
        /* Live Tracking Screen */
        <div className="flex-1 flex flex-col justify-between gap-6 relative z-10">
          {/* Active Status Header */}
          <div className="glass-panel rounded-2xl p-4 flex justify-between items-center bg-cyan-950/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                {activity} Active
              </span>
            </div>
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {gpsStatus}
            </span>
          </div>

          {/* Time & Calorie Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Duration
              </span>
              <p className="text-xl font-extrabold text-white font-mono tabular-nums leading-none">
                {formatElapsedTime(elapsedSeconds)}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Distance
              </span>
              <p className="text-xl font-extrabold text-white font-mono tabular-nums leading-none">
                {distanceDisplay.toFixed(2)} <span className="text-[9px] font-normal text-zinc-400 uppercase tracking-normal">{isImperial ? 'mi' : 'km'}</span>
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                Calories Burned
              </span>
              <p className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums leading-none">
                {Math.round(caloriesBurned)} <span className="text-[9px] font-normal text-zinc-400 uppercase tracking-normal">kcal</span>
              </p>
            </div>
          </div>

          {/* Live Path Map Canvas */}
          <div className="w-full rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
            <canvas ref={canvasRef} className="w-full block" />
            
            {/* Speed HUD overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 border border-white/10 px-2 py-1 rounded text-[8px] font-mono text-zinc-300">
              <MapPin size={10} className="text-cyan-400" />
              SPEED: {speedDisplay.toFixed(1)} {isImperial ? 'mph' : 'km/h'}
            </div>
          </div>

          {/* Recovery rate check in real-time */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                Recovery Level
              </label>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {recoveryRate}/10
              </span>
            </div>
            <div className="flex gap-1 py-1">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRecoveryRate(i + 1)}
                  className={`h-5 flex-1 rounded-sm border transition-colors cursor-pointer ${
                    i < recoveryRate ? 'bg-cyan-500/20 border-cyan-500/30' : 'border-white/5 bg-white/5'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions Controls (Pause/Resume, Stop) */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handlePauseTracking}
              className="py-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isPaused ? (
                <>
                  <Play size={12} fill="white" /> Resume
                </>
              ) : (
                <>
                  <Pause size={12} fill="white" /> Pause
                </>
              )}
            </button>

            <button
              onClick={handleStopAndLog}
              className="py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active-glow shadow-lg shadow-cyan-600/20"
            >
              <Square size={12} fill="white" /> Save Workout
            </button>
          </div>
        </div>
      )}

      {/* Info footer */}
      {!isTracking && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01] mt-6 relative z-10">
          <Info size={16} className="text-zinc-600 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-zinc-500 leading-normal font-light">
            Recovery sessions are logged in your training history to track your overall physical activity without affecting your strength workouts.
          </p>
        </div>
      )}
    </div>
  );
}
