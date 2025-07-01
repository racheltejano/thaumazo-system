import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [UsersModule, AuthModule, SupabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
