import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createEventSchema = z.object({
  attemptId: z.string().uuid(),
  eventType: z.enum(['FULLSCREEN_EXIT', 'TAB_SWITCH']),
});

// POST /api/events — STUDENT only
router.post(
  '/',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { attemptId, eventType } = createEventSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify the attempt belongs to the student and is still active
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.studentId !== userId) {
      res.status(403).json({ error: 'Not your attempt' });
      return;
    }

    if (attempt.finishedAt) {
      res.status(400).json({ error: 'Attempt already finished' });
      return;
    }

    // Create suspicious event and increment counter atomically
    const [event] = await prisma.$transaction([
      prisma.suspiciousEvent.create({
        data: {
          attemptId,
          eventType,
        },
      }),
      prisma.attempt.update({
        where: { id: attemptId },
        data: {
          suspiciousEventsCount: { increment: 1 },
        },
      }),
    ]);

    res.status(201).json({
      id: event.id,
      attemptId: event.attemptId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
    });
  })
);

export default router;
