'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { publicApiClient } from '@/lib/api/client';

interface PolicyNews {
  id: string;
  title: string;
  content: string | null;
  source: string;
  sourceUrl: string;
  category: string;
  publishDate: string | null;
  createdAt: string;
}

export default function PolicyPage() {
  const [policies, setPolicies] = useState<PolicyNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 实际加载数据时使用
  // useEffect(() => {
  //   loadPolicies();
  // }, [page]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await publicApiClient.get('/information/policy', {
        params: { page, limit: 20 },
      });
      setPolicies(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 示例数据（开发测试用）
  const samplePolicies: PolicyNews[] = [
    {
      id: '1',
      title: '证监会：深化创业板改革的总体方案已基本成型',
      content: '证监会表示，深化创业板改革的总体方案已基本成型...',
      source: 'gov.cn',
      sourceUrl: 'https://gov.cn/test',
      category: '要闻',
      publishDate: '2025-12-01',
      createdAt: '2025-12-01',
    },
    {
      id: '2',
      title: '关于进一步发挥政府性融资担保体系作用 加力支持就业创业的指导意见',
      content: '政府性融资担保体系将进一步支持就业创业...',
      source: 'gov.cn',
      sourceUrl: 'https://gov.cn/test2',
      category: '国务院部门文件',
      publishDate: '2025-11-15',
      createdAt: '2025-11-15',
    },
    {
      id: '3',
      title: '国家创业投资引导基金启动，将形成万亿资金规模',
      content: '国家创业投资引导基金正式启动...',
      source: 'gov.cn',
      sourceUrl: 'https://gov.cn/test3',
      category: '要闻',
      publishDate: '2025-10-20',
      createdAt: '2025-10-20',
    },
  ];

  const displayPolicies = policies.length > 0 ? policies : samplePolicies;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-grow">
        <h1 className="text-3xl font-bold mb-8">政策资讯</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayPolicies.map((policy) => (
                <a
                  key={policy.id}
                  href={policy.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                      {policy.category}
                    </span>
                    <span className="text-xs text-gray-500">{policy.source}</span>
                    {policy.publishDate && (
                      <span className="text-xs text-gray-400">
                        {policy.publishDate}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold mb-2">{policy.title}</h2>
                  {policy.content && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {policy.content}
                    </p>
                  )}
                </a>
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
