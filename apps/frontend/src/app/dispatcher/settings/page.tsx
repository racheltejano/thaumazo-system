import DashboardLayout from '@/components/DashboardLayout'
import AccountSettings from '@/components/AccountSettings'

export default function DispatcherSettingsPage() {
  return (
    <DashboardLayout role="dispatcher" userName="Dispatcher">
      <AccountSettings role="dispatcher" />
    </DashboardLayout>
  )
} 