'use client';

import { useDrivers } from './useDrivers';
import { DriverOverviewCards } from './DriverOverviewCards';
import { DriverTable } from './DriverTable';

interface DriversPageProps {
  title?: string;
  basePath?: string;
}

export default function DriversPage({ title = 'Driver Management', basePath = '/admin/drivers' }: DriversPageProps) {
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
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      <DriverOverviewCards stats={stats} loading={loading} />
      <DriverTable drivers={drivers} loading={loading} basePath={basePath} />
    </div>
  );
} 