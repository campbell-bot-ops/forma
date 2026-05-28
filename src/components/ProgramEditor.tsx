'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Plus, ChevronUp, ChevronDown, Check, X, Edit2, Zap, Dumbbell } from 'lucide-react';
import { WorkoutSession, Exercise } from '@/constants/workout';

interface ProgramEditorProps {
  sessions: WorkoutSession[];
  onSave: (updatedSessions: WorkoutSession[]) => Promise<void>;
  onClose: () => void;
  units: 'metric' | 'imperial';
}

export default function ProgramEditor({
  sessions,
  onSave,
  onClose,
  units
}: ProgramEditorProps) {
  const [localSessions, setLocalSessions] = useState<WorkoutSession[]>(
    JSON.parse(JSON.stringify(sessions)) // deep clone to prevent accidental prop mutations
  );
  
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );

  const isImperial = units === 'imperial';

  // Selected session to edit
  const selectedSession = localSessions.find(s => s.id === selectedSessionId)!;

  // Add/Edit exercise form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Form Fields
  const [exName, setExName] = useState('');
  const [exTargetGroup, setExTargetGroup] = useState('');
  const [exTargetReps, setExTargetReps] = useState('8-10');
  const [exDefaultSets, setExDefaultSets] = useState(3);
  const [exBaselineWeight, setExBaselineWeight] = useState(20); // in kg or lbs depending on display
  const [exIsFocusLift, setExIsFocusLift] = useState(false);

  const resetForm = () => {
    setExName('');
    setExTargetGroup('');
    setExTargetReps('8-10');
    setExDefaultSets(3);
    setExBaselineWeight(20);
    setExIsFocusLift(false);
    setShowAddForm(false);
    setEditingExercise(null);
  };

  const handleEditClick = (ex: Exercise) => {
    setEditingExercise(ex);
    setExName(ex.name);
    setExTargetGroup(ex.targetGroup);
    setExTargetReps(ex.targetRepsRange);
    setExDefaultSets(ex.defaultSets);
    const weightInUserUnits = isImperial ? ex.ghostSets[0]?.weight * 2.20462 : ex.ghostSets[0]?.weight;
    setExBaselineWeight(parseFloat((weightInUserUnits || 20).toFixed(1)));
    setExIsFocusLift(ex.keyMovement);
    setShowAddForm(true);
  };

  const handleSaveExercise = () => {
    if (!exName.trim()) return;

    // Convert input baseline weight to kg internally
    const weightInKg = isImperial ? exBaselineWeight / 2.20462 : exBaselineWeight;
    const finalWeight = parseFloat(weightInKg.toFixed(1));
    const finalSets = Math.max(1, Math.min(6, exDefaultSets));

    let updatedExercises = [...(selectedSession.exercises || [])];

    if (editingExercise) {
      // Edit mode: Update existing exercise
      updatedExercises = updatedExercises.map(ex => {
        if (ex.id === editingExercise.id) {
          // Adjust ghost sets to match the new sets count
          let newGhostSets = [...ex.ghostSets];
          if (newGhostSets.length < finalSets) {
            // Append copying last set details
            const lastSet = newGhostSets[newGhostSets.length - 1] || { reps: 10, rpe: 8 };
            while (newGhostSets.length < finalSets) {
              newGhostSets.push({
                setNumber: newGhostSets.length + 1,
                weight: finalWeight,
                reps: lastSet.reps,
                rpe: lastSet.rpe
              });
            }
          } else if (newGhostSets.length > finalSets) {
            // Shrink
            newGhostSets = newGhostSets.slice(0, finalSets);
          }

          // Also update base weights for all ghost sets if user changed baseline
          newGhostSets = newGhostSets.map((gs, i) => ({
            ...gs,
            setNumber: i + 1,
            weight: finalWeight
          }));

          return {
            ...ex,
            name: exName.trim(),
            targetGroup: exTargetGroup.trim() || 'General',
            targetRepsRange: exTargetReps,
            defaultSets: finalSets,
            keyMovement: exIsFocusLift,
            ghostSets: newGhostSets
          };
        }
        return ex;
      });

      // If this is set as the new focus lift, disable other focus lifts in the session
      if (exIsFocusLift) {
        updatedExercises = updatedExercises.map(ex => 
          ex.id !== editingExercise.id ? { ...ex, keyMovement: false } : ex
        );
      }
    } else {
      // Create mode: Add new exercise
      const exId = exName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      
      const defaultGhostSets = Array.from({ length: finalSets }).map((_, i) => ({
        setNumber: i + 1,
        weight: finalWeight,
        reps: parseInt(exTargetReps) || 10,
        rpe: 8
      }));

      const newEx: Exercise = {
        id: exId,
        name: exName.trim(),
        targetGroup: exTargetGroup.trim() || 'General',
        keyMovement: exIsFocusLift,
        defaultSets: finalSets,
        targetRepsRange: exTargetReps,
        ghostSets: defaultGhostSets
      };

      if (exIsFocusLift) {
        updatedExercises = updatedExercises.map(ex => ({ ...ex, keyMovement: false }));
      }
      updatedExercises.push(newEx);
    }

    // Update local sessions state
    const updatedSessions = localSessions.map(s => {
      if (s.id === selectedSession.id) {
        // Calculate new total target tonnage based on ghostSets
        let totalTonnage = 0;
        updatedExercises.forEach(ex => {
          ex.ghostSets.forEach(gs => {
            totalTonnage += gs.weight * gs.reps;
          });
        });

        const keyMovementName = updatedExercises.find(ex => ex.keyMovement)?.name || '';

        return {
          ...s,
          exercises: updatedExercises,
          totalTonnage: Math.round(totalTonnage),
          keyMovementName: keyMovementName || undefined
        };
      }
      return s;
    });

    setLocalSessions(updatedSessions);
    resetForm();
  };

  const handleDeleteExercise = (exId: string) => {
    if (confirm('Are you sure you want to remove this exercise from the split?')) {
      const updatedExercises = selectedSession.exercises.filter(ex => ex.id !== exId);

      const updatedSessions = localSessions.map(s => {
        if (s.id === selectedSession.id) {
          let totalTonnage = 0;
          updatedExercises.forEach(ex => {
            ex.ghostSets.forEach(gs => {
              totalTonnage += gs.weight * gs.reps;
            });
          });

          const keyMovementName = updatedExercises.find(ex => ex.keyMovement)?.name || '';

          return {
            ...s,
            exercises: updatedExercises,
            totalTonnage: Math.round(totalTonnage),
            keyMovementName: keyMovementName || undefined
          };
        }
        return s;
      });

      setLocalSessions(updatedSessions);
    }
  };

  const handleMoveExercise = (idx: number, direction: 'up' | 'down') => {
    const updatedExercises = [...selectedSession.exercises];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (targetIdx < 0 || targetIdx >= updatedExercises.length) return;

    // Swap
    const temp = updatedExercises[idx];
    updatedExercises[idx] = updatedExercises[targetIdx];
    updatedExercises[targetIdx] = temp;

    const updatedSessions = localSessions.map(s => {
      if (s.id === selectedSession.id) {
        return {
          ...s,
          exercises: updatedExercises
        };
      }
      return s;
    });

    setLocalSessions(updatedSessions);
  };

  const handleSessionFieldChange = (field: 'title' | 'focus' | 'primaryGoal', value: string) => {
    const updatedSessions = localSessions.map(s => {
      if (s.id === selectedSession.id) {
        return {
          ...s,
          [field]: value
        };
      }
      return s;
    });
    setLocalSessions(updatedSessions);
  };

  const handleSessionTypeChange = (type: 'workout' | 'recovery' | 'rest') => {
    const updatedSessions = localSessions.map(s => {
      if (s.id === selectedSession.id) {
        return {
          ...s,
          type,
          exercises: type === 'workout' ? (s.exercises.length > 0 ? s.exercises : []) : [],
          totalTonnage: type === 'workout' ? s.totalTonnage : 0,
          keyMovementName: type === 'workout' ? s.keyMovementName : undefined
        };
      }
      return s;
    });
    setLocalSessions(updatedSessions);
  };

  const handleSaveAll = async () => {
    await onSave(localSessions);
    onClose();
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground relative flex flex-col pt-6 pb-36 px-4 max-w-md mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-zinc-500">
            Split Architect
          </span>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">
            Edit Training Split
          </h1>
        </div>
        <button
          onClick={handleSaveAll}
          className="px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow"
        >
          Save
        </button>
      </div>

      {/* Horizon Days Selection Slider */}
      <div className="flex gap-2 pb-3 mb-4 overflow-x-auto no-scrollbar border-b border-white/5">
        {localSessions.map((session) => {
          const isActive = session.id === selectedSessionId;
          return (
            <button
              key={session.id}
              onClick={() => {
                setSelectedSessionId(session.id);
                resetForm();
              }}
              className={`flex-none px-3.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-white border-white text-black'
                  : 'border-white/5 bg-white/[0.01] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {session.day.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Main Form Fields for Session */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-extrabold font-mono">
            Session Configuration
          </span>

          {/* Session Day / Title */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Title</label>
              <input
                type="text"
                value={selectedSession.title}
                onChange={(e) => handleSessionFieldChange('title', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="w-[120px]">
              <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Day</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-400 font-semibold font-mono">
                {selectedSession.day}
              </div>
            </div>
          </div>

          {/* Focus & Type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Focus Cap</label>
              <input
                type="text"
                value={selectedSession.focus}
                onChange={(e) => handleSessionFieldChange('focus', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="w-[120px]">
              <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Session Type</label>
              <select
                value={selectedSession.type}
                onChange={(e) => handleSessionTypeChange(e.target.value as any)}
                className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
              >
                <option value="workout">Weights</option>
                <option value="recovery">Recovery</option>
                <option value="rest">Full Rest</option>
              </select>
            </div>
          </div>

          {/* Goal Description Quote */}
          <div>
            <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Primary Target / Recommendation</label>
            <textarea
              value={selectedSession.primaryGoal}
              onChange={(e) => handleSessionFieldChange('primaryGoal', e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Exercises Section (if Weights Session) */}
      {selectedSession.type === 'workout' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
              <Dumbbell size={10} /> Exercises Checklist ({selectedSession.exercises?.length || 0})
            </span>
            {!showAddForm && (
              <button
                onClick={() => {
                  setEditingExercise(null);
                  setShowAddForm(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-white transition-all cursor-pointer"
              >
                <Plus size={10} /> Add Exercise
              </button>
            )}
          </div>

          {/* Add / Edit Exercise Inline Overlay Block */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-panel border-cyan-950/20 bg-cyan-950/5 rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-extrabold font-mono text-cyan-400 uppercase tracking-widest">
                    {editingExercise ? 'Modify Movement' : 'Append Movement'}
                  </span>
                  <button
                    onClick={resetForm}
                    className="p-1 hover:text-white text-zinc-500 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Name & Target Group */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Exercise Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Incline Bench Press"
                      value={exName}
                      onChange={(e) => setExName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Target Muscle</label>
                    <input
                      type="text"
                      placeholder="e.g. Upper Chest"
                      value={exTargetGroup}
                      onChange={(e) => setExTargetGroup(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    />
                  </div>
                </div>

                {/* Reps & Sets & Baseline Weight */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Sets (1-6)</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={exDefaultSets}
                      onChange={(e) => setExDefaultSets(parseInt(e.target.value) || 3)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Reps Target</label>
                    <input
                      type="text"
                      placeholder="e.g. 8-10"
                      value={exTargetReps}
                      onChange={(e) => setExTargetReps(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Start Wt ({isImperial ? 'lbs' : 'kg'})</label>
                    <input
                      type="number"
                      step="0.5"
                      value={exBaselineWeight}
                      onChange={(e) => setExBaselineWeight(parseFloat(e.target.value) || 20)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {/* Focus lift trigger */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="isFocusLift"
                    checked={exIsFocusLift}
                    onChange={(e) => setExIsFocusLift(e.target.checked)}
                    className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="isFocusLift" className="text-[9px] uppercase tracking-wider text-zinc-300 font-bold cursor-pointer flex items-center gap-1">
                    <Zap size={10} className="text-amber-400" /> Focus Lift of Session
                  </label>
                </div>

                {/* Save CTA */}
                <button
                  type="button"
                  onClick={handleSaveExercise}
                  className="w-full bg-cyan-400 text-black text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider hover:bg-cyan-300 cursor-pointer shadow-md transition-all mt-1"
                >
                  {editingExercise ? 'Save Changes' : 'Append to Split'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exercises Checklist List */}
          <div className="flex flex-col gap-2">
            {selectedSession.exercises && selectedSession.exercises.length > 0 ? (
              selectedSession.exercises.map((ex, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === selectedSession.exercises.length - 1;
                const weightInUserUnits = isImperial ? ex.ghostSets[0]?.weight * 2.20462 : ex.ghostSets[0]?.weight;
                const displayWeight = `${parseFloat((weightInUserUnits || 20).toFixed(1))} ${isImperial ? 'lbs' : 'kg'}`;

                return (
                  <motion.div
                    key={ex.id}
                    layout
                    className="glass-panel border-white/5 rounded-xl p-4 flex items-center justify-between gap-3 bg-white/[0.01]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase truncate">
                          {ex.name}
                        </h4>
                        {ex.keyMovement && (
                          <span className="text-[7px] text-black font-extrabold bg-amber-400 px-1 rounded uppercase flex items-center gap-0.5 whitespace-nowrap">
                            <Zap size={8} fill="black" /> Focus
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 font-medium mt-1 uppercase tracking-wider font-mono">
                        {ex.targetGroup} &bull; {ex.defaultSets} Sets x {ex.targetRepsRange} @ {displayWeight}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Move controls */}
                      <button
                        onClick={() => handleMoveExercise(idx, 'up')}
                        disabled={isFirst}
                        className={`p-1 hover:text-white rounded transition-colors ${
                          isFirst ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 cursor-pointer'
                        }`}
                        title="Move Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveExercise(idx, 'down')}
                        disabled={isLast}
                        className={`p-1 hover:text-white rounded transition-colors ${
                          isLast ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 cursor-pointer'
                        }`}
                        title="Move Down"
                      >
                        <ChevronDown size={14} />
                      </button>

                      {/* Edit control */}
                      <button
                        onClick={() => handleEditClick(ex)}
                        className="p-1 hover:text-white text-zinc-500 transition-colors cursor-pointer"
                        title="Edit Exercise"
                      >
                        <Edit2 size={12} />
                      </button>

                      {/* Trash/Delete control */}
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="p-1 hover:text-red-400 text-zinc-500 transition-colors cursor-pointer"
                        title="Delete Exercise"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="glass-panel border-dashed rounded-xl py-8 text-center text-[10px] text-zinc-500 italic">
                No exercises in this session. Click "Add Exercise" to append movements.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSession.type !== 'workout' && (
        <div className="glass-panel rounded-2xl p-6 text-center italic text-[10px] text-zinc-500 border-white/5 bg-white/[0.01] mt-2">
          {selectedSession.type === 'recovery' 
            ? 'Active recovery session. Use recovery views for cardio LISS logs (no weights/exercises needed).'
            : 'CNS Recharge rest day session. Complete standard recovery checklists (no weights/exercises needed).'}
        </div>
      )}
    </div>
  );
}
