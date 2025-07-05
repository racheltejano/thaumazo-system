import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EditQtyItem } from '../types/inventory.types'

interface EditQuantityModalProps {
  editQtyItem: EditQtyItem | null
  onClose: () => void
  onSuccess: () => void
}

export const EditQuantityModal = ({ editQtyItem, onClose, onSuccess }: EditQuantityModalProps) => {
  const [editQtyValue, setEditQtyValue] = useState('')

  const handleSubmit = async () => {
    if (!editQtyItem) return

    const parsed = parseInt(editQtyValue)
    if (isNaN(parsed) || parsed <= 0) {
      alert('Please enter a valid positive number.')
      return
    }

    if (editQtyItem.mode === 'subtract' && parsed > editQtyItem.currentQty) {
      alert('Cannot subtract more than current quantity.')
      return
    }

    const newQty =
      editQtyItem.mode === 'add'
        ? editQtyItem.currentQty + parsed
        : editQtyItem.currentQty - parsed

    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', editQtyItem.id)

    if (error) {
      alert('Error updating quantity')
      return
    }

    onSuccess()
    onClose()
    setEditQtyValue('')
  }

  if (!editQtyItem) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 text-white p-6 rounded-xl w-full max-w-sm space-y-4 shadow-lg">
        <h2 className="text-xl font-bold">
          {editQtyItem.mode === 'add' ? 'Add Quantity' : 'Subtract Quantity'}
        </h2>

        <input
          type="number"
          min={1}
          value={editQtyValue}
          onChange={(e) => setEditQtyValue(e.target.value)}
          className="w-full border border-gray-600 bg-gray-700 text-white p-2 rounded"
          placeholder="Enter quantity"
        />

        <div className="flex justify-between">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={() => {
              onClose()
              setEditQtyValue('')
            }}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}