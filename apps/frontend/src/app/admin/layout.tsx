import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="admin">
      <RoleGuard requiredRole="admin">
        {children}
      </RoleGuard>
    </DashboardLayout>
  );
}