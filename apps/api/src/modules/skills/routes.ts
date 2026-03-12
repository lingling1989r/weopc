import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/utils/errors';
import { awardPoints } from '../points/service';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const createSkillSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  content: z.string().max(50000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).max(20).default([]),
  pricePoints: z.number().int().min(0).default(0),
  reviewerContact: z.string().max(200).optional(),
});

const updateSkillSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  content: z.string().max(50000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).max(20).optional(),
  pricePoints: z.number().int().min(0).optional(),
  reviewerContact: z.string().max(200).optional(),
});

const skillQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
});

// List published skills (public)
router.get('/', async (req, res, next) => {
  try {
    const query = skillQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = {
      reviewStatus: 'APPROVED',
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    res.json({
      success: true,
      data: skills,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid query params', error.errors));
    } else {
      next(error);
    }
  }
});

// Get current user's skills
// Keep static /my/* routes before /:id so they are not matched by the param route.
router.get('/my/list', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const skills = await prisma.skill.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's purchased skills
router.get('/my/purchased', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const redemptions = await prisma.skillRedemption.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: redemptions.map((r) => ({
        ...r.skill,
        redeemedAt: r.createdAt,
        costPoints: r.costPoints,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Create skill (authenticated)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createSkillSchema.parse(req.body);
    const userId = req.user!.id;

    const skill = await prisma.skill.create({
      data: {
        ...data,
        ownerUserId: userId,
        reviewStatus: 'DRAFT',
      },
    });

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Update skill (owner only, DRAFT or REJECTED status)
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateSkillSchema.parse(req.body);
    const userId = req.user!.id;

    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      throw new NotFoundError('Skill not found');
    }

    if (existingSkill.ownerUserId !== userId) {
      throw new ForbiddenError('You can only edit your own skills');
    }

    if (existingSkill.reviewStatus === 'PENDING') {
      throw new ValidationError('Cannot edit skill while pending review', []);
    }

    const skill = await prisma.skill.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: skill,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Submit skill for review (owner only)
router.post('/:id/submit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const skill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    if (skill.ownerUserId !== userId) {
      throw new ForbiddenError('You can only submit your own skills');
    }

    if (skill.reviewStatus === 'PENDING') {
      throw new ValidationError('Skill is already pending review', []);
    }

    if (skill.reviewStatus === 'APPROVED') {
      throw new ValidationError('Approved skills cannot be resubmitted', []);
    }

    // Update status and award points
    await prisma.skill.update({
      where: { id },
      data: {
        reviewStatus: 'PENDING',
      },
    });

    // Award points for submission (idempotent)
    await awardPoints(
      userId,
      'SKILL_SUBMIT',
      `Submitted skill "${skill.title}" for review`,
      id,
      'skill_submit'
    );

    res.json({
      success: true,
      message: 'Skill submitted for review. You earned 10 points!',
    });
  } catch (error) {
    next(error);
  }
});

// Redeem/purchase skill (authenticated)
router.post('/:id/redeem', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const skill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    if (skill.reviewStatus !== 'APPROVED') {
      throw new ValidationError('Only approved skills can be redeemed', []);
    }

    // Check if already redeemed
    const existingRedemption = await prisma.skillRedemption.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: id,
        },
      },
    });

    if (existingRedemption) {
      throw new ConflictError('You have already redeemed this skill');
    }

    // Check user has enough points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user || user.points < skill.pricePoints) {
      throw new ForbiddenError(`Insufficient points. Need ${skill.pricePoints} points.`);
    }

    // If skill is free, just create redemption record
    if (skill.pricePoints === 0) {
      await prisma.skillRedemption.create({
        data: {
          userId,
          skillId: id,
          costPoints: 0,
        },
      });

      // Increment download count
      await prisma.skill.update({
        where: { id },
        data: {
          downloadCount: { increment: 1 },
        },
      });

      res.json({
        success: true,
        message: 'Skill redeemed successfully (free)',
      });
      return;
    }

    // Deduct points and create redemption
    await prisma.$transaction([
      prisma.skillRedemption.create({
        data: {
          userId,
          skillId: id,
          costPoints: skill.pricePoints,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          points: { decrement: skill.pricePoints },
        },
      }),
      prisma.userPoints.create({
        data: {
          userId,
          actionType: 'SKILL_REDEEM',
          points: -skill.pricePoints,
          description: `Redeemed skill "${skill.title}"`,
          relatedId: id,
          refType: 'skill_redeem',
        },
      }),
      prisma.skill.update({
        where: { id },
        data: {
          downloadCount: { increment: 1 },
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Skill redeemed! You spent ${skill.pricePoints} points.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Get skill by ID (public for approved, owner can see all statuses)
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    // Check access: approved = public, otherwise only owner can view
    if (skill.reviewStatus !== 'APPROVED') {
      if (!userId || skill.ownerUserId !== userId) {
        throw new ForbiddenError('You do not have permission to view this skill');
      }
    }

    // Check if user has redeemed this skill
    let hasRedeemed = false;
    if (userId) {
      const redemption = await prisma.skillRedemption.findUnique({
        where: {
          userId_skillId: {
            userId,
            skillId: id,
          },
        },
      });
      hasRedeemed = !!redemption;
    }

    res.json({
      success: true,
      data: {
        ...skill,
        hasRedeemed,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
