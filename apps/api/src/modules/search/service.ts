import { createHash } from 'crypto';
import { URL } from 'url';
import { ValidationError } from '../../shared/utils/errors';
import {
  DIRECT_FALLBACK_ENGINES,
  SEARCH_ENGINES,
  SEARCH_PLATFORM_INFO,
  type PlatformSearchResponse,
  type SearchEngine,
  type SearchPlatformInfo,
  type SearchQueryInput,
  type SearchQueryResponse,
  type SearchResult,
} from './types';

export const SEARCH_TIMEOUT_MS = 8_000;
export const SEARCH_CACHE_TTL_MS = 5 * 60 * 1_000;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 20;

type FetchLike = typeof globalThis.fetch;

interface CachedSearch {
  expiresAt: number;
  value: SearchQueryResponse;
}

export interface SearchServiceOptions {
  fetchFn?: FetchLike;
  now?: () => number;
  openSerpBaseUrl?: string;
  openSerpApiKey?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  directFallback?: boolean;
}

const DEFAULT_FALLBACK_PLATFORMS: SearchEngine[] = ['bing', 'duckduckgo'];

function asPlainString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(value: unknown): string {
  const candidate = asPlainString(value);
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function domainFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function resultId(platform: SearchEngine, url: string, rank: number): string {
  return createHash('sha1').update(`${platform}:${rank}:${url}`).digest('hex').slice(0, 16);
}

function normalizeResult(
  value: Record<string, unknown>,
  platform: SearchEngine,
  fallbackRank: number
): SearchResult | null {
  const url = safeUrl(value.url ?? value.link ?? value.href);
  const title = stripHtml(asPlainString(value.title ?? value.name));

  if (!url || !title) {
    return null;
  }

  const rankValue = Number(value.rank ?? value.position ?? fallbackRank);
  const rank = Number.isFinite(rankValue) && rankValue > 0 ? Math.floor(rankValue) : fallbackRank;
  const snippet = stripHtml(asPlainString(value.snippet ?? value.description ?? value.text));
  const publishedAt = asPlainString(value.published_at ?? value.publishedAt ?? value.date) || undefined;

  return {
    id: resultId(platform, url, rank),
    sourcePlatform: platform,
    rank,
    title,
    url,
    snippet,
    domain: domainFromUrl(url),
    ...(publishedAt ? { publishedAt } : {}),
  };
}

export function normalizeOpenSerpResults(
  payload: unknown,
  platform: SearchEngine,
  limit: number
): SearchResult[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const data = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : record;
  const rawResults = Array.isArray(data.results) ? data.results : [];

  return rawResults
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => normalizeResult(item, platform, index + 1))
    .filter((item): item is SearchResult => item !== null)
    .slice(0, limit);
}

function extractXmlValue(item: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(item);
  return match ? stripHtml(match[1]) : '';
}

export function parseBingRss(xml: string, platform: SearchEngine = 'bing', limit = SEARCH_DEFAULT_LIMIT): SearchResult[] {
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
  return items
    .map((item, index) => normalizeResult({
      title: extractXmlValue(item, 'title'),
      url: extractXmlValue(item, 'link'),
      snippet: extractXmlValue(item, 'description'),
      date: extractXmlValue(item, 'pubDate'),
      rank: index + 1,
    }, platform, index + 1))
    .filter((item): item is SearchResult => item !== null)
    .slice(0, limit);
}

function unwrapDuckDuckGoUrl(value: string): string {
  const decoded = decodeHtml(value);
  try {
    const url = new URL(decoded, 'https://duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return decoded;
  }
}

export function parseDuckDuckGoHtml(
  html: string,
  platform: SearchEngine = 'duckduckgo',
  limit = SEARCH_DEFAULT_LIMIT
): SearchResult[] {
  const results: SearchResult[] = [];
  const linkPattern = /<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while (results.length < limit && (match = linkPattern.exec(html)) !== null) {
    const url = safeUrl(unwrapDuckDuckGoUrl(match[1]));
    const title = stripHtml(match[2]);
    if (!url || !title) {
      continue;
    }

    const remainder = html.slice(match.index + match[0].length, match.index + match[0].length + 2_000);
    const snippetMatch = /class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a?>/i.exec(remainder);
    const result = normalizeResult({
      title,
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
      rank: results.length + 1,
    }, platform, results.length + 1);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export function validateSearchInput(
  body: unknown,
  defaultPlatforms: SearchEngine[] = DEFAULT_FALLBACK_PLATFORMS
): SearchQueryInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('请输入有效的搜索参数');
  }

  const record = body as Record<string, unknown>;
  const query = asPlainString(record.query);
  if (!query || query.length > 100) {
    throw new ValidationError('搜索词长度必须为 1-100 个字符');
  }

  const rawPlatforms = record.platforms === undefined ? defaultPlatforms : record.platforms;
  if (!Array.isArray(rawPlatforms) || rawPlatforms.length === 0 || rawPlatforms.length > SEARCH_ENGINES.length) {
    throw new ValidationError(`请选择 1-${SEARCH_ENGINES.length} 个搜索平台`);
  }

  const platforms = [...new Set(rawPlatforms)] as unknown[];
  if (platforms.some((platform) => !SEARCH_ENGINES.includes(platform as SearchEngine))) {
    throw new ValidationError('包含不支持的搜索平台');
  }

  const rawLimit = record.limit === undefined ? SEARCH_DEFAULT_LIMIT : Number(record.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > SEARCH_MAX_LIMIT) {
    throw new ValidationError(`每个平台返回数量必须为 1-${SEARCH_MAX_LIMIT}`);
  }

  return {
    query,
    platforms: platforms as SearchEngine[],
    limit: rawLimit,
  };
}

export class SearchService {
  private readonly fetchFn: FetchLike;
  private readonly now: () => number;
  private readonly openSerpBaseUrl: string;
  private readonly openSerpApiKey?: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly directFallback: boolean;
  private readonly cache = new Map<string, CachedSearch>();

  constructor(options: SearchServiceOptions = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch.bind(globalThis);
    this.now = options.now || Date.now;
    this.openSerpBaseUrl = (options.openSerpBaseUrl || '').replace(/\/$/, '');
    this.openSerpApiKey = options.openSerpApiKey;
    this.timeoutMs = options.timeoutMs || SEARCH_TIMEOUT_MS;
    this.cacheTtlMs = options.cacheTtlMs || SEARCH_CACHE_TTL_MS;
    this.directFallback = options.directFallback ?? true;
  }

  getPlatforms(): SearchPlatformInfo[] {
    const openSerpAvailable = Boolean(this.openSerpBaseUrl);
    return SEARCH_ENGINES.map((id) => ({
      id,
      ...SEARCH_PLATFORM_INFO[id],
      available: openSerpAvailable || (this.directFallback && DIRECT_FALLBACK_ENGINES.includes(id)),
      provider: openSerpAvailable
        ? 'openserp'
        : this.directFallback && DIRECT_FALLBACK_ENGINES.includes(id)
          ? 'direct-fallback'
          : 'unavailable',
    }));
  }

  async search(input: SearchQueryInput): Promise<SearchQueryResponse> {
    const cacheKey = JSON.stringify({
      query: input.query.toLowerCase(),
      platforms: [...input.platforms].sort(),
      limit: input.limit,
    });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.now()) {
      return {
        ...cached.value,
        meta: { ...cached.value.meta, cacheHit: true },
      };
    }

    const startedAt = this.now();
    const platforms = await Promise.all(input.platforms.map((platform) => this.searchPlatform(platform, input.query, input.limit)));
    const response: SearchQueryResponse = {
      query: input.query,
      platforms,
      meta: {
        tookMs: this.now() - startedAt,
        totalResults: platforms.reduce((total, item) => total + item.results.length, 0),
        cacheHit: false,
      },
    };

    if (platforms.some((platform) => platform.status === 'ok')) {
      this.cache.set(cacheKey, { expiresAt: this.now() + this.cacheTtlMs, value: response });
    }
    return response;
  }

  private async searchPlatform(platform: SearchEngine, query: string, limit: number): Promise<PlatformSearchResponse> {
    const startedAt = this.now();
    const usingOpenSerp = Boolean(this.openSerpBaseUrl);
    const usingFallback = !usingOpenSerp && this.directFallback && DIRECT_FALLBACK_ENGINES.includes(platform);
    const provider = usingOpenSerp ? 'openserp' : usingFallback ? 'direct-fallback' : 'unavailable';

    if (!usingOpenSerp && !usingFallback) {
      return {
        platform,
        provider: 'unavailable',
        status: 'skipped',
        tookMs: this.now() - startedAt,
        results: [],
        error: '该平台需要先配置 OpenSERP 服务',
      };
    }

    try {
      const results = usingOpenSerp
        ? await this.searchWithOpenSerp(platform, query, limit)
        : await this.searchWithDirectFallback(platform, query, limit);
      return {
        platform,
        provider,
        status: 'ok',
        tookMs: this.now() - startedAt,
        results,
      };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? '该平台请求超时'
        : '该平台暂时不可用，已跳过本次结果';
      return {
        platform,
        provider,
        status: 'error',
        tookMs: this.now() - startedAt,
        results: [],
        error: message,
      };
    }
  }

  private async searchWithOpenSerp(platform: SearchEngine, query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL(`${this.openSerpBaseUrl}/${platform}/search`);
    url.searchParams.set('text', query);
    url.searchParams.set('limit', String(limit));
    const response = await this.fetchWithTimeout(url.toString(), this.openSerpApiKey ? { Authorization: `Bearer ${this.openSerpApiKey}` } : undefined);
    if (!response.ok) {
      throw new Error(`OpenSERP responded with ${response.status}`);
    }
    return normalizeOpenSerpResults(await response.json(), platform, limit);
  }

  private async searchWithDirectFallback(platform: SearchEngine, query: string, limit: number): Promise<SearchResult[]> {
    if (platform === 'bing') {
      const url = `https://www.bing.com/search?format=rss&count=${limit}&q=${encodeURIComponent(query)}`;
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`Bing responded with ${response.status}`);
      }
      return parseBingRss(await response.text(), platform, limit);
    }

    const url = `https://html.duckduckgo.com/html/?kl=us-en&q=${encodeURIComponent(query)}`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`DuckDuckGo responded with ${response.status}`);
    }
    return parseDuckDuckGoHtml(await response.text(), platform, limit);
  }

  private async fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html, application/rss+xml, application/xml;q=0.9',
          'User-Agent': 'WEOPC Search/1.0 (+https://weopc.org.cn)',
          ...headers,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
