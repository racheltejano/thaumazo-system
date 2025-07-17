'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import RoleGuard from '@/components/auth/RoleGuard'

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
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

export default function StaffManagementPage() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible: Record<string, boolean> = {};
    Object.entries(columnConfig).forEach(([key, config]) => {
      defaultVisible[key] = config.defaultVisible;
    });
    return defaultVisible;
  });

  useEffect(() => {
    const fetchStaffs = async () => {
      setLoading(true);

      // 🔍 Get current Supabase user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('[DEBUG] Logged-in user ID:', user?.id);

      // 🔍 Try to fetch this user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user?.id)
        .single();

      if (profileError || !profile) {
        console.warn('[WARNING] No matching profile found for current user!');
      } else {
        console.log('[DEBUG] Current user role:', profile.role);
      }

      // �� Fetch all staffs (admin only)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, contact_number, can_login, created_at, profile_pic, email')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff:', error);
      } else {
        // Email is now included directly from profiles table
        setStaffs(data || []);
      }

      setLoading(false);
    };

    fetchStaffs();
  }, []);

  const filtered = staffs.filter((s) =>
    `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );
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
      <RoleGuard requiredRole="admin">
        <div className="max-w-7xl mx-auto">
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
        </div>
      </RoleGuard>
    );
  }

  return (
      <RoleGuard requiredRole="admin"> 
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-black">👥 Staff Management</h2>
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
                {/* Column Settings Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black hover:bg-orange-50 transition-colors flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Columns ({getVisibleColumnCount()})
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Table Column Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
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
                  </DialogContent>
                </Dialog>
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
                                <div className="text-sm font-medium text-gray-900">
                                  {staff.first_name || 'N/A'} {staff.last_name || ''}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {staff.role.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.email && (
                          <td className="px-4 py-3 text-black">
                            {staff.email || 'N/A'}
                          </td>
                        )}

                        {visibleColumns.phone && (
                          <td className="px-4 py-3 text-black">
                            {staff.contact_number || 'N/A'}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold 
                              ${staff.can_login ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {staff.can_login ? 'Active' : 'Disabled'}
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
                                    setStaffs((prev) =>
                                      prev.map((s) =>
                                        s.id === staff.id ? { ...s, can_login: !staff.can_login } : s
                                      )
                                    );
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
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} staff members
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 rounded-lg bg-orange-500 text-white">
                    {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </RoleGuard>
  );
}