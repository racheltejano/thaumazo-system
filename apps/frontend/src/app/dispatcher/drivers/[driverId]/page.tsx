'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DriverOverview from './components/DriverOverview';
import AssignedOrders from './components/AssignedOrders';
import OrderHistory from './components/OrderHistory';
import ScheduleAvailability from './components/ScheduleAvailability';

interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: string;
  can_login: boolean;
  last_login: string | null;
  profile_pic: string | null;
  created_at: string;
}

interface DriverStats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  average_delivery_time: number;
  total_distance: number;
}

interface Order {
  id: string;
  tracking_id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
}

interface AvailabilityEntry {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function DispatcherDriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.driverId as string;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range filtering state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Set default date range to next 30 days
  useEffect(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(thirtyDaysFromNow.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch driver profile
        const { data: driverData, error: driverError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', driverId)
          .eq('role', 'driver')
          .single();

        if (driverError) {
          throw new Error('Driver not found');
        }

        setDriver(driverData);

        // Fetch driver statistics and data
        const [
          { count: totalOrders },
          { count: activeOrders },
          { count: completedOrders },
          { data: assignedOrdersData },
          { data: recentOrdersData },
          { data: availabilityData }
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId),
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup']),
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('status', 'delivered'),
          supabase
            .rpc('get_driver_orders', { _driver_id: driverId }),
          supabase
            .from('orders')
            .select('id, tracking_id, status, pickup_address, delivery_address, created_at, updated_at, pickup_date, pickup_time, delivery_window_start, delivery_window_end')
            .eq('driver_id', driverId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('driver_availability')
            .select('id, title, start_time, end_time, created_at')
            .eq('driver_id', driverId)
            .order('start_time', { ascending: true })
        ]);

        setStats({
          total_orders: totalOrders || 0,
          active_orders: activeOrders || 0,
          completed_orders: completedOrders || 0,
          average_delivery_time: 0, // Placeholder - would need delivery time tracking
          total_distance: 0, // Placeholder - would need distance tracking
        });

        console.log('Driver Profile Data:', {
          driver: driverData,
          stats: { 
            totalOrders, 
            activeOrdersCount: activeOrders, 
            completedOrders 
          },
          assignedOrdersArray: assignedOrdersData?.length || 0,
          recentOrders: recentOrdersData?.length || 0,
          availability: availabilityData?.length || 0
        });

        setActiveOrders(assignedOrdersData || []);
        setOrderHistory(recentOrdersData || []);
        setAvailabilityData(availabilityData || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch driver data');
      } finally {
        setLoading(false);
      }
    };

    if (driverId) {
      fetchDriverData();
    }
  }, [driverId]);

  // Filter availability data based on date range
  const filteredAvailabilityData = availabilityData.filter(availability => {
    if (!startDate || !endDate) return true;
    
    const availabilityDate = new Date(availability.start_time);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // Include the entire end date
    
    return availabilityDate >= start && availabilityDate <= end;
  });

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    
    const loginDate = new Date(lastLogin);
    return loginDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'driver_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'truck_left_warehouse':
        return 'bg-yellow-100 text-yellow-800';
      case 'arrived_at_pickup':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading driver profile</h3>
          <p className="text-red-600 text-sm mt-1">{error || 'Driver not found'}</p>
          <Link 
            href="/dispatcher/drivers"
            className="inline-flex items-center mt-3 text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Drivers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/dispatcher/drivers"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Drivers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
      </div>

      <div className="space-y-6">
        {/* Driver Overview and Performance Stats */}
        <DriverOverview 
          driver={driver}
          stats={stats}
          formatDate={formatDate}
          formatLastLogin={formatLastLogin}
        />

        {/* Assigned Orders */}
        <AssignedOrders 
          orders={activeOrders}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
        />

        {/* Order History */}
        <OrderHistory 
          orders={orderHistory}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
          getStatusColor={getStatusColor}
        />

        {/* Driver Schedule & Availability */}
        <ScheduleAvailability 
          availabilityData={availabilityData}
          filteredAvailabilityData={filteredAvailabilityData}
          showDateFilter={showDateFilter}
          startDate={startDate}
          endDate={endDate}
          setShowDateFilter={setShowDateFilter}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          formatDateOnly={formatDateOnly}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
} 