import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// TZI Security Audit Logger
function logSecurityEvent(userId: string, role: string, action: string, details: any, ip?: string) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'SECURITY_AUDIT',
    userId,
    role,
    action,
    details,
    ip: ip || 'unknown'
  }));
}

// TZI Input Sanitization against Stored XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const formFieldSchema = z.object({
  label: z.string().min(1).max(500),
  type: z.enum(['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT']),
  required: z.boolean().default(true),
  correctAnswer: z.string().nullable().optional(),
});

const createFormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('DRAFT'),
  groupIds: z.array(z.string().uuid()).optional(),
  openFrom: z.string().nullable().optional(),
  openUntil: z.string().nullable().optional(),
  fields: z.array(formFieldSchema),
});

const updateFormSchema = createFormSchema.partial();

// GET /api/forms
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    let where: Record<string, any> = {};

    if (user.role === 'TEACHER') {
      where = { createdById: user.userId };
    } else if (user.role === 'STUDENT') {
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true }
      });
      const studentGroupIds = userGroups.map(ug => ug.groupId);
      where = {
        status: 'OPEN',
        OR: [
          { groups: { none: {} } },
          { groups: { some: { groupId: { in: studentGroupIds } } } }
        ]
      };
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
        _count: { select: { submissions: true, fields: true } }
      }
    });

    res.json(forms);
  })
);

// POST /api/forms
router.post(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { title, description, status, groupIds, openFrom, openUntil, fields } = createFormSchema.parse(req.body);
    const user = req.user!;

    const form = await prisma.form.create({
      data: {
        title,
        description,
        status,
        openFrom: openFrom ? new Date(openFrom) : null,
        openUntil: openUntil ? new Date(openUntil) : null,
        createdById: user.userId,
        groups: groupIds
          ? { create: groupIds.map((groupId) => ({ groupId })) }
          : undefined,
        fields: {
          create: fields.map((f, i) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            correctAnswer: f.correctAnswer ?? null,
            order: i,
          })),
        },
      },
      include: { fields: true, groups: { include: { group: { select: { id: true, name: true } } } } },
    });

    logSecurityEvent(user.userId, user.role, 'FORM_CREATE', { formId: form.id, title: form.title }, req.ip);

    res.status(201).json(form);
  })
);

// GET /api/forms/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const form = await prisma.form.findUnique({
      where: { id },
      include: { 
        fields: { orderBy: { order: 'asc' } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        _count: { select: { submissions: true } }
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // TZI Access Control & IDOR Protection:
    if (user.role === 'TEACHER' && form.createdById !== user.userId) {
      logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_ACCESS_ATTEMPT', { formId: id }, req.ip);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (user.role === 'STUDENT' && form.groups && form.groups.length > 0) {
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true }
      });
      const studentGroupIds = userGroups.map(ug => ug.groupId);
      const hasAccess = form.groups.some(g => studentGroupIds.includes(g.groupId));
      if (!hasAccess) {
        logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_ACCESS_ATTEMPT', { formId: id }, req.ip);
        return res.status(403).json({ error: 'Ви не належите до групи, якій призначена ця форма' });
      }
    }

    res.json(form);
  })
);

// PATCH /api/forms/:id
router.patch(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const { title, description, status, groupIds, openFrom, openUntil, fields } = updateFormSchema.parse(req.body);

    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Form not found' });
    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_FORM_EDIT_ATTEMPT', { formId: id }, req.ip);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (groupIds !== undefined) {
      await prisma.formGroup.deleteMany({ where: { formId: id } });
    }

    const form = await prisma.form.update({
      where: { id },
      data: {
        title,
        description,
        status,
        openFrom: openFrom !== undefined ? (openFrom ? new Date(openFrom) : null) : undefined,
        openUntil: openUntil !== undefined ? (openUntil ? new Date(openUntil) : null) : undefined,
        groups: groupIds !== undefined ? {
          create: groupIds.map((groupId) => ({ groupId })),
        } : undefined,
        fields: fields ? {
          deleteMany: {},
          create: fields.map((f, i) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            correctAnswer: f.correctAnswer ?? null,
            order: i,
          })),
        } : undefined,
      },
      include: { fields: true, groups: { include: { group: { select: { id: true, name: true } } } } },
    });

    logSecurityEvent(user.userId, user.role, 'FORM_UPDATE', { formId: form.id }, req.ip);

    res.json(form);
  })
);

// POST /api/forms/:id/submit
router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const { values } = req.body; // Map of fieldId -> value

    const form = await prisma.form.findUnique({
      where: { id },
      include: { fields: true, groups: true },
    });

    if (!form || form.status !== 'OPEN') {
      return res.status(404).json({ error: 'Форма не знайдена або закрита' });
    }

    // 1. Enforce 1 attempt limit
    const existingSubmission = await prisma.formSubmission.findFirst({
      where: { formId: id, userId: user.userId }
    });
    if (existingSubmission) {
      logSecurityEvent(user.userId, user.role, 'FORM_DUPLICATE_SUBMIT_ATTEMPT', { formId: id }, req.ip);
      return res.status(400).json({ error: 'Ви вже заповнили цю форму (дозволено лише 1 спробу)' });
    }

    // 2. Enforce date availability
    const now = new Date();
    if (form.openFrom && now < form.openFrom) {
      return res.status(400).json({ error: 'Форма ще не відкрита для заповнення' });
    }
    if (form.openUntil && now > form.openUntil) {
      return res.status(400).json({ error: 'Термін заповнення форми вже минув' });
    }

    // 3. Enforce group targeting
    if (form.groups && form.groups.length > 0) {
      const targetedGroupIds = form.groups.map(g => g.groupId);
      const userGroup = await prisma.userGroup.findFirst({
        where: { userId: user.userId, groupId: { in: targetedGroupIds } }
      });
      if (!userGroup) {
        logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_SUBMIT_ATTEMPT', { formId: id }, req.ip);
        return res.status(403).json({ error: 'Ви не належите до групи, якій призначена ця форма' });
      }
    }

    // Validation
    for (const field of form.fields) {
      if (field.required && (values[field.id] === undefined || values[field.id] === null || values[field.id] === '')) {
        return res.status(400).json({ error: `Field "${field.label}" is required` });
      }
      
      const val = values[field.id];
      if (val !== undefined && val !== null && val !== '') {
        if (field.type === 'INTEGER') {
          if (!Number.isInteger(Number(val)) && isNaN(parseInt(String(val)))) {
             return res.status(400).json({ error: `Field "${field.label}" must be an integer` });
          }
        } else if (field.type === 'FLOAT') {
          if (isNaN(Number(val))) return res.status(400).json({ error: `Field "${field.label}" must be a number` });
        } else if (field.type === 'BOOLEAN') {
           if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
             return res.status(400).json({ error: `Field "${field.label}" must be boolean` });
           }
        }
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId: id,
        userId: user.userId,
        values: {
          create: Object.entries(values).map(([fieldId, value]) => ({
            fieldId,
            value: escapeHtml(String(value)), // TZI Sanitization
          })),
        },
      },
    });

    logSecurityEvent(user.userId, user.role, 'FORM_SUBMIT', { formId: id, submissionId: submission.id }, req.ip);

    res.status(201).json(submission);
  })
);

// GET /api/forms/:id/results
router.get(
  '/:id/results',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const groupId = req.query['groupId'] as string | undefined;

    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form) return res.status(404).json({ error: 'Form not found' });
    if (user.role === 'TEACHER' && form.createdById !== user.userId) {
      logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_RESULTS_ACCESS_ATTEMPT', { formId: id }, req.ip);
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: any = { formId: id };
    if (groupId) {
      where.user = { groups: { some: { groupId } } };
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            groups: { select: { group: { select: { name: true } } } }
          } 
        },
        values: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    logSecurityEvent(user.userId, user.role, 'FORM_RESULTS_ACCESS', { formId: id }, req.ip);

    res.json(submissions);
  })
);

// DELETE /api/forms/:id
router.delete(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    if (user.role === 'TEACHER' && form.createdById !== user.userId) {
      logSecurityEvent(user.userId, user.role, 'UNAUTHORIZED_DELETE_ATTEMPT', { formId: id }, req.ip);
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.form.delete({ where: { id } });
    
    logSecurityEvent(user.userId, user.role, 'FORM_DELETE', { formId: id }, req.ip);
    
    res.status(204).send();
  })
);

export default router;
