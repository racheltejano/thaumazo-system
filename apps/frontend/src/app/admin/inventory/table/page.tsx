'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/useInventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { EditQuantityModal } from '@/components/inventory/EditQuantityModal';
import { ProductDetailsModal } from '@/components/inventory/ProductDetailsModal';
import { EditStockItem, InventoryItemVariant } from '@/types/inventory.types';

export default function AdminInventoryTablePage() {
  const {
    loading,
    inventoryItems,
    inventoryError,
    refreshData,
  } = useInventory();

  const [editQtyItem, setEditQtyItem] = useState<EditStockItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItemVariant | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Inventory Management</h1>
            <p className="mt-2 text-gray-600">
              Manage warehouse stock and track inventory levels across all locations
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/inventory/add')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ➕ Add Inventory
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {inventoryError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Error loading inventory</h3>
            <p className="text-red-600 text-sm mt-1">{inventoryError}</p>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Inventory</h2>
            <p className="text-sm text-gray-600">
              Total items: {inventoryItems.length} | 
              Total quantity: {inventoryItems.reduce((sum: number, item: any) => sum + (item.totalStock || 0), 0)}
            </p>
          </div>
          
          <InventoryTable 
            inventory={inventoryItems} 
            onEditQuantity={setEditQtyItem}
            onViewProduct={setSelectedProduct}
          />
        </div>

        <EditQuantityModal
          editQtyItem={editQtyItem}
          onClose={() => setEditQtyItem(null)}
          onSuccess={refreshData}
        />

        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={refreshData}
        />
      </div>
    </div>
  );
}