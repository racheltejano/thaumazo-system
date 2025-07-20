'use client';

import { Package, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  valueColor: string;
  isVisible: boolean;
  tooltip?: string;
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor, valueColor, isVisible, tooltip }: StatCardProps) {
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
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {tooltip && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  {tooltip}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
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
  const { inventoryItems, loading } = useInventory();

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Calculate stats from inventory data
  const calculateStats = () => {
    if (!inventoryItems || inventoryItems.length === 0) {
      return {
        totalItems: 0,
        totalStock: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
      };
    }

    const totalItems = inventoryItems.length;
    
    const totalStock = inventoryItems.reduce((sum, item) => {
      const variants = item.inventory_items_variants || [];
      return sum + variants.reduce((variantSum, variant) => 
        variantSum + (variant.current_stock || 0), 0
      );
    }, 0);

    const lowStockItems = inventoryItems.filter(item => {
      const variants = item.inventory_items_variants || [];
      const totalItemStock = variants.reduce((sum, variant) => 
        sum + (variant.current_stock || 0), 0
      );
      return totalItemStock > 0 && totalItemStock < 5;
    }).length;

    const outOfStockItems = inventoryItems.filter(item => {
      const variants = item.inventory_items_variants || [];
      const totalItemStock = variants.reduce((sum, variant) => 
        sum + (variant.current_stock || 0), 0
      );
      return totalItemStock === 0;
    }).length;

    return {
      totalItems,
      totalStock,
      lowStockItems,
      outOfStockItems,
    };
  };

  const stats = calculateStats();

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems.toLocaleString(),
      icon: Package,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Total Stock',
      value: stats.totalStock.toLocaleString(),
      icon: Package,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      tooltip: 'Items with less than 5 units in stock',
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems,
      icon: AlertCircle,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
      tooltip: 'Items with 0 units in stock',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 border border-gray-100 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <StatCard 
          key={index} 
          {...stat} 
          isVisible={isVisible}
        />
      ))}
    </div>
  );
} 