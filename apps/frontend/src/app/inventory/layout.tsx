import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/auth/RoleGuard';

export default function InventorySectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="inventory">
      <RoleGuard requiredRole="inventory_staff">
        {children}
      </RoleGuard>
    </DashboardLayout>
  );
} 