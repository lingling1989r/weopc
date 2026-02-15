'use client';

import { useState } from 'react';

interface ProjectFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  type?: string;
  revenueTier?: string;
  executionReq?: string;
  search?: string;
}

const PROJECT_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'FULL_TIME', label: '全职' },
  { value: 'PART_TIME', label: '兼职' },
  { value: 'FREELANCE', label: '自由职业' },
  { value: 'SIDE_GIG', label: '副业' },
  { value: 'INTERNSHIP', label: '实习' },
];

const REVENUE_TIERS = [
  { value: '', label: '全部收入' },
  { value: 'TIER_0_1K', label: '0-1K' },
  { value: 'TIER_1K_5K', label: '1K-5K' },
  { value: 'TIER_5K_10K', label: '5K-10K' },
  { value: 'TIER_10K_30K', label: '10K-30K' },
  { value: 'TIER_30K_50K', label: '30K-50K' },
  { value: 'TIER_50K_100K', label: '50K-100K' },
  { value: 'TIER_100K_PLUS', label: '100K+' },
];

const EXECUTION_REQS = [
  { value: '', label: '全部方式' },
  { value: 'REMOTE', label: '远程' },
  { value: 'ONSITE', label: '现场' },
  { value: 'HYBRID', label: '混合' },
  { value: 'FLEXIBLE', label: '灵活' },
];

export function ProjectFilters({ onFilterChange }: ProjectFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    type: '',
    revenueTier: '',
    executionReq: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Remove empty values
    const cleanFilters: FilterValues = {};
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) cleanFilters[k as keyof FilterValues] = v;
    });

    onFilterChange(cleanFilters);
  };

  const handleReset = () => {
    const emptyFilters = {
      type: '',
      revenueTier: '',
      executionReq: '',
      search: '',
    };
    setFilters(emptyFilters);
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      {/* Mobile Toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <span className="font-medium">筛选条件</span>
          <svg
            className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="搜索项目标题或描述..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目类型
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Revenue Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收入层级
            </label>
            <select
              value={filters.revenueTier}
              onChange={(e) => handleFilterChange('revenueTier', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {REVENUE_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>

          {/* Execution Requirement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              工作方式
            </label>
            <select
              value={filters.executionReq}
              onChange={(e) => handleFilterChange('executionReq', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {EXECUTION_REQS.map((req) => (
                <option key={req.value} value={req.value}>
                  {req.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
