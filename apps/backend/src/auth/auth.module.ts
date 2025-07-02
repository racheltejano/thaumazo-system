import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, UsersService]
})
export class AuthModule {}
