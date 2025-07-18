'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
        router.replace('/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to login
        router.replace('/login');
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <p className="text-orange-500 text-xl font-semibold mb-4">🔐 Logging you out...</p>
      <div className="mt-4 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
    </div>
  );
} 