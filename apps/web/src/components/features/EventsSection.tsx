'use client';

import { useQuery } from '@tanstack/react-query';
import { publicApiClient } from '@/lib/api/client';
import { useHydrated } from '@/lib/hooks/useHydrated';

export function EventsSection() {
  const isHydrated = useHydrated();
  
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const response = await publicApiClient.get('/information/event', {
          params: { limit: 6, status: 'UPCOMING' },
        });
        return response.data.data || [];
      } catch (e) {
        console.error('Failed to fetch events:', e);
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
      <div className="bg-purple-50 py-12">
        <div className="container mx-auto px-4">
          <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">活动赛事</h2>
          <a href="/information/events" className="text-purple-600 hover:underline text-sm">
            查看全部 →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.slice(0, 6).map((event: any) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded">
                  {event.eventType}
                </span>
                {event.city && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded">
                    {event.city}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {event.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {event.description}
              </p>
              <div className="text-xs text-gray-500 mb-3">
                {event.startDate && (
                  <p>📅 {event.startDate}</p>
                )}
                {event.location && <p>📍 {event.location}</p>}
              </div>
              {event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  立即报名
                </a>
              ) : (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
                >
                  查看详情
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
