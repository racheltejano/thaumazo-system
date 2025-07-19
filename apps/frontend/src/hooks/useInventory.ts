import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { 
  InventoryItem, 
  InventoryItemVariant, 
  InventoryMovement,
  Product 
} from '@/types/inventory.types';
import { useAuth } from '@/lib/AuthContext';

export const useInventory = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryVariants, setInventoryVariants] = useState<InventoryItemVariant[]>([])
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([])
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([]) // Legacy for transition
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

      await fetchInventoryData()
      setLoading(false)
    }

    checkAccess()
  }, [router, auth])

  const fetchInventoryData = async () => {
    // Fetch inventory items
    const { data: itemsData, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name')

    if (itemsError) {
      setInventoryError(`Error fetching inventory items: ${itemsError.message}`)
      return
    }

    setInventoryItems(itemsData || [])

    // Fetch inventory variants with item details
    const { data: variantsData, error: variantsError } = await supabase
      .from('inventory_items_variants')
      .select(`
        *,
        inventory_items (
          id,
          name,
          category,
          description
        )
      `)
      .order('created_at', { ascending: false })

    if (variantsError) {
      setInventoryError(`Error fetching inventory variants: ${variantsError.message}`)
      return
    }

    setInventoryVariants(variantsData || [])

    // Fetch recent movements
    const { data: movementsData, error: movementsError } = await supabase
      .from('inventory_items_movements')
      .select(`
        *,
        inventory_items_variants (
          id,
          sku,
          inventory_items (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (movementsError) {
      setInventoryError(`Error fetching movements: ${movementsError.message}`)
      return
    }

    setInventoryMovements(movementsData || [])

    // Legacy: Keep products for transition
    const { data: productData } = await supabase.from('products').select('*')
    setProducts(productData ?? [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const refreshData = () => {
    fetchInventoryData()
  }

  return {
    loading,
    user,
    role: auth?.role,
    inventoryItems,
    inventoryVariants,
    inventoryMovements,
    inventoryError,
    products, // Legacy
    handleLogout,
    refreshData,
  }
}