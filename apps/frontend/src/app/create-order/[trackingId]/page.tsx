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

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('tracking_id', trackingId)
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

  return <CreateOrderForm trackingId={trackingId} />
}