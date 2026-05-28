'use client';

import { createClient } from '@supabase/supabase-js';
import { WorkoutSession, GENESIS_SPLIT } from '@/constants/workout';
import { UserProfile, UserSession } from '@/types/workout';

// Simulated network latency helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check if Supabase keys are provided and are not placeholder text
const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url && 
    url !== 'your_supabase_project_url' && 
    url.startsWith('http') && 
    key && 
    key !== 'your_supabase_anon_key'
  );
};

// Lazy-loaded Supabase Client
let supabaseClientInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!supabaseClientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    supabaseClientInstance = createClient(url, key);
  }
  return supabaseClientInstance;
};

// Log configuration status on load
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured()) {
    console.log('FORMA: Live Supabase database connection active.');
  } else {
    console.warn('FORMA: Supabase credentials not configured in .env.local. Running in local storage simulator mode.');
  }
}

let isSyncing = false;

export const db = {
  /**
   * Authenticate user credentials and return user session
   */
  async signIn(email: string, password: string): Promise<UserSession> {
    if (!isSupabaseConfigured()) {
      // Local simulation sign in
      await delay(600);
      if (!email.includes('@')) {
        throw new Error('Invalid email format. Please specify a correct email.');
      }
      if (password.length < 4) {
        throw new Error('Password must be at least 4 characters long.');
      }

      const session: UserSession = {
        name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email: email,
        token: 'forma_jwt_mock_token_' + Math.random().toString(36).substr(2, 9)
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_user_session', JSON.stringify(session));
        
        // Seed default profile if not exists
        const existingProfile = localStorage.getItem('forma_user_profile');
        if (!existingProfile) {
          const defaultProfile: UserProfile = {
            name: session.name,
            email: session.email,
            weight: 78.4,
            height: 182,
            bodyFat: 12.8,
            units: 'metric'
          };
          localStorage.setItem('forma_user_profile', JSON.stringify(defaultProfile));
        }
      }
      return session;
    }

    try {
      // Live Supabase Authenticate
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session || !data.user) {
        throw new Error('Failed to retrieve active session.');
      }

      // Try fetching user profile from database
      const profileRes = (await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()) as any;

      let name = data.user.user_metadata?.name || email.split('@')[0];
      if (profileRes.data) {
        name = profileRes.data.name;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'forma_user_profile',
            JSON.stringify({
              name: profileRes.data.name,
              email: profileRes.data.email,
              weight: Number(profileRes.data.weight),
              height: Number(profileRes.data.height),
              bodyFat: Number(profileRes.data.body_fat),
              units: profileRes.data.units || 'metric'
            })
          );
          localStorage.setItem('forma_setting_zeroui', String(profileRes.data.zero_ui_enabled));
          localStorage.setItem('forma_setting_autooverload', String(profileRes.data.auto_overload_enabled));
        }
      }

      const session: UserSession = {
        name,
        email: data.user.email || email,
        token: data.session.access_token
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_user_session', JSON.stringify(session));
      }

      return session;
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch') || e instanceof TypeError) {
        console.warn('FORMA: Supabase connection failed during sign in. Falling back to local storage simulator mode.');
        // Run simulator
        await delay(600);
        if (!email.includes('@')) {
          throw new Error('Invalid email format. Please specify a correct email.');
        }
        if (password.length < 4) {
          throw new Error('Password must be at least 4 characters long.');
        }

        const session: UserSession = {
          name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email: email,
          token: 'forma_jwt_mock_token_' + Math.random().toString(36).substr(2, 9)
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('forma_user_session', JSON.stringify(session));
          
          const existingProfile = localStorage.getItem('forma_user_profile');
          if (!existingProfile) {
            const defaultProfile: UserProfile = {
              name: session.name,
              email: session.email,
              weight: 78.4,
              height: 182,
              bodyFat: 12.8,
              units: 'metric'
            };
            localStorage.setItem('forma_user_profile', JSON.stringify(defaultProfile));
          }
        }
        return session;
      }
      throw e;
    }
  },

  /**
   * Register a new user with biometrics data
   */
  async signUp(
    email: string, 
    password: string, 
    name: string, 
    weight: number, 
    height: number, 
    bodyFat: number
  ): Promise<UserSession> {
    if (weight <= 0 || height <= 0 || bodyFat <= 0) {
      throw new Error('Biometric metrics must be greater than zero.');
    }

    if (!isSupabaseConfigured()) {
      // Local simulation sign up
      await delay(700);
      if (!email.includes('@')) {
        throw new Error('Invalid email format.');
      }
      if (password.length < 4) {
        throw new Error('Password must be at least 4 characters.');
      }
      if (!name.trim()) {
        throw new Error('Name cannot be blank.');
      }

      const session: UserSession = {
        name: name.trim(),
        email: email.trim(),
        token: 'forma_jwt_mock_token_' + Math.random().toString(36).substr(2, 9)
      };

      const profile: UserProfile = {
        name: name.trim(),
        email: email.trim(),
        weight,
        height,
        bodyFat,
        units: 'metric'
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_user_session', JSON.stringify(session));
        localStorage.setItem('forma_user_profile', JSON.stringify(profile));
        localStorage.setItem('forma_setting_zeroui', 'false');
        localStorage.setItem('forma_setting_autooverload', 'true');
      }

      return session;
    }

    try {
      // Live Supabase Register
      const supabase = getSupabase();
      const redirectToUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectToUrl,
          data: {
            name: name.trim(),
            weight,
            height,
            bodyFat
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed.');
      }

      if (data.session) {
        const session: UserSession = {
          name: name.trim(),
          email: email.trim(),
          token: data.session.access_token
        };

        const profile: UserProfile = {
          name: name.trim(),
          email: email.trim(),
          weight,
          height,
          bodyFat,
          units: 'metric'
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('forma_user_session', JSON.stringify(session));
          localStorage.setItem('forma_user_profile', JSON.stringify(profile));
          localStorage.setItem('forma_setting_zeroui', 'false');
          localStorage.setItem('forma_setting_autooverload', 'true');
        }

        return session;
      } else {
        throw new Error('Sign up successful! Please check your email inbox to confirm registration, then sign in.');
      }
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch') || e instanceof TypeError) {
        console.warn('FORMA: Supabase connection failed during sign up. Falling back to local storage simulator mode.');
        // Run simulator
        await delay(700);
        if (!email.includes('@')) {
          throw new Error('Invalid email format.');
        }
        if (password.length < 4) {
          throw new Error('Password must be at least 4 characters.');
        }
        if (!name.trim()) {
          throw new Error('Name cannot be blank.');
        }

        const session: UserSession = {
          name: name.trim(),
          email: email.trim(),
          token: 'forma_jwt_mock_token_' + Math.random().toString(36).substr(2, 9)
        };

        const profile: UserProfile = {
          name: name.trim(),
          email: email.trim(),
          weight,
          height,
          bodyFat,
          units: 'metric'
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('forma_user_session', JSON.stringify(session));
          localStorage.setItem('forma_user_profile', JSON.stringify(profile));
          localStorage.setItem('forma_setting_zeroui', 'false');
          localStorage.setItem('forma_setting_autooverload', 'true');
        }

        return session;
      }
      throw e;
    }
  },

  /**
   * Log out active session
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("FORMA: Supabase signOut failed (network issue):", e);
      }
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('forma_user_session');
      localStorage.removeItem('forma_user_profile');
      localStorage.removeItem('forma_sessions');
      localStorage.removeItem('forma_history');
    }
  },

  /**
   * Check if there is an active session
   */
  async getLiveSession(): Promise<UserSession | null> {
    if (!isSupabaseConfigured()) {
      if (typeof window === 'undefined') return null;
      const sessionStr = localStorage.getItem('forma_user_session');
      if (!sessionStr) return null;
      try {
        return JSON.parse(sessionStr);
      } catch (e) {
        return null;
      }
    }

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_user_session');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        return null;
      }

      const userSession: UserSession = {
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        token: session.access_token
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_user_session', JSON.stringify(userSession));
      }

      return userSession;
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch') || e instanceof TypeError) {
        console.warn('FORMA: Supabase connection failed in getLiveSession. Falling back to local storage session.');
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_user_session');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (err) {}
          }
        }
        return null;
      }
      throw e;
    }
  },

  /**
   * Get active user biometrics profile
   */
  async getUserProfile(): Promise<UserProfile> {
    const defaultProfile: UserProfile = {
      name: 'Alexander Thorne',
      email: 'alex@forma.dev',
      weight: 78.4,
      height: 182,
      bodyFat: 12.8,
      units: 'metric'
    };

    if (!isSupabaseConfigured()) {
      if (typeof window === 'undefined') return defaultProfile;
      const profileStr = localStorage.getItem('forma_user_profile');
      if (!profileStr) return defaultProfile;
      try {
        const parsed = JSON.parse(profileStr);
        return {
          units: 'metric',
          ...parsed
        };
      } catch (e) {
        return defaultProfile;
      }
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_user_profile');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        return defaultProfile;
      }

      const { data, error } = (await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()) as any;

      if (error || !data) {
        return {
          name: user.user_metadata?.name || user.email?.split('@')[0] || defaultProfile.name,
          email: user.email || defaultProfile.email,
          weight: Number(user.user_metadata?.weight) || defaultProfile.weight,
          height: Number(user.user_metadata?.height) || defaultProfile.height,
          bodyFat: Number(user.user_metadata?.bodyFat) || defaultProfile.bodyFat,
          units: 'metric'
        };
      }

      const profile: UserProfile = {
        name: data.name,
        email: data.email,
        weight: Number(data.weight),
        height: Number(data.height),
        bodyFat: Number(data.body_fat),
        units: data.units as 'metric' | 'imperial'
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_user_profile', JSON.stringify(profile));
        localStorage.setItem('forma_setting_zeroui', String(data.zero_ui_enabled));
        localStorage.setItem('forma_setting_autooverload', String(data.auto_overload_enabled));
      }

      return profile;
    } catch (e) {
      console.warn("FORMA Offline Profile Sync Fallback:", e);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('forma_user_profile');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {}
        }
      }
      return defaultProfile;
    }
  },

  /**
   * Save updated profile biometrics
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_user_profile', JSON.stringify(profile));
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const zeroUi = typeof window !== 'undefined' ? localStorage.getItem('forma_setting_zeroui') === 'true' : false;
      const autoOverload = typeof window !== 'undefined' ? localStorage.getItem('forma_setting_autooverload') === 'true' : true;

      await (supabase.from('profiles') as any)
        .upsert({
          id: user.id,
          name: profile.name,
          email: profile.email,
          weight: profile.weight,
          height: profile.height,
          body_fat: profile.bodyFat,
          units: profile.units || 'metric',
          zero_ui_enabled: zeroUi,
          auto_overload_enabled: autoOverload,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("FORMA Offline Profile Save Fallback:", e);
    }
  },

  /**
   * Update settings specifically
   */
  async syncSettings(zeroUiEnabled: boolean, autoOverloadEnabled: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from('profiles') as any)
        .update({
          zero_ui_enabled: zeroUiEnabled,
          auto_overload_enabled: autoOverloadEnabled
        })
        .eq('id', user.id);
    } catch (e) {
      console.warn("FORMA Offline Settings Sync Fallback:", e);
    }
  },

  /**
   * Get all active sessions/program splits
   */
  async getSessions(): Promise<WorkoutSession[]> {
    if (!isSupabaseConfigured()) {
      await delay(100);
      if (typeof window === 'undefined') return GENESIS_SPLIT;
      const sessionsStr = localStorage.getItem('forma_sessions');
      if (!sessionsStr) {
        localStorage.setItem('forma_sessions', JSON.stringify(GENESIS_SPLIT));
        return GENESIS_SPLIT;
      }
      try {
        return JSON.parse(sessionsStr);
      } catch (e) {
        return GENESIS_SPLIT;
      }
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_sessions');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        return GENESIS_SPLIT;
      }

      const { data, error } = (await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)) as any;

      if (error || !data || data.length === 0) {
        const defaultRows = GENESIS_SPLIT.map(s => ({
          id: s.id,
          user_id: user.id,
          day: s.day,
          title: s.title,
          focus: s.focus,
          type: s.type,
          key_movement_name: s.keyMovementName || null,
          primary_goal: s.primaryGoal,
          total_tonnage: s.totalTonnage,
          exercises: s.exercises
        }));

        try {
          await (supabase.from('workout_sessions') as any).insert(defaultRows);
        } catch (insertErr) {
          console.warn("Supabase sessions seed failed:", insertErr);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('forma_sessions', JSON.stringify(GENESIS_SPLIT));
        }
        return GENESIS_SPLIT;
      }

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sat/Sun'];
      const sessions: WorkoutSession[] = data.map((row: any) => ({
        id: row.id,
        day: row.day,
        title: row.title,
        focus: row.focus,
        type: row.type as 'workout' | 'recovery' | 'rest',
        keyMovementName: row.key_movement_name || undefined,
        primaryGoal: row.primary_goal,
        totalTonnage: Number(row.total_tonnage),
        exercises: row.exercises
      })).sort((a: any, b: any) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_sessions', JSON.stringify(sessions));
      }
      return sessions;
    } catch (e) {
      console.warn("FORMA Offline Sessions Fetch Fallback:", e);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('forma_sessions');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {}
        }
      }
      return GENESIS_SPLIT;
    }
  },

  /**
   * Persist entire training program splits
   */
  async saveSessions(sessions: WorkoutSession[]): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_sessions', JSON.stringify(sessions));
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = sessions.map(s => ({
        id: s.id,
        user_id: user.id,
        day: s.day,
        title: s.title,
        focus: s.focus,
        type: s.type,
        key_movement_name: s.keyMovementName || null,
        primary_goal: s.primaryGoal,
        total_tonnage: s.totalTonnage,
        exercises: s.exercises,
        updated_at: new Date().toISOString()
      }));

      await (supabase.from('workout_sessions') as any).upsert(rows);
    } catch (e) {
      console.warn("FORMA Offline Sessions Save Fallback:", e);
    }
  },

  /**
   * Fetch complete training activity ledger logs
   */
  async getHistory(): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      await delay(100);
      if (typeof window === 'undefined') return [];
      const historyStr = localStorage.getItem('forma_history');
      if (!historyStr) return [];
      try {
        return JSON.parse(historyStr);
      } catch (e) {
        return [];
      }
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_history');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        return [];
      }

      const { data, error } = (await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })) as any;

      if (error || !data) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('forma_history');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        return [];
      }

      const history = data.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        sessionTitle: row.session_title,
        sessionFocus: row.session_focus,
        date: row.date,
        actualTonnage: Number(row.actual_tonnage),
        logs: row.logs,
        cnsScore: row.cns_score,
        recoveryDetails: row.recovery_details,
        restDetails: row.rest_details,
        cardioDetails: row.cardio_details,
        notes: row.notes || row.cardio_details?.notes || row.rest_details?.notes || undefined,
        tags: row.tags || row.cardio_details?.tags || row.rest_details?.tags || undefined
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (typeof window !== 'undefined') {
        localStorage.setItem('forma_history', JSON.stringify(history));
      }
      return history;
    } catch (e) {
      console.warn("FORMA Offline History Fetch Fallback:", e);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('forma_history');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {}
        }
      }
      return [];
    }
  },

  /**
   * Log completed workout to history ledger
   */
  async logWorkout(completedLog: any): Promise<any[]> {
    let localHistory: any[] = [];
    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('forma_history');
      if (historyStr) {
        try {
          localHistory = JSON.parse(historyStr);
        } catch (e) {}
      }
      localHistory = [completedLog, ...localHistory];
      localStorage.setItem('forma_history', JSON.stringify(localHistory));
    }

    if (!isSupabaseConfigured()) {
      return localHistory;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = (await (supabase.from('workout_history') as any)
          .insert({
            user_id: user.id,
            session_id: completedLog.sessionId,
            session_title: completedLog.sessionTitle,
            session_focus: completedLog.sessionFocus,
            date: completedLog.date,
            actual_tonnage: completedLog.actualTonnage || 0,
            logs: completedLog.logs || {},
            cns_score: completedLog.cnsScore || null,
            recovery_details: completedLog.recoveryDetails || null,
            rest_details: completedLog.restDetails ? {
              ...completedLog.restDetails,
              notes: completedLog.notes || completedLog.restDetails.notes
            } : null,
            cardio_details: completedLog.cardioDetails ? {
              ...completedLog.cardioDetails,
              notes: completedLog.notes,
              tags: completedLog.tags
            } : (completedLog.notes || completedLog.tags ? {
              notes: completedLog.notes,
              tags: completedLog.tags
            } : null)
          })
          .select()) as any;

        if (!error && data && data.length > 0) {
          completedLog.id = data[0].id;
          if (typeof window !== 'undefined') {
            localHistory[0].id = data[0].id;
            localStorage.setItem('forma_history', JSON.stringify(localHistory));
          }
        }
      }
    } catch (e) {
      console.warn("FORMA Offline Workout Logging Fallback:", e);
    }

    return localHistory;
  },

  /**
   * Update cardio details for a completed session finisher
   */
  async updateWorkoutCardio(date: string, sessionId: string, cardioDetails: any): Promise<any[]> {
    let history: any[] = [];
    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('forma_history');
      if (historyStr) {
        try {
          history = JSON.parse(historyStr);
        } catch (e) {}
      }
      history = history.map(item => {
        if (item.date === date && item.sessionId === sessionId) {
          return {
            ...item,
            cardioDetails: {
              ...(item.cardioDetails || {}),
              ...cardioDetails
            }
          };
        }
        return item;
      });
      localStorage.setItem('forma_history', JSON.stringify(history));
    }

    if (!isSupabaseConfigured()) {
      return history;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch current to merge
        const { data: existing } = (await supabase
          .from('workout_history')
          .select('cardio_details')
          .eq('user_id', user.id)
          .eq('date', date)
          .eq('session_id', sessionId)
          .single()) as any;

        const mergedCardioDetails = {
          ...(existing?.cardio_details || {}),
          ...cardioDetails
        };

        await (supabase.from('workout_history') as any)
          .update({ cardio_details: mergedCardioDetails })
          .eq('user_id', user.id)
          .eq('date', date)
          .eq('session_id', sessionId);
      }
    } catch (e) {
      console.warn("FORMA Offline Cardio Update Fallback:", e);
    }

    return history;
  },

  /**
   * Delete a completed workout from history
   */
  async deleteWorkout(date: string, sessionId: string, id?: string): Promise<any[]> {
    let localHistory: any[] = [];
    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('forma_history');
      if (historyStr) {
        try {
          localHistory = JSON.parse(historyStr);
        } catch (e) {}
      }
      localHistory = localHistory.filter(item => !(item.date === date && item.sessionId === sessionId));
      localStorage.setItem('forma_history', JSON.stringify(localHistory));
    }

    if (!isSupabaseConfigured()) {
      return localHistory;
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (id) {
          await (supabase.from('workout_history') as any).delete().eq('id', id).eq('user_id', user.id);
        } else {
          await (supabase.from('workout_history') as any).delete().eq('date', date).eq('session_id', sessionId).eq('user_id', user.id);
        }
      }
    } catch (e) {
      console.warn("FORMA Offline Workout Deletion Fallback:", e);
    }

    return localHistory;
  },

  /**
   * Get body weight history logs
   */
  async getWeightHistory(): Promise<Array<{ date: string; weight: number }>> {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('forma_weight_history');
    if (!stored) {
      // Seed default with current profile weight
      const profile = await this.getUserProfile();
      const initialHistory = [{ date: new Date().toISOString(), weight: profile.weight }];
      localStorage.setItem('forma_weight_history', JSON.stringify(initialHistory));
      return initialHistory;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  /**
   * Log a new weight entry
   */
  async logWeight(weight: number): Promise<Array<{ date: string; weight: number }>> {
    const history = await this.getWeightHistory();
    const todayStr = new Date().toDateString();
    const entryDate = new Date().toISOString();
    
    // Replace today's log if it exists, otherwise append
    const filtered = history.filter(item => new Date(item.date).toDateString() !== todayStr);
    const updated = [
      ...filtered,
      { date: entryDate, weight: parseFloat(weight.toFixed(1)) }
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_weight_history', JSON.stringify(updated));
    }
    
    // Sync current profile weight
    const profile = await this.getUserProfile();
    await this.saveUserProfile({ ...profile, weight });

    // Sync weight history entry back to Supabase if active
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase.from('weight_history') as any)
            .upsert({
              user_id: user.id,
              date: entryDate,
              weight: parseFloat(weight.toFixed(1))
            }, { onConflict: 'user_id,date' });
        }
      } catch (e) {
        console.warn("FORMA Immediate Weight History Sync Fallback (table may not exist):", e);
      }
    }
    
    return updated;
  },

  /**
   * Delete a weight log entry
   */
  async deleteWeightLog(dateString: string): Promise<Array<{ date: string; weight: number }>> {
    const history = await this.getWeightHistory();
    const updated = history.filter(item => item.date !== dateString);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_weight_history', JSON.stringify(updated));
    }
    
    // If we have remaining logs, set user profile weight to the most recent log
    if (updated.length > 0) {
      const mostRecent = [...updated].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const profile = await this.getUserProfile();
      await this.saveUserProfile({ ...profile, weight: mostRecent.weight });
    }

    // Try to delete from Supabase table if active
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase.from('weight_history') as any)
            .delete()
            .eq('user_id', user.id)
            .eq('date', dateString);
        }
      } catch (e) {
        console.warn("FORMA Weight History Delete Sync Fallback:", e);
      }
    }
    
    return updated;
  },

  /**
   * Reset database records (clears history, resets sessions to baseline)
   */
  async resetAll(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Clear history logs in database
          await (supabase.from('workout_history') as any).delete().eq('user_id', user.id);
          
          // Re-seed default workout sessions (delete then insert)
          await (supabase.from('workout_sessions') as any).delete().eq('user_id', user.id);
          const defaultRows = GENESIS_SPLIT.map(s => ({
            id: s.id,
            user_id: user.id,
            day: s.day,
            title: s.title,
            focus: s.focus,
            type: s.type,
            key_movement_name: s.keyMovementName || null,
            primary_goal: s.primaryGoal,
            total_tonnage: s.totalTonnage,
            exercises: s.exercises
          }));
          await (supabase.from('workout_sessions') as any).insert(defaultRows);
        }
      }
    } catch (e) {
      console.warn("FORMA Offline Reset Fallback:", e);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_sessions', JSON.stringify(GENESIS_SPLIT));
      localStorage.setItem('forma_history', JSON.stringify([]));
      localStorage.removeItem('forma_weight_history');
      localStorage.setItem('forma_setting_zeroui', 'false');
      localStorage.setItem('forma_setting_autooverload', 'true');
    }
  },

  /**
   * Synchronize any local logs created while offline to Supabase
   */
  async syncOfflineQueue(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    if (isSyncing) return;
    isSyncing = true;
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Sync User Profile if dirty
      const profileStr = localStorage.getItem('forma_user_profile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          const zeroUi = typeof window !== 'undefined' ? localStorage.getItem('forma_setting_zeroui') === 'true' : false;
          const autoOverload = typeof window !== 'undefined' ? localStorage.getItem('forma_setting_autooverload') === 'true' : true;

          await (supabase.from('profiles') as any)
            .upsert({
              id: user.id,
              name: profile.name,
              email: profile.email,
              weight: profile.weight,
              height: profile.height,
              body_fat: profile.bodyFat,
              units: profile.units || 'metric',
              zero_ui_enabled: zeroUi,
              auto_overload_enabled: autoOverload,
              updated_at: new Date().toISOString()
            });
        } catch (e) {}
      }

      // 2. Sync un-synced history logs (logs without id)
      const historyStr = localStorage.getItem('forma_history');
      if (historyStr) {
        try {
          const localHistory: any[] = JSON.parse(historyStr);
          const unsyncedLogs = localHistory.filter(item => !item.id);
          
          for (const completedLog of unsyncedLogs) {
            const { data, error } = (await (supabase.from('workout_history') as any)
              .insert({
                user_id: user.id,
                session_id: completedLog.sessionId,
                session_title: completedLog.sessionTitle,
                session_focus: completedLog.sessionFocus,
                date: completedLog.date,
                actual_tonnage: completedLog.actualTonnage || 0,
                logs: completedLog.logs || {},
                cns_score: completedLog.cnsScore || null,
                recovery_details: completedLog.recoveryDetails || null,
                rest_details: completedLog.restDetails ? {
                  ...completedLog.restDetails,
                  notes: completedLog.notes || completedLog.restDetails.notes
                } : null,
                cardio_details: completedLog.cardioDetails ? {
                  ...completedLog.cardioDetails,
                  notes: completedLog.notes,
                  tags: completedLog.tags
                } : (completedLog.notes || completedLog.tags ? {
                  notes: completedLog.notes,
                  tags: completedLog.tags
                } : null)
              })
              .select()) as any;

            if (!error && data && data.length > 0) {
              completedLog.id = data[0].id;
            }
          }

          // Re-load the history from localStorage to ensure we don't overwrite changes made during the sync loop
          const currentHistoryStr = localStorage.getItem('forma_history');
          if (currentHistoryStr) {
            const currentHistory = JSON.parse(currentHistoryStr);
            const localHistoryMap = new Map(localHistory.filter(item => item.id).map(item => [item.date + '-' + item.sessionId, item.id]));
            currentHistory.forEach((item: any) => {
              const key = item.date + '-' + item.sessionId;
              if (localHistoryMap.has(key)) {
                item.id = localHistoryMap.get(key);
              }
            });
            localStorage.setItem('forma_history', JSON.stringify(currentHistory));
          } else {
            localStorage.setItem('forma_history', JSON.stringify(localHistory));
          }
        } catch (e) {
          console.warn("FORMA Offline Reconcile History Error:", e);
        }
      }

      // 3. Sync local weight history logs (weigh-ins)
      const weightHistoryStr = localStorage.getItem('forma_weight_history');
      if (weightHistoryStr) {
        try {
          const localWeightHistory: Array<{ date: string; weight: number }> = JSON.parse(weightHistoryStr);
          for (const entry of localWeightHistory) {
            await (supabase.from('weight_history') as any)
              .upsert({
                user_id: user.id,
                date: entry.date,
                weight: entry.weight
              }, { onConflict: 'user_id,date' });
          }
        } catch (e) {
          console.warn("FORMA Offline Weight History Sync Fallback (table may not exist):", e);
        }
      }
    } catch (e) {
      console.warn("syncOfflineQueue failed", e);
    } finally {
      isSyncing = false;
    }
  }
};
