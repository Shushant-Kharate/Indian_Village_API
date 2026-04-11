const http = require('http');

// Test: Generate API Key
function testGenerateApiKey(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/api-keys',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test: Use API Key to access protected endpoint
function testWithApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/states',
      method: 'GET',
      headers: {
        'Authorization': apiKey
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test: Access without auth (should fail)
function testWithoutAuth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/states',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main test
async function runComprehensiveTests() {
  try {
    console.log('🧪 Comprehensive Authentication Tests\n');
    
    // Get token from previous test
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidXNlcjE3NzU4OTQyMzY4NDZAdGVzdC5jb20iLCJpYXQiOjE3NzU4OTQyNDAsImV4cCI6MTc3NjQ5OTA0MH0.HY9hmXRQ1ZaqhqTyp9vs0pbqjTimvPTXbDULdhcaA4I';

    // Test 1: Access without auth
    console.log('1️⃣ Testing access WITHOUT authentication...');
    const noAuthResult = await testWithoutAuth();
    console.log(`   Status: ${noAuthResult.status}`);
    if (noAuthResult.status === 401) {
      console.log(`   ✅ Correctly blocked - Error: ${noAuthResult.data.error}\n`);
    } else {
      console.log(`   ❌ Should have been blocked!\n`);
    }

    // Test 2: Generate API Key
    console.log('2️⃣ Testing API key generation with JWT...');
    const apiKeyResult = await testGenerateApiKey(token);
    console.log(`   Response structure:`, JSON.stringify(apiKeyResult, null, 2));
    if (apiKeyResult.success && apiKeyResult.data?.apiKey) {
      const apiKey = typeof apiKeyResult.data.apiKey === 'string' 
        ? apiKeyResult.data.apiKey 
        : apiKeyResult.data.apiKey.api_key || apiKeyResult.data.apiKey;
      console.log(`   ✅ Generated: ${String(apiKey).substring(0, 10)}...`);
      console.log(`   Response: ${JSON.stringify(apiKeyResult.data, null, 2)}\n`);

      // Test 3: Use API Key
      console.log('3️⃣ Testing API key access to protected endpoint...');
      const apiKeyAccessResult = await testWithApiKey(apiKey);
      console.log(`   Status: ${apiKeyAccessResult.status}`);
      if (apiKeyAccessResult.status === 200 && apiKeyAccessResult.data.success) {
        console.log(`   ✅ Successfully accessed /api/states with API key`);
        console.log(`   Count: ${apiKeyAccessResult.data.count} states retrieved\n`);
      } else {
        console.log(`   ❌ Failed to access with API key\n`);
      }
    } else {
      console.log(`   ❌ Failed to generate API key\n`);
    }

    console.log('🎉 All comprehensive tests completed!');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  process.exit(0);
}

runComprehensiveTests();
