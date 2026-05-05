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
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
});

// GET /api/users — ADMIN+TEACHER
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const role = req.query['role'] as string;
    const unassigned = req.query['unassigned'] === 'true';
    const search = req.query['search'] as string;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    if (user.role === 'TEACHER') {
      where['role'] = 'STUDENT';
      // Find groups the teacher belongs to
      const teacherGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true }
      });
      const groupIds = teacherGroups.map(tg => tg.groupId);
      where['groups'] = { some: { groupId: { in: groupIds } } };
    } else {
      if (role && ['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
        where['role'] = role;
      }
      if (unassigned) {
        where['role'] = 'STUDENT';
        where['groups'] = { none: {} };
      }
    }

    if (search) {
      where['OR'] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: { 
          id: true, 
          name: true, 
          email: true, 
          role: true, 
          createdAt: true,
          groups: {
            select: {
              group: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// POST /api/users/import — ADMIN only
router.post(
  '/import',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { groupId, users } = req.body;
    if (!groupId || !Array.isArray(users)) {
      return res.status(400).json({ error: 'groupId and users array are required' });
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (const u of users) {
      try {
        const passwordHash = await hashPassword(u.password);
        
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
        
        if (existingUser) {
          // If exists, just link to group if not already linked
          const isLinked = await prisma.userGroup.findUnique({
            where: { userId_groupId: { userId: existingUser.id, groupId } }
          });
          
          if (!isLinked) {
            await prisma.userGroup.create({
              data: { userId: existingUser.id, groupId }
            });
          }
          createdCount++; // Count as success since they are now in the group
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              name: u.name,
              email: u.email,
              passwordHash,
              role: 'STUDENT',
              groups: {
                create: { groupId },
              },
            },
          });
          createdCount++;
        }
      } catch (err: any) {
        errors.push(`Помилка для ${u.email}: ${err.message || 'Невідома помилка'}`);
      }
    }

    if (createdCount === 0 && errors.length > 0) {
      return res.status(400).json({ error: `Не вдалося імпортувати студентів: ${errors[0]}` });
    }

    res.status(201).json({ count: createdCount, errors: errors.length > 0 ? errors : undefined });
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
    
    // Only ADMIN can change roles
    if (data.role !== undefined && currentUser.role === 'ADMIN') {
      updateData['role'] = data.role;
      
      // If role changes from STUDENT to something else, remove from all groups
      if (data.role !== 'STUDENT') {
        await prisma.userGroup.deleteMany({ where: { userId: id } });
      }
    }

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
    const currentUser = req.user!;

    if (id === currentUser.userId) {
      res.status(400).json({ error: 'Ви не можете видалити самого себе' });
      return;
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { createdTests: true, attempts: true } } }
    });

    if (!userToDelete) {
      res.status(404).json({ error: 'Користувача не знайдено' });
      return;
    }

    // Safety: don't allow deleting the last admin
    if (userToDelete.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(403).json({ error: 'Неможливо видалити останнього адміністратора' });
        return;
      }
    }

    // Use transaction to clean up dependencies that don't have Cascade in schema
    await prisma.$transaction(async (tx) => {
      // 1. Handle Attempts (and their nested children)
      const attemptIds = (await tx.attempt.findMany({
        where: { studentId: id },
        select: { id: true }
      })).map(a => a.id);

      if (attemptIds.length > 0) {
        await tx.suspiciousEvent.deleteMany({ where: { attemptId: { in: attemptIds } } });
        await tx.attemptAnswer.deleteMany({ where: { attemptQuestion: { attemptId: { in: attemptIds } } } });
        await tx.attemptQuestion.deleteMany({ where: { attemptId: { in: attemptIds } } });
        await tx.attempt.deleteMany({ where: { id: { in: attemptIds } } });
      }

      // 2. Handle Tests created by this user
      const testIds = (await tx.test.findMany({
        where: { createdById: id },
        select: { id: true }
      })).map(t => t.id);

      for (const tId of testIds) {
        // Cleaning up a test is complex, reuse the logic if possible or do manually
        await tx.testQuestion.deleteMany({ where: { testId: tId } });
        await tx.testGroup.deleteMany({ where: { testId: tId } });
        await tx.testCategoryQuota.deleteMany({ where: { testId: tId } });
        // Delete attempts for these tests too
        const testAttemptIds = (await tx.attempt.findMany({
          where: { testId: tId },
          select: { id: true }
        })).map(a => a.id);
        if (testAttemptIds.length > 0) {
          await tx.suspiciousEvent.deleteMany({ where: { attemptId: { in: testAttemptIds } } });
          await tx.attemptAnswer.deleteMany({ where: { attemptQuestion: { attemptId: { in: testAttemptIds } } } });
          await tx.attemptQuestion.deleteMany({ where: { attemptId: { in: testAttemptIds } } });
          await tx.attempt.deleteMany({ where: { id: { in: testAttemptIds } } });
        }
        await tx.test.delete({ where: { id: tId } });
      }

      // 3. UserGroup and RefreshToken have Cascade, so just delete the user
      await tx.user.delete({ where: { id } });
    });

    res.status(204).send();
  })
);

export default router;
