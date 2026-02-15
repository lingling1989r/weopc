'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';

export function Header() {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    clearAuth();
    setShowUserMenu(false);
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            WEOPC.ORG
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
              首页
            </Link>
            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">
              项目广场
            </Link>

            {isHydrated && isAuthenticated() ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:text-blue-600"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user?.displayName?.[0] || user?.username?.[0] || 'U'}
                  </div>
                  <span className="text-gray-700 font-medium">
                    {user?.displayName || user?.username}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      我的仪表板
                    </Link>
                    {user?.role === 'PROVIDER' && (
                      <Link
                        href="/dashboard/provider"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        项目管理
                      </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/dashboard/admin"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        管理后台
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      个人资料
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
