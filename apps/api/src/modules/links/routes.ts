import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma/client';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';

const router = Router();

// 创建追踪链接
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      originalUrl: z.string().url(),
      name: z.string().optional(),
      source: z.string().optional(),
    });
    
    const { originalUrl, name, source } = schema.parse(req.body);
    const userId = req.user!.id;
    
    // 生成短码
    const shortCode = Math.random().toString(36).substring(2, 10);
    
    const link = await prisma.link.create({
      data: {
        userId,
        originalUrl,
        shortCode,
        name,
        source,
      },
    });
    
    return res.json({
      success: true,
      data: {
        ...link,
        trackingUrl: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/t/${link.shortCode}`,
      },
    });
  } catch (error: any) {
    console.error('Create link error:', error);
    return res.status(500).json({ success: false, error: '创建链接失败' });
  }
});

// 获取用户的链接列表
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    
    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          clickLogs: {
            orderBy: { clickedAt: 'desc' },
            take: 100,
          },
        },
      }),
      prisma.link.count({ where: { userId } }),
    ]);
    
    return res.json({
      success: true,
      data: links.map(link => ({
        ...link,
        trackingUrl: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/t/${link.shortCode}`,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('List links error:', error);
    return res.status(500).json({ success: false, error: '获取链接列表失败' });
  }
});

// 获取链接详情
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const link = await prisma.link.findFirst({
      where: { id, userId },
      include: {
        clickLogs: {
          orderBy: { clickedAt: 'desc' },
          take: 500,
        },
      },
    });
    
    if (!link) {
      return res.status(404).json({ success: false, error: '链接不存在' });
    }
    
    // 统计今日点击
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClicks = await prisma.linkClick.count({
      where: {
        linkId: id,
        clickedAt: { gte: today },
      },
    });
    
    return res.json({
      success: true,
      data: {
        ...link,
        trackingUrl: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/t/${link.shortCode}`,
        todayClicks,
      },
    });
  } catch (error: any) {
    console.error('Get link error:', error);
    return res.status(500).json({ success: false, error: '获取链接详情失败' });
  }
});

// 删除链接
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await prisma.link.deleteMany({
      where: { id, userId },
    });
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete link error:', error);
    return res.status(500).json({ success: false, error: '删除链接失败' });
  }
});

// 公开的跳转接口
router.get('/t/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const link = await prisma.link.findUnique({
      where: { shortCode },
    });
    
    if (!link) {
      return res.status(404).send('链接不存在');
    }
    
    // 记录点击
    await prisma.linkClick.create({
      data: {
        linkId: link.id,
        referer: req.get('Referer') || null,
        userAgent: req.get('User-Agent') || null,
        ip: req.ip || null,
      },
    });
    
    // 更新点击数
    await prisma.link.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    });
    
    // 跳转到原始链接
    return res.redirect(link.originalUrl);
  } catch (error: any) {
    console.error('Redirect error:', error);
    return res.status(500).send('服务器错误');
  }
});

export default router;
