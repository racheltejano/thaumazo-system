import { supabase } from '@/lib/supabase'

export async function generateInventoryTrackingId(): Promise<string> {
  const today = new Date()
  const dateString = today.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
  
  // Get count of orders created today by inventory staff
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
  
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_source', 'inventory_staff')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
  
  if (error) {
    console.error('Error counting orders:', error)
    // Fallback to random number if query fails
    const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `TXT_INV_${dateString}_${randomSeq}`
  }
  
  const sequence = ((count || 0) + 1).toString().padStart(3, '0')
  return `TXT_INV_${dateString}_${sequence}`
}