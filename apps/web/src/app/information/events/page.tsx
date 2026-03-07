'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { publicApiClient } from '@/lib/api/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  source: string;
  sourceUrl: string;
  eventType: string;
  city: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  registrationUrl: string | null;
  reward: string | null;
  status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventType, setEventType] = useState('');

  // 示例数据
  const sampleEvents: Event[] = [
    {
      id: '1',
      title: '2026全球黑客马拉松大赛',
      description: '全球最大的黑客松活动，邀请全球开发者参加',
      source: '活动组委会',
      sourceUrl: 'https://example.com/hackathon',
      eventType: '黑客松',
      city: '北京',
      location: '北京国际会议中心',
      startDate: '2026-04-15',
      endDate: '2026-04-17',
      registrationUrl: 'https://example.com/register',
      reward: '奖金10万元',
      status: 'UPCOMING',
    },
    {
      id: '2',
      title: '中国国际大学生创新创业大赛',
      description: '面向全国大学生的创新创业大赛',
      source: '教育部',
      sourceUrl: 'https://example.com/college',
      eventType: '创业大赛',
      city: '上海',
      location: '上海世博展览馆',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      registrationUrl: 'https://example.com/register2',
      reward: '创业基金100万元',
      status: 'UPCOMING',
    },
  ];

  const displayEvents = events.length > 0 ? events : sampleEvents;
  const filteredEvents = eventType
    ? displayEvents.filter(e => e.eventType === eventType)
    : displayEvents;

  const eventTypes = [...new Set(displayEvents.map(e => e.eventType))];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">活动赛事</h1>
          
          {/* 筛选 */}
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">全部类型</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded">
                      {event.eventType}
                    </span>
                    {event.city && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded">
                        {event.city}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="text-sm text-gray-500 mb-4">
                    {event.startDate && (
                      <p>📅 {event.startDate} {event.endDate && `~ ${event.endDate}`}</p>
                    )}
                    {event.location && <p>📍 {event.location}</p>}
                    {event.reward && <p>🏆 {event.reward}</p>}
                  </div>
                  
                  <div className="flex gap-2">
                    {event.registrationUrl && (
                      <a
                        href={event.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        立即报名
                      </a>
                    )}
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      详情
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
