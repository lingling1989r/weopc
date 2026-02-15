'use client';

import { useQuery } from '@tanstack/react-query';
import { showcaseApi } from '@/lib/api/client';
import { useHydrated } from '@/lib/hooks/useHydrated';

export function PoliciesSection() {
  const isHydrated = useHydrated();
  const { data, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const response = await showcaseApi.getPolicies();
      return response.data.data;
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
        <h2 className="text-3xl font-bold mb-8 text-center">政策支持</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((policy: any) => (
            <div
              key={policy.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
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
                {policy.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{policy.date}</span>
                <span className="font-medium text-green-600">{policy.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
