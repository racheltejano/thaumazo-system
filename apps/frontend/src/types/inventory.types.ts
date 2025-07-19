export interface InventoryItem {
  id: string
  name: string
  category: string | null
  description: string | null
  created_at: string
}

export interface InventoryItemVariant {
  id: string
  item_id: string
  supplier_name: string
  packaging_type: string | null
  cost_price: number | null
  selling_price: number | null
  sku: string
  is_fragile: boolean
  current_stock: number
  created_at: string
  inventory_items?: InventoryItem
}

export interface InventoryMovement {
  id: string
  variant_id: string
  movement_type: 'stock_in' | 'stock_out'
  quantity: number
  reference_type: string | null
  reference_id: string | null
  remarks: string | null
  created_at: string
  inventory_items_variants?: InventoryItemVariant
}

export interface NewInventoryItem {
  name: string
  category: string
  description: string
}

export interface NewInventoryVariant {
  item_id: string
  supplier_name: string
  packaging_type: string
  cost_price: number
  selling_price: number
  sku: string
  is_fragile: boolean
}

export interface NewMovement {
  variant_id: string
  movement_type: 'stock_in' | 'stock_out'
  quantity: number
  reference_type?: string
  reference_id?: string
  remarks?: string
}

export interface EditStockItem {
  variant_id: string
  currentStock: number
  mode: 'add' | 'subtract'
  quantity: number
}

// Legacy types for backward compatibility during transition
export interface Product {
  id: string
  name: string
  weight: string
  volume: string
  is_fragile: boolean
}

export interface NewProduct {
  name: string
  weight: string
  volume: string
  is_fragile: boolean
}

export interface EditQtyItem {
  id: number
  currentQty: number
  mode: 'add' | 'subtract'
}