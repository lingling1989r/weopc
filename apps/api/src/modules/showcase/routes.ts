import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// 加载特色项目数据
let featuredProjects: any[] = [];

const loadFeaturedProjects = () => {
  try {
    const dataPath = path.join(__dirname, '../../data/featured-projects.json');
    const data = fs.readFileSync(dataPath, 'utf-8');
    featuredProjects = JSON.parse(data);
  } catch (error) {
    console.error('Failed to load featured projects:', error);
    featuredProjects = [];
  }
};

// Initialize on startup
loadFeaturedProjects();

// OPC相关的政策内容
const opc_policies = [
  {
    id: 'policy_1',
    title: '国务院支持副业创业发展指导意见',
    description: '国家层面政策支持，鼓励灵活就业和副业创业发展',
    category: '国家政策',
    date: '2024-01-01',
    impact: '重大利好'
  },
  {
    id: 'policy_2',
    title: '灵活用工行业规范管理办法',
    description: '规范灵活用工市场，保护劳动者权益',
    category: '行业规范',
    date: '2024-02-01',
    impact: '市场规范'
  },
  {
    id: 'policy_3',
    title: '创业者税收优惠政策',
    description: '副业创业者可享受相关税收优惠',
    category: '税收优惠',
    date: '2024-03-01',
    impact: '经济支持'
  },
  {
    id: 'policy_4',
    title: '个体经营户便利化注册',
    description: '简化个体经营户注册流程，方便副业经营者合法运营',
    category: '制度创新',
    date: '2024-04-01',
    impact: '便利化'
  }
];

// 案例类别
const case_categories = [
  { id: 'cat_1', name: '小红书', color: '#ff2442', count: 4 },
  { id: 'cat_2', name: '闲鱼', color: '#5eb3e6', count: 2 },
  { id: 'cat_3', name: '蓝海项目', color: '#6fbf73', count: 9 },
  { id: 'cat_4', name: '短视频', color: '#7fdbdf', count: 1 },
  { id: 'cat_5', name: 'AI视频', color: '#9165e8', count: 1 },
  { id: 'cat_6', name: 'YouTube', color: '#ff0000', count: 1 },
  { id: 'cat_7', name: '接单', color: '#ffa500', count: 1 },
  { id: 'cat_8', name: '餐饮', color: '#cd5c5c', count: 1 }
];

// 获取广场页面数据（政策+热门项目）
router.get('/homepage', (req, res) => {
  try {
    // 获取热门项目（前6个）
    const featured = featuredProjects
      .filter(p => p.featured)
      .slice(0, 6);

    // 获取最新项目（前8个）
    const latest = featuredProjects.slice(0, 8);

    // 获取按分类分组的项目
    const byCategory: { [key: string]: any[] } = {};
    featuredProjects.forEach(project => {
      if (!byCategory[project.category]) {
        byCategory[project.category] = [];
      }
      byCategory[project.category].push(project);
    });

    return res.json({
      success: true,
      data: {
        policies: opc_policies,
        featured_projects: featured,
        latest_projects: latest,
        project_categories: case_categories,
        projects_by_category: byCategory,
        stats: {
          total_projects: featuredProjects.length,
          total_categories: Object.keys(byCategory).length,
          total_policies: opc_policies.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取数据失败'
      }
    });
  }
});

// 获取热门项目列表
router.get('/featured', (req, res) => {
  try {
    const featured = featuredProjects.filter(p => p.featured);
    return res.json({
      success: true,
      data: featured,
      meta: {
        total: featured.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取热门项目失败'
      }
    });
  }
});

// 获取所有项目
router.get('/all', (req, res) => {
  try {
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;

    let projects = featuredProjects;

    if (category) {
      projects = projects.filter(p => p.category === category);
    }

    if (difficulty) {
      projects = projects.filter(p => p.difficulty === difficulty);
    }

    return res.json({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取项目列表失败'
      }
    });
  }
});

// 获取政策信息
router.get('/policies', (req, res) => {
  try {
    return res.json({
      success: true,
      data: opc_policies,
      meta: {
        total: opc_policies.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取政策信息失败'
      }
    });
  }
});

// 获取项目分类统计
router.get('/categories', (req, res) => {
  try {
    return res.json({
      success: true,
      data: case_categories,
      meta: {
        total: case_categories.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取分类信息失败'
      }
    });
  }
});

// 获取单个项目详情
router.get('/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    const project = featuredProjects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '项目不存在'
        }
      });
    }

    return res.json({
      success: true,
      data: project,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: '获取项目详情失败'
      }
    });
  }
});

export default router;
