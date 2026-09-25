import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';
import { AuthDto } from './auth.dto.js';
import { UsersService } from '../users/users.service.js';

// Refresh tokens are hashed with SHA-256, not bcrypt: bcrypt only reads the
// first 72 bytes, and every JWT for the same user shares those bytes (header +
// `sub`), so a bcrypt hash would match any of that user's refresh tokens.
// The tokens are long random-signed strings, so a fast hash is safe here.
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: AuthDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user || !user.isActive) return null;

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) return null;

    const { passwordHash: _pw, refreshTokenHash: _rt, ...result } = user;
    return result;
  }

  async login(user: { id: string; role: string; name: string }) {
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const presented = Buffer.from(hashToken(refreshToken), 'hex');
    const stored = Buffer.from(user.refreshTokenHash, 'hex');
    if (
      presented.length !== stored.length ||
      !timingSafeEqual(presented, stored)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate: the refresh token just used is replaced, so it can't be replayed.
    // Role comes from the DB, not the old token, so role changes take effect.
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { message: 'Logged out' };
  }

  private async issueTokens(user: { id: string; role: string }) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRY as StringValue,
    });
    // jwtid makes every refresh token unique, even two issued in the same second
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRY as StringValue,
      jwtid: randomUUID(),
    });

    await this.usersService.updateRefreshTokenHash(
      user.id,
      hashToken(refreshToken),
    );

    return { accessToken, refreshToken };
  }
}
