import { Router } from 'express';
import { prisma } from '../../database/prisma/client';
import { authenticate, AuthRequest } from '../../shared/middleware/auth';

const router: ReturnType<typeof Router> = Router();

// 项目匹配评分函数
function calculateMatchScore(project: any, preference: any) {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. 技能匹配 (40%)
  if (preference.skills && preference.skills.length > 0 && project.skillsRequired) {
    const matchedSkills = project.skillsRequired.filter((skill: string) =>
      preference.skills.includes(skill)
    );
    const skillScore = (matchedSkills.length / project.skillsRequired.length) * 40;
    score += skillScore;
    if (matchedSkills.length > 0) {
      reasons.push('技能匹配');
    }
  } else {
    score += 20; // 无技能要求给基础分
  }
  
  // 2. 时间匹配 (20%)
  const timeMap: Record<string, number> = {
    '碎片': 4,
    '每天2h': 3,
    '每天4h': 2,
    '全职': 1,
  };
  
  if (project.duration) {
    const projectTime = timeMap[project.duration] || 2;
    const userTime = timeMap[preference.availableTime] || 2;
    if (userTime >= projectTime) {
      score += 20;
      reasons.push('时间充裕');
    }
  } else {
    score += 10;
  }
  
  // 3. 预算匹配 (15%)
  const budgetMap: Record<string, number> = {
    '0': 0,
    '500': 500,
    '1000': 1000,
    '5000+': 5000,
  };
  
  const userBudget = budgetMap[preference.budget] || 0;
  // 项目如果没有预算要求，或者用户预算足够，得满分
  if (!project.revenueTier || userBudget >= 1000) {
    score += 15;
    reasons.push('预算匹配');
  }
  
  // 4. 兴趣匹配 (15%)
  if (preference.interests && preference.interests.length > 0 && project.category) {
    const categoryInterestMap: Record<string, string[]> = {
      '小红书': ['流量', '内容'],
      '闲鱼': ['电商'],
      'TikTok': ['流量', '内容'],
      'YouTube': ['流量', '内容'],
      'AI代写': ['工具', '服务'],
      '短视频': ['流量', '内容'],
      '电商': ['电商'],
      '设计': ['服务', '工具'],
      '编程': ['工具'],
    };
    
    const projectInterests = categoryInterestMap[project.category] || [];
    const matchedInterests = projectInterests.filter((i: string) => 
      preference.interests.includes(i)
    );
    
    if (matchedInterests.length > 0) {
      score += 15;
      reasons.push('兴趣匹配');
    }
  }
  
  // 5. 评分加成 (10%)
  const avgRating = project.provider?.avgRating || 0;
  if (avgRating >= 4.5) {
    score += 10;
    reasons.push('高评分项目方');
  } else if (avgRating >= 4.0) {
    score += 5;
  }
  
  return {
    score: Math.round(score),
    reasons: reasons.length > 0 ? reasons : ['推荐项目'],
  };
}

// 获取推荐项目
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // 获取用户偏好
    const preference = await prisma.userPreference.findUnique({
      where: { userId },
    });
    
    // 获取已发布的项目
    const projects = await prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avgRating: true,
            reviewCount: true,
          },
        },
        _count: {
          select: {
            leads: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // 计算匹配分数并排序
    let scoredProjects = projects.map((project) => {
      const matchResult = calculateMatchScore(project, preference);
      return {
        ...project,
        matchScore: matchResult.score,
        matchReasons: matchResult.reasons,
      };
    });
    
    // 如果有偏好，按匹配度排序；否则按热门排序
    if (preference) {
      scoredProjects.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      scoredProjects.sort((a, b) => b.viewCount - a.viewCount);
    }
    
    // 分页
    const paginatedProjects = scoredProjects.slice(offset, offset + limit);
    
    res.json({
      success: true,
      data: {
        projects: paginatedProjects,
        total: scoredProjects.length,
        hasMore: offset + limit < scoredProjects.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取热门项目 (无需登录)
router.get('/popular', async (_req, res, next) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 10;
    
    const projects = await prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avgRating: true,
          },
        },
        _count: {
          select: {
            leads: true,
            reviews: true,
          },
        },
      },
      orderBy: [
        { viewCount: 'desc' },
        { featured: 'desc' },
      ],
      take: limit,
    });
    
    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// 获取精选项目 (编辑推荐)
router.get('/featured', async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { 
        status: 'PUBLISHED',
        featured: true,
      },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avgRating: true,
          },
        },
        _count: {
          select: {
            leads: true,
            reviews: true,
          },
        },
      },
      take: 6,
    });
    
    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
