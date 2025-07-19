'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Phone, Mail, Truck, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';

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

export default function DispatcherDriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.driverId as string;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch active orders
        const { data: assignedOrdersData } = await supabase
          .from('orders')
          .select('id, tracking_id, status, pickup_address, delivery_address, created_at, updated_at, pickup_date, pickup_time, delivery_window_start, delivery_window_end')
          .eq('driver_id', driverId)
          .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup'])
          .order('created_at', { ascending: false });

        setActiveOrders(assignedOrdersData || []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'driver_assigned':
        return 'text-blue-600 bg-blue-100';
      case 'truck_left_warehouse':
        return 'text-orange-600 bg-orange-100';
      case 'arrived_at_pickup':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'driver_assigned':
        return 'Assigned';
      case 'truck_left_warehouse':
        return 'En Route';
      case 'arrived_at_pickup':
        return 'At Pickup';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading driver</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
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
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Drivers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
      </div>

      {/* Driver Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 h-16 w-16">
            {driver.profile_pic ? (
              <img
                className="h-16 w-16 rounded-full object-cover"
                src={driver.profile_pic.replace('/upload/', '/upload/w_64,h_64,c_fill,f_auto,q_auto/')}
                alt={`${driver.first_name} ${driver.last_name}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center ${driver.profile_pic ? 'hidden' : ''}`}>
              <span className="text-white font-medium text-lg">
                {`${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-gray-900">
              {driver.first_name} {driver.last_name}
            </h2>
            <p className="text-gray-600">Driver</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Mail className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-gray-700">{driver.email}</span>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-gray-700">{driver.contact_number || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-gray-700">Last login: {formatLastLogin(driver.last_login)}</span>
          </div>
          <div className="flex items-center">
            <Truck className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-gray-700">Active orders: {activeOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
        </div>
        <div className="p-6">
          {activeOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active orders</p>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">Order #{order.tracking_id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Pickup Address:</p>
                      <p className="text-gray-900">{order.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Delivery Address:</p>
                      <p className="text-gray-900">{order.delivery_address}</p>
                    </div>
                  </div>
                  {order.pickup_date && (
                    <div className="mt-3 text-sm text-gray-600">
                      Pickup Date: {new Date(order.pickup_date).toLocaleDateString()}
                      {order.pickup_time && ` at ${order.pickup_time}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 