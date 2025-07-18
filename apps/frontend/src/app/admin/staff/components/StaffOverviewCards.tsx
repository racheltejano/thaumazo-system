'use client';

import { Users, Shield, Package, Truck, AlertTriangle } from 'lucide-react';

export interface StaffStats {
  totalAdmins: number;
  totalDrivers: number;
  totalInventoryStaff: number;
  totalDispatchers: number;
  incompleteProfiles: number;
}

interface StaffOverviewCardsProps {
  stats: StaffStats;
  loading: boolean;
}

export const StaffOverviewCards = ({ stats, loading }: StaffOverviewCardsProps) => {
  const cards = [
    {
      title: 'Administrators',
      value: stats.totalAdmins,
      icon: Shield,
      color: 'bg-red-500',
      description: 'System administrators',
    },
    {
      title: 'Drivers',
      value: stats.totalDrivers,
      icon: Truck,
      color: 'bg-blue-500',
      description: 'Delivery drivers',
    },
    {
      title: 'Inventory Staff',
      value: stats.totalInventoryStaff,
      icon: Package,
      color: 'bg-green-500',
      description: 'Warehouse staff',
    },
    {
      title: 'Dispatchers',
      value: stats.totalDispatchers,
      icon: Users,
      color: 'bg-purple-500',
      description: 'Order dispatchers',
    },
    {
      title: 'Incomplete Profiles',
      value: stats.incompleteProfiles,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      description: 'Need profile updates',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {[...Array(5)].map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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