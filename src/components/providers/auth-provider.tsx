"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (token: string, user: UserSession) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("forex_user");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("forex_user", JSON.stringify(json.data));
          }
        } else {
          setUser(null);
          if (typeof window !== "undefined") localStorage.removeItem("forex_user");
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") localStorage.removeItem("forex_user");
      }
    } catch {
      setUser(null);
      if (typeof window !== "undefined") localStorage.removeItem("forex_user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (_token: string, userData: UserSession) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      localStorage.setItem("forex_user", JSON.stringify(userData));
    }
    router.push("/");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") localStorage.removeItem("forex_user");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
