"use client";

import { createContext, useContext } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery(() => api.auth.currentUser(), []);

  return (
    <AuthContext.Provider value={{ user: data ?? null, loading }}>
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
