import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './users.dto.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(dto: CreateUserDto, role: Role = Role.WORKER) {
    const existing = await this.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('That phone number is already used');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        name: dto.name,
        role,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  // `previous` is set only when rotating on refresh; login/logout clear it
  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
    previous: string | null = null,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        refreshTokenHash,
        previousRefreshTokenHash: previous,
        refreshRotatedAt: previous ? new Date() : null,
      },
    });
  }

  // never select passwordHash / refreshTokenHash for API responses
  private static readonly publicFields = {
    id: true,
    name: true,
    phone: true,
    role: true,
    isActive: true,
    createdAt: true,
  } as const;

  async list(roles: Role[]) {
    return this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: UsersService.publicFields,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: UsersService.publicFields,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: { name?: string; phone?: string }) {
    await this.getProfile(id);
    if (dto.phone) {
      const owner = await this.findByPhone(dto.phone);
      if (owner && owner.id !== id)
        throw new ConflictException('That phone number is already used');
    }
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: UsersService.publicFields,
    });
  }

  // clears every refresh token: they're logged out on all devices
  async resetPassword(id: string, password: string) {
    await this.getProfile(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        refreshTokenHash: null,
        previousRefreshTokenHash: null,
        refreshRotatedAt: null,
      },
      select: UsersService.publicFields,
    });
  }

  // deactivating also revokes the refresh token; JwtStrategy rejects their
  // access token on the next request, so they're logged out immediately
  async setActive(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: isActive ? { isActive } : { isActive, refreshTokenHash: null },
      select: UsersService.publicFields,
    });
  }
}
