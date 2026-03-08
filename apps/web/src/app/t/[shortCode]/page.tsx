import { redirect } from 'next/navigation';
import { prisma } from '@/lib/database/prisma';

interface Props {
  params: {
    shortCode: string;
  };
}

export async function generateMetadata({ params }: Props) {
  return {
    title: '跳转中... - WEOPC',
  };
}

export default async function RedirectPage({ params }: Props) {
  const { shortCode } = params;
  
  const link = await prisma.link.findUnique({
    where: { shortCode },
  });
  
  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">链接不存在</h1>
          <p className="text-gray-600">该链接可能已失效</p>
        </div>
      </div>
    );
  }
  
  // 跳转到原始链接
  redirect(link.originalUrl);
}
