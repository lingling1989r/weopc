'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { publicApiClient } from '@/lib/api/client';

interface SkillOwner {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  pricePoints: number;
  downloadCount: number;
  createdAt: string;
  owner: SkillOwner;
}

export default function SkillsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const params = useMemo(() => {
    const p: any = {};
    if (search.trim()) p.search = search.trim();
    if (category.trim()) p.category = category.trim();
    p.page = 1;
    p.limit = 50;
    return p;
  }, [search, category]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['skills', params],
    queryFn: async () => {
      const res = await publicApiClient.get('/skills', { params });
      return res.data;
    },
  });

  const skills: Skill[] = data?.data || [];

  const categories = Array.from(
    new Set(skills.map((s) => s.category).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Skill 市场</h1>
          <p className="text-gray-600">用积分兑换非免费 Skill（买断制）</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 skill（标题/描述）"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部分类</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              刷新
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            加载失败，请稍后重试
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无可用 Skill</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {skill.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-500">价格</div>
                    <div className="text-lg font-bold text-blue-600">
                      {skill.pricePoints === 0 ? '免费' : `${skill.pricePoints} 分`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {skill.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {skill.category}
                    </span>
                  )}
                  {skill.tags?.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
                  <span>
                    作者：{skill.owner.displayName || skill.owner.username}
                  </span>
                  <span>下载：{skill.downloadCount}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
