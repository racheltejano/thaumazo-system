'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InventoryItemCard from './InventoryItemCard';
import { useInventory } from '@/hooks/useInventory';

interface InventoryItemsGridProps {
  searchQuery: string;
  filterType: string;
  filterValue: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function InventoryItemsGrid({
  searchQuery,
  filterType,
  filterValue,
  sortBy,
  sortOrder
}: InventoryItemsGridProps) {
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
    if (variants.length === 0) return '₱0.00';
    
    const totalPrice = variants.reduce((sum: number, variant: any) => 
      sum + (variant.selling_price || 0), 0
    );
    const avgPrice = totalPrice / variants.length;
    return `₱${avgPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter and sort the inventory items
  const filteredAndSortedItems = inventoryItems
    .filter((item) => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filterType === 'category' && filterValue) {
        const categoryName = item.inventory_items_categories?.name || '';
        if (!categoryName.toLowerCase().includes(filterValue.toLowerCase())) {
          return false;
        }
      }
      
      // Stock filter
      if (filterType === 'stock' && filterValue) {
        const stockValue = parseInt(filterValue);
        if (isNaN(stockValue)) return true;
        return (item.totalStock || 0) <= stockValue;
      }
      
      // Variants filter
      if (filterType === 'variants' && filterValue) {
        const variantsValue = parseInt(filterValue);
        if (isNaN(variantsValue)) return true;
        return (item.variantsCount || 0) <= variantsValue;
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.inventory_items_categories?.name?.toLowerCase() || '';
          bValue = b.inventory_items_categories?.name?.toLowerCase() || '';
          break;
        case 'stock':
          aValue = a.totalStock || 0;
          bValue = b.totalStock || 0;
          break;
        case 'variants':
          aValue = a.variantsCount || 0;
          bValue = b.variantsCount || 0;
          break;
        case 'price':
          const variantsA = a.inventory_items_variants || [];
          const totalPriceA = variantsA.reduce((sum: number, variant: any) => 
            sum + (variant.selling_price || 0), 0
          );
          const avgPriceA = variantsA.length > 0 ? totalPriceA / variantsA.length : 0;
          
          const variantsB = b.inventory_items_variants || [];
          const totalPriceB = variantsB.reduce((sum: number, variant: any) => 
            sum + (variant.selling_price || 0), 0
          );
          const avgPriceB = variantsB.length > 0 ? totalPriceB / variantsB.length : 0;
          
          aValue = avgPriceA;
          bValue = avgPriceB;
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

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

  if (filteredAndSortedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No items match your search criteria</div>
        <p className="text-gray-400 mt-2">Try adjusting your search or filter settings.</p>
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
        {filteredAndSortedItems.map((item) => (
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