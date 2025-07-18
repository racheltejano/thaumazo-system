import { NewProduct } from '@/types/inventory.types';

interface NewProductFormProps {
  newProduct: NewProduct
  setNewProduct: (product: NewProduct) => void
}

export const NewProductForm = ({ newProduct, setNewProduct }: NewProductFormProps) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Name
        </label>
        <input
          type="text"
          placeholder="Enter product name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Weight (kg)
        </label>
        <input
          type="number"
          step="0.01"
          placeholder="Enter weight in kg"
          value={newProduct.weight}
          onChange={(e) => setNewProduct({ ...newProduct, weight: e.target.value })}
          className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Volume (m³)
        </label>
        <input
          type="number"
          step="0.01"
          placeholder="Enter volume in m³"
          value={newProduct.volume}
          onChange={(e) => setNewProduct({ ...newProduct, volume: e.target.value })}
          className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={newProduct.is_fragile}
            onChange={(e) => setNewProduct({ ...newProduct, is_fragile: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Fragile item</span>
        </label>
      </div>
    </div>
  )
}