export const SEARCH_ENGINES = [
  'google',
  'bing',
  'yandex',
  'baidu',
  'duckduckgo',
  'ecosia',
] as const;

export type SearchEngine = (typeof SEARCH_ENGINES)[number];

export type SearchPlatformStatus = 'ok' | 'error' | 'skipped';

export interface SearchResult {
  id: string;
  sourcePlatform: SearchEngine;
  rank: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
}

export interface PlatformSearchResponse {
  platform: SearchEngine;
  status: SearchPlatformStatus;
  provider: 'openserp' | 'direct-fallback' | 'unavailable';
  tookMs: number;
  results: SearchResult[];
  error?: string;
}

export interface SearchQueryInput {
  query: string;
  platforms: SearchEngine[];
  limit: number;
}

export interface SearchQueryResponse {
  query: string;
  platforms: PlatformSearchResponse[];
  meta: {
    tookMs: number;
    totalResults: number;
    cacheHit: boolean;
  };
}

export interface SearchPlatformInfo {
  id: SearchEngine;
  label: string;
  description: string;
  available: boolean;
  provider: 'openserp' | 'direct-fallback' | 'unavailable';
}

export const SEARCH_PLATFORM_INFO: Record<
  SearchEngine,
  Omit<SearchPlatformInfo, 'id' | 'available' | 'provider'>
> = {
  google: {
    label: 'Google',
    description: '全球综合网页搜索',
  },
  bing: {
    label: 'Bing',
    description: '微软网页搜索',
  },
  yandex: {
    label: 'Yandex',
    description: '俄罗斯及东欧搜索',
  },
  baidu: {
    label: 'Baidu',
    description: '中文网页搜索',
  },
  duckduckgo: {
    label: 'DuckDuckGo',
    description: '隐私优先的网页搜索',
  },
  ecosia: {
    label: 'Ecosia',
    description: '环保搜索引擎',
  },
};

export const DIRECT_FALLBACK_ENGINES: SearchEngine[] = ['bing', 'duckduckgo'];
