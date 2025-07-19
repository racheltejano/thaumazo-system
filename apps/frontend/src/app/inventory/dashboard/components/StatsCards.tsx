'use client';

import { Package, AlertTriangle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  valueColor: string;
  isVisible: boolean;
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor, valueColor, isVisible }: StatCardProps) {
  return (
    <div 
      className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 cursor-pointer transition-all duration-700 ease-out hover:scale-105 hover:shadow-lg ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}

    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function StatsCards() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    {
      title: 'Total Items',
      value: '156',
      icon: Package,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Total Stock',
      value: '2,847',
      icon: Package,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Low Stock Items',
      value: '12',
      icon: AlertTriangle,
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
    },
    {
      title: 'Out of Stock',
      value: '3',
      icon: AlertCircle,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
          <StatCard 
            key={index} 
            {...stat} 
            isVisible={isVisible}
          />
        ))}
    </div>
  );
} 