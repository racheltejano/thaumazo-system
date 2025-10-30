import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get auth token from request header
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No auth token provided' })
    }

    // Create supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user || authError) {
      console.error('Auth failed:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { type } = req.body

    let data: any[] = []
    let sheetName = 'Data'

    switch (type) {
      case 'orders':
        data = await exportOrders(supabase)
        sheetName = 'Orders'
        break
      case 'clients':
        data = await exportClients(supabase)
        sheetName = 'Clients'
        break
      case 'inventory':
        data = await exportInventory(supabase)
        sheetName = 'Inventory'
        break
      case 'drivers':
        data = await exportDrivers(supabase)
        sheetName = 'Drivers'
        break
      default:
        return res.status(400).json({ error: 'Invalid export type' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data to export' })
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.xlsx"`)
    
    return res.status(200).send(buffer)

  } catch (error: any) {
    console.error('Export error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}

async function exportOrders(supabase: any) {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      tracking_id,
      status,
      created_at,
      pickup_date,
      pickup_time,
      vehicle_type,
      tail_lift_required,
      estimated_cost,
      priority_level,
      special_instructions,
      estimated_total_duration,
      clients (
        contact_person,
        contact_number,
        email,
        business_name,
        pickup_address,
        client_type
      ),
      profiles (
        first_name,
        last_name,
        contact_number
      )
    `)
    .order('created_at', { ascending: false })

  return orders?.map((order: any) => ({
    'Tracking ID': order.tracking_id,
    'Status': order.status,
    'Created Date': new Date(order.created_at).toLocaleDateString(),
    'Pickup Date': order.pickup_date,
    'Pickup Time': order.pickup_time,
    'Client Name': order.clients?.contact_person || 'N/A',
    'Business Name': order.clients?.business_name || 'N/A',
    'Client Type': order.clients?.client_type || 'N/A',
    'Client Phone': order.clients?.contact_number || 'N/A',
    'Client Email': order.clients?.email || 'N/A',
    'Pickup Address': order.clients?.pickup_address || 'N/A',
    'Driver Name': order.profiles ? `${order.profiles.first_name} ${order.profiles.last_name}` : 'Unassigned',
    'Driver Phone': order.profiles?.contact_number || 'N/A',
    'Vehicle Type': order.vehicle_type,
    'Tail Lift Required': order.tail_lift_required ? 'Yes' : 'No',
    'Estimated Cost (PHP)': order.estimated_cost || 0,
    'Priority': order.priority_level || 'medium',
    'Duration (mins)': order.estimated_total_duration || 0,
    'Special Instructions': order.special_instructions || 'None'
  })) || []
}

async function exportClients(supabase: any) {
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id,
      tracking_id,
      contact_person,
      contact_number,
      email,
      business_name,
      client_type,
      pickup_address,
      pickup_area,
      landmark,
      created_at
    `)
    .order('created_at', { ascending: false })

  const clientsWithOrders = await Promise.all(
    (clients || []).map(async (client: any) => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

      return {
        'Tracking ID': client.tracking_id,
        'Contact Person': client.contact_person,
        'Business Name': client.business_name || 'N/A',
        'Client Type': client.client_type || 'first_time',
        'Phone': client.contact_number,
        'Email': client.email || 'N/A',
        'Pickup Address': client.pickup_address,
        'Area': client.pickup_area || 'N/A',
        'Landmark': client.landmark || 'N/A',
        'Total Orders': count || 0,
        'Registration Date': new Date(client.created_at).toLocaleDateString()
      }
    })
  )

  return clientsWithOrders
}

async function exportInventory(supabase: any) {
  const { data: items } = await supabase
    .from('inventory_items_variants')
    .select(`
      sku,
      variant_name,
      supplier_name,
      supplier_email,
      supplier_number,
      packaging_type,
      is_fragile,
      cost_price,
      selling_price,
      current_stock,
      color,
      size,
      created_at,
      inventory_items (
        name,
        description,
        inventory_items_categories (name)
      )
    `)
    .order('created_at', { ascending: false })

  return items?.map((item: any) => ({
    'SKU': item.sku,
    'Item Name': item.inventory_items?.name || 'N/A',
    'Variant Name': item.variant_name || 'N/A',
    'Category': item.inventory_items?.inventory_items_categories?.name || 'N/A',
    'Description': item.inventory_items?.description || 'N/A',
    'Current Stock': item.current_stock || 0,
    'Cost Price (PHP)': item.cost_price || 0,
    'Selling Price (PHP)': item.selling_price || 0,
    'Profit Margin (PHP)': (item.selling_price || 0) - (item.cost_price || 0),
    'Supplier Name': item.supplier_name,
    'Supplier Email': item.supplier_email || 'N/A',
    'Supplier Phone': item.supplier_number || 'N/A',
    'Packaging Type': item.packaging_type || 'N/A',
    'Is Fragile': item.is_fragile ? 'Yes' : 'No',
    'Color': item.color || 'N/A',
    'Size': item.size || 'N/A',
    'Added Date': new Date(item.created_at).toLocaleDateString()
  })) || []
}

async function exportDrivers(supabase: any) {
  const { data: drivers } = await supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      contact_number,
      can_login,
      last_login,
      created_at
    `)
    .eq('role', 'driver')
    .order('created_at', { ascending: false })

  const driversWithStats = await Promise.all(
    (drivers || []).map(async (driver: any) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, estimated_cost')
        .eq('driver_id', driver.id)

      const completedOrders = orders?.filter((o: any) => o.status === 'delivered') || []
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (Number(o.estimated_cost) || 0), 0)

      return {
        'Driver Name': `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'N/A',
        'Email': driver.email || 'N/A',
        'Phone': driver.contact_number || 'N/A',
        'Status': driver.can_login ? 'Active' : 'Inactive',
        'Total Orders': orders?.length || 0,
        'Completed Orders': completedOrders.length,
        'Total Revenue (PHP)': totalRevenue,
        'Last Login': driver.last_login ? new Date(driver.last_login).toLocaleDateString() : 'Never',
        'Join Date': new Date(driver.created_at).toLocaleDateString()
      }
    })
  )

  return driversWithStats
}