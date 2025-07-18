'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product, NewProduct } from '@/types/inventory.types';
import { NewProductForm } from '@/components/inventory/NewProductForm';

export default function AddInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProduct, setNewProduct] = useState<NewProduct>({ 
    name: '', 
    weight: '', 
    volume: '', 
    is_fragile: false 
  });
  const [quantity, setQuantity] = useState(1);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      setMessage('Error loading products');
    } else {
      setProducts(data || []);
    }
  };

  const handleCreateProduct = async () => {
    if (
      newProduct.name.trim() === '' ||
      newProduct.weight.trim() === '' ||
      newProduct.volume.trim() === '' ||
      isNaN(Number(newProduct.weight)) ||
      isNaN(Number(newProduct.volume))
    ) {
      setMessage('Please provide valid name, weight, and volume for the new product.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { data: insertedProduct, error } = await supabase
      .from('products')
      .insert([{
        name: newProduct.name,
        weight: newProduct.weight,
        volume: newProduct.volume,
        is_fragile: newProduct.is_fragile
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      setMessage(`Error adding product: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage('✅ Product created successfully!');
    setNewProduct({ name: '', weight: '', volume: '', is_fragile: false });
    setShowNewProductForm(false);
    setSelectedProductId(insertedProduct.id);
    await fetchProducts();
    setLoading(false);
  };

  const handleAddInventory = async () => {
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setMessage('Latitude and Longitude must be valid numbers.');
      return;
    }

    if (latitude.trim() === '' || longitude.trim() === '') {
      setMessage('Latitude and Longitude cannot be empty.');
      return;
    }

    if (!selectedProductId) {
      setMessage('Please select a product.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { data: existingInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', selectedProductId)
      .eq('latitude', parsedLat)
      .eq('longitude', parsedLng)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      setMessage('Error checking existing inventory');
      setLoading(false);
      return;
    }

    if (existingInventory) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: existingInventory.quantity + quantity })
        .eq('id', existingInventory.id);

      if (updateError) {
        setMessage('Error updating inventory quantity');
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('inventory').insert([
        {
          product_id: selectedProductId,
          quantity,
          latitude: parsedLat,
          longitude: parsedLng,
        },
      ]);

      if (insertError) {
        setMessage('Error adding inventory');
        setLoading(false);
        return;
      }
    }

    setMessage('✅ Inventory added successfully!');
    setQuantity(1);
    setLatitude('');
    setLongitude('');
    setSelectedProductId('');
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Inventory</h1>
        <p className="text-gray-600">Manage your warehouse inventory and create new products.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create New Product Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Product</h2>
          
          {!showNewProductForm ? (
            <button
              onClick={() => setShowNewProductForm(true)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              ➕ Create New Product
            </button>
          ) : (
            <div className="space-y-4">
              <NewProductForm 
                newProduct={newProduct} 
                setNewProduct={setNewProduct} 
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateProduct}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Product'}
                </button>
                <button
                  onClick={() => {
                    setShowNewProductForm(false);
                    setNewProduct({ name: '', weight: '', volume: '', is_fragile: false });
                  }}
                  className="flex-1 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Inventory Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Inventory</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="text"
                placeholder="e.g., 14.5995"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="text"
                placeholder="e.g., 120.9842"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleAddInventory}
              disabled={loading || !selectedProductId}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Inventory'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/inventory/table')}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          ← Back to Inventory Table
        </button>
      </div>
    </div>
  );
} 