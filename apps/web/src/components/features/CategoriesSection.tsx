'use client';

import { useQuery } from '@tanstack/react-query';
import { showcaseApi } from '@/lib/api/client';
import Link from 'next/link';
import { useHydrated } from '@/lib/hooks/useHydrated';

export function CategoriesSection() {
  const isHydrated = useHydrated();
  const { data, isLoading } = useQuery({
    queryKey: ['project-categories'],
    queryFn: async () => {
      const response = await showcaseApi.getCategories();
      return response.data.data;
    },
  });

  // Show nothing during SSR to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">项目分类</h2>
          <p className="text-gray-600">按不同平台和类型浏览副业机会</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((category: any) => (
            <Link
              key={category.id}
              href={`/showcase?category=${category.name}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 border-l-4 flex flex-col items-center text-center"
              style={{ borderLeftColor: category.color }}
            >
              <div
                className="w-12 h-12 rounded-full mb-3 flex items-center justify-center text-white text-lg"
                style={{ backgroundColor: category.color }}
              >
                {category.name === '小红书' && '📱'}
                {category.name === '闲鱼' && '🛍️'}
                {category.name === '蓝海项目' && '🌊'}
                {category.name === '短视频' && '🎬'}
                {category.name === 'AI视频' && '🤖'}
                {category.name === 'YouTube' && '📺'}
                {category.name === '接单' && '💼'}
                {category.name === '餐饮' && '🍜'}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
              <p className="text-sm text-gray-500">{category.count} 个项目</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
