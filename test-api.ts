import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:3002';
const API_V1 = `${API_BASE_URL}/api/v1`;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let providerToken: string | null = null;
let testUserId: string | null = null;
let testProviderId: string | null = null;
let testProjectId: string | null = null;
let testLeadId: string | null = null;

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${result.method} ${result.endpoint} - ${result.status}${result.statusCode ? ` (${result.statusCode})` : ''}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.details) {
    console.log(`   Details: ${result.details}`);
  }
}

async function testEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  token?: string | null,
  expectedStatus?: number
) {
  try {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios({
      method,
      url: `${API_V1}${endpoint}`,
      data,
      headers,
      validateStatus: () => true, // Don't throw on any status
    });

    const isSuccess = expectedStatus ? response.status === expectedStatus : response.status < 400;

    logResult({
      endpoint,
      method,
      status: isSuccess ? 'PASS' : 'FAIL',
      statusCode: response.status,
      details: isSuccess ? 'Success' : `Expected ${expectedStatus || '<400'}, got ${response.status}`,
    });

    return response;
  } catch (error) {
    const axiosError = error as AxiosError;
    logResult({
      endpoint,
      method,
      status: 'FAIL',
      error: axiosError.message,
      details: axiosError.response?.data ? JSON.stringify(axiosError.response.data) : undefined,
    });
    return null;
  }
}

async function runTests() {
  console.log('🚀 开始测试 API (localhost:3002)\n');
  console.log('='.repeat(60));

  // 1. Health Check
  console.log('\n📋 1. Health Check');
  console.log('-'.repeat(60));
  const healthResponse = await axios.get(`${API_BASE_URL}/health`, { validateStatus: () => true });
  logResult({
    endpoint: '/health',
    method: 'GET',
    status: healthResponse.status === 200 ? 'PASS' : 'FAIL',
    statusCode: healthResponse.status,
  });

  // 2. Auth - Register USER
  console.log('\n📋 2. 认证测试 - 注册用户');
  console.log('-'.repeat(60));
  const timestamp = Date.now();
  const registerUserData = {
    email: `testuser${timestamp}@example.com`,
    password: 'password123',
    username: `testuser${timestamp}`,
    displayName: 'Test User',
    role: 'USER',
  };

  const registerUserResponse = await testEndpoint('POST', '/auth/register', registerUserData, null, 201);
  if (registerUserResponse?.data?.data?.token) {
    authToken = registerUserResponse.data.data.token;
    testUserId = registerUserResponse.data.data.user.id;
  }

  // 3. Auth - Register PROVIDER (without invitation code - should fail)
  console.log('\n📋 3. 认证测试 - 注册 Provider（无邀请码，应该失败）');
  console.log('-'.repeat(60));
  const registerProviderNoCodeData = {
    email: `provider${timestamp}@example.com`,
    password: 'password123',
    username: `provider${timestamp}`,
    displayName: 'Test Provider',
    role: 'PROVIDER',
  };

  await testEndpoint('POST', '/auth/register', registerProviderNoCodeData, null, 400);

  // 4. Auth - Login
  console.log('\n📋 4. 认证测试 - 登录');
  console.log('-'.repeat(60));
  const loginResponse = await testEndpoint('POST', '/auth/login', {
    email: registerUserData.email,
    password: registerUserData.password,
  }, null, 200);

  // 5. Auth - Get current user
  console.log('\n📋 5. 认证测试 - 获取当前用户信息');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/auth/me', null, authToken, 200);

  // 6. Auth - Get current user without token (should fail)
  console.log('\n📋 6. 认证测试 - 未授权访问（应该失败）');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/auth/me', null, null, 401);

  // 7. Projects - List projects (public)
  console.log('\n📋 7. 项目测试 - 列出所有项目');
  console.log('-'.repeat(60));
  const projectsResponse = await testEndpoint('GET', '/projects', null, null, 200);

  // 8. Projects - Get project details (if any exist)
  if (projectsResponse?.data?.data?.length > 0) {
    console.log('\n📋 8. 项目测试 - 获取项目详情');
    console.log('-'.repeat(60));
    const firstProjectId = projectsResponse.data.data[0].id;
    await testEndpoint('GET', `/projects/${firstProjectId}`, null, null, 200);
    testProjectId = firstProjectId;
  } else {
    console.log('\n📋 8. 项目测试 - 获取项目详情（跳过，无项目）');
    logResult({
      endpoint: '/projects/:id',
      method: 'GET',
      status: 'SKIP',
      details: 'No projects available',
    });
  }

  // 9. Projects - Create project as USER (should fail)
  console.log('\n📋 9. 项目测试 - 用户创建项目（应该失败）');
  console.log('-'.repeat(60));
  await testEndpoint('POST', '/projects', {
    title: 'Test Project',
    description: 'Test Description',
    type: 'FULL_TIME',
    revenueTier: 'TIER_1',
  }, authToken, 403);

  // 10. Leads - Submit lead (if project exists)
  if (testProjectId) {
    console.log('\n📋 10. Lead 测试 - 提交 Lead');
    console.log('-'.repeat(60));
    const leadResponse = await testEndpoint('POST', `/projects/${testProjectId}/leads`, {
      coverLetter: 'I am interested in this project',
      expectedRate: '$50/hour',
      availability: 'Immediately',
    }, authToken);

    if (leadResponse?.data?.data?.id) {
      testLeadId = leadResponse.data.data.id;
    }
  } else {
    console.log('\n📋 10. Lead 测试 - 提交 Lead（跳过，无项目）');
    logResult({
      endpoint: '/projects/:projectId/leads',
      method: 'POST',
      status: 'SKIP',
      details: 'No projects available',
    });
  }

  // 11. Leads - Get my leads
  console.log('\n📋 11. Lead 测试 - 获取我的 Leads');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/users/me/leads', null, authToken, 200);

  // 12. Showcase - Get homepage data
  console.log('\n📋 12. Showcase 测试 - 获取首页数据');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/showcase/homepage', null, null, 200);

  // 13. Showcase - Get featured projects
  console.log('\n📋 13. Showcase 测试 - 获取热门项目');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/showcase/featured', null, null, 200);

  // 14. Showcase - Get policies
  console.log('\n📋 14. Showcase 测试 - 获取政策信息');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/showcase/policies', null, null, 200);

  // 15. Admin - Access admin stats as USER (should fail)
  console.log('\n📋 15. Admin 测试 - 用户访问管理统计（应该失败）');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/admin/stats', null, authToken, 403);

  // 16. Admin - Get pending projects as USER (should fail)
  console.log('\n📋 16. Admin 测试 - 用户访问待审核项目（应该失败）');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/admin/projects/pending', null, authToken, 403);

  // 17. Invitation - Validate invitation code (invalid code)
  console.log('\n📋 17. 邀请码测试 - 验证无效邀请码');
  console.log('-'.repeat(60));
  await testEndpoint('POST', '/auth/invitation/validate', {
    code: 'INVALID123',
  }, null, 404);

  // 18. Test invalid endpoints
  console.log('\n📋 18. 错误处理 - 访问不存在的端点');
  console.log('-'.repeat(60));
  const notFoundResponse = await axios.get(`${API_V1}/invalid-endpoint`, { validateStatus: () => true });
  logResult({
    endpoint: '/invalid-endpoint',
    method: 'GET',
    status: notFoundResponse.status === 404 ? 'PASS' : 'FAIL',
    statusCode: notFoundResponse.status,
  });

  // 19. Test validation errors
  console.log('\n📋 19. 验证测试 - 无效的注册数据');
  console.log('-'.repeat(60));
  await testEndpoint('POST', '/auth/register', {
    email: 'invalid-email',
    password: '123', // Too short
    username: 'ab', // Too short
  }, null, 400);

  // 20. Projects - Search and filter
  console.log('\n📋 20. 项目测试 - 搜索和过滤');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/projects?type=FULL_TIME&revenueTier=TIER_1', null, null, 200);

  // 21. Showcase - Get all projects with filters
  console.log('\n📋 21. Showcase 测试 - 获取所有项目（带过滤）');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/showcase/all?category=小红书', null, null, 200);

  // 22. Showcase - Get categories
  console.log('\n📋 22. Showcase 测试 - 获取分类统计');
  console.log('-'.repeat(60));
  await testEndpoint('GET', '/showcase/categories', null, null, 200);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`\n总测试数: ${total}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⏭️  跳过: ${skipped}`);
  console.log(`\n成功率: ${((passed / (total - skipped)) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.error || r.details}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

// Run tests
runTests().catch(console.error);
