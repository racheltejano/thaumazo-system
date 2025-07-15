import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRole="dispatcher">
      <DashboardLayout role="dispatcher">
        {children}
      </DashboardLayout>
    </RoleGuard>
  );
} 