# WEOPC 功能盘点 + 工具箱链接溯源增强计划

> 生成日期：2026-03-10
> 适用项目：/Users/kin/weopc（Express + Prisma + Next.js 14 Monorepo）

---

## 一、当前功能模块全景盘点

### 1.1 后端 API（apps/api）

| 模块 | 路由前缀 | 关键文件 | 状态 |
|------|---------|---------|------|
| 认证 | `/api/v1/auth` | `modules/auth/routes.ts` | ✅ 完整 |
| 邀请码 | `/api/v1/auth/invitation` | `modules/invitation/routes.ts` | ✅ 完整 |
| 项目 | `/api/v1/projects` | `modules/projects/routes.ts` | ✅ 完整 |
| 线索 | `/api/v1/projects/:id/leads` | `modules/leads/routes.ts` | ✅ 完整 |
| 评价 | `/api/v1/reviews` | `modules/reviews/routes.ts` | ✅ 完整 |
| 用户 | `/api/v1/users` | `modules/users/routes.ts` | ✅ 完整 |
| 偏好 | `/api/v1/preferences` | `modules/preferences/routes.ts` | ✅ 完整 |
| 推荐 | `/api/v1/recommendations` | `modules/recommendations/routes.ts` | ✅ 完整 |
| 管理后台 | `/api/v1/admin` | `modules/admin/routes.ts` | ✅ 完整 |
| 展示案例 | `/api/v1/showcase` | `modules/showcase/routes.ts` | ✅（静态JSON） |
| 资讯 | `/api/v1/information` | `modules/information/routes.ts` | ✅ 完整 |
| **链接追踪** | `/api/v1/links` | `modules/links/routes.ts` | ⚠️ 基础实现 |
| 博客/评论 | — | schema 已有模型 | ❌ 未实现 |
| 工具箱项目 | 沿用 `/api/v1/projects` | ProjectType.TOOLBOX | ✅ 枚举已加 |

#### 核心数据库模型（共 18 个）

```
User / UserPreference / UserPoints
Project / Lead / Review
BlogPost / Comment
InvitationCode
Link / LinkClick          ← 工具箱核心
SystemConfig / AuditLog
PolicyNews / Event / CrawlerTask
```

---

### 1.2 前端 Web（apps/web）

| 路由 | 页面文件 | 状态 |
|------|---------|------|
| `/` | `app/page.tsx` | ✅ 首页（静态展示） |
| `/projects` | `app/projects/page.tsx` | ✅ 项目列表 |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | ✅ 项目详情 |
| `/projects/new` | `app/projects/new/page.tsx` | ✅ 发布项目 |
| `/showcase` | `app/showcase/page.tsx` | ✅ 案例展示 |
| `/information/policy` | `app/information/policy/page.tsx` | ✅ 政策资讯 |
| `/information/events` | `app/information/events/page.tsx` | ✅ 活动资讯 |
| `/login` | `app/(auth)/login/page.tsx` | ✅ |
| `/register` | `app/(auth)/register/page.tsx` | ✅ |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ 用户面板 |
| `/dashboard/provider` | `app/dashboard/provider/page.tsx` | ✅ 服务商面板 |
| `/dashboard/admin` | `app/dashboard/admin/page.tsx` | ✅ 管理后台 |
| `/profile` | `app/profile/page.tsx` | ✅ 个人资料 |
| **`/toolbox/links`** | `app/toolbox/links/page.tsx` | ⚠️ 基础实现 |
| **`/t/[shortCode]`** | `app/t/[shortCode]/page.tsx` | ✅ 跳转页 |
| `/tools` | — | ❌ 未实现 |
| `/blog` | — | ❌ 未实现 |

---

## 二、工具箱链接溯源——现状分析

### 2.1 已实现能力

**数据库（Prisma Schema）**
```prisma
model Link {
  id          String       @id @default(cuid())
  userId      String
  originalUrl String
  shortCode   String       @unique
  name        String?
  source      String?      // 单一渠道字段（wechat/xiaohongshu/...）
  clicks      Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  user        User         @relation(...)
  clickLogs   LinkClick[]
}

model LinkClick {
  id        String   @id @default(cuid())
  linkId    String
  referer   String?  // HTTP Referer Header
  userAgent String?  // User-Agent Header
  ip        String?  // 客户端 IP
  country   String?  // 字段存在，但未填充！
  city      String?  // 字段存在，但未填充！
  clickedAt DateTime @default(now())
  link      Link     @relation(...)
}
```

**API 接口**
- `POST /api/v1/links` — 创建追踪链接（需登录）
- `GET /api/v1/links` — 获取我的链接列表（分页）
- `GET /api/v1/links/:id` — 链接详情 + 今日点击数
- `DELETE /api/v1/links/:id` — 删除链接
- `GET /api/v1/links/t/:shortCode` — **公开跳转接口**（记录点击，302 重定向）

**前端页面** `/toolbox/links`
- 创建表单：originalUrl、name、source（7 个平台枚举）
- 列表：显示总点击 / 今日点击 / 复制短链

### 2.2 缺失能力评估

| 能力 | 现状 | 影响 |
|------|------|------|
| UTM 参数 | ❌ 无 utm_source/medium/campaign | 无法区分同渠道不同活动 |
| 活动/渠道维度 | ❌ 只有单一 source 字段 | 无法多维度拆分 |
| 落地页来源 | ⚠️ 有 referer 但未结构化 | 无法知道用户从哪个页面点击 |
| IP 地理解析 | ❌ country/city 字段存在但未填充 | 无地域分析 |
| UV 去重 | ❌ 无 session/fingerprint | 点击数 = 总次数，含刷量 |
| 转化漏斗 | ❌ 无点击→注册/下单追踪 | 只知道点击，不知转化 |
| 数据导出 | ❌ 无 CSV/Excel 导出 | 用户无法离线分析 |
| 图表 | ❌ 列表界面无可视化 | 趋势不直观 |
| 按天趋势 | ⚠️ 只有今日vs总量 | 无历史趋势曲线 |
| 异常/刷量检测 | ❌ 无 | 数据可被人为刷高 |
| 二维码生成 | ❌ 无 | 线下场景无法使用 |
| 链接过期 | ❌ 无 expiresAt | 链接永久有效 |
| 批量创建 | ❌ 一次只能建一个 | 运营效率低 |
| 自定义短码 | ❌ 随机生成 | 无品牌化短链 |

---

## 三、新增功能清单 + 优先级

### P0（核心缺口，立即做）

---

#### P0-1：UTM 参数支持

**价值**：区分同渠道下不同活动（如「618活动」vs「日常推广」）

**落地步骤**

1. **修改 Prisma Schema** — 扩展 `Link` 模型

```prisma
// prisma/schema.prisma - Link 模型新增字段
model Link {
  // ...现有字段...
  campaign    String?   // 活动名称（对应 utm_campaign）
  medium      String?   // 媒介类型：cpc/email/social（对应 utm_medium）
  term        String?   // 关键词（对应 utm_term）
  content     String?   // 素材版本 A/B（对应 utm_content）
  // source 字段已有，对应 utm_source
}
```

2. **运行迁移**

```bash
cd apps/api && npx prisma migrate dev --name add_utm_fields
```

3. **修改 API** — `apps/api/src/modules/links/routes.ts`

```typescript
// POST /links 的 schema 新增字段
const schema = z.object({
  originalUrl: z.string().url(),
  name: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  medium: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional(),
});

// 创建时自动在 originalUrl 追加 UTM 参数（可选）
function buildUtmUrl(originalUrl: string, utmParams: Record<string, string | undefined>) {
  const url = new URL(originalUrl);
  Object.entries(utmParams).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  return url.toString();
}
```

4. **修改前端表单** — `apps/web/src/app/toolbox/links/page.tsx`
   - 在创建表单新增：活动名称（campaign）、媒介类型（medium）字段
   - 显示时展示 utm 组合信息

---

#### P0-2：IP 地理解析（填充已有 country/city 字段）

**价值**：了解用户地域分布，对应 LinkClick 模型已有 country/city 字段但未填充

**落地步骤**

1. **安装 IP 解析库**

```bash
cd apps/api && pnpm add geoip-lite
# 或使用免费 API：ip-api.com（无需安装，HTTP 请求）
```

2. **修改跳转接口** — `apps/api/src/modules/links/routes.ts` 的 `GET /t/:shortCode`

```typescript
import geoip from 'geoip-lite';

// 在记录 LinkClick 时填充地理信息
const ip = req.ip || req.headers['x-forwarded-for'] as string;
const cleanIp = ip?.split(',')[0].trim();
const geo = geoip.lookup(cleanIp || '');

await prisma.linkClick.create({
  data: {
    linkId: link.id,
    referer: req.get('Referer') || null,
    userAgent: req.get('User-Agent') || null,
    ip: cleanIp || null,
    country: geo?.country || null,
    city: geo?.city || null,
  },
});
```

3. **新增统计接口** — `GET /links/:id/geo`（可选，合并进 `/stats` 接口）

```typescript
// 按 country 聚合点击
const geoStats = await prisma.linkClick.groupBy({
  by: ['country'],
  where: { linkId: id },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
});
```

---

#### P0-3：按天趋势统计接口

**价值**：查看链接历史效果，支持图表展示

**落地步骤**

1. **新增接口** — `GET /api/v1/links/:id/stats`

```typescript
// apps/api/src/modules/links/routes.ts
router.get('/:id/stats', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  // 按天统计点击（使用 Prisma groupBy）
  const clicks = await prisma.linkClick.findMany({
    where: { linkId: id, clickedAt: { gte: startDate } },
    select: { clickedAt: true },
  });

  // 按天聚合
  const byDay: Record<string, number> = {};
  clicks.forEach(c => {
    const day = c.clickedAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  // 填充无点击的天
  const result = [];
  for (let i = Number(days) - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().split('T')[0];
    result.push({ date: day, clicks: byDay[day] || 0 });
  }

  return res.json({ success: true, data: result });
});
```

2. **前端展示** — 在 `/toolbox/links/[id]` 详情页加折线图（用 recharts）

```bash
cd apps/web && pnpm add recharts
```

---

### P1（重要增强，本月内做）

---

#### P1-1：UV 去重（独立访客统计）

**价值**：区分"总点击 PV"和"独立访客 UV"，发现刷量

**落地步骤**

1. **修改 LinkClick Schema** — 添加访客标识字段

```prisma
model LinkClick {
  // ...现有字段...
  visitorId   String?   // 基于 ip+ua 的哈希，用于 UV 去重
  isUnique    Boolean   @default(true)  // 是否为新访客
}
```

2. **迁移 + 逻辑**

```bash
npx prisma migrate dev --name add_visitor_dedup
```

```typescript
// 在跳转接口中计算 visitorId
import crypto from 'crypto';

const visitorKey = `${cleanIp}-${req.get('User-Agent')}`;
const visitorId = crypto.createHash('md5').update(visitorKey).digest('hex');

// 检查 24h 内是否有相同 visitorId
const recentClick = await prisma.linkClick.findFirst({
  where: {
    linkId: link.id,
    visitorId,
    clickedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  },
});

const isUnique = !recentClick;

await prisma.linkClick.create({
  data: { ..., visitorId, isUnique },
});

// Link.clicks 只统计 isUnique 的点击（或新增 Link.uvCount 字段）
```

3. **API 调整** — 在链接详情中分别返回 PV 和 UV

```typescript
const pv = link.clicks;
const uv = await prisma.linkClick.count({ where: { linkId: id, isUnique: true } });
```

---

#### P1-2：数据分析看板页

**价值**：可视化展示，让用户直观看到渠道效果

**落地步骤**

1. **新建页面** — `apps/web/src/app/toolbox/links/[id]/page.tsx`

```
页面布局：
┌─ 链接基本信息（名称/原始URL/短码）────────────────┐
│                                                    │
├─ 概览卡片 ─────────────────────────────────────────│
│  总点击PV  独立UV  今日  昨日  7日均值              │
│                                                    │
├─ 折线图（近30天趋势）──────────────────────────────│
│  [recharts LineChart]                              │
│                                                    │
├─ 来源渠道 + 地域分布（两列）───────────────────────│
│  [条形图]                [地图/表格]                │
│                                                    │
└─ 点击明细（最近100条）─────────────────────────────┘
```

2. **安装图表库**

```bash
cd apps/web && pnpm add recharts
```

3. **新增 API 聚合接口** — `GET /api/v1/links/:id/analytics`

```typescript
// 返回结构
{
  summary: { pv, uv, todayClicks, yesterdayClicks, avgLast7days },
  trend: [{ date, pv, uv }],       // 近30天
  bySource: [{ source, count }],   // 按来源
  byCountry: [{ country, count }], // 按国家
  byCity: [{ city, count }],       // 按城市
  recentClicks: [...]              // 最近100条
}
```

---

#### P1-3：渠道/活动维度分析

**价值**：与 P0-1（UTM）配合，支持多维度拆分分析

**落地步骤**

1. **依赖 P0-1（UTM 字段）完成后**

2. **在 analytics 接口中新增维度**

```typescript
// GET /links/:id/analytics 返回增加
byCampaign: [{ campaign, count }],  // 按活动
byMedium: [{ medium, count }],      // 按媒介
```

3. **前端看板** — 在分析页新增「维度切换器」Tab

```
渠道来源 | 活动名称 | 媒介类型 | 地域分布
```

---

#### P1-4：CSV 数据导出

**价值**：满足用户离线分析、存档需求

**落地步骤**

1. **安装导出库**

```bash
cd apps/api && pnpm add json2csv
```

2. **新增接口** — `GET /api/v1/links/:id/export?format=csv`

```typescript
router.get('/:id/export', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { format = 'csv', days = 30 } = req.query;

  const clicks = await prisma.linkClick.findMany({
    where: { linkId: id, clickedAt: { gte: startDate } },
    select: { clickedAt: true, ip: true, country: true, city: true, referer: true, isUnique: true },
    orderBy: { clickedAt: 'desc' },
  });

  if (format === 'csv') {
    const { Parser } = require('json2csv');
    const parser = new Parser({ fields: ['clickedAt', 'country', 'city', 'referer', 'isUnique'] });
    const csv = parser.parse(clicks);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=link_${id}_clicks.csv`);
    return res.send(csv);
  }
});
```

3. **前端** — 在链接详情页右上角加「导出」按钮

---

### P2（锦上添花，下季度）

---

#### P2-1：刷量/异常检测

**场景**：短时间内同一 IP 大量点击，可能是刷量

**方案**

```typescript
// 在跳转接口中异步检测（不影响跳转速度）
setImmediate(async () => {
  // 最近1分钟内该 IP 点击同一链接超过 5 次 → 标记为可疑
  const recentCount = await prisma.linkClick.count({
    where: {
      linkId: link.id,
      ip: cleanIp,
      clickedAt: { gte: new Date(Date.now() - 60000) },
    },
  });

  if (recentCount > 5) {
    // 更新最近点击为 suspicious = true
    await prisma.linkClick.updateMany({
      where: { linkId: link.id, ip: cleanIp, clickedAt: { gte: ... } },
      data: { suspicious: true },
    });
  }
});
```

**Schema 变更**

```prisma
model LinkClick {
  // ...
  suspicious  Boolean  @default(false)
}
```

---

#### P2-2：二维码生成

**场景**：线下宣传物料需要扫码访问

**方案**

```bash
cd apps/api && pnpm add qrcode
```

```typescript
// GET /api/v1/links/:id/qrcode
router.get('/:id/qrcode', authenticate, async (req, res) => {
  const link = await prisma.link.findFirst({ where: { id, userId } });
  const QRCode = require('qrcode');
  const svg = await QRCode.toString(link.trackingUrl, { type: 'svg' });
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(svg);
});
```

**前端**：在列表卡片右键菜单 / 详情页提供「下载二维码」

---

#### P2-3：转化漏斗追踪

**场景**：追踪"点击 → 注册 → 下单"的完整转化路径

**方案**：在用户注册/下单时，带上 `ref=<shortCode>` 参数，后端识别并记录

```typescript
// 注册接口新增 source 字段
// POST /auth/register body 新增：refShortCode?: string

// 注册成功后记录转化
if (refShortCode) {
  const link = await prisma.link.findUnique({ where: { shortCode: refShortCode } });
  if (link) {
    // 可在 Link 上记录 conversions 计数，或新建 LinkConversion 模型
    await prisma.link.update({
      where: { id: link.id },
      data: { conversions: { increment: 1 } },
    });
  }
}
```

**Schema 变更**

```prisma
model Link {
  // ...
  conversions  Int  @default(0)  // 转化次数
}
```

---

#### P2-4：链接过期与限流

**场景**：活动链接设定有效期，超出后跳转到过期提示页

**Schema 变更**

```prisma
model Link {
  // ...
  expiresAt    DateTime?  // 过期时间
  maxClicks    Int?       // 最大点击数限制
  isActive     Boolean    @default(true)
}
```

**跳转逻辑**

```typescript
if (link.expiresAt && link.expiresAt < new Date()) {
  return res.redirect('/link-expired');
}
if (link.maxClicks && link.clicks >= link.maxClicks) {
  return res.redirect('/link-limit-reached');
}
```

---

#### P2-5：自定义短码 + 批量创建

**场景**：品牌化短链（如 `/t/618活动`），以及运营批量生成多个追踪链接

**API 变更** — `POST /links` 支持 `customCode`

```typescript
const schema = z.object({
  // ...
  customCode: z.string().regex(/^[a-zA-Z0-9_-]{3,20}$/).optional(),
});

const shortCode = customCode
  ? await validateUniqueCode(customCode)
  : Math.random().toString(36).substring(2, 10);
```

**批量创建** — `POST /links/batch`

```typescript
// 接受 links 数组，批量创建
router.post('/batch', authenticate, async (req, res) => {
  const { links } = req.body; // 最多50条
  const created = await prisma.link.createMany({ data: links.map(buildLinkData) });
  return res.json({ success: true, data: created });
});
```

---

## 四、优先级汇总表

| 优先级 | 功能 | 预估工期 | 核心价值 |
|--------|------|---------|---------|
| **P0** | UTM 参数支持 | 0.5天 | 区分同渠道不同活动 |
| **P0** | IP 地理解析（填充已有字段） | 0.5天 | 地域分析 |
| **P0** | 按天趋势统计接口 | 1天 | 历史效果查看 |
| **P1** | UV 去重（独立访客统计） | 1天 | 数据准确性 |
| **P1** | 数据分析看板页 | 2天 | 可视化体验 |
| **P1** | 渠道/活动维度分析 | 0.5天（依赖P0-1）| 多维拆分 |
| **P1** | CSV 数据导出 | 0.5天 | 离线分析 |
| **P2** | 刷量/异常检测 | 1天 | 数据质量 |
| **P2** | 二维码生成 | 0.5天 | 线下场景 |
| **P2** | 转化漏斗追踪 | 2天 | ROI 计算 |
| **P2** | 链接过期与限流 | 1天 | 精细化运营 |
| **P2** | 自定义短码 + 批量创建 | 1天 | 品牌化 + 效率 |

---

## 五、数据库迁移路线图

```sql
-- 迁移 1（P0）：UTM 字段 + visitorId
ALTER TABLE "Link" ADD COLUMN "campaign" TEXT;
ALTER TABLE "Link" ADD COLUMN "medium" TEXT;
ALTER TABLE "Link" ADD COLUMN "term" TEXT;
ALTER TABLE "Link" ADD COLUMN "content" TEXT;
ALTER TABLE "LinkClick" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "LinkClick" ADD COLUMN "isUnique" BOOLEAN DEFAULT true;

-- 迁移 2（P2）：刷量检测
ALTER TABLE "LinkClick" ADD COLUMN "suspicious" BOOLEAN DEFAULT false;

-- 迁移 3（P2）：转化追踪
ALTER TABLE "Link" ADD COLUMN "conversions" INTEGER DEFAULT 0;

-- 迁移 4（P2）：链接过期 + 限流
ALTER TABLE "Link" ADD COLUMN "expiresAt" TIMESTAMP;
ALTER TABLE "Link" ADD COLUMN "maxClicks" INTEGER;
ALTER TABLE "Link" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
```

---

## 六、已知技术债务

| 问题 | 位置 | 风险 |
|------|------|------|
| shortCode 用 `Math.random()` 生成，有极小概率碰撞 | `links/routes.ts:21` | 低（可加 `@unique` 约束 retry） |
| `GET /links/t/:shortCode` 路由会被 `GET /:id` 先匹配到 | `links/routes.ts` | ⚠️ 高！需将 `/t/:shortCode` 移至 `/:id` 之前 |
| `/t/[shortCode]` 前端页面先跳到 API，多一次 302 | `app/t/[shortCode]/page.tsx` | 低（可改为服务端重定向） |
| 链接列表每次最多返回 100 条 clickLogs，无独立 clickLogs 分页 | `links/routes.ts:61` | 中（数据量大时性能问题） |
| 跳转接口写 DB 是同步阻塞的（两次 prisma 写） | `links/routes.ts:162-175` | 低（可改为异步 + increment 合并） |

### 立即修复（路由顺序 Bug）

`apps/api/src/modules/links/routes.ts` 中，`GET /t/:shortCode` 必须在 `GET /:id` 之前注册，否则 `t` 会被当作 `id` 处理：

```typescript
// 正确顺序：
router.get('/t/:shortCode', ...) // ← 先注册
router.get('/:id', authenticate, ...) // ← 后注册
```

---

## 七、下一步行动

**本周（P0 清单）**
1. [ ] 修复路由顺序 Bug（10分钟）
2. [ ] Prisma migration：添加 UTM 字段
3. [ ] 更新 `POST /links` 接口支持 UTM
4. [ ] 更新前端创建表单展示 UTM 字段
5. [ ] 在 `GET /t/:shortCode` 中调用 geoip 填充 country/city
6. [ ] 新增 `GET /links/:id/stats?days=30` 按天趋势接口

**下周（P1 清单）**
7. [ ] Prisma migration：添加 visitorId/isUnique 字段
8. [ ] 实现 UV 去重逻辑
9. [ ] 新建 `/toolbox/links/[id]` 看板页
10. [ ] 安装 recharts，实现折线图 + 条形图
11. [ ] 实现 CSV 导出接口 + 前端按钮

**本月末（P2 启动）**
12. [ ] 刷量检测（异步，不影响跳转）
13. [ ] 二维码生成接口

---

*文档维护：每次完成新功能后更新对应条目的状态*
