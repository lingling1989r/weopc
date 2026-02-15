import axios from 'axios';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3003';

interface PageTest {
  name: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  issues: string[];
  httpStatus?: number;
}

const results: PageTest[] = [];

async function testPage(name: string, path: string, checks: (html: string) => string[]): Promise<void> {
  const url = `${BASE_URL}${path}`;
  const issues: string[] = [];

  try {
    console.log(`\n🔍 测试: ${name}`);
    console.log(`   URL: ${url}`);

    const response = await axios.get(url, {
      validateStatus: () => true,
      timeout: 10000,
    });

    const httpStatus = response.status;
    const html = response.data;

    // HTTP 状态检查
    if (httpStatus !== 200) {
      issues.push(`HTTP 状态码: ${httpStatus} (预期: 200)`);
    }

    // 执行自定义检查
    const customIssues = checks(html);
    issues.push(...customIssues);

    // 判断状态
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (httpStatus !== 200 || issues.some(i => i.includes('严重') || i.includes('缺失'))) {
      status = 'FAIL';
    } else if (issues.length > 0) {
      status = 'WARNING';
    }

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${icon} ${status}`);

    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

    results.push({ name, url, status, issues, httpStatus });

  } catch (error: any) {
    console.log(`   ❌ FAIL`);
    console.log(`   - 请求失败: ${error.message}`);
    results.push({
      name,
      url,
      status: 'FAIL',
      issues: [`请求失败: ${error.message}`],
    });
  }
}

function checkCommonElements(html: string): string[] {
  const issues: string[] = [];

  // 检查基本 HTML 结构
  if (!html.includes('<!DOCTYPE html>')) {
    issues.push('缺失 DOCTYPE 声明');
  }

  if (!html.includes('<html')) {
    issues.push('缺失 HTML 标签');
  }

  // 检查标题
  if (!html.includes('<title>')) {
    issues.push('缺失页面标题');
  }

  // 检查字符编码
  if (!html.includes('charset') && !html.includes('charSet')) {
    issues.push('缺失字符编码声明');
  }

  // 检查 viewport
  if (!html.includes('viewport')) {
    issues.push('缺失 viewport meta 标签（移动端适配）');
  }

  return issues;
}

async function runTests() {
  console.log('🚀 开始测试前端页面 (localhost:3003)\n');
  console.log('='.repeat(70));

  // 1. 首页
  await testPage('首页', '/', (html) => {
    const issues = checkCommonElements(html);

    if (!html.includes('WEOPC')) {
      issues.push('未找到品牌名称');
    }

    if (!html.includes('nav') && !html.includes('导航')) {
      issues.push('可能缺少导航栏');
    }

    if (!html.includes('登录') && !html.includes('login')) {
      issues.push('未找到登录链接');
    }

    if (!html.includes('注册') && !html.includes('register')) {
      issues.push('未找到注册链接');
    }

    if (!html.includes('项目') && !html.includes('project')) {
      issues.push('未找到项目相关内容');
    }

    // 检查是否有加载动画
    if (html.includes('animate-pulse')) {
      issues.push('页面显示加载动画（可能是正常的客户端渲染）');
    }

    return issues;
  });

  // 2. 登录页面
  await testPage('登录页面', '/login', (html) => {
    const issues = checkCommonElements(html);

    if (!html.includes('登录') && !html.includes('Login')) {
      issues.push('页面标题未包含"登录"');
    }

    if (!html.includes('email') && !html.includes('邮箱')) {
      issues.push('未找到邮箱输入相关内容');
    }

    if (!html.includes('password') && !html.includes('密码')) {
      issues.push('未找到密码输入相关内容');
    }

    return issues;
  });

  // 3. 注册页面
  await testPage('注册页面', '/register', (html) => {
    const issues = checkCommonElements(html);

    if (!html.includes('注册') && !html.includes('Register')) {
      issues.push('页面标题未包含"注册"');
    }

    if (!html.includes('username') && !html.includes('用户名')) {
      issues.push('未找到用户名输入相关内容');
    }

    return issues;
  });

  // 4. 项目列表页面
  await testPage('项目列表页面', '/projects', (html) => {
    const issues = checkCommonElements(html);

    if (!html.includes('项目') && !html.includes('Project')) {
      issues.push('页面未包含项目相关内容');
    }

    return issues;
  });

  // 5. Dashboard - Provider
  await testPage('Provider Dashboard', '/dashboard/provider', (html) => {
    const issues = checkCommonElements(html);

    // 这个页面可能需要登录，检查是否重定向
    if (html.includes('登录') || html.includes('login')) {
      issues.push('未登录时重定向到登录页（预期行为）');
    }

    return issues;
  });

  // 6. Dashboard - Admin
  await testPage('Admin Dashboard', '/dashboard/admin', (html) => {
    const issues = checkCommonElements(html);

    if (html.includes('登录') || html.includes('login')) {
      issues.push('未登录时重定向到登录页（预期行为）');
    }

    return issues;
  });

  // 7. 404 页面
  await testPage('404 页面', '/this-page-does-not-exist-12345', (html) => {
    const issues = checkCommonElements(html);

    if (!html.includes('404') && !html.includes('not found') && !html.includes('找不到')) {
      issues.push('404 页面未显示适当的错误信息');
    }

    return issues;
  });

  // 8. 检查静态资源
  console.log('\n🔍 检查静态资源加载');
  try {
    const cssResponse = await axios.head(`${BASE_URL}/_next/static/css/app/layout.css`, {
      validateStatus: () => true,
    });
    const icon = cssResponse.status === 200 ? '✅' : '❌';
    console.log(`   ${icon} CSS 文件: ${cssResponse.status}`);
  } catch (error) {
    console.log(`   ❌ CSS 文件加载失败`);
  }

  // 总结
  console.log('\n' + '='.repeat(70));
  console.log('📊 测试总结');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const total = results.length;

  console.log(`\n总测试页面数: ${total}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⚠️  警告: ${warnings}`);
  console.log(`\n成功率: ${((passed / total) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n❌ 失败的页面:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`\n  ${r.name} (${r.url})`);
      r.issues.forEach(issue => console.log(`    - ${issue}`));
    });
  }

  if (warnings > 0) {
    console.log('\n⚠️  有警告的页面:');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`\n  ${r.name} (${r.url})`);
      r.issues.forEach(issue => console.log(`    - ${issue}`));
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
    results,
  };

  fs.writeFileSync('frontend-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 详细报告已保存到: frontend-test-report.json');

  console.log('\n' + '='.repeat(70));
}

runTests().catch(console.error);
