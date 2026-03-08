'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/hooks/useAuth';

interface Link {
  id: string;
  originalUrl: string;
  shortCode: string;
  name: string | null;
  source: string | null;
  clicks: number;
  trackingUrl: string;
  createdAt: string;
  todayClicks?: number;
}

export default function ToolboxPage() {
  const { user, isAuthenticated } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    originalUrl: '',
    name: '',
    source: 'wechat',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 加载链接列表
  const loadLinks = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/v1/links', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLinks(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 创建链接
  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/v1/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setLinks([data.data, ...links]);
        setShowForm(false);
        setFormData({ originalUrl: '', name: '', source: 'wechat' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 复制链接
  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 平台选项
  const platforms = [
    { value: 'wechat', label: '微信' },
    { value: 'xiaohongshu', label: '小红书' },
    { value: 'douyin', label: '抖音' },
    { value: 'zhihu', label: '知乎' },
    { value: 'weibo', label: '微博' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'other', label: '其他' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">工具箱</h1>
          <p className="text-gray-600 mb-8">登录后可使用链接追踪工具</p>
          <a href="/login" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            立即登录
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">工具箱</h1>
            <p className="text-gray-600">链接追踪 - 追踪不同渠道的引流效果</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) loadLinks(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? '查看列表' : '创建追踪链接'}
          </button>
        </div>

        {/* 创建表单 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">创建追踪链接</h2>
            <form onSubmit={createLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">原始链接 *</label>
                <input
                  type="url"
                  required
                  value={formData.originalUrl}
                  onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">链接名称（可选）</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：618活动推广"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">来源渠道</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {platforms.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                生成追踪链接
              </button>
            </form>
          </div>
        )}

        {/* 链接列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">我的追踪链接</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">加载中...</div>
          ) : links.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              暂无追踪链接，点击上方按钮创建
            </div>
          ) : (
            <div className="divide-y">
              {links.map((link) => (
                <div key={link.id} className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{link.name || '未命名'}</h3>
                      <p className="text-sm text-gray-500">{link.originalUrl}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {platforms.find(p => p.value === link.source)?.label || link.source}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex-1 bg-gray-50 px-4 py-2 rounded flex items-center gap-2">
                      <code className="text-sm text-blue-600 flex-1 truncate">{link.trackingUrl}</code>
                      <button
                        onClick={() => copyLink(link.trackingUrl, link.id)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        {copiedId === link.id ? '已复制' : '复制'}
                      </button>
                    </div>
                    
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold text-blue-600">{link.clicks}</div>
                      <div className="text-xs text-gray-500">总点击</div>
                    </div>
                    
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold text-green-600">{link.todayClicks || 0}</div>
                      <div className="text-xs text-gray-500">今日</div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    创建于 {new Date(link.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">💡 使用说明</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>1. 创建追踪链接，填写原始 URL 和来源渠道</li>
            <li>2. 复制生成的追踪链接，分发给不同平台的用户</li>
            <li>3. 用户点击链接后，会自动跳转到原始 URL，同时记录点击数据</li>
            <li>4. 在这里查看每个链接的点击统计，了解不同渠道的引流效果</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
