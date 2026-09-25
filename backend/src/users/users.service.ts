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
      throw new ConflictException('Phone number already registered');
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

  async updateRefreshTokenHash(id: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
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
