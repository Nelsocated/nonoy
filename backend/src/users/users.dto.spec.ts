import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminCreateUserDto, ResetPasswordDto } from './users.dto.js';

const ok = (password: string) =>
  validateSync(plainToInstance(ResetPasswordDto, { password })).length === 0;

describe('passwords', () => {
  // bcrypt ignores everything past 72 bytes, so refuse instead of cutting
  it('allows up to 72 bytes', () => {
    expect(ok('x'.repeat(72))).toBe(true);
    expect(ok('x'.repeat(73))).toBe(false);
    expect(ok('ñ'.repeat(37))).toBe(false); // 74 bytes in UTF-8
  });
  it('applies to new accounts too', () => {
    const dto = plainToInstance(AdminCreateUserDto, {
      name: 'Juan',
      phone: '09000000009',
      role: 'WORKER',
      password: 'x'.repeat(73),
    });
    expect(validateSync(dto).map((e) => e.property)).toEqual(['password']);
  });
});
