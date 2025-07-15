"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: any;
  role: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_KEY = "thaumazo-auth-cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCachedAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.user || !parsed.role) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedAuth(user: any, role: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ user, role, timestamp: Date.now() })
  );
}

function clearCachedAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = () => setRefreshIndex((i) => i + 1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      // Try cache first
      const cached = getCachedAuth();
      if (cached) {
        if (isMounted) {
          setUser(cached.user);
          setRole(cached.role);
          setLoading(false);
        }
        return;
      }
      // Otherwise, fetch from Supabase
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          if (isMounted) {
            setUser(null);
            setRole(null);
            setLoading(false);
            clearCachedAuth();
          }
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;
        if (isMounted) {
          setUser(user);
          setRole(profile?.role || null);
          setCachedAuth(user, profile?.role || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Unknown error");
          setUser(null);
          setRole(null);
          clearCachedAuth();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  return (
    <AuthContext.Provider value={{ user, role, loading, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext); 