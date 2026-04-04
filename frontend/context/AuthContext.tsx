"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { signIn as cognitoSignIn, signOut as cognitoSignOut } from "@/lib/auth";
import { usersApi } from "@/lib/api";
import type { UserResponse } from "@/types";

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to load the current user (cookie may already exist from a
  // previous session — the proxy forwards it as an Authorization header to the backend)
  useEffect(() => {
    usersApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    // 1. Authenticate with Cognito (SDK calls Cognito's own HTTPS endpoints)
    const { idToken } = await cognitoSignIn(email, password);

    // 2. Hand the token to our Route Handler to set the HttpOnly cookie
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    // 3. Fetch backend user profile now that the cookie is set
    const profile = await usersApi.me();
    setUser(profile);
  }

  async function logout() {
    cognitoSignOut();
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
