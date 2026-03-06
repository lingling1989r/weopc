import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../database/prisma/client';
import { config } from '../../config';
import { ValidationError, UnauthorizedError, ConflictError } from '../../shared/utils/errors';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30),
  displayName: z.string().optional(),
  role: z.enum(['USER', 'PROVIDER']).default('USER'),
  invitationCode: z.string().optional(),
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
        invitationCodeId: data.role === 'PROVIDER' ? (await prisma.invitationCode.findUnique({
          where: { code: data.invitationCode! },
          select: { id: true },
        }))?.id : undefined,
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
        },
      });
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
