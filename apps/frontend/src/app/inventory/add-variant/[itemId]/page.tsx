'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem, NewInventoryVariant } from '@/types/inventory.types';
import { ArrowLeft, Save, HelpCircle } from 'lucide-react';

export default function AddVariantPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const [variantDetails, setVariantDetails] = useState({
    sku: '',
    variantName: '',
    color: '',
    size: '',
    packagingType: '',
    isFragile: false
  });
  
  const [inventoryPricing, setInventoryPricing] = useState({
    stockQuantity: '',
    costPrice: '',
    sellingPrice: ''
  });
  
  const [supplierInfo, setSupplierInfo] = useState({
    supplierName: '',
    supplierEmail: '',
    supplierNumber: ''
  });

  // Success message states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [createdVariantId, setCreatedVariantId] = useState<string | null>(null);
  const [formDisabled, setFormDisabled] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);

  // Validation function
  const isFormValid = () => {
    return (
      variantDetails.variantName.trim() !== '' &&
      variantDetails.sku.trim() !== '' &&
      inventoryPricing.costPrice.trim() !== '' &&
      parseFloat(inventoryPricing.costPrice) > 0 &&
      inventoryPricing.sellingPrice.trim() !== '' &&
      parseFloat(inventoryPricing.sellingPrice) > 0 &&
      supplierInfo.supplierName.trim() !== ''
    );
  };

  // Function to generate a unique SKU
  const generateUniqueSku = () => {
    const parts = [];
    
    // Get item name (first 6 characters, clean and uppercase)
    const itemName = item?.name || '';
    const itemPrefix = itemName.replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
    if (itemPrefix) parts.push(itemPrefix);
    
    // Get variant name (first 4 characters)
    const variantName = variantDetails.variantName.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
    if (variantName) parts.push(variantName);
    
    // Get color (first 4 characters)
    const color = variantDetails.color.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
    if (color) parts.push(color);
    
    // Get size (first 3 characters)
    const size = variantDetails.size.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
    if (size) parts.push(size);
    
    // Get supplier (first 4 characters)
    const supplier = supplierInfo.supplierName.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
    if (supplier) parts.push(supplier);
    
    // Add timestamp for uniqueness (last 4 digits of current timestamp)
    const timestamp = Date.now().toString().slice(-4);
    parts.push(timestamp);
    
    // Combine all parts with hyphens
    const generatedSku = parts.join('-');
    
    return generatedSku;
  };

  // Function to handle SKU generation
  const handleGenerateSku = () => {
    const newSku = generateUniqueSku();
    setVariantDetails({ ...variantDetails, sku: newSku });
  };

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

  useEffect(() => {
    if (showSuccessMessage) {
      setFormDisabled(true);
      setTimeout(() => {
        successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // allow popup to render
    } else {
      setFormDisabled(false);
    }
  }, [showSuccessMessage]);

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
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVariant = async () => {
    if (!variantDetails.sku.trim() || !variantDetails.variantName.trim()) {
      setError('SKU and Variant Name are required');
      return;
    }

    const costPrice = parseFloat(inventoryPricing.costPrice);
    const sellingPrice = parseFloat(inventoryPricing.sellingPrice);
    
    if (isNaN(costPrice) || costPrice <= 0 || isNaN(sellingPrice) || sellingPrice <= 0) {
      setError('Cost Price and Selling Price must be greater than 0');
      return;
    }

    if (!supplierInfo.supplierName.trim()) {
      setError('Supplier Name is required');
      return;
    }

    setSaving(true);
    setError('');

        try {
      const stockQuantity = parseInt(inventoryPricing.stockQuantity) || 0;
      
      // Create the variant
      const { data: insertedVariant, error: variantError } = await supabase
        .from('inventory_items_variants')
        .insert([{
          item_id: itemId,
          variant_name: variantDetails.variantName,
          supplier_name: supplierInfo.supplierName,
          supplier_email: supplierInfo.supplierEmail || null,
          supplier_number: supplierInfo.supplierNumber || null,
          packaging_type: variantDetails.packagingType || null,
          cost_price: costPrice,
          selling_price: sellingPrice,
          sku: variantDetails.sku,
          is_fragile: variantDetails.isFragile,
          current_stock: stockQuantity,
          color: variantDetails.color || null,
          size: variantDetails.size || null
        }])
        .select()
        .single();

      if (variantError) {
        setError(`Error creating variant: ${variantError.message}`);
        setSaving(false);
        return;
      }

      // If there's initial stock, record the movement
      if (stockQuantity > 0) {
      const { error: movementError } = await supabase
        .from('inventory_items_movements')
        .insert({
          variant_id: insertedVariant.id,
          movement_type: 'stock_in',
          quantity: stockQuantity,
          old_stock: 0,
          new_stock: stockQuantity,
          price_at_movement: costPrice,
          reference_type: 'initial_stock',
          remarks: 'Initial stock'
        });

        if (movementError) {
          console.error('Error recording initial stock movement:', movementError);
        }
      }

      // Show success message instead of redirecting
      setCreatedVariantId(insertedVariant.id);
      setShowSuccessMessage(true);
      setSaving(false);
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
                onClick={() => router.push(`/inventory/item/${itemId}`)}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add New Variant</h1>
                <div className="flex items-center gap-4 mt-1 text-gray-600">
                  <span>{item.name}</span>
                  <span>•</span>
                  <span>{item.inventory_items_categories?.name || 'No category'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && createdVariantId && (
          <div ref={successRef} className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowSuccessMessage(false);
                setCreatedVariantId(null);
              }}
              className="absolute top-4 right-4 p-1 text-green-600 hover:text-green-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-green-800">Variant Created Successfully!</h3>
              </div>
              <p className="text-green-700 mb-4">
                Your "{variantDetails.variantName}" has been added to "{item?.name}". You can now{' '}
                <a 
                  href={`/inventory/item/${itemId}`}
                  className="text-green-800 underline hover:text-green-900 font-medium"
                >
                  You can now view the item
                </a>
                {' '}or{' '}
                <button
                  onClick={() => {
                    setShowSuccessMessage(false);
                    setCreatedVariantId(null);
                    setFormDisabled(false);
                    // Reset only specific fields while keeping others
                    setVariantDetails({
                      ...variantDetails,
                      variantName: '',
                      sku: ''
                    });
                    setInventoryPricing({
                      ...inventoryPricing,
                      stockQuantity: ''
                    });
                  }}
                  className="text-green-800 underline hover:text-green-900 font-medium hover:no-underline"
                >
                  continue adding more variants
                </button>
                .
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Variant Details</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Variant Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant Name {variantDetails.variantName.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={variantDetails.variantName}
                  onChange={(e) => setVariantDetails({ ...variantDetails, variantName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Red, Large, Premium"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={variantDetails.color}
                  onChange={(e) => setVariantDetails({ ...variantDetails, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Red, Blue, Green"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <input
                  type="text"
                  value={variantDetails.size}
                  onChange={(e) => setVariantDetails({ ...variantDetails, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Small, Medium, Large"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Type
                </label>
                <input
                  type="text"
                  value={variantDetails.packagingType}
                  onChange={(e) => setVariantDetails({ ...variantDetails, packagingType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Box, Bag, Container"
                  disabled={formDisabled}
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={variantDetails.isFragile}
                    onChange={(e) => setVariantDetails({ ...variantDetails, isFragile: e.target.checked })}
                    className="mr-2"
                    disabled={formDisabled}
                  />
                  <span className="text-sm font-medium text-gray-700">Fragile Item</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Pricing Section */}
        <div className="bg-white rounded-lg shadow-md border mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Inventory & Pricing</h2>
              <div className="text-right">
                {inventoryPricing.costPrice && inventoryPricing.sellingPrice && parseFloat(inventoryPricing.costPrice) > 0 && parseFloat(inventoryPricing.sellingPrice) > 0 ? (
                  <div className={`text-lg font-semibold ${parseFloat(inventoryPricing.sellingPrice) > parseFloat(inventoryPricing.costPrice) ? 'text-green-600' : 'text-red-600'}`}>
                    ₱{(parseFloat(inventoryPricing.sellingPrice) - parseFloat(inventoryPricing.costPrice)).toFixed(2)} 
                    ({(((parseFloat(inventoryPricing.sellingPrice) - parseFloat(inventoryPricing.costPrice)) / parseFloat(inventoryPricing.costPrice)) * 100).toFixed(1)}%)
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Enter prices to see margin</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  value={inventoryPricing.stockQuantity}
                  onChange={(e) => setInventoryPricing({ ...inventoryPricing, stockQuantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Price (₱) {inventoryPricing.costPrice.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  value={inventoryPricing.costPrice}
                  onChange={(e) => setInventoryPricing({ ...inventoryPricing, costPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price (₱) {inventoryPricing.sellingPrice.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  value={inventoryPricing.sellingPrice}
                  onChange={(e) => setInventoryPricing({ ...inventoryPricing, sellingPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={formDisabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Information Section */}
        <div className="bg-white rounded-lg shadow-md border mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Supplier Information</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name {supplierInfo.supplierName.trim() === '' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={supplierInfo.supplierName}
                  onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Supplier name"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Email
                </label>
                <input
                  type="email"
                  value={supplierInfo.supplierEmail}
                  onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="supplier@example.com"
                  disabled={formDisabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Phone Number
                </label>
                <input
                  type="tel"
                  value={supplierInfo.supplierNumber}
                  onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+63 912 345 6789"
                  disabled={formDisabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SKU Section */}
        <div className="bg-white rounded-lg shadow-md border mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">SKU Configuration</h2>
          </div>
          
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU {variantDetails.sku.trim() === '' && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={variantDetails.sku}
                  onChange={(e) => setVariantDetails({ ...variantDetails, sku: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., RED-LARGE-001"
                  disabled={formDisabled}
                />
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  disabled={formDisabled}
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
        <div className="mt-8 flex justify-end gap-4">
          {showSuccessMessage ? (
            <>
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setCreatedVariantId(null);
                  setFormDisabled(false);
                  // Reset only specific fields while keeping others
                  setVariantDetails({
                    ...variantDetails,
                    variantName: '',
                    sku: ''
                  });
                  setInventoryPricing({
                    ...inventoryPricing,
                    stockQuantity: ''
                  });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 transition-all duration-200"
              >
                Add Another Variant
              </button>
              <button
                onClick={() => router.push(`/inventory/item/${itemId}`)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                View Item
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/inventory/item/${itemId}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVariant}
                disabled={saving || !isFormValid()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                  saving || !isFormValid()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Creating...' : 'Create Variant'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 