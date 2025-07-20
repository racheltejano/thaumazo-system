'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InventoryItemCard from './InventoryItemCard';
import { useInventory } from '@/hooks/useInventory';

// Sample data for demonstration
const sampleItems = [
  {
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation technology and long battery life. Perfect for professional use and entertainment.',
    stockStatus: 'in_stock' as const,
    category: 'Electronics',
    totalStock: 45,
    variants: 3,
    avgPrice: '$89.99',
  },
  {
    name: 'Organic Cotton T-Shirts',
    description: 'Comfortable and sustainable organic cotton t-shirts available in multiple sizes and colors. Made from 100% organic materials.',
    stockStatus: 'low_stock' as const,
    category: 'Clothing',
    totalStock: 8,
    variants: 5,
    avgPrice: '$24.99',
  },
  {
    name: 'Stainless Steel Water Bottles',
    description: 'Durable stainless steel water bottles with vacuum insulation. Keeps drinks cold for 24 hours or hot for 12 hours.',
    stockStatus: 'out_of_stock' as const,
    category: 'Kitchen & Home',
    totalStock: 0,
    variants: 2,
    avgPrice: '$19.99',
  },
  {
    name: 'Smart Fitness Tracker',
    description: 'Advanced fitness tracking device with heart rate monitoring, GPS, and sleep tracking capabilities. Water-resistant design.',
    stockStatus: 'in_stock' as const,
    category: 'Electronics',
    totalStock: 23,
    variants: 4,
    avgPrice: '$149.99',
  },
  {
    name: 'Natural Face Moisturizer',
    description: 'Hydrating face moisturizer made with natural ingredients. Suitable for all skin types and provides 24-hour hydration.',
    stockStatus: 'low_stock' as const,
    category: 'Beauty & Health',
    totalStock: 12,
    variants: 2,
    avgPrice: '$34.99',
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Compact and powerful Bluetooth speaker with 360-degree sound. Perfect for outdoor activities and small gatherings.',
    stockStatus: 'in_stock' as const,
    category: 'Electronics',
    totalStock: 67,
    variants: 3,
    avgPrice: '$59.99',
  },
];

export default function InventoryItemsGrid() {
  const [isVisible, setIsVisible] = useState(false);
  const { inventoryItems, loading } = useInventory();
  const router = useRouter();

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const getStockStatus = (totalStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    if (totalStock === 0) return 'out_of_stock';
    if (totalStock <= 10) return 'low_stock';
    return 'in_stock';
  };

  const calculateAveragePrice = (item: any): string => {
    const variants = item.inventory_items_variants || [];
    if (variants.length === 0) return '$0.00';
    
    const totalPrice = variants.reduce((sum: number, variant: any) => 
      sum + (variant.selling_price || 0), 0
    );
    const avgPrice = totalPrice / variants.length;
    return `$${avgPrice.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Loading inventory items...</div>
      </div>
    );
  }

  if (inventoryItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No inventory items found</div>
        <p className="text-gray-400 mt-2">Create your first item to get started.</p>
      </div>
    );
  }

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventoryItems.map((item) => (
          <div key={item.id}>
            <InventoryItemCard 
              item={{
                id: item.id,
                name: item.name,
                description: item.description || 'No description available',
                stockStatus: getStockStatus(item.totalStock || 0),
                category: item.inventory_items_categories?.name || 'Uncategorized',
                totalStock: item.totalStock || 0,
                variants: item.variantsCount || 0,
                avgPrice: calculateAveragePrice(item),
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
} 