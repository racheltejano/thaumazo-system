// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const SUPABASE_JWT_ISSUER = 'https://your-project.supabase.co' // Replace with your real project URL
const JWKS_URL = `${SUPABASE_JWT_ISSUER}/auth/v1/keys`

@Injectable()
export class AuthService {
  private JWKS = createRemoteJWKSet(new URL(JWKS_URL))

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
}
