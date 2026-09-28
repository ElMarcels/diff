"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SessionUser } from "./session";

/**
 * Client-side auth state. The session itself lives in an httpOnly cookie the
 * browser never exposes to JS; this provider only mirrors the public profile
 * returned by GET /api/auth/me.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthApiResult {
  error?: string;
  fields?: Record<string, string>;
}

interface AuthContextValue {
  user: SessionUser | null;
  status: AuthStatus;
  refresh: () => Promise<SessionUser | null>;
  signIn: (email: string, password: string) => Promise<AuthApiResult>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<AuthApiResult>;
  signOut: () => Promise<void>;
  isModerator: boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function postJson(url: string, body: unknown): Promise<AuthApiResult & { user?: SessionUser }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error ?? "Something went wrong.", fields: data?.fields };
    return { user: data?.user };
  } catch {
    return { error: "Network error. Try again." };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return null;
      }
      const data = await res.json();
      const next = (data?.user ?? null) as SessionUser | null;
      setUser(next);
      setStatus(next ? "authenticated" : "unauthenticated");
      return next;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await postJson("/api/auth/login", { email, password });
      if (!result.error) await refresh();
      return result;
    },
    [refresh]
  );

  const signUp = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const result = await postJson("/api/auth/register", input);
      if (!result.error) await refresh();
      return result;
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      refresh,
      signIn,
      signUp,
      signOut,
      isModerator: user?.role === "moderator" || user?.role === "owner",
      isOwner: user?.role === "owner",
    }),
    [user, status, refresh, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Drop-in replacement for the old next-auth `useSession()` call sites. */
export function useSession() {
  const { user, status, refresh, signOut } = useAuth();
  return { user, status, refresh, signOut, data: user ? { user } : null };
}
