'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem, InventoryItemVariant, NewInventoryVariant } from '@/types/inventory.types';
import { ArrowLeft, Plus, Package, Tag, DollarSign, Truck, AlertTriangle, Edit, MoreVertical, Move, Settings, Box, Eye } from 'lucide-react';

export default function ItemProfilePage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [variants, setVariants] = useState<InventoryItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);


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
  
  // Calculate additional metrics
  const averageMargin = variants.length > 0 
    ? variants.reduce((sum, variant) => {
        const margin = (variant.selling_price || 0) - (variant.cost_price || 0);
        return sum + margin;
      }, 0) / variants.length
    : 0;
  
  const lowStockCount = variants.filter(variant => (variant.current_stock || 0) <= 10).length;

  return (
    <div className="p-6">
      <div 
        className={`max-w-6xl mx-auto transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/inventory/dashboard')}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-gray-600">
                <span>{item.inventory_items_categories?.name || 'No category'}</span>
                <span>•</span>
                                  <span>Created {new Date(item.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => router.push(`/inventory/item/${itemId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Item
          </button>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div className="mb-8">
          <p className="text-gray-600 text-lg leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* Item Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Variants</p>
              <p className="text-2xl font-bold text-gray-900">{variants.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Stock</p>
              <p className={`text-2xl font-bold ${totalStock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                {totalStock}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Tag className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Margin</p>
              <p className="text-2xl font-bold text-gray-900">₱{averageMargin.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {lowStockCount}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Variants Table */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Variants
            </h2>
            <button
              onClick={() => router.push(`/inventory/item/${itemId}/add-variant`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>
        </div>

        {variants.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">No variants yet</div>
            <p className="text-gray-400 mt-2">Add your first variant to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {variants.map((variant) => {
              const margin = (variant.selling_price || 0) - (variant.cost_price || 0);
              const marginPercentage = variant.cost_price ? (margin / variant.cost_price) * 100 : 0;
              
              return (
                <div key={variant.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {variant.variant_name || 'Unnamed Variant'}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        SKU: {variant.sku}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${variant.current_stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {variant.current_stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <button
                        onClick={() => router.push(`/inventory/edit-variant/${variant.id}`)}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-all duration-200 hover:scale-105"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Stock, Cost Price, Margin Row */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Stock</p>
                      <p className={`font-semibold ${variant.current_stock <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                        {variant.current_stock}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cost Price</p>
                      <p className="font-semibold text-gray-900">
                        ₱{variant.cost_price?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Margin</p>
                      <p className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₱{margin.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({marginPercentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  {/* Supplier Information Row */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Supplier</p>
                      <p className="font-medium text-gray-900">
                        {variant.supplier_name || 'not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="font-medium text-gray-500">
                        {variant.supplier_email || 'not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                      <p className="font-medium text-gray-500">
                        {variant.supplier_number || 'not set'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => router.push(`/inventory/item-variant/${variant.id}`)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => router.push(`/inventory/move-variant-stock/${variant.id}`)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Box className="w-4 h-4" />
                        Move Stock
                      </button>
                    </div>
                  </div>

                  {/* Low Stock Warning */}
                  {variant.current_stock <= 3 && variant.current_stock > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-end">
                        <span className="text-red-600 font-medium text-sm">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          Low Stock
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
} 