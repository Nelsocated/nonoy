import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) return null;

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; role: string; name: string }) {
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRY as StringValue,
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRY as StringValue,
      }),
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const newPayload = { sub: payload.sub, role: payload.role };
      return {
        accessToken: this.jwtService.sign(newPayload, {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRY as StringValue,
        }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
