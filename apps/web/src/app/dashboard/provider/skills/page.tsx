'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { authenticatedApiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

interface Skill {
  id: string;
  title: string;
  description: string;
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

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '已上架', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
};

export default function ProviderSkillsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'PROVIDER') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills', 'my'],
    queryFn: async () => {
      const res = await authenticatedApiClient.get('/skills/my/list');
      return res.data;
    },
    enabled: isAuthenticated() && user?.role === 'PROVIDER',
  });

  const skills: Skill[] = data?.data || [];

  const grouped = useMemo(() => {
    const g: Record<string, Skill[]> = { DRAFT: [], PENDING: [], APPROVED: [], REJECTED: [] };
    for (const s of skills) {
      g[s.reviewStatus] = g[s.reviewStatus] || [];
      g[s.reviewStatus].push(s);
    }
    return g;
  }, [skills]);

  if (!isAuthenticated() || user?.role !== 'PROVIDER') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">我的 Skills</h1>
            <p className="text-gray-600">发布、提交审核、查看审核状态</p>
          </div>
          <Link
            href="/dashboard/provider/skills/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            + 发布新 Skill
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : skills.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">
            你还没有发布任何 Skill
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([status, list]) => {
              if (!list.length) return null;
              const info = statusLabel[status] || statusLabel.DRAFT;
              return (
                <div key={status} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{info.label}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${info.color}`}>{list.length}</span>
                  </div>

                  <div className="space-y-4">
                    {list.map((skill) => (
                      <div key={skill.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{skill.title}</div>
                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">{skill.description}</div>
                            {skill.reviewStatus === 'REJECTED' && skill.reviewNote && (
                              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                                拒绝原因：{skill.reviewNote}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs text-gray-500">价格</div>
                            <div className="text-lg font-bold text-blue-600">
                              {skill.pricePoints === 0 ? '免费' : `${skill.pricePoints} 分`}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <div className="text-gray-500">
                            下载：{skill.downloadCount} · 更新时间：{new Date(skill.updatedAt).toLocaleDateString('zh-CN')}
                          </div>
                          <Link
                            href={`/dashboard/provider/skills/${skill.id}`}
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            管理
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            刷新列表
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
