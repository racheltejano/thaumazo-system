'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItemVariant } from '@/types/inventory.types';
import { X, Edit, Save, Package, Tag, DollarSign, Truck, AlertTriangle } from 'lucide-react';

interface ProductDetailsModalProps {
  product: InventoryItemVariant | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductDetailsModal = ({ product, onClose, onSuccess }: ProductDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state for editing
  const [formData, setFormData] = useState({
    supplier_name: '',
    packaging_type: '',
    cost_price: '',
    selling_price: '',
    sku: '',
    is_fragile: false,
    current_stock: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        supplier_name: product.supplier_name || '',
        packaging_type: product.packaging_type || '',
        cost_price: product.cost_price?.toString() || '',
        selling_price: product.selling_price?.toString() || '',
        sku: product.sku || '',
        is_fragile: product.is_fragile || false,
        current_stock: product.current_stock || 0,
      });
      setError('');
      setSuccess('');
      setIsEditing(false);
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update variant details
      const { error: variantError } = await supabase
        .from('inventory_items_variants')
        .update({
          supplier_name: formData.supplier_name,
          packaging_type: formData.packaging_type,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
          sku: formData.sku,
          is_fragile: formData.is_fragile,
          current_stock: formData.current_stock,
        })
        .eq('id', product.id);

      if (variantError) throw variantError;

      setSuccess('Variant updated successfully!');
      setIsEditing(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error updating variant');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!product) return null;

  const isLowStock = product.current_stock <= 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Variant Details
              </h2>
              <p className="text-sm text-gray-500">
                {product.inventory_items?.name || 'Unknown Item'} - {product.sku}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors"
                title="Edit variant"
              >
                <Edit className="w-4 h-4 text-orange-600" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Item Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <p className="text-gray-900 font-medium">{product.inventory_items?.name || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <p className="text-gray-900">{product.inventory_items?.category || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900">{product.inventory_items?.description || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  SKU
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                  />
                ) : (
                  <p className="text-gray-900 font-mono">{product.sku}</p>
                )}
              </div>
            </div>

            {/* Variant Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Variant Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                ) : (
                  <p className="text-gray-900">{product.supplier_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Type
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.packaging_type}
                    onChange={(e) => setFormData({ ...formData, packaging_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                ) : (
                  <p className="text-gray-900">{product.packaging_type || 'N/A'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Cost Price
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{product.cost_price ? `$${product.cost_price.toFixed(2)}` : 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Selling Price
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{product.selling_price ? `$${product.selling_price.toFixed(2)}` : 'N/A'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fragile Item
                </label>
                {isEditing ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_fragile}
                      onChange={(e) => setFormData({ ...formData, is_fragile: e.target.checked })}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as fragile</span>
                  </label>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.is_fragile 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {product.is_fragile ? 'Yes' : 'No'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.current_stock}
                    </span>
                    {isLowStock && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Low Stock
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant ID
                </label>
                <p className="text-gray-500 font-mono text-sm">{product.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 