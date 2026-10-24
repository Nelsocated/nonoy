// Creates the first ADMIN account so there's someone who can create the rest.
// Safe to re-run: an existing phone number is left untouched.
//
//   npm run seed
//
// Reads SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME from .env
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { Role } from "./generated/prisma/enums";

const { SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;

if (!SEED_ADMIN_PHONE || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_NAME) {
  console.error(
    "Set SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME in .env first.",
  );
  process.exit(1);
}
if (SEED_ADMIN_PASSWORD.length < 6) {
  console.error("SEED_ADMIN_PASSWORD must be at least 6 characters.");
  process.exit(1);
}

// its own client: db.ts hooks into Vercel's runtime, which a script has not got
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(phone: string, password: string, name: string) {
  try {
    const existing = await prisma.user.findUnique({
      where: { phone },
    });
    if (existing) {
      console.log(
        `User ${phone} already exists (role ${existing.role}) — nothing to do.`,
      );
    } else {
      const admin = await prisma.user.create({
        data: {
          phone,
          name,
          passwordHash: await bcrypt.hash(password, 10),
          role: Role.ADMIN,
        },
      });
      console.log(
        `Created ADMIN ${admin.name} (${admin.phone}), id ${admin.id}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main(SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME);
