"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiClient } from "@/lib/api/client";
import { signInWithGooglePopup, signOutFirebase } from "@/lib/auth/firebase";
import {
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "@/lib/auth/token-store";
import type { SessionUser } from "@/lib/types";

type AuthContextValue = {
  token: string | null;
  user: SessionUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithDevEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(storedUser as SessionUser);
    setIsLoading(false);
  }, []);

  const persistSession = (nextToken: string, nextUser: SessionUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setStoredToken(nextToken);
    setStoredUser(nextUser);
  };

  const loginWithGoogle = async () => {
    const idToken = await signInWithGooglePopup();
    const response = await apiClient.post<{
      token: string;
      user: SessionUser;
    }>("/api/auth/firebase", {
      idToken,
    });
    persistSession(response.token, response.user);
  };

  const loginWithDevEmail = async (email: string) => {
    const response = await apiClient.post<{
      token: string;
      user: SessionUser;
    }>("/api/auth/firebase", {
      idToken: email,
    });
    persistSession(response.token, response.user);
  };

  const logout = async () => {
    await signOutFirebase().catch(() => undefined);
    setToken(null);
    setUser(null);
    clearStoredToken();
    clearStoredUser();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      loginWithGoogle,
      loginWithDevEmail,
      logout,
    }),
    [token, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

