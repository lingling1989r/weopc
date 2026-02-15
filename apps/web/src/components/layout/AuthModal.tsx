'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { authApi } from '@/lib/api/client';

export function AuthModal() {
  const router = useRouter();
  const { loginRequired, returnUrl, clearLoginRequired, setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role: 'USER' as 'USER' | 'PROVIDER',
  });

  if (!loginRequired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        const { user, token } = response.data.data;
        setAuth(user, token);
      } else {
        const response = await authApi.register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          role: formData.role,
        });
        const { user, token } = response.data.data;
        setAuth(user, token);
      }

      // Close modal and return to original URL
      clearLoginRequired();
      if (returnUrl && returnUrl !== '/') {
        router.push(returnUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'login' ? '登录' : '注册'}
          </h2>
          <button
            onClick={() => clearLoginRequired()}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="username"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                身份
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'USER' | 'PROVIDER',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USER">找项目</option>
                <option value="PROVIDER">发布项目</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === 'login' ? (
            <>
              <span className="text-gray-600">还没有账号？</span>{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setError('');
                  setFormData({
                    email: '',
                    password: '',
                    username: '',
                    role: 'USER',
                  });
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                立即注册
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-600">已有账号？</span>{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setFormData({
                    email: '',
                    password: '',
                    username: '',
                    role: 'USER',
                  });
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                立即登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
