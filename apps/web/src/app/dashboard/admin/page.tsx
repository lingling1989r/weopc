'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  provider: {
    id: string;
    username: string;
    displayName: string;
    email: string;
  };
  _count: {
    leads: number;
  };
}

interface Stats {
  projects: {
    pending: number;
    published: number;
    rejected: number;
    total: number;
  };
  users: {
    total: number;
    providers: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, projectsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPendingProjects(),
      ]);

      setStats(statsRes.data.data);
      setPendingProjects(projectsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (projectId: string) => {
    try {
      await adminApi.approveProject(projectId);
      setPendingProjects(pendingProjects.filter((p) => p.id !== projectId));
      if (stats) {
        setStats({
          ...stats,
          projects: {
            ...stats.projects,
            pending: stats.projects.pending - 1,
            published: stats.projects.published + 1,
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '批准失败');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingId || !rejectReason.trim()) return;

    try {
      setSubmitting(true);
      await adminApi.rejectProject(rejectingId, rejectReason);
      setPendingProjects(pendingProjects.filter((p) => p.id !== rejectingId));
      if (stats) {
        setStats({
          ...stats,
          projects: {
            ...stats.projects,
            pending: stats.projects.pending - 1,
            rejected: stats.projects.rejected + 1,
          },
        });
      }
      setRejectingId(null);
      setRejectReason('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '拒绝失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center">加载中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">管理后台</h1>
          <p className="text-gray-600">项目审核和平台统计</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">待审核项目</div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.projects.pending}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">已发布项目</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.projects.published}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">已拒绝项目</div>
              <div className="text-3xl font-bold text-red-600">
                {stats.projects.rejected}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">总用户数</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.users.total}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">Provider 数</div>
              <div className="text-3xl font-bold text-purple-600">
                {stats.users.providers}
              </div>
            </div>
          </div>
        )}

        {/* Pending Projects */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">待审核项目</h2>

          {pendingProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无待审核项目
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">项目标题</th>
                    <th className="text-left py-3 px-4 font-semibold">主理人</th>
                    <th className="text-left py-3 px-4 font-semibold">邮箱</th>
                    <th className="text-left py-3 px-4 font-semibold">申请时间</th>
                    <th className="text-left py-3 px-4 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProjects.map((project) => (
                    <tr key={project.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {project.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {project.provider.displayName}
                        </div>
                        <div className="text-sm text-gray-600">
                          @{project.provider.username}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {project.provider.email}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(project.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => setRejectingId(project.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">拒绝项目</h2>
            <p className="text-gray-600 mb-4">
              请填写拒绝原因，主理人将收到通知
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={4}
              placeholder="请输入拒绝原因（至少10个字符）..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={submitting || rejectReason.trim().length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
