'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProjectList } from '@/components/features/ProjectList';
import { ProjectFilters, FilterValues } from '@/components/features/ProjectFilters';

export default function ProjectsPage() {
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">项目广场</h1>
          <p className="text-gray-600">
            浏览所有可用的项目机会，找到适合你的副业
          </p>
        </div>

        <ProjectFilters onFilterChange={handleFilterChange} />

        <ProjectList filters={filters} />
      </main>

      <Footer />
    </div>
  );
}
