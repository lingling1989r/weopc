'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { authenticatedApiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

export default function NewSkillPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [formData, setFormData] = useState({
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formData.title,
        description: formData.description,
        content: formData.content || undefined,
        category: formData.category || undefined,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        pricePoints: Number(formData.pricePoints) || 0,
        reviewerContact: formData.reviewerContact || undefined,
      };
      const res = await authenticatedApiClient.post('/skills', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setMessage({ type: 'success', text: '创建成功，已保存为草稿' });
      const id = data?.data?.id;
      setTimeout(() => {
        if (id) router.push(`/dashboard/provider/skills/${id}`);
        else router.push('/dashboard/provider/skills');
      }, 800);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || '创建失败' });
    },
  });

  if (!isAuthenticated() || user?.role !== 'PROVIDER') return null;

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
          <h1 className="text-2xl font-bold mb-2">发布新 Skill</h1>
          <p className="text-gray-600 text-sm">先保存为草稿，确认后提交审核（微信人工审核）</p>

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

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">简介</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">详细内容（兑换后可见）</label>
              <textarea
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="可以写使用说明、步骤、链接等"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="如：写作 / 剪辑 / 编程"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">价格（积分）</label>
                <input
                  type="number"
                  min={0}
                  value={formData.pricePoints}
                  onChange={(e) => setFormData({ ...formData, pricePoints: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">填 0 表示免费</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签（逗号分隔）</label>
              <input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：GPT, 提示词, 自动化"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">微信（审核联系）</label>
              <input
                value={formData.reviewerContact}
                onChange={(e) => setFormData({ ...formData, reviewerContact: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="填写你的微信号，便于人工联系审核"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '保存中...' : '保存草稿'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/provider/skills')}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
