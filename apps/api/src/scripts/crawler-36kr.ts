/**
 * 36Kr 创投新闻爬虫
 *
 * 目标：抓取 36Kr 创业/科技/AI 相关快讯和文章
 * 运行：
 *   cd apps/api && pnpm run crawler:36kr
 */

import '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 36Kr 快讯 API
const NEWSFLASH_API = 'https://www.36kr.com/api/newsflash';
// 需要排除的关键词（低质量/不相关内容）
const EXCLUDE_KEYWORDS = [
  '反腐', '落马', '违纪', '双规', '调查', '受贿',
  '彩票', '赌博',
  '明星', '娱乐', '八卦', '离婚', '出轨',
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function scoreRelevance(title: string, description: string): number {
  const text = `${title} ${description || ''}`;
  let score = 0;

  // 基础分：只要是 36Kr 的科技/创业快讯就有价值
  score += 10;

  // AI 相关 - 高权重
  if (matchesKeywords(text, ['AI', '人工智能', '大模型', 'LLM', 'AIGC', 'ChatGPT', 'OpenAI', 'DeepSeek', '大模型', '模型'])) {
    score += 30;
  }
  // 创业投资
  if (matchesKeywords(text, ['融资', '投资', 'VC', '天使', '估值', '独角兽', '初创', '创业', 'IPO', '上市', '收购', '并购'])) {
    score += 20;
  }
  // 赛事活动
  if (matchesKeywords(text, ['黑客松', 'hackathon', '大赛', '路演', '峰会', '沙龙', '创新', '挑战'])) {
    score += 20;
  }
  // 科技
  if (matchesKeywords(text, ['开源', 'SaaS', '云服务', '数字化', '技术', '芯片', '软件', '互联网', '数字经济'])) {
    score += 15;
  }
  // 政策
  if (matchesKeywords(text, ['政策', '补贴', '扶持', '资金', '税收', '优惠', '支持', '试点'])) {
    score += 10;
  }

  // 排除低质量
  if (matchesKeywords(text, EXCLUDE_KEYWORDS)) {
    score = 0;
  }

  // 标题太短不处理
  if (title.length < 8) {
    score = 0;
  }

  return score;
}

function classifyItem(title: string, description: string): 'Event' | 'IndustryTrend' | 'PolicyNews' | null {
  const text = `${title} ${description || ''}`;

  // 赛事/活动
  if (matchesKeywords(text, ['黑客松', 'hackathon', '大赛', '比赛', '路演', '峰会', '沙龙', '创业大赛', '创新大赛'])) {
    return 'Event';
  }

  // 行业趋势（融资、赛道分析）
  if (matchesKeywords(text, ['融资', '投资', '收购', 'IPO', '上市', '估值', '赛道', '风投'])) {
    return 'IndustryTrend';
  }

  // 政策相关
  if (matchesKeywords(text, ['政策', '补贴', '扶持', '资金', '税收', '优惠'])) {
    return 'PolicyNews';
  }

  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

interface NewsflashItem {
  id: number;
  title: string;
  description: string;
  published_at: string;
  column: { id: number; name: string };
  news_url?: string;
  news_url_type?: string;
}

async function crawlNewsflash(page: number = 1, limit: number = 20): Promise<NewsflashItem[]> {
  try {
    const data = await fetchJson<{ data: { items: NewsflashItem[] } }>(
      `${NEWSFLASH_API}?page=${page}&per_page=${limit}`
    );
    return data?.data?.items || [];
  } catch (e) {
    console.error(`❌ Failed to fetch newsflash page ${page}:`, e);
    return [];
  }
}

async function ingestNewsflash(item: NewsflashItem) {
  const { id, title, description, published_at, column, news_url } = item;

  // 标题过滤
  if (!title || title.length < 5) return null;

  // 排除低质量
  if (matchesKeywords(title, EXCLUDE_KEYWORDS)) return null;

  // 相关度评分
  const score = scoreRelevance(title, description);
  if (score < 10) return null; // 阈值过滤

  // 分类
  const itemType = classifyItem(title, description);
  if (!itemType) return null;

  const sourceUrl = news_url || `https://www.36kr.com/newsflash/${id}`;
  const publishDate = new Date(published_at);

  if (itemType === 'Event') {
    await prisma.event.upsert({
      where: { sourceUrl },
      create: {
        title: title.slice(0, 300),
        description: description?.slice(0, 2000) || null,
        source: '36kr',
        sourceUrl,
        eventType: column?.name || '活动',
        status: 'UPCOMING',
        startDate: publishDate,
      },
      update: {
        title: title.slice(0, 300),
        description: description?.slice(0, 2000) || null,
        startDate: publishDate,
      },
    });
    return 'Event';
  }

  if (itemType === 'IndustryTrend') {
    // 尝试用 IndustryTrend 表（如果没有这个表会报错，需要先创建）
    try {
      await prisma.$queryRaw`
        INSERT INTO "IndustryTrend" (id, title, content, source, "sourceUrl", category, "publishDate", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${title.slice(0, 300)}, ${description?.slice(0, 2000) || null}, '36kr', ${sourceUrl}, ${column?.name || '创投'}, ${publishDate}, NOW(), NOW())
        ON CONFLICT ("sourceUrl") DO UPDATE SET title = ${title.slice(0, 300)}, content = ${description?.slice(0, 2000)}, "publishDate" = ${publishDate}, "updatedAt" = NOW()
      `;
      return 'IndustryTrend';
    } catch {
      // 表不存在时降级到 PolicyNews
      await prisma.policyNews.upsert({
        where: { sourceUrl },
        create: {
          title: title.slice(0, 300),
          content: description?.slice(0, 2000) || null,
          source: '36kr',
          sourceUrl,
          category: column?.name || '创投',
          publishDate: publishDate,
        },
        update: {
          title: title.slice(0, 300),
          content: description?.slice(0, 2000) || null,
          publishDate: publishDate,
        },
      });
      return 'PolicyNews';
    }
  }

  // PolicyNews
  await prisma.policyNews.upsert({
    where: { sourceUrl },
    create: {
      title: title.slice(0, 300),
      content: description?.slice(0, 2000) || null,
      source: '36kr',
      sourceUrl,
      category: column?.name || '创投',
      publishDate: publishDate,
    },
    update: {
      title: title.slice(0, 300),
      content: description?.slice(0, 2000) || null,
      publishDate,
    },
  });

  return 'PolicyNews';
}

async function main() {
  console.log('🚀 36Kr 爬虫启动\n');

  let totalEvent = 0;
  let totalTrend = 0;
  let totalPolicy = 0;
  let totalSkipped = 0;

  // 抓取前 5 页快讯
  for (let page = 1; page <= 5; page++) {
    console.log(`📥 抓取第 ${page} 页...`);
    const items = await crawlNewsflash(page);

    if (items.length === 0) {
      console.log('   无数据，停止');
      break;
    }

    for (const item of items) {
      try {
        const type = await ingestNewsflash(item);
        if (type === 'Event') totalEvent++;
        else if (type === 'IndustryTrend') totalTrend++;
        else if (type === 'PolicyNews') totalPolicy++;
        else totalSkipped++;
      } catch (e) {
        console.error(`   ⚠️ 入库失败: ${item.title.slice(0, 30)}`, e);
      }
    }

    console.log(`   页 ${page}: ${items.length} 条处理完成`);
    await sleep(500); // 轻度限速
  }

  console.log('\n✅ 完成');
  console.log(`- Event: ${totalEvent}`);
  console.log(`- IndustryTrend: ${totalTrend}`);
  console.log(`- PolicyNews: ${totalPolicy}`);
  console.log(`- 跳过: ${totalSkipped}`);

  const eventCount = await prisma.event.count({ where: { source: '36kr' } });
  const policyCount = await prisma.policyNews.count({ where: { source: '36kr' } });
  console.log(`\n📊 DB 现状: Event=${eventCount}, PolicyNews=${policyCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
