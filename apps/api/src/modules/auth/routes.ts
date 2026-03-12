import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../database/prisma/client';
import { config } from '../../config';
import { ValidationError, UnauthorizedError, ConflictError } from '../../shared/utils/errors';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';
import { awardPoints, checkInviterDailyCap } from '../points/service';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30),
  displayName: z.string().optional(),
  role: z.enum(['USER', 'PROVIDER']).default('USER'),
  invitationCode: z.string().optional(), // For PROVIDER role (required)
  inviteCode: z.string().optional(), // For invite points (optional, any user can share)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const jwtSecret: Secret = config.jwt.secret;
const jwtSignOptions: SignOptions = {
  expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
};

// Register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if PROVIDER role requires invitation code
    if (data.role === 'PROVIDER' && !data.invitationCode) {
      throw new ValidationError('邀请码是必需的', [
        {
          code: 'custom',
          message: '注册为 Provider 需要邀请码',
          path: ['invitationCode'],
        },
      ]);
    }

    // Validate invitation code for PROVIDER
    if (data.role === 'PROVIDER' && data.invitationCode) {
      const invitationCode = await prisma.invitationCode.findUnique({
        where: { code: data.invitationCode },
      });

      if (!invitationCode) {
        throw new ValidationError('邀请码不存在', [
          {
            code: 'custom',
            message: '邀请码无效',
            path: ['invitationCode'],
          },
        ]);
      }

      if (invitationCode.status !== 'ACTIVE') {
        throw new ValidationError('邀请码已被使用或已过期', [
          {
            code: 'custom',
            message: '邀请码已被使用或已过期',
            path: ['invitationCode'],
          },
        ]);
      }

      if (invitationCode.expiresAt && new Date() > invitationCode.expiresAt) {
        // Mark as expired
        await prisma.invitationCode.update({
          where: { id: invitationCode.id },
          data: { status: 'EXPIRED' },
        });
        throw new ValidationError('邀请码已过期', [
          {
            code: 'custom',
            message: '邀请码已过期',
            path: ['invitationCode'],
          },
        ]);
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new ConflictError('Email or username already exists');
    }

    const providerInvitationCode = data.role === 'PROVIDER' && data.invitationCode
      ? await prisma.invitationCode.findUnique({
          where: { code: data.invitationCode },
          select: { id: true },
        })
      : null;

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        username: data.username,
        displayName: data.displayName || data.username,
        role: data.role,
        status: 'ACTIVE', // For MVP, auto-activate
        emailVerified: true, // For MVP, skip email verification
        invitationCodeId: providerInvitationCode?.id,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Mark invitation code as used if PROVIDER
    if (data.role === 'PROVIDER' && data.invitationCode) {
      await prisma.invitationCode.update({
        where: { code: data.invitationCode },
        data: {
          status: 'USED',
          usedAt: new Date(),
          inviteeUserId: user.id,
        },
      });
    }

    // V1: Award signup bonus (+20) and handle invite points
    const pointsAwarded: { signup: number; invite: number } = { signup: 0, invite: 0 };
    
    // Award signup bonus to new user
    const signupResult = await awardPoints(
      user.id,
      'SIGNUP_BONUS',
      'Welcome! Thanks for joining us',
      user.id,
      'signup_bonus'
    );
    if (signupResult.success) {
      pointsAwarded.signup = signupResult.pointsAwarded;
    }

    // Handle invite code (different from PROVIDER invitation code)
    if (data.inviteCode) {
      const inviteCodeRecord = await prisma.invitationCode.findFirst({
        where: {
          code: data.inviteCode,
          status: 'ACTIVE',
          generatedById: { not: user.id },
        },
      });

      if (inviteCodeRecord) {
        // Check inviter hasn't hit daily cap
        const isAtCap = await checkInviterDailyCap(inviteCodeRecord.generatedById);

        // Link the new user to the inviter and record the invitee on the code.
        // Do not mark the code as USED here; invite codes for points stay ACTIVE unless
        // the same code is also used as a provider registration invitation code.
        await prisma.$transaction([
          prisma.invitationCode.update({
            where: { id: inviteCodeRecord.id },
            data: {
              inviteeUserId: user.id,
            },
          }),
          prisma.user.update({
            where: { id: user.id },
            data: {
              inviterUserId: inviteCodeRecord.generatedById,
            },
          }),
        ]);

        // Award invitee bonus (+10) if inviter hasn't hit daily cap
        if (!isAtCap) {
          const inviteeResult = await awardPoints(
            user.id,
            'INVITE_INVITEE',
            'Thanks for joining via an invitation',
            inviteCodeRecord.id,
            'invite_invitee'
          );
          if (inviteeResult.success) {
            pointsAwarded.invite = inviteeResult.pointsAwarded;
          }

          // Award inviter bonus (+30)
          const inviterResult = await awardPoints(
            inviteCodeRecord.generatedById,
            'INVITE_INVITER',
            `${user.username || 'Someone'} joined using your invite`,
            inviteCodeRecord.id,
            'invite_inviter'
          );
          if (inviterResult.success) {
            pointsAwarded.invite += inviterResult.pointsAwarded;
          }
        }
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      jwtSignOptions
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        pointsAwarded,
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

// Login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      jwtSignOptions
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          status: user.status,
        },
        token,
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

// Get current user
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
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError();
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
