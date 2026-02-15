'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { projectsApi, authApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  _count: {
    leads: number;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: '审核中', color: 'bg-yellow-100 text-yellow-800' },
  PUBLISHED: { label: '已发布', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  PAUSED: { label: '已暂停', color: 'bg-orange-100 text-orange-800' },
  CLOSED: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
  ARCHIVED: { label: '已归档', color: 'bg-gray-100 text-gray-800' },
};

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'PROVIDER') {
      router.push('/');
      return;
    }

    loadProjects();
  }, [isAuthenticated, user, router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getMyProjects();
      const projectList = response.data.data;
      setProjects(projectList);

      // Calculate stats
      setStats({
        total: projectList.length,
        published: projectList.filter((p: Project) => p.status === 'PUBLISHED').length,
        pending: projectList.filter((p: Project) => p.status === 'PENDING_REVIEW').length,
        rejected: projectList.filter((p: Project) => p.status === 'REJECTED').length,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    router.push('/projects/new');
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  if (!isAuthenticated() || user?.role !== 'PROVIDER') {
    return null;
  }

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">我的项目</h1>
            <p className="text-gray-600">管理你发布的项目</p>
          </div>
          <button
            onClick={handleCreateProject}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            + 发布新项目
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">总项目数</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">已发布</div>
            <div className="text-3xl font-bold text-green-600">{stats.published}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">审核中</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">已拒绝</div>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">还没有发布任何项目</div>
              <button
                onClick={handleCreateProject}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                发布第一个项目
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const statusInfo = STATUS_LABELS[project.status] || STATUS_LABELS.DRAFT;
                return (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {project.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-4 ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {project.status === 'REJECTED' && project.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <div className="text-sm font-semibold text-red-800 mb-1">
                          拒绝原因
                        </div>
                        <div className="text-sm text-red-700">
                          {project.rejectionReason}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="space-x-4">
                        <span>申请数: {project._count.leads}</span>
                        <span>
                          发布于: {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewProject(project.id)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
