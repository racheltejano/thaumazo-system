'use client';

import React, { useEffect, useState } from 'react';
import { useStaff } from './hooks/useStaff';
import { StaffOverviewCards } from './components/StaffOverviewCards';
import { StaffTable } from './components/StaffTable';

export default function StaffManagementPage() {
  const { staffs, stats, loading, error } = useStaff();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
    <div 
      className={`px-6 py-8 transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
        <p className="text-gray-600 mt-2">Manage staff accounts, roles, and permissions across the platform</p>
      </div>

      <StaffOverviewCards stats={stats} loading={loading} />
      <StaffTable staffs={staffs} loading={loading} />
    </div>
  );
}