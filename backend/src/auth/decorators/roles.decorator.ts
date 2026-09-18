import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
