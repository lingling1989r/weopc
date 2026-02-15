'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { projectsApi, leadsApi } from '@/lib/api/client';
import { useProtectedAction } from '@/lib/hooks/useProtectedAction';
import { useAuthStore } from '@/lib/store/auth';

interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  type: string;
  category: string;
  tags: string[];
  revenueTier: string;
  executionReq: string;
  skillsRequired: string[];
  experienceLevel?: string;
  location?: string;
  city?: string;
  province?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWechat?: string;
  viewCount: number;
  createdAt: string;
  provider: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  _count?: {
    leads: number;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { executeProtected } = useProtectedAction();
  const { isAuthenticated } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    coverLetter: '',
    expectedRate: '',
    availability: '',
    resume: '',
    portfolio: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectsApi.getById(projectId);
        setProject(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || '加载项目失败');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center">加载中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center text-red-600">{error || '项目不存在'}</div>
        </main>
        <Footer />
      </div>
    );
  }

  const revenueMap: Record<string, string> = {
    TIER_0_1K: '0-1K',
    TIER_1K_5K: '1K-5K',
    TIER_5K_10K: '5K-10K',
    TIER_10K_30K: '10K-30K',
    TIER_30K_50K: '30K-50K',
    TIER_50K_100K: '50K-100K',
    TIER_100K_PLUS: '100K+',
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      await leadsApi.submit(projectId, leadFormData);
      setShowApplyForm(false);
      setLeadFormData({
        coverLetter: '',
        expectedRate: '',
        availability: '',
        resume: '',
        portfolio: '',
      });
      // Show success message and redirect to dashboard
      alert('申请提交成功！你可以在仪表板中查看申请状态。');
      router.push('/dashboard');
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Project Header */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
                  <div className="flex items-center gap-4 text-gray-600">
                    <span className="text-sm">
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="text-sm">👁 {project.viewCount} 次浏览</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {project.type}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  {project.executionReq}
                </span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                  ¥{revenueMap[project.revenueTier] || project.revenueTier}
                </span>
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Short Description */}
              {project.shortDescription && (
                <p className="text-lg text-gray-700 mb-6">
                  {project.shortDescription}
                </p>
              )}
            </div>

            {/* Project Details */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-2xl font-bold mb-4">项目详情</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold mb-4">要求</h2>
              <div className="space-y-4">
                {project.skillsRequired.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      所需技能
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.skillsRequired.map((skill) => (
                        <span
                          key={skill}
                          className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {project.experienceLevel && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      经验要求
                    </h3>
                    <p className="text-gray-700">{project.experienceLevel}</p>
                  </div>
                )}
                {project.location && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">地点</h3>
                    <p className="text-gray-700">
                      {project.province} {project.city} {project.location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Provider Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 sticky top-20">
              <h3 className="font-bold text-lg mb-4">项目方</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {project.provider.displayName?.[0] ||
                    project.provider.username?.[0] ||
                    'P'}
                </div>
                <div>
                  <p className="font-semibold">
                    {project.provider.displayName || project.provider.username}
                  </p>
                  <p className="text-sm text-gray-600">
                    {project._count?.leads || 0} 个申请
                  </p>
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={() =>
                  executeProtected(() => setShowApplyForm(true), `/projects/${projectId}`)
                }
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-3"
              >
                申请此项目
              </button>

              {/* Contact Info */}
              {isAuthenticated() && (
                <div className="border-t pt-4 space-y-2 text-sm">
                  {project.contactEmail && (
                    <p>
                      <span className="font-semibold">邮箱：</span>
                      {project.contactEmail}
                    </p>
                  )}
                  {project.contactPhone && (
                    <p>
                      <span className="font-semibold">电话：</span>
                      {project.contactPhone}
                    </p>
                  )}
                  {project.contactWechat && (
                    <p>
                      <span className="font-semibold">微信：</span>
                      {project.contactWechat}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Apply Form Modal */}
        {showApplyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">申请此项目</h2>

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitLead} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    自我介绍 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={leadFormData.coverLetter}
                    onChange={(e) => setLeadFormData({ ...leadFormData, coverLetter: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="介绍你的经验和为什么适合这个项目..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    期望报酬
                  </label>
                  <input
                    type="text"
                    value={leadFormData.expectedRate}
                    onChange={(e) => setLeadFormData({ ...leadFormData, expectedRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：5000/月 或 100/小时"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    可开始时间
                  </label>
                  <input
                    type="text"
                    value={leadFormData.availability}
                    onChange={(e) => setLeadFormData({ ...leadFormData, availability: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：立即 或 2周后"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    简历链接
                  </label>
                  <input
                    type="url"
                    value={leadFormData.resume}
                    onChange={(e) => setLeadFormData({ ...leadFormData, resume: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    作品集链接
                  </label>
                  <input
                    type="url"
                    value={leadFormData.portfolio}
                    onChange={(e) => setLeadFormData({ ...leadFormData, portfolio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyForm(false);
                      setSubmitError('');
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '提交中...' : '提交申请'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
