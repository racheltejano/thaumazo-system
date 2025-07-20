'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryItem, InventoryItemVariant, InventoryMovement } from '@/types/inventory.types';
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  Tag, 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  Box,
  User,
  Mail,
  Phone
} from 'lucide-react';
import MovementsList from '@/components/inventory/MovementsList';

export default function ItemVariantPage() {
  const params = useParams();
  const router = useRouter();
  const variantId = params.variantId as string;
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [variant, setVariant] = useState<InventoryItemVariant | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (variantId) {
      fetchData();
    }
  }, [variantId]);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch variant details with item information
      const { data: variantData, error: variantError } = await supabase
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

      if (variantError) {
        setError('Error loading variant details');
        setLoading(false);
        return;
      }

      setVariant(variantData);
      setItem(variantData.inventory_items);

      // Fetch recent movements for this variant
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_items_movements')
        .select('*')
        .eq('variant_id', variantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (movementsError) {
        console.error('Error loading movements:', movementsError);
      } else {
        setMovements(movementsData || []);
      }

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
          <div className="text-gray-500 text-lg">Loading variant details...</div>
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
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!item || !variant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Variant not found</div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const margin = (variant.selling_price || 0) - (variant.cost_price || 0);
  const marginPercentage = variant.cost_price ? (margin / variant.cost_price) * 100 : 0;

  // Dynamic back button handler
  const handleBackNavigation = () => {
    // Check if we have a stored referrer from activity logs
    const lastActivityLogsPage = sessionStorage.getItem('lastActivityLogsPage');
    
    if (lastActivityLogsPage) {
      // Clear the stored referrer and navigate back
      sessionStorage.removeItem('lastActivityLogsPage');
      router.push(lastActivityLogsPage);
    } else if (window.history.length > 1) {
      // Check if we can go back in history
      router.back();
    } else {
      // Fallback to item page
      router.push(`/inventory/item/${item.id}`);
    }
  };

  return (
    <div className="p-6">
      <div 
        className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${
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
                <h1 className="text-3xl font-bold text-gray-900">{variant.variant_name}</h1>
                <div className="flex items-center gap-4 mt-1 text-gray-600">
                  <span>{item.name}</span>
                  <span>•</span>
                  <span>{item.inventory_items_categories?.name || 'No category'}</span>
                  <span>•</span>
                  <span>Created {new Date(variant.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/inventory/edit-variant/${variant.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Variant
              </button>
            </div>
          </div>
        </div>

        {/* Variant Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Stock</p>
                <p className={`text-2xl font-bold ${variant.current_stock <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                  {variant.current_stock}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{variant.cost_price?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Tag className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selling Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{variant.selling_price?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Margin</p>
                <p className={`text-2xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₱{margin.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({marginPercentage.toFixed(1)}%)
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Variant Details */}
        <div className="bg-white rounded-lg shadow-md border mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Variant Details
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="text-gray-600 mr-3">Variant Name:</span>
                    <span className="font-medium">{variant.variant_name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 mr-3">SKU:</span>
                    <span className="font-mono font-medium">{variant.sku}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 mr-3">Packaging Type:</span>
                    <span className="font-medium">{variant.packaging_type || 'not set'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 mr-3">Fragile:</span>
                    <span className={`font-medium ${variant.is_fragile ? 'text-red-600' : 'text-green-600'}`}>
                      {variant.is_fragile ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{variant.supplier_name || 'not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{variant.supplier_email || 'not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{variant.supplier_number || 'not set'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Actions */}
        <div className="bg-white rounded-lg shadow-md border mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Box className="w-6 h-6" />
                Stock Management
              </h2>
              <button
                onClick={() => router.push(`/inventory/move-variant-stock/${variant.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Box className="w-4 h-4" />
                Move Stock
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{variant.current_stock}</div>
                <div className="text-sm text-blue-600">Current Stock</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {movements.filter(m => m.movement_type === 'stock_in').reduce((sum, m) => sum + m.quantity, 0)}
                </div>
                <div className="text-sm text-green-600">Total Stock In</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">
                  {movements.filter(m => m.movement_type === 'stock_out').reduce((sum, m) => sum + m.quantity, 0)}
                </div>
                <div className="text-sm text-red-600">Total Stock Out</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Movements */}
        <MovementsList movements={movements} title="Recent Activity" />

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