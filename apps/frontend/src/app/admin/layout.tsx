'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    if (!auth.loading) {
      if (!auth.user) {
        router.replace('/login');
        return;
      }
      if (auth.role !== 'admin') {
        router.replace('/unauthorized');
      }
    }
  }, [auth, router]);

  if (!auth || auth.loading) return null;

  return (
    <DashboardLayout role="admin">
      {children}
    </DashboardLayout>
  );
}