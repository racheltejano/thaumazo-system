'use client'

import { useState } from 'react'
import { useInventory } from './hooks/useInventory'
import { InventoryTable } from './components/InventoryTable'
import { AddInventoryModal } from './components/AddInventoryModal'
import { EditQuantityModal } from './components/EditQuantityModal'
import { EditQtyItem } from './types/inventory.types'

export default function InventoryDashboard() {
  const {
    loading,
    inventory,
    inventoryError,
    products,
    handleLogout,
    refreshData,
  } = useInventory()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editQtyItem, setEditQtyItem] = useState<EditQtyItem | null>(null)

  if (loading) return <p>Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">🏷️ Inventory Staff Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome! Manage warehouse stock and incoming/outgoing deliveries here.
      </p>
      
      <div className="mt-4 space-x-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
        >
          Log Out
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          ➕ Add Inventory
        </button>
      </div>

      {inventoryError && <p className="text-red-500">Error: {inventoryError}</p>}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">📦 Current Inventory</h2>
        <InventoryTable 
          inventory={inventory} 
          onEditQuantity={setEditQtyItem}
        />
      </div>

      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        products={products}
        onSuccess={refreshData}
      />

      <EditQuantityModal
        editQtyItem={editQtyItem}
        onClose={() => setEditQtyItem(null)}
        onSuccess={refreshData}
      />
    </div>
  )
}