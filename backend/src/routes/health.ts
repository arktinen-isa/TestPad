import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  })
);

// One-time setup — creates admin if no users exist yet
// Remove this route after first use
router.get(
  '/setup',
  asyncHandler(async (_req, res) => {
    const count = await prisma.user.count();
    if (count > 0) {
      res.json({ status: 'already_done', message: 'Users already exist. Setup not needed.' });
      return;
    }

    const passwordHash = await bcrypt.hash('Admin1234!', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Адміністратор',
        email: 'admin@omfc.edu.ua',
        passwordHash,
        role: 'ADMIN',
      },
    });

    res.json({
      status: 'ok',
      message: 'Admin created successfully',
      email: admin.email,
      password: 'Admin1234!',
    });
  })
);

export default router;
