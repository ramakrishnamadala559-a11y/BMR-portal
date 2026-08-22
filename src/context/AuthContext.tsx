'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  status: string;
  permissions: Array<{ module: string; action: string }>;
}

interface AuthContextType {
  user: User | null;
  studentProfile: any | null;
  settings: any | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSettings = async () => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_settings');
      if (cached) {
        setSettings(JSON.parse(cached));
      }
    }

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_settings', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchCurrentUser = async () => {
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem('cached_user');
      const cachedProfile = localStorage.getItem('cached_student_profile');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
      if (cachedProfile) {
        setStudentProfile(JSON.parse(cachedProfile));
      }
    }

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStudentProfile(data.studentProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('has_session', 'true');
          localStorage.setItem('cached_user', JSON.stringify(data.user));
          if (data.studentProfile) {
            localStorage.setItem('cached_student_profile', JSON.stringify(data.studentProfile));
          } else {
            localStorage.removeItem('cached_student_profile');
          }
        }
      } else {
        setUser(null);
        setStudentProfile(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('has_session');
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_student_profile');
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth state (offline status), retaining cached session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSession = localStorage.getItem('has_session') === 'true';
      if (!hasSession) {
        setLoading(false);
      }
    }
    fetchCurrentUser();
    fetchSettings();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchCurrentUser();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      setUser(null);
      setStudentProfile(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('has_session');
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_student_profile');
      }
      router.push('/login');
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'OWNER') return true;
    return user.permissions.some(p => p.module === module && p.action === action);
  };

  const refreshAuthData = async () => {
    await fetchCurrentUser();
    await fetchSettings();
  };

  return (
    <AuthContext.Provider value={{
      user,
      studentProfile,
      settings,
      loading,
      login,
      logout,
      refreshAuth: refreshAuthData,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
