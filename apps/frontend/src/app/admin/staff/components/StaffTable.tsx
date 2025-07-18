'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, ChevronDown } from 'lucide-react';

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
];

const roleOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Administrators', value: 'admin' },
  { label: 'Drivers', value: 'driver' },
  { label: 'Inventory Staff', value: 'inventory_staff' },
  { label: 'Dispatchers', value: 'dispatcher' },
];

const pageSizeOptions = [5, 10, 20, 50];

// Column configuration
const columnConfig = {
  name: { label: 'Staff Name', key: 'name', defaultVisible: true },
  email: { label: 'Email', key: 'email', defaultVisible: true },
  phone: { label: 'Phone Number', key: 'phone', defaultVisible: true },
  status: { label: 'Status', key: 'status', defaultVisible: true },
  access: { label: 'Access', key: 'access', defaultVisible: true },
};

interface StaffTableProps {
  staffs: any[];
  loading: boolean;
}

export const StaffTable = ({ staffs, loading }: StaffTableProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [roleFilter, setRoleFilter] = useState('all');
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

  const filtered = staffs.filter((s) => {
    const matchesSearch = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Handle null/undefined names by treating them as empty strings
    const aName = (a.first_name || '').toLowerCase();
    const bName = (b.first_name || '').toLowerCase();
    
    if (sort === 'az') return aName.localeCompare(bName);
    if (sort === 'za') return bName.localeCompare(aName);
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-black">👥 Staff Table</h2>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 w-full md:w-64 text-black"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black"
          >
            {roleOptions.map((opt) => (
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
        <table className="min-w-full text-sm text-black table-fixed">
          <thead>
            <tr className="bg-gray-100 text-black">
              {visibleColumns.name && (
                <th className="px-4 py-2 text-left font-semibold w-1/4">Staff Name</th>
              )}
              {visibleColumns.email && (
                <th className="px-4 py-2 text-left font-semibold w-1/4">Email</th>
              )}
              {visibleColumns.phone && (
                <th className="px-4 py-2 text-left font-semibold w-1/6">Phone</th>
              )}
              {visibleColumns.status && (
                <th className="px-4 py-2 text-left font-semibold w-1/6">Status</th>
              )}
              {visibleColumns.access && (
                <th className="px-4 py-2 text-left font-semibold w-1/6">Access</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={getVisibleColumnCount()} className="text-center py-8 text-gray-400">
                  No staff found.
                </td>
              </tr>
            ) : (
              paginated.map((staff) => (
                <tr key={staff.id} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors text-black">
                  {visibleColumns.name && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {staff.profile_pic ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={staff.profile_pic.replace('/upload/', '/upload/w_40,h_40,c_fill,f_auto,q_auto/')}
                              alt={`${staff.first_name} ${staff.last_name}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center ${staff.profile_pic ? 'hidden' : ''}`}>
                            <span className="text-white font-medium text-sm">
                              {`${staff.first_name || ''} ${staff.last_name || ''}`.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {`${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unknown Staff'}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {staff.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-4 py-3">{staff.email || 'N/A'}</td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-4 py-3">{staff.contact_number || 'N/A'}</td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        staff.can_login 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {staff.can_login ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.access && (
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staff.can_login}
                          onChange={async () => {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ can_login: !staff.can_login })
                              .eq('id', staff.id);

                            if (!error) {
                              // Update the local state by triggering a re-render
                              // The parent component will handle the state update
                              window.location.reload();
                            } else {
                              console.error('Failed to update access', error);
                            }
                          }}
                          className="form-checkbox h-5 w-5 text-orange-500"
                        />
                        <span className="ml-2 text-sm">
                          {staff.can_login ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
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