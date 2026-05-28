'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../utils/db';
import { WorkoutSession } from '../constants/workout';
import { CompletedWorkout, UserProfile, UserSession } from '../types/workout';
import { TabId } from '../components/BottomNav';

interface AppContextType {
  showLoading: boolean;
  setShowLoading: (show: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  activeSession: WorkoutSession | null;
  setActiveSession: (session: WorkoutSession | null) => void;
  activeRecoverySession: WorkoutSession | null;
  setActiveRecoverySession: (session: WorkoutSession | null) => void;
  activeRestSession: WorkoutSession | null;
  setActiveRestSession: (session: WorkoutSession | null) => void;
  activeFinisher: boolean;
  setActiveFinisher: (active: boolean) => void;
  programEditorOpen: boolean;
  setProgramEditorOpen: (open: boolean) => void;
  sessions: WorkoutSession[];
  setSessions: (sessions: WorkoutSession[]) => void;
  workoutHistory: CompletedWorkout[];
  setWorkoutHistory: (history: CompletedWorkout[]) => void;
  zeroUiEnabled: boolean;
  toggleZeroUi: () => Promise<void>;
  autoOverloadEnabled: boolean;
  toggleAutoOverload: () => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  userProfile: UserProfile;
  updateProfile: (profile: UserProfile) => Promise<void>;
  recentCompletedWorkout: CompletedWorkout | null;
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  shareData: any | null;
  setShareData: (data: any | null) => void;
  cnsSurveyOpen: boolean;
  setCnsSurveyOpen: (open: boolean) => void;
  pendingSession: WorkoutSession | null;
  setPendingSession: (session: WorkoutSession | null) => void;
  cnsScale: number;
  cnsScore: number;
  isOnline: boolean;
  isSyncing: boolean;
  hapticEnabled: boolean;
  toggleHaptic: () => void;
  
  // Handlers
  startWorkout: (session: WorkoutSession) => void;
  completeCnsSurvey: (score: number, scale: number) => void;
  updateWeight: (exerciseId: string, newWeight: number) => Promise<void>;
  finishWorkout: (logs: any, duration?: number) => Promise<void>;
  logRecovery: (logs: any) => Promise<void>;
  logRest: (logs: any) => Promise<void>;
  completeFinisher: (cardioStats?: any) => Promise<void>;
  loginSuccess: (session: UserSession) => Promise<void>;
  signOut: () => Promise<void>;
  resetData: () => Promise<void>;
  triggerHaptic: (pattern: number[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [showLoading, setShowLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('forma_loading_shown');
    }
    return true;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('horizon');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [activeRecoverySession, setActiveRecoverySession] = useState<WorkoutSession | null>(null);
  const [activeRestSession, setActiveRestSession] = useState<WorkoutSession | null>(null);
  const [activeFinisher, setActiveFinisher] = useState(false);
  const [programEditorOpen, setProgramEditorOpen] = useState(false);

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>([]);
  const [zeroUiEnabled, setZeroUiEnabled] = useState(true);
  const [autoOverloadEnabled, setAutoOverloadEnabled] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Alexander Thorne',
    email: 'alex@forma.dev',
    weight: 78.4,
    height: 182,
    bodyFat: 12.8,
    units: 'metric'
  });
  
  const [recentCompletedWorkout, setRecentCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<any | null>(null);

  const [cnsSurveyOpen, setCnsSurveyOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<WorkoutSession | null>(null);
  const [cnsScale, setCnsScale] = useState(1.0);
  const [cnsScore, setCnsScore] = useState(100);

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Monitor network connection status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const goOnline = () => {
        setIsOnline(true);
        syncOfflineData();
      };
      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);

      // Load initial settings
      const storedHaptic = localStorage.getItem('forma_setting_haptic');
      if (storedHaptic !== null) {
        setHapticEnabled(storedHaptic === 'true');
      }

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  // Standard haptic vibration helper
  const triggerHaptic = (pattern: number[]) => {
    if (hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Haptic vibration failed', e);
      }
    }
  };

  // Sync offline-cached data back to Supabase
  const syncOfflineData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      console.log('FORMA: Online detected. Synchronizing offline queue...');
      // Re-trigger sync in db
      await db.syncOfflineQueue();
      // Reload history to ensure it reflects DB state
      const loadedHistory = await db.getHistory();
      setWorkoutHistory(loadedHistory);
    } catch (e) {
      console.error('Failed to sync offline queue', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial load
  useEffect(() => {
    async function loadData() {
      const liveSession = await db.getLiveSession();
      setUser(liveSession);

      const loadedSessions = await db.getSessions();
      setSessions(loadedSessions);

      const loadedHistory = await db.getHistory();
      setWorkoutHistory(loadedHistory);

      const storedZeroUi = localStorage.getItem('forma_setting_zeroui');
      const storedAutoOverload = localStorage.getItem('forma_setting_autooverload');
      if (storedZeroUi !== null) setZeroUiEnabled(storedZeroUi === 'true');
      if (storedAutoOverload !== null) setAutoOverloadEnabled(storedAutoOverload === 'true');

      const storedProfile = await db.getUserProfile();
      setUserProfile(storedProfile);

      const storedTheme = localStorage.getItem('forma_theme') as 'dark' | 'light' | null;
      if (storedTheme) {
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }

      // Check first visit status
      const firstVisitDone = localStorage.getItem('forma_first_visit_done');
      if (!firstVisitDone) {
        setShowOnboarding(true);
      }
    }
    loadData();
  }, []);

  // Actions
  const startWorkout = (session: WorkoutSession) => {
    if (session.type === 'workout') {
      setPendingSession(session);
      setCnsSurveyOpen(true);
    } else if (session.type === 'recovery') {
      setActiveRecoverySession(session);
    } else if (session.type === 'rest') {
      setActiveRestSession(session);
    }
  };

  const completeCnsSurvey = (score: number, scale: number) => {
    setCnsScale(scale);
    setCnsScore(score);
    setCnsSurveyOpen(false);
    if (pendingSession) {
      setActiveSession(pendingSession);
      setPendingSession(null);
    }
  };

  const updateWeight = async (exerciseId: string, newWeight: number) => {
    if (!activeSession) return;
    
    const updatedSessions = sessions.map(s => {
      if (s.id === activeSession.id) {
        const updatedExercises = s.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const updatedGhost = ex.ghostSets.map(gs => ({
              ...gs,
              weight: newWeight
            }));
            return { ...ex, ghostSets: updatedGhost };
          }
          return ex;
        });
        return { ...s, exercises: updatedExercises };
      }
      return s;
    });

    setSessions(updatedSessions);
    await db.saveSessions(updatedSessions);

    const currentActiveUpdated = updatedSessions.find(s => s.id === activeSession.id);
    if (currentActiveUpdated) {
      setActiveSession(currentActiveUpdated);
    }
  };

  const finishWorkout = async (logs: any, duration?: number) => {
    if (!activeSession) return;

    let actualTonnage = 0;
    Object.keys(logs).forEach(exId => {
      const sets = logs[exId];
      sets.forEach((s: any) => {
        actualTonnage += (s.weight || 0) * (s.reps || 0);
      });
    });

    const completedWorkout: CompletedWorkout = {
      sessionId: activeSession.id,
      sessionTitle: activeSession.title,
      sessionFocus: activeSession.focus,
      date: new Date().toISOString(),
      actualTonnage: actualTonnage,
      logs: logs,
      cnsScore: cnsScore,
      cardioDetails: duration ? { workoutDuration: duration } : undefined
    };

    const newHistory = await db.logWorkout(completedWorkout);
    setWorkoutHistory(newHistory);
    setRecentCompletedWorkout(completedWorkout);

    setActiveSession(null);
    setActiveFinisher(true);
  };

  const logRecovery = async (logs: any) => {
    if (!activeRecoverySession) return;

    const completedRecovery: CompletedWorkout = {
      sessionId: activeRecoverySession.id,
      sessionTitle: activeRecoverySession.title,
      sessionFocus: activeRecoverySession.focus,
      date: new Date().toISOString(),
      actualTonnage: 0,
      logs: {
        'recovery-cardio': [
          {
            setNumber: 1,
            weight: 0,
            reps: logs.duration,
            rpe: logs.recoveryRate
          }
        ]
      },
      recoveryDetails: logs
    };

    const newHistory = await db.logWorkout(completedRecovery);
    setWorkoutHistory(newHistory);
    
    setActiveRecoverySession(null);
    setActiveTab('archive');

    setShareData({
      sessionTitle: completedRecovery.sessionTitle,
      sessionFocus: completedRecovery.sessionFocus,
      actualTonnage: 0,
      exerciseCount: 0,
      sessionType: 'recovery',
      recoveryDetails: logs
    });
    setShareModalOpen(true);
  };

  const logRest = async (logs: any) => {
    if (!activeRestSession) return;

    const completedRest: CompletedWorkout = {
      sessionId: activeRestSession.id,
      sessionTitle: activeRestSession.title,
      sessionFocus: activeRestSession.focus,
      date: new Date().toISOString(),
      actualTonnage: 0,
      logs: {
        'passive-rest': [
          {
            setNumber: 1,
            weight: 0,
            reps: logs.walkLogged ? 30 : 0,
            rpe: logs.stretchLogged ? 10 : 5
          }
        ]
      },
      restDetails: logs
    };

    const newHistory = await db.logWorkout(completedRest);
    setWorkoutHistory(newHistory);
    
    setActiveRestSession(null);
    setActiveTab('archive');
  };

  const completeFinisher = async (cardioStats?: any) => {
    setActiveFinisher(false);
    setActiveTab('archive');
    
    if (recentCompletedWorkout) {
      const updatedHistory = await db.updateWorkoutCardio(
        recentCompletedWorkout.date,
        recentCompletedWorkout.sessionId,
        cardioStats
      );
      setWorkoutHistory(updatedHistory);

      setShareData({
        sessionTitle: recentCompletedWorkout.sessionTitle,
        sessionFocus: recentCompletedWorkout.sessionFocus,
        actualTonnage: recentCompletedWorkout.actualTonnage,
        exerciseCount: recentCompletedWorkout.logs ? Object.keys(recentCompletedWorkout.logs).length : 0,
        sessionType: 'workout',
        logs: recentCompletedWorkout.logs,
        cardioDetails: cardioStats
      });
      setShareModalOpen(true);
    }
  };

  const loginSuccess = async (session: UserSession) => {
    setUser(session);
    const storedProfile = await db.getUserProfile();
    setUserProfile(storedProfile);

    const loadedSessions = await db.getSessions();
    setSessions(loadedSessions);
    const loadedHistory = await db.getHistory();
    setWorkoutHistory(loadedHistory);
  };

  const signOut = async () => {
    await db.signOut();
    setUser(null);
    setSessions([]);
    setWorkoutHistory([]);
    setActiveTab('horizon');
  };

  const resetData = async () => {
    await db.resetAll();
    
    const loadedSessions = await db.getSessions();
    setSessions(loadedSessions);
    setWorkoutHistory([]);
    
    setZeroUiEnabled(false);
    setAutoOverloadEnabled(true);
    
    setActiveTab('horizon');
  };

  const updateProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    await db.saveUserProfile(profile);
  };

  const toggleZeroUi = async () => {
    const nextVal = !zeroUiEnabled;
    setZeroUiEnabled(nextVal);
    localStorage.setItem('forma_setting_zeroui', String(nextVal));
    await db.syncSettings(nextVal, autoOverloadEnabled);
  };

  const toggleAutoOverload = async () => {
    const nextVal = !autoOverloadEnabled;
    setAutoOverloadEnabled(nextVal);
    localStorage.setItem('forma_setting_autooverload', String(nextVal));
    await db.syncSettings(zeroUiEnabled, nextVal);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('forma_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const toggleHaptic = () => {
    const nextVal = !hapticEnabled;
    setHapticEnabled(nextVal);
    localStorage.setItem('forma_setting_haptic', String(nextVal));
  };

  return (
    <AppContext.Provider
      value={{
        showLoading,
        setShowLoading,
        showOnboarding,
        setShowOnboarding,
        user,
        setUser,
        activeTab,
        setActiveTab,
        activeSession,
        setActiveSession,
        activeRecoverySession,
        setActiveRecoverySession,
        activeRestSession,
        setActiveRestSession,
        activeFinisher,
        setActiveFinisher,
        programEditorOpen,
        setProgramEditorOpen,
        sessions,
        setSessions,
        workoutHistory,
        setWorkoutHistory,
        zeroUiEnabled,
        toggleZeroUi,
        autoOverloadEnabled,
        toggleAutoOverload,
        theme,
        toggleTheme,
        hapticEnabled,
        toggleHaptic,
        userProfile,
        updateProfile,
        recentCompletedWorkout,
        shareModalOpen,
        setShareModalOpen,
        shareData,
        setShareData,
        cnsSurveyOpen,
        setCnsSurveyOpen,
        pendingSession,
        setPendingSession,
        cnsScale,
        cnsScore,
        isOnline,
        isSyncing,
        startWorkout,
        completeCnsSurvey,
        updateWeight,
        finishWorkout,
        logRecovery,
        logRest,
        completeFinisher,
        loginSuccess,
        signOut,
        resetData,
        triggerHaptic
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
