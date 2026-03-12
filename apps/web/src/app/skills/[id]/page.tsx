'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { authenticatedApiClient, publicApiClient, authApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

interface SkillOwner {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface SkillDetail {
  id: string;
  title: string;
  description: string;
  content: string | null;
  category: string | null;
  tags: string[];
  pricePoints: number;
  reviewStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  reviewerContact: string | null;
  downloadCount: number;
  createdAt: string;
  ownerUserId: string;
  owner: SkillOwner;
  hasRedeemed?: boolean;
}

export default function SkillDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const skillId = params?.id;

  const { data: skillRes, isLoading, error, refetch } = useQuery({
    queryKey: ['skill', skillId],
    queryFn: async () => {
      // Use auth if available to get hasRedeemed
      const client = isAuthenticated() ? authenticatedApiClient : publicApiClient;
      const res = await client.get(`/skills/${skillId}`);
      return res.data;
    },
    enabled: !!skillId,
  });

  const skill: SkillDetail | null = skillRes?.data || null;

  const { data: pointsRes } = useQuery({
    queryKey: ['me', 'points'],
    queryFn: async () => {
      const res = await authenticatedApiClient.get('/users/me/points');
      return res.data;
    },
    enabled: isAuthenticated(),
  });

  const myPoints: number | null = pointsRes?.data?.points ?? null;

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedApiClient.post(`/skills/${skillId}/redeem`);
      return res.data;
    },
    onSuccess: async () => {
      setMessage({ type: 'success', text: '兑换成功！' });
      await Promise.all([refetch(), authApi.getMe().catch(() => null)]);
      setTimeout(() => setMessage(null), 2500);
    },
    onError: (err: any) => {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || '兑换失败，请重试',
      });
      setTimeout(() => setMessage(null), 2500);
    },
  });

  const canRedeem = useMemo(() => {
    if (!skill) return false;
    if (skill.pricePoints === 0) return true;
    if (myPoints === null) return false;
    return myPoints >= skill.pricePoints;
  }, [skill, myPoints]);

  useEffect(() => {
    if (!isAuthenticated()) return;
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">加载中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">加载失败或 Skill 不存在</div>
          <button
            onClick={() => router.push('/skills')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回 Skill 市场
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
        <button
          onClick={() => router.push('/skills')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← 返回 Skill 市场
        </button>

        <div className="mt-4 bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{skill.title}</h1>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{skill.description}</p>
              <div className="mt-3 text-sm text-gray-500">
                作者：{skill.owner.displayName || skill.owner.username}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-gray-500">价格</div>
              <div className="text-2xl font-bold text-blue-600">
                {skill.pricePoints === 0 ? '免费' : `${skill.pricePoints} 分`}
              </div>
              <div className="text-xs text-gray-500 mt-1">下载：{skill.downloadCount}</div>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {skill.category && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {skill.category}
              </span>
            )}
            {skill.tags?.map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-2">内容</h2>
            {skill.hasRedeemed || skill.pricePoints === 0 ? (
              <div className="text-gray-800 whitespace-pre-wrap">
                {skill.content || '（作者未填写详细内容）'}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
                该 Skill 需要兑换后才能查看完整内容。
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              {isAuthenticated() ? (
                <>我的积分：{myPoints ?? '-'} </>
              ) : (
                <>登录后可用积分兑换</>
              )}
            </div>

            {skill.hasRedeemed ? (
              <button
                disabled
                className="px-5 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm font-medium"
              >
                已兑换
              </button>
            ) : !isAuthenticated() ? (
              <button
                onClick={() => router.push(`/login?returnUrl=/skills/${skill.id}`)}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                登录后兑换
              </button>
            ) : (
              <button
                onClick={() => redeemMutation.mutate()}
                disabled={redeemMutation.isPending || !canRedeem}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {redeemMutation.isPending
                  ? '兑换中...'
                  : skill.pricePoints === 0
                  ? '免费领取'
                  : canRedeem
                  ? `兑换（-${skill.pricePoints}分）`
                  : '积分不足'}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
