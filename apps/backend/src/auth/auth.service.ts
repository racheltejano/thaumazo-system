// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { SupabaseService } from '../supabase/supabase.service'
import { createClient } from '@supabase/supabase-js'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UsersService, UserProfile } from '../users/users.service'

const SUPABASE_JWT_ISSUER = 'https://your-project.supabase.co' // Replace with your real project URL
const JWKS_URL = `${SUPABASE_JWT_ISSUER}/auth/v1/keys`

@Injectable()
export class AuthService {
  private JWKS = createRemoteJWKSet(new URL(JWKS_URL))

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async verifyToken(authorizationHeader?: string): Promise<UserProfile> {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing authorization header')
    }

    const token = authorizationHeader.replace('Bearer ', '')

    try {
      const { payload } = await jwtVerify(token, this.JWKS, {
        issuer: SUPABASE_JWT_ISSUER,
        audience: undefined, // no audience claim required
      })
      // Fetch user profile from DB
      const profile = await this.usersService.getUserProfileById(payload.sub as string)
      if (!profile) {
        throw new UnauthorizedException('User profile not found')
      }
      return profile
    } catch (err) {
      throw new UnauthorizedException('Invalid token')
    }
  }

  async register(body: RegisterDto): Promise<{ user: any; profile: UserProfile }> {
    const { email, password, name, role } = body
    const supabase = this.supabaseService.getClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })
    if (error) throw new UnauthorizedException(error.message)
    // Create user profile in DB
    const profile = await this.usersService.createUserProfile({
      id: data.user.id,
      email,
      name,
      role,
    })
    return { user: data.user, profile }
  }

  async login(body: LoginDto): Promise<any & { profile: UserProfile | undefined }> {
    const { email, password } = body
    const supabase = this.supabaseService.getClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new UnauthorizedException(error.message)
    // Fetch user profile from DB
    const profile = await this.usersService.getUserProfileById(data.user.id)
    return { ...data, profile }
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
