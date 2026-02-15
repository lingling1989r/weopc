import { chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = './screenshots';

interface TestResult {
  page: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  issues: string[];
  screenshot?: string;
}

const results: TestResult[] = [];

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`\n${icon} ${result.page} (${result.url})`);
  if (result.issues.length > 0) {
    result.issues.forEach(issue => console.log(`   - ${issue}`));
  }
  if (result.screenshot) {
    console.log(`   📸 Screenshot: ${result.screenshot}`);
  }
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

async function checkPageErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  // 检查控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  // 检查页面错误
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  return errors;
}

async function testPage(
  page: Page,
  pageName: string,
  url: string,
  checks: (page: Page) => Promise<string[]>
): Promise<void> {
  const issues: string[] = [];

  try {
    console.log(`\n🔍 测试页面: ${pageName}`);
    console.log(`   URL: ${url}`);

    // 导航到页面
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    if (!response || response.status() !== 200) {
      issues.push(`HTTP 状态码: ${response?.status() || 'unknown'}`);
    }

    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');

    // 执行自定义检查
    const customIssues = await checks(page);
    issues.push(...customIssues);

    // 检查是否有明显的错误信息
    const errorElements = await page.locator('text=/error|错误|失败/i').count();
    if (errorElements > 0) {
      const errorTexts = await page.locator('text=/error|错误|失败/i').allTextContents();
      errorTexts.forEach(text => {
        if (text.length < 100) { // 避免太长的文本
          issues.push(`发现错误信息: ${text}`);
        }
      });
    }

    // 截图
    const screenshot = await takeScreenshot(page, pageName);

    // 判断状态
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (issues.some(i => i.includes('HTTP 状态码') || i.includes('Page Error'))) {
      status = 'FAIL';
    } else if (issues.length > 0) {
      status = 'WARNING';
    }

    logResult({
      page: pageName,
      url,
      status,
      issues,
      screenshot,
    });

  } catch (error: any) {
    logResult({
      page: pageName,
      url,
      status: 'FAIL',
      issues: [`测试失败: ${error.message}`],
    });
  }
}

async function runTests() {
  console.log('🚀 开始测试前端页面 (localhost:3003)\n');
  console.log('='.repeat(60));

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // 启动浏览器
    console.log('\n📱 启动浏览器...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    page = await context.newPage();

    // 设置错误监听
    const pageErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Console Error: ${msg.text()}`);
      }
    });
    page.on('pageerror', error => {
      pageErrors.push(`Page Error: ${error.message}`);
    });

    // 1. 测试首页
    await testPage(page, '首页', BASE_URL, async (page) => {
      const issues: string[] = [];

      // 检查标题
      const title = await page.title();
      if (!title || title.includes('404')) {
        issues.push('页面标题异常');
      }

      // 检查是否有导航栏
      const nav = await page.locator('nav').count();
      if (nav === 0) {
        issues.push('未找到导航栏');
      }

      return issues;
    });

    // 2. 测试登录页面
    await testPage(page, '登录页面', `${BASE_URL}/login`, async (page) => {
      const issues: string[] = [];

      // 检查登录表单
      const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      const submitButton = await page.locator('button[type="submit"], button:has-text("登录")').count();

      if (emailInput === 0) issues.push('未找到邮箱输入框');
      if (passwordInput === 0) issues.push('未找到密码输入框');
      if (submitButton === 0) issues.push('未找到提交按钮');

      return issues;
    });

    // 3. 测试注册页面
    await testPage(page, '注册页面', `${BASE_URL}/register`, async (page) => {
      const issues: string[] = [];

      // 检查注册表单
      const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      const usernameInput = await page.locator('input[name="username"]').count();

      if (emailInput === 0) issues.push('未找到邮箱输入框');
      if (passwordInput === 0) issues.push('未找到密码输入框');
      if (usernameInput === 0) issues.push('未找到用户名输入框');

      return issues;
    });

    // 4. 测试项目列表页面
    await testPage(page, '项目列表页面', `${BASE_URL}/projects`, async (page) => {
      const issues: string[] = [];

      // 等待内容加载
      await page.waitForTimeout(2000);

      // 检查是否有项目列表或加载状态
      const projectCards = await page.locator('[class*="project"], [class*="card"]').count();
      const loadingIndicator = await page.locator('text=/loading|加载中/i').count();

      if (projectCards === 0 && loadingIndicator === 0) {
        issues.push('未找到项目列表或加载指示器');
      }

      return issues;
    });

    // 5. 测试广场页面（Showcase）
    await testPage(page, '广场页面', `${BASE_URL}/showcase`, async (page) => {
      const issues: string[] = [];

      await page.waitForTimeout(2000);

      // 检查是否有内容
      const content = await page.locator('main, [class*="content"]').count();
      if (content === 0) {
        issues.push('未找到主要内容区域');
      }

      return issues;
    });

    // 6. 测试个人中心页面（需要登录，预期会重定向）
    await testPage(page, '个人中心页面', `${BASE_URL}/profile`, async (page) => {
      const issues: string[] = [];

      // 检查是否重定向到登录页
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        issues.push('未登录时正确重定向到登录页（预期行为）');
      }

      return issues;
    });

    // 7. 测试 404 页面
    await testPage(page, '404 页面', `${BASE_URL}/this-page-does-not-exist`, async (page) => {
      const issues: string[] = [];

      // 检查是否显示 404 信息
      const notFoundText = await page.locator('text=/404|not found|页面不存在/i').count();
      if (notFoundText === 0) {
        issues.push('404 页面未显示适当的错误信息');
      }

      return issues;
    });

    // 8. 测试响应式设计（移动端）
    console.log('\n📱 测试移动端响应式设计');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await testPage(page, '首页（移动端）', BASE_URL, async (page) => {
      const issues: string[] = [];

      // 检查是否有汉堡菜单或移动端导航
      const mobileNav = await page.locator('[class*="mobile"], [class*="hamburger"], button[aria-label*="menu"]').count();

      return issues;
    });

    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    const total = results.length;

    console.log(`\n总测试页面数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⚠️  警告: ${warnings}`);

    if (failed > 0) {
      console.log('\n❌ 失败的页面:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`\n  ${r.page} (${r.url})`);
        r.issues.forEach(issue => console.log(`    - ${issue}`));
      });
    }

    if (warnings > 0) {
      console.log('\n⚠️  有警告的页面:');
      results.filter(r => r.status === 'WARNING').forEach(r => {
        console.log(`\n  ${r.page} (${r.url})`);
        r.issues.forEach(issue => console.log(`    - ${issue}`));
      });
    }

    console.log(`\n📸 所有截图已保存到: ${SCREENSHOT_DIR}/`);
    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// 运行测试
runTests().catch(console.error);
