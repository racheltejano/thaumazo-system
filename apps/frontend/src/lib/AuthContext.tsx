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

        // Try to get role from JWT first
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            if (payload.user_role) {
              if (isMounted) {
                setUser(user);
                setRole(payload.user_role);
                setLoading(false);
              }
              return;
            }
          } catch (jwtError) {
            // JWT parsing failed, fallback to database
          }
        }

        // Fallback to database query if JWT doesn't have role
        // First check if user is a staff member (profiles table)
        const { data: staffProfile, error: staffError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (!staffError && staffProfile) {
          // User is a staff member
          if (isMounted) {
            setUser(user);
            setRole(staffProfile?.role || null);
          }
        } else {
          // Check if user is a client (client_profiles table)
          const { data: clientProfile, error: clientError } = await supabase
            .from("client_profiles")
            .select("id")
            .eq("id", user.id)
            .single();
          
          if (!clientError && clientProfile) {
            // User is a client
            if (isMounted) {
              setUser(user);
              setRole("client");
            }
          } else {
            // User exists but has no profile in either table
            if (isMounted) {
              setUser(user);
              setRole(null);
            }
          }
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