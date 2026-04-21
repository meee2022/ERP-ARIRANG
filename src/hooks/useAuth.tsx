"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const SESSION_KEY = "erp_session_token";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "accountant" | "cashier" | "sales" | "warehouse" | "viewer";
  branchIds: string[];
  companyId: string | null;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  // Read token from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    setSessionToken(stored);
    // isLoading will be set to false once validateSession resolves
  }, []);

  // Validate stored session via Convex query
  const validatedUser = useQuery(
    api.auth.validateSession,
    sessionToken ? { token: sessionToken } : "skip"
  );

  // Determine loading state
  useEffect(() => {
    if (sessionToken === null) {
      // No token — not loading, not authenticated
      setIsLoading(false);
    } else if (validatedUser !== undefined) {
      // Query resolved
      setIsLoading(false);
    }
    // Still loading if sessionToken is set but validatedUser is undefined (query in flight)
  }, [sessionToken, validatedUser]);

  // Handle token that resolves as null (invalid/expired)
  useEffect(() => {
    if (validatedUser === null && sessionToken !== null) {
      // Session is invalid — clear it
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
    }
  }, [validatedUser, sessionToken]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginMutation({ email, password });
    localStorage.setItem(SESSION_KEY, result.sessionToken);
    setSessionToken(result.sessionToken);
  }, [loginMutation]);

  const logout = useCallback(async () => {
    if (sessionToken) {
      try {
        await logoutMutation({ token: sessionToken });
      } catch {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
  }, [logoutMutation, sessionToken]);

  const currentUser = (validatedUser as AuthUser | null | undefined) ?? null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        sessionToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
