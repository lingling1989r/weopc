'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store/auth';
import { projectsApi } from '@/lib/api/client';

const PROJECT_TYPES = [
  { value: 'FULL_TIME', label: '全职' },
  { value: 'PART_TIME', label: '兼职' },
  { value: 'FREELANCE', label: '自由职业' },
  { value: 'SIDE_GIG', label: '副业' },
  { value: 'INTERNSHIP', label: '实习' },
  { value: 'TOOLBOX', label: '工具箱' },
];

const REVENUE_TIERS = [
  { value: 'TIER_0_1K', label: '0-1K' },
  { value: 'TIER_1K_5K', label: '1K-5K' },
  { value: 'TIER_5K_10K', label: '5K-10K' },
  { value: 'TIER_10K_30K', label: '10K-30K' },
  { value: 'TIER_30K_50K', label: '30K-50K' },
  { value: 'TIER_50K_100K', label: '50K-100K' },
  { value: 'TIER_100K_PLUS', label: '100K+' },
];

const EXECUTION_REQS = [
  { value: 'REMOTE', label: '远程' },
  { value: 'ONSITE', label: '现场' },
  { value: 'HYBRID', label: '混合' },
  { value: 'FLEXIBLE', label: '灵活' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    type: 'FREELANCE',
    category: '',
    tags: '',
    revenueTier: 'TIER_1K_5K',
    executionReq: 'REMOTE',
    duration: '',
    skillsRequired: '',
    experienceLevel: '',
    location: '',
    city: '',
    province: '',
    contactEmail: '',
    contactPhone: '',
    contactWechat: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated or not a provider
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else if (user?.role !== 'PROVIDER' && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Parse tags and skills
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);
      const skillsRequired = formData.skillsRequired
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);

      const projectData = {
        ...formData,
        tags,
        skillsRequired,
        shortDescription: formData.shortDescription || undefined,
        duration: formData.duration || undefined,
        experienceLevel: formData.experienceLevel || undefined,
        location: formData.location || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactWechat: formData.contactWechat || undefined,
      };

      const response = await projectsApi.create(projectData);
      const projectId = response.data.data.id;

      // Redirect to project detail or dashboard
      alert('项目创建成功！等待管理员审核。');
      router.push(`/dashboard/provider`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '创建失败，请检查输入');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated() || (user?.role !== 'PROVIDER' && user?.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">发布新项目</h1>
          <p className="text-gray-600">填写项目信息，吸引合适的人才</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          {/* Basic Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">基本信息</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={200}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：寻找前端开发工程师"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                简短描述
              </label>
              <input
                type="text"
                maxLength={500}
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="一句话概括项目"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                详细描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                minLength={20}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="详细描述项目内容、工作职责、项目目标等..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目类型 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：技术开发"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="用逗号分隔，例如：React, TypeScript, 远程"
              />
              <p className="text-xs text-gray-500 mt-1">用逗号分隔多个标签</p>
            </div>
          </div>

          {/* Compensation & Requirements */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">报酬与要求</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收入层级 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.revenueTier}
                  onChange={(e) => setFormData({ ...formData, revenueTier: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {REVENUE_TIERS.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      ¥{tier.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工作方式 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.executionReq}
                  onChange={(e) => setFormData({ ...formData, executionReq: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXECUTION_REQS.map((req) => (
                    <option key={req.value} value={req.value}>
                      {req.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所需技能 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.skillsRequired}
                onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="用逗号分隔，例如：JavaScript, Node.js, MongoDB"
              />
              <p className="text-xs text-gray-500 mt-1">用逗号分隔多个技能</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目周期
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：3个月"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  经验要求
                </label>
                <input
                  type="text"
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：3年以上"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">地点信息</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  省份
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：广东省"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  城市
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：深圳市"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细地址
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：南山区"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">联系方式</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  电话
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="13800138000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  微信
                </label>
                <input
                  type="text"
                  value={formData.contactWechat}
                  onChange={(e) => setFormData({ ...formData, contactWechat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="微信号"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              联系方式将在用户登录后显示
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '发布项目'}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
