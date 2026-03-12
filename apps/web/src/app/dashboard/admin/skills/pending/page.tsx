'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { authenticatedApiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

interface SkillOwner {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatar: string | null;
}

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
  owner: SkillOwner;
}

export default function AdminSkillsPendingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [error, setError] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'skills', 'pending'],
    queryFn: async () => {
      const res = await authenticatedApiClient.get('/admin/skills/pending');
      return res.data;
    },
    enabled: isAuthenticated() && user?.role === 'ADMIN',
  });

  const skills: Skill[] = data?.data || [];

  const handleApprove = async (skillId: string) => {
    try {
      setSubmitting(true);
      await authenticatedApiClient.post(`/admin/skills/${skillId}/approve`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    try {
      setSubmitting(true);
      await authenticatedApiClient.post(`/admin/skills/${rejectingId}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated() || user?.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Skill 审核</h1>
            <p className="text-gray-600">审核用户提交的 Skill</p>
          </div>
          <button onClick={() => router.push('/dashboard/admin')} className="text-blue-600 hover:text-blue-700 font-medium">
            ← 返回后台
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : skills.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">暂无可审核的 Skill</div>
        ) : (
          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.id} className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">{skill.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{skill.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      作者：{skill.owner.displayName || skill.owner.username} ({skill.owner.email})
                    </div>
                    {skill.reviewerContact && (
                      <div className="mt-2 text-xs text-blue-600">微信：{skill.reviewerContact}</div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skill.category && <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{skill.category}</span>}
                      {skill.tags?.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{t}</span>
                      ))}
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        {skill.pricePoints === 0 ? '免费' : `${skill.pricePoints} 积分`}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(skill.id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      通过（+40分）
                    </button>
                    <button
                      onClick={() => setRejectingId(skill.id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      拒绝
                    </button>
                  </div>
                </div>

                {rejectingId === skill.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">拒绝原因</h4>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="请输入拒绝原因（必填）"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleRejectSubmit}
                        disabled={!rejectReason.trim() || submitting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        确认拒绝
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
