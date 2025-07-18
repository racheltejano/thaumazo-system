'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StaffStats } from '../components/StaffOverviewCards';

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: string;
  can_login: boolean;
  profile_pic: string | null;
  created_at: string;
}

export const useStaff = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalAdmins: 0,
    totalDrivers: 0,
    totalInventoryStaff: 0,
    totalDispatchers: 0,
    incompleteProfiles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all staff from profiles table
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, contact_number, can_login, created_at, profile_pic, email, role')
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      setStaffs(staffData || []);

      // Calculate stats
      const stats = {
        totalAdmins: staffData?.filter(s => s.role === 'admin').length || 0,
        totalDrivers: staffData?.filter(s => s.role === 'driver').length || 0,
        totalInventoryStaff: staffData?.filter(s => s.role === 'inventory_staff').length || 0,
        totalDispatchers: staffData?.filter(s => s.role === 'dispatcher').length || 0,
        incompleteProfiles: staffData?.filter(s => 
          !s.first_name || !s.last_name || !s.contact_number || !s.email
        ).length || 0,
      };
      setStats(stats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return {
    staffs,
    stats,
    loading,
    error,
    refetch: fetchStaff,
  };
}; 