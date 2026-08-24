import {
  normalizeOpenSerpResults,
  parseBingRss,
  parseDuckDuckGoHtml,
  SearchService,
  validateSearchInput,
} from './service';

describe('search service parsers', () => {
  it('normalizes OpenSERP results into the public result shape', () => {
    const results = normalizeOpenSerpResults({
      meta: { engines_responded: ['bing'] },
      results: [{
        rank: 1,
        title: 'Example <em>result</em>',
        url: 'https://example.com/page',
        snippet: 'A short &amp; useful summary',
      }],
    }, 'bing', 10);

    expect(results).toEqual([
      expect.objectContaining({
        sourcePlatform: 'bing',
        rank: 1,
        title: 'Example result',
        url: 'https://example.com/page',
        snippet: 'A short & useful summary',
        domain: 'example.com',
      }),
    ]);
  });

  it('parses Bing RSS results', () => {
    const results = parseBingRss(`
      <rss><channel><item>
        <title>OpenSERP</title>
        <link>https://openserp.org/</link>
        <description>Open source search API</description>
        <pubDate>Mon, 24 Aug 2026 00:00:00 GMT</pubDate>
      </item></channel></rss>
    `);

    expect(results[0]).toEqual(expect.objectContaining({
      title: 'OpenSERP',
      url: 'https://openserp.org/',
      snippet: 'Open source search API',
      publishedAt: 'Mon, 24 Aug 2026 00:00:00 GMT',
    }));
  });

  it('parses DuckDuckGo result links and snippets', () => {
    const results = parseDuckDuckGoHtml(`
      <div class="result">
        <a rel="nofollow" class="result__a" href="https://example.com/?a=1&amp;b=2">Example</a>
        <a class="result__snippet">A useful summary</a>
      </div>
    `);

    expect(results[0]).toEqual(expect.objectContaining({
      title: 'Example',
      url: 'https://example.com/?a=1&b=2',
      snippet: 'A useful summary',
    }));
  });
});

describe('search input validation', () => {
  it('applies defaults and rejects unsupported input', () => {
    expect(validateSearchInput({ query: '  openserp  ' }, ['bing', 'duckduckgo'])).toEqual({
      query: 'openserp',
      platforms: ['bing', 'duckduckgo'],
      limit: 10,
    });

    expect(() => validateSearchInput({ query: '', platforms: ['bing'] })).toThrow('1-100');
    expect(() => validateSearchInput({ query: 'test', platforms: ['unknown'] })).toThrow('不支持');
  });
});

describe('SearchService', () => {
  it('uses the configured OpenSERP endpoint for all selected platforms', async () => {
    const fetchFn = jest.fn(async (_url: string) => new Response(JSON.stringify({
      results: [{ rank: 1, title: 'Example', url: 'https://example.com', snippet: 'Summary' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const service = new SearchService({
      openSerpBaseUrl: 'http://openserp.test',
      fetchFn: fetchFn as typeof fetch,
      now: () => 1_000,
    });

    const response = await service.search({ query: 'example', platforms: ['google', 'bing'], limit: 5 });

    expect(response.meta.totalResults).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][0]).toMatch(/\/google\/search\?text=example&limit=5/);
    expect(response.platforms.every((platform) => platform.provider === 'openserp')).toBe(true);
  });

  it('does not expose unavailable engines as direct fallbacks', () => {
    const service = new SearchService({ directFallback: true });
    const platforms = service.getPlatforms();

    expect(platforms.find((platform) => platform.id === 'bing')).toEqual(expect.objectContaining({
      available: true,
      provider: 'direct-fallback',
    }));
    expect(platforms.find((platform) => platform.id === 'google')).toEqual(expect.objectContaining({
      available: false,
      provider: 'unavailable',
    }));
  });
});
