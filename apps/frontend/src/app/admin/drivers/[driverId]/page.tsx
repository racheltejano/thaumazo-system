'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, Package, Truck, User, Mail, Phone, Activity } from 'lucide-react';
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
}

export default function DriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.driverId as string;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
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

        // Fetch driver statistics
        const [
          { count: totalOrders },
          { count: activeOrders },
          { count: completedOrders },
          { data: activeOrdersData },
          { data: recentOrdersData }
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
            .from('orders')
            .select('id, tracking_id, status, pickup_address, delivery_address, created_at, updated_at')
            .eq('driver_id', driverId)
            .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup'])
            .order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select('id, tracking_id, status, pickup_address, delivery_address, created_at, updated_at')
            .eq('driver_id', driverId)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        setStats({
          total_orders: totalOrders || 0,
          active_orders: activeOrders || 0,
          completed_orders: completedOrders || 0,
          average_delivery_time: 0, // Placeholder - would need delivery time tracking
          total_distance: 0, // Placeholder - would need distance tracking
        });

        setActiveOrders(activeOrdersData || []);
        setRecentOrders(recentOrdersData || []);

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
            href="/admin/drivers"
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
          href="/admin/drivers"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Drivers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
      </div>

      <div className="space-y-6">
        {/* Driver Overview and Performance Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Driver Overview Card */}
          <div className="lg:col-span-6 bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Column 1: Profile Picture and Name */}
              <div className="flex flex-col items-center space-y-3">
                <div className="flex-shrink-0">
                  {driver.profile_pic ? (
                    <img
                      className="h-40 w-40 rounded-full object-cover"
                      src={driver.profile_pic.replace('/upload/', '/upload/w_160,h_160,c_fill,f_auto,q_auto/')}
                      alt={`${driver.first_name} ${driver.last_name}`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-40 w-40 rounded-full bg-blue-500 flex items-center justify-center ${driver.profile_pic ? 'hidden' : ''}`}>
                    <span className="text-white font-medium text-3xl">
                      {`${driver.first_name || ''} ${driver.last_name || ''}`.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {driver.first_name} {driver.last_name}
                  </h2>
                  <p className="text-gray-600 capitalize">{driver.role.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Column 2: Contact Info and Dates */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{driver.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-gray-900">{driver.contact_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="text-gray-900">{formatDate(driver.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="text-gray-900">{formatLastLogin(driver.last_login)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="lg:col-span-4 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="w-8 h-8 text-blue-500" />
                  <span className="text-gray-600">Total Orders</span>
                </div>
                <span className="text-2xl font-semibold text-gray-900">{stats?.total_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Truck className="w-8 h-8 text-green-500" />
                  <span className="text-gray-600">Completed</span>
                </div>
                <span className="text-2xl font-semibold text-gray-900">{stats?.completed_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-8 h-8 text-orange-500" />
                  <span className="text-gray-600">Active</span>
                </div>
                <span className="text-2xl font-semibold text-gray-900">{stats?.active_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-purple-500" />
                  <span className="text-gray-600">Success Rate</span>
                </div>
                <span className="text-2xl font-semibold text-gray-900">
                  {stats?.total_orders ? Math.round((stats.completed_orders / stats.total_orders) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
            <span className="text-sm text-gray-500">{activeOrders.length} orders</span>
          </div>
          {activeOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active orders</p>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900">#{order.tracking_id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Pickup:</strong> {order.pickup_address}</p>
                    <p><strong>Delivery:</strong> {order.delivery_address}</p>
                    <p><strong>Created:</strong> {formatDate(order.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <span className="text-sm text-gray-500">{recentOrders.length} orders</span>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-900">#{order.tracking_id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Pickup:</strong> {order.pickup_address}</p>
                    <p><strong>Delivery:</strong> {order.delivery_address}</p>
                    <p><strong>Updated:</strong> {formatDate(order.updated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Schedule</h3>
            <span className="text-sm text-gray-500">This week</span>
          </div>
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Schedule feature coming soon</p>
            <p className="text-gray-400 text-sm mt-2">Driver scheduling and availability management</p>
          </div>
        </div>
      </div>
    </div>
  );
} 