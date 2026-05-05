import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const addStudentSchema = z.object({
  studentId: z.string().uuid(),
});

// GET /api/groups — ADMIN+TEACHER
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const where = user.role === 'TEACHER' 
      ? { users: { some: { userId: user.userId } } } 
      : {};

    const groups = await prisma.group.findMany({
      where,
      include: {
        _count: { 
          select: { 
            users: { where: { user: { role: 'STUDENT' } } } 
          } 
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups.map((g) => ({
      id: g.id,
      name: g.name,
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

    const user = req.user!;
    if (user.role === 'TEACHER') {
      const hasAccess = group.users.some(ug => ug.userId === user.userId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
    }

    res.json({
      id: group.id,
      name: group.name,
      students: group.users.filter(ug => ug.user.role === 'STUDENT').map((ug) => ug.user),
      teachers: group.users.filter(ug => ug.user.role === 'TEACHER').map((ug) => ug.user),
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

// POST /api/groups/:id/students — ADMIN+TEACHER, add student
router.post(
  '/:id/students',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId } = addStudentSchema.parse(req.body);
    const currentUser = req.user!;

    // Verify group exists
    const group = await prisma.group.findUnique({ 
      where: { id },
      include: { users: true }
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // RBAC for Teacher
    if (currentUser.role === 'TEACHER' && !group.users.some(ug => ug.userId === currentUser.userId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Only allow adding students for teachers
    if (currentUser.role === 'TEACHER' && user.role !== 'STUDENT') {
      res.status(400).json({ error: 'Teachers can only add students to groups' });
      return;
    }

    await prisma.userGroup.create({
      data: { userId: studentId, groupId: id },
    });

    res.status(201).json({ message: 'User added to group' });
  })
);

// DELETE /api/groups/:id/students/:studentId — ADMIN+TEACHER
router.delete(
  '/:id/students/:studentId',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const currentUser = req.user!;

    // Verify access
    if (currentUser.role === 'TEACHER') {
      const access = await prisma.userGroup.findUnique({
        where: { userId_groupId: { userId: currentUser.userId, groupId: id } }
      });
      if (!access) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      
      const targetUser = await prisma.user.findUnique({ where: { id: studentId } });
      if (targetUser?.role !== 'STUDENT') {
        res.status(403).json({ error: 'Teachers can only remove students' });
        return;
      }
    }

    await prisma.userGroup.delete({
      where: {
        userId_groupId: { userId: studentId, groupId: id },
      },
    });

    res.status(204).send();
  })
);

export default router;
