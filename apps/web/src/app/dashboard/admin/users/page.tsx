'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';

interface User {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  role: string;
  status: string;
  level: string;
  points: number;
  avgRating: number;
  reviewCount: number;
  officialCertifiedAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const levelLabels: Record<string, string> = {
  NORMAL: '普通',
  OFFICIAL: '官方认证',
  GOLD: '黄金',
  KING: '王者',
};

const levelColors: Record<string, string> = {
  NORMAL: 'bg-gray-100 text-gray-700',
  OFFICIAL: 'bg-blue-100 text-blue-700',
  GOLD: 'bg-yellow-100 text-yellow-700',
  KING: 'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [certifying, setCertifying] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, levelFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { page, limit: 20 };
      if (levelFilter) params.level = levelFilter;
      const res = await adminApi.getUsers(params);
      setUsers(res.data.data);
      setPagination(res.data.meta.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async (userId: string, certified: boolean) => {
    try {
      setCertifying(userId);
      const res = await adminApi.certifyUser(userId, certified);
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...res.data.data } : u)));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败');
    } finally {
      setCertifying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">用户管理</h1>
            <p className="text-gray-600">管理用户等级与官方认证</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回后台
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">等级筛选：</label>
          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部</option>
            <option value="NORMAL">普通</option>
            <option value="OFFICIAL">官方认证</option>
            <option value="GOLD">黄金</option>
            <option value="KING">王者</option>
          </select>
          {pagination && (
            <span className="text-sm text-gray-500 ml-auto">
              共 {pagination.total} 位用户
            </span>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无用户</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">用户</th>
                    <th className="text-left py-3 px-4 font-semibold">等级</th>
                    <th className="text-left py-3 px-4 font-semibold">积分</th>
                    <th className="text-left py-3 px-4 font-semibold">评分</th>
                    <th className="text-left py-3 px-4 font-semibold">认证状态</th>
                    <th className="text-left py-3 px-4 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                        >
                          {user.displayName || user.username}
                        </div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${levelColors[user.level] || 'bg-gray-100 text-gray-700'}`}>
                          {levelLabels[user.level] || user.level}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-blue-600">
                        {user.points}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {user.avgRating > 0 ? user.avgRating.toFixed(1) : '-'}
                          <span className="text-gray-400 ml-1">({user.reviewCount})</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {user.officialCertifiedAt ? (
                          <span className="text-blue-600 text-sm font-medium">已认证</span>
                        ) : (
                          <span className="text-gray-400 text-sm">未认证</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                            className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                          >
                            详情
                          </button>
                          {user.level === 'NORMAL' && (
                            <button
                              onClick={() => handleCertify(user.id, true)}
                              disabled={certifying === user.id}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                              {certifying === user.id ? '处理中' : '授予认证'}
                            </button>
                          )}
                          {user.level === 'OFFICIAL' && (
                            <button
                              onClick={() => handleCertify(user.id, false)}
                              disabled={certifying === user.id}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                            >
                              {certifying === user.id ? '处理中' : '撤销认证'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {pagination.page} / {pagination.totalPages} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
