import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取政策资讯列表
router.get('/policy', async (req, res) => {
  try {
    const { category, city, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    if (category) where.category = category as string;
    if (city) where.city = city as string;
    
    const [items, total] = await Promise.all([
      prisma.policyNews.findMany({
        where,
        orderBy: { publishDate: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.policyNews.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取政策资讯失败' });
  }
});

// 获取政策资讯详情
router.get('/policy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.policyNews.findUnique({
      where: { id },
    });
    
    if (!item) {
      return res.status(404).json({ success: false, error: '政策资讯不存在' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取政策资讯详情失败' });
  }
});

// 获取活动赛事列表
router.get('/event', async (req, res) => {
  try {
    const { eventType, city, status, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    if (eventType) where.eventType = eventType as string;
    if (city) where.city = city as string;
    if (status) where.status = status as string;
    
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.event.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取活动赛事失败' });
  }
});

// 获取活动赛事详情
router.get('/event/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.event.findUnique({
      where: { id },
    });
    
    if (!item) {
      return res.status(404).json({ success: false, error: '活动赛事不存在' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取活动赛事详情失败' });
  }
});

export default router;
