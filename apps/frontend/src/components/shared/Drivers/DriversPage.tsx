'use client';

import { useEffect, useState } from 'react';
import { useDrivers } from './useDrivers';
import { DriverOverviewCards } from './DriverOverviewCards';
import { DriverTable } from './DriverTable';

interface DriversPageProps {
  title?: string;
  description?: string;
  basePath?: string;
}

export default function DriversPage({ 
  title = 'Driver Management', 
  description = 'Manage driver accounts, availability, and performance tracking',
  basePath = '/admin/drivers' 
}: DriversPageProps) {
  const { drivers, stats, loading, error } = useDrivers();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
    <div 
      className={`p-6 transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>

      <DriverOverviewCards stats={stats} loading={loading} />
      <DriverTable drivers={drivers} loading={loading} basePath={basePath} />
    </div>
  );
} 