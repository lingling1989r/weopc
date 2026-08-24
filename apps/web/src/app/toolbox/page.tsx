import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const tools = [
  {
    href: '/toolbox/search-engines',
    title: '多平台搜索引擎分析（海外）',
    description: '一次提交查询，按平台查看海外搜索结果、排名、摘要和失败状态。',
    icon: '🌐',
    badge: '可用',
  },
  {
    href: '/toolbox/links',
    title: '链接追踪',
    description: '为不同渠道生成专属追踪链接，统计点击与引流效果。',
    icon: '🔗',
    badge: '可用',
  },
];

export default function ToolboxPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">WEOPC Toolbox</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">增长工具箱</h1>
          <p className="text-lg leading-8 text-gray-600">把搜索、追踪等高频工作集中到一个入口，逐步沉淀可复用的品牌增长能力。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{tool.icon}</div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">{tool.badge}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-700">{tool.title}</h2>
              <p className="text-sm leading-7 text-gray-600">{tool.description}</p>
              <div className="mt-6 border-t border-gray-100 pt-4 text-sm font-medium text-blue-600">进入工具 →</div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
