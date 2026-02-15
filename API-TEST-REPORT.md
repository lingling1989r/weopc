# API 测试报告 - localhost:3002

**测试时间**: 2026-02-14
**测试工具**: Axios + TypeScript
**API 版本**: v1
**总测试数**: 22
**通过**: 21
**失败**: 1
**成功率**: 95.45%

---

## 📊 测试概览

### ✅ 通过的功能模块

1. **健康检查** (1/1)
   - ✅ GET /health - 服务器健康状态检查

2. **认证模块** (5/5)
   - ✅ POST /auth/register - 用户注册
   - ✅ POST /auth/register - Provider 注册验证（需要邀请码）
   - ✅ POST /auth/login - 用户登录
   - ✅ GET /auth/me - 获取当前用户信息
   - ✅ GET /auth/me (未授权) - 正确返回 401

3. **项目模块** (3/4)
   - ✅ GET /projects - 列出所有项目
   - ✅ GET /projects/:id - 获取项目详情
   - ✅ POST /projects (USER 角色) - 正确拒绝访问 (403)
   - ❌ GET /projects?type=FULL_TIME&revenueTier=TIER_1 - 服务器错误 (500)

4. **Lead 模块** (2/2)
   - ✅ POST /projects/:projectId/leads - 提交 Lead
   - ✅ GET /users/me/leads - 获取我的 Leads

5. **Showcase 模块** (5/5)
   - ✅ GET /showcase/homepage - 获取首页数据
   - ✅ GET /showcase/featured - 获取热门项目
   - ✅ GET /showcase/policies - 获取政策信息
   - ✅ GET /showcase/all?category=小红书 - 按分类过滤项目
   - ✅ GET /showcase/categories - 获取分类统计

6. **Admin 模块** (2/2)
   - ✅ GET /admin/stats (USER 角色) - 正确拒绝访问 (403)
   - ✅ GET /admin/projects/pending (USER 角色) - 正确拒绝访问 (403)

7. **邀请码模块** (1/1)
   - ✅ POST /auth/invitation/validate - 验证无效邀请码 (404)

8. **错误处理** (2/2)
   - ✅ GET /invalid-endpoint - 正确返回 404
   - ✅ POST /auth/register (无效数据) - 正确返回 400

---

## 🐛 发现的问题

### 1. 项目过滤查询参数错误 (严重)

**端点**: `GET /api/v1/projects?type=FULL_TIME&revenueTier=TIER_1`
**状态码**: 500 Internal Server Error
**预期状态码**: 200

**错误详情**:
```
Invalid `prisma.project.findMany()` invocation:
Invalid value for argument `where`: Invalid value provided for field `revenueTier`:
Provided String, expected RevenueTier.
```

**根本原因**:
- 查询参数 `revenueTier=TIER_1` 使用了错误的枚举值
- 正确的枚举值应该是: `TIER_0_1K`, `TIER_1K_5K`, `TIER_5K_10K`, `TIER_10K_30K`, `TIER_30K_50K`, `TIER_50K_100K`, `TIER_100K_PLUS`

**影响范围**:
- 用户无法通过收入层级过滤项目
- 前端如果使用错误的枚举值会导致 500 错误

**建议修复**:
1. 在项目路由中添加查询参数验证
2. 如果提供了无效的 `revenueTier` 值，返回 400 Bad Request 而不是 500
3. 在 API 文档中明确列出所有有效的枚举值
4. 考虑添加 GET /api/v1/enums 端点返回所有枚举值供前端使用

**修复代码示例**:
```typescript
// apps/api/src/modules/projects/routes.ts
const validRevenueTiers = [
  'TIER_0_1K', 'TIER_1K_5K', 'TIER_5K_10K',
  'TIER_10K_30K', 'TIER_30K_50K', 'TIER_50K_100K', 'TIER_100K_PLUS'
];

// 在查询前验证
if (revenueTier && !validRevenueTiers.includes(revenueTier)) {
  throw new ValidationError('Invalid revenueTier value', [
    {
      code: 'invalid_enum_value',
      message: `revenueTier must be one of: ${validRevenueTiers.join(', ')}`,
      path: ['revenueTier'],
    },
  ]);
}
```

---

## ✨ 功能亮点

1. **完善的权限控制**
   - USER 角色无法创建项目 ✅
   - USER 角色无法访问管理端点 ✅
   - Provider 注册需要邀请码 ✅

2. **良好的错误处理**
   - 404 错误正确处理
   - 401 未授权访问正确拦截
   - 403 权限不足正确返回
   - 400 验证错误正确处理

3. **完整的认证流程**
   - 注册、登录、获取用户信息都正常工作
   - JWT Token 正确生成和验证

4. **Showcase 功能完整**
   - 首页数据、热门项目、政策信息都能正常获取
   - 支持按分类过滤

---

## 📋 测试覆盖的端点

### 认证相关
- [x] POST /api/v1/auth/register
- [x] POST /api/v1/auth/login
- [x] GET /api/v1/auth/me
- [x] POST /api/v1/auth/invitation/validate

### 项目相关
- [x] GET /api/v1/projects
- [x] GET /api/v1/projects/:id
- [x] POST /api/v1/projects
- [x] GET /api/v1/projects (with filters)

### Lead 相关
- [x] POST /api/v1/projects/:projectId/leads
- [x] GET /api/v1/users/me/leads

### Showcase 相关
- [x] GET /api/v1/showcase/homepage
- [x] GET /api/v1/showcase/featured
- [x] GET /api/v1/showcase/policies
- [x] GET /api/v1/showcase/all
- [x] GET /api/v1/showcase/categories

### Admin 相关
- [x] GET /api/v1/admin/stats
- [x] GET /api/v1/admin/projects/pending

### 其他
- [x] GET /health

---

## 🔍 未测试的功能

以下功能需要特定权限或数据，未在本次测试中覆盖：

1. **Provider 功能**
   - 创建项目 (需要 PROVIDER 角色)
   - 更新项目
   - 删除项目
   - 查看项目的 Leads
   - 更新 Lead 状态
   - 生成邀请码

2. **Admin 功能**
   - 审核项目 (approve/reject)
   - 查看所有用户
   - 管理邀请码

3. **项目高级功能**
   - 更新项目状态
   - 项目搜索
   - 项目排序

4. **用户功能**
   - 更新个人资料
   - 上传头像
   - 积分系统

---

## 🎯 建议优化

### 1. 输入验证增强
- 在所有接受枚举值的端点添加验证
- 返回更友好的错误消息，包含有效值列表

### 2. API 文档
- 建议添加 Swagger/OpenAPI 文档
- 明确列出所有枚举类型的有效值
- 提供请求/响应示例

### 3. 错误响应标准化
- 确保所有 500 错误都有适当的错误处理
- 考虑添加错误代码以便前端处理

### 4. 测试覆盖
- 添加自动化集成测试
- 添加 Provider 和 Admin 角色的测试用例
- 添加边界条件测试

### 5. 性能优化
- 考虑为频繁查询的端点添加缓存
- 添加分页支持（部分端点已有）
- 添加请求限流（已配置但未测试）

---

## 📝 测试脚本

测试脚本位于: `/Users/alice/Desktop/hahha/workspace/weopc/test-api.ts`

运行测试:
```bash
npx tsx test-api.ts
```

---

## 结论

API 整体质量良好，核心功能正常工作。发现的主要问题是项目过滤查询中的枚举值验证问题，建议尽快修复以避免前端集成时出现问题。权限控制、认证流程、错误处理都表现良好。
