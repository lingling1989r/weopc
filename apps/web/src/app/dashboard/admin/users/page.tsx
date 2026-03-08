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

interface InvitationCode {
  id: string;
  code: string;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  generatedBy: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
  };
  usedBy: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
  } | null;
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

const invitationStatusLabels: Record<string, string> = {
  ACTIVE: '可用',
  USED: '已使用',
  EXPIRED: '已过期',
  REVOKED: '已禁用',
};

const invitationStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  USED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-700',
  REVOKED: 'bg-red-100 text-red-700',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [userPagination, setUserPagination] = useState<Pagination | null>(null);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [codePagination, setCodePagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [codeStatusFilter, setCodeStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [codePage, setCodePage] = useState(1);
  const [certifying, setCertifying] = useState<string | null>(null);
  const [disablingCodeId, setDisablingCodeId] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState(1);
  const [generatingCodes, setGeneratingCodes] = useState(false);

  useEffect(() => {
    loadData();
  }, [userPage, codePage, levelFilter, codeStatusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const userParams: any = { page: userPage, limit: 20 };
      if (levelFilter) userParams.level = levelFilter;

      const codeParams: any = { page: codePage, limit: 10 };
      if (codeStatusFilter) codeParams.status = codeStatusFilter;

      const [usersRes, codesRes] = await Promise.all([
        adminApi.getUsers(userParams),
        adminApi.getInvitationCodes(codeParams),
      ]);

      setUsers(usersRes.data.data);
      setUserPagination(usersRes.data.meta.pagination);
      setInvitationCodes(codesRes.data.data);
      setCodePagination(codesRes.data.meta.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async (userId: string, certified: boolean) => {
    try {
      setCertifying(userId);
      const res = await adminApi.certifyUser(userId, certified);
      setUsers(users.map((user) => (user.id === userId ? { ...user, ...res.data.data } : user)));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败');
    } finally {
      setCertifying(null);
    }
  };

  const handleGenerateCodes = async () => {
    try {
      setGeneratingCodes(true);
      await adminApi.generateInvitationCodes(generateCount);
      setCodePage(1);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '生成邀请码失败');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleDisableCode = async (codeId: string) => {
    try {
      setDisablingCodeId(codeId);
      const res = await adminApi.disableInvitationCode(codeId);
      setInvitationCodes(invitationCodes.map((item) => (item.id === codeId ? { ...item, ...res.data.data } : item)));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '禁用邀请码失败');
    } finally {
      setDisablingCodeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">用户管理</h1>
            <p className="text-gray-600">管理用户等级、认证状态与邀请码</p>
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

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">邀请码管理</h2>
              <p className="text-sm text-gray-500">管理员可生成、查看并禁用邀请码，供 Provider 注册使用</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={generateCount}
                onChange={(e) => setGenerateCount(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>生成 1 个</option>
                <option value={3}>生成 3 个</option>
                <option value={5}>生成 5 个</option>
                <option value={10}>生成 10 个</option>
              </select>
              <button
                onClick={handleGenerateCodes}
                disabled={generatingCodes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingCodes ? '生成中...' : '生成邀请码'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700">状态筛选：</label>
            <select
              value={codeStatusFilter}
              onChange={(e) => {
                setCodeStatusFilter(e.target.value);
                setCodePage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="ACTIVE">可用</option>
              <option value="USED">已使用</option>
              <option value="EXPIRED">已过期</option>
              <option value="REVOKED">已禁用</option>
            </select>
            {codePagination && (
              <span className="text-sm text-gray-500 sm:ml-auto">共 {codePagination.total} 个邀请码</span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : invitationCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无邀请码</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">邀请码</th>
                    <th className="text-left py-3 px-4 font-semibold">状态</th>
                    <th className="text-left py-3 px-4 font-semibold">创建人</th>
                    <th className="text-left py-3 px-4 font-semibold">使用人</th>
                    <th className="text-left py-3 px-4 font-semibold">有效期</th>
                    <th className="text-left py-3 px-4 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invitationCodes.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-mono font-semibold text-gray-900">{item.code}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          创建于 {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${invitationStatusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                          {invitationStatusLabels[item.status] || item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {item.generatedBy.displayName || item.generatedBy.username}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {item.usedBy ? (item.usedBy.displayName || item.usedBy.username) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="py-4 px-4">
                        {item.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleDisableCode(item.id)}
                            disabled={disablingCodeId === item.id}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {disablingCodeId === item.id ? '处理中' : '禁用'}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">不可操作</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {codePagination && codePagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setCodePage(codePage - 1)}
                disabled={codePage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {codePagination.page} / {codePagination.totalPages} 页
              </span>
              <button
                onClick={() => setCodePage(codePage + 1)}
                disabled={codePage >= codePagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">用户列表</h2>
              <p className="text-sm text-gray-500">管理用户等级与官方认证</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">等级筛选：</label>
              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setUserPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value="NORMAL">普通</option>
                <option value="OFFICIAL">官方认证</option>
                <option value="GOLD">黄金</option>
                <option value="KING">王者</option>
              </select>
            </div>
          </div>

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
                    <th className="text-left py-3 px-4 font-semibold">角色</th>
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
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {user.role === 'USER' ? '普通用户' : user.role === 'PROVIDER' ? '项目发布者' : '管理员'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${levelColors[user.level] || 'bg-gray-100 text-gray-700'}`}>
                          {levelLabels[user.level] || user.level}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-blue-600">{user.points}</td>
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

          {userPagination && userPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setUserPage(userPage - 1)}
                disabled={userPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {userPagination.page} / {userPagination.totalPages} 页
              </span>
              <button
                onClick={() => setUserPage(userPage + 1)}
                disabled={userPage >= userPagination.totalPages}
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
