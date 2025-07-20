'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types/inventory.types';
import { ArrowLeft, Save } from 'lucide-react';
import CategorySelector from '@/components/inventory/CategorySelector';

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

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
        className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
        }`}
      >
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push(`/inventory/item/${itemId}`)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Edit Item</h1>
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

        {/* Basic Information Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Save className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Item Name {editItem.name.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Category
                </label>
                <CategorySelector
                  value={editItem.category_id}
                  onChange={(category_id) => setEditItem({ ...editItem, category_id })}
                  placeholder="Select or create category"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editItem.description}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Enter item description"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/inventory/item/${itemId}`)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-800 font-medium rounded-lg transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateItem}
            disabled={saving || !editItem.name.trim() || !hasChanges()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Updating...' : 'Update Item'}
          </button>
        </div>
      </div>
    </div>
  );
} 