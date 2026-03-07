'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProjectList } from '@/components/features/ProjectList';
import { ShowcaseList } from '@/components/features/ShowcaseList';
import { PoliciesSection } from '@/components/features/PoliciesSection';
import { EventsSection } from '@/components/features/EventsSection';
import { CategoriesSection } from '@/components/features/CategoriesSection';
import { useProtectedAction } from '@/lib/hooks/useProtectedAction';

export default function HomePage() {
  const router = useRouter();
  const { executeProtected } = useProtectedAction();

  const handleBrowseProjects = () => {
    document.getElementById('projects-section')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const handlePostProject = () => {
    executeProtected(() => {
      router.push('/projects/new');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            发现优质副业机会
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            连接项目方与灵活工作者，开启你的副业之旅
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleBrowseProjects}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              浏览项目
            </button>
            <button
              onClick={handlePostProject}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-400 border-2 border-white transition"
            >
              发布项目
            </button>
          </div>
        </div>
      </section>

      {/* Policies Section */}
      <PoliciesSection />

      {/* Categories Section */}
      <CategoriesSection />

      {/* Showcase Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">精选案例</h2>
          <a href="/showcase" className="text-blue-600 hover:underline text-sm">
            查看全部 →
          </a>
        </div>
        <ShowcaseList limit={6} featured />
      </section>

      {/* Projects Section */}
      <section
        id="projects-section"
        className="container mx-auto px-4 py-12 flex-grow"
      >
        <h2 className="text-3xl font-bold mb-8">最新项目</h2>
        <ProjectList />
      </section>

      <Footer />
    </div>
  );
}
