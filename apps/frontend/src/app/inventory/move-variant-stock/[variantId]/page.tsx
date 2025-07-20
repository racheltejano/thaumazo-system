'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItemVariant } from '@/types/inventory.types';
import { 
  ArrowLeft, 
  Save, 
  Package, 
  TrendingUp,
  TrendingDown,
  Truck, 
  AlertTriangle,
  Calendar,
  User
} from 'lucide-react';

type MovementType = 'stock_in' | 'stock_out';
type ReferenceType = 'purchase_order' | 'sales_order' | 'return' | 'adjustment' | 'transfer' | 'damage' | 'expiry' | 'other';

export default function MoveVariantStockPage() {
  const params = useParams();
  const router = useRouter();
  const variantId = params.variantId as string;
  
  const [variant, setVariant] = useState<InventoryItemVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    movement_type: 'stock_in' as MovementType,
    quantity: '',
    reference_type: '' as ReferenceType,
    reference_id: '',
    remarks: ''
  });

  const movementTypes: { value: MovementType; label: string; icon: React.ReactNode }[] = [
    { value: 'stock_in', label: 'Stock In', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'stock_out', label: 'Stock Out', icon: <TrendingDown className="w-4 h-4" /> }
  ];

  const referenceTypes: { value: ReferenceType; label: string }[] = [
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'sales_order', label: 'Sales Order' },
    { value: 'return', label: 'Return' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'damage', label: 'Damage' },
    { value: 'expiry', label: 'Expiry' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (variantId) {
      fetchVariant();
    }
  }, [variantId]);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const fetchVariant = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('inventory_items_variants')
        .select(`
          *,
          inventory_items (
            id,
            name,
            category_id,
            description,
            created_at,
            inventory_items_categories (
              id,
              name,
              description
            )
          )
        `)
        .eq('id', variantId)
        .single();

      if (error) {
        setError('Error loading variant details');
        setLoading(false);
        return;
      }

      setVariant(data);

    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setError('Please enter a valid quantity');
      setSaving(false);
      return;
    }

    if (formData.movement_type === 'stock_out' && parseInt(formData.quantity) > (variant?.current_stock || 0)) {
      setError('Cannot remove more stock than available');
      setSaving(false);
      return;
    }

    try {
      const quantity = parseInt(formData.quantity);
      const newStock = formData.movement_type === 'stock_in' 
        ? (variant?.current_stock || 0) + quantity
        : (variant?.current_stock || 0) - quantity;

      // Create movement record
      const { error: movementError } = await supabase
        .from('inventory_items_movements')
        .insert({
          variant_id: variantId,
          movement_type: formData.movement_type,
          quantity: quantity,
          reference_type: formData.reference_type || null,
          reference_id: formData.reference_id || null,
          remarks: formData.remarks || null,
          created_at: new Date().toISOString()
        });

      if (movementError) {
        setError('Error creating movement record');
        setSaving(false);
        return;
      }

      // Update variant stock
      const { error: updateError } = await supabase
        .from('inventory_items_variants')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', variantId);

      if (updateError) {
        setError('Error updating stock');
        setSaving(false);
        return;
      }

      // Navigate back to the item details page
      router.push(`/inventory/item/${variant?.inventory_items?.id}`);
      
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Loading variant details...</div>
        </div>
      </div>
    );
  }

  if (error && !variant) {
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

  if (!variant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Variant not found</div>
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
        className={`w-full transition-all duration-700 ease-out ${
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
                onClick={() => router.push(`/inventory/item/${variant.inventory_items?.id}`)}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Move Stock</h1>
                <div className="flex items-center gap-4 mt-1 text-gray-600">
                  <span>{variant.inventory_items?.name}</span>
                  <span>•</span>
                  <span>{variant.inventory_items?.inventory_items_categories?.name || 'No category'}</span>
                  <span>•</span>
                  <span>{variant.variant_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Processing...' : 'Move Stock'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Current Stock Info */}
        <div className="bg-white rounded-lg shadow-md border mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6" />
              Current Stock Information
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{variant.current_stock}</div>
                <div className="text-sm text-blue-600">Current Stock</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  ₱{variant.cost_price?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
                <div className="text-sm text-green-600">Cost Price</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  ₱{variant.selling_price?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
                <div className="text-sm text-yellow-600">Selling Price</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Movement Type */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Movement Type
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {movementTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.movement_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="movement_type"
                      value={type.value}
                      checked={formData.movement_type === type.value}
                      onChange={(e) => handleInputChange('movement_type', e.target.value as MovementType)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <span className="font-medium">{type.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Quantity
              </h2>
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                  required
                />
                {formData.movement_type === 'stock_out' && variant.current_stock > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Available stock: {variant.current_stock}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reference Information */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Reference Information
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Type
                  </label>
                  <select
                    value={formData.reference_type}
                    onChange={(e) => handleInputChange('reference_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select reference type</option>
                    {referenceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference ID
                  </label>
                  <input
                    type="text"
                    value={formData.reference_id}
                    onChange={(e) => handleInputChange('reference_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., PO-001, SO-123"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-6 h-6" />
                Additional Information
              </h2>
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any additional notes about this movement..."
                />
              </div>
            </div>
          </div>
        </form>

        {/* Low Stock Warning */}
        {variant.current_stock <= 3 && variant.current_stock > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">Low Stock Warning</span>
            </div>
            <p className="text-red-600 mt-1">This variant is running low on stock. Consider adding more inventory.</p>
          </div>
        )}
      </div>
    </div>
  );
} 