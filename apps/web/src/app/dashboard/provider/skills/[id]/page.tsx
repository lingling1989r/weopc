'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { authenticatedApiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

interface Skill {
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
  updatedAt: string;
}

export default function ProviderSkillDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const skillId = params?.id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    tags: '',
    pricePoints: 0,
    reviewerContact: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'PROVIDER') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['provider-skill', skillId],
    queryFn: async () => {
      const res = await authenticatedApiClient.get(`/skills/${skillId}`);
      return res.data;
    },
    enabled: isAuthenticated() && user?.role === 'PROVIDER' && !!skillId,
  });

  const skill: Skill | null = data?.data || null;

  useEffect(() => {
    if (!skill) return;
    setForm({
      title: skill.title,
      description: skill.description,
      content: skill.content || '',
      category: skill.category || '',
      tags: (skill.tags || []).join(', '),
      pricePoints: skill.pricePoints,
      reviewerContact: skill.reviewerContact || '',
    });
  }, [skill]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description,
        content: form.content || undefined,
        category: form.category || undefined,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        pricePoints: Number(form.pricePoints) || 0,
        reviewerContact: form.reviewerContact || undefined,
      };
      const res = await authenticatedApiClient.put(`/skills/${skillId}`, payload);
      return res.data;
    },
    onSuccess: async () => {
      setMessage({ type: 'success', text: '保存成功' });
      await refetch();
      setTimeout(() => setMessage(null), 2000);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || '保存失败' });
      setTimeout(() => setMessage(null), 2500);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedApiClient.post(`/skills/${skillId}/submit`);
      return res.data;
    },
    onSuccess: async (res) => {
      setMessage({ type: 'success', text: res?.message || '提交成功，等待审核' });
      await refetch();
      setTimeout(() => setMessage(null), 2500);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || '提交失败' });
      setTimeout(() => setMessage(null), 2500);
    },
  });

  if (!isAuthenticated() || user?.role !== 'PROVIDER') return null;

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
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">加载失败或无权限</div>
          <button
            onClick={() => router.push('/dashboard/provider/skills')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回我的 Skills
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const statusBadge =
    skill.reviewStatus === 'DRAFT'
      ? 'bg-gray-100 text-gray-700'
      : skill.reviewStatus === 'PENDING'
      ? 'bg-yellow-100 text-yellow-700'
      : skill.reviewStatus === 'APPROVED'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';

  const canEdit = skill.reviewStatus === 'DRAFT' || skill.reviewStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
        <button
          onClick={() => router.push('/dashboard/provider/skills')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← 返回我的 Skills
        </button>

        <div className="mt-4 bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">管理 Skill</h1>
              <p className="text-sm text-gray-600 mt-1">你可以编辑草稿/被拒绝的 Skill，提交后进入审核</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${statusBadge}`}>{skill.reviewStatus}</span>
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

          {skill.reviewStatus === 'REJECTED' && skill.reviewNote && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
              拒绝原因：{skill.reviewNote}
            </div>
          )}

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                required
                disabled={!canEdit}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">简介</label>
              <textarea
                required
                disabled={!canEdit}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">详细内容</label>
              <textarea
                disabled={!canEdit}
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <input
                  disabled={!canEdit}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">价格（积分）</label>
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={form.pricePoints}
                  onChange={(e) => setForm({ ...form, pricePoints: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">0 表示免费</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签（逗号分隔）</label>
              <input
                disabled={!canEdit}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">微信（审核联系）</label>
              <input
                disabled={!canEdit}
                value={form.reviewerContact}
                onChange={(e) => setForm({ ...form, reviewerContact: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canEdit || updateMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </button>

              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!canEdit || submitMutation.isPending}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? '提交中...' : '提交审核（+10分）'}
              </button>

              {skill.reviewStatus === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => router.push(`/skills/${skill.id}`)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  查看市场页
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
