import { IsEnum, IsString, MinLength } from 'class-validator';
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
