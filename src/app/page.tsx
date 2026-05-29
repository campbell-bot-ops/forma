'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { db } from '@/utils/db';
import { Sparkles } from 'lucide-react';

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
import ProgramEditor from '@/components/ProgramEditor';
import OnboardingView from '@/components/OnboardingView';
import LandingPageView from '@/components/LandingPageView';

export default function Home() {
  const {
    showLoading,
    setShowLoading,
    user,
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
    zeroUiEnabled,
    autoOverloadEnabled,
    userProfile,
    recentCompletedWorkout,
    shareModalOpen,
    setShareModalOpen,
    shareData,
    setShareData,
    cnsSurveyOpen,
    setCnsSurveyOpen,
    cnsScale,
    completeCnsSurvey,
    updateWeight,
    finishWorkout,
    logRecovery,
    logRest,
    completeFinisher,
    loginSuccess,
    triggerHaptic,
    showOnboarding,
    setShowOnboarding,
    isOnline,
    toast
  } = useApp();

  const [prevTab, setPrevTab] = useState<TabId>('horizon');
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Update previous tab index for directional sliding transitions
  useEffect(() => {
    setPrevTab(activeTab);
  }, [activeTab]);

  const tabIndices: Record<TabId, number> = {
    horizon: 0,
    archive: 1,
    profile: 2
  };

  const direction = tabIndices[activeTab] >= tabIndices[prevTab] ? 1 : -1;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'horizon':
        return (
          <HorizonView
            sessions={sessions}
            workoutHistory={workoutHistory}
            onStartWorkout={setActiveSession}
            onEditProgram={() => setProgramEditorOpen(true)}
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
            units={userProfile.units || 'metric'}
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
          <ProfileView />
        );
      default:
        return (
          <HorizonView
            sessions={sessions}
            workoutHistory={workoutHistory}
            onStartWorkout={setActiveSession}
          />
        );
    }
  };

  const showDashboard = !showLoading && user !== null;

  return (
    <div className="bg-obsidian min-h-screen w-full text-foreground relative flex flex-col">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 left-1/2 z-[100] flex items-center gap-2.5 px-4 py-2 rounded-full border border-orange-500/30 bg-zinc-950/80 backdrop-blur-md shadow-lg shadow-orange-950/10 pointer-events-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-widest text-zinc-300 uppercase font-mono">
              Offline Mode
            </span>
            <span className="text-[8px] tracking-wider text-zinc-500 uppercase font-mono border-l border-white/10 pl-2">
              Local Storage Active
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showLoading ? (
          <LoadingScreen key="loading" onFinished={() => {
            setShowLoading(false);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('forma_loading_shown', 'true');
            }
          }} />
        ) : showOnboarding ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-obsidian"
          >
            <OnboardingView onFinished={() => {
              setShowOnboarding(false);
              localStorage.setItem('forma_first_visit_done', 'true');
            }} />
          </motion.div>
        ) : user === null ? (
          <motion.div
            key={showAuthForm ? "auth-flow" : "landing"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen flex flex-col"
          >
            {showAuthForm ? (
              <SignInView onSuccess={loginSuccess} onBack={() => setShowAuthForm(false)} />
            ) : (
              <LandingPageView onEnterCrucible={() => setShowAuthForm(true)} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full overflow-hidden relative flex-1 flex flex-col"
          >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={activeTab}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="w-full h-full flex-1"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays rendered on top of dashboard with individual transition elements */}
      <AnimatePresence>
        {user !== null && activeSession && (
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
              onFinishWorkout={finishWorkout}
              zeroUiEnabled={zeroUiEnabled}
              autoOverloadEnabled={autoOverloadEnabled}
              onUpdateWeight={updateWeight}
              cnsScale={cnsScale}
              units={userProfile.units || 'metric'}
              workoutHistory={workoutHistory}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user !== null && activeRecoverySession && (
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
              onLogRecovery={logRecovery}
              weight={userProfile.weight}
              units={userProfile.units || 'metric'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user !== null && activeRestSession && (
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
              onLogRest={logRest}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user !== null && activeFinisher && (
          <motion.div
            key="finisher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#050B14]"
          >
            <FinisherView 
              onComplete={completeFinisher} 
              weight={userProfile.weight}
              units={userProfile.units || 'metric'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user !== null && programEditorOpen && (
          <motion.div
            key="program-editor"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-obsidian"
          >
            <ProgramEditor
              sessions={sessions}
              onClose={() => setProgramEditorOpen(false)}
              onSave={async (updatedSessions) => {
                setSessions(updatedSessions);
                await db.saveSessions(updatedSessions);
              }}
              units={userProfile.units || 'metric'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        disabled={
          !showDashboard ||
          activeSession !== null ||
          activeRecoverySession !== null ||
          activeRestSession !== null ||
          activeFinisher ||
          programEditorOpen
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
        onComplete={completeCnsSurvey}
      />

      {/* Global Sliding Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 z-[999] p-4 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-2xl flex items-center gap-3 max-w-sm mx-auto pointer-events-none"
          >
            <Sparkles className="text-cyan-400 flex-shrink-0 animate-pulse" size={18} />
            <p className="text-xs text-white font-medium">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
