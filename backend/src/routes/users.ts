import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { hashPassword } from '../services/authService';

const router = Router();

router.use(authenticate);

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

// GET /api/users — ADMIN only
router.get(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// POST /api/users — ADMIN only
router.post(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = createUserSchema.parse(req.body);
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  })
);

// GET /api/users/:id — ADMIN or self
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  })
);

// PATCH /api/users/:id — ADMIN or self
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const data = updateUserSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData['name'] = data.name;
    if (data.email !== undefined) updateData['email'] = data.email;
    if (data.password !== undefined) updateData['passwordHash'] = await hashPassword(data.password);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json(user);
  })
);

// DELETE /api/users/:id — ADMIN only
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
