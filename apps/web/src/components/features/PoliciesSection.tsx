'use client';

import { useQuery } from '@tanstack/react-query';
import { publicApiClient } from '@/lib/api/client';
import { useHydrated } from '@/lib/hooks/useHydrated';

export function PoliciesSection() {
  const isHydrated = useHydrated();
  
  const { data, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      try {
        const response = await publicApiClient.get('/information/policy', {
          params: { limit: 8 },
        });
        return response.data.data || [];
      } catch (e) {
        console.error('Failed to fetch policies:', e);
        return [];
      }
    },
  });

  // Show nothing during SSR to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-blue-50 py-12">
        <div className="container mx-auto px-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-12 border-t border-b border-blue-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">政策支持</h2>
          <a href="/information/policy" className="text-blue-600 hover:underline text-sm">
            查看全部 →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.slice(0, 8).map((policy: any) => (
            <a
              key={policy.id}
              href={policy.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition block"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    📋
                  </span>
                </div>
                <div>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mb-2">
                    {policy.category}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                {policy.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {policy.content}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{policy.source}</span>
                {policy.publishDate && <span>{policy.publishDate}</span>}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
