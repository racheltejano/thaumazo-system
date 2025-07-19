'use client';

import { useEffect, useState } from 'react';
import InventoryItemCard from './InventoryItemCard';

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

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleItems.map((item, index) => (
          <div
            key={index}
            style={{ 
              transitionDelay: `${index * 100}ms`,
              transition: 'all 0.7s ease-out'
            }}
            className={`${
              isVisible 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
            }`}
          >
            <InventoryItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
} 