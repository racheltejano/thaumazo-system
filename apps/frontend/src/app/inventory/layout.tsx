import DashboardLayout from '@/components/DashboardLayout';

export default function InventorySectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="inventory">
      {children}
    </DashboardLayout>
  );
} 