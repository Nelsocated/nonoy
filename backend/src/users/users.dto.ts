import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString()
  @MinLength(11, { message: 'Insert a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
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
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name?: string;

  @IsOptional()
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
