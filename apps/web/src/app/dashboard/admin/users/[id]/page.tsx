'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { adminApi } from '@/lib/api/client';

interface UserDetail {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  status: string;
  level: string;
  points: number;
  avgRating: number;
  reviewCount: number;
  officialCertifiedAt: string | null;
  certifiedBy: string | null;
  emailVerified: boolean;
  createdAt: string;
  pointsHistory: {
    id: string;
    actionType: string;
    points: number;
    description: string | null;
    relatedId: string | null;
    createdAt: string;
  }[];
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

const actionTypeLabels: Record<string, string> = {
  COMMENT_HELPFUL: '评论被点赞',
  BLOG_PUBLISHED: '发布博文',
  PROJECT_COMPLETED: '完成项目',
  REVIEW_RECEIVED: '收到评价',
  ADMIN_REWARD: '管理员奖励',
};

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [certifying, setCertifying] = useState(false);

  useEffect(() => {
    loadUser();
  }, [params.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getUserById(params.id);
      setUser(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async (certified: boolean) => {
    if (!user) return;
    try {
      setCertifying(true);
      const res = await adminApi.certifyUser(user.id, certified);
      setUser({ ...user, ...res.data.data });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败');
    } finally {
      setCertifying(false);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center text-red-500">{error || '用户不存在'}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">用户详情</h1>
            <p className="text-gray-600">完整信息与积分明细</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin/users')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回用户列表
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: User Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {user.displayName?.[0] || user.username[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{user.displayName || user.username}</h2>
                  <p className="text-gray-500 text-sm">@{user.username}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">邮箱</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">角色</span>
                  <span className="font-medium">
                    {user.role === 'USER' ? '用户' : user.role === 'PROVIDER' ? '项目方' : '管理员'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">状态</span>
                  <span className="font-medium">{user.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">邮箱验证</span>
                  <span className={user.emailVerified ? 'text-green-600 font-medium' : 'text-red-500'}>
                    {user.emailVerified ? '已验证' : '未验证'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">注册时间</span>
                  <span className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              {user.bio && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">{user.bio}</p>
                </div>
              )}
            </div>

            {/* Level & Points Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">等级与积分</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">当前等级</span>
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${levelColors[user.level]}`}>
                    {levelLabels[user.level] || user.level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">积分</span>
                  <span className="text-2xl font-bold text-blue-600">{user.points}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">平均评分</span>
                  <span className="font-semibold">
                    {user.avgRating > 0 ? `${user.avgRating.toFixed(1)} ★` : '-'}
                    <span className="text-gray-400 text-sm ml-1">({user.reviewCount} 条)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">认证状态</span>
                  <span className={user.officialCertifiedAt ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                    {user.officialCertifiedAt
                      ? `已认证 (${new Date(user.officialCertifiedAt).toLocaleDateString('zh-CN')})`
                      : '未认证'}
                  </span>
                </div>
              </div>

              {/* Certify Actions */}
              <div className="mt-4 pt-4 border-t">
                {user.level === 'NORMAL' && (
                  <button
                    onClick={() => handleCertify(true)}
                    disabled={certifying}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {certifying ? '处理中...' : '授予官方认证'}
                  </button>
                )}
                {user.level === 'OFFICIAL' && (
                  <button
                    onClick={() => handleCertify(false)}
                    disabled={certifying}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {certifying ? '处理中...' : '撤销官方认证'}
                  </button>
                )}
                {(user.level === 'GOLD' || user.level === 'KING') && (
                  <p className="text-sm text-gray-500 text-center">
                    当前等级通过积分系统自动晋升
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Points History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                积分明细
                <span className="text-sm text-gray-500 font-normal ml-2">
                  (最近 {user.pointsHistory.length} 条)
                </span>
              </h3>

              {user.pointsHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无积分记录</div>
              ) : (
                <div className="space-y-3">
                  {user.pointsHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {actionTypeLabels[item.actionType] || item.actionType}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${item.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {item.points >= 0 ? '+' : ''}{item.points}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
