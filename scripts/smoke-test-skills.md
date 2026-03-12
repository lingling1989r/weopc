# Skill 积分兑换全流程 Smoke Test

## 前置条件
1. 数据库已同步 schema：`cd apps/api && npx prisma db push`
2. API 服务已启动：`cd apps/api && pnpm dev`（端口 3002）
3. Web 服务已启动：`cd apps/web && pnpm dev`（端口 3003）

---

## Step 1: 注册普通用户 A（会获得 +20 注册积分）
```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-a@test.com",
    "password": "test123456",
    "username": "userA",
    "role": "USER"
  }'
```
**预期**：返回 token + `pointsAwarded: { signup: 20, invite: 0 }`

---

## Step 2: 注册普通用户 B（使用 A 的邀请码）
```bash
# 先获取 A 的邀请码（管理员生成或直接查库）
# 这里假设已获取到邀请码 INVITE-XXX

curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-b@test.com",
    "password": "test123456",
    "username": "userB",
    "role": "USER",
    "inviteCode": "INVITE-XXX"
  }'
```
**预期**：返回 token + `pointsAwarded: { signup: 20, invite: 10 }`（B 得 10，邀请人 A 得 30）

---

## Step 3: Provider 用户注册（需邀请码）
```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@test.com",
    "password": "test123456",
    "username": "provider",
    "role": "PROVIDER",
    "invitationCode": "PROVIDER-INVITE-CODE"
  }'
```
**预期**：返回 token（Provider 需有效邀请码才能注册）

---

## Step 4: Provider 创建 Skill（草稿状态）
```bash
TOKEN="Provider的token"

curl -X POST http://localhost:3002/api/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "测试 Skill",
    "description": "这是一个测试 Skill，用于验证积分兑换流程",
    "content": "这里是 Skill 的详细内容，兑换后可见",
    "category": "测试",
    "tags": ["test", "demo"],
    "pricePoints": 50,
    "reviewerContact": "wechat-test"
  }'
```
**预期**：返回 `reviewStatus: "DRAFT"`

---

## Step 5: Provider 提交审核（+10 积分）
```bash
TOKEN="Provider的token"
SKILL_ID="上一步返回的skill id"

curl -X POST "http://localhost:3002/api/v1/skills/$SKILL_ID/submit" \
  -H "Authorization: Bearer $TOKEN"
```
**预期**：返回成功，`reviewStatus` 变为 `"PENDING"`，Provider 获得 +10 积分

---

## Step 6: Admin 审核通过（+40 积分）
```bash
ADMIN_TOKEN="Admin的token"

curl -X POST "http://localhost:3002/api/v1/admin/skills/$SKILL_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**预期**：返回成功，`reviewStatus` 变为 `"APPROVED"`，Provider 获得 +40 积分

---

## Step 7: 用户 A 兑换 Skill（-50 积分）
```bash
TOKEN_A="用户A的token"

curl -X POST "http://localhost:3002/api/v1/skills/$SKILL_ID/redeem" \
  -H "Authorization: Bearer $TOKEN_A"
```
**预期**：返回成功，用户 A 扣除 50 积分，`downloadCount` +1

---

## Step 8: 验证积分变动
```bash
# 查询用户 A 当前积分
curl http://localhost:3002/api/v1/users/me/points \
  -H "Authorization: Bearer $TOKEN_A"
```
**预期**：积分已扣除（20 注册 + 0 邀请 - 50 兑换 = 负数或剩余不足提示）

---

## Step 9: 验证已购列表
```bash
curl http://localhost:3002/api/v1/skills/my/purchased \
  -H "Authorization: Bearer $TOKEN_A"
```
**预期**：返回包含刚兑换的 Skill，记录 `costPoints: 50`

---

## 快速验证脚本（可选）
```bash
# 把上面的 curl 命令封装成脚本，一次跑完
bash scripts/smoke-test-skills.sh
```
