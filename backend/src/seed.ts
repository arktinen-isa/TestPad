import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

async function main() {
  console.log('Seeding process skipped as per request.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
