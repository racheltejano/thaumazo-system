'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
        
        // Determine redirect based on user role
        if (auth?.role === 'client') {
          router.replace('/client/login');
        } else {
          // For all staff roles (admin, dispatcher, driver, inventory_staff)
          router.replace('/login');
        }
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to appropriate login
        if (auth?.role === 'client') {
          router.replace('/client/login');
        } else {
          router.replace('/login');
        }
      }
    };

    handleLogout();
  }, [router, auth?.role]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <p className="text-orange-500 text-xl font-semibold mb-4">🔐 Logging you out...</p>
      <div className="mt-4 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
    </div>
  );
} 