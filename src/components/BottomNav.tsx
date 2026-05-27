'use client';

import React from 'react';
import { Home, Activity, User } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabId = 'horizon' | 'archive' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  disabled?: boolean;
}

export default function BottomNav({ activeTab, setActiveTab, disabled = false }: BottomNavProps) {
  const tabs = [
    { id: 'horizon' as TabId, label: 'Horizon', icon: Home },
    { id: 'archive' as TabId, label: 'History', icon: Activity },
    { id: 'profile' as TabId, label: 'Profile', icon: User },
  ];

  if (disabled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-gradient-to-t from-obsidian via-obsidian/95 to-transparent pointer-events-none">
      <nav className="max-w-md mx-auto glass-panel glass-panel-glow rounded-full px-6 py-3 flex items-center justify-around pointer-events-auto shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 px-3 focus:outline-none transition-colors duration-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute inset-0 bg-white/5 rounded-full border border-white/5"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`relative z-10 flex flex-col items-center gap-1 ${
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide uppercase">
                  {tab.label}
                </span>
              </motion.div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
