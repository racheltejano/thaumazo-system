'use client';

import { DriverStats } from './useDrivers';
import { Users, Truck, Package, Clock } from 'lucide-react';

interface DriverOverviewCardsProps {
  stats: DriverStats;
  loading: boolean;
}

export const DriverOverviewCards = ({ stats, loading }: DriverOverviewCardsProps) => {
  const cards = [
    {
      title: 'Total Active Drivers',
      value: stats.totalActiveDrivers,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Currently active drivers',
    },
    {
      title: 'Drivers On Duty',
      value: stats.driversOnDuty,
      icon: Truck,
      color: 'bg-green-500',
      description: 'Drivers with active orders',
    },
    {
      title: 'Orders Delivered This Month',
      value: stats.ordersDeliveredThisMonth,
      icon: Package,
      color: 'bg-purple-500',
      description: 'Completed deliveries this month',
    },
    {
      title: 'Average Delivery Time',
      value: `${stats.averageDeliveryTime}h`,
      icon: Clock,
      color: 'bg-orange-500',
      description: 'Average time per delivery',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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