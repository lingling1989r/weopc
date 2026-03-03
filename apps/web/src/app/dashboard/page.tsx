'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store/auth';
import { leadsApi, authApi, usersApi } from '@/lib/api/client';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data.data;
    },
    enabled: isAuthenticated(),
  });

  // Fetch user's leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', 'my'],
    queryFn: async () => {
      const response = await leadsApi.getMyLeads();
      return response.data.data;
    },
    enabled: isAuthenticated(),
  });

  // Fetch user's points & level
  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['user', 'me', 'points'],
    queryFn: async () => {
      const response = await usersApi.getMyPoints();
      return response.data.data;
    },
    enabled: isAuthenticated(),
  });

  if (!isAuthenticated()) {
    return null;
  }

  const leads = leadsData || [];

  const levelLabels: Record<string, string> = {
    NORMAL: '普通用户',
    OFFICIAL: '官方认证',
    GOLD: '黄金用户',
    KING: '王者用户',
  };

  const levelColors: Record<string, string> = {
    NORMAL: 'bg-gray-100 text-gray-700',
    OFFICIAL: 'bg-blue-100 text-blue-700',
    GOLD: 'bg-yellow-100 text-yellow-700',
    KING: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">我的仪表板</h1>
          <p className="text-gray-600">欢迎回来，{user?.displayName || user?.username}</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">个人信息</h2>
          {userLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {userData?.displayName?.[0] || userData?.username?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-lg font-semibold">{userData?.displayName || userData?.username}</p>
                  <p className="text-gray-600">{userData?.email}</p>
                  <p className="text-sm text-gray-500">
                    角色: {userData?.role === 'USER' ? '用户' : userData?.role === 'PROVIDER' ? '项目方' : '管理员'}
                  </p>
                </div>
              </div>
              {userData?.bio && (
                <div className="mt-4">
                  <p className="text-gray-700">{userData.bio}</p>
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => router.push('/profile')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  编辑个人资料 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Level & Points Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">我的等级与积分</h2>
          {pointsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : pointsData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">当前等级</div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${levelColors[pointsData.level] || 'bg-gray-100 text-gray-700'}`}>
                  {levelLabels[pointsData.level] || pointsData.level}
                </span>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">积分</div>
                <div className="text-3xl font-bold text-blue-600">{pointsData.points}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">平均评分</div>
                <div className="text-2xl font-bold text-yellow-500">
                  {pointsData.avgRating > 0 ? pointsData.avgRating.toFixed(1) : '-'}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">收到评价</div>
                <div className="text-3xl font-bold text-green-600">{pointsData.reviewCount}</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">暂无积分数据</p>
          )}

          {/* Recent Points History */}
          {pointsData?.recentHistory && pointsData.recentHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">最近积分记录</h3>
              <div className="space-y-2">
                {pointsData.recentHistory.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.description || item.actionType}</span>
                    <span className={`font-semibold ${item.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.points >= 0 ? '+' : ''}{item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">我的申请</p>
                <p className="text-3xl font-bold mt-1">{leads.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">待处理</p>
                <p className="text-3xl font-bold mt-1">
                  {leads.filter((l: any) => l.status === 'PENDING').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">已接受</p>
                <p className="text-3xl font-bold mt-1">
                  {leads.filter((l: any) => l.status === 'ACCEPTED').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* My Leads */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">我的申请</h2>
            <button
              onClick={() => router.push('/projects')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              浏览更多项目 →
            </button>
          </div>

          {leadsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-4">你还没有提交任何申请</p>
              <button
                onClick={() => router.push('/projects')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                浏览项目
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead: any) => (
                <div
                  key={lead.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => router.push(`/projects/${lead.project.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{lead.project.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        项目方: {lead.project.provider.displayName || lead.project.provider.username}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>提交时间: {new Date(lead.createdAt).toLocaleDateString('zh-CN')}</span>
                        <span>•</span>
                        <span className={`font-medium ${
                          lead.status === 'PENDING' ? 'text-yellow-600' :
                          lead.status === 'ACCEPTED' ? 'text-green-600' :
                          lead.status === 'REJECTED' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {lead.status === 'PENDING' ? '待处理' :
                           lead.status === 'CONTACTED' ? '已联系' :
                           lead.status === 'ACCEPTED' ? '已接受' :
                           lead.status === 'REJECTED' ? '已拒绝' :
                           lead.status}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        lead.project.type === 'FULL_TIME' ? 'bg-blue-100 text-blue-700' :
                        lead.project.type === 'PART_TIME' ? 'bg-green-100 text-green-700' :
                        lead.project.type === 'FREELANCE' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lead.project.type === 'FULL_TIME' ? '全职' :
                         lead.project.type === 'PART_TIME' ? '兼职' :
                         lead.project.type === 'FREELANCE' ? '自由职业' :
                         lead.project.type === 'SIDE_GIG' ? '副业' :
                         lead.project.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-4 rounded-lg hover:bg-blue-50 font-semibold transition"
          >
            浏览项目机会
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-50 font-semibold transition"
          >
            编辑个人资料
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
