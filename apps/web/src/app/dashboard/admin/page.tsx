'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';
import { EXECUTION_REQ_LABELS, PROJECT_TYPE_LABELS, REVENUE_TIER_LABELS } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  type?: string;
  category?: string;
  revenueTier?: string;
  executionReq?: string;
  status: string;
  location?: string | null;
  city?: string | null;
  province?: string | null;
  duration?: string | null;
  skillsRequired?: string[];
  experienceLevel?: string | null;
  tags?: string[];
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
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
  invitations?: {
    active: number;
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
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
      setPendingProjects(pendingProjects.filter((project) => project.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      if (stats) {
        setStats({
          ...stats,
          projects: {
            ...stats.projects,
            pending: Math.max(stats.projects.pending - 1, 0),
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
      setPendingProjects(pendingProjects.filter((project) => project.id !== rejectingId));
      if (selectedProject?.id === rejectingId) {
        setSelectedProject(null);
      }
      if (stats) {
        setStats({
          ...stats,
          projects: {
            ...stats.projects,
            pending: Math.max(stats.projects.pending - 1, 0),
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

  const handleViewProject = async (projectId: string) => {
    try {
      setDetailLoading(true);
      const res = await adminApi.getProjectById(projectId);
      setSelectedProject(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载项目详情失败');
    } finally {
      setDetailLoading(false);
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

      <main className="flex-grow container mx-auto px-4 py-12 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">管理后台</h1>
          <p className="text-gray-600">项目审核、邀请码管理入口与平台统计</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        )}

        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/admin/users"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            用户与邀请码管理
          </Link>
          <Link
            href="/dashboard/admin/skills/pending"
            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            Skill 审核
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">待审核项目</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.projects.pending}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">已发布项目</div>
              <div className="text-3xl font-bold text-green-600">{stats.projects.published}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">已拒绝项目</div>
              <div className="text-3xl font-bold text-red-600">{stats.projects.rejected}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">普通用户</div>
              <div className="text-3xl font-bold text-blue-600">{stats.users.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">Provider 数</div>
              <div className="text-3xl font-bold text-purple-600">{stats.users.providers}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-2">可用邀请码</div>
              <div className="text-3xl font-bold text-emerald-600">{stats.invitations?.active || 0}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">待审核项目</h2>
              <span className="text-sm text-gray-500">共 {pendingProjects.length} 个</span>
            </div>

            {pendingProjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">暂无待审核项目</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">项目标题</th>
                      <th className="text-left py-3 px-4 font-semibold">主理人</th>
                      <th className="text-left py-3 px-4 font-semibold">申请时间</th>
                      <th className="text-left py-3 px-4 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProjects.map((project) => (
                      <tr key={project.id} className="border-b hover:bg-gray-50 align-top">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{project.title}</div>
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium">{project.provider.displayName || project.provider.username}</div>
                          <div className="text-sm text-gray-600">@{project.provider.username}</div>
                          <div className="text-xs text-gray-400 mt-1">{project.provider.email}</div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleViewProject(project.id)}
                              className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                            >
                              查看详情
                            </button>
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

          <div className="xl:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">项目详情</h2>
              {detailLoading && <span className="text-sm text-gray-500">加载中...</span>}
            </div>

            {!selectedProject ? (
              <div className="text-center py-12 text-gray-500">选择左侧项目查看详情</div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedProject.title}</h3>
                  {selectedProject.shortDescription && (
                    <p className="text-sm text-gray-500 mt-1">{selectedProject.shortDescription}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">项目类型</div>
                    <div className="font-medium">{selectedProject.type ? PROJECT_TYPE_LABELS[selectedProject.type] || selectedProject.type : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">收益区间</div>
                    <div className="font-medium">{selectedProject.revenueTier ? REVENUE_TIER_LABELS[selectedProject.revenueTier] || selectedProject.revenueTier : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">执行方式</div>
                    <div className="font-medium">{selectedProject.executionReq ? EXECUTION_REQ_LABELS[selectedProject.executionReq] || selectedProject.executionReq : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">申请数</div>
                    <div className="font-medium">{selectedProject._count.leads}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">分类</div>
                    <div className="font-medium">{selectedProject.category || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">地区</div>
                    <div className="font-medium">{selectedProject.location || [selectedProject.province, selectedProject.city].filter(Boolean).join(' / ') || '-'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">项目描述</div>
                  <div className="text-sm text-gray-600 leading-6 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                    {selectedProject.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">项目方</div>
                    <div className="font-medium">{selectedProject.provider.displayName || selectedProject.provider.username}</div>
                    <div className="text-gray-500">@{selectedProject.provider.username}</div>
                    <div className="text-gray-500">{selectedProject.provider.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">补充信息</div>
                    <div className="font-medium">周期：{selectedProject.duration || '-'}</div>
                    <div className="text-gray-500">经验要求：{selectedProject.experienceLevel || '-'}</div>
                    <div className="text-gray-500">提交时间：{new Date(selectedProject.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                </div>

                {selectedProject.skillsRequired && selectedProject.skillsRequired.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">所需技能</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.skillsRequired.map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProject.tags && selectedProject.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">标签</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {rejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">拒绝项目</h2>
            <p className="text-gray-600 mb-4">请填写拒绝原因，主理人会在后台看到该原因。</p>
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
