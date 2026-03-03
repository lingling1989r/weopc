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

const certifyUserSchema = z.object({
  certified: z.boolean(),
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

// Get all users with pagination and level filter (ADMIN only)
router.get(
  '/users',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const level = req.query.level as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (level) where.level = level;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatar: true,
            role: true,
            status: true,
            level: true,
            points: true,
            avgRating: true,
            reviewCount: true,
            officialCertifiedAt: true,
            certifiedBy: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
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

// Get user detail with points history (ADMIN only)
router.get(
  '/users/:id',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          status: true,
          level: true,
          points: true,
          avgRating: true,
          reviewCount: true,
          officialCertifiedAt: true,
          certifiedBy: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const pointsHistory = await prisma.userPoints.findMany({
        where: { userId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
          pointsHistory,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Certify / revoke official certification (ADMIN only)
router.patch(
  '/users/:id/certify',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const data = certifyUserSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, level: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Certifying promotes NORMAL -> OFFICIAL; revoking demotes OFFICIAL -> NORMAL
      let newLevel = user.level;
      if (data.certified && user.level === 'NORMAL') {
        newLevel = 'OFFICIAL';
      } else if (!data.certified && user.level === 'OFFICIAL') {
        newLevel = 'NORMAL';
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          officialCertifiedAt: data.certified ? new Date() : null,
          certifiedBy: data.certified ? req.user!.id : null,
          level: newLevel,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          level: true,
          points: true,
          avgRating: true,
          reviewCount: true,
          officialCertifiedAt: true,
          certifiedBy: true,
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
  }
);

export default router;
