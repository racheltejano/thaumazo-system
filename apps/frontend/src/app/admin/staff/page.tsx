'use client';

import React from 'react';
import { useStaff } from './hooks/useStaff';
import { StaffOverviewCards } from './components/StaffOverviewCards';
import { StaffTable } from './components/StaffTable';

export default function StaffManagementPage() {
  const { staffs, stats, loading, error } = useStaff();

  if (error) {
    return (
      <div className="px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading staff</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
      </div>

      <StaffOverviewCards stats={stats} loading={loading} />
      <StaffTable staffs={staffs} loading={loading} />
    </div>
  );
}