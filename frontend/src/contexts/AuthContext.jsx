import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, TOKEN_KEY } from '../services/api';
import { AuthContext } from './authContext';

const USER_KEY = 'eltor_coptic_user';
const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const removeStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // The live in-memory session still works when storage is unavailable.
  }
};
const cachedUserSummary = (user) => user ? {
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role,
} : null;

const storeUserSummary = (user) => {
  try {
    const summary = cachedUserSummary(user);
    if (summary) localStorage.setItem(USER_KEY, JSON.stringify(summary));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // The live in-memory session still works when storage is unavailable.
  }
};

export function AuthProvider({ children }) {
  const authVersion = useRef(0);
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return cachedUserSummary(JSON.parse(readStorage(USER_KEY) || 'null'));
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(() => typeof window === 'undefined');

  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const version = authVersion.current;
    try {
      const { user: currentUser } = await api.me();
      if (version !== authVersion.current) return;
      setUser(currentUser);
      storeUserSummary(currentUser);
    } catch (error) {
      // /auth/me returns 403 for a disabled account. Treat that as an invalid
      // session so cached role data cannot keep the account in the app.
      if (version === authVersion.current && [401, 403].includes(error?.status)) {
        removeStorage(TOKEN_KEY);
        removeStorage(USER_KEY);
        setUser(null);
      }
    } finally {
      if (version === authVersion.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    removeStorage(TOKEN_KEY);
    void refreshUser();
    window.addEventListener('focus', refreshUser);
    return () => window.removeEventListener('focus', refreshUser);
  }, [refreshUser]);

  const saveSession = useCallback((session) => {
    authVersion.current += 1;
    // Browser authentication is carried by the HttpOnly session cookie.
    removeStorage(TOKEN_KEY);
    storeUserSummary(session.user);
    setUser(session.user);
    setReady(true);
    return session.user;
  }, []);

  const login = useCallback(async (name, password) => saveSession(await api.login(name, password)), [saveSession]);
  const updateUser = useCallback((updatedUser) => {
    authVersion.current += 1;
    storeUserSummary(updatedUser);
    setUser(updatedUser);
  }, []);
  const logout = useCallback(async () => {
    authVersion.current += 1;
    // Clear the cookie before the next login so a late logout response cannot
    // remove the new session cookie.
    try {
      await api.logout();
    } catch {
      // Still clear local state if the API is temporarily unavailable.
    }
    removeStorage(TOKEN_KEY);
    removeStorage(USER_KEY);
    setUser(null);
    setReady(true);
  }, []);
  const value = useMemo(() => ({ user, ready, login, logout, saveSession, updateUser }), [user, ready, login, logout, saveSession, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
