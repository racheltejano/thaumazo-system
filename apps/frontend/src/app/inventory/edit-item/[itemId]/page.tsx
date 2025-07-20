'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types/inventory.types';
import { createPortal } from 'react-dom';
import { ArrowLeft, Save, Trash2, X } from 'lucide-react';
import CategorySelector from '@/components/inventory/CategorySelector';

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [variantsCount, setVariantsCount] = useState(0);
  const [totalStock, setTotalStock] = useState(0);

  const [editItem, setEditItem] = useState({
    name: '',
    category_id: null as string | null,
    description: ''
  });

  const [originalItem, setOriginalItem] = useState({
    name: '',
    category_id: null as string | null,
    description: ''
  });

  useEffect(() => {
    if (itemId) {
      fetchItemData();
    }
  }, [itemId]);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const fetchItemData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch item details with category
      const { data: itemData, error: itemError } = await supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_items_categories (
            id,
            name,
            description
          )
        `)
        .eq('id', itemId)
        .single();

      if (itemError) {
        setError('Error loading item details');
        setLoading(false);
        return;
      }

      setItem(itemData);
      const itemDataForEdit = {
        name: itemData.name,
        category_id: itemData.category_id,
        description: itemData.description || ''
      };
      setEditItem(itemDataForEdit);
      setOriginalItem(itemDataForEdit);

      // Fetch variants and stock information
      const { data: variantsData, error: variantsError } = await supabase
        .from('inventory_items_variants')
        .select('id, current_stock')
        .eq('item_id', itemId);

      if (!variantsError && variantsData) {
        setVariantsCount(variantsData.length);
        const total = variantsData.reduce((sum, variant) => sum + (variant.current_stock || 0), 0);
        setTotalStock(total);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      editItem.name !== originalItem.name ||
      editItem.category_id !== originalItem.category_id ||
      editItem.description !== originalItem.description
    );
  };

  const handleUpdateItem = async () => {
    if (editItem.name.trim() === '') {
      setError('Please provide a valid name for the item.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: editItem.name,
          category_id: editItem.category_id,
          description: editItem.description
        })
        .eq('id', itemId);

      if (error) {
        setError(`Error updating item: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('✅ Item updated successfully!');
      
      // Redirect back to the item details page after a short delay
      setTimeout(() => {
        router.push(`/inventory/item/${itemId}`);
      }, 1500);
      
      setSaving(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    setDeleting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        setError(`Error deleting item: ${error.message}`);
        setDeleting(false);
        return;
      }

      // Navigate back to inventory dashboard
      router.push('/inventory/dashboard');
      
    } catch (err) {
      setError('An unexpected error occurred');
      setDeleting(false);
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteCountdown(10);
  };

  const handleCloseModal = () => {
    setShowDeleteConfirm(false);
    setDeleteCountdown(10);
  };

  // Countdown effect
  useEffect(() => {
    if (showDeleteConfirm && deleteCountdown > 0) {
      const timer = setTimeout(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showDeleteConfirm, deleteCountdown]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Loading item details...</div>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg">Error: {error}</div>
          <button
            onClick={() => router.push('/inventory/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Item not found</div>
          <button
            onClick={() => router.push('/inventory/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div 
        className={`max-w-2xl mx-auto transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
        }`}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/inventory/item/${itemId}`)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Edit Item</h1>
            </div>
            
            <button
              onClick={handleShowDeleteConfirm}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Item'}
            </button>
          </div>
          <p className="text-gray-600 ml-14">Update information for "{item?.name}"</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg">
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <CategorySelector
                value={editItem.category_id}
                onChange={(categoryId) => setEditItem({ ...editItem, category_id: categoryId })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editItem.description}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item description"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => router.push(`/inventory/item/${itemId}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateItem}
            disabled={saving || !hasChanges()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[9999]"
            onClick={handleCloseModal}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Item</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{item?.name}"? This action cannot be undone.
                <span className="block mt-2 text-red-600 font-medium">
                  ⚠️ This item has {variantsCount} variant{variantsCount !== 1 ? 's' : ''} with {totalStock} total stock units. {totalStock > 0 ? 'This item has stock that will be deleted. ' : ''}Deleting this item will remove all variants and inventory movements record related to this item.
                </span>
                <span className="block mt-2 text-sm text-gray-500 text-center">
                  {deleteCountdown > 0 ? (
                    <span>Delete button available in {deleteCountdown} seconds</span>
                  ) : (
                    <span className="text-green-600 font-medium">Ready to delete</span>
                  )}
                </span>
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCloseModal}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  disabled={deleting || deleteCountdown > 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
} 