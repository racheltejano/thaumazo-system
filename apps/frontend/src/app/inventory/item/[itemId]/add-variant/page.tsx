'use client';

import { useState, useEffect } from 'react';
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
  
  const [variantDetails, setVariantDetails] = useState({
    sku: '',
    variantName: '',
    color: '',
    size: '',
    packagingType: '',
    isFragile: false
  });
  
  const [inventoryPricing, setInventoryPricing] = useState({
    stockQuantity: 0,
    costPrice: 0,
    sellingPrice: 0
  });
  
  const [supplierInfo, setSupplierInfo] = useState({
    supplierName: '',
    supplierEmail: '',
    supplierNumber: ''
  });

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

    if (inventoryPricing.costPrice <= 0 || inventoryPricing.sellingPrice <= 0) {
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
              // Create the variant
        const { data: insertedVariant, error: variantError } = await supabase
          .from('inventory_items_variants')
          .insert([{
            item_id: itemId,
            variant_name: variantDetails.variantName,
            supplier_name: supplierInfo.supplierName,
            supplier_email: supplierInfo.supplierEmail || null,
            supplier_number: supplierInfo.supplierNumber || null,
            packaging_type: variantDetails.packagingType || `${variantDetails.color} ${variantDetails.size}`.trim() || null,
            cost_price: inventoryPricing.costPrice,
            selling_price: inventoryPricing.sellingPrice,
            sku: variantDetails.sku,
            is_fragile: variantDetails.isFragile,
            current_stock: inventoryPricing.stockQuantity
          }])
          .select()
          .single();

      if (variantError) {
        setError(`Error creating variant: ${variantError.message}`);
        setSaving(false);
        return;
      }

      // If there's initial stock, record the movement
      if (inventoryPricing.stockQuantity > 0) {
        const { error: movementError } = await supabase
          .from('inventory_items_movements')
          .insert({
            variant_id: insertedVariant.id,
            movement_type: 'stock_in',
            quantity: inventoryPricing.stockQuantity,
            remarks: 'Initial stock'
          });

        if (movementError) {
          console.error('Error recording initial stock movement:', movementError);
        }
      }

      // Redirect back to the item details page
      router.push(`/inventory/item/${itemId}`);
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
      <div className="max-w-5xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Create New Variant</h1>
                <p className="text-gray-500 mt-1">Add a new variant for {item.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Variant Details Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Variant Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant Name *
              </label>
              <input
                type="text"
                value={variantDetails.variantName}
                onChange={(e) => setVariantDetails({ ...variantDetails, variantName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter variant name"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter color"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter size"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Box, Bag, Bottle"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={variantDetails.isFragile}
                onChange={(e) => setVariantDetails({ ...variantDetails, isFragile: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Mark as fragile item</span>
            </label>
          </div>
        </div>



        {/* Inventory Pricing Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={inventoryPricing.stockQuantity === 0 ? '' : inventoryPricing.stockQuantity}
                onChange={(e) => setInventoryPricing({ ...inventoryPricing, stockQuantity: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={inventoryPricing.costPrice === 0 ? '' : inventoryPricing.costPrice}
                onChange={(e) => setInventoryPricing({ ...inventoryPricing, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={inventoryPricing.sellingPrice === 0 ? '' : inventoryPricing.sellingPrice}
                onChange={(e) => setInventoryPricing({ ...inventoryPricing, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Supplier Information Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name *
              </label>
              <input
                type="text"
                value={supplierInfo.supplierName}
                onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter supplier name"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter supplier email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Number
              </label>
              <input
                type="tel"
                value={supplierInfo.supplierNumber}
                onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter supplier phone number"
              />
            </div>
          </div>
        </div>

        {/* Stock Keeping Unit Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Stock Keeping Unit</h2>
            <div className="relative group">
              <HelpCircle className="w-5 h-5 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="text-xs">
                  <p className="font-medium mb-1">SKU Guidelines:</p>
                  <p>• Use a unique identifier for this variant</p>
                  <p>• Example: ITEM-COLOR-SIZE</p>
                  <p>• Keep it short and memorable</p>
                  <p>• Avoid special characters except hyphens</p>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Keeping Unit *
                </label>
                <input
                  type="text"
                  value={variantDetails.sku}
                  onChange={(e) => setVariantDetails({ ...variantDetails, sku: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., TSHIRT-BLUE-MED-ABC-1234"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateSku}
                className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate SKU
              </button>
            </div>
          </div>

          {/* SKU Info */}
          <div className="text-xs text-gray-500">
            <p>• SKU will include: Item name, variant details, supplier, and unique timestamp</p>
            <p>• Format: ITEM-VARIANT-COLOR-SIZE-SUPPLIER-TIMESTAMP</p>
            <p>• Example: TSHIRT-BLUE-MED-ABC-1234</p>
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
            onClick={handleCreateVariant}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create Variant'}
          </button>
        </div>
      </div>
    </div>
  );
} 