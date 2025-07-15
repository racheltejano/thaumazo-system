import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="driver">
      <RoleGuard requiredRole="driver">
        {children}
      </RoleGuard>
    </DashboardLayout>
  );
} 