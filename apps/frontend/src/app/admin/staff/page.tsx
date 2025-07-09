'use client';

import DashboardLayout from '@/components/DashboardLayout';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
];

const pageSizeOptions = [5, 10, 20, 50];

// Column configuration
const columnConfig = {
  name: { label: 'Name', key: 'name', defaultVisible: true },
  position: { label: 'Position', key: 'position', defaultVisible: true },
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
    // Initialize with default visible columns
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
        .select('id, first_name, last_name, role, contact_number, can_login, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff:', error);
      } else {
        setStaffs(data || []);
      }

      setLoading(false);
    };

    fetchStaffs();
  }, []);

  const filtered = staffs.filter((s) =>
    `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_number || '').toLowerCase().includes(search.toLowerCase())
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

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-black">All Staffs</h2>
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
                <DialogContent className="sm:max-w-md">
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
            <table className="min-w-full text-sm text-black">
              <thead>
                <tr className="bg-gray-100 text-black">
                  {visibleColumns.name && (
                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                  )}
                  {visibleColumns.position && (
                    <th className="px-4 py-2 text-left font-semibold">Position</th>
                  )}
                  {visibleColumns.phone && (
                    <th className="px-4 py-2 text-left font-semibold">Phone Number</th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                  )}
                  {visibleColumns.access && (
                    <th className="px-4 py-2 text-left font-semibold">Access</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={getVisibleColumnCount()} className="text-center py-8 text-gray-400">
                      Loading staff...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={getVisibleColumnCount()} className="text-center py-8 text-gray-400">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((staff) => (
                    <tr key={staff.id} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors text-black">
                      {visibleColumns.name && (
                        <td className="px-4 py-3 font-medium text-black">
                          {staff.first_name || 'N/A'} {staff.last_name || ''}
                        </td>
                      )}
                      {visibleColumns.position && (
                        <td className="px-4 py-3 text-black capitalize">
                          {staff.role.replace('_', ' ')}
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
          <div className="flex justify-end items-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-orange-100 disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded-lg border text-sm font-semibold
                  ${page === i + 1
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-orange-100'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-orange-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}