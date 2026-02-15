# WEOPC.ORG MVP - 快速启动指南

## 项目概述

这是一个灵活用工与副业项目匹配平台的MVP版本，包含：
- ✅ 用户注册/登录（USER和PROVIDER两种角色）
- ✅ 项目发布与浏览
- ✅ 线索提交与管理
- ✅ 前后端分离架构
- ✅ 完整的API接口

## 技术栈

**后端：** Node.js + Express + TypeScript + Prisma + PostgreSQL
**前端：** Next.js 14 + TypeScript + Tailwind CSS + TanStack Query
**基础设施：** Docker Compose + Turborepo

---

## 快速开始

### 1. 安装依赖

确保已安装：
- Node.js 18+
- pnpm 8+
- Docker Desktop

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 启动数据库

```bash
cd tools/docker
docker-compose up -d
```

验证数据库运行：
```bash
docker ps
# 应该看到 weopc-postgres 和 weopc-redis 正在运行
```

### 3. 配置环境变量

```bash
# 后端
cp apps/api/.env.example apps/api/.env

# 前端
cp apps/web/.env.example apps/web/.env
```

默认配置已经可以直接使用，无需修改。

### 4. 初始化数据库

```bash
cd apps/api

# 生成 Prisma Client
pnpm prisma generate

# 运行数据库迁移
pnpm prisma migrate dev --name init

# （可选）打开 Prisma Studio 查看数据库
pnpm prisma studio
```

### 5. 启动开发服务器

在项目根目录：

```bash
pnpm dev
```

这会同时启动：
- 🚀 API服务器：http://localhost:3002
- 🌐 Web应用：http://localhost:3003

---

## 测试MVP功能

### 1. 注册账号

访问 http://localhost:3003

**注册为项目方（PROVIDER）：**
- 点击"我要发布项目"
- 填写注册信息
- 邮箱：provider@test.com
- 用户名：testprovider
- 密码：123456

**注册为用户（USER）：**
- 点击"我要找项目"
- 填写注册信息
- 邮箱：user@test.com
- 用户名：testuser
- 密码：123456

### 2. 发布项目（PROVIDER账号）

使用 API 测试工具（如 Postman 或 curl）：

```bash
# 登录获取 token
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@test.com",
    "password": "123456"
  }'

# 使用返回的 token 创建项目
curl -X POST http://localhost:3002/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "寻找推特运营专员",
    "description": "需要有经验的推特运营人员，负责账号日常运营、内容发布和粉丝互动。要求：1. 熟悉推特平台规则 2. 有社媒运营经验 3. 英文流利",
    "shortDescription": "推特账号运营，远程工作，月薪5-10K",
    "type": "PART_TIME",
    "category": "社交媒体运营",
    "tags": ["推特", "社媒运营", "远程"],
    "revenueTier": "TIER_5K_10K",
    "executionReq": "REMOTE",
    "skillsRequired": ["社交媒体", "内容创作", "英语"],
    "contactEmail": "provider@test.com"
  }'
```

### 3. 浏览项目

访问首页 http://localhost:3003，应该能看到：

**首页广场功能（新增）：**
1. **政策支持板块** - 展示4个OPC相关政策
2. **热门案例板块** - 展示5个精选副业项目案例
3. **项目分类板块** - 展示8个项目分类导航
4. **最新项目板块** - 展示平台最新发布的项目

所有内容都可以在**无需登录**的情况下浏览。

### 4. 提交线索（USER账号）

```bash
# 使用 USER 账号登录
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "123456"
  }'

# 提交线索（替换 PROJECT_ID 和 TOKEN）
curl -X POST http://localhost:3002/api/v1/projects/PROJECT_ID/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN_HERE" \
  -d '{
    "coverLetter": "您好，我对这个项目很感兴趣。我有3年推特运营经验...",
    "expectedRate": "8000/月",
    "availability": "每周可投入20小时"
  }'
```

---

## API 接口文档

### 认证接口

**注册**
```
POST /api/v1/auth/register
Body: {
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "role": "USER" | "PROVIDER"
}
```

**登录**
```
POST /api/v1/auth/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

**获取当前用户**
```
GET /api/v1/auth/me
Headers: Authorization: Bearer <token>
```

### 项目接口

**列出项目**
```
GET /api/v1/projects?page=1&limit=20&type=SIDE_GIG&category=技术
```

**获取项目详情**
```
GET /api/v1/projects/:id
```

**创建项目（PROVIDER）**
```
POST /api/v1/projects
Headers: Authorization: Bearer <token>
Body: { title, description, type, revenueTier, ... }
```

**更新项目（PROVIDER）**
```
PATCH /api/v1/projects/:id
Headers: Authorization: Bearer <token>
Body: { title, description, ... }
```

**删除项目（PROVIDER）**
```
DELETE /api/v1/projects/:id
Headers: Authorization: Bearer <token>
```

### 线索接口

**提交线索（USER）**
```
POST /api/v1/projects/:projectId/leads
Headers: Authorization: Bearer <token>
Body: { coverLetter, expectedRate, availability }
```

**查看我的线索（USER）**
```
GET /api/v1/users/me/leads
Headers: Authorization: Bearer <token>
```

**查看项目的线索（PROVIDER）**
```
GET /api/v1/projects/:projectId/leads
Headers: Authorization: Bearer <token>
```

**更新线索状态（PROVIDER）**
```
PATCH /api/v1/leads/:id
Headers: Authorization: Bearer <token>
Body: { status: "CONTACTED" | "ACCEPTED" | "REJECTED", notes: "..." }
```

---

## 数据库管理

### 查看数据库
```bash
cd apps/api
pnpm prisma studio
```

### 创建新迁移
```bash
cd apps/api
pnpm prisma migrate dev --name migration_name
```

### 重置数据库
```bash
cd apps/api
pnpm prisma migrate reset
```

---

## 项目结构

```
weopc/
├── apps/
│   ├── api/                    # 后端 API
│   │   ├── src/
│   │   │   ├── modules/        # 功能模块
│   │   │   │   ├── auth/       # 认证
│   │   │   │   ├── projects/   # 项目
│   │   │   │   └── leads/      # 线索
│   │   │   ├── shared/         # 共享代码
│   │   │   ├── database/       # Prisma
│   │   │   └── config/         # 配置
│   │   └── package.json
│   │
│   └── web/                    # 前端 Web
│       ├── src/
│       │   ├── app/            # Next.js App Router
│       │   ├── components/     # React 组件
│       │   └── lib/            # 工具库
│       └── package.json
│
├── tools/
│   └── docker/                 # Docker 配置
│       └── docker-compose.yml
│
├── package.json                # 根 package.json
├── turbo.json                  # Turborepo 配置
└── pnpm-workspace.yaml         # pnpm 工作区
```

---

## 常见问题

### 1. 数据库连接失败

确保 Docker 容器正在运行：
```bash
docker ps
docker-compose up -d
```

### 2. 端口被占用

如果端口 3002 或 3003 被占用，可以修改：
- API: 修改 `apps/api/.env` 中的 `PORT=3002`
- Web: 修改 `apps/web/package.json` 中的 `"dev": "next dev -p 3003"`
- PostgreSQL: 修改 `docker-compose.yml` 中的端口映射

### 3. Prisma Client 未生成

```bash
cd apps/api
pnpm prisma generate
```

### 4. 前端无法连接 API

检查 `apps/web/.env` 中的 `NEXT_PUBLIC_API_URL` 是否正确。

---

## 下一步开发

MVP 已包含核心功能，后续可以添加：

1. **用户仪表板**
   - USER: 查看我的线索、收藏的项目
   - PROVIDER: 管理我的项目、查看线索

2. **评价系统**
   - 项目完成后互相评价
   - 评分和评论展示

3. **搜索优化**
   - 全文搜索
   - 高级筛选

4. **通知系统**
   - 邮件通知（Alibaba DirectMail）
   - 站内消息

5. **文件上传**
   - 头像上传
   - 简历上传
   - 项目图片

6. **管理后台**
   - 用户管理
   - 项目审核
   - 数据统计

---

## 技术支持

如有问题，请查看：
- API 日志：`apps/api` 控制台输出
- 前端日志：浏览器开发者工具
- 数据库：Prisma Studio

祝开发顺利！🚀
