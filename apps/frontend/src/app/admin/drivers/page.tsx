/**
 * 🚚 AdminDriversPage
 * 
 * This page serves as the main admin view for managing drivers.
 * It renders the `DriversPage` component with context-specific props for:
 * - Displaying driver accounts
 * - Monitoring availability
 * - Tracking performance
 * 
 * Path: `/admin/drivers`
 */


'use client';

import DriversPage from '@/components/shared/Drivers/DriversPage';

export default function AdminDriversPage() {
  return (
    <DriversPage 
      title="Driver Management" 
      description="Manage driver accounts, availability, and performance tracking"
      basePath="/admin/drivers" 
    />
  );
} 