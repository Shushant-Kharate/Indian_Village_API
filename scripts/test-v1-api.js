// Test script for v1 API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testApiKey = '';

const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const test = async (name, fn) => {
  try {
    console.log(`\n✓ Testing: ${name}`);
    await fn();
  } catch (err) {
    console.log(`✗ Failed: ${name}`);
    console.error('  Error:', err.message);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  console.log('='.repeat(60));
  console.log('Indian Village API v1 - Comprehensive Test Suite');
  console.log('='.repeat(60));

  // 1. Test Registration
  await test('User Registration', async () => {
    const res = await makeRequest('POST', '/auth/register', {
      email: `test${Date.now()}@example.com`,
      password: 'Test@123456',
      name: 'Test User'
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.success, 'Response should have success: true');
    assert(res.body.data.user.email, 'Should return user email');
  });

  // 2. Test Login
  let testEmail = `test${Date.now()}@example.com`;
  let testPassword = 'Test@123456';
  
  await test('User Login', async () => {
    // First register a user
    await makeRequest('POST', '/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Test User'
    });

    // Then login
    const res = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: testPassword
    });
    
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.token, 'Should return auth token');
    authToken = res.body.data.token;
  });

  // 3. Test Generate API Key
  await test('Generate API Key', async () => {
    const res = await makeRequest('POST', '/auth/api-keys');
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.data.apiKey, 'Should return API key');
    testApiKey = res.body.data.apiKey;
  });

  // 4. Test Get States (v1 endpoint)
  await test('GET /api/v1/states - Get all states', async () => {
    const res = await makeRequest('GET', '/api/v1/states');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success, 'Response should have success: true');
    assert(Array.isArray(res.body.data), 'Data should be an array');
    assert(res.body.data.length > 0, 'Should return states');
    console.log(`  └─ Found ${res.body.data.length} states`);
  });

  // 5. Test Get Districts by State
  await test('GET /api/v1/states/:stateCode/districts', async () => {
    const res = await makeRequest('GET', '/api/v1/states/27/districts');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} districts`);
  });

  // 6. Test Get Subdistricts by District
  await test('GET /api/v1/districts/:districtCode/subdistricts', async () => {
    const res = await makeRequest('GET', '/api/v1/districts/518/subdistricts');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} subdistricts`);
  });

  // 7. Test Get Villages by Subdistrict
  await test('GET /api/v1/subdistricts/:subdistrictCode/villages', async () => {
    const res = await makeRequest('GET', '/api/v1/subdistricts/4925/villages');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} villages`);
  });

  // 8. Test Search/Autocomplete
  await test('GET /api/v1/search - Search villages', async () => {
    const res = await makeRequest('GET', '/api/v1/search?q=village&hierarchyLevel=village');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} matching villages`);
  });

  // 9. Test Search States
  await test('GET /api/v1/search - Search states', async () => {
    const res = await makeRequest('GET', '/api/v1/search?q=maharashtra&hierarchyLevel=state');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} matching states`);
  });

  // 10. Test Get Hierarchy
  await test('GET /api/v1/hierarchy - Get full hierarchy', async () => {
    const res = await makeRequest('GET', '/api/v1/hierarchy?stateCode=27');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
    console.log(`  └─ Found ${res.body.data.length} hierarchy entries`);
  });

  // 11. Test Statistics
  await test('GET /api/v1/stats - Get statistics', async () => {
    const res = await makeRequest('GET', '/api/v1/stats');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.states > 0, 'Should have states count');
    assert(res.body.data.villages > 0, 'Should have villages count');
    console.log(`  └─ Stats: ${res.body.data.states} states, ${res.body.data.districts} districts, ${res.body.data.subdistricts} subdistricts, ${res.body.data.villages} villages`);
  });

  // 12. Test Health Check (no auth required)
  await test('GET /api/v1/health - Health check', async () => {
    const res = await makeRequest('GET', '/api/v1/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.status, 'Should return status');
  });

  // 13. Test Response Format
  await test('Verify Response Format', async () => {
    const res = await makeRequest('GET', '/api/v1/states');
    assert(res.body.success !== undefined, 'Should have success field');
    assert(res.body.data !== undefined, 'Should have data field');
    assert(res.body.meta !== undefined, 'Should have meta field');
    assert(res.body.meta.responseTime !== undefined, 'Should have responseTime in meta');
    assert(res.body.meta.requestId !== undefined, 'Should have requestId in meta');
    console.log(`  └─ Response time: ${res.body.meta.responseTime}ms`);
  });

  // 14. Test Legacy Endpoints
  await test('GET /api/states - Legacy endpoint (backwards compatibility)', async () => {
    const res = await makeRequest('GET', '/api/states');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be an array');
  });

  console.log('\n' + '='.repeat(60));
  console.log('✓ All tests completed!');
  console.log('='.repeat(60) + '\n');
};

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
