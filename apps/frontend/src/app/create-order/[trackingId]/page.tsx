import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
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

  // All checks passed - render the form
  return <CreateOrderForm trackingId={trackingId} />
}