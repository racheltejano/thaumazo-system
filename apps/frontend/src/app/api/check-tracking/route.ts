import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const trackingId = url.searchParams.get('trackingId')

  const cookieStore = (cookies() as unknown) as {
    get(name: string): { value: string } | undefined
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? ''
        },
      },
    }
  )

  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('tracking_id', trackingId)
    .single()

  return Response.json({ exists: !!data })
}
