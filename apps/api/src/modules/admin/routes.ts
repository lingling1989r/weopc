import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError, ForbiddenError } from '../../shared/utils/errors';

const router = Router();

// Validation schemas
const rejectProjectSchema = z.object({
  reason: z.string().min(10).max(500),
});

// Get pending projects (ADMIN only)
router.get(
  '/projects/pending',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const projects = await prisma.project.findMany({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'asc' },
        include: {
          provider: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: { leads: true },
          },
        },
      });

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all projects with status filter (ADMIN only)
router.get(
  '/projects',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            provider: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                avatar: true,
              },
            },
            _count: {
              select: { leads: true },
            },
          },
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        success: true,
        data: projects,
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
  }
);

// Approve project (ADMIN only)
router.post(
  '/projects/:id/approve',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (project.status !== 'PENDING_REVIEW') {
        throw new ValidationError('Only pending projects can be approved', []);
      }

      const updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: 'PUBLISHED',
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
        include: {
          provider: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: updatedProject,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reject project (ADMIN only)
router.post(
  '/projects/:id/reject',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const data = rejectProjectSchema.parse(req.body);

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (project.status !== 'PENDING_REVIEW') {
        throw new ValidationError('Only pending projects can be rejected', []);
      }

      const updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: 'REJECTED',
          rejectionReason: data.reason,
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
        include: {
          provider: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: updatedProject,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Invalid input', error.errors));
      } else {
        next(error);
      }
    }
  }
);

// Get admin stats (ADMIN only)
router.get(
  '/stats',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const [pendingCount, publishedCount, rejectedCount, totalUsers, totalProviders] = await Promise.all([
        prisma.project.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.project.count({ where: { status: 'PUBLISHED' } }),
        prisma.project.count({ where: { status: 'REJECTED' } }),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.user.count({ where: { role: 'PROVIDER' } }),
      ]);

      res.json({
        success: true,
        data: {
          projects: {
            pending: pendingCount,
            published: publishedCount,
            rejected: rejectedCount,
            total: pendingCount + publishedCount + rejectedCount,
          },
          users: {
            total: totalUsers,
            providers: totalProviders,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
