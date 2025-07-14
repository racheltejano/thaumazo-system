'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from "next/image";

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
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      href: '/admin',
    },
    {
      label: 'Staff Management',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="8" cy="8" r="4" />
          <circle cx="16" cy="8" r="4" />
          <path d="M2 20c0-2.5 3-4.5 6-4.5s6 2 6 4.5" />
          <path d="M14 20c0-2.5 3-4.5 6-4.5s6 2 6 4.5" />
        </svg>
      ),
      href: '/admin/staff',
    },
    {
      label: 'Pending Approvals',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 12l2 2l4 -4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      href: '/admin/approvals',
    },
  ],
  inventory: [
    {
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      href: '/inventory/dashboard',
    },
    {
      label: 'Inventory Table',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M16 3v4M8 3v4" />
        </svg>
      ),
      href: '/inventory/table',
    },
    {
      label: 'Add Inventory',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
      href: '/inventory/add',
    },
  ],
  driver: [
  {
    label: 'Dashboard',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    href: '/driver',
  },
  {
    label: 'My Calendar',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    href: '/driver/calendar',
  },
   {
    label: 'Add Availability',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    href: '/driver/availability/new',
  },
  {
    label: 'View Availability',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    ),
    href: '/driver/availability',
  },
  
 
],

  dispatcher: [
    {
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      href: '/dispatcher',
    },
    {
      label: 'Calendar',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      href: '/dispatcher/calendar',
    },
  ],
}


type RoleConfig = {
  primaryColor: string;
  hoverColor: string;
  navbarBg: string;
  accentColor: string;
  showNotifications?: boolean;
  profileMenuItems?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
};

const roleConfigs: { [role: string]: RoleConfig } = {
  admin: {
    primaryColor: 'orange',
    hoverColor: 'orange-50',
    navbarBg: 'gray-900',
    accentColor: 'orange-500',
    showNotifications: true,
    profileMenuItems: [
      { label: 'Profile / Settings', href: '/admin/settings' },
      { label: 'Log Out', onClick: () => {} }, // Will be handled in component
    ],
  },
  inventory: {
    primaryColor: 'orange',
    hoverColor: 'orange-50',
    navbarBg: 'gray-900',
    accentColor: 'orange-500',
    showNotifications: false,
    profileMenuItems: [
      { label: 'Log Out', onClick: () => {} }, // Will be handled in component
    ],
  },
  driver: {
    primaryColor: 'green',
    hoverColor: 'green-50',
    navbarBg: 'green-900',
    accentColor: 'green-400',
    showNotifications: true,
    profileMenuItems: [
      { label: 'Log Out', onClick: () => {} }, // Will be handled in component
    ],
  },
  dispatcher: {
    primaryColor: 'purple',
    hoverColor: 'purple-50',
    navbarBg: 'purple-900',
    accentColor: 'purple-400',
    showNotifications: true,
    profileMenuItems: [
      { label: 'Log Out', onClick: () => {} }, // Will be handled in component
    ],
  },
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
  const config = roleConfigs[role] || roleConfigs.admin;

  useEffect(() => {
  const fetchProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('profile_pic')
      .eq('id', user.id) // ✅ filter to current user
      .single();

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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-${config.hoverColor} hover:text-${config.primaryColor}-600 ${collapsed ? 'justify-center' : ''} text-xs md:text-sm`}
            >
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </a>
          ))}
        </nav>
        <button
          className={`mb-4 mx-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-${config.primaryColor}-100 transition-colors`}
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
        <header className="flex items-center justify-between h-16 px-8 bg-[#101828] text-white shadow-sm">
          <div className="text-2xl font-extrabold tracking-tight select-none">
            <span className="text-white">T</span>
            <span className={`text-${config.accentColor}`}>EX</span>
            <span className="text-white">TS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-gray-200">Welcome, {displayName}!</span>

            {/* Notification bell - only show if enabled for role */}
            {config.showNotifications && (
              <button className="relative p-2 rounded-full hover:bg-gray-800 transition-colors">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span className={`absolute top-1 right-1 w-2 h-2 bg-${config.accentColor} rounded-full`} />
              </button>
            )}

            {/* Profile picture / menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                  className={`relative w-10 h-10 rounded-full overflow-hidden bg-gray-800 hover:ring-2 ring-${config.primaryColor}-400 transition-all`}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-label="Profile"
                >
                  {profilePicUrl ? (
                    <Image
                      src={profilePicUrl}
                      alt="Profile"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-sm font-medium text-white bg-gray-600">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-100 animate-fade-in">
                  {config.profileMenuItems?.map((item, index) => (
                    <div key={index}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className={`block px-4 py-2 text-gray-800 hover:bg-${config.hoverColor} hover:text-${config.primaryColor}-600 transition-colors`}
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            if (item.label === 'Log Out') {
                              handleLogout();
                            } else if (item.onClick) {
                              item.onClick();
                            }
                            setProfileMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-gray-800 hover:bg-${config.hoverColor} hover:text-${config.primaryColor}-600 transition-colors`}
                        >
                          {item.label}
                        </button>
                      )}
                    </div>
                  ))}
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
