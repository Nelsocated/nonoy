import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { IfSent } from '../common/if-sent.decorator.js';
import { Role } from '../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @IsString()
  @MinLength(11, { message: 'Insert a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name: string;
  // no `role` here: an undecorated field makes forbidNonWhitelisted reject
  // every request, and public sign-up must never pick its own role anyway
}

// POST /users — staff creating an account with a chosen role
export class AdminCreateUserDto extends CreateUserDto {
  @IsEnum(Role)
  role: Role;
}

export class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}

// PATCH /users/:id — fix a name or change the login phone
export class UpdateUserDto {
  @IfSent()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name?: string;

  @IfSent()
  @IsString()
  @MinLength(11, { message: 'Insert a valid phone number' })
  phone?: string;
}

// PATCH /users/:id/password — staff set a new one when a worker forgets theirs
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}
