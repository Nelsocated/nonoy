import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LocalStrategy } from './strategy/local.strategy.js';
import { JwtStrategy } from './strategy/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientThrottlerGuard } from './guard/client-throttler.guard.js';

@Module({
  imports: [
    PassportModule.register({ session: false }), // provides AuthModuleOptions that LocalAuthGuard injects
    JwtModule.register({}),
    UsersModule,
    ThrottlerModule.forRoot([
      {
        // per browser IP (see ClientThrottlerGuard); login has its own 5/min
        ttl: 60000,
        limit: 120,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    // JwtAuthGuard + RolesGuard are registered globally in AppModule
    { provide: APP_GUARD, useClass: ClientThrottlerGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
