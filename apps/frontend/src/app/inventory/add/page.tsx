'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NewInventoryItem, NewInventoryVariant } from '@/types/inventory.types';
import { Plus, Trash2, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import CategorySelector from '@/components/inventory/CategorySelector';

export default function AddInventoryPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [newItem, setNewItem] = useState<NewInventoryItem>({ 
    name: '', 
    category_id: null, 
    description: '' 
  });
  const [variants, setVariants] = useState<NewInventoryVariant[]>([{
    item_id: '',
    supplier_name: '',
    packaging_type: '',
    cost_price: 0,
    selling_price: 0,
    sku: '',
    is_fragile: false
  }]);
  const [initialStocks, setInitialStocks] = useState<number[]>([0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showVariantWarning, setShowVariantWarning] = useState(false);

  const addVariant = () => {
    setVariants([...variants, {
      item_id: '',
      supplier_name: '',
      packaging_type: '',
      cost_price: 0,
      selling_price: 0,
      sku: '',
      is_fragile: false
    }]);
    setInitialStocks([...initialStocks, 0]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      const newVariants = variants.filter((_, i) => i !== index);
      const newStocks = initialStocks.filter((_, i) => i !== index);
      setVariants(newVariants);
      setInitialStocks(newStocks);
    }
  };

  const updateVariant = (index: number, field: keyof NewInventoryVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const updateInitialStock = (index: number, value: number) => {
    const newStocks = [...initialStocks];
    newStocks[index] = value;
    setInitialStocks(newStocks);
  };

  const hasValidVariants = () => {
    return variants.some(variant => 
      variant.supplier_name.trim() !== '' && 
      variant.sku.trim() !== '' && 
      variant.cost_price > 0 && 
      variant.selling_price > 0
    );
  };

  const hasIncompleteVariants = () => {
    return variants.some(variant => 
      (variant.supplier_name.trim() !== '' || 
       variant.sku.trim() !== '' || 
       variant.cost_price > 0 || 
       variant.selling_price > 0) &&
      !(variant.supplier_name.trim() !== '' && 
        variant.sku.trim() !== '' && 
        variant.cost_price > 0 && 
        variant.selling_price > 0)
    );
  };

  const handleCreateItem = async (createWithVariants: boolean = false) => {
    if (newItem.name.trim() === '') {
      setMessage('Please provide a valid name for the new item.');
      return;
    }

    if (createWithVariants && !hasValidVariants()) {
      setMessage('Please provide valid details for at least one variant.');
      return;
    }

    if (!createWithVariants && hasIncompleteVariants()) {
      setShowVariantWarning(true);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create the item first
      const { data: insertedItem, error } = await supabase
        .from('inventory_items')
        .insert([{
          name: newItem.name,
          category_id: newItem.category_id,
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

      // If creating with variants, process them
      if (createWithVariants && hasValidVariants()) {
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          if (variant.supplier_name.trim() !== '' && 
              variant.sku.trim() !== '' && 
              variant.cost_price > 0 && 
              variant.selling_price > 0) {
            
            // Create the variant
            const { data: insertedVariant, error: variantError } = await supabase
              .from('inventory_items_variants')
              .insert([{
                item_id: insertedItem.id,
                supplier_name: variant.supplier_name,
                packaging_type: variant.packaging_type,
                cost_price: variant.cost_price,
                selling_price: variant.selling_price,
                sku: variant.sku,
                is_fragile: variant.is_fragile,
                current_stock: initialStocks[i] || 0
              }])
              .select()
              .single();

            if (variantError) {
              console.error('Error creating variant:', variantError);
              continue;
            }

            // Record initial stock movement if any
            if (initialStocks[i] > 0) {
              await supabase
                .from('inventory_items_movements')
                .insert({
                  variant_id: insertedVariant.id,
                  movement_type: 'stock_in',
                  quantity: initialStocks[i],
                  remarks: 'Initial stock'
                });
            }
          }
        }
      }

      setMessage('✅ Item created successfully!');
      setNewItem({ name: '', category_id: null, description: '' });
      setVariants([{
        item_id: '',
        supplier_name: '',
        packaging_type: '',
        cost_price: 0,
        selling_price: 0,
        sku: '',
        is_fragile: false
      }]);
      setInitialStocks([0]);
      
      // Redirect to the items table after a short delay
      setTimeout(() => {
        router.push('/inventory/table');
      }, 1500);
      
      setLoading(false);
    } catch (err) {
      setMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleCreateItemOnly = () => {
    setShowVariantWarning(false);
    handleCreateItem(false);
  };

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
              onClick={() => router.push('/inventory/dashboard')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create New Item</h1>
          </div>
          <p className="text-gray-600 ml-14">Add a new item to your inventory</p>
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

      {/* Basic Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Item Name {newItem.name.trim() === '' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
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
                value={newItem.category_id}
                onChange={(category_id) => setNewItem({ ...newItem, category_id })}
                placeholder="Select or create category"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter item description"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="bg-[#f2f8ff] p-6 rounded-lg shadow-md border mb-6">
        <h3 className="text-base font-bold text-blue-500 mb-3">Next Steps</h3>
        <p className="text-sm text-blue-500 leading-relaxed">
          After creating this item, you'll be redirected to the inventory item page where you would be able to add variants with specific details like stock quantities, supplier information, cost prices, and selling prices. Each variant can represent different sizes, colors, or configurations of this item.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/inventory/dashboard')}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-800 font-medium rounded-lg transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => handleCreateItem(false)}
          disabled={loading || !newItem.name.trim()}
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Creating...' : 'Create Item'}
        </button>
      </div>

      {/* Variant Warning Modal */}
      {showVariantWarning && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Incomplete Variant Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                You have started filling in variant details but they are incomplete.
              </p>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Creating this item without complete variant details will result in the loss of the partial variant information you've entered.
              </p>
              <p className="text-gray-700 mb-6">
                Would you like to continue creating just the item, or would you prefer to complete the variant details first?
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCreateItemOnly}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Create Item Only
              </button>
              <button
                onClick={() => setShowVariantWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
} 