// src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin access key
  )

  getClient() {
    return this.supabase
  }
}
