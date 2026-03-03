import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError } from '../../shared/utils/errors';

const router = Router();

// Validation schema
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.patch('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Get current user points and level info
router.get('/me/points', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        points: true,
        level: true,
        avgRating: true,
        reviewCount: true,
        officialCertifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const recentHistory = await prisma.userPoints.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actionType: true,
        points: true,
        description: true,
        relatedId: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...user,
        recentHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get a user's points and level info (public)
router.get('/:id/points', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        points: true,
        level: true,
        avgRating: true,
        reviewCount: true,
        officialCertifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
