'use client';

import React, { useState } from 'react';
import { Settings, Truck, ChevronDown } from 'lucide-react';
import { Driver } from './useDrivers';
import Link from 'next/link';

interface DriverTableProps {
  drivers: Driver[];
  loading: boolean;
  basePath?: string; // For routing - defaults to '/admin/drivers'
}

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
  { label: 'Performance', value: 'performance' },
];

const pageSizeOptions = [5, 10, 20, 50];

// Column configuration for driver management
const columnConfig = {
  name: { label: 'Driver Name', key: 'name', defaultVisible: true },
  email: { label: 'Email', key: 'email', defaultVisible: true },
  phone: { label: 'Phone Number', key: 'phone', defaultVisible: true },
  status: { label: 'Status', key: 'status', defaultVisible: true },
  performance: { label: 'Performance', key: 'performance', defaultVisible: true },
  orders: { label: 'Active Orders', key: 'orders', defaultVisible: true },
  lastLogin: { label: 'Last Login', key: 'lastLogin', defaultVisible: true },
};

export const DriverTable = ({ drivers, loading, basePath = '/admin/drivers' }: DriverTableProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
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

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    if (sort === 'az') return aName.localeCompare(bName);
    if (sort === 'za') return bName.localeCompare(aName);
    if (sort === 'newest') return new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime();
    if (sort === 'oldest') return new Date(a.last_login || 0).getTime() - new Date(b.last_login || 0).getTime();
    if (sort === 'performance') return b.total_orders - a.total_orders;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

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
    return status === 'active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
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
        <h2 className="text-xl font-bold text-black">🚚 Driver Table</h2>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 w-full md:w-64 text-black"
          />
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
              {visibleColumns.name && <th className="px-4 py-2 text-left font-semibold">Driver Name</th>}
              {visibleColumns.email && <th className="px-4 py-2 text-left font-semibold">Email</th>}
              {visibleColumns.phone && <th className="px-4 py-2 text-left font-semibold">Phone</th>}
              {visibleColumns.status && <th className="px-4 py-2 text-left font-semibold">Status</th>}
              {visibleColumns.performance && <th className="px-4 py-2 text-left font-semibold">Performance</th>}
              {visibleColumns.orders && <th className="px-4 py-2 text-left font-semibold">Active Orders</th>}
              {visibleColumns.lastLogin && <th className="px-4 py-2 text-left font-semibold">Last Login</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={getVisibleColumnCount()} className="text-center py-8 text-gray-400">
                  No drivers found.
                </td>
              </tr>
            ) : (
              paginated.map((driver) => (
                <tr key={driver.id} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors text-black">
                  {visibleColumns.name && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {driver.profile_pic ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={driver.profile_pic.replace('/upload/', '/upload/w_40,h_40,c_fill,f_auto,q_auto/')}
                              alt={driver.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center ${driver.profile_pic ? 'hidden' : ''}`}>
                            <span className="text-white font-medium text-sm">
                              {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                          <Link href={`${basePath}/${driver.id}`} className="text-xs text-blue-600 hover:underline">
                            View Profile
                          </Link>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-4 py-3">{driver.email}</td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-4 py-3">{driver.phone}</td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.performance && (
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-medium">Orders:</span> {driver.total_orders}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">Success Rate:</span> {driver.total_orders > 0 ? Math.round((driver.total_orders / (driver.total_orders + driver.active_orders)) * 100) : 0}%
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.orders && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{driver.active_orders}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.lastLogin && (
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {formatLastLogin(driver.last_login)}
                      </div>
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