import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
} from '../services/authService';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload = { userId: user.id, role: user.role as 'ADMIN' | 'TEACHER' | 'STUDENT' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await saveRefreshToken(user.id, refreshToken, prisma);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken({ userId: payload.userId, role: payload.role });
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, role: payload.role });

    const decoded = jwt.decode(newRefreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Rotate: revoke old token, issue new one
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: { userId: payload.userId, token: newRefreshToken, expiresAt },
      }),
    ]);

    res.json({ accessToken, refreshToken: newRefreshToken });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = logoutSchema.parse(req.body);
    await revokeRefreshToken(refreshToken, prisma);
    res.json({ message: 'Logged out successfully' });
  })
);

export default router;
