'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Package, DollarSign, Hash, Box, Palette, Maximize } from 'lucide-react';

interface SupplierItem {
  id: string;
  variant_name: string | null;
  sku: string;
  cost_price: number | null;
  selling_price: number | null;
  current_stock: number;
  packaging_type: string | null;
  is_fragile: boolean;
  color: string | null;
  size: string | null;
  item_id: string | null;
  item_name?: string;
}

interface SupplierItemsModalProps {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

export default function SupplierItemsModal({ supplierId, supplierName, onClose }: SupplierItemsModalProps) {
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  useEffect(() => {
    fetchSupplierItems();
  }, [supplierId]);

  const fetchSupplierItems = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch variants for this supplier
      const { data: variantsData, error: variantsError } = await supabase
        .from('inventory_items_variants')
        .select(`
          id,
          variant_name,
          sku,
          cost_price,
          selling_price,
          current_stock,
          packaging_type,
          is_fragile,
          color,
          size,
          item_id
        `)
        .eq('supplier_id', supplierId)
        .order('variant_name');

      if (variantsError) throw variantsError;

      // Fetch item names for each variant
      const itemsWithNames = await Promise.all(
        (variantsData || []).map(async (variant) => {
          if (variant.item_id) {
            const { data: itemData } = await supabase
              .from('inventory_items')
              .select('name')
              .eq('id', variant.item_id)
              .single();

            return {
              ...variant,
              item_name: itemData?.name || 'Unknown Item'
            };
          }
          return {
            ...variant,
            item_name: 'No Parent Item'
          };
        })
      );

      setItems(itemsWithNames);
    } catch (err: any) {
      setError(err.message || 'Error loading supplier items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ position: 'fixed' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {supplierName}'s Products
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Loading...' : `${items.length} variant${items.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 text-lg font-medium">No products found</div>
              <p className="text-gray-400 mt-2">This supplier doesn't have any variants yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.variant_name || 'Unnamed Variant'}
                        </h3>
                        {item.is_fragile && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                            Fragile
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{item.item_name}</p>
                    </div>
                    
                    {/* Stock Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.current_stock === 0 
                        ? 'bg-red-100 text-red-700'
                        : item.current_stock < 10
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.current_stock} in stock
                    </div>
                  </div>

                  {/* Item Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* SKU */}
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">SKU</div>
                        <div className="text-sm font-medium text-gray-900">{item.sku}</div>
                      </div>
                    </div>

                    {/* Cost Price */}
                    {item.cost_price !== null && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Cost Price</div>
                          <div className="text-sm font-medium text-gray-900">
                            ₱{Number(item.cost_price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selling Price */}
                    {item.selling_price !== null && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-xs text-gray-500">Selling Price</div>
                          <div className="text-sm font-medium text-green-600">
                            ₱{Number(item.selling_price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Packaging */}
                    {item.packaging_type && (
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Packaging</div>
                          <div className="text-sm font-medium text-gray-900">{item.packaging_type}</div>
                        </div>
                      </div>
                    )}

                    {/* Color */}
                    {item.color && (
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Color</div>
                          <div className="text-sm font-medium text-gray-900">{item.color}</div>
                        </div>
                      </div>
                    )}

                    {/* Size */}
                    {item.size && (
                      <div className="flex items-center gap-2">
                        <Maximize className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Size</div>
                          <div className="text-sm font-medium text-gray-900">{item.size}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profit Margin */}
                  {item.cost_price !== null && item.selling_price !== null && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Profit Margin:</span>
                        <span className="font-semibold text-blue-600">
                          ₱{(Number(item.selling_price) - Number(item.cost_price)).toFixed(2)}
                          {' '}
                          ({((Number(item.selling_price) - Number(item.cost_price)) / Number(item.cost_price) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}