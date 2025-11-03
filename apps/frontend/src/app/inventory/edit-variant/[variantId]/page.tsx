'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItemVariant } from '@/types/inventory.types';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Save, 
  Package, 
  Tag, 
  DollarSign, 
  Truck, 
  User,
  Mail,
  Phone,
  AlertTriangle,
  Trash2,
  X,
  ChevronDown
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
}

export default function EditVariantPage() {
  const params = useParams();
  const router = useRouter();
  const variantId = params.variantId as string;
  
  const [variant, setVariant] = useState<InventoryItemVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(10);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Supplier states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isCreatingNewSupplier, setIsCreatingNewSupplier] = useState(false);

  // Dynamic back navigation
  const handleBackNavigation = () => {
    const referrer = sessionStorage.getItem('editVariantReferrer');
    
    if (referrer) {
      sessionStorage.removeItem('editVariantReferrer');
      router.push(referrer);
    } else {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(`/inventory/item/${variant?.inventory_items?.id}`);
      }
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    variant_name: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    packaging_type: '',
    is_fragile: false,
    supplier_name: '',
    supplier_email: '',
    supplier_number: '',
    color: '',
    size: ''
  });

  useEffect(() => {
    if (variantId) {
      fetchVariant();
      fetchSuppliers();
    }
  }, [variantId]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_suppliers')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
        return;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

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
      
      // Populate form with existing data
      setFormData({
        variant_name: data.variant_name || '',
        sku: data.sku || '',
        cost_price: data.cost_price?.toString() || '',
        selling_price: data.selling_price?.toString() || '',
        current_stock: data.current_stock?.toString() || '',
        packaging_type: data.packaging_type || '',
        is_fragile: data.is_fragile || false,
        supplier_name: data.supplier_name || '',
        supplier_email: data.supplier_email || '',
        supplier_number: data.supplier_number || '',
        color: data.color || '',
        size: data.size || ''
      });

      // Set selected supplier if exists
      if (data.supplier_id) {
        setSelectedSupplierId(data.supplier_id);
        setIsCreatingNewSupplier(false);
      } else {
        setIsCreatingNewSupplier(true);
      }

    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSupplierChange = (supplierId: string) => {
    if (supplierId === 'new') {
      setIsCreatingNewSupplier(true);
      setSelectedSupplierId('');
      setFormData(prev => ({
        ...prev,
        supplier_name: '',
        supplier_email: '',
        supplier_number: ''
      }));
    } else {
      setIsCreatingNewSupplier(false);
      setSelectedSupplierId(supplierId);
      
      // Auto-fill supplier details
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        setFormData(prev => ({
          ...prev,
          supplier_name: supplier.name,
          supplier_email: supplier.email || '',
          supplier_number: supplier.phone_number || ''
        }));
      }
    }
    setHasChanges(true);
  };

  const getOrCreateSupplier = async () => {
    try {
      // If using existing supplier, return its ID
      if (!isCreatingNewSupplier && selectedSupplierId) {
        return selectedSupplierId;
      }

      // Check if supplier exists by name
      const { data: existingSupplier, error: searchError } = await supabase
        .from('inventory_suppliers')
        .select('*')
        .eq('name', formData.supplier_name.trim())
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingSupplier) {
        return existingSupplier.id;
      }

      // Create new supplier
      const { data: newSupplier, error: insertError } = await supabase
        .from('inventory_suppliers')
        .insert({
          name: formData.supplier_name.trim(),
          email: formData.supplier_email.trim() || null,
          phone_number: formData.supplier_number.trim() || null
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return newSupplier.id;
    } catch (err) {
      console.error('Error in getOrCreateSupplier:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Get or create supplier
      const supplierId = await getOrCreateSupplier();

      const updateData = {
        variant_name: formData.variant_name,
        sku: formData.sku,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        current_stock: formData.current_stock ? parseInt(formData.current_stock) : 0,
        packaging_type: formData.packaging_type,
        is_fragile: formData.is_fragile,
        // Keep old supplier fields for backward compatibility
        supplier_name: formData.supplier_name,
        supplier_email: formData.supplier_email,
        supplier_number: formData.supplier_number,
        // New supplier foreign key
        supplier_id: supplierId,
        color: formData.color,
        size: formData.size,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('inventory_items_variants')
        .update(updateData)
        .eq('id', variantId);

      if (error) {
        setError(error.message || 'Error updating variant');
        setSaving(false);
        return;
      }

      router.push(`/inventory/item/${variant?.inventory_items?.id}`);
      
    } catch (err) {
      console.error('Error updating variant:', err);
      setError('An unexpected error occurred');
      setSaving(false);
    }
  };

  const generateSKU = () => {
    if (!variant?.inventory_items?.name) return;
    
    const itemName = variant.inventory_items.name;
    const prefix = itemName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const sku = `${prefix}-${timestamp}`;
    
    setFormData(prev => ({
      ...prev,
      sku: sku
    }));
    setHasChanges(true);
  };

  const handleDeleteVariant = async () => {
    setDeleting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('inventory_items_variants')
        .delete()
        .eq('id', variantId);

      if (error) {
        setError(`Error deleting variant: ${error.message}`);
        setDeleting(false);
        return;
      }

      router.push(`/inventory/item/${variant?.inventory_items?.id}`);
      
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
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
        className={`max-w-4xl mx-auto transition-all duration-700 ease-out ${
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
                onClick={handleBackNavigation}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Variant</h1>
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
                onClick={handleShowDeleteConfirm}
                disabled={deleting}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete Variant'}
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Basic Information
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.variant_name}
                    onChange={(e) => handleInputChange('variant_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging Type
                  </label>
                  <input
                    type="text"
                    value={formData.packaging_type}
                    onChange={(e) => handleInputChange('packaging_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Box, Bottle, Bag"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Red, Blue, Black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => handleInputChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Small, Medium, Large"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fragile Item
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_fragile}
                      onChange={(e) => handleInputChange('is_fragile', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as fragile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="w-6 h-6" />
                Pricing Information
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Price (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange('cost_price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange('selling_price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.current_stock}
                    onChange={(e) => handleInputChange('current_stock', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Supplier Information
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Supplier Selection Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Supplier
                  </label>
                  <div className="relative">
                    <select
                      value={isCreatingNewSupplier ? 'new' : selectedSupplierId}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="new">+ Create New Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Supplier Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Name {isCreatingNewSupplier && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_name}
                      onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                      disabled={!isCreatingNewSupplier}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !isCreatingNewSupplier ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Supplier company name"
                      required={isCreatingNewSupplier}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={formData.supplier_email}
                      onChange={(e) => handleInputChange('supplier_email', e.target.value)}
                      disabled={!isCreatingNewSupplier}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !isCreatingNewSupplier ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="supplier@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.supplier_number}
                      onChange={(e) => handleInputChange('supplier_number', e.target.value)}
                      disabled={!isCreatingNewSupplier}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !isCreatingNewSupplier ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                </div>

                {!isCreatingNewSupplier && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      ℹ️ Using existing supplier. Select "Create New Supplier" to add a different one.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SKU Configuration */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">SKU Configuration</h2>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU {formData.sku.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., RED-LARGE-001"
                  />
                  <button
                    type="button"
                    onClick={generateSKU}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  SKU will be auto-generated based on variant details, or you can enter a custom SKU.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push(`/inventory/item/${variant?.inventory_items?.id}`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                saving || !hasChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

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
                <h3 className="text-lg font-semibold text-gray-900">Delete Variant</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{variant?.variant_name}"? This action cannot be undone.
                <span className="block mt-2 text-red-600 font-medium">
                  ⚠️ {variant?.current_stock && variant.current_stock > 0 
                    ? `This variant has ${variant.current_stock} units in stock. ` 
                    : ''
                  }Deleting this variant will remove all inventory movements record related to this variant.
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
                  onClick={handleDeleteVariant}
                  disabled={deleting || deleteCountdown > 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Variant'}
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