'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { searchApi } from '@/lib/api/client';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useAuthStore } from '@/lib/store/auth';

type Platform = {
  id: string;
  label: string;
  description: string;
  available: boolean;
  provider: 'openserp' | 'direct-fallback' | 'unavailable';
};

type Result = {
  id: string;
  sourcePlatform: string;
  rank: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
};

type PlatformResult = {
  platform: string;
  status: 'ok' | 'error' | 'skipped';
  provider: 'openserp' | 'direct-fallback' | 'unavailable';
  tookMs: number;
  results: Result[];
  error?: string;
};

const providerLabel: Record<Platform['provider'], string> = {
  openserp: 'OpenSERP',
  'direct-fallback': '直连降级',
  unavailable: '未配置',
};

export default function SearchEnginesPage() {
  const isHydrated = useHydrated();
  const isAuthenticated = useAuthStore((state) => !!state.token);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selected, setSelected] = useState<string[]>(['bing', 'duckduckgo']);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlatformResult[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    searchApi.getPlatforms()
      .then((response) => {
        const availablePlatforms = response.data.data as Platform[];
        setPlatforms(availablePlatforms);
        const defaults = availablePlatforms.filter((platform) => platform.available).slice(0, 2).map((platform) => platform.id);
        if (defaults.length > 0) setSelected(defaults);
      })
      .catch(() => setError('暂时无法读取搜索平台状态，请稍后重试'))
      .finally(() => setLoadingPlatforms(false));
  }, []);

  const availableSelectedCount = useMemo(
    () => selected.filter((id) => platforms.find((platform) => platform.id === id)?.available).length,
    [platforms, selected]
  );

  const togglePlatform = (id: string, available: boolean) => {
    if (!available) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('请输入搜索词');
      return;
    }
    if (availableSelectedCount === 0) {
      setError('请至少选择一个已配置的搜索平台');
      return;
    }
    setError('');
    setResults([]);
    setLoading(true);
    try {
      const response = await searchApi.query({ query: query.trim(), platforms: selected, limit: 10 });
      setResults(response.data.data.platforms as PlatformResult[]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error?.message || '搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (isHydrated && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-16 text-center">
          <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
            <div className="text-5xl mb-5">🌐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">多平台搜索引擎分析（海外）</h1>
            <p className="text-gray-600 mb-8">登录后即可提交搜索并对比各平台结果。</p>
            <a href="/login?returnUrl=%2Ftoolbox%2Fsearch-engines" className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">立即登录</a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-10">
        <div className="max-w-4xl mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Overseas SERP Analysis</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">多平台搜索引擎分析（海外）</h1>
          <p className="text-gray-600 leading-7">选择多个海外平台，查看统一格式的标题、链接、摘要、排名和平台响应状态。</p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
          <form onSubmit={submit}>
            <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">搜索词</label>
            <div className="flex flex-col md:flex-row gap-3">
              <input id="search-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="例如：open source search API" className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button type="submit" disabled={loading || loadingPlatforms} className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">{loading ? '搜索中…' : '开始搜索'}</button>
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium text-gray-700 mb-3">搜索平台</div>
              {loadingPlatforms ? (
                <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <label key={platform.id} className={`flex items-start gap-3 rounded-lg border p-3 ${platform.available ? 'cursor-pointer border-gray-200 hover:border-blue-300' : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'}`}>
                      <input type="checkbox" checked={selected.includes(platform.id)} disabled={!platform.available} onChange={() => togglePlatform(platform.id, platform.available)} className="mt-1 h-4 w-4 accent-blue-600" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">{platform.label}<span className="text-[10px] font-normal text-gray-400">{providerLabel[platform.provider]}</span></span>
                        <span className="block text-xs text-gray-500 mt-1">{platform.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </form>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </section>

        {loading && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selected.map((platform) => <div key={platform} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />)}
          </section>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">输入关键词并点击“开始搜索”，结果会按平台显示在这里。</div>
        )}

        {!loading && results.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((platformResult) => (
              <div key={platformResult.platform} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{platforms.find((platform) => platform.id === platformResult.platform)?.label || platformResult.platform}</h2>
                    <p className="text-xs text-gray-500 mt-1">{platformResult.tookMs}ms · {platformResult.results.length} 条结果</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${platformResult.status === 'ok' ? 'bg-green-50 text-green-700' : platformResult.status === 'skipped' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'}`}>{platformResult.status === 'ok' ? '完成' : platformResult.status === 'skipped' ? '未配置' : '失败'}</span>
                </div>
                {platformResult.error && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{platformResult.error}</p>}
                <div className="divide-y divide-gray-100">
                  {platformResult.results.map((result) => (
                    <article key={result.id} className="p-5">
                      <div className="flex gap-3">
                        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{result.rank}</span>
                        <div className="min-w-0">
                          <a href={result.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">{result.title}</a>
                          <p className="mt-1 truncate text-xs text-green-700">{result.domain}</p>
                          {result.snippet && <p className="mt-2 text-sm leading-6 text-gray-600">{result.snippet}</p>}
                          {result.publishedAt && <p className="mt-2 text-xs text-gray-400">{result.publishedAt}</p>}
                        </div>
                      </div>
                    </article>
                  ))}
                  {platformResult.results.length === 0 && <div className="p-8 text-center text-sm text-gray-500">该平台没有可展示的结果。</div>}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
