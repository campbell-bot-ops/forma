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
  toast: string | null;
  showToast: (msg: string) => void;
  
  // Handlers
  startWorkout: (session: WorkoutSession) => void;
  completeCnsSurvey: (score: number, scale: number) => void;
  updateWeight: (exerciseId: string, newWeight: number) => Promise<void>;
  finishWorkout: (logs: any, duration?: number, notes?: string, tags?: string[], cardioExtra?: any) => Promise<void>;
  logRecovery: (logs: any) => Promise<void>;
  logRest: (logs: any) => Promise<void>;
  completeFinisher: (cardioStats?: any) => Promise<void>;
  loginSuccess: (session: UserSession) => Promise<void>;
  signOut: () => Promise<void>;
  resetData: () => Promise<void>;
  deleteWorkout: (date: string, sessionId: string, id?: string) => Promise<void>;
  triggerHaptic: (pattern: number[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [showLoading, setShowLoading] = useState(true);
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
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
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

      // Register service worker for PWA support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('FORMA: Service Worker registered successfully with scope:', reg.scope))
          .catch(err => console.error('FORMA: Service Worker registration failed:', err));
      }

      // Load initial settings
      const storedHaptic = localStorage.getItem('forma_setting_haptic');
      if (storedHaptic !== null) {
        setHapticEnabled(storedHaptic === 'true');
      }

      // Prune old water logs (older than 30 days) to prevent localStorage pollution
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('forma_water_intake_')) {
            const dateStr = key.replace('forma_water_intake_', '');
            const dateVal = Date.parse(dateStr);
            if (!isNaN(dateVal)) {
              const diffTime = Date.now() - dateVal;
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              if (diffDays > 30) {
                localStorage.removeItem(key);
              }
            }
          }
        });
      } catch (e) {
        console.warn('FORMA: Failed to clean up old water logs:', e);
      }

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  // Daily notification reminders — persistent dedup + smart on-open triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const HYDRATION_KEY = 'forma_notified_hydration';
    const WORKOUT_KEY = 'forma_notified_workout';
    const OPEN_REMINDER_KEY = 'forma_notified_open';

    const getTodayStr = () => new Date().toDateString();

    const sendNotification = async (title: string, body: string, tag: string) => {
      if (hapticEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/Frame 166.png',
            badge: '/Frame 166.png',
            tag, // OS-level dedup: same tag replaces existing notification
          });
        } else {
          new Notification(title, { body, icon: '/Frame 166.png' });
        }
      } catch (e) {
        console.warn('FORMA: Failed to send notification:', e);
      }
    };

    // Smart "on app open" notification — fires once per day when the user
    // actually opens the app, which is the only reliable trigger on mobile.
    const fireOpenReminder = async () => {
      const isEnabled = localStorage.getItem('forma_notifications_enabled') === 'true';
      if (!isEnabled) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const todayStr = getTodayStr();
      if (localStorage.getItem(OPEN_REMINDER_KEY) === todayStr) return;

      const now = new Date();
      const hours = now.getHours();

      // Read workout history directly from db to avoid stale React state
      let hasWorkoutToday = false;
      try {
        const history = await db.getHistory();
        const todayIso = now.toISOString().split('T')[0];
        hasWorkoutToday = history.some((w: CompletedWorkout) => w.date.startsWith(todayIso));
      } catch (e) {
        // DB not ready yet — skip this check
      }

      let title = '';
      let body = '';

      if (hours >= 6 && hours < 12 && !hasWorkoutToday) {
        title = 'FORMA Morning Check-In';
        body = 'Your training split is ready. Review today\'s session and set your intent.';
      } else if (hours >= 12 && hours < 15) {
        title = 'FORMA Cellular Hydration';
        body = 'Aligning Physical Architecture: Time to hydrate and calibrate optimal cellular recovery.';
        localStorage.setItem(HYDRATION_KEY, todayStr);
      } else if (hours >= 15 && hours < 20 && !hasWorkoutToday) {
        title = 'FORMA Architecture Check';
        body = 'You haven\'t logged a session today. Even a rest day keeps your streak alive.';
        localStorage.setItem(WORKOUT_KEY, todayStr);
      } else if (hours >= 20 && !hasWorkoutToday) {
        title = 'FORMA Evening Reflection';
        body = 'No session logged today. Rest is part of the architecture — log it to stay consistent.';
      }

      if (title) {
        localStorage.setItem(OPEN_REMINDER_KEY, todayStr);
        await sendNotification(title, body, 'forma-open-reminder');
      }
    };

    // Scheduled time-window notifications — widens from exact-minute to full-hour
    // windows so the 30s polling interval can reliably catch them.
    const checkScheduledNotifications = async () => {
      const isEnabled = localStorage.getItem('forma_notifications_enabled') === 'true';
      if (!isEnabled) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = new Date();
      const todayStr = now.toDateString();
      const hours = now.getHours();

      // Hydration reminder: anytime during the 14:00 hour (2 PM – 2:59 PM)
      if (hours === 14 && localStorage.getItem(HYDRATION_KEY) !== todayStr) {
        localStorage.setItem(HYDRATION_KEY, todayStr);
        await sendNotification(
          'FORMA Cellular Hydration',
          'Aligning Physical Architecture: Time to hydrate and calibrate optimal cellular recovery.',
          'forma-hydration'
        );
      }

      // Workout reminder: anytime during the 16:00 hour (4 PM – 4:59 PM)
      if (hours === 16 && localStorage.getItem(WORKOUT_KEY) !== todayStr) {
        localStorage.setItem(WORKOUT_KEY, todayStr);
        await sendNotification(
          'FORMA Architecture Check',
          'Review your daily session split and log today\'s progress to maintain consistency.',
          'forma-workout-reminder'
        );
      }
    };

    // Delay the open reminder slightly to let initial DB data load first
    const openTimeout = setTimeout(fireOpenReminder, 2500);

    // Run scheduled checks on interval (catches time-window notifications)
    checkScheduledNotifications();
    const interval = setInterval(checkScheduledNotifications, 30000);

    // Register periodic background sync as a progressive enhancement —
    // Chrome on Android can wake the service worker even when the app is closed.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg: ServiceWorkerRegistration) => {
        if ('periodicSync' in reg) {
          (reg as any).periodicSync.register('forma-daily-sync', {
            minInterval: 4 * 60 * 60 * 1000, // Every 4 hours
          }).catch(() => {
            // Periodic sync not granted — requires sufficient site engagement
          });
        }
      });
    }

    return () => {
      clearTimeout(openTimeout);
      clearInterval(interval);
    };
  }, [hapticEnabled]);

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
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('forma_loading_shown');
      if (shown === 'true') {
        setShowLoading(false);
      }
    }

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

  const finishWorkout = async (logs: any, duration?: number, notes?: string, tags?: string[], cardioExtra?: any) => {
    if (!activeSession) return;

    let actualTonnage = 0;
    let completedSetsCount = 0;
    Object.keys(logs).forEach(exId => {
      const sets = logs[exId];
      sets.forEach((s: any) => {
        if (!s.isWarmup) {
          actualTonnage += (s.weight || 0) * (s.reps || 0);
          completedSetsCount++;
        }
      });
    });

    const totalSetsCount = activeSession.exercises
      ? activeSession.exercises.reduce((total, ex) => total + (ex.defaultSets || 0), 0)
      : 0;

    const completedWorkout: CompletedWorkout = {
      sessionId: activeSession.id,
      sessionTitle: activeSession.title,
      sessionFocus: activeSession.focus,
      date: new Date().toISOString(),
      actualTonnage: actualTonnage,
      logs: logs,
      completedSetsCount,
      totalSetsCount,
      notes: notes || undefined,
      tags: tags || undefined,
      cnsScore: cnsScore,
      cardioDetails: {
        workoutDuration: duration,
        ...cardioExtra
      }
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
    showToast('Active recovery logged!');

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
    showToast('Rest day logged!');
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
        cardioDetails: {
          ...(recentCompletedWorkout.cardioDetails || {}),
          ...cardioStats
        }
      });
      setShareModalOpen(true);
      showToast('Workout logged successfully!');
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

  const deleteWorkout = async (date: string, sessionId: string, id?: string) => {
    const updatedHistory = await db.deleteWorkout(date, sessionId, id);
    setWorkoutHistory(updatedHistory);
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
        deleteWorkout,
        triggerHaptic,
        toast,
        showToast
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
