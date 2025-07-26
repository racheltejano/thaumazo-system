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
  client: [
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
      href: '/client/dashboard',
    },
    {
      label: 'Track Orders',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 12l2 2l4 -4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      href: '/client/track',
    },
    {
      label: 'Order History',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
      href: '/client/orders',
    },
    {
      label: 'Create Order',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
      href: '/client/create-order',
    },
    {
      label: 'Profile',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      href: '/client/profile',
    },
  ],
};

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
  client: {
    primaryColor: 'orange',
    hoverColor: 'orange-50',
    navbarBg: 'gray-900',
    accentColor: 'orange-500',
    showNotifications: false,
    profileMenuItems: [
      { label: 'Settings', href: '/client/settings' },
      { label: 'Log Out', onClick: () => {} },
    ],
  },
};

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userFirstName?: string;
}

export default function ClientDashboardLayout({
  children,
  userName = 'Client',
  userFirstName,
}: ClientDashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = firstName || userFirstName || userName || 'Client';
  const role = 'client';
  const menus = sidebarMenus[role] || [];
  const config = roleConfigs[role] || roleConfigs.client;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('client_profiles')
        .select('profile_pic, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        if (data.profile_pic) {
          const optimized = data.profile_pic.replace(
            '/upload/',
            '/upload/w_80,h_80,c_fill,f_auto,q_auto/'
          );
          setProfilePicUrl(optimized);
        }
        setFirstName(data.first_name || null);
        setLastName(data.last_name || null);
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
    router.push('/client/login');
  };

  // Logo path variable for dashboard navbar
  const DASHBOARD_LOGO_PATH = "/thaumazo-text-logo.png";

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col justify-between bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-48'} fixed left-0 top-0 bottom-0 z-30 shadow-sm`}>
        <nav className="flex-1 py-6 px-2 flex flex-col gap-2">
          {menus.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-${config.hoverColor} hover:text-${config.primaryColor}-600 ${collapsed ? 'justify-center' : ''} text-xs md:text-sm w-full text-left`}
            >
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
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
        <header
          className="flex items-center justify-between h-16 px-8 bg-[#F0F5FF] text-black"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.18)", position: "relative", zIndex: 10 }}
        >
          <div className="flex items-center select-none">
            <button
              onClick={() => router.push('/client/dashboard')}
              className="cursor-pointer"
            >
              <Image
                src={DASHBOARD_LOGO_PATH}
                alt="Thaumazo Text Logo"
                width={140}
                height={32}
                style={{ objectFit: "contain" }}
              />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-black">
              {firstName || lastName
                ? `Welcome, ${firstName ?? ''}${lastName ? ` ${lastName}` : ''}`.trim()
                : `Welcome, Client`}
            </span>

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
                      {(firstName && firstName.length > 0)
                        ? firstName.charAt(0).toUpperCase()
                        : 'C'}
                    </span>
                  )}
                </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl py-4 z-50 border border-gray-100 animate-fade-in flex flex-col gap-4">
                  {/* Profile Card */}
                  <div className="flex flex-col items-center px-2 py-2 bg-white rounded-xl shadow-md mx-4 mt-2 mb-2">
                    <div className="flex items-center w-full gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow relative">
                        {profilePicUrl ? (
                          <Image
                            src={profilePicUrl}
                            alt="Profile"
                            fill
                            sizes="40px"
                            className="object-cover"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-base font-bold text-white bg-gray-600">
                            {(firstName && firstName.length > 0)
                              ? firstName.charAt(0).toUpperCase()
                              : 'C'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="text-base font-semibold text-gray-900">{firstName || lastName ? `${firstName ?? ''}${lastName ? ` ${lastName}` : ''}`.trim() : displayName}</div>
                      </div>
                    </div>
                    <hr className="w-full my-2 border-gray-200" />
                    <div className="text-xs text-gray-500 capitalize w-full text-center">Client</div>
                  </div>
                  {/* Menu Items */}
                  <div className="flex flex-col gap-1 px-2">
                    {/* Settings & Privacy */}
                    <button
                      onClick={() => {
                        router.push(config.profileMenuItems?.[0]?.href || '/client/settings');
                        setProfileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-800 font-medium text-base w-full text-left"
                    >
                      {/* Settings Icon in gray circle */}
                      <span className="bg-gray-200 w-8 h-8 flex items-center justify-center rounded-full">
                        <Image src="/settings-icon.svg" alt="Settings" width={20} height={20} />
                      </span>
                      <span>Settings & Privacy</span>
                    </button>
                    {/* Help & Support */}
                    <button
                      onClick={() => {
                        router.push('/client/help');
                        setProfileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-800 font-medium text-base w-full text-left"
                    >
                      {/* Help Icon in gray circle */}
                      <span className="bg-gray-200 w-8 h-8 flex items-center justify-center rounded-full">
                        <Image src="/help-icon.svg" alt="Help" width={20} height={20} />
                      </span>
                      <span>Help & Support</span>
                    </button>
                    {/* Logout */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-red-600 font-medium text-base w-full"
                    >
                      {/* Logout Icon in gray circle */}
                      <span className="bg-gray-200 w-8 h-8 flex items-center justify-center rounded-full">
                        <Image src="/log-out-icon.svg" alt="Logout" width={20} height={20} />
                      </span>
                      <span>Logout</span>
                    </button>
                  </div>
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