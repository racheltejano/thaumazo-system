'use client';

import DashboardLayout from '../components/DashboardLayout';

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin" userName="Admin">
      {/* Empty dashboard placeholder for /admin */}
      <div className="h-32 flex items-center justify-center text-gray-400 text-lg">Welcome to the Admin Dashboard</div>
    </DashboardLayout>
  );
}
