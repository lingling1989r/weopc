'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';
import { EXECUTION_REQ_LABELS, PROJECT_TYPE_LABELS, REVENUE_TIER_LABELS } from '@/lib/utils';

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  type: string;
  category: string;
  tags: string[];
  revenueTier: string;
  executionReq: string;
  skillsRequired: string[];
  experienceLevel?: string | null;
  location?: string | null;
  city?: string | null;
  province?: string | null;
  duration?: string | null;
  status: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  provider: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  };
  _count: {
    leads: number;
    reviews: number;
    comments: number;
  };
}

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '已拒绝',
  PAUSED: '已暂停',
  CLOSED: '已关闭',
  ARCHIVED: '已归档',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};

export default function AdminProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getProjectById(projectId);
      setProject(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!project) return;
    try {
      setSubmitting(true);
      const res = await adminApi.approveProject(project.id);
      setProject((current) => (current ? { ...current, ...res.data.data } : current));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '批准失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!project || rejectReason.trim().length < 10) return;
    try {
      setSubmitting(true);
      const res = await adminApi.rejectProject(project.id, rejectReason);
      setProject((current) => (current ? { ...current, ...res.data.data } : current));
      setShowRejectModal(false);
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
          <div className="text-center text-gray-500">加载中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center text-red-500">{error || '项目不存在'}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">项目详情</h1>
            <p className="text-gray-600">查看项目详情并执行审核操作</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回后台
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{project.title}</h2>
                  {project.shortDescription && (
                    <p className="text-gray-500 mt-2">{project.shortDescription}</p>
                  )}
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">项目类型</div>
                  <div className="font-medium">{PROJECT_TYPE_LABELS[project.type] || project.type}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">收益区间</div>
                  <div className="font-medium">{REVENUE_TIER_LABELS[project.revenueTier] || project.revenueTier}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">执行方式</div>
                  <div className="font-medium">{EXECUTION_REQ_LABELS[project.executionReq] || project.executionReq}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">分类</div>
                  <div className="font-medium">{project.category}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">地区</div>
                  <div className="font-medium">{project.location || [project.province, project.city].filter(Boolean).join(' / ') || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">周期</div>
                  <div className="font-medium">{project.duration || '-'}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">项目描述</h3>
                <div className="text-gray-700 leading-7 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                  {project.description}
                </div>
              </div>

              {project.rejectionReason && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-red-800 mb-1">拒绝原因</div>
                  <div className="text-sm text-red-700">{project.rejectionReason}</div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">技能与标签</h3>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">所需技能</div>
                  <div className="flex flex-wrap gap-2">
                    {project.skillsRequired.length > 0 ? project.skillsRequired.map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {skill}
                      </span>
                    )) : <span className="text-sm text-gray-400">暂无</span>}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">标签</div>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.length > 0 ? project.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    )) : <span className="text-sm text-gray-400">暂无</span>}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">经验要求</div>
                  <div className="text-sm font-medium text-gray-700">{project.experienceLevel || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">审核操作</h3>
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting || project.status !== 'PENDING_REVIEW'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '处理中...' : '批准项目'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting || project.status !== 'PENDING_REVIEW'}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  拒绝项目
                </button>
                {project.status !== 'PENDING_REVIEW' && (
                  <p className="text-sm text-gray-500 text-center">当前项目不在待审核状态</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">项目方信息</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">名称</div>
                  <div className="font-medium">{project.provider.displayName || project.provider.username}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">用户名</div>
                  <div className="font-medium">@{project.provider.username}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">邮箱</div>
                  <div className="font-medium">{project.provider.email}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">角色</div>
                  <div className="font-medium">{project.provider.role === 'PROVIDER' ? '项目发布者' : project.provider.role}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">注册时间</div>
                  <div className="font-medium">{new Date(project.provider.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">统计信息</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{project._count.leads}</div>
                  <div className="text-xs text-gray-500 mt-1">申请</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">{project._count.reviews}</div>
                  <div className="text-xs text-gray-500 mt-1">评价</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-orange-600">{project._count.comments}</div>
                  <div className="text-xs text-gray-500 mt-1">评论</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-4">
                提交时间：{new Date(project.createdAt).toLocaleString('zh-CN')}
              </div>
              {project.reviewedAt && (
                <div className="text-sm text-gray-500 mt-2">
                  最近审核时间：{new Date(project.reviewedAt).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">拒绝项目</h2>
            <p className="text-gray-600 mb-4">请填写拒绝原因，主理人将在后台看到该反馈。</p>
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
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReject}
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
