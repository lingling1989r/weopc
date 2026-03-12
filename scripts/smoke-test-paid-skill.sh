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

echo "=== Paid Skill Redemption Smoke Test ==="

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@weopc.org}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASSWORD"'"
  }' | jq -r '.data.token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 获取 ADMIN_TOKEN 失败。请先 seed"
  exit 1
fi

TS=$(date +%s)

# Create a buyer user (will have 20 points)
BUYER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer-'"$TS"'@test.com",
    "password": "test123456",
    "username": "buyer-'"$TS"'",
    "role": "USER"
  }')
TOKEN_BUYER=$(echo "$BUYER" | jq -r '.data.token // empty')
if [ -z "$TOKEN_BUYER" ]; then
  echo "❌ buyer 注册失败"; exit 1
fi

# Create provider
PROV_INVITE=$(curl -s -X POST "$API_URL/auth/invitation/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":1}' | jq -r '.data.codes[0].code // empty')

PROVIDER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider-paid-'"$TS"'@test.com",
    "password": "test123456",
    "username": "providerPaid-'"$TS"'",
    "role": "PROVIDER",
    "invitationCode": "'"$PROV_INVITE"'"
  }')
TOKEN_PROVIDER=$(echo "$PROVIDER" | jq -r '.data.token // empty')
if [ -z "$TOKEN_PROVIDER" ]; then
  echo "❌ provider 注册失败"; exit 1
fi

# Provider creates a paid skill: pricePoints 50
SKILL=$(curl -s -X POST "$API_URL/skills" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PROVIDER" \
  -d '{
    "title": "付费 Skill-'"$TS"'",
    "description": "需要 50 积分兑换",
    "content": "兑换后可见",
    "category": "测试",
    "tags": ["paid"],
    "pricePoints": 50,
    "reviewerContact": "wechat-test"
  }')
SKILL_ID=$(echo "$SKILL" | jq -r '.data.id // empty')
if [ -z "$SKILL_ID" ]; then
  echo "❌ skill 创建失败"; exit 1
fi

curl -s -X POST "$API_URL/skills/$SKILL_ID/submit" -H "Authorization: Bearer $TOKEN_PROVIDER" >/dev/null
curl -s -X POST "$API_URL/admin/skills/$SKILL_ID/approve" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null

# Buyer tries redeem (should fail: only 20 points)
echo "[1] buyer 尝试兑换（应失败：积分不足）"
RESP=$(curl -s -X POST "$API_URL/skills/$SKILL_ID/redeem" -H "Authorization: Bearer $TOKEN_BUYER")
echo "$RESP" | jq -c '.success // .error.message // .'

echo "✅ Paid skill smoke test finished"
