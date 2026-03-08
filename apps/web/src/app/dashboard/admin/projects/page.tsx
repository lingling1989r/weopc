'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';

interface Project {
  id: string;
  title: string;
  shortDescription?: string | null;
  type: string;
  category: string;
  status: string;
  city?: string | null;
  province?: string | null;
  createdAt: string;
  provider: {
    username: string;
    displayName: string;
    email: string;
  };
  _count: {
    leads: number;
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

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await adminApi.getAllProjects(params);
      setProjects(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">项目管理</h1>
            <p className="text-gray-600">查看和管理所有项目</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回后台
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>
        )}

        {/* 筛选 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-white border'
            }`}
          >
            全部
          </button>
          {Object.entries(statusLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === key ? 'bg-blue-600 text-white' : 'bg-white border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无项目</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">项目</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">发布者</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">报名</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/admin/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {project.title}
                      </Link>
                      {project.shortDescription && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {project.shortDescription}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>{project.provider.displayName || project.provider.username}</div>
                      <div className="text-gray-500">{project.provider.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[project.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabels[project.status] || project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project._count.leads}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/admin/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
