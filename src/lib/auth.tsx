"use client";

import { createContext, useContext } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  /**
   * Set when the session check itself failed (the API unreachable, or rate
   * limited) — which is not the same as "logged out", and must not be
   * treated as it.
   */
  error?: string;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, refetching, error } = useQuery(() => api.auth.currentUser(), []);

  // A login/logout bumps the revision and triggers a refetch here, but
  // `loading` alone stays false during it (useQuery keeps serving the
  // previous "no user" result so other screens do not flash empty on
  // unrelated mutations). Without folding in `refetching`, anything
  // gating on `useAuth()` — PortalShell's redirect-to-login effect, most
  // notably — would briefly see "settled, logged out" right after a
  // successful login and bounce straight back to the login page.
  return (
    <AuthContext.Provider value={{ user: data ?? null, loading: loading || refetching, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}

export const roleLabels: Record<User["role"], string> = {
  student: "Student",
  tutor: "Tutor",
  admin: "Super admin",
};
