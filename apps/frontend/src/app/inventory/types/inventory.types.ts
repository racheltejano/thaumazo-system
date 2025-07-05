export interface Product {
  id: string
  name: string
  weight: string
  volume: string
  is_fragile: boolean
}

export interface InventoryItem {
  id: number
  quantity: number
  latitude: number
  longitude: number
  products: Product
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