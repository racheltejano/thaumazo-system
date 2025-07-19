'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem, InventoryItemVariant, NewInventoryVariant } from '@/types/inventory.types';
import { ArrowLeft, Plus, Package, Tag, DollarSign, Truck, AlertTriangle } from 'lucide-react';

export default function ItemProfilePage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [variants, setVariants] = useState<InventoryItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState<NewInventoryVariant>({
    item_id: itemId,
    supplier_name: '',
    packaging_type: '',
    cost_price: 0,
    selling_price: 0,
    sku: '',
    is_fragile: false
  });
  const [initialStock, setInitialStock] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItemData();
    }
  }, [itemId]);

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

      // Fetch variants for this item
      const { data: variantsData, error: variantsError } = await supabase
        .from('inventory_items_variants')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (variantsError) {
        setError('Error loading variants');
        setLoading(false);
        return;
      }

      setVariants(variantsData || []);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async () => {
    if (
      newVariant.supplier_name.trim() === '' ||
      newVariant.sku.trim() === '' ||
      newVariant.cost_price <= 0 ||
      newVariant.selling_price <= 0
    ) {
      setError('Please provide valid supplier name, SKU, and pricing for the new variant.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Create the variant
      const { data: insertedVariant, error: variantError } = await supabase
        .from('inventory_items_variants')
        .insert([{
          item_id: itemId,
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
        setError(`Error creating variant: ${variantError.message}`);
        setSaving(false);
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
        }
      }

      // Reset form and refresh data
      setNewVariant({
        item_id: itemId,
        supplier_name: '',
        packaging_type: '',
        cost_price: 0,
        selling_price: 0,
        sku: '',
        is_fragile: false
      });
      setInitialStock(0);
      setShowAddVariant(false);
      await fetchItemData();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
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

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg">Error: {error}</div>
          <button
            onClick={() => router.push('/inventory/table')}
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
            onClick={() => router.push('/inventory/table')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  const totalStock = variants.reduce((sum, variant) => sum + (variant.current_stock || 0), 0);
  const totalCost = variants.reduce((sum, variant) => 
    sum + (variant.cost_price || 0) * (variant.current_stock || 0), 0
  );
  const totalValue = variants.reduce((sum, variant) => 
    sum + (variant.selling_price || 0) * (variant.current_stock || 0), 0
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/inventory/table')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600 mt-1">{item.category?.name || 'No category'}</p>
          </div>
          <button
            onClick={() => setShowAddVariant(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Variant
          </button>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Item Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900">{item.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <p className="text-gray-900">{item.category?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-900">{item.description || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Summary
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Variants</label>
              <p className="text-gray-900 font-semibold">{variants.length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Total Stock</label>
              <p className={`font-semibold ${totalStock <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                {totalStock}
                {totalStock <= 3 && totalStock > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    Low Stock
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Total Cost</label>
              <p className="text-gray-900 font-semibold">${totalCost.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Total Value</label>
              <p className="text-gray-900 font-semibold">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Variants Table */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Variants ({variants.length})
          </h2>
        </div>

        {variants.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">No variants yet</div>
            <p className="text-gray-400 mt-2">Add your first variant to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-900">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Packaging
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                    Fragile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {variant.supplier_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${variant.current_stock <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                          {variant.current_stock}
                        </span>
                        {variant.current_stock <= 3 && variant.current_stock > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ${variant.cost_price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ${variant.selling_price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {variant.packaging_type || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {variant.is_fragile ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Variant Modal */}
      {showAddVariant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Variant</h2>
              <p className="text-sm text-gray-500 mt-1">Create a new variant for {item.name}</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={newVariant.supplier_name}
                  onChange={(e) => setNewVariant({ ...newVariant, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAddVariant(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVariant}
                disabled={saving || !newVariant.supplier_name || !newVariant.sku}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Variant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 