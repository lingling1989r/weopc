/**
 * Gov.cn 搜索爬虫（结构化 JSON）
 *
 * 目标：先把 2025-06-01 ~ 现在的政策/要闻/通知等抓一批进库，
 * 方便我们观察数据形态，再决定“广场”表结构与 UI。
 *
 * 运行：
 *   cd apps/api && pnpm run crawler
 * 可选参数：
 *   --since=2025-06-01  (默认 2025-06-01)
 *   --pageSize=20       (默认 20)
 *   --maxPages=200      (默认 200)
 */

import crypto from 'node:crypto';
import https from 'node:https';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type GovSearchItem = {
  title?: string;
  title_no_tag?: string;
  summary?: string | null;
  content?: string | null;
  url?: string;
  time?: string; // "YYYY-MM-DD HH:mm:ss"
  label?: string;
  source?: number | string;
};

type GovSearchResponse = {
  result?: {
    data?: {
      middle?: {
        list?: GovSearchItem[];
      };
      pager?: {
        total?: number;
        pageCount?: number;
        pageNo?: number;
      };
    };
  };
};

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (const part of argv) {
    if (!part.startsWith('--')) continue;
    const [rawKey, ...rest] = part.slice(2).split('=');
    args[rawKey] = rest.join('=');
  }
  return args;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDateTime(value: string | undefined): Date | null {
  if (!value) return null;
  // Node 对 "YYYY-MM-DD HH:mm:ss" 的解析不稳定，做一次标准化。
  const normalized = value.replace(/-/g, '/');
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isEventTitle(title: string) {
  return /(黑客松|hackathon|大赛|赛事|比赛|创业大赛|创新创业|路演|挑战杯)/i.test(title);
}

function buildAthenaHeaders() {
  // 来自 gov 搜索页 search.js 内置的公钥与 appKey
  const pubKeyB64 =
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCSMhMJQ+XLI7oW0k9Bwufur4Ag40tcsrzT7WZf6Ao0O/hyY1gZtCSYFxkxIZUXjW46j27XSW8IDX1rTJoHaMxHCWsOpTi2W5stybGYZytsY5on8gd8AIaS1d52h9eaS2TFydtJJtE50xHmT0WmoyoinWCuVCOkdCLhh9b9jSdeSQIDAQAB';
  const appKey = 'a46884b2013e4d189f2a8e2d49a23525';

  const pem = `-----BEGIN PUBLIC KEY-----\n${pubKeyB64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  // PKCS1 padding 含随机性；每次生成不同是正常的。
  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(appKey, 'utf8')
  );

  return {
    athenaAppKey: encodeURIComponent(encrypted.toString('base64')),
    athenaAppName: encodeURIComponent('国网搜索'),
  };
}

async function postJson<T>(url: string, body: unknown, headers: Record<string, string>): Promise<T> {
  const payload = JSON.stringify(body);

  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += String(chunk)));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(data) as T);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchGovSearchPage(params: {
  searchWord: string;
  beginMs: number;
  endMs: number;
  pageNo: number;
  pageSize: number;
  searchBy: 'title' | 'content';
  dataTypeId: '107' | '14' | '15';
}): Promise<GovSearchResponse> {
  const baseUrl = 'https://sousuoht.www.gov.cn';
  const forwardSearch =
    '/athena/forward/2B22E8E39E850E17F95A016A74FCB6B673336FA8B6FEC0E2955907EF9AEE06BE';

  const { athenaAppKey, athenaAppName } = buildAthenaHeaders();

  // code=17da70961a7 来自站内搜索默认 code
  const body = {
    code: '17da70961a7',
    searchWord: params.searchWord,
    dataTypeId: params.dataTypeId,
    orderBy: 'time',
    searchBy: params.searchBy,
    appendixType: '',
    granularity: 'CUSTOM',
    beginDateTime: params.beginMs,
    endDateTime: params.endMs,
    isSearchForced: 0,
    filters: [],
    pageNo: params.pageNo,
    pageSize: params.pageSize,
    trackTotalHits: true,
    customFilter: { operator: 'and', properties: [] },
    historySearchWords: [],
  };

  return postJson<GovSearchResponse>(baseUrl + forwardSearch, body, {
    athenaAppKey,
    athenaAppName,
  });
}

async function ingestItem(item: GovSearchItem, _searchWord: string) {
  const sourceUrl = item.url?.trim();
  if (!sourceUrl) return;

  const title = stripHtml(item.title_no_tag || item.title || '').slice(0, 300);
  if (!title) return;

  const publishDate = toDateTime(item.time);
  const content = stripHtml(item.summary || item.content || '').slice(0, 2000) || null;
  const label = item.label ? String(item.label) : '';

  // 简单分类：标题像活动就进 Event，否则进 PolicyNews。
  if (isEventTitle(title)) {
    await prisma.event.upsert({
      where: { sourceUrl },
      create: {
        title,
        description: content,
        source: 'gov.cn',
        sourceUrl,
        eventType: label || '活动',
        status: 'UPCOMING',
        startDate: publishDate,
      },
      update: {
        title,
        description: content,
        startDate: publishDate,
      },
    });
    return;
  }

  await prisma.policyNews.upsert({
    where: { sourceUrl },
    create: {
      title,
      content,
      source: 'gov.cn',
      sourceUrl,
      category: label || '政策/要闻',
      publishDate,
    },
    update: {
      title,
      content,
      category: label || '政策/要闻',
      publishDate,
    },
  });
}

async function crawlGovCn(options: {
  since: Date;
  pageSize: number;
  maxPages: number;
  searchWords: string[];
  searchBy: 'title' | 'content';
  dataTypeId: '107' | '14' | '15';
}) {
  const beginMs = options.since.getTime();
  const endMs = Date.now();

  let totalInserted = 0;

  for (const searchWord of options.searchWords) {
    console.log(`\n🔎 gov.cn 搜索词：${searchWord}`);

    for (let pageNo = 1; pageNo <= options.maxPages; pageNo++) {
      const resp = await fetchGovSearchPage({
        searchWord,
        beginMs,
        endMs,
        pageNo,
        pageSize: options.pageSize,
        searchBy: options.searchBy,
        dataTypeId: options.dataTypeId,
      });

      const list = resp?.result?.data?.middle?.list ?? [];
      const pager = resp?.result?.data?.pager;
      const pageCount = pager?.pageCount ?? null;
      const total = pager?.total ?? null;

      if (pageNo === 1) {
        console.log(`   total=${total ?? 'unknown'} pageCount=${pageCount ?? 'unknown'}`);
      }

      if (list.length === 0) {
        console.log(`   page ${pageNo}: empty, stop`);
        break;
      }

      let pageInserted = 0;
      for (const item of list) {
        await ingestItem(item, searchWord);
        pageInserted++;
      }

      totalInserted += pageInserted;
      console.log(`   page ${pageNo}: ${pageInserted} items`);

      if (pageCount !== null && pageNo >= pageCount) break;

          // 轻度限速，避免压测
      await sleep(300);
    }
  }

  return { totalInserted };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const sinceStr = args.since || '2025-06-01';
  const pageSize = Number.parseInt(args.pageSize || '20', 10);
  const maxPages = Number.parseInt(args.maxPages || '200', 10);

  const since = new Date(`${sinceStr}T00:00:00+08:00`);
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since: ${sinceStr}`);
  }

  const defaultWords = [
    // 政策/资金/扶持
    '创业',
    '就业创业',
    '创业担保贷款',
    '创业投资',
    '创业补贴',
    '创业扶持',
    '创业孵化',
    '孵化器',
    '创业培训',
    '创业孵化基地',
    '小微企业 扶持',
    '中小企业 扶持',
    '个体工商户 扶持',
    '民营经济 支持',
    '税收优惠 创业',
    '税费减免 创业',
    '社保补贴 创业',
    '创业担保',

    // 人群/场景
    '高校毕业生 创业',
    '灵活就业 创业',
    '退役军人 创业',

    // 赛事/活动（gov.cn 里数量可能少，但先铺好）
    '创业大赛',
    '创新创业大赛',
    '创业比赛',
    '创业路演',
    '双创',
    '挑战杯',
    '黑客松',
    'hackathon',

    // 城市维度（先覆盖一线/新一线，便于“城市政策”卡片）
    '北京 创业 政策',
    '上海 创业 政策',
    '深圳 创业 政策',
    '杭州 创业 政策',
    '广州 创业 政策',
    '成都 创业 政策',
    '南京 创业 政策',
    '武汉 创业 政策',
    '苏州 创业 政策',
    '西安 创业 政策',
  ];

  const wordsArg = args.words;
  const searchWords = wordsArg
    ? wordsArg
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean)
    : defaultWords;

  console.log('🚀 gov.cn 爬虫启动');
  console.log(`📅 since=${since.toISOString().slice(0, 10)} pageSize=${pageSize} maxPages=${maxPages}`);

  const searchBy = (args.searchBy === 'content' ? 'content' : 'title') as 'title' | 'content';
  const dataTypeId = ((args.dataTypeId === '14' || args.dataTypeId === '15')
    ? args.dataTypeId
    : '107') as '107' | '14' | '15';

  const { totalInserted } = await crawlGovCn({
    since,
    pageSize,
    maxPages,
    searchWords,
    searchBy,
    dataTypeId,
  });

  const policyCount = await prisma.policyNews.count();
  const eventCount = await prisma.event.count();

  console.log('\n✅ 完成');
  console.log(`- 本次 upsert: ${totalInserted}`);
  console.log(`- PolicyNews: ${policyCount}`);
  console.log(`- Event: ${eventCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
