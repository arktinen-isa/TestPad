import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  year: z.number().int().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  year: z.number().int().nullable().optional(),
});

const addStudentSchema = z.object({
  studentId: z.string().uuid(),
});

// GET /api/groups — ADMIN+TEACHER
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (_req, res) => {
    const groups = await prisma.group.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups.map((g) => ({
      id: g.id,
      name: g.name,
      year: g.year,
      studentCount: g._count.users,
    })));
  })
);

// POST /api/groups — ADMIN only
router.post(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createGroupSchema.parse(req.body);

    const group = await prisma.group.create({
      data: {
        name: data.name,
        year: data.year,
      },
    });

    res.status(201).json(group);
  })
);

// GET /api/groups/:id — ADMIN+TEACHER, includes students list
router.get(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json({
      id: group.id,
      name: group.name,
      year: group.year,
      students: group.users.map((ug) => ug.user),
    });
  })
);

// PATCH /api/groups/:id — ADMIN only
router.patch(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateGroupSchema.parse(req.body);

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.year !== undefined && { year: data.year }),
      },
    });

    res.json(group);
  })
);

// DELETE /api/groups/:id — ADMIN only
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.group.delete({ where: { id } });
    res.status(204).send();
  })
);

// POST /api/groups/:id/students — ADMIN, add student
router.post(
  '/:id/students',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId } = addStudentSchema.parse(req.body);

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Verify user exists and is a student
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.role !== 'STUDENT') {
      res.status(400).json({ error: 'User is not a student' });
      return;
    }

    await prisma.userGroup.create({
      data: { userId: studentId, groupId: id },
    });

    res.status(201).json({ message: 'Student added to group' });
  })
);

// DELETE /api/groups/:id/students/:studentId — ADMIN
router.delete(
  '/:id/students/:studentId',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;

    await prisma.userGroup.delete({
      where: {
        userId_groupId: { userId: studentId, groupId: id },
      },
    });

    res.status(204).send();
  })
);

export default router;
