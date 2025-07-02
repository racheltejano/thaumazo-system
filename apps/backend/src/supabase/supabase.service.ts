// src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!
    )
  }

  getClient() {
    return this.supabase
  }
}
