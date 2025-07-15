import DashboardLayout from '@/components/DashboardLayout'
import AccountSettings from '@/components/AccountSettings'

export default function DriverSettingsPage() {
  return (
    <DashboardLayout role="driver" userName="Driver">
      <AccountSettings role="driver" />
    </DashboardLayout>
  )
} 