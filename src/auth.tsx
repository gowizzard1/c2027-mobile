import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, loadProfile, login as apiLogin, setToken, switchRole as apiSwitchRole } from './api';
import type { TeamProfile } from './types';

interface AuthContextValue {
  profile: TeamProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  switchRole: (assignmentId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const token = await getToken();
    if (!token) { setProfile(null); return; }
    try {
      setProfile(await loadProfile(token));
    } catch {
      await clearToken();
      setProfile(null);
    }
  };

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const result = await apiLogin(email, password);
    await setToken(result.token);
    setProfile(result);
  };

  const switchRole = async (assignmentId: string) => {
    const token = await getToken();
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const result = await apiSwitchRole(token, assignmentId);
    await setToken(result.token);
    setProfile(result);
  };

  const logout = async () => {
    await clearToken();
    setProfile(null);
  };

  const value = useMemo(() => ({ profile, loading, error, login, switchRole, logout, refresh }), [profile, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
