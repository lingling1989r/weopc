import { Router, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';

const router: ReturnType<typeof Router> = Router();

// 可用的选项
const AVAILABLE_SKILLS = ['写作', '剪辑', '英文', '设计', '编程', '摄影', '配音', '运营', '推广', '客服'];
const AVAILABLE_TIMES = ['碎片', '每天2h', '每天4h', '全职'];
const AVAILABLE_BUDGETS = ['0', '500', '1000', '5000+'];
const AVAILABLE_INTERESTS = ['流量', '电商', '服务', '工具', '内容', '教育', '娱乐'];
const AVAILABLE_EXPERIENCES = ['新手', '有经验', '资深'];
const INCOME_GOALS = ['零花钱', '副业收入', '创业'];

// Validation schema
const preferenceSchema = z.object({
  skills: z.array(z.string()).optional(),
  availableTime: z.string().optional(),
  budget: z.string().optional(),
  interests: z.array(z.string()).optional(),
  experience: z.string().optional(),
  incomeGoal: z.string().optional(),
});

// Get current user preference
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    let preference = await prisma.userPreference.findUnique({
      where: { userId: req.user!.id },
    });

    // 如果没有偏好设置，返回默认值
    if (!preference) {
      preference = null;
    }

    res.json({
      success: true,
      data: preference,
      options: {
        skills: AVAILABLE_SKILLS,
        availableTimes: AVAILABLE_TIMES,
        budgets: AVAILABLE_BUDGETS,
        interests: AVAILABLE_INTERESTS,
        experiences: AVAILABLE_EXPERIENCES,
        incomeGoals: INCOME_GOALS,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update current user preference
router.put('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = preferenceSchema.parse(req.body);

    // 构建 update 数据，只包含有值的字段
    const updateData: any = {};
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.availableTime !== undefined) updateData.availableTime = data.availableTime;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.interests !== undefined) updateData.interests = data.interests;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.incomeGoal !== undefined) updateData.incomeGoal = data.incomeGoal;

    // 检查是否已存在
    const existing = await prisma.userPreference.findUnique({
      where: { userId: req.user!.id },
    });

    const preference = existing
      ? await prisma.userPreference.update({
          where: { userId: req.user!.id },
          data: updateData,
        })
      : await prisma.userPreference.create({
          data: {
            userId: req.user!.id,
            skills: data.skills || [],
            availableTime: data.availableTime || '碎片',
            budget: data.budget || '0',
            interests: data.interests || [],
            experience: data.experience || '新手',
            incomeGoal: data.incomeGoal || '零花钱',
          },
        });

    res.json({
      success: true,
      data: preference,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: error.errors,
      });
    } else {
      next(error);
    }
  }
});

// Get options for preference form
router.get('/options', async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        skills: AVAILABLE_SKILLS,
        availableTimes: AVAILABLE_TIMES,
        budgets: AVAILABLE_BUDGETS,
        interests: AVAILABLE_INTERESTS,
        experiences: AVAILABLE_EXPERIENCES,
        incomeGoals: INCOME_GOALS,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
