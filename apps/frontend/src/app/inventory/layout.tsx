import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function InventorySectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRole="inventory_staff">
      <DashboardLayout role="inventory">{children}</DashboardLayout>
    </RoleGuard>
  );
} 