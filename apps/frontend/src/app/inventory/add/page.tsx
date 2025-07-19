'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem, NewInventoryItem, NewInventoryVariant } from '@/types/inventory.types';
import { NewProductForm } from '@/components/inventory/NewProductForm';

export default function AddInventoryPage() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newItem, setNewItem] = useState<NewInventoryItem>({ 
    name: '', 
    category: '', 
    description: '' 
  });
  const [newVariant, setNewVariant] = useState<NewInventoryVariant>({
    item_id: '',
    supplier_name: '',
    packaging_type: '',
    cost_price: 0,
    selling_price: 0,
    sku: '',
    is_fragile: false
  });
  const [initialStock, setInitialStock] = useState(0);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showNewVariantForm, setShowNewVariantForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching inventory items:', error);
      setMessage('Error loading inventory items');
    } else {
      setInventoryItems(data || []);
    }
  };

  const handleCreateItem = async () => {
    if (newItem.name.trim() === '') {
      setMessage('Please provide a valid name for the new item.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { data: insertedItem, error } = await supabase
      .from('inventory_items')
      .insert([{
        name: newItem.name,
        category: newItem.category,
        description: newItem.description
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding item:', error);
      setMessage(`Error adding item: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage('✅ Item created successfully!');
    setNewItem({ name: '', category: '', description: '' });
    setShowNewItemForm(false);
    setSelectedItemId(insertedItem.id);
    setNewVariant({ ...newVariant, item_id: insertedItem.id });
    await fetchInventoryItems();
    setLoading(false);
  };

  const handleCreateVariant = async () => {
    if (
      newVariant.supplier_name.trim() === '' ||
      newVariant.sku.trim() === '' ||
      newVariant.cost_price <= 0 ||
      newVariant.selling_price <= 0
    ) {
      setMessage('Please provide valid supplier name, SKU, and pricing for the new variant.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create the variant
      const { data: insertedVariant, error: variantError } = await supabase
        .from('inventory_items_variants')
        .insert([{
          item_id: newVariant.item_id,
          supplier_name: newVariant.supplier_name,
          packaging_type: newVariant.packaging_type,
          cost_price: newVariant.cost_price,
          selling_price: newVariant.selling_price,
          sku: newVariant.sku,
          is_fragile: newVariant.is_fragile,
          current_stock: initialStock
        }])
        .select()
        .single();

      if (variantError) {
        setMessage(`Error creating variant: ${variantError.message}`);
        setLoading(false);
        return;
      }

      // If there's initial stock, record the movement
      if (initialStock > 0) {
        const { error: movementError } = await supabase
          .from('inventory_items_movements')
          .insert({
            variant_id: insertedVariant.id,
            movement_type: 'stock_in',
            quantity: initialStock,
            remarks: 'Initial stock'
          });

        if (movementError) {
          console.error('Error recording initial stock movement:', movementError);
          // Don't fail the whole operation, just log the error
        }
      }

      setMessage('✅ Variant created successfully!');
      setNewVariant({
        item_id: '',
        supplier_name: '',
        packaging_type: '',
        cost_price: 0,
        selling_price: 0,
        sku: '',
        is_fragile: false
      });
      setInitialStock(0);
      setShowNewVariantForm(false);
      setSelectedItemId('');
      setLoading(false);
    } catch (err) {
      setMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Inventory Item</h1>
        <p className="text-gray-600">Create new inventory items and variants with stock tracking.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create New Item Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Item</h2>
          
          {!showNewItemForm ? (
            <button
              onClick={() => setShowNewItemForm(true)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              ➕ Create New Item
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateItem}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Item'}
                </button>
                <button
                  onClick={() => {
                    setShowNewItemForm(false);
                    setNewItem({ name: '', category: '', description: '' });
                  }}
                  className="flex-1 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create New Variant Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Variant</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  setNewVariant({ ...newVariant, item_id: e.target.value });
                }}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select an Item --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedItemId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={newVariant.supplier_name}
                    onChange={(e) => setNewVariant({ ...newVariant, supplier_name: e.target.value })}
                    className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                    className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="Enter SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging Type
                  </label>
                  <input
                    type="text"
                    value={newVariant.packaging_type}
                    onChange={(e) => setNewVariant({ ...newVariant, packaging_type: e.target.value })}
                    className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter packaging type"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.cost_price}
                      onChange={(e) => setNewVariant({ ...newVariant, cost_price: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selling Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.selling_price}
                      onChange={(e) => setNewVariant({ ...newVariant, selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newVariant.is_fragile}
                      onChange={(e) => setNewVariant({ ...newVariant, is_fragile: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as fragile</span>
                  </label>
                </div>

                <button
                  onClick={handleCreateVariant}
                  disabled={loading || !selectedItemId || !newVariant.supplier_name || !newVariant.sku}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Variant'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/inventory/table')}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          ← Back to Inventory Table
        </button>
      </div>
    </div>
  );
} 