import { NewProduct } from '../types/inventory.types'

interface NewProductFormProps {
  newProduct: NewProduct
  setNewProduct: (product: NewProduct) => void
}

export const NewProductForm = ({ newProduct, setNewProduct }: NewProductFormProps) => {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Name"
        value={newProduct.name}
        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
      />
      <input
        type="number"
        placeholder="Weight"
        value={newProduct.weight}
        onChange={(e) => setNewProduct({ ...newProduct, weight: e.target.value })}
        className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
      />
      <input
        type="number"
        placeholder="Volume"
        value={newProduct.volume}
        onChange={(e) => setNewProduct({ ...newProduct, volume: e.target.value })}
        className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
      />
      <label className="inline-flex items-center">
        <input
          type="checkbox"
          checked={newProduct.is_fragile}
          onChange={(e) => setNewProduct({ ...newProduct, is_fragile: e.target.checked })}
          className="mr-2"
        />
        Fragile
      </label>
    </div>
  )
}