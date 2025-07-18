import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { InventoryItem, Product } from  '@/types/inventory.types';

export const useInventory = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

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

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        router.push('/dashboard')
        return
      }

      if (profile.role !== 'inventory_staff' && profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setRole(profile.role)
      await fetchInventoryAndProducts()
      setLoading(false)
    }

    checkAccess()
  }, [router])

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
    role,
    inventory,
    inventoryError,
    products,
    handleLogout,
    refreshData,
  }
}