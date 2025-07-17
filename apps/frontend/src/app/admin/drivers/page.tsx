'use client';

import { useDrivers } from './hooks/useDrivers';
import { DriverOverviewCards } from './components/DriverOverviewCards';
import { DriverTable } from './components/DriverTable';

export default function DriversPage() {
  const { drivers, stats, loading, error } = useDrivers();

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading drivers</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
      </div>

      <DriverOverviewCards stats={stats} loading={loading} />
      <DriverTable drivers={drivers} loading={loading} />
    </div>
  );
} 