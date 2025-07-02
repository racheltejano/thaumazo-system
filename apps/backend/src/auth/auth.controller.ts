import { Controller, Post, Body, Get, Req, UseGuards, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { accessToken: string; newPassword: string }) {
    return this.authService.resetPassword(body.accessToken, body.newPassword);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async me(@Req() req: Request) {
    this.logger.debug(`GET /auth/me called. User: ${JSON.stringify(req["user"] || null)}`);
    // You may want to select only safe fields to return
    return req["user"];
  }
}
