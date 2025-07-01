'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type SidebarMenuItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
};

type SidebarMenus = {
  [role: string]: SidebarMenuItem[];
};

const sidebarMenus: SidebarMenus = {
  admin: [
    {
      label: 'Dashboard',
      icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      href: '/admin',
    },
    {
      label: 'Staff Management',
      icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><path d="M2 20c0-2.5 3-4.5 6-4.5s6 2 6 4.5"/><path d="M14 20c0-2.5 3-4.5 6-4.5s6 2 6 4.5"/></svg>,
      href: '/admin/staff',
    },
  ],
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: string;
  userName?: string;
  userFirstName?: string;
}

export default function DashboardLayout({
  children,
  role = 'admin',
  userName = 'Admin',
  userFirstName,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = userFirstName || userName || role.charAt(0).toUpperCase() + role.slice(1);
  const menus = sidebarMenus[role] || [];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase.from('profiles').select('profile_pic').single();
      if (!error && data?.profile_pic) {
        const optimized = data.profile_pic.replace(
          '/upload/',
          '/upload/w_80,h_80,c_fill,f_auto,q_auto/'
        );
        setProfilePicUrl(optimized);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col justify-between bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-48'} fixed left-0 top-0 bottom-0 z-30 shadow-sm`}>
        <nav className="flex-1 py-6 px-2 flex flex-col gap-2">
          {menus.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-orange-50 hover:text-orange-600 ${collapsed ? 'justify-center' : ''} text-xs md:text-sm`}
            >
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </a>
          ))}
        </nav>
        <button
          className="mb-4 mx-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-orange-100 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'ml-16' : 'ml-48'}`}>
        <header className="flex items-center justify-between h-16 px-8 bg-gray-900 text-white shadow-sm">
          <div className="text-2xl font-extrabold tracking-tight select-none">
            <span className="text-white">T</span>
            <span className="text-orange-500">EX</span>
            <span className="text-white">TS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-gray-200">Welcome, {displayName}!</span>

            {/* Notification bell */}
            <button className="relative p-2 rounded-full hover:bg-gray-800 transition-colors">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            </button>

            {/* Profile picture / menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 hover:ring-2 ring-orange-400 transition-all"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label="Profile"
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-sm font-medium text-white bg-gray-600">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-100 animate-fade-in">
                  <a
                    href="/admin/settings"
                    className="block px-4 py-2 text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Profile / Settings
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
