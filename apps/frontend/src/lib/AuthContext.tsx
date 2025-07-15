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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = () => setRefreshIndex((i) => i + 1);

  useEffect(() => {
    // Listen to Supabase auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      refresh();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          if (isMounted) {
            setUser(null);
            setRole(null);
            setLoading(false);
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
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Unknown error");
          setUser(null);
          setRole(null);
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