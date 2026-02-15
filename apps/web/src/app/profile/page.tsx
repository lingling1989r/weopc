'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store/auth';
import { authApi } from '@/lib/api/client';
import { authenticatedApiClient } from '@/lib/api/client';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    avatar: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data.data;
    },
    enabled: isAuthenticated(),
  });

  // Initialize form data when user data is loaded
  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || '',
        bio: userData.bio || '',
        avatar: userData.avatar || '',
      });
    }
  }, [userData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await authenticatedApiClient.patch('/users/me', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Update local auth store
      if (data.data) {
        setAuth(data.data, localStorage.getItem('token') || '');
      }
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setMessage({ type: 'success', text: '个人资料更新成功！' });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || '更新失败，请重试',
      });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || '',
        bio: userData.bio || '',
        avatar: userData.avatar || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">个人资料</h1>
          <p className="text-gray-600">管理你的个人信息</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Avatar Section */}
              <div className="flex items-center gap-6 mb-8 pb-8 border-b">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold">
                  {formData.displayName?.[0] || userData?.username?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{userData?.username}</h3>
                  <p className="text-sm text-gray-600">{userData?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    角色: {userData?.role === 'USER' ? '用户' : userData?.role === 'PROVIDER' ? '项目方' : '管理员'}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
                  >
                    编辑资料
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Display Name */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                    显示名称
                  </label>
                  {isEditing ? (
                    <input
                      id="displayName"
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入你的显示名称"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{userData?.displayName || '未设置'}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  {isEditing ? (
                    <textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="介绍一下你自己..."
                    />
                  ) : (
                    <p className="text-gray-900 py-2 whitespace-pre-wrap">{userData?.bio || '未设置'}</p>
                  )}
                </div>

                {/* Username (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户名
                  </label>
                  <p className="text-gray-500 py-2">{userData?.username}</p>
                  <p className="text-xs text-gray-400 mt-1">用户名不可修改</p>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱
                  </label>
                  <p className="text-gray-500 py-2">{userData?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">邮箱不可修改</p>
                </div>

                {/* Account Info */}
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">账号信息</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>注册时间: {new Date(userData?.createdAt || '').toLocaleDateString('zh-CN')}</p>
                    <p>账号状态: <span className="text-green-600 font-medium">
                      {userData?.status === 'ACTIVE' ? '正常' : userData?.status}
                    </span></p>
                    {userData?.emailVerified && (
                      <p>邮箱验证: <span className="text-green-600 font-medium">已验证</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4 mt-8 pt-6 border-t">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {updateProfileMutation.isPending ? '保存中...' : '保存更改'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    取消
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Additional Actions */}
        <div className="mt-6 space-y-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            返回仪表板
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
