import { InventoryItem, EditQtyItem } from '../types/inventory.types'

interface InventoryTableProps {
  inventory: InventoryItem[]
  onEditQuantity: (item: EditQtyItem) => void
}

export const InventoryTable = ({ inventory, onEditQuantity }: InventoryTableProps) => {
  if (inventory.length === 0) {
    return <p>No inventory found.</p>
  }

  return (
    <table className="min-w-full border border-gray-300 rounded-md">
      <thead className="bg-yellow-300 text-black">
        <tr>
          <th className="border p-2 text-left">Product</th>
          <th className="border p-2 text-left">Qty</th>
          <th className="border p-2 text-left">Weight</th>
          <th className="border p-2 text-left">Volume</th>
          <th className="border p-2 text-left">Fragile</th>
          <th className="border p-2 text-left">Location</th>
          <th className="border p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {inventory.map((item) => (
          <tr
            key={item.id}
            className={`${
              item.quantity <= 3 ? 'bg-red-500 text-white' : ''
            }`}
          >
            <td className="border p-2">{item.products?.name ?? 'Unknown'}</td>
            <td className="border p-2">{item.quantity}</td>
            <td className="border p-2">{item.products?.weight ?? '-'}</td>
            <td className="border p-2">{item.products?.volume ?? '-'}</td>
            <td className="border p-2">
              {item.products?.is_fragile ? 'Yes' : 'No'}
            </td>
            <td className="border p-2">
              {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
            </td>
            <td className="border p-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onEditQuantity({
                      id: item.id,
                      currentQty: item.quantity,
                      mode: 'add',
                    })
                  }
                  className="px-2 py-1 bg-green-600 text-white rounded"
                >
                  +
                </button>
                <button
                  onClick={() =>
                    onEditQuantity({
                      id: item.id,
                      currentQty: item.quantity,
                      mode: 'subtract',
                    })
                  }
                  className="px-2 py-1 bg-red-600 text-white rounded"
                >
                  -
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}