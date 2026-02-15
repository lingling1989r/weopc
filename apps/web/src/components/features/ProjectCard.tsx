'use client';

import Link from 'next/link';
import { REVENUE_TIER_LABELS, PROJECT_TYPE_LABELS, EXECUTION_REQ_LABELS } from '@/lib/utils';

interface ProjectCardProps {
  project: any;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 h-full border border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {project.title}
          </h3>
          {project.featured && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              精选
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.shortDescription || project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
            {PROJECT_TYPE_LABELS[project.type]}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
            {REVENUE_TIER_LABELS[project.revenueTier]}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
            {EXECUTION_REQ_LABELS[project.executionReq]}
          </span>
        </div>

        {/* Skills */}
        {project.skillsRequired && project.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.skillsRequired.slice(0, 3).map((skill: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {skill}
              </span>
            ))}
            {project.skillsRequired.length > 3 && (
              <span className="px-2 py-1 text-gray-500 text-xs">
                +{project.skillsRequired.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {project.provider?.displayName?.[0] || project.provider?.username?.[0] || '?'}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {project.provider?.displayName || project.provider?.username}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {project._count?.leads || 0} 人报名
          </div>
        </div>
      </div>
    </Link>
  );
}
