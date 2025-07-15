import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRole="driver">
      <DashboardLayout role="driver">
        {children}
      </DashboardLayout>
    </RoleGuard>
  );
} 