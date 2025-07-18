import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product, NewProduct } from '@/types/inventory.types'; // '../../types/inventory.types'
import { NewProductForm } from './NewProductForm'

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onSuccess: () => void
}

export const AddInventoryModal = ({ isOpen, onClose, products, onSuccess }: AddInventoryModalProps) => {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [newProduct, setNewProduct] = useState<NewProduct>({ 
    name: '', 
    weight: '', 
    volume: '', 
    is_fragile: false 
  })
  const [quantity, setQuantity] = useState(1)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [showNewProductForm, setShowNewProductForm] = useState(false)

  const handleSubmit = async () => {
    const parsedLat = parseFloat(latitude)
    const parsedLng = parseFloat(longitude)

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      alert('Latitude and Longitude must be valid numbers.')
      return
    }

    if (latitude.trim() === '' || longitude.trim() === '') {
      alert('Latitude and Longitude cannot be empty.')
      return
    }

    let productId = selectedProductId
    const isCreatingNew = !selectedProductId && newProduct.name.trim() !== ''

    if (!productId && !isCreatingNew) {
      alert('Please select a product or fill in the new product form.')
      return
    }

    if (isCreatingNew) {
      if (
        newProduct.name.trim() === '' ||
        newProduct.weight.trim() === '' ||
        newProduct.volume.trim() === '' ||
        isNaN(Number(newProduct.weight)) ||
        isNaN(Number(newProduct.volume))
      ) {
        alert('Please provide valid name, weight, and volume for the new product.')
        return
      }

      const { data: insertedProduct, error } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          weight: newProduct.weight,
          volume: newProduct.volume,
          is_fragile: newProduct.is_fragile
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding product:', error)
        alert(`Error adding product: ${error.message}`)
        return
      }

      productId = insertedProduct.id
    }

    const { data: existingInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', productId)
      .eq('latitude', parsedLat)
      .eq('longitude', parsedLng)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      alert('Error checking existing inventory')
      return
    }

    if (existingInventory) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: existingInventory.quantity + quantity })
        .eq('id', existingInventory.id)

      if (updateError) {
        alert('Error updating inventory quantity')
        return
      }
    } else {
      const { error: insertError } = await supabase.from('inventory').insert([
        {
          product_id: productId,
          quantity,
          latitude: parsedLat,
          longitude: parsedLng,
        },
      ])

      if (insertError) {
        alert('Error adding inventory')
        return
      }
    }

    onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 text-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-lg">
        <h2 className="text-xl font-bold">Add Inventory</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Select Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              const value = e.target.value
              if (value === '__create_new__') {
                setSelectedProductId('')
                setShowNewProductForm(true)
              } else {
                setSelectedProductId(value)
                setShowNewProductForm(false)
              }
            }}
            className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
          >
            <option value="" disabled>
              -- Select a Product --
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
            <option value="__create_new__">+ Create New Product</option>
          </select>
        </div>

        {showNewProductForm && (
          <div>
            <label className="block text-sm font-medium mb-2">New Product Details</label>
            <NewProductForm 
              newProduct={newProduct} 
              setNewProduct={setNewProduct} 
            />
          </div>
        )}

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="text"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="text"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
        />

        <div className="flex justify-between">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}