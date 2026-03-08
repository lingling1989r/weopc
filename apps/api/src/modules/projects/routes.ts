import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, optionalAuthenticate, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError, ForbiddenError } from '../../shared/utils/errors';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  shortDescription: z.string().max(500).optional(),
  type: z.literal('TOOLBOX').default('TOOLBOX'),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  revenueTier: z.enum(['TIER_0_1K', 'TIER_1K_5K', 'TIER_5K_10K', 'TIER_10K_30K', 'TIER_30K_50K', 'TIER_50K_100K', 'TIER_100K_PLUS']),
  executionReq: z.enum(['REMOTE', 'ONSITE', 'HYBRID', 'FLEXIBLE']),
  duration: z.string().optional(),
  skillsRequired: z.array(z.string()).default([]),
  experienceLevel: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactWechat: z.string().optional(),
});

// Valid enum values
const VALID_PROJECT_TYPES = ['TOOLBOX'];
const VALID_REVENUE_TIERS = ['TIER_0_1K', 'TIER_1K_5K', 'TIER_5K_10K', 'TIER_10K_30K', 'TIER_30K_50K', 'TIER_50K_100K', 'TIER_100K_PLUS'];
const VALID_EXECUTION_REQS = ['REMOTE', 'ONSITE', 'HYBRID', 'FLEXIBLE'];

// List projects (public)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Validate enum query parameters
    if (req.query.type && !VALID_PROJECT_TYPES.includes(req.query.type as string)) {
      throw new ValidationError('Invalid project type', [
        {
          code: 'invalid_enum_value',
          message: `type must be one of: ${VALID_PROJECT_TYPES.join(', ')}`,
          path: ['type'],
        },
      ]);
    }

    if (req.query.revenueTier && !VALID_REVENUE_TIERS.includes(req.query.revenueTier as string)) {
      throw new ValidationError('Invalid revenue tier', [
        {
          code: 'invalid_enum_value',
          message: `revenueTier must be one of: ${VALID_REVENUE_TIERS.join(', ')}`,
          path: ['revenueTier'],
        },
      ]);
    }

    if (req.query.executionReq && !VALID_EXECUTION_REQS.includes(req.query.executionReq as string)) {
      throw new ValidationError('Invalid execution requirement', [
        {
          code: 'invalid_enum_value',
          message: `executionReq must be one of: ${VALID_EXECUTION_REQS.join(', ')}`,
          path: ['executionReq'],
        },
      ]);
    }

    // Filters
    const where: any = { status: 'PUBLISHED' };

    if (req.query.type) where.type = req.query.type;
    if (req.query.category) where.category = req.query.category;
    if (req.query.revenueTier) where.revenueTier = req.query.revenueTier;
    if (req.query.executionReq) where.executionReq = req.query.executionReq;
    if (req.query.city) where.city = req.query.city;
    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search as string, mode: 'insensitive' } },
        { description: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          provider: {
            select: {
              id: true,
              username: true,
              displayName: true,
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
});

// Get my projects (PROVIDER and ADMIN only) — must be before /:id to avoid shadowing
router.get('/my', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // ADMIN can see all projects, PROVIDER can only see their own
    const where: any = userRole === 'ADMIN' ? {} : { providerId: userId };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
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
});

// Get project by ID (public, but contact info requires auth)
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bio: true,
          },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Increment view count
    await prisma.project.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } },
    });

    // Hide contact info for unauthenticated users
    const data: any = { ...project };
    if (!req.user) {
      data.contactEmail = null;
      data.contactPhone = null;
      data.contactWechat = null;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Create project (PROVIDER only)
router.post('/', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);

    // Set status based on role
    const status = req.user!.role === 'ADMIN' ? 'PUBLISHED' : 'PENDING_REVIEW';

    const project = await prisma.project.create({
      data: {
        ...data,
        providerId: req.user!.id,
        status,
      },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Update project (PROVIDER only, own projects)
router.patch('/:id', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check ownership (unless admin)
    if (req.user!.role !== 'ADMIN' && project.providerId !== req.user!.id) {
      throw new ForbiddenError('You can only update your own projects');
    }

    const data = createProjectSchema.partial().parse(req.body);

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
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
});

// Delete project (PROVIDER only, own projects)
router.delete('/:id', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check ownership (unless admin)
    if (req.user!.role !== 'ADMIN' && project.providerId !== req.user!.id) {
      throw new ForbiddenError('You can only delete your own projects');
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
