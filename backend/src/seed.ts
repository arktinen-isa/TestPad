import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env['ADMIN_EMAIL'] || 'admin@omfc.edu.ua';
  const password = process.env['ADMIN_PASSWORD'] || 'Admin1234!';
  const name = process.env['ADMIN_NAME'] || 'Адміністратор';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name, passwordHash, role: 'ADMIN' },
  });

  console.log(`✓ Admin created: ${email} / ${password}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
