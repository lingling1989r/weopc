# WEOPC.ORG 首页广场功能 - PRD 更新

## 功能概述

在原有MVP基础上，增强首页"广场"功能，展示：
1. **OPC相关政策** - 国家和地方支持副业创业的政策信息
2. **热门案例** - 精选的成功副业项目案例（来自生财有术资源）
3. **项目分类** - 按平台和类型分类的副业机会
4. **最新项目** - 平台上最新发布的项目

---

## 新增功能详情

### 1. 政策支持板块 (PoliciesSection)

**位置**: 首页 Hero Section 下方

**展示内容**:
- 国务院支持副业创业发展指导意见
- 灵活用工行业规范管理办法
- 创业者税收优惠政策
- 个体经营户便利化注册

**设计**:
- 4列网格布局（响应式）
- 每个政策卡片显示：分类标签、标题、描述、日期、影响等级
- 蓝色主题背景（bg-blue-50）

**数据来源**:
- 后端 `/api/v1/showcase/policies` 端点
- 静态数据存储在 `apps/api/src/modules/showcase/routes.ts`

---

### 2. 热门案例板块 (FeaturedCasesSection)

**位置**: 政策板块下方

**展示内容**:
- 从resources目录提取的20个副业项目案例
- 按featured标记筛选，展示5个热门案例
- 每个案例包含：
  - 项目标题
  - 分类（小红书、闲鱼、蓝海项目等）
  - 难度等级（简单、中等、进阶）
  - 项目描述
  - 标签（最多显示3个）
  - 发布日期
  - 预期收益（如有）

**设计**:
- 3列网格布局（响应式）
- 卡片设计，支持hover效果
- 分类标签使用不同颜色
- 底部"查看案例详情"按钮

**数据来源**:
- 后端 `/api/v1/showcase/featured` 端点
- 数据文件: `apps/api/src/data/featured-projects.json`
- 包含20个项目，5个标记为featured

---

### 3. 项目分类板块 (CategoriesSection)

**位置**: 热门案例下方

**展示内容**:
- 8个项目分类：
  - 小红书 (4个项目)
  - 闲鱼 (2个项目)
  - 蓝海项目 (9个项目)
  - 短视频 (1个项目)
  - AI视频 (1个项目)
  - YouTube (1个项目)
  - 接单 (1个项目)
  - 餐饮 (1个项目)

**设计**:
- 4列网格布局（响应式）
- 每个分类卡片显示：
  - 分类图标/emoji
  - 分类名称
  - 项目数量
  - 左边框颜色编码
- 点击可跳转到该分类的项目列表

**数据来源**:
- 后端 `/api/v1/showcase/categories` 端点

---

### 4. 最新项目板块 (ProjectList)

**位置**: 分类板块下方

**展示内容**:
- 平台上最新发布的项目
- 使用现有的ProjectList组件

---

## 后端API设计

### 新增模块: Showcase

**路由前缀**: `/api/v1/showcase`

#### 端点列表

1. **GET /showcase/homepage**
   - 获取首页所有数据（政策+热门项目+分类）
   - 响应:
   ```json
   {
     "success": true,
     "data": {
       "policies": [...],
       "featured_projects": [...],
       "latest_projects": [...],
       "project_categories": [...],
       "projects_by_category": {...},
       "stats": {
         "total_projects": 20,
         "total_categories": 8,
         "total_policies": 4
       }
     }
   }
   ```

2. **GET /showcase/featured**
   - 获取热门项目列表
   - 响应: `{ "success": true, "data": [...], "meta": {...} }`

3. **GET /showcase/all**
   - 获取所有项目（支持分类和难度过滤）
   - 查询参数: `category`, `difficulty`
   - 响应: `{ "success": true, "data": [...], "meta": {...} }`

4. **GET /showcase/policies**
   - 获取政策信息列表
   - 响应: `{ "success": true, "data": [...], "meta": {...} }`

5. **GET /showcase/categories**
   - 获取项目分类统计
   - 响应: `{ "success": true, "data": [...], "meta": {...} }`

---

## 前端组件结构

### 新增组件

1. **PoliciesSection** (`components/features/PoliciesSection.tsx`)
   - 使用 `showcaseApi.getPolicies()`
   - 显示政策卡片网格

2. **FeaturedCasesSection** (`components/features/FeaturedCasesSection.tsx`)
   - 使用 `showcaseApi.getFeaturedProjects()`
   - 显示热门案例卡片网格
   - 支持分类颜色编码

3. **CategoriesSection** (`components/features/CategoriesSection.tsx`)
   - 使用 `showcaseApi.getCategories()`
   - 显示分类卡片网格
   - 支持点击跳转到分类页面

### 修改的组件

1. **HomePage** (`app/page.tsx`)
   - 集成新的三个Section组件
   - 保持原有Hero Section和ProjectList

2. **API Client** (`lib/api/client.ts`)
   - 新增 `showcaseApi` 对象
   - 包含所有showcase相关的API调用

---

## 数据结构

### 项目数据结构

```typescript
interface Project {
  id: string;
  date: string;           // YYYY-MM-DD
  title: string;
  category: string;       // 小红书、闲鱼等
  difficulty: string;     // 简单、中等、进阶
  revenue?: string;       // 预期收益
  featured: boolean;      // 是否为热门项目
  description: string;
  tags: string[];
}
```

### 政策数据结构

```typescript
interface Policy {
  id: string;
  title: string;
  description: string;
  category: string;       // 国家政策、行业规范等
  date: string;
  impact: string;         // 重大利好、市场规范等
}
```

### 分类数据结构

```typescript
interface Category {
  id: string;
  name: string;
  color: string;          // 十六进制颜色码
  count: number;          // 该分类下的项目数
}
```

---

## 数据来源

### 项目数据
- **来源**: `resources/生财有术-新手副业/` 目录
- **数量**: 20个项目
- **存储**: `apps/api/src/data/featured-projects.json`
- **更新方式**: 手动维护或通过管理后台

### 政策数据
- **来源**: 静态配置
- **存储**: `apps/api/src/modules/showcase/routes.ts`
- **更新方式**: 代码更新

---

## 用户体验流程

### 未登录用户
1. 访问首页
2. 查看政策支持信息
3. 浏览热门案例
4. 按分类浏览项目
5. 点击项目卡片查看详情（无需登录）
6. 点击"申请项目"时触发登录模态框

### 已登录用户
1. 访问首页
2. 查看所有内容
3. 点击"申请项目"直接提交申请
4. 点击"发布项目"进入项目发布流程

---

## 性能优化

1. **数据缓存**
   - 使用 React Query 缓存政策和分类数据
   - 设置合理的 staleTime（60秒）

2. **图片优化**
   - 项目卡片使用占位符加载
   - 支持lazy loading

3. **API优化**
   - `/showcase/homepage` 端点一次性获取所有数据
   - 减少网络请求次数

---

## SEO优化

1. **Meta标签**
   - 首页标题: "WEOPC.ORG - 灵活用工与副业项目平台"
   - 描述: "连接项目方与灵活工作者，发现优质副业机会"

2. **结构化数据**
   - 项目卡片使用Schema.org标记
   - 政策信息使用Article标记

3. **URL结构**
   - 分类页面: `/showcase?category=小红书`
   - 项目详情: `/showcase/{projectId}`

---

## 后续扩展

1. **项目详情页面** (`/showcase/[id]`)
   - 显示完整的项目信息
   - 包含项目介绍、挣钱案例、用户评论等

2. **分类浏览页面** (`/showcase?category=xxx`)
   - 按分类显示所有项目
   - 支持排序和过滤

3. **管理后台**
   - 添加/编辑/删除项目
   - 管理政策信息
   - 查看项目统计

4. **用户交互**
   - 项目收藏功能
   - 项目评分和评论
   - 分享到社交媒体

---

## 实现清单

- [x] 创建showcase模块和routes
- [x] 创建项目数据文件 (featured-projects.json)
- [x] 创建PoliciesSection组件
- [x] 创建FeaturedCasesSection组件
- [x] 创建CategoriesSection组件
- [x] 更新API客户端
- [x] 更新首页集成新组件
- [ ] 测试所有功能

## 开发环境启动指南

### 端口配置
- **前端 (Next.js Web)**: http://localhost:3003
- **后端 (Express API)**: http://localhost:3002
- **API访问**: http://localhost:3003 通过代理访问 http://localhost:3002

### 启动开发服务器

```bash
cd /Users/alice/Desktop/hahha/workspace/weopc

# 清除缓存并启动
rm -rf apps/web/.next apps/api/dist
pnpm dev
```

### 访问首页
- 打开浏览器访问: **http://localhost:3003**
- 应该看到以下内容（从上到下）：
  1. Hero Section - "发现优质副业机会"
  2. 政策支持板块 - 4个政策卡片
  3. 热门案例板块 - 5个精选项目
  4. 项目分类板块 - 8个分类导航
  5. 最新项目板块 - 平台最新项目

### API端点验证
```bash
# 获取首页所有数据
curl http://localhost:3002/api/v1/showcase/homepage

# 获取热门项目
curl http://localhost:3002/api/v1/showcase/featured

# 获取政策信息
curl http://localhost:3002/api/v1/showcase/policies

# 获取分类信息
curl http://localhost:3002/api/v1/showcase/categories
```

- [ ] 部署到生产环境
- [ ] 监控性能指标

---

## 总结

通过添加首页广场功能，WEOPC.ORG平台现在提供了：
- ✅ 政策支持信息展示
- ✅ 精选热门案例展示
- ✅ 项目分类导航
- ✅ 最新项目列表
- ✅ 完整的公开浏览体验（无需登录）
- ✅ 登录触发的保护操作（申请项目、发布项目）

这使得平台更加吸引用户，提高了用户的初次体验和转化率。
