// src/auth/jwt.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from '../auth.service'

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const authHeader = request.headers.authorization

    const user = await this.authService.verifyToken(authHeader)
    request['user'] = user // Attach user to request
    return true
  }
}
