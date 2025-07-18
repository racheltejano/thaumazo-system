'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    if (!auth.loading && auth.role !== 'dispatcher') {
      router.replace('/unauthorized');
    }
  }, [auth, router]);

  if (!auth || auth.loading) return null;

  return (
    <DashboardLayout role="dispatcher">
      {children}
    </DashboardLayout>
  );
} 