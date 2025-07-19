'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useInventory } from '@/hooks/useInventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { EditQuantityModal } from '@/components/inventory/EditQuantityModal';
import { ProductDetailsModal } from '@/components/inventory/ProductDetailsModal';
import { EditStockItem, InventoryItemVariant } from '@/types/inventory.types';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function InventoryTablePage() {
  const {
    loading,
    inventoryVariants,
    inventoryError,
    refreshData,
  } = useInventory();

  const [editStockItem, setEditStockItem] = useState<EditStockItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<InventoryItemVariant | null>(null);
  const auth = useAuth();
  const router = useRouter();

  if (loading) return <p>Loading...</p>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh();
    }
    router.push('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">🏷️ Inventory Staff Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome! Manage warehouse stock and incoming/outgoing deliveries here.
      </p>

      <div className="mt-4">
        <Link
          href="/inventory/add"
          className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition-colors"
        >
          ➕ Add Inventory Item
        </Link>
      </div>

      {inventoryError && <p className="text-red-500">Error: {inventoryError}</p>}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">📦 Current Inventory</h2>
        <InventoryTable 
          inventory={inventoryVariants} 
          onEditQuantity={setEditStockItem}
          onViewProduct={setSelectedVariant}
        />
      </div>

      <EditQuantityModal
        editQtyItem={editStockItem}
        onClose={() => setEditStockItem(null)}
        onSuccess={refreshData}
      />

      <ProductDetailsModal
        product={selectedVariant}
        onClose={() => setSelectedVariant(null)}
        onSuccess={refreshData}
      />
    </div>
  );
} 