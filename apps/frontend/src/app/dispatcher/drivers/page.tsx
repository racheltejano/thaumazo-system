'use client';

import DriversPage from '@/components/shared/Drivers/DriversPage';

export default function DispatcherDriversPage() {
  return (
    <DriversPage 
      title="Driver Management" 
      description="Manage driver accounts, availability, and performance tracking"
      basePath="/dispatcher/drivers" 
    />
  );
} 