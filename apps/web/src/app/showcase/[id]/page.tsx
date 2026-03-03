'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { showcaseApi } from '@/lib/api/client';
import { useProtectedAction } from '@/lib/hooks/useProtectedAction';

interface ShowcaseProject {
  id: string;
  date: string;
  title: string;
  category: string;
  difficulty: string;
  revenue?: string;
  featured: boolean;
  description: string;
  tags: string[];
  content?: string;
  highlights?: string[];
  prerequisites?: string[];
  provider?: {
    name: string;
    avatar?: string;
    bio?: string;
    contactWechat?: string;
    contactEmail?: string;
  };
}

export default function ShowcaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { executeProtected } = useProtectedAction();
  
  const [project, setProject] = useState<ShowcaseProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await showcaseApi.getProjectById(projectId);
        setProject(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

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

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error || '项目不存在'}</div>
            <Link href="/" className="text-blue-600 hover:underline">
              返回首页
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const difficultyColors: Record<string, string> = {
    '简单': 'bg-green-100 text-green-800',
    '中等': 'bg-yellow-100 text-yellow-800',
    '困难': 'bg-red-100 text-red-800',
  };

  const categoryColors: Record<string, string> = {
    '小红书': 'bg-red-100 text-red-800',
    '闲鱼': 'bg-blue-100 text-blue-800',
    'YouTube': 'bg-red-100 text-red-800',
    'AI 视频': 'bg-purple-100 text-purple-800',
    '蓝海项目': 'bg-green-100 text-green-800',
    '接单': 'bg-orange-100 text-orange-800',
    '短视频': 'bg-pink-100 text-pink-800',
    '餐饮': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← 返回首页
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Project Header */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm ${categoryColors[project.category] || 'bg-gray-100 text-gray-800'}`}>
                  {project.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${difficultyColors[project.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                  {project.difficulty}
                </span>
                {project.featured && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                    ⭐ 精选案例
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-4">{project.title}</h1>

              <div className="flex items-center gap-4 text-gray-600 text-sm mb-6">
                <span>📅 {new Date(project.date).toLocaleDateString('zh-CN')}</span>
                {project.revenue && (
                  <span className="text-green-600 font-semibold">
                    💰 收益：{project.revenue}
                  </span>
                )}
              </div>

              <p className="text-lg text-gray-700 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-xl font-bold mb-4">标签</h2>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Content */}
            {project.content && (
              <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                <h2 className="text-xl font-bold mb-4">详细内容</h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {project.content}
                  </p>
                </div>
              </div>
            )}

            {/* Highlights */}
            {project.highlights && project.highlights.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                <h2 className="text-xl font-bold mb-4">✨ 项目亮点</h2>
                <ul className="space-y-2">
                  {project.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prerequisites */}
            {project.prerequisites && project.prerequisites.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-xl font-bold mb-4">📋 前置条件</h2>
                <ul className="space-y-2">
                  {project.prerequisites.map((prereq, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-gray-700">{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Provider Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-4">主理人</h3>
              
              {project.provider ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {project.provider.name?.[0] || 'M'}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{project.provider.name}</p>
                      {project.provider.bio && (
                        <p className="text-sm text-gray-600 mt-1">{project.provider.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Button */}
                  <button
                    onClick={() => executeProtected(() => setShowContact(true), `/showcase/${projectId}`)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4"
                  >
                    联系主理人
                  </button>

                  {/* Contact Info (shown after login) */}
                  {showContact && (
                    <div className="border-t pt-4 space-y-3">
                      {project.provider.contactWechat && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">微信</p>
                          <p className="font-mono bg-gray-50 px-3 py-2 rounded">{project.provider.contactWechat}</p>
                        </div>
                      )}
                      {project.provider.contactEmail && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">邮箱</p>
                          <p className="font-mono bg-gray-50 px-3 py-2 rounded">{project.provider.contactEmail}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  主理人信息待完善
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
