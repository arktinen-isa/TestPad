import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const formFieldSchema = z.object({
  label: z.string().min(1).max(500),
  type: z.enum(['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT']),
  required: z.boolean().default(true),
});

const createFormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('DRAFT'),
  fields: z.array(formFieldSchema),
});

const updateFormSchema = createFormSchema.partial();

// GET /api/forms
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    let where: Record<string, unknown> = {};

    if (user.role === 'TEACHER') {
      where = { createdById: user.userId };
    } else if (user.role === 'STUDENT') {
      where = { status: 'OPEN' };
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } }
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
    const { title, description, status, fields } = createFormSchema.parse(req.body);
    const user = req.user!;

    const form = await prisma.form.create({
      data: {
        title,
        description,
        status,
        createdById: user.userId,
        fields: {
          create: fields.map((f, i) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            order: i,
          })),
        },
      },
      include: { fields: true },
    });

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
        _count: { select: { submissions: true } }
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // RBAC check
    if (user.role === 'TEACHER' && form.createdById !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
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
    const { title, description, status, fields } = updateFormSchema.parse(req.body);

    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Form not found' });
    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const form = await prisma.form.update({
      where: { id },
      data: {
        title,
        description,
        status,
        fields: fields ? {
          deleteMany: {},
          create: fields.map((f, i) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            order: i,
          })),
        } : undefined,
      },
      include: { fields: true },
    });

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
      include: { fields: true },
    });

    if (!form || form.status !== 'OPEN') {
      return res.status(404).json({ error: 'Form not available' });
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
            value: String(value),
          })),
        },
      },
    });

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

    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form) return res.status(404).json({ error: 'Form not found' });
    if (user.role === 'TEACHER' && form.createdById !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        values: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

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
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.form.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
