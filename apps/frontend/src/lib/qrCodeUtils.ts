// lib/qrCodeUtils.ts
import { supabase } from '@/lib/supabase'

export interface PickupQRData {
  orderId: string
  type: 'pickup_confirmation'
  timestamp: string
  signature: string // HMAC signature for security
}

/**
 * Generate a secure QR code data string for pickup confirmation
 */
export async function generatePickupQRData(orderId: string): Promise<string> {
  const data: PickupQRData = {
    orderId,
    type: 'pickup_confirmation',
    timestamp: new Date().toISOString(),
    signature: await generateSignature(orderId)
  }
  
  return btoa(JSON.stringify(data)) // Base64 encode
}

/**
 * Generate HMAC signature for QR code security
 */
async function generateSignature(orderId: string): Promise<string> {
  const secret = process.env.NEXT_PUBLIC_QR_SECRET || 'default-secret-key'
  const message = `${orderId}-pickup-confirmation`
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify QR code signature
 */
export async function verifyQRSignature(
  orderId: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await generateSignature(orderId)
  return signature === expectedSignature
}

/**
 * Parse and validate QR code data
 */
export function parseQRData(qrString: string): PickupQRData | null {
  try {
    const decoded = atob(qrString)
    const data = JSON.parse(decoded) as PickupQRData
    
    // Validate structure
    if (!data.orderId || !data.type || !data.signature) {
      return null
    }
    
    if (data.type !== 'pickup_confirmation') {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Failed to parse QR data:', error)
    return null
  }
}

/**
 * Process pickup confirmation from QR scan
 */
export async function processPickupConfirmation(
  qrString: string,
  driverId: string
): Promise<{
  success: boolean
  message: string
  orderId?: string
}> {
  // Parse QR data
  const qrData = parseQRData(qrString)
  if (!qrData) {
    return { success: false, message: 'Invalid QR code format' }
  }
  
  // Verify signature
  const isValid = await verifyQRSignature(qrData.orderId, qrData.signature)
  if (!isValid) {
    return { success: false, message: 'Invalid QR code signature' }
  }
  
  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, driver_id, status')
    .eq('id', qrData.orderId)
    .single()
  
  if (orderError || !order) {
    return { success: false, message: 'Order not found' }
  }
  
  // Verify driver assignment
  if (order.driver_id !== driverId) {
    return { 
      success: false, 
      message: 'You are not assigned to this order' 
    }
  }
  
  // Check if order is in correct status
  if (order.status !== 'arrived_at_pickup') {
    return { 
      success: false, 
      message: `Cannot confirm pickup. Current status: ${order.status.replace(/_/g, ' ')}` 
    }
  }
  
  // Update order status to "items_being_delivered"
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      status: 'items_being_delivered',
      updated_at: new Date().toISOString()
    })
    .eq('id', qrData.orderId)
  
  if (updateError) {
    console.error('Failed to update order status:', updateError)
    return { 
      success: false, 
      message: 'Failed to update order status' 
    }
  }
  
  // Add status log
  const { error: logError } = await supabase
    .from('order_status_logs')
    .insert({
      order_id: qrData.orderId,
      status: 'items_being_delivered',
      description: 'Pickup confirmed via QR code scan',
      timestamp: new Date().toISOString()
    })
  
  if (logError) {
    console.warn('Failed to create status log:', logError)
  }
  
  return { 
    success: true, 
    message: 'Pickup confirmed successfully',
    orderId: qrData.orderId
  }
}