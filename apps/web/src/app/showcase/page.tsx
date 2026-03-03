'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ShowcaseList } from '@/components/features/ShowcaseList';

const categories = [
  '全部',
  '小红书',
  '闲鱼',
  '蓝海项目',
  'YouTube',
  'AI 视频',
  '短视频',
  '接单',
  '餐饮',
];

const difficulties = ['全部', '简单', '中等', '困难'];

export default function ShowcasePage() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedDifficulty, setSelectedDifficulty] = useState('全部');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← 返回首页
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">精选案例库</h1>
          <p className="text-gray-600">
            真实副业案例分享，从 0 到 1 的完整路径
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                分类筛选
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                难度筛选
              </label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedDifficulty === difficulty
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Showcase List */}
        <ShowcaseList limit={100} />
      </main>

      <Footer />
    </div>
  );
}
