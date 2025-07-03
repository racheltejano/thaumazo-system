import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import CreateOrderForm from './CreateOrderForm'
import Link from 'next/link'

interface Props {
  params: Promise<{ trackingId: string }>
}

export default async function CreateOrderPage({ params }: Props) {
  // Await params before accessing its properties
  const { trackingId } = await params
  
  // Await the cookie store if needed
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // do nothing
        },
        remove() {
          // do nothing
        },
      },
    }
  )
  console.log("TRACKING ID")
  console.log(trackingId)
  // Check if client exists with this tracking ID
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('tracking_id', trackingId.trim())
    .maybeSingle()

  if (!client) {
    return (
      <main className="p-6 text-center text-red-600">
        <h1 className="text-2xl font-bold mb-4">⚠️ Invalid Tracking ID</h1>
        <p>
          The tracking ID{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">{trackingId}</code> was not found.
        </p>
        <p className="mt-2">
          Please go back to the{' '}
          <Link href="/create-order" className="text-blue-600 underline">
            order page
          </Link>.
        </p>
      </main>
    )
  }

  // SAFEGUARD: Check if an order with this tracking ID already exists
  const { data: existingOrder, error: orderCheckError } = await supabase
    .from('orders')
    .select('id, status, created_at, client_id')
    .eq('tracking_id', trackingId.trim())
    .single()

  if (orderCheckError) {
    console.error('[CreateOrderPage] Error checking existing order:', orderCheckError)
    return (
      <main className="p-6 text-center text-red-600">
        <h1 className="text-2xl font-bold mb-4">⚠️ Error</h1>
        <p>Unable to verify order status. Please try again.</p>
        <p className="mt-2">
          <Link href="/create-order" className="text-blue-600 underline">
            Go back to enter tracking ID
          </Link>
        </p>
      </main>
    )
  }

  if (existingOrder) {
    return (
      <main className="p-6 text-center text-orange-600">
        <h1 className="text-2xl font-bold mb-4">📦 Order Already Exists</h1>
        <p>
          An order with tracking ID{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">{trackingId}</code>{' '}
          already exists.
        </p>
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded">
          <p className="text-sm text-orange-700">
            <strong>Order Details:</strong>
          </p>
          <p className="text-sm text-orange-700">
            Created: {new Date(existingOrder.created_at).toLocaleDateString()}
          </p>
          <p className="text-sm text-orange-700">
            Status: {existingOrder.status.replace('_', ' ').toUpperCase()}
          </p>
        </div>
        <p className="mt-4">
          <Link href="/create-order" className="text-blue-600 underline">
            Enter a different tracking ID
          </Link>
        </p>
      </main>
    )
  }

  // All checks passed - render the form
  return <CreateOrderForm trackingId={trackingId} />
}