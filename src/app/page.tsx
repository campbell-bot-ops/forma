'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WorkoutSession } from '@/constants/workout';
import { db, UserSession, UserProfile } from '@/utils/db';

// Component Views
import LoadingScreen from '@/components/LoadingScreen';
import SignInView from '@/components/SignInView';
import HorizonView from '@/components/HorizonView';
import CrucibleView from '@/components/CrucibleView';
import FinisherView from '@/components/FinisherView';
import RecoveryView from '@/components/RecoveryView';
import RestView from '@/components/RestView';
import ArchiveView from '@/components/ArchiveView';
import ProfileView from '@/components/ProfileView';
import BottomNav, { TabId } from '@/components/BottomNav';
import ShareCardModal from '@/components/ShareCardModal';
import CnsSurveyModal from '@/components/CnsSurveyModal';

export default function Home() {
  const [showLoading, setShowLoading] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabId>('horizon');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [activeRecoverySession, setActiveRecoverySession] = useState<WorkoutSession | null>(null);
  const [activeRestSession, setActiveRestSession] = useState<WorkoutSession | null>(null);
  const [activeFinisher, setActiveFinisher] = useState<boolean>(false);
  
  // Dynamic persistent states
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [zeroUiEnabled, setZeroUiEnabled] = useState(true);
  const [autoOverloadEnabled, setAutoOverloadEnabled] = useState(true);

  // Biometrics & Share states
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Alexander Thorne',
    email: 'alex@forma.dev',
    weight: 78.4,
    height: 182,
    bodyFat: 12.8,
    units: 'metric'
  });
  const [recentCompletedWorkout, setRecentCompletedWorkout] = useState<any | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    sessionTitle: string;
    sessionFocus: string;
    actualTonnage: number;
    exerciseCount: number;
    sessionType?: 'workout' | 'recovery';
    logs?: any;
    cardioDetails?: any;
    recoveryDetails?: any;
  } | null>(null);

  // CNS Survey States
  const [cnsSurveyOpen, setCnsSurveyOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<WorkoutSession | null>(null);
  const [cnsScale, setCnsScale] = useState(1.0);
  const [cnsScore, setCnsScore] = useState(100);

  // Load state on mount using the database helper
  useEffect(() => {
    async function loadData() {
      // 1. Check user session
      const liveSession = await db.getLiveSession();
      setUser(liveSession);

      // 2. Load workouts
      const loadedSessions = await db.getSessions();
      setSessions(loadedSessions);

      // 3. Load completed history logs
      const loadedHistory = await db.getHistory();
      setWorkoutHistory(loadedHistory);

      // 4. Load config options
      const storedZeroUi = localStorage.getItem('forma_setting_zeroui');
      const storedAutoOverload = localStorage.getItem('forma_setting_autooverload');
      if (storedZeroUi !== null) setZeroUiEnabled(storedZeroUi === 'true');
      if (storedAutoOverload !== null) setAutoOverloadEnabled(storedAutoOverload === 'true');

      // 5. Load user biometrics profile
      const storedProfile = await db.getUserProfile();
      setUserProfile(storedProfile);
    }

    loadData();
  }, []);

  const handleStartWorkout = (session: WorkoutSession) => {
    if (session.type === 'workout') {
      setPendingSession(session);
      setCnsSurveyOpen(true);
    } else if (session.type === 'recovery') {
      setActiveRecoverySession(session);
    } else if (session.type === 'rest') {
      setActiveRestSession(session);
    }
  };

  const handleCnsSurveyComplete = (score: number, scale: number) => {
    setCnsScale(scale);
    setCnsScore(score);
    setCnsSurveyOpen(false);
    if (pendingSession) {
      setActiveSession(pendingSession);
      setPendingSession(null);
    }
  };

  // Weight target overload updates
  const handleUpdateWeight = async (exerciseId: string, newWeight: number) => {
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

    // Sync active session weight
    const currentActiveUpdated = updatedSessions.find(s => s.id === activeSession.id);
    if (currentActiveUpdated) {
      setActiveSession(currentActiveUpdated);
    }
  };

  // Complete weights sessions
  const handleFinishWorkout = async (logs: any) => {
    if (!activeSession) return;

    let actualTonnage = 0;
    Object.keys(logs).forEach(exId => {
      const sets = logs[exId];
      sets.forEach((s: any) => {
        actualTonnage += (s.weight || 0) * (s.reps || 0);
      });
    });

    const completedWorkout = {
      sessionId: activeSession.id,
      sessionTitle: activeSession.title,
      sessionFocus: activeSession.focus,
      date: new Date().toISOString(),
      actualTonnage: actualTonnage,
      logs: logs,
      cnsScore: cnsScore
    };

    const newHistory = await db.logWorkout(completedWorkout);
    setWorkoutHistory(newHistory);
    setRecentCompletedWorkout(completedWorkout);

    // Advance to finisher cardio walker
    setActiveSession(null);
    setActiveFinisher(true);
  };

  // Complete active recovery days
  const handleLogRecovery = async (logs: any) => {
    if (!activeRecoverySession) return;

    const completedRecovery = {
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
            reps: logs.duration, // use reps for duration
            rpe: logs.recoveryRate // use rpe for recovery index
          }
        ]
      },
      recoveryDetails: logs
    };

    const newHistory = await db.logWorkout(completedRecovery);
    setWorkoutHistory(newHistory);
    
    // Close recovery screen and route to ledger
    setActiveRecoverySession(null);
    setActiveTab('archive');

    // Trigger share modal for recovery day!
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

  // Complete rest days
  const handleLogRest = async (logs: any) => {
    if (!activeRestSession) return;

    const completedRest = {
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
            reps: logs.walkLogged ? 30 : 0, // walk duration
            rpe: logs.stretchLogged ? 10 : 5 // stretching indicator
          }
        ]
      },
      restDetails: logs
    };

    const newHistory = await db.logWorkout(completedRest);
    setWorkoutHistory(newHistory);
    
    // Close rest screen and route to ledger
    setActiveRestSession(null);
    setActiveTab('archive');
  };

  const handleCompleteFinisher = async (cardioStats?: {
    duration: number;
    distance: number;
    calories: number;
    speed: number;
    incline: number;
    units: 'metric' | 'imperial';
  }) => {
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

  // Auth flow callbacks
  const handleLoginSuccess = async (session: UserSession) => {
    setUser(session);
    const storedProfile = await db.getUserProfile();
    setUserProfile(storedProfile);

    // Reload splits and history for the newly logged-in user
    const loadedSessions = await db.getSessions();
    setSessions(loadedSessions);
    const loadedHistory = await db.getHistory();
    setWorkoutHistory(loadedHistory);
  };

  const handleSignOut = async () => {
    await db.signOut();
    setUser(null);
    setSessions([]);
    setWorkoutHistory([]);
    setActiveTab('horizon');
  };

  const handleResetData = async () => {
    await db.resetAll();
    
    // Reload reset sessions and history
    const loadedSessions = await db.getSessions();
    setSessions(loadedSessions);
    setWorkoutHistory([]);
    
    // Reset settings states locally
    setZeroUiEnabled(false);
    setAutoOverloadEnabled(true);
    
    // Stay logged in, just route back to home
    setActiveTab('horizon');
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
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

  const renderActiveView = () => {
    switch (activeTab) {
      case 'horizon':
        return (
          <HorizonView
            sessions={sessions}
            workoutHistory={workoutHistory}
            onStartWorkout={handleStartWorkout}
            onShareWorkout={(session) => {
              setShareData({
                sessionTitle: session.sessionTitle,
                sessionFocus: session.sessionFocus,
                actualTonnage: session.actualTonnage,
                exerciseCount: session.logs ? Object.keys(session.logs).length : 0,
                sessionType: session.actualTonnage > 0 ? 'workout' : 'recovery',
                logs: session.logs,
                cardioDetails: session.cardioDetails,
                recoveryDetails: session.recoveryDetails
              });
              setShareModalOpen(true);
            }}
            userProfile={userProfile}
          />
        );
      case 'archive':
        return (
          <ArchiveView
            workoutHistory={workoutHistory}
            onShareWorkout={(session) => {
              setShareData({
                sessionTitle: session.sessionTitle,
                sessionFocus: session.sessionFocus,
                actualTonnage: session.actualTonnage,
                exerciseCount: session.logs ? Object.keys(session.logs).length : 0,
                sessionType: session.actualTonnage > 0 ? 'workout' : 'recovery',
                logs: session.logs,
                cardioDetails: session.cardioDetails,
                recoveryDetails: session.recoveryDetails
              });
              setShareModalOpen(true);
            }}
          />
        );
      case 'profile':
        return (
          <ProfileView
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            zeroUiEnabled={zeroUiEnabled}
            setZeroUiEnabled={toggleZeroUi}
            autoOverloadEnabled={autoOverloadEnabled}
            setAutoOverloadEnabled={toggleAutoOverload}
            onResetData={handleResetData}
            onSignOut={handleSignOut}
          />
        );
      default:
        return (
          <HorizonView
            sessions={sessions}
            workoutHistory={workoutHistory}
            onStartWorkout={handleStartWorkout}
          />
        );
    }
  };

  const showDashboard = !showLoading && user !== null;

  return (
    <div className="bg-obsidian min-h-screen w-full text-foreground relative flex flex-col">
      <AnimatePresence mode="wait">
        {/* 1. Loading Screen */}
        {showLoading && (
          <LoadingScreen key="loading" onFinished={() => setShowLoading(false)} />
        )}

        {/* 2. Login Screen */}
        {!showLoading && user === null && (
          <motion.div
            key="signin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <SignInView onSuccess={handleLoginSuccess} />
          </motion.div>
        )}

        {/* 3. Main Dashboard */}
        {showDashboard && !activeSession && !activeRecoverySession && !activeRestSession && !activeFinisher && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full h-full"
          >
            {renderActiveView()}
          </motion.div>
        )}

        {/* 4. Active Workout Overlay (Crucible) */}
        {showDashboard && activeSession && (
          <motion.div
            key="crucible"
            layoutId={`workout-card-${activeSession.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-obsidian"
          >
            <CrucibleView
              session={activeSession}
              onBack={() => setActiveSession(null)}
              onFinishWorkout={handleFinishWorkout}
              zeroUiEnabled={zeroUiEnabled}
              autoOverloadEnabled={autoOverloadEnabled}
              onUpdateWeight={handleUpdateWeight}
              cnsScale={cnsScale}
              units={userProfile.units || 'metric'}
              workoutHistory={workoutHistory}
            />
          </motion.div>
        )}

        {/* 5. Wednesday Recovery Logger View */}
        {showDashboard && activeRecoverySession && (
          <motion.div
            key="recovery-day"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-obsidian"
          >
            <RecoveryView
              session={activeRecoverySession}
              onBack={() => setActiveRecoverySession(null)}
              onLogRecovery={handleLogRecovery}
              weight={userProfile.weight}
              units={userProfile.units || 'metric'}
            />
          </motion.div>
        )}

        {/* 6. Rest Day Logger View */}
        {showDashboard && activeRestSession && (
          <motion.div
            key="rest-day"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-obsidian"
          >
            <RestView
              session={activeRestSession}
              onBack={() => setActiveRestSession(null)}
              onLogRest={handleLogRest}
            />
          </motion.div>
        )}

        {/* 7. Cardio Finisher Overlay */}
        {showDashboard && activeFinisher && (
          <motion.div
            key="finisher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#050B14]"
          >
            <FinisherView 
              onComplete={handleCompleteFinisher} 
              weight={userProfile.weight}
              units={userProfile.units || 'metric'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav (hidden during workout/cardio/recovery/rest sessions) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        disabled={
          !showDashboard ||
          activeSession !== null ||
          activeRecoverySession !== null ||
          activeRestSession !== null ||
          activeFinisher
        }
      />

      {/* Share Card Modal */}
      {shareData && (
        <ShareCardModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setShareData(null);
          }}
          sessionTitle={shareData.sessionTitle}
          sessionFocus={shareData.sessionFocus}
          actualTonnage={shareData.actualTonnage}
          exerciseCount={shareData.exerciseCount}
          userProfile={userProfile}
          sessionType={shareData.sessionType}
          logs={shareData.logs}
          cardioDetails={shareData.cardioDetails}
          recoveryDetails={shareData.recoveryDetails}
        />
      )}

      {/* CNS Survey Modal */}
      <CnsSurveyModal
        isOpen={cnsSurveyOpen}
        onClose={() => setCnsSurveyOpen(false)}
        onComplete={handleCnsSurveyComplete}
      />
    </div>
  );
}
