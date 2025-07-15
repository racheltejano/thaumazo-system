import DashboardLayout from '@/components/DashboardLayout'
import AccountSettings from '@/components/AccountSettings'

export default function InventorySettingsPage() {
  return (
    <DashboardLayout role="inventory" userName="Inventory Staff">
      <AccountSettings role="inventory" />
    </DashboardLayout>
  )
} 