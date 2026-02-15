'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') as 'USER' | 'PROVIDER' || 'USER';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role: defaultRole,
    invitationCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationCodeValid, setInvitationCodeValid] = useState<boolean | null>(null);
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.register(formData);
      const { user, token } = response.data.data;
      setAuth(user, token);

      // Redirect based on role
      if (user.role === 'PROVIDER') {
        router.push('/dashboard/provider');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const validateInvitationCode = async (code: string) => {
    if (!code) {
      setInvitationCodeValid(null);
      setInvitationCodeError('');
      return;
    }

    try {
      const response = await authApi.validateInvitationCode(code);
      if (response.data.success) {
        setInvitationCodeValid(true);
        setInvitationCodeError('');
      }
    } catch (err: any) {
      setInvitationCodeValid(false);
      setInvitationCodeError(
        err.response?.data?.error?.message || '邀请码无效'
      );
    }
  };

  const handleInvitationCodeChange = (code: string) => {
    setFormData({ ...formData, invitationCode: code });
    validateInvitationCode(code);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">
            WEOPC.ORG
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">创建账号</h2>
          <p className="mt-2 text-gray-600">开始你的副业之旅</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                账号类型
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'USER' })}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'USER'
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">找项目</div>
                  <div className="text-xs text-gray-600 mt-1">我要找副业</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'PROVIDER' })}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'PROVIDER'
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">发项目</div>
                  <div className="text-xs text-gray-600 mt-1">我要招人</div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="至少6位字符"
              />
            </div>

            {formData.role === 'PROVIDER' && (
              <div>
                <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  邀请码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="invitationCode"
                  type="text"
                  required
                  value={formData.invitationCode}
                  onChange={(e) => handleInvitationCodeChange(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    invitationCodeValid === true
                      ? 'border-green-300 focus:ring-green-500'
                      : invitationCodeValid === false
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                  placeholder="请输入邀请码"
                />
                {invitationCodeValid === true && (
                  <p className="mt-2 text-sm text-green-600">✓ 邀请码有效</p>
                )}
                {invitationCodeError && (
                  <p className="mt-2 text-sm text-red-600">{invitationCodeError}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (formData.role === 'PROVIDER' && invitationCodeValid !== true)}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">已有账号？</span>{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
