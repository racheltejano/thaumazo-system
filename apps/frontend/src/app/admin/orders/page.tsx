'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package, Clock, Truck, Settings, ChevronDown, MapPin, User, Calendar } from 'lucide-react';

export interface Order {
  id: string;
  tracking_id: string;
  client_name: string;
  client_contact: string;
  pickup_address: string;
  status: 'order_placed' | 'driver_assigned' | 'truck_left_warehouse' | 'arrived_at_pickup' | 'delivered' | 'cancelled';
  created_at: string;
  pickup_date: string | null;
  pickup_time: string | null;
  vehicle_type: string | null;
  estimated_cost: number | null;
  driver_name: string | null;
  priority_level: 'low' | 'medium' | 'high' | null;
  dropoff_count: number;
  special_instructions: string | null;
  tail_lift_required: boolean;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  deliveredToday: number;
  averageOrderValue: number;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    deliveredToday: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders with client and driver information
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          tracking_id,
          status,
          created_at,
          pickup_date,
          pickup_time,
          vehicle_type,
          estimated_cost,
          priority_level,
          special_instructions,
          tail_lift_required,
          client_id,
          driver_id,
          clients (
            contact_person,
            contact_number,
            pickup_address
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get dropoff counts for each order
      const ordersWithDropoffs = await Promise.all(
        ordersData.map(async (order) => {
          const { count: dropoffCount } = await supabase
            .from('order_dropoffs')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);

          return {
            id: order.id,
            tracking_id: order.tracking_id || `ORD-${order.id.slice(-6)}`,
            client_name: order.clients?.contact_person || 'Unknown Client',
            client_contact: order.clients?.contact_number || 'N/A',
            pickup_address: order.clients?.pickup_address || 'N/A',
            status: order.status,
            created_at: order.created_at,
            pickup_date: order.pickup_date,
            pickup_time: order.pickup_time,
            vehicle_type: order.vehicle_type,
            estimated_cost: order.estimated_cost,
            driver_name: order.profiles 
              ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim()
              : null,
            priority_level: order.priority_level,
            dropoff_count: dropoffCount || 0,
            special_instructions: order.special_instructions,
            tail_lift_required: order.tail_lift_required || false,
          };
        })
      );

      setOrders(ordersWithDropoffs);

      // Calculate stats
      const totalOrders = ordersWithDropoffs.length;
      const pendingOrders = ordersWithDropoffs.filter(o => o.status === 'order_placed').length;
      const inProgressOrders = ordersWithDropoffs.filter(o => 
        ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup'].includes(o.status)
      ).length;
      
      // Get orders delivered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: deliveredToday } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString());

      // Calculate average order value
      const ordersWithCost = ordersWithDropoffs.filter(o => o.estimated_cost);
      const averageOrderValue = ordersWithCost.length > 0
        ? ordersWithCost.reduce((sum, o) => sum + (o.estimated_cost || 0), 0) / ordersWithCost.length
        : 0;

      setStats({
        totalOrders,
        pendingOrders,
        inProgressOrders,
        deliveredToday: deliveredToday || 0,
        averageOrderValue,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    stats,
    loading,
    error,
    refetch: fetchOrders,
  };
};

// OrderOverviewCards Component
interface OrderOverviewCardsProps {
  stats: OrderStats;
  loading: boolean;
}

export const OrderOverviewCards = ({ stats, loading }: OrderOverviewCardsProps) => {
  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: Package,
      color: 'bg-blue-500',
      description: 'All orders in the system',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-yellow-500',
      description: 'Awaiting driver assignment',
    },
    {
      title: 'In Progress',
      value: stats.inProgressOrders,
      icon: Truck,
      color: 'bg-green-500',
      description: 'Currently being delivered',
    },
    {
      title: 'Delivered Today',
      value: stats.deliveredToday,
      icon: Package,
      color: 'bg-purple-500',
      description: 'Successfully completed today',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// OrderTable Component
interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  basePath?: string;
}

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Cost (High to Low)', value: 'cost_high' },
  { label: 'Cost (Low to High)', value: 'cost_low' },
];

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Order Placed', value: 'order_placed' },
  { label: 'Driver Assigned', value: 'driver_assigned' },
  { label: 'Truck Left Warehouse', value: 'truck_left_warehouse' },
  { label: 'Arrived at Pickup', value: 'arrived_at_pickup' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const pageSizeOptions = [5, 10, 20, 50];

const columnConfig = {
  tracking: { label: 'Tracking ID', key: 'tracking', defaultVisible: true },
  client: { label: 'Client', key: 'client', defaultVisible: true },
  pickup: { label: 'Pickup Address', key: 'pickup', defaultVisible: true },
  status: { label: 'Status', key: 'status', defaultVisible: true },
  driver: { label: 'Driver', key: 'driver', defaultVisible: true },
  priority: { label: 'Priority', key: 'priority', defaultVisible: false },
  cost: { label: 'Est. Cost', key: 'cost', defaultVisible: true },
  date: { label: 'Created', key: 'date', defaultVisible: true },
  dropoffs: { label: 'Dropoffs', key: 'dropoffs', defaultVisible: false },
};

export const OrderTable = ({ orders, loading, basePath = '/admin/orders' }: OrderTableProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible: Record<string, boolean> = {};
    Object.entries(columnConfig).forEach(([key, config]) => {
      defaultVisible[key] = config.defaultVisible;
    });
    return defaultVisible;
  });

  const filtered = orders.filter((order) => {
    const matchesSearch = 
      order.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
      order.client_name.toLowerCase().includes(search.toLowerCase()) ||
      order.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      (order.driver_name && order.driver_name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'status') return a.status.localeCompare(b.status);
    if (sort === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority_level as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority_level as keyof typeof priorityOrder] || 0);
    }
    if (sort === 'cost_high') return (b.estimated_cost || 0) - (a.estimated_cost || 0);
    if (sort === 'cost_low') return (a.estimated_cost || 0) - (b.estimated_cost || 0);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      order_placed: 'text-blue-600 bg-blue-100',
      driver_assigned: 'text-yellow-600 bg-yellow-100',
      truck_left_warehouse: 'text-orange-600 bg-orange-100',
      arrived_at_pickup: 'text-purple-600 bg-purple-100',
      delivered: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getPriorityColor = (priority: string | null) => {
    const colors = {
      high: 'text-red-600 bg-red-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-black">📦 Orders Management</h2>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 w-full md:w-64 text-black"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
          
          {/* Column Settings Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Columns ({getVisibleColumnCount()})
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showColumnSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Visible Columns</div>
                  <div className="space-y-2">
                    {Object.entries(columnConfig).map(([key, config]) => (
                      <label key={key} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key]}
                          onChange={(e) => {
                            setVisibleColumns(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }));
                          }}
                          className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-400"
                        />
                        <span className="text-sm text-gray-700">{config.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-black">
          <thead>
            <tr className="bg-gray-100 text-black">
              {visibleColumns.tracking && <th className="px-4 py-2 text-left font-semibold">Tracking ID</th>}
              {visibleColumns.client && <th className="px-4 py-2 text-left font-semibold">Client</th>}
              {visibleColumns.pickup && <th className="px-4 py-2 text-left font-semibold">Pickup Address</th>}
              {visibleColumns.status && <th className="px-4 py-2 text-left font-semibold">Status</th>}
              {visibleColumns.driver && <th className="px-4 py-2 text-left font-semibold">Driver</th>}
              {visibleColumns.priority && <th className="px-4 py-2 text-left font-semibold">Priority</th>}
              {visibleColumns.cost && <th className="px-4 py-2 text-left font-semibold">Est. Cost</th>}
              {visibleColumns.date && <th className="px-4 py-2 text-left font-semibold">Created</th>}
              {visibleColumns.dropoffs && <th className="px-4 py-2 text-left font-semibold">Dropoffs</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={getVisibleColumnCount()} className="text-center py-8 text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors text-black">
                  {visibleColumns.tracking && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-blue-500 mr-2" />
                        <div>
                          <p className="font-medium text-blue-600">{order.tracking_id}</p>
                          <Link href={`${basePath}/${order.id}`} className="text-xs text-blue-600 hover:underline">
                            View Details
                          </Link>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.client && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="font-medium">{order.client_name}</p>
                          <p className="text-xs text-gray-500">{order.client_contact}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.pickup && (
                    <td className="px-4 py-3">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                        <p className="text-sm text-gray-700 max-w-xs truncate" title={order.pickup_address}>
                          {order.pickup_address}
                        </p>
                      </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  )}
                  {visibleColumns.driver && (
                    <td className="px-4 py-3">
                      {order.driver_name ? (
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                            <span className="text-white font-medium text-xs">
                              {order.driver_name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm">{order.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not assigned</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.priority && (
                    <td className="px-4 py-3">
                      {order.priority_level ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(order.priority_level)}`}>
                          {order.priority_level.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.cost && (
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {formatCurrency(order.estimated_cost)}
                      </span>
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td className="px-4 py-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                  )}
                  {visibleColumns.dropoffs && (
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{order.dropoff_count}</span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// OrdersPage Component
interface OrdersPageProps {
  title?: string;
  description?: string;
  basePath?: string;
}

export default function OrdersPage({ 
  title = 'Orders Management', 
  description = 'Track and manage all delivery orders, statuses, and assignments',
  basePath = '/admin/orders' 
}: OrdersPageProps) {
  const { orders, stats, loading, error } = useOrders();
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
          <h3 className="text-red-800 font-medium">Error loading orders</h3>
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

      <OrderOverviewCards stats={stats} loading={loading} />
      <OrderTable orders={orders} loading={loading} basePath={basePath} />
    </div>
  );
}