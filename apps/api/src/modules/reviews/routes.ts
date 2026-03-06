import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError } from '../../shared/utils/errors';
import { processReviewPoints } from '../points/service';

const router: ReturnType<typeof Router> = Router();

const createReviewSchema = z.object({
  type: z.enum(['PROJECT_REVIEW', 'USER_REVIEW']),
  targetUserId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(2000),
});

// Create a review (authenticated)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createReviewSchema.parse(req.body);
    const reviewerId = req.user!.id;

    // Prevent self-review
    if (data.targetUserId === reviewerId) {
      throw new ValidationError('Cannot review yourself', []);
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    // If PROJECT_REVIEW, verify project exists
    if (data.type === 'PROJECT_REVIEW' && data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: { id: true },
      });
      if (!project) {
        throw new NotFoundError('Project not found');
      }
    }

    const review = await prisma.review.create({
      data: {
        type: data.type,
        reviewerId,
        targetUserId: data.targetUserId,
        projectId: data.projectId,
        rating: data.rating,
        title: data.title,
        content: data.content,
      },
      include: {
        reviewer: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        targetUser: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    // Trigger points / level update (non-blocking — errors are swallowed to not fail the request)
    processReviewPoints(data.targetUserId, data.rating, review.id).catch(() => {});

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// List reviews for a user (public)
router.get('/users/:userId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { targetUserId: req.params.userId, published: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
      }),
      prisma.review.count({
        where: { targetUserId: req.params.userId, published: true },
      }),
    ]);

    res.json({
      success: true,
      data: reviews,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
