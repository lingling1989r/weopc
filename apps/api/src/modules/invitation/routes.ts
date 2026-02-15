import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../database/prisma/client';
import { authenticate, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../shared/utils/errors';

const router = Router();

// Constants
const INVITATION_CODE_LENGTH = 8;
const INVITATION_CODE_EXPIRY_DAYS = 30;
const MIN_POINTS_TO_GENERATE = 100;

// Validation schemas
const generateInvitationSchema = z.object({
  count: z.number().int().min(1).max(10).default(1),
});

const validateInvitationSchema = z.object({
  code: z.string().min(1),
});

// Generate invitation code
router.post(
  '/generate',
  authenticate,
  requireRole(['ADMIN', 'PROVIDER']),
  async (req: AuthRequest, res, next) => {
    try {
      const data = generateInvitationSchema.parse(req.body);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Check permissions
      if (userRole === 'PROVIDER') {
        // Provider must have enough points
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { points: true },
        });

        if (!user || user.points < MIN_POINTS_TO_GENERATE) {
          throw new ForbiddenError(
            `需要至少 ${MIN_POINTS_TO_GENERATE} 积分才能生成邀请码`
          );
        }
      }

      // Generate invitation codes
      const codes = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_CODE_EXPIRY_DAYS);

      for (let i = 0; i < data.count; i++) {
        const code = crypto
          .randomBytes(INVITATION_CODE_LENGTH / 2)
          .toString('hex')
          .toUpperCase();

        const invitationCode = await prisma.invitationCode.create({
          data: {
            code,
            status: 'ACTIVE',
            generatedById: userId,
            expiresAt,
          },
          select: {
            id: true,
            code: true,
            status: true,
            expiresAt: true,
            createdAt: true,
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

// Validate invitation code
router.post('/validate', async (req, res, next) => {
  try {
    const data = validateInvitationSchema.parse(req.body);

    const invitationCode = await prisma.invitationCode.findUnique({
      where: { code: data.code },
      select: {
        id: true,
        code: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invitationCode) {
      throw new NotFoundError('邀请码不存在');
    }

    // Check if code is active
    if (invitationCode.status !== 'ACTIVE') {
      throw new ValidationError('邀请码已被使用或已过期', []);
    }

    // Check if code has expired
    if (invitationCode.expiresAt && new Date() > invitationCode.expiresAt) {
      // Mark as expired
      await prisma.invitationCode.update({
        where: { id: invitationCode.id },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('邀请码已过期', []);
    }

    res.json({
      success: true,
      data: {
        valid: true,
        code: invitationCode.code,
        expiresAt: invitationCode.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// Get my invitation codes (ADMIN and PROVIDER only)
router.get(
  '/my',
  authenticate,
  requireRole(['ADMIN', 'PROVIDER']),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;

      const codes = await prisma.invitationCode.findMany({
        where: { generatedById: userId },
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: codes,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
