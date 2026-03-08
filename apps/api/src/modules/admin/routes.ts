import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../database/prisma/client';
import { authenticate, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError } from '../../shared/utils/errors';

const router: ReturnType<typeof Router> = Router();
const ADMIN_INVITATION_CODE_LENGTH = 8;
const ADMIN_INVITATION_CODE_EXPIRY_DAYS = 30;

// Validation schemas
const rejectProjectSchema = z.object({
  reason: z.string().min(10).max(500),
});

const certifyUserSchema = z.object({
  certified: z.boolean(),
});

const createInvitationCodesSchema = z.object({
  count: z.number().int().min(1).max(20).default(1),
});

// Get pending projects (ADMIN only)
router.get(
  '/projects/pending',
  authenticate,
  requireRole(['ADMIN']),
  async (_req: AuthRequest, res, next) => {
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

// Get project detail (ADMIN only)
router.get(
  '/projects/:id',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          provider: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatar: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: { leads: true, reviews: true, comments: true },
          },
        },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      res.json({
        success: true,
        data: project,
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
          rejectionReason: null,
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
  async (_req: AuthRequest, res, next) => {
    try {
      const [pendingCount, publishedCount, rejectedCount, totalUsers, totalProviders, activeInvitationCount] = await Promise.all([
        prisma.project.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.project.count({ where: { status: 'PUBLISHED' } }),
        prisma.project.count({ where: { status: 'REJECTED' } }),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.user.count({ where: { role: 'PROVIDER' } }),
        prisma.invitationCode.count({ where: { status: 'ACTIVE' } }),
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
          invitations: {
            active: activeInvitationCount,
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

// List invitation codes (ADMIN only)
router.get(
  '/invitation-codes',
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

      const [codes, total] = await Promise.all([
        prisma.invitationCode.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            status: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
            generatedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
            usedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
          },
        }),
        prisma.invitationCode.count({ where }),
      ]);

      res.json({
        success: true,
        data: codes,
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

// Generate invitation codes (ADMIN only)
router.post(
  '/invitation-codes',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const data = createInvitationCodesSchema.parse(req.body);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ADMIN_INVITATION_CODE_EXPIRY_DAYS);

      const codes = [];

      for (let index = 0; index < data.count; index += 1) {
        const code = crypto
          .randomBytes(ADMIN_INVITATION_CODE_LENGTH / 2)
          .toString('hex')
          .toUpperCase();

        const invitationCode = await prisma.invitationCode.create({
          data: {
            code,
            status: 'ACTIVE',
            generatedById: req.user!.id,
            expiresAt,
          },
          select: {
            id: true,
            code: true,
            status: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
            generatedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
            usedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
          },
        });

        codes.push(invitationCode);
      }

      res.status(201).json({
        success: true,
        data: {
          codes,
          count: codes.length,
        },
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

// Disable invitation code (ADMIN only)
router.patch(
  '/invitation-codes/:id/disable',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res, next) => {
    try {
      const invitationCode = await prisma.invitationCode.findUnique({
        where: { id: req.params.id },
      });

      if (!invitationCode) {
        throw new NotFoundError('Invitation code not found');
      }

      if (invitationCode.status !== 'ACTIVE') {
        throw new ValidationError('Only active invitation codes can be disabled', []);
      }

      const updatedCode = await prisma.invitationCode.update({
        where: { id: req.params.id },
        data: { status: 'REVOKED' },
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
          generatedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
          usedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: updatedCode,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
