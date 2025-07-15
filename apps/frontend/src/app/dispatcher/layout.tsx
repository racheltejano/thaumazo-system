import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="dispatcher">
      <RoleGuard requiredRole="dispatcher">
        {children}
      </RoleGuard>
    </DashboardLayout>
  );
} 