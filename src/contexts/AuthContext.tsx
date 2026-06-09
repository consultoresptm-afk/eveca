import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'EDITOR' | 'PENDING';
  status: string;
  approval_requested: boolean;
  access_requested_at: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfileState: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick check for SuperAdmin status
  const isSuperAdmin = user?.email === 'wmartinezm360@gmail.com' || profile?.role === 'SUPERADMIN';

  const fetchProfile = async (userId: string, userEmail: string) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
      }

      // If profile does not exist yet (but they logged in with auth), auto-create or fill it
      if (!data) {
        const isSupreme = userEmail === 'wmartinezm360@gmail.com';
        const defaultProfile: Omit<Profile, 'created_at'> = {
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0],
          role: isSupreme ? 'SUPERADMIN' : 'PENDING',
          status: isSupreme ? 'approved' : 'pending',
          approval_requested: false,
          access_requested_at: null,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .maybeSingle();

        if (insertError) {
          console.error("Could not insert dynamic profile:", insertError);
          // Set in-memory profile if insert failed (perhaps due to DB connection or tables not created yet)
          setProfile(defaultProfile as Profile);
        } else if (inserted) {
          setProfile(inserted as Profile);
        }
      } else {
        // Handle Supreme Admin verification on profile load:
        // Ensure wmartinezm360@gmail.com always gets mapped to approved SUPERADMIN.
        if (userEmail === 'wmartinezm360@gmail.com' && (data.status !== 'approved' || data.role !== 'SUPERADMIN')) {
          const { data: updated, error: updateErr } = await supabase
            .from('profiles')
            .update({ status: 'approved', role: 'SUPERADMIN' })
            .eq('id', userId)
            .select()
            .maybeSingle();
          if (!updateErr && updated) {
            setProfile(updated as Profile);
          } else {
            setProfile({ ...data, status: 'approved', role: 'SUPERADMIN' } as Profile);
          }
        } else {
          setProfile(data as Profile);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || '');
    }
  };

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Auth session error. Clearing local session state:", error);
        try {
          const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.email || '').finally(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error("Critical error in getSession:", err);
      setLoading(false);
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id, data.user.email || '');
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name }
      }
    });

    if (error) return { error };

    if (data.user) {
      // Create profile right away
      const isSupreme = email === 'wmartinezm360@gmail.com';
      const defaultProfile = {
        id: data.user.id,
        email: email,
        name: name,
        role: isSupreme ? 'SUPERADMIN' : 'PENDING',
        status: isSupreme ? 'approved' : 'pending',
        approval_requested: false,
        access_requested_at: null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([defaultProfile]);

      if (profileError) {
        console.error("SignUp dynamic profile error:", profileError);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Error calling auth.signOut():", e);
    } finally {
      setUser(null);
      setProfile(null);
      try {
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isSuperAdmin, signIn, signUp, signOut, refreshProfile, setProfileState: setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth dynamically requires AuthProvider wrapper context.');
  }
  return context;
};
