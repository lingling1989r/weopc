'use client';

import Link from 'next/link';

interface ShowcaseCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    revenue?: string;
    featured?: boolean;
    tags?: string[];
    date?: string;
  };
}

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

const difficultyColors: Record<string, string> = {
  '简单': 'bg-green-100 text-green-800',
  '中等': 'bg-yellow-100 text-yellow-800',
  '困难': 'bg-red-100 text-red-800',
};

export function ShowcaseCard({ project }: ShowcaseCardProps) {
  return (
    <Link href={`/showcase/${project.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 h-full border border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {project.title}
          </h3>
          {project.featured && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
              ⭐ 精选
            </span>
          )}
        </div>

        {/* Category & Difficulty */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 text-xs rounded ${categoryColors[project.category] || 'bg-gray-100 text-gray-800'}`}>
            {project.category}
          </span>
          <span className={`px-2 py-1 text-xs rounded ${difficultyColors[project.difficulty] || 'bg-gray-100 text-gray-800'}`}>
            {project.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Revenue */}
        {project.revenue && (
          <div className="mb-4">
            <span className="text-green-600 font-semibold text-sm">
              💰 {project.revenue}
            </span>
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.tags.slice(0, 4).map((tag: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            📅 {project.date ? new Date(project.date).toLocaleDateString('zh-CN') : '未知日期'}
          </div>
          <span className="text-blue-600 text-sm font-medium hover:underline">
            查看详情 →
          </span>
        </div>
      </div>
    </Link>
  );
}
