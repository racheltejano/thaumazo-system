'use client';

import DashboardLayout from '@/components/DashboardLayout';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
];

const pageSizeOptions = [5, 10, 20, 50];

export default function StaffManagementPage() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchStaffs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, contact_number')
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
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_number?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'az') return a.first_name.localeCompare(b.first_name);
    if (sort === 'za') return b.first_name.localeCompare(a.first_name);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-5xl mx-auto">
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-black">
              <thead>
                <tr className="bg-gray-100 text-black">
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Position</th>
                  <th className="px-4 py-2 text-left font-semibold">Phone Number</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      Loading staff...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((staff) => (
                    <tr key={staff.id} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors text-black">
                      <td className="px-4 py-3 font-medium text-black">{staff.first_name} {staff.last_name}</td>
                      <td className="px-4 py-3 text-black capitalize">{staff.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-black">{staff.contact_number || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700`}>
                          Active
                        </span>
                      </td>
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
