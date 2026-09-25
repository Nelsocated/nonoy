// Creates the first ADMIN account so there's someone who can create the rest
// (POST /users). Safe to re-run: an existing phone number is left untouched.
//
//   npm run build && npm run seed
//
// Reads SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME from .env
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { Role } from './generated/prisma/enums.js';

const { SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;

if (!SEED_ADMIN_PHONE || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_NAME) {
  console.error(
    'Set SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME in .env first.',
  );
  process.exit(1);
}
if (SEED_ADMIN_PASSWORD.length < 6) {
  console.error('SEED_ADMIN_PASSWORD must be at least 6 characters.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const existing = await prisma.user.findUnique({
    where: { phone: SEED_ADMIN_PHONE },
  });
  if (existing) {
    console.log(
      `User ${SEED_ADMIN_PHONE} already exists (role ${existing.role}) — nothing to do.`,
    );
  } else {
    const admin = await prisma.user.create({
      data: {
        phone: SEED_ADMIN_PHONE,
        name: SEED_ADMIN_NAME,
        passwordHash: await bcrypt.hash(SEED_ADMIN_PASSWORD, 10),
        role: Role.ADMIN,
      },
    });
    console.log(`Created ADMIN ${admin.name} (${admin.phone}), id ${admin.id}`);
  }
} finally {
  await prisma.$disconnect();
}
