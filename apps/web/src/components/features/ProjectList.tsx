'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/client';
import { ProjectCard } from './ProjectCard';
import { FilterValues } from './ProjectFilters';

interface ProjectListProps {
  filters?: FilterValues;
}

export function ProjectList({ filters = {} }: ProjectListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const response = await projectsApi.list({ limit: 12, ...filters });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
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
        <p className="text-red-600">加载项目失败，请稍后重试</p>
      </div>
    );
  }

  const projects = data?.data || [];

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无项目</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project: any) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
