'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Check, ShieldCheck, Dumbbell, MapPin, Zap } from 'lucide-react';
import { UserProfile } from '@/types/workout';
import { useApp } from '@/context/AppContext';
import { computeEstimated1RM, computeTotalTonnage } from '@/constants/workout';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  sessionFocus: string;
  actualTonnage: number;
  exerciseCount: number;
  userProfile: UserProfile;
  sessionType?: 'workout' | 'recovery';
  logs?: any;
  cardioDetails?: {
    duration?: number;
    workoutDuration?: number;
    distance?: number;
    calories?: number;
    speed?: number;
    incline?: number;
    units?: 'metric' | 'imperial';
  };
  recoveryDetails?: {
    activity: string;
    duration: number;
    recoveryRate: number;
    distance?: number;
    calories?: number;
    avgSpeed?: number;
    path?: Array<{ lat: number; lng: number; time: number }>;
  };
}

export default function ShareCardModal({
  isOpen,
  onClose,
  sessionTitle,
  sessionFocus,
  actualTonnage,
  exerciseCount,
  userProfile,
  sessionType = 'workout',
  logs,
  cardioDetails,
  recoveryDetails
}: ShareCardModalProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [cardStyle, setCardStyle] = useState<'technical' | 'wrapped'>('wrapped');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { sessions } = useApp();

  // Compute Units conversions for displays
  const isImperialSetting = userProfile.units === 'imperial';
  
  // 1. Calculations for Workout Stats
  let totalSets = 0;
  let sumRpe = 0;
  let rpeCount = 0;
  let topLiftName = '';
  let topLiftWeight = 0;
  let topLiftReps = 0;
  let totalEffectiveReps = 0;

  if (logs) {
    Object.keys(logs).forEach(exId => {
      const sets = logs[exId];
      if (Array.isArray(sets)) {
        const workingSets = sets.filter((s: any) => s && !s.isWarmup);
        totalSets += workingSets.length;
        workingSets.forEach((s: any) => {
          const rpeVal = typeof s.rpe === 'number' ? s.rpe : 8;
          const repsVal = typeof s.reps === 'number' ? s.reps : 0;
          const weightVal = typeof s.weight === 'number' ? s.weight : 0;

          sumRpe += rpeVal;
          rpeCount++;

          if (weightVal > topLiftWeight) {
            topLiftWeight = weightVal;
            topLiftName = exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            topLiftReps = repsVal;
          }
          // Effective Reps = max(0, min(reps, 5 - (10 - RPE)))
          const eff = Math.max(0, Math.min(repsVal, 5 - (10 - rpeVal)));
          totalEffectiveReps += eff;
        });
      }
    });
  }

  const avgRpe = rpeCount > 0 ? (sumRpe / rpeCount).toFixed(1) : '8.0';
  const topLift1RMEst = topLiftWeight > 0 ? Math.round(computeEstimated1RM(topLiftWeight, topLiftReps)) : 0;

  // Weight Displays
  const displayWeight = (wKg: number) => {
    return isImperialSetting 
      ? `${Math.round(wKg * 2.20462)} lbs` 
      : `${wKg} kg`;
  };

  const displayTonnage = () => {
    const tonVal = isImperialSetting ? actualTonnage * 2.20462 : actualTonnage;
    return `${Math.round(tonVal).toLocaleString()} ${isImperialSetting ? 'lbs' : 'kg'}`;
  };

  // 2. Local canvas drawing logic on mount/open
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure canvas element ref is loaded
    const timeout = setTimeout(() => {
      drawCanvas();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isOpen, userProfile, logs, cardioDetails, recoveryDetails, cardStyle]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cardStyle === 'technical') {
      drawTechnicalCanvas(ctx, canvas);
    } else {
      drawWrappedCanvas(ctx, canvas);
    }
  };

  const drawTechnicalCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {

    const setLetterSpacing = (val: string) => {
      if ('letterSpacing' in ctx) {
        try {
          (ctx as any).letterSpacing = val;
        } catch (e) {
          // ignore
        }
      }
    };

    // Dimensions: 1080 x 1920 (Instagram Story 9:16 Portrait ratio)
    canvas.width = 1080;
    canvas.height = 1920;

    // Background color
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, 1080, 1920);

    // Ambient radial gradients
    const grad1 = ctx.createRadialGradient(800, 300, 50, 800, 300, 700);
    grad1.addColorStop(0, 'rgba(34, 211, 238, 0.04)'); // Cyan soft glow
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, 1080, 1920);

    const grad2 = ctx.createRadialGradient(200, 1500, 50, 200, 1500, 600);
    grad2.addColorStop(0, 'rgba(16, 185, 129, 0.03)'); // Emerald soft glow
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Technical Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const gridSpacing = 80;
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

    // Double Border Outline Frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 960, 1800);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 80, 920, 1760);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px "Courier New", Courier, monospace';
    setLetterSpacing('10px');
    ctx.textAlign = 'center';
    ctx.fillText('FORMA', 540, 190);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '500 20px "Courier New", Courier, monospace';
    setLetterSpacing('6px');
    ctx.fillText('WORKOUT TRACKER', 540, 235);

    // Header divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 280);
    ctx.lineTo(960, 280);
    ctx.stroke();

    // User Biometrics Block
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 18px "Courier New", Courier, monospace';
    setLetterSpacing('2px');
    ctx.fillText('USER PROFILE:', 120, 360);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    setLetterSpacing('0px');
    ctx.fillText(userProfile.name.toUpperCase(), 120, 410);

    // Biometrics Row Table
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(120, 460, 840, 130);
    
    // Weight Display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillText('WEIGHT', 160, 505);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    const weightDisplayVal = isImperialSetting 
      ? `${(userProfile.weight * 2.20462).toFixed(1)} LBS` 
      : `${userProfile.weight.toFixed(1)} KG`;
    ctx.fillText(weightDisplayVal, 160, 550);

    // Height Display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillText('HEIGHT', 440, 505);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    const heightDisplayVal = isImperialSetting
      ? `${Math.floor((userProfile.height / 2.54) / 12)}'${Math.round((userProfile.height / 2.54) % 12)}"`
      : `${userProfile.height} CM`;
    ctx.fillText(heightDisplayVal, 440, 550);

    // Body Fat Display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillText('BODY FAT', 720, 505);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${userProfile.bodyFat}%`, 720, 550);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(120, 640);
    ctx.lineTo(960, 640);
    ctx.stroke();

    // 3. MORPH BASED ON SESSION TYPE
    if (sessionType === 'workout') {
      // workout title
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillText('WORKOUT SUMMARY LOG:', 120, 700);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(sessionTitle.toUpperCase(), 120, 760);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '500 24px sans-serif';
      ctx.fillText(sessionFocus, 120, 810);

      // Workout session duration on the right
      const durationMin = cardioDetails?.workoutDuration 
        ? Math.max(1, Math.round(cardioDetails.workoutDuration / 60)) 
        : 0;
      if (durationMin > 0) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 18px "Courier New", Courier, monospace';
        setLetterSpacing('2px');
        ctx.fillText(`${durationMin} ${durationMin === 1 ? 'MIN' : 'MINS'} SESSION`, 960, 810);
        setLetterSpacing('0px');
        ctx.textAlign = 'left'; // Reset
      }

      // Large Stats Grid Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(120, 860, 840, 240);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(120, 860, 840, 240);

      // Columns inside stats box
      // Column A: Tonnage
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('TOTAL WEIGHT LIFTED', 300, 910);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 54px sans-serif';
      const tonVal = isImperialSetting ? actualTonnage * 2.20462 : actualTonnage;
      ctx.fillText(Math.round(tonVal).toLocaleString(), 300, 990);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px "Courier New", Courier, monospace';
      ctx.fillText(isImperialSetting ? 'LBS' : 'KG', 300, 1040);

      // Column divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(540, 880);
      ctx.lineTo(540, 1080);
      ctx.stroke();

      // Column B: Growth Reps
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('GROWTH STIMULUS', 720, 910);
      ctx.fillStyle = '#06B6D4'; // Cyan
      ctx.font = 'extrabold 54px sans-serif';
      ctx.fillText(`${totalEffectiveReps}`, 720, 990);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px "Courier New", Courier, monospace';
      ctx.fillText('GROWTH REPS', 720, 1040);

      // Technical Strength indicators row
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(120, 1130, 840, 130);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeRect(120, 1130, 840, 130);

      ctx.textAlign = 'left';
      setLetterSpacing('2px');

      // Column 1: Total Sets
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '16px "Courier New", Courier, monospace';
      ctx.fillText('TOTAL SETS', 160, 1175);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      setLetterSpacing('0px');
      ctx.fillText(`${totalSets} COMPLETED`, 160, 1220);

      // Column 2: Avg Difficulty
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '16px "Courier New", Courier, monospace';
      setLetterSpacing('2px');
      ctx.fillText('DIFFICULTY', 440, 1175);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      setLetterSpacing('0px');
      ctx.fillText(`${avgRpe}/10 RPE`, 440, 1220);

      // Column 3: Est Max Lift
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '16px "Courier New", Courier, monospace';
      setLetterSpacing('2px');
      ctx.fillText('EST MAX LIFT', 680, 1175);
      ctx.fillStyle = '#34D399'; // Emerald
      ctx.font = 'bold 24px sans-serif';
      setLetterSpacing('0px');
      const oneRmText = topLiftWeight > 0 
        ? `${displayWeight(topLift1RMEst)} (${topLiftName.slice(0, 12)})` 
        : '0 KG';
      ctx.fillText(oneRmText, 680, 1220);

      // Detailed exercises printout console
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillText('WORKOUT DETAIL LOGS:', 120, 1290);

      if (logs) {
        let printY = 1340;
        const exKeys = Object.keys(logs).slice(0, 4); // Limit to top 4 exercises
        ctx.font = '14px "Courier New", Courier, monospace';
        
        exKeys.forEach((exId, idx) => {
          const sets = logs[exId];
          let maxLoad = 0;
          let maxLoadReps = 0;
          let maxLoadRpe = 0;
          sets.forEach((s: any) => {
            if (s.weight > maxLoad) {
              maxLoad = s.weight;
              maxLoadReps = s.reps;
              maxLoadRpe = s.rpe;
            }
          });
          
          const exName = exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(`[0${idx + 1}] ${exName.slice(0, 24).padEnd(24, ' ')}`, 120, printY);
          
          ctx.fillStyle = '#FFFFFF';
          const statsLabel = `| ${sets.length} Sets | Max: ${displayWeight(maxLoad)} x ${maxLoadReps} @ RPE ${maxLoadRpe}`;
          ctx.fillText(statsLabel, 440, printY);
          printY += 40;
        });
      }

      // Treadmill Finisher Stats card
      if (cardioDetails) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(120, 1515, 840, 105);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; // Cyan border glow
        ctx.strokeRect(120, 1515, 840, 105);

        ctx.fillStyle = '#22D3EE';
        ctx.font = 'bold 12px "Courier New", Courier, monospace';
        ctx.fillText('CARDIO FINISHER: TREADMILL WALK', 140, 1545);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px sans-serif';
        const cardioUnitsLabel = cardioDetails.units === 'imperial' ? 'miles' : 'km';
        const speedUnitsLabel = cardioDetails.units === 'imperial' ? 'mph' : 'km/h';
        const cardioText = `Duration: ${cardioDetails.duration} Mins | Dist: ${cardioDetails.distance} ${cardioUnitsLabel} | Incline: ${cardioDetails.incline}% | Speed: ${cardioDetails.speed} ${speedUnitsLabel} | Burn: ${cardioDetails.calories} kcal`;
        ctx.fillText(cardioText, 140, 1585);
      }
    } else {
      // 4. RECOVERY DAY GPS PATH RENDERING
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillText('RECOVERY LOG:', 120, 700);

      ctx.fillStyle = '#22D3EE'; // Cyan
      ctx.font = 'bold 44px sans-serif';
      const actTitle = recoveryDetails?.activity || 'FAST WALKING';
      ctx.fillText(actTitle.toUpperCase(), 120, 760);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '500 24px sans-serif';
      ctx.fillText(sessionFocus, 120, 810);

      // GPS Route Plotting radar box in the center
      const radarX = 120;
      const radarY = 860;
      const radarW = 840;
      const radarH = 460;

      ctx.fillStyle = '#060B12';
      ctx.fillRect(radarX, radarY, radarW, radarH);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(radarX, radarY, radarW, radarH);

      // Draw radar grids
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      const radGrid = 46;
      for (let rx = radarX; rx < radarX + radarW; rx += radGrid) {
        ctx.beginPath();
        ctx.moveTo(rx, radarY);
        ctx.lineTo(rx, radarY + radarH);
        ctx.stroke();
      }
      for (let ry = radarY; ry < radarY + radarH; ry += radGrid) {
        ctx.beginPath();
        ctx.moveTo(radarX, ry);
        ctx.lineTo(radarX + radarW, ry);
        ctx.stroke();
      }

      // Compass indicators in corners
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '12px monospace';
      ctx.fillText('N 00.00°', radarX + 20, radarY + 30);
      ctx.fillText('S 180.00°', radarX + 20, radarY + radarH - 20);
      ctx.textAlign = 'right';
      ctx.fillText('E 90.00°', radarX + radarW - 20, radarY + 30);
      ctx.fillText('W 270.00°', radarX + radarW - 20, radarY + radarH - 20);
      ctx.textAlign = 'left';

      // Draw building blocks inside radar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.003)';
      const blockSz = 60;
      for (let bx = radarX + 10; bx < radarX + radarW; bx += 90) {
        for (let by = radarY + 10; by < radarY + radarH; by += 80) {
          ctx.fillRect(bx, by, blockSz, blockSz - 10);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
          ctx.strokeRect(bx, by, blockSz, blockSz - 10);
        }
      }

      // Plot route path if coords exist
      const path = recoveryDetails?.path;
      if (path && path.length >= 2) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        path.forEach(p => {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lng < minLng) minLng = p.lng;
          if (p.lng > maxLng) maxLng = p.lng;
        });

        const latRange = maxLat - minLat || 0.0001;
        const lngRange = maxLng - minLng || 0.0001;

        const latPadding = latRange * 0.15;
        const lngPadding = lngRange * 0.15;

        const paddedMinLat = minLat - latPadding;
        const paddedMaxLat = maxLat + latPadding;
        const paddedMinLng = minLng - lngPadding;
        const paddedMaxLng = maxLng + lngPadding;

        const paddedLatRange = paddedMaxLat - paddedMinLat;
        const paddedLngRange = paddedMaxLng - paddedMinLng;

        // Draw speed segments
        for (let i = 1; i < path.length; i++) {
          const prevPt = path[i - 1];
          const pt = path[i];

          const x1 = radarX + ((prevPt.lng - paddedMinLng) / paddedLngRange) * radarW;
          const y1 = radarY + ((paddedMaxLat - prevPt.lat) / paddedLatRange) * radarH;
          const x2 = radarX + ((pt.lng - paddedMinLng) / paddedLngRange) * radarW;
          const y2 = radarY + ((paddedMaxLat - pt.lat) / paddedLatRange) * radarH;

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
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          
          // Draw with glowing shadow
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.shadowBlur = 0; // Reset shadow

        // Green start node
        const sX = radarX + ((path[0].lng - paddedMinLng) / paddedLngRange) * radarW;
        const sY = radarY + ((paddedMaxLat - path[0].lat) / paddedLatRange) * radarH;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(sX, sY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Red end node
        const eX = radarX + ((path[path.length - 1].lng - paddedMinLng) / paddedLngRange) * radarW;
        const eY = radarY + ((paddedMaxLat - path[path.length - 1].lat) / paddedLatRange) * radarH;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(eX, eY, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw coordinate loading
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '18px monospace';
        ctx.fillText('NO GPS VECTOR ROUTE DATA FOR THIS LOG', radarX + radarW / 2, radarY + radarH / 2);
        ctx.textAlign = 'left';
      }

      // Display recovery stats below map
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillText('RECOVERY METRICS:', 120, 1370);

      // Stats table grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(120, 1400, 840, 200);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeRect(120, 1400, 840, 200);

      // Duration & Distance
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('TIME ELAPSED:', 160, 1450);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.duration || 0} Mins`, 300, 1450);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('GPS DISTANCE:', 160, 1500);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      const recDistVal = recoveryDetails?.distance || 0;
      const recDistLabel = isImperialSetting ? 'Miles' : 'km';
      ctx.fillText(`${recDistVal} ${recDistLabel}`, 300, 1500);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('AVG SPEED:', 160, 1550);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      const recSpeedVal = recoveryDetails?.avgSpeed || 0;
      const recSpeedLabel = isImperialSetting ? 'mph' : 'km/h';
      ctx.fillText(`${recSpeedVal} ${recSpeedLabel}`, 300, 1550);

      // Calorie burn & Recovery rate
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('CALORIES BURNED:', 550, 1450);
      ctx.fillStyle = '#EF4444'; // Red-orange energy
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.calories || 0} kCal`, 720, 1450);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('RECOVERY LEVEL:', 550, 1500);
      ctx.fillStyle = '#22D3EE'; // Cyan
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.recoveryRate || 0}/10 Index`, 720, 1500);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('STATUS:', 550, 1550);
      ctx.fillStyle = '#34D399'; // Emerald
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('RECOVERED', 720, 1550);
    }

    // Barcode and verification seal (Common bottom section)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(120, 1660);
    ctx.lineTo(960, 1660);
    ctx.stroke();

    // Barcode
    const barcodeX = 120;
    const barcodeY = 1690;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    let currentX = barcodeX;
    
    const pattern = [4, 12, 6, 2, 8, 14, 2, 6, 12, 4, 8, 6, 2, 10, 4, 12, 6, 2, 8, 10, 4];
    pattern.forEach((w, i) => {
      ctx.fillRect(currentX, barcodeY, w, 60);
      currentX += w + (i % 2 === 0 ? 4 : 8);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '14px "Courier New", Courier, monospace';
    ctx.fillText(`WORKOUT RECORD ID: FORMA-${Date.now().toString().slice(-8)}`, 120, 1780);

    // Timestamp right aligned
    ctx.textAlign = 'right';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
    ctx.fillText(dateStr, 960, 1720);
    ctx.fillText(sessionType === 'workout' ? 'STRENGTH PROGRAM' : 'RECOVERY DAY SESSION', 960, 1750);

    setDownloaded(false);
  };

  const drawWrappedCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const sessionObj = sessions?.find(s => s.title === sessionTitle);
    const rawTargetTonnage = sessionObj ? computeTotalTonnage(sessionObj) : 4000;
    const tonnageProgress = Math.min(100, Math.round((actualTonnage / rawTargetTonnage) * 100)) || 100;

    let targetReps = 0;
    if (sessionObj?.exercises) {
      sessionObj.exercises.forEach(ex => {
        if (ex.ghostSets) {
          ex.ghostSets.forEach(gs => {
            targetReps += gs.reps || 0;
          });
        }
      });
    }
    if (targetReps === 0) targetReps = 60;

    let actualReps = 0;
    if (logs) {
      Object.values(logs).forEach((sets: any) => {
        if (Array.isArray(sets)) {
          sets.forEach(s => {
            actualReps += s.reps || 0;
          });
        }
      });
    }
    if (actualReps === 0) actualReps = 65;
    const repsProgress = Math.min(100, Math.round((actualReps / targetReps) * 100)) || 100;

    const rawDuration = cardioDetails?.workoutDuration || 0;
    const actualDurationMins = Math.round(rawDuration / 60) || 45;
    const targetDurationMins = 45;
    const durationProgress = Math.min(100, Math.round((actualDurationMins / targetDurationMins) * 100)) || 100;

    const setLetterSpacing = (val: string) => {
      if ('letterSpacing' in ctx) {
        try {
          (ctx as any).letterSpacing = val;
        } catch (e) {
          // ignore
        }
      }
    };

    // Dimensions: 1080 x 1920
    canvas.width = 1080;
    canvas.height = 1920;

    // Mesh gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#1E0B36'); // Deep violet
    bgGrad.addColorStop(0.5, '#051E36'); // Deep navy
    bgGrad.addColorStop(1, '#020202'); // Black
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing blobs
    const blob1 = ctx.createRadialGradient(900, 400, 100, 900, 400, 800);
    blob1.addColorStop(0, 'rgba(244, 63, 94, 0.12)'); // Rose neon blob
    blob1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob1;
    ctx.fillRect(0, 0, 1080, 1920);

    const blob2 = ctx.createRadialGradient(200, 1300, 100, 200, 1300, 800);
    blob2.addColorStop(0, 'rgba(34, 211, 238, 0.12)'); // Cyan neon blob
    blob2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob2;
    ctx.fillRect(0, 0, 1080, 1920);

    const blob3 = ctx.createRadialGradient(540, 960, 50, 540, 960, 600);
    blob3.addColorStop(0, 'rgba(16, 185, 129, 0.08)'); // Emerald neon blob
    blob3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob3;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle diagonal lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 2;
    for (let i = -1000; i < 2000; i += 120) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 1000, 1920);
      ctx.stroke();
    }

    // Double Border Frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 960, 1800);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(75, 75, 930, 1770);

    // Branding Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 64px "Courier New", Courier, monospace';
    setLetterSpacing('12px');
    ctx.fillText('FORMA', 540, 180);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.7)'; // Neon cyan
    ctx.font = 'bold 20px sans-serif';
    setLetterSpacing('8px');
    ctx.fillText('SESSION PERFORMANCE WRAPPED', 540, 230);
    setLetterSpacing('0px');

    // Concentric Rings in center
    const centerX = 540;
    const centerY = 650;
    
    // Draw Tracks
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 115, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw active rings
    // Ring 1 (Tonnage) - White
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * tonnageProgress) / 100);
    ctx.stroke();

    // Ring 2 (Reps) - Cyan
    ctx.strokeStyle = '#22D3EE';
    ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 115, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * repsProgress) / 100);
    ctx.stroke();

    // Ring 3 (Duration) - Emerald
    ctx.strokeStyle = '#10B981';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * durationProgress) / 100);
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset shadow

    // Center Label text
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillText('CNS ACTIVE', centerX, centerY - 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'extrabold 32px sans-serif';
    ctx.fillText('100%', centerX, centerY + 25);

    // Dynamic stats display block
    if (sessionType === 'workout') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 56px sans-serif';
      ctx.fillText(sessionTitle.toUpperCase(), 540, 940);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(sessionFocus.toUpperCase(), 540, 990);

      // Box 1: Tonnage (Left)
      const b1X = 120;
      const bY = 1060;
      const bW = 390;
      const bH = 220;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(b1X, bY, bW, bH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(b1X, bY, bW, bH);
      
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('TOTAL TONNAGE', b1X + bW/2, bY + 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 48px sans-serif';
      const displayTon = isImperialSetting ? actualTonnage * 2.20462 : actualTonnage;
      ctx.fillText(Math.round(displayTon).toLocaleString(), b1X + bW/2, bY + 130);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(isImperialSetting ? 'LBS' : 'KG', b1X + bW/2, bY + 180);

      // Box 2: Growth Reps (Right)
      const b2X = 570;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(b2X, bY, bW, bH);
      ctx.strokeRect(b2X, bY, bW, bH);

      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('STIMULUS COMPLETED', b2X + bW/2, bY + 50);
      ctx.fillStyle = '#22D3EE';
      ctx.font = 'extrabold 48px sans-serif';
      ctx.fillText(`+${totalEffectiveReps}`, b2X + bW/2, bY + 130);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('GROWTH REPS', b2X + bW/2, bY + 180);

      // Box 3: Target setup (Wide box)
      const wY = 1320;
      const wW = 840;
      const wH = 140;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(120, wY, wW, wH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeRect(120, wY, wW, wH);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('PEAK LIFT IN BRIEF:', 150, wY + 45);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 22px sans-serif';
      const peakLiftStr = topLiftWeight > 0 
        ? `${topLiftName.toUpperCase()} | Max: ${displayWeight(topLift1RMEst)} (Est. 1RM)`
        : 'ACTIVE PROGRESSION RECORDED';
      ctx.fillText(peakLiftStr, 150, wY + 95);

      if (logs) {
        let printY = 1530;
        const exKeys = Object.keys(logs).slice(0, 3);
        ctx.font = '14px "Courier New", Courier, monospace';
        exKeys.forEach((exId, idx) => {
          const sets = logs[exId];
          let maxLoad = 0;
          let maxLoadReps = 0;
          sets.forEach((s: any) => {
            if (s.weight > maxLoad) {
              maxLoad = s.weight;
              maxLoadReps = s.reps;
            }
          });
          const exName = exId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(`• ${exName.slice(0, 20).padEnd(20, ' ')}`, 120, printY);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(`| Logged ${sets.length} sets [Peak load: ${displayWeight(maxLoad)} x ${maxLoadReps}]`, 400, printY);
          printY += 40;
        });
      }
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#22D3EE';
      ctx.font = 'extrabold 56px sans-serif';
      const actTitle = recoveryDetails?.activity || 'ACTIVE RECOVERY';
      ctx.fillText(actTitle.toUpperCase(), 540, 940);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(sessionFocus.toUpperCase(), 540, 990);

      const radarX = 120;
      const radarY = 1050;
      const radarW = 840;
      const radarH = 400;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.fillRect(radarX, radarY, radarW, radarH);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(radarX, radarY, radarW, radarH);
      ctx.lineWidth = 1;

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '12px monospace';
      ctx.fillText('N 00.00°', radarX + 20, radarY + 30);
      ctx.fillText('S 180.00°', radarX + 20, radarY + radarH - 20);

      const path = recoveryDetails?.path;
      if (path && path.length >= 2) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        path.forEach(p => {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lng < minLng) minLng = p.lng;
          if (p.lng > maxLng) maxLng = p.lng;
        });
        const latRange = maxLat - minLat || 0.0001;
        const lngRange = maxLng - minLng || 0.0001;
        const latPadding = latRange * 0.15;
        const lngPadding = lngRange * 0.15;
        const paddedMinLat = minLat - latPadding;
        const paddedMaxLat = maxLat + latPadding;
        const paddedMinLng = minLng - lngPadding;
        const paddedMaxLng = maxLng + lngPadding;
        const paddedLatRange = paddedMaxLat - paddedMinLat;
        const paddedLngRange = paddedMaxLng - paddedMinLng;

        for (let i = 1; i < path.length; i++) {
          const prevPt = path[i - 1];
          const pt = path[i];
          const x1 = radarX + ((prevPt.lng - paddedMinLng) / paddedLngRange) * radarW;
          const y1 = radarY + ((paddedMaxLat - prevPt.lat) / paddedLatRange) * radarH;
          const x2 = radarX + ((pt.lng - paddedMinLng) / paddedLngRange) * radarW;
          const y2 = radarY + ((paddedMaxLat - pt.lat) / paddedLatRange) * radarH;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = '#22D3EE';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      const bY = 1490;
      const bW = 260;
      const bH = 120;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(120, bY, bW, bH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeRect(120, bY, bW, bH);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.fillText('DURATION', 120 + bW/2, bY + 35);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.duration || 0} MINS`, 120 + bW/2, bY + 75);

      ctx.fillRect(410, bY, bW, bH);
      ctx.strokeRect(410, bY, bW, bH);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('DISTANCE', 410 + bW/2, bY + 35);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.distance || 0} ${isImperialSetting ? 'mi' : 'km'}`, 410 + bW/2, bY + 75);

      ctx.fillRect(700, bY, bW, bH);
      ctx.strokeRect(700, bY, bW, bH);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('CALORIES', 700 + bW/2, bY + 35);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${recoveryDetails?.calories || 0} KCAL`, 700 + bW/2, bY + 75);
    }

    // Barcode and verification seal
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(120, 1680);
    ctx.lineTo(960, 1680);
    ctx.stroke();

    // Barcode
    const barcodeX = 120;
    const barcodeY = 1710;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    let currentX = barcodeX;
    
    const pattern = [4, 12, 6, 2, 8, 14, 2, 6, 12, 4, 8, 6, 2, 10, 4, 12, 6, 2, 8, 10, 4];
    pattern.forEach((w, i) => {
      ctx.fillRect(currentX, barcodeY, w, 50);
      currentX += w + (i % 2 === 0 ? 4 : 8);
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '14px "Courier New", Courier, monospace';
    ctx.fillText(`VERIFICATION: FORMA-WRAPPED-${Date.now().toString().slice(-8)}`, 120, 1795);

    // Timestamp right aligned
    ctx.textAlign = 'right';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
    ctx.fillText(dateStr, 960, 1740);
    ctx.fillText('STABILITY CERTIFIED', 960, 1770);

    setDownloaded(false);
  };

  const triggerDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `forma-${sessionType}-${sessionTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = url;
    link.click();
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  if (!isOpen) return null;

  // Web app interactive preview parameters
  const weightText = isImperialSetting 
    ? `${(userProfile.weight * 2.20462).toFixed(1)} lbs` 
    : `${userProfile.weight.toFixed(1)} kg`;
  
  const heightText = isImperialSetting
    ? `${Math.floor((userProfile.height / 2.54) / 12)}'${Math.round((userProfile.height / 2.54) % 12)}"`
    : `${userProfile.height} cm`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-6 max-w-md mx-auto overflow-y-auto">
      
      {/* Hidden Canvas element for PNG rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Close button */}
      <div className="flex justify-between items-center pb-4 border-b border-white/5 relative z-10">
        <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">
          Workout Card Export
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-full bg-white/5 border border-white/5 text-zinc-400 hover:text-white cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Layout Style Toggle Switch */}
      <div className="flex justify-between items-center px-1 py-3 border-b border-white/5 relative z-10">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          Card Aesthetic
        </span>
        <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5 relative">
          <button
            onClick={() => setCardStyle('technical')}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              cardStyle === 'technical' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Technical Grid
          </button>
          <button
            onClick={() => setCardStyle('wrapped')}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              cardStyle === 'wrapped' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Spotify Wrapped
          </button>
        </div>
      </div>

      {/* Visual Portrait Card Preview (Scaled down mockup) */}
      <div className="flex-1 flex items-center justify-center my-6 relative z-10">
        {cardStyle === 'technical' ? (
          <div className="w-[280px] h-[497px] bg-[#020202] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl select-none">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/[0.01] rounded-full blur-xl pointer-events-none" />

            {/* Card Top Branding */}
            <div className="text-center relative z-10">
              <span className="text-[14px] font-bold tracking-[6px] text-white block uppercase font-mono">
                FORMA
              </span>
              <span className="text-[6px] tracking-[3px] text-zinc-500 block uppercase font-mono mt-0.5">
                WORKOUT TRACKER
              </span>
              <div className="h-[1px] bg-white/10 mt-2.5 mx-6" />
            </div>

            {/* User Details */}
            <div className="relative z-10 px-2">
              <span className="text-[5px] text-zinc-500 font-mono block">USER PROFILE:</span>
              <span className="text-[10px] font-bold text-white block tracking-wide truncate">
                {userProfile.name.toUpperCase()}
              </span>
              
              {/* Specs row */}
              <div className="grid grid-cols-3 gap-1 mt-1.5 py-1 border border-white/5 bg-white/[0.01] text-center rounded">
                <div>
                  <span className="text-[4px] text-zinc-500 block">WEIGHT</span>
                  <span className="text-[7px] font-bold text-white font-mono">{weightText}</span>
                </div>
                <div>
                  <span className="text-[4px] text-zinc-500 block">HEIGHT</span>
                  <span className="text-[7px] font-bold text-white font-mono">{heightText}</span>
                </div>
                <div>
                  <span className="text-[4px] text-zinc-500 block">BODY FAT</span>
                  <span className="text-[7px] font-bold text-white font-mono">{userProfile.bodyFat}%</span>
                </div>
              </div>
            </div>

            {/* Dynamic Content Preview */}
            {sessionType === 'workout' ? (
              /* Workout Preview */
              <div className="relative z-10 flex flex-col gap-1 px-1">
                <div className="text-center py-2 border border-white/5 bg-white/[0.01] rounded-lg">
                  <span className="text-[5px] text-zinc-500 block font-mono">TOTAL WEIGHT LIFTED</span>
                  <span className="text-xl font-extrabold text-white block font-mono tracking-tighter leading-none my-1">
                    {displayTonnage()}
                  </span>
                  <span className="text-[5px] text-zinc-500 block font-mono">GROWTH STIMULUS: {totalEffectiveReps} GROWTH REPS</span>
                </div>
                
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded p-1 text-[6px] text-zinc-400 font-mono">
                  <span>Sets: {totalSets}</span>
                  {cardioDetails?.workoutDuration && (
                    <span>Time: {Math.max(1, Math.round(cardioDetails.workoutDuration / 60))}m</span>
                  )}
                  <span>Avg RPE: {avgRpe}</span>
                  {topLiftWeight > 0 && <span className="text-emerald-400">Max: {displayWeight(topLift1RMEst)}</span>}
                </div>

                {/* LISS finisher preview */}
                {cardioDetails && (
                  <div className="bg-cyan-950/10 border border-cyan-900/20 rounded p-1 text-[5px] text-zinc-400">
                    <span className="text-cyan-400 font-bold block">TREADMILL CARDIO FINISHER:</span>
                    <span>{cardioDetails.duration}m | {cardioDetails.distance} {cardioDetails.units === 'imperial' ? 'mi' : 'km'} | {cardioDetails.calories} kCal</span>
                  </div>
                )}
              </div>
            ) : (
              /* Active Recovery GPS Preview */
              <div className="relative z-10 flex flex-col gap-1.5 px-1">
                {/* Small canvas-style path preview using SVG */}
                <div className="w-full h-16 bg-[#060B12] border border-white/5 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {recoveryDetails?.path && recoveryDetails.path.length >= 2 ? (
                    <svg className="w-full h-full p-2" viewBox="0 0 100 50">
                      {/* Convert lat/lng array to SVG line */}
                      {(() => {
                        const path = recoveryDetails.path;
                        let minLat = Infinity, maxLat = -Infinity;
                        let minLng = Infinity, maxLng = -Infinity;
                        
                        path.forEach(p => {
                          if (p.lat < minLat) minLat = p.lat;
                          if (p.lat > maxLat) maxLat = p.lat;
                          if (p.lng < minLng) minLng = p.lng;
                          if (p.lng > maxLng) maxLng = p.lng;
                        });

                        const latRange = maxLat - minLat || 0.0001;
                        const lngRange = maxLng - minLng || 0.0001;

                        const pointsStr = path.map(pt => {
                          const x = ((pt.lng - minLng) / lngRange) * 80 + 10;
                          const y = 40 - ((pt.lat - minLat) / latRange) * 30; // invert latitude
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#22D3EE"
                              strokeWidth="2.5"
                              points={pointsStr}
                            />
                            {/* Start dot */}
                            {(() => {
                              const sx = ((path[0].lng - minLng) / lngRange) * 80 + 10;
                              const sy = 40 - ((path[0].lat - minLat) / latRange) * 30;
                              return <circle cx={sx} cy={sy} r="2.5" fill="#10B981" />;
                            })()}
                            {/* End dot */}
                            {(() => {
                              const ex = ((path[path.length - 1].lng - minLng) / lngRange) * 80 + 10;
                              const ey = 40 - ((path[path.length - 1].lat - minLat) / latRange) * 30;
                              return <circle cx={ex} cy={ey} r="2.5" fill="#EF4444" />;
                            })()}
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <span className="text-[5px] font-mono text-zinc-600 uppercase">GPS ROUTE LOCKED</span>
                  )}
                </div>

                {/* Stats column */}
                <div className="grid grid-cols-2 gap-1 border border-white/5 bg-white/[0.01] rounded p-1 text-[6px] text-zinc-400 font-mono">
                  <div>Duration: {recoveryDetails?.duration || 0}m</div>
                  <div>Dist: {recoveryDetails?.distance || 0} {isImperialSetting ? 'mi' : 'km'}</div>
                  <div>Avg: {recoveryDetails?.avgSpeed || 0} {isImperialSetting ? 'mph' : 'kmh'}</div>
                  <div className="text-emerald-400">Burn: {recoveryDetails?.calories || 0} kCal</div>
                </div>
              </div>
            )}

            {/* Card Bottom Barcode */}
            <div className="relative z-10 border-t border-white/5 pt-2 flex justify-between items-end px-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-0.5 h-4 items-end opacity-85">
                  <div className="w-[1px] h-full bg-white" />
                  <div className="w-[2px] h-[80%] bg-white" />
                  <div className="w-[1px] h-full bg-white" />
                  <div className="w-[1px] h-[60%] bg-white" />
                  <div className="w-[3px] h-[90%] bg-white" />
                  <div className="w-[1px] h-[75%] bg-white" />
                  <div className="w-[1px] h-full bg-white" />
                </div>
                <span className="text-[4px] text-zinc-600 font-mono">FORMA-{Date.now().toString().slice(-6)}</span>
              </div>
              
              <div className="text-right">
                <span className="text-[4px] text-zinc-600 font-mono block">VERIFIED SESSION</span>
                <span className="text-[5px] font-bold text-emerald-400 font-mono uppercase">COMPLETED</span>
              </div>
            </div>
          </div>
        ) : (
          /* Wrapped Preview */
          <div className="w-[280px] h-[497px] bg-gradient-to-br from-[#2e0854] via-[#052b47] to-[#020202] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl select-none text-white animate-fade-in">
            {/* Ambient Glows */}
            <div className="absolute top-1/4 -right-12 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-1/4 -left-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Top Header */}
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[12px] font-black tracking-[4px] font-sans">FORMA</span>
              <span className="text-[6px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded uppercase">Wrapped</span>
            </div>

            {/* Concentric Rings Visual Preview */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-2">
              {(() => {
                const sessionObj = sessions?.find(s => s.title === sessionTitle);
                const rawTargetTonnage = sessionObj ? computeTotalTonnage(sessionObj) : 4000;
                const tonnageProgress = Math.min(100, Math.round((actualTonnage / rawTargetTonnage) * 100)) || 100;

                let targetReps = 0;
                if (sessionObj?.exercises) {
                  sessionObj.exercises.forEach(ex => {
                    if (ex.ghostSets) {
                      ex.ghostSets.forEach(gs => {
                        targetReps += gs.reps || 0;
                      });
                    }
                  });
                }
                if (targetReps === 0) targetReps = 60;

                let actualReps = 0;
                if (logs) {
                  Object.values(logs).forEach((sets: any) => {
                    if (Array.isArray(sets)) {
                      sets.forEach(s => {
                        actualReps += s.reps || 0;
                      });
                    }
                  });
                }
                if (actualReps === 0) actualReps = 65;
                const repsProgress = Math.min(100, Math.round((actualReps / targetReps) * 100)) || 100;

                const rawDuration = cardioDetails?.workoutDuration || 0;
                const actualDurationMins = Math.round(rawDuration / 60) || 45;
                const targetDurationMins = 45;
                const durationProgress = Math.min(100, Math.round((actualDurationMins / targetDurationMins) * 100)) || 100;

                return (
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                      <circle cx="50" cy="50" r="38" className="stroke-white fill-transparent" strokeWidth="4" strokeDasharray="238.7" strokeDashoffset={238.7 - (238.7 * tonnageProgress) / 100} strokeLinecap="round" />
                      
                      <circle cx="50" cy="50" r="28" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                      <circle cx="50" cy="50" r="28" className="stroke-cyan-400 fill-transparent" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * repsProgress) / 100} strokeLinecap="round" />
                      
                      <circle cx="50" cy="50" r="18" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                      <circle cx="50" cy="50" r="18" className="stroke-emerald-400 fill-transparent" strokeWidth="4" strokeDasharray="113.1" strokeDashoffset={113.1 - (113.1 * durationProgress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-[8px] font-black font-mono text-zinc-300">FORMA</div>
                  </div>
                );
              })()}
            </div>

            {/* Stats Callouts */}
            <div className="relative z-10 flex flex-col gap-1.5 mb-2">
              <div className="text-center">
                <span className="text-[5px] text-zinc-400 uppercase tracking-widest font-mono">Completed Focus Session</span>
                <span className="text-sm font-black text-white block mt-0.5 uppercase tracking-tight">{sessionTitle}</span>
              </div>
              
              {sessionType === 'workout' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-white/5 border border-white/5 rounded p-1.5 text-center">
                    <span className="text-[5px] text-zinc-400 block font-mono">TONNAGE LIFTED</span>
                    <span className="text-xs font-black text-white font-mono">{displayTonnage().split(' ')[0]}</span>
                    <span className="text-[4px] text-zinc-500 block font-mono">{isImperialSetting ? 'LBS' : 'KG'}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded p-1.5 text-center">
                    <span className="text-[5px] text-zinc-400 block font-mono">GROWTH REPS</span>
                    <span className="text-xs font-black text-cyan-400 font-mono">+{totalEffectiveReps}</span>
                    <span className="text-[4px] text-zinc-500 block font-mono">STIMULUS</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  <div className="bg-white/5 border border-white/5 rounded p-1 text-center">
                    <span className="text-[4px] text-zinc-400 block font-mono">TIME</span>
                    <span className="text-[9px] font-black text-white font-mono">{recoveryDetails?.duration || 0}m</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded p-1 text-center">
                    <span className="text-[4px] text-zinc-400 block font-mono">DISTANCE</span>
                    <span className="text-[9px] font-black text-white font-mono">{recoveryDetails?.distance || 0}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded p-1 text-center">
                    <span className="text-[4px] text-zinc-400 block font-mono">CALORIES</span>
                    <span className="text-[9px] font-black text-emerald-400 font-mono">{recoveryDetails?.calories || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Card */}
            <div className="relative z-10 border-t border-white/10 pt-2 flex justify-between items-center">
              <span className="text-[5px] font-mono text-zinc-500">SYSTEM STABILITY OPTIMAL</span>
              <span className="text-[5px] font-bold text-cyan-400 uppercase font-mono tracking-wider">{sessionFocus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-3 pb-2 relative z-10">
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/[0.01] border border-white/5">
          <ShieldCheck size={16} className="text-cyan-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[10px] text-zinc-500 leading-normal">
            Export saves a portrait image (`1080x1920` png) of your workout details, perfect for sharing or logging.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={triggerDownload}
          className="w-full bg-white text-black font-semibold text-xs uppercase py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active-glow"
        >
          {downloaded ? (
            <>
              <Check size={14} className="text-emerald-500 stroke-[3px]" />
              Share Card Exported
            </>
          ) : (
            <>
              <Download size={14} />
              Export Portrait PNG (1080x1920)
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
