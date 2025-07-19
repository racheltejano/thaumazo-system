'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  total_orders: number;
  active_orders: number;
  last_login: string | null;
  profile_pic: string | null;
}

export interface DriverStats {
  totalActiveDrivers: number;
  driversOnDuty: number;
  ordersDeliveredThisMonth: number;
  averageDeliveryTime: number;
}

export const useDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    totalActiveDrivers: 0,
    driversOnDuty: 0,
    ordersDeliveredThisMonth: 0,
    averageDeliveryTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch drivers from profiles table
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, contact_number, can_login, last_login, profile_pic, email')
        .eq('role', 'driver');

      if (driversError) throw driversError;

      // No need to fetch emails from auth.users anymore
      // Fetch order statistics for each driver
      const driversWithStats = await Promise.all(
        driversData.map(async (driver) => {
          // Get completed orders count
          const { count: totalOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driver.id)
            .eq('status', 'delivered');

          // Get active orders count
          const { count: activeOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driver.id)
            .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup']);

          // Get last login from profiles table
          const lastLogin = driver.last_login;

          const driverData = {
            id: driver.id,
            name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unknown Driver',
            email: driver.email || 'N/A',
            phone: driver.contact_number || 'N/A',
            status: (driver.can_login ? 'active' : 'inactive') as 'active' | 'inactive',
            total_orders: totalOrders || 0,
            active_orders: activeOrders || 0,
            last_login: lastLogin,
            profile_pic: driver.profile_pic,
          };
          
          return driverData;
        })
      );

      setDrivers(driversWithStats);

      // Calculate stats
      const totalActiveDrivers = driversWithStats.filter(d => d.status === 'active').length;
      const driversOnDuty = driversWithStats.filter(d => d.active_orders > 0).length;
      
      // Get orders delivered this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: ordersDeliveredThisMonth } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalActiveDrivers,
        driversOnDuty,
        ordersDeliveredThisMonth: ordersDeliveredThisMonth || 0,
        averageDeliveryTime: 0, // Placeholder - would need delivery time tracking
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return {
    drivers,
    stats,
    loading,
    error,
    refetch: fetchDrivers,
  };
}; 