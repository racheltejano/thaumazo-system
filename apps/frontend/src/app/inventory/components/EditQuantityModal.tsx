import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EditQtyItem } from '../types/inventory.types';
import { X, Plus, Minus } from 'lucide-react';

interface EditQuantityModalProps {
  editQtyItem: EditQtyItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditQuantityModal = ({ editQtyItem, onClose, onSuccess }: EditQuantityModalProps) => {
  const [editQtyValue, setEditQtyValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editQtyItem) {
      setEditQtyValue('');
      setError('');
    }
  }, [editQtyItem]);

  const handleSubmit = async () => {
    if (!editQtyItem) return;

    const parsed = parseInt(editQtyValue);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid positive number.');
      return;
    }

    if (editQtyItem.mode === 'subtract' && parsed > editQtyItem.currentQty) {
      setError('Cannot subtract more than current quantity.');
      return;
    }

    setLoading(true);
    setError('');

    const newQty =
      editQtyItem.mode === 'add'
        ? editQtyItem.currentQty + parsed
        : editQtyItem.currentQty - parsed;

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', editQtyItem.id);

    if (updateError) {
      setError('Error updating quantity. Please try again.');
      setLoading(false);
      return;
    }

    onSuccess();
    onClose();
    setEditQtyValue('');
    setLoading(false);
  };

  const handleClose = () => {
    setEditQtyValue('');
    setError('');
    onClose();
  };

  if (!editQtyItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              editQtyItem.mode === 'add' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {editQtyItem.mode === 'add' ? (
                <Plus className="w-5 h-5" />
              ) : (
                <Minus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editQtyItem.mode === 'add' ? 'Add Quantity' : 'Subtract Quantity'}
              </h2>
              <p className="text-sm text-gray-500">
                Current quantity: {editQtyItem.currentQty}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editQtyItem.mode === 'add' ? 'Quantity to Add' : 'Quantity to Subtract'}
            </label>
            <input
              type="number"
              min={1}
              max={editQtyItem.mode === 'subtract' ? editQtyItem.currentQty : undefined}
              value={editQtyValue}
              onChange={(e) => setEditQtyValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500"
              placeholder={`Enter quantity to ${editQtyItem.mode}`}
              autoFocus
            />
            {editQtyItem.mode === 'subtract' && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {editQtyItem.currentQty}
              </p>
            )}
          </div>

          {editQtyValue && !isNaN(parseInt(editQtyValue)) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                New quantity will be:{' '}
                <span className="font-semibold text-gray-900">
                  {editQtyItem.mode === 'add' 
                    ? editQtyItem.currentQty + parseInt(editQtyValue)
                    : editQtyItem.currentQty - parseInt(editQtyValue)
                  }
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !editQtyValue}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
              editQtyItem.mode === 'add'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
            } disabled:cursor-not-allowed`}
          >
            {loading ? 'Updating...' : 'Update Quantity'}
          </button>
        </div>
      </div>
    </div>
  );
};