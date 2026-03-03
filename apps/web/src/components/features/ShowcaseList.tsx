'use client';

import { useQuery } from '@tanstack/react-query';
import { showcaseApi } from '@/lib/api/client';
import { ShowcaseCard } from './ShowcaseCard';

interface ShowcaseListProps {
  limit?: number;
  featured?: boolean;
}

export function ShowcaseList({ limit = 6, featured = false }: ShowcaseListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['showcase', { featured, limit }],
    queryFn: async () => {
      if (featured) {
        const response = await showcaseApi.getFeaturedProjects();
        return response.data;
      } else {
        const response = await showcaseApi.getAllProjects({ limit });
        return response.data;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">加载案例失败，请稍后重试</p>
      </div>
    );
  }

  const projects = data?.data?.slice(0, limit) || [];

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无案例</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project: any) => (
        <ShowcaseCard key={project.id} project={project} />
      ))}
    </div>
  );
}
