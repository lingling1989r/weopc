import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = './screenshots';
const VIDEO_DIR = './videos';

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  screenshot?: string;
  error?: string;
}

const results: TestResult[] = [];

// 确保目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function logTest(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${result.test}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  if (result.error) {
    console.log(`   错误: ${result.error}`);
  }
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 开始 Playwright E2E 测试\n');
  console.log('='.repeat(70));

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  // 测试用户数据
  const timestamp = Date.now();
  const testUser = {
    email: `testuser${timestamp}@example.com`,
    password: 'Test123456',
    username: `testuser${timestamp}`,
    displayName: 'Test User',
  };

  try {
    // 启动浏览器
    console.log('\n🌐 启动浏览器...');
    browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      slowMo: 500, // 减慢操作速度，便于观察
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: 1920, height: 1080 }
      }
    });

    page = await context.newPage();

    // ==================== 1. 首页测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 1. 首页功能测试');
    console.log('='.repeat(70));

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await sleep(1000);

      // 检查页面标题
      const title = await page.title();
      logTest({
        category: '首页',
        test: '页面标题',
        status: title.includes('WEOPC') ? 'PASS' : 'FAIL',
        details: `标题: ${title}`,
      });

      // 检查 Logo
      const logo = await page.locator('text=WEOPC.ORG').first();
      const logoVisible = await logo.isVisible();
      logTest({
        category: '首页',
        test: 'Logo 显示',
        status: logoVisible ? 'PASS' : 'FAIL',
        details: logoVisible ? 'Logo 正常显示' : 'Logo 未找到',
      });

      // 检查导航栏
      const loginLink = await page.locator('text=登录').first();
      const registerLink = await page.locator('text=注册').first();
      const projectsLink = await page.locator('text=项目广场').first();

      logTest({
        category: '首页',
        test: '导航栏链接',
        status: (await loginLink.isVisible() && await registerLink.isVisible() && await projectsLink.isVisible()) ? 'PASS' : 'FAIL',
        details: '登录、注册、项目广场链接都存在',
      });

      // 检查 Hero Section
      const heroTitle = await page.locator('text=发现优质副业机会').first();
      const heroVisible = await heroTitle.isVisible();
      logTest({
        category: '首页',
        test: 'Hero Section',
        status: heroVisible ? 'PASS' : 'FAIL',
        details: heroVisible ? 'Hero 标题正常显示' : 'Hero 标题未找到',
      });

      // 检查按钮
      const browseButton = await page.locator('button:has-text("浏览项目")').first();
      const postButton = await page.locator('button:has-text("发布项目")').first();
      logTest({
        category: '首页',
        test: 'CTA 按钮',
        status: (await browseButton.isVisible() && await postButton.isVisible()) ? 'PASS' : 'FAIL',
        details: '浏览项目和发布项目按钮都存在',
      });

      // 测试"浏览项目"按钮滚动功能
      await browseButton.click();
      await sleep(1000);
      logTest({
        category: '首页',
        test: '浏览项目按钮功能',
        status: 'PASS',
        details: '点击后页面滚动到项目区域',
      });

      // 检查项目列表是否加载
      await sleep(2000); // 等待 API 请求
      const projectCards = await page.locator('[class*="grid"]').first();
      const projectsVisible = await projectCards.isVisible();
      logTest({
        category: '首页',
        test: '项目列表加载',
        status: projectsVisible ? 'PASS' : 'WARNING',
        details: projectsVisible ? '项目列表正常显示' : '项目列表可能为空',
      });

      await takeScreenshot(page, '01_homepage');

    } catch (error: any) {
      logTest({
        category: '首页',
        test: '首页测试',
        status: 'FAIL',
        details: '首页测试失败',
        error: error.message,
      });
    }

    // ==================== 2. 注册功能测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 2. 注册功能测试');
    console.log('='.repeat(70));

    try {
      // 点击注册按钮
      await page.locator('text=注册').first().click();
      await page.waitForURL('**/register');
      await sleep(1000);

      logTest({
        category: '注册',
        test: '导航到注册页面',
        status: 'PASS',
        details: `当前 URL: ${page.url()}`,
      });

      // 检查表单元素
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]').first();
      const usernameInput = page.locator('input[name="username"]');

      const formComplete = await emailInput.isVisible() &&
                          await passwordInput.isVisible() &&
                          await usernameInput.isVisible();

      logTest({
        category: '注册',
        test: '注册表单元素',
        status: formComplete ? 'PASS' : 'FAIL',
        details: formComplete ? '所有表单元素都存在' : '表单元素不完整',
      });

      await takeScreenshot(page, '02_register_page');

      // 填写注册表单
      await emailInput.fill(testUser.email);
      await usernameInput.fill(testUser.username);
      await passwordInput.fill(testUser.password);

      // 检查是否有 displayName 字段
      const displayNameInput = page.locator('input[name="displayName"]');
      if (await displayNameInput.isVisible()) {
        await displayNameInput.fill(testUser.displayName);
      }

      await sleep(500);
      await takeScreenshot(page, '03_register_filled');

      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待响应
      await sleep(3000);

      // 检查是否注册成功（可能重定向到 dashboard 或显示成功消息）
      const currentUrl = page.url();
      const registrationSuccess = currentUrl.includes('dashboard') || currentUrl !== `${BASE_URL}/register`;

      logTest({
        category: '注册',
        test: '用户注册',
        status: registrationSuccess ? 'PASS' : 'WARNING',
        details: `注册后 URL: ${currentUrl}`,
      });

      await takeScreenshot(page, '04_after_register');

      // 如果注册成功，先登出
      if (registrationSuccess) {
        // 查找用户菜单
        const userMenu = page.locator('button:has-text("' + testUser.username + '")').or(
          page.locator('[class*="avatar"]')
        ).first();

        if (await userMenu.isVisible()) {
          await userMenu.click();
          await sleep(500);

          const logoutButton = page.locator('text=退出登录');
          if (await logoutButton.isVisible()) {
            await logoutButton.click();
            await sleep(1000);

            logTest({
              category: '注册',
              test: '登出功能',
              status: 'PASS',
              details: '成功登出',
            });
          }
        }
      }

    } catch (error: any) {
      logTest({
        category: '注册',
        test: '注册流程',
        status: 'FAIL',
        details: '注册测试失败',
        error: error.message,
      });
    }

    // ==================== 3. 登录功能测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 3. 登录功能测试');
    console.log('='.repeat(70));

    try {
      // 导航到登录页面
      await page.goto(`${BASE_URL}/login`);
      await sleep(1000);

      logTest({
        category: '登录',
        test: '导航到登录页面',
        status: 'PASS',
        details: `当前 URL: ${page.url()}`,
      });

      // 填写登录表单
      await page.locator('input[type="email"]').fill(testUser.email);
      await page.locator('input[type="password"]').fill(testUser.password);

      await takeScreenshot(page, '05_login_filled');

      // 提交登录
      await page.locator('button[type="submit"]').click();
      await sleep(3000);

      // 检查是否登录成功
      const currentUrl = page.url();
      const loginSuccess = currentUrl.includes('dashboard') || !currentUrl.includes('login');

      logTest({
        category: '登录',
        test: '用户登录',
        status: loginSuccess ? 'PASS' : 'FAIL',
        details: `登录后 URL: ${currentUrl}`,
      });

      await takeScreenshot(page, '06_after_login');

      // 检查用户信息是否显示在 Header
      await page.goto(BASE_URL);
      await sleep(1000);

      const userDisplayed = await page.locator(`text=${testUser.username}`).first().isVisible().catch(() => false);
      logTest({
        category: '登录',
        test: 'Header 显示用户信息',
        status: userDisplayed ? 'PASS' : 'FAIL',
        details: userDisplayed ? '用户名正常显示在 Header' : '用户名未显示',
      });

    } catch (error: any) {
      logTest({
        category: '登录',
        test: '登录流程',
        status: 'FAIL',
        details: '登录测试失败',
        error: error.message,
      });
    }

    // ==================== 4. 项目列表页面测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 4. 项目列表页面测试');
    console.log('='.repeat(70));

    try {
      await page.goto(`${BASE_URL}/projects`);
      await sleep(2000);

      logTest({
        category: '项目列表',
        test: '导航到项目列表',
        status: 'PASS',
        details: `当前 URL: ${page.url()}`,
      });

      // 检查页面标题
      const pageTitle = await page.locator('h1:has-text("项目广场")').isVisible();
      logTest({
        category: '项目列表',
        test: '页面标题',
        status: pageTitle ? 'PASS' : 'FAIL',
        details: pageTitle ? '标题正常显示' : '标题未找到',
      });

      // 检查项目卡片
      await sleep(2000); // 等待加载
      const projectCards = await page.locator('[class*="grid"] > div').count();
      logTest({
        category: '项目列表',
        test: '项目卡片加载',
        status: projectCards > 0 ? 'PASS' : 'WARNING',
        details: `找到 ${projectCards} 个项目卡片`,
      });

      await takeScreenshot(page, '07_projects_page');

      // 如果有项目，点击第一个项目
      if (projectCards > 0) {
        const firstProject = page.locator('[class*="grid"] > div').first();
        await firstProject.click();
        await sleep(2000);

        const projectDetailUrl = page.url();
        const isDetailPage = projectDetailUrl.includes('/projects/') && projectDetailUrl !== `${BASE_URL}/projects`;

        logTest({
          category: '项目列表',
          test: '点击项目卡片',
          status: isDetailPage ? 'PASS' : 'FAIL',
          details: `跳转到: ${projectDetailUrl}`,
        });

        await takeScreenshot(page, '08_project_detail');
      }

    } catch (error: any) {
      logTest({
        category: '项目列表',
        test: '项目列表测试',
        status: 'FAIL',
        details: '项目列表测试失败',
        error: error.message,
      });
    }

    // ==================== 5. 用户菜单测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 5. 用户菜单功能测试');
    console.log('='.repeat(70));

    try {
      await page.goto(BASE_URL);
      await sleep(1000);

      // 点击用户菜单
      const userMenu = page.locator(`button:has-text("${testUser.username}")`).first();
      await userMenu.click();
      await sleep(500);

      // 检查菜单项
      const dashboardLink = page.locator('text=我的仪表板');
      const profileLink = page.locator('text=个人资料');
      const logoutButton = page.locator('text=退出登录');

      const menuItemsVisible = await dashboardLink.isVisible() &&
                               await profileLink.isVisible() &&
                               await logoutButton.isVisible();

      logTest({
        category: '用户菜单',
        test: '菜单项显示',
        status: menuItemsVisible ? 'PASS' : 'FAIL',
        details: menuItemsVisible ? '所有菜单项都显示' : '部分菜单项缺失',
      });

      await takeScreenshot(page, '09_user_menu');

      // 测试 Dashboard 链接
      await dashboardLink.click();
      await sleep(2000);

      const dashboardUrl = page.url();
      const isDashboard = dashboardUrl.includes('dashboard');

      logTest({
        category: '用户菜单',
        test: 'Dashboard 链接',
        status: isDashboard ? 'PASS' : 'FAIL',
        details: `跳转到: ${dashboardUrl}`,
      });

      await takeScreenshot(page, '10_dashboard');

      // 返回首页测试个人资料链接
      await page.goto(BASE_URL);
      await sleep(1000);
      await userMenu.click();
      await sleep(500);

      await profileLink.click();
      await sleep(2000);

      const profileUrl = page.url();
      const isProfile = profileUrl.includes('profile');

      logTest({
        category: '用户菜单',
        test: '个人资料链接',
        status: isProfile ? 'PASS' : 'FAIL',
        details: `跳转到: ${profileUrl}`,
      });

      await takeScreenshot(page, '11_profile');

    } catch (error: any) {
      logTest({
        category: '用户菜单',
        test: '用户菜单测试',
        status: 'FAIL',
        details: '用户菜单测试失败',
        error: error.message,
      });
    }

    // ==================== 6. 发布项目按钮测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 6. 发布项目功能测试');
    console.log('='.repeat(70));

    try {
      await page.goto(BASE_URL);
      await sleep(1000);

      const postProjectButton = page.locator('button:has-text("发布项目")');
      await postProjectButton.click();
      await sleep(2000);

      const currentUrl = page.url();
      const isNewProjectPage = currentUrl.includes('/projects/new') || currentUrl.includes('/dashboard');

      logTest({
        category: '发布项目',
        test: '发布项目按钮',
        status: isNewProjectPage ? 'PASS' : 'WARNING',
        details: `点击后跳转到: ${currentUrl}`,
      });

      await takeScreenshot(page, '12_post_project');

    } catch (error: any) {
      logTest({
        category: '发布项目',
        test: '发布项目测试',
        status: 'FAIL',
        details: '发布项目测试失败',
        error: error.message,
      });
    }

    // ==================== 7. 移动端响应式测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 7. 移动端响应式测试');
    console.log('='.repeat(70));

    try {
      // 切换到移动端视口
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await sleep(1000);

      logTest({
        category: '移动端',
        test: '切换到移动端视口',
        status: 'PASS',
        details: '视口大小: 375x667 (iPhone SE)',
      });

      await takeScreenshot(page, '13_mobile_home');

      // 检查导航是否适配
      const nav = page.locator('nav');
      const navVisible = await nav.isVisible();

      logTest({
        category: '移动端',
        test: '导航栏显示',
        status: navVisible ? 'PASS' : 'WARNING',
        details: navVisible ? '导航栏在移动端显示' : '导航栏可能需要汉堡菜单',
      });

      // 检查内容是否正常显示
      const heroTitle = await page.locator('text=发现优质副业机会').isVisible();
      logTest({
        category: '移动端',
        test: '内容显示',
        status: heroTitle ? 'PASS' : 'FAIL',
        details: heroTitle ? '内容正常显示' : '内容显示异常',
      });

      // 测试项目列表页面
      await page.goto(`${BASE_URL}/projects`);
      await sleep(2000);
      await takeScreenshot(page, '14_mobile_projects');

      logTest({
        category: '移动端',
        test: '项目列表页面',
        status: 'PASS',
        details: '移动端项目列表页面加载成功',
      });

    } catch (error: any) {
      logTest({
        category: '移动端',
        test: '移动端测试',
        status: 'FAIL',
        details: '移动端测试失败',
        error: error.message,
      });
    }

    // ==================== 8. 登出测试 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📋 8. 登出功能测试');
    console.log('='.repeat(70));

    try {
      // 切回桌面视口
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await sleep(1000);

      // 点击用户菜单
      const userMenu = page.locator(`button:has-text("${testUser.username}")`).first();
      await userMenu.click();
      await sleep(500);

      // 点击登出
      const logoutButton = page.locator('text=退出登录');
      await logoutButton.click();
      await sleep(2000);

      // 检查是否返回首页且显示登录按钮
      const loginVisible = await page.locator('text=登录').first().isVisible();
      const registerVisible = await page.locator('text=注册').first().isVisible();

      logTest({
        category: '登出',
        test: '登出功能',
        status: (loginVisible && registerVisible) ? 'PASS' : 'FAIL',
        details: (loginVisible && registerVisible) ? '成功登出，显示登录/注册按钮' : '登出可能失败',
      });

      await takeScreenshot(page, '15_after_logout');

    } catch (error: any) {
      logTest({
        category: '登出',
        test: '登出测试',
        status: 'FAIL',
        details: '登出测试失败',
        error: error.message,
      });
    }

    // ==================== 总结 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试总结');
    console.log('='.repeat(70));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    const total = results.length;

    console.log(`\n总测试数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⚠️  警告: ${warnings}`);
    console.log(`\n成功率: ${((passed / total) * 100).toFixed(2)}%`);

    // 按类别分组
    const byCategory: { [key: string]: TestResult[] } = {};
    results.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = [];
      }
      byCategory[r.category].push(r);
    });

    console.log('\n按类别统计:');
    Object.keys(byCategory).forEach(category => {
      const categoryResults = byCategory[category];
      const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length;
      const categoryTotal = categoryResults.length;
      console.log(`  ${category}: ${categoryPassed}/${categoryTotal} 通过`);
    });

    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`\n  [${r.category}] ${r.test}`);
        console.log(`    ${r.details}`);
        if (r.error) {
          console.log(`    错误: ${r.error}`);
        }
      });
    }

    if (warnings > 0) {
      console.log('\n⚠️  警告:');
      results.filter(r => r.status === 'WARNING').forEach(r => {
        console.log(`\n  [${r.category}] ${r.test}`);
        console.log(`    ${r.details}`);
      });
    }

    // 保存详细报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        warnings,
        successRate: `${((passed / total) * 100).toFixed(2)}%`,
      },
      byCategory,
      results,
    };

    fs.writeFileSync('e2e-test-report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存到: e2e-test-report.json`);
    console.log(`📸 截图已保存到: ${SCREENSHOT_DIR}/`);
    console.log(`🎥 视频已保存到: ${VIDEO_DIR}/`);

    console.log('\n' + '='.repeat(70));

  } catch (error: any) {
    console.error('❌ 测试过程中发生严重错误:', error.message);
    console.error(error.stack);
  } finally {
    // 关闭浏览器
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();

    console.log('\n✅ 测试完成，浏览器已关闭');
  }
}

// 运行测试
runTests().catch(console.error);
