#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3002/api/v1}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "❌ Missing required command: $1";
    exit 1;
  }
}

need_cmd curl
need_cmd jq

echo "=== Skill 积分兑换全流程 Smoke Test ==="
echo "API_URL=$API_URL"
echo ""

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@weopc.org}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

echo "[0] 获取 Admin token（用于生成邀请码/审核 Skill）..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASSWORD"'"
  }' | jq -r '.data.token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 获取 ADMIN_TOKEN 失败。请先运行：cd apps/api && pnpm seed"
  exit 1
fi

echo "✅ ADMIN_TOKEN OK"

# Step 1: 注册用户 A
echo ""
echo "[1] 注册普通用户 A (+20 积分)..."
TS=$(date +%s)
RESP_A=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-a-'"$TS"'@test.com",
    "password": "test123456",
    "username": "userA-'"$TS"'",
    "role": "USER"
  }')
echo "$RESP_A" | jq -c '.data.pointsAwarded // .error.message // .' || true
TOKEN_A=$(echo "$RESP_A" | jq -r '.data.token // empty')
if [ -z "$TOKEN_A" ]; then
  echo "❌ 用户 A 注册失败"
  exit 1
fi
echo "✅ 用户 A 注册成功"

# Step 2: 生成邀请码（用 admin 生成一个 ACTIVE 码给 inviteCode 使用）
echo ""
echo "[2] Admin 生成邀请码（用于 inviteCode）..."
INVITE_CODE=$(curl -s -X POST "$API_URL/auth/invitation/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":1}' | jq -r '.data.codes[0].code // empty')

if [ -z "$INVITE_CODE" ]; then
  echo "❌ 生成 INVITE_CODE 失败"
  exit 1
fi

echo "✅ INVITE_CODE=$INVITE_CODE"

# Step 3: 注册用户 B（使用邀请码）
echo ""
echo "[3] 注册用户 B（使用邀请码 +10 积分）..."
TS2=$(date +%s)
RESP_B=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-b-'"$TS2"'@test.com",
    "password": "test123456",
    "username": "userB-'"$TS2"'",
    "role": "USER",
    "inviteCode": "'"$INVITE_CODE"'"
  }')
echo "$RESP_B" | jq -c '.data.pointsAwarded // .error.message // .' || true
TOKEN_B=$(echo "$RESP_B" | jq -r '.data.token // empty')
if [ -z "$TOKEN_B" ]; then
  echo "❌ 用户 B 注册失败"
  exit 1
fi
echo "✅ 用户 B 注册成功"

# Step 4: 注册 Provider（需要 invitationCode）
echo ""
echo "[4] Admin 生成 Provider invitationCode..."
PROV_INVITE=$(curl -s -X POST "$API_URL/auth/invitation/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":1}' | jq -r '.data.codes[0].code // empty')

if [ -z "$PROV_INVITE" ]; then
  echo "❌ 生成 Provider invitationCode 失败"
  exit 1
fi

echo "✅ PROVIDER_INVITATION_CODE=$PROV_INVITE"

echo "[4.1] 注册 Provider..."
TS3=$(date +%s)
RESP_P=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider-'"$TS3"'@test.com",
    "password": "test123456",
    "username": "provider-'"$TS3"'",
    "role": "PROVIDER",
    "invitationCode": "'"$PROV_INVITE"'"
  }')
TOKEN_P=$(echo "$RESP_P" | jq -r '.data.token // empty')
if [ -z "$TOKEN_P" ]; then
  echo "$RESP_P" | jq . || true
  echo "❌ Provider 注册失败"
  exit 1
fi

echo "✅ Provider 注册成功"

# Step 5: Provider 创建 Skill
echo ""
echo "[5] Provider 创建 Skill（草稿）..."
SKILL_RESP=$(curl -s -X POST "$API_URL/skills" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_P" \
  -d '{
    "title": "测试 Skill-'"$(date +%s)"'",
    "description": "这是一个测试 Skill，用于验证积分兑换流程",
    "content": "这里是 Skill 的详细内容，兑换后可见",
    "category": "测试",
    "tags": ["test", "demo"],
    "pricePoints": 0,
    "reviewerContact": "wechat-test"
  }')
SKILL_ID=$(echo "$SKILL_RESP" | jq -r '.data.id // empty')
if [ -z "$SKILL_ID" ]; then
  echo "$SKILL_RESP" | jq . || true
  echo "❌ Skill 创建失败"
  exit 1
fi

echo "✅ Skill 创建成功 SKILL_ID=$SKILL_ID"

# Step 6: Provider 提交审核
echo ""
echo "[6] Provider 提交审核 (+10 积分)..."
curl -s -X POST "$API_URL/skills/$SKILL_ID/submit" \
  -H "Authorization: Bearer $TOKEN_P" | jq -c '.success // .error.message // .' || true

# Step 7: Admin 审核通过
echo ""
echo "[7] Admin 审核通过 (+40 积分)..."
curl -s -X POST "$API_URL/admin/skills/$SKILL_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -c '.success // .error.message // .' || true

# Step 8: 用户 A 兑换 Skill（这里 Skill 免费，应该直接成功）
echo ""
echo "[8] 用户 A 兑换 Skill（免费领取）..."
curl -s -X POST "$API_URL/skills/$SKILL_ID/redeem" \
  -H "Authorization: Bearer $TOKEN_A" | jq -c '.success // .error.message // .' || true

# Step 9: 查询已购列表
echo ""
echo "[9] 查询用户 A 已购列表..."
curl -s "$API_URL/skills/my/purchased" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data | length'

echo ""
echo "=== Smoke Test 完成 ==="
