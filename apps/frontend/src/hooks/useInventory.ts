import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { InventoryItem, Product } from  '@/types/inventory.types';
import { useAuth } from '@/lib/AuthContext';

export const useInventory = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const auth = useAuth();

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dashboard')
        return
      }

      setUser(user)

      // Check role using AuthContext
      if (!auth || auth.loading) {
        return
      }

      if (!auth.role) {
        router.push('/dashboard')
        return
      }

      if (auth.role !== 'inventory_staff' && auth.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await fetchInventoryAndProducts()
      setLoading(false)
    }

    checkAccess()
  }, [router, auth])

  const fetchInventoryAndProducts = async () => {
    const { data: inventoryData, error: inventoryErr } = await supabase
      .from('inventory')
      .select(`
        id,
        quantity,
        latitude,
        longitude,
        product_id,
        products (
          id,
          name,
          weight,
          volume,
          is_fragile
        )
      `)

    const { data: productData } = await supabase.from('products').select('*')
    setProducts(productData ?? [])

    if (inventoryErr) {
      setInventoryError(inventoryErr.message)
    } else {
    const transformedData = inventoryData?.map(item => ({
    ...item,
    products: Array.isArray(item.products) ? item.products[0] : item.products
    })) || []
    setInventory(transformedData || [])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const refreshData = () => {
    location.reload()
  }

  return {
    loading,
    user,
    role: auth?.role,
    inventory,
    inventoryError,
    products,
    handleLogout,
    refreshData,
  }
}