import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/utils/errors';

const router: ReturnType<typeof Router> = Router();

// Validation schema
const createLeadSchema = z.object({
  coverLetter: z.string().optional(),
  resume: z.string().optional(),
  portfolio: z.string().optional(),
  expectedRate: z.string().optional(),
  availability: z.string().optional(),
});

const updateLeadStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONTACTED', 'IN_PROGRESS', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

// Submit lead (USER only)
router.post('/projects/:projectId/leads', authenticate, requireRole(['USER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const projectId = req.params.projectId;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.status !== 'PUBLISHED') {
      throw new ValidationError('Project is not accepting leads');
    }

    // Check if user already submitted a lead
    const existingLead = await prisma.lead.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: req.user!.id,
        },
      },
    });

    if (existingLead) {
      throw new ConflictError('You have already submitted a lead for this project');
    }

    const lead = await prisma.lead.create({
      data: {
        ...data,
        projectId,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Get my leads (USER)
router.get('/users/me/leads', authenticate, requireRole(['USER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { userId: req.user!.id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            type: true,
            revenueTier: true,
            status: true,
            provider: {
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
      data: leads,
    });
  } catch (error) {
    next(error);
  }
});

// Get leads for a project (PROVIDER - own projects only)
router.get('/projects/:projectId/leads', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Check if project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (req.user!.role !== 'ADMIN' && project.providerId !== req.user!.id) {
      throw new ForbiddenError('You can only view leads for your own projects');
    }

    const leads = await prisma.lead.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            email: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    next(error);
  }
});

// Update lead status (PROVIDER - own projects only)
router.patch('/leads/:id', authenticate, requireRole(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const data = updateLeadStatusSchema.parse(req.body);

    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Check if user owns the project
    if (req.user!.role !== 'ADMIN' && lead.project.providerId !== req.user!.id) {
      throw new ForbiddenError('You can only update leads for your own projects');
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

export default router;
