// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { SupabaseService } from '../supabase/supabase.service'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_JWT_ISSUER = 'https://your-project.supabase.co' // Replace with your real project URL
const JWKS_URL = `${SUPABASE_JWT_ISSUER}/auth/v1/keys`

@Injectable()
export class AuthService {
  private JWKS = createRemoteJWKSet(new URL(JWKS_URL))

  constructor(private readonly supabaseService: SupabaseService) {}

  async verifyToken(authorizationHeader?: string) {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing authorization header')
    }

    const token = authorizationHeader.replace('Bearer ', '')

    try {
      const { payload } = await jwtVerify(token, this.JWKS, {
        issuer: SUPABASE_JWT_ISSUER,
        audience: undefined, // no audience claim required
      })

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      }
    } catch (err) {
      throw new UnauthorizedException('Invalid token')
    }
  }

  async register(email: string, password: string) {
    const supabase = this.supabaseService.getClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })
    if (error) throw new UnauthorizedException(error.message)
    return { user: data.user }
  }

  async login(email: string, password: string) {
    const supabase = this.supabaseService.getClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new UnauthorizedException(error.message)
    return data
  }

  async forgotPassword(email: string) {
    const supabase = this.supabaseService.getClient()
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL,
    })
    if (error) throw new UnauthorizedException(error.message)
    return { message: 'Password reset email sent.' }
  }

  async resetPassword(accessToken: string, newPassword: string) {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new UnauthorizedException(error.message)
    return { message: 'Password updated.' }
  }
}
