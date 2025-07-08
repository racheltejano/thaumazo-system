import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const createSupabaseWithTracking = (trackingId: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options) => {
        const headers = new Headers(options?.headers || {})
        headers.set('tracking-id', trackingId)
        return fetch(url, { ...options, headers })
      }
    }
  })
}
