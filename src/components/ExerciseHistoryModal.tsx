'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Dumbbell, Calendar } from 'lucide-react';
import { LoggedSet, computeEstimated1RM } from '@/constants/workout';

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  workoutHistory: any[];
  units: 'metric' | 'imperial';
}

export default function ExerciseHistoryModal({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  workoutHistory,
  units
}: ExerciseHistoryModalProps) {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);
  const isImperial = units === 'imperial';

  if (!isOpen) return null;

  // Filter logs for this exercise, newest first
  const logsForExercise = workoutHistory
    .filter(h => h.logs && h.logs[exerciseId] && Array.isArray(h.logs[exerciseId]))
    .map(h => ({
      date: new Date(h.date),
      sets: h.logs[exerciseId] as LoggedSet[],
      sessionTitle: h.sessionTitle
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Chronological chart data (oldest first)
  const chartData = [...logsForExercise]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(log => {
      // Calculate max weight and max estimated 1RM for this workout
      const maxWeight = Math.max(...log.sets.map(s => s.weight));
      const maxEst1RM = Math.max(
        ...log.sets.map(s => computeEstimated1RM(s.weight || 0, s.reps || 0))
      );
      
      // Convert weights if units are imperial
      return {
        date: log.date,
        maxWeight: isImperial ? maxWeight * 2.20462 : maxWeight,
        est1RM: isImperial ? maxEst1RM * 2.20462 : maxEst1RM
      };
    });

  // Chart size configurations
  const chartWidth = 360;
  const chartHeight = 120;
  const paddingX = 20;
  const paddingY = 20;

  // Plot scaling
  const allYValues = chartData.flatMap(d => [d.maxWeight, d.est1RM]);
  const minY = allYValues.length > 0 ? Math.min(...allYValues) - 2.0 : 20;
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) + 2.0 : 100;
  const rangeY = maxY - minY || 1;

  const getCoordinates = (type: 'maxWeight' | 'est1RM') => {
    if (chartData.length === 0) return [];
    const count = chartData.length;
    return chartData.map((d, idx) => {
      const val = d[type];
      const x = paddingX + (idx / Math.max(1, count - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - ((val - minY) / rangeY) * (chartHeight - paddingY * 2);
      return { x, y };
    });
  };

  const maxWeightCoords = getCoordinates('maxWeight');
  const est1RMCoords = getCoordinates('est1RM');

  // SVG Paths
  const getPathD = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return '';
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  };

  const maxWeightPath = getPathD(maxWeightCoords);
  const est1RMPath = getPathD(est1RMCoords);

  // Area Path for 1RM (fills from line to bottom)
  let est1RMArea = '';
  if (est1RMCoords.length > 0) {
    est1RMArea = `${est1RMPath} L ${est1RMCoords[est1RMCoords.length - 1].x.toFixed(1)} ${chartHeight} L ${est1RMCoords[0].x.toFixed(1)} ${chartHeight} Z`;
  }

  const weightUnit = isImperial ? 'lbs' : 'kg';

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-md bg-[#121214] border border-white/10 rounded-[28px] p-6 relative overflow-hidden flex flex-col gap-5 shadow-2xl font-sans"
      >
        {/* Decorative Grid Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer border border-white/5 z-50"
        >
          <X size={16} />
        </button>

        {/* Header Details */}
        <div className="relative z-10 pr-8">
          <span className="text-[9px] uppercase tracking-[0.25em] font-extrabold text-zinc-500 flex items-center gap-1.5 mb-1">
            <Dumbbell size={10} /> Exercise Analysis
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase leading-none">
            {exerciseName}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1 font-medium">
            Progression history over {logsForExercise.length} logged session{logsForExercise.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Dynamic Chart Section */}
        {chartData.length > 0 ? (
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 relative z-10">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
              <span>Hypertrophy Curve & Est. 1RM</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400">1RM</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Max Wt</span>
                </span>
              </div>
            </div>

            <div className="relative w-full h-[120px] bg-black/20 rounded-xl overflow-visible border border-white/5">
              {/* Tooltip Overlay */}
              {activeHoverIdx !== null && chartData[activeHoverIdx] && (
                <div className="absolute top-1 left-2 bg-black/95 border border-white/10 rounded px-2.5 py-1 text-[8px] font-mono z-20 pointer-events-none flex gap-3 text-zinc-400 leading-none">
                  <div>
                    <span className="text-zinc-600">DATE:</span>{' '}
                    <span className="text-white font-bold">
                      {new Date(chartData[activeHoverIdx].date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-cyan-500 font-bold">1RM:</span>{' '}
                    <span className="text-white font-bold font-mono">
                      {chartData[activeHoverIdx].est1RM.toFixed(1)} {weightUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold">MAX:</span>{' '}
                    <span className="text-white font-bold font-mono">
                      {chartData[activeHoverIdx].maxWeight.toFixed(1)} {weightUnit}
                    </span>
                  </div>
                </div>
              )}

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

                {/* 1RM Area Fill */}
                {est1RMArea && <path d={est1RMArea} fill="url(#chart-glow-gradient)" />}

                {/* Max Weight Line */}
                {maxWeightPath && <path d={maxWeightPath} fill="none" stroke="#71717a" strokeWidth="1" strokeDasharray="3 3" />}

                {/* 1RM Line */}
                {est1RMPath && <path d={est1RMPath} fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}

                {/* Interactive scrub areas */}
                {est1RMCoords.map((c, idx) => (
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
                      x={c.x - (chartWidth / Math.max(1, est1RMCoords.length)) / 2}
                      y={0}
                      width={chartWidth / Math.max(1, est1RMCoords.length)}
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
            
            <div className="text-center">
              <span className="text-[7px] text-zinc-600 uppercase tracking-widest font-semibold">
                Hover columns to inspect individual session max weights
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 text-center italic text-[10px] text-zinc-500 relative z-10">
            No historical logs available for this exercise.
          </div>
        )}

        {/* Detailed Session Logs List */}
        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-1 mb-1">
            <Calendar size={10} /> History Ledger
          </span>

          <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
            {logsForExercise.map((log, idx) => {
              const formattedDate = log.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div key={idx} className="glass-panel border border-white/5 rounded-xl p-3 flex flex-col gap-1.5 bg-white/[0.01]">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase">
                    <span>{formattedDate}</span>
                    <span className="text-zinc-500 font-mono text-[9px]">{log.sessionTitle}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-400 mt-1">
                    {log.sets.map((set) => {
                      const displayWeight = isImperial ? set.weight * 2.20462 : set.weight;
                      return (
                        <div key={set.setNumber} className="flex flex-col bg-black/10 rounded px-1.5 py-1 border border-white/5 text-center">
                          <span className="text-[8px] text-zinc-500 font-bold uppercase">Set {set.setNumber}</span>
                          <span className="text-white font-bold font-mono mt-0.5 tabular-nums">
                            {displayWeight.toFixed(1)} {weightUnit}
                          </span>
                          <span className="text-zinc-400 font-mono mt-0.5 tabular-nums">
                            {set.reps} reps
                          </span>
                          <span className="text-zinc-600 text-[8px] font-semibold font-mono mt-0.5">
                            RPE {set.rpe}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
