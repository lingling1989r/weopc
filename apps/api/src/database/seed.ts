import { PrismaClient, ProjectType, RevenueTier } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create or get defaultProvider
  let defaultProvider = await prisma.user.findUnique({
    where: { email: 'default-provider@weopc.org' },
  });

  if (!defaultProvider) {
    const hashedPassword = await bcryptjs.hash('DefaultProvider123!', 10);
    defaultProvider = await prisma.user.create({
      data: {
        email: 'default-provider@weopc.org',
        username: 'default-provider',
        displayName: '官方项目库',
        passwordHash: hashedPassword,
        role: 'PROVIDER',
        status: 'ACTIVE',
        emailVerified: true,
        bio: '官方精选项目库，提供优质副业机会',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default-provider',
      },
    });
    console.log('✅ Created defaultProvider:', defaultProvider.id);
  } else {
    console.log('✅ DefaultProvider already exists:', defaultProvider.id);
  }

  // 2. Load featured projects from JSON
  const projectsPath = path.join(__dirname, '../data/featured-projects.json');
  const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));

  // 3. Map categories to RevenueTier

  const revenueMap: { [key: string]: RevenueTier } = {
    '1000+': 'TIER_1K_5K',
    '5000+': 'TIER_5K_10K',
    '10000+': 'TIER_10K_30K',
    '20万+': 'TIER_100K_PLUS',
  };

  // 4. Insert projects
  let createdCount = 0;
  for (const proj of projectsData) {
    const existingProject = await prisma.project.findFirst({
      where: {
        title: proj.title,
        providerId: defaultProvider.id,
      },
    });

    if (!existingProject) {
      const revenueTier = proj.revenue
        ? revenueMap[proj.revenue] || 'TIER_1K_5K'
        : 'TIER_1K_5K';

      await prisma.project.create({
        data: {
          title: proj.title,
          description: proj.description,
          shortDescription: proj.description.substring(0, 100),
          type: ProjectType.TOOLBOX,
          category: proj.category,
          tags: proj.tags || [],
          revenueTier: revenueTier,
          executionReq: 'REMOTE',
          status: 'PUBLISHED',
          featured: proj.featured || false,
          providerId: defaultProvider.id,
          contactEmail: 'default-provider@weopc.org',
          contactWechat: 'weopc-official',
        },
      });
      createdCount++;
    }
  }

  console.log(`✅ Seeded ${createdCount} projects`);

  // 5. Create ADMIN user if not exists
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@weopc.org' },
  });

  if (!adminUser) {
    const hashedPassword = await bcryptjs.hash('Admin123!', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@weopc.org',
        username: 'admin',
        displayName: '管理员',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    console.log('✅ Created ADMIN user:', adminUser.id);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
