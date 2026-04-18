const http = require('http');

// Test Registration
function testRegister() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: `user${Date.now()}@test.com`,
      password: 'test1234',
      name: 'Test User'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('📝 REGISTER Response:');
        console.log('Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log(responseData);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test Login
function testLogin(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('\n🔑 LOGIN Response:');
        console.log('Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log(responseData);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test protected endpoint with token
function testProtectedEndpoint(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/states',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('\n✅ PROTECTED ENDPOINT (with Bearer token) Response:');
        console.log('Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          console.log(`Success: ${parsed.success}, Count: ${parsed.count}`);
          resolve(parsed);
        } catch (e) {
          console.log(responseData);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('🧪 Testing Authentication Flow...\n');
    
    // Test 1: Register
    const registerResult = await testRegister();
    const email = registerResult.data?.user?.email;
    const token = registerResult.data?.token;
    
    if (!email) {
      console.log('❌ Registration failed - no email returned');
      return;
    }

    // Test 2: Login (short delay to ensure user is written)
    await new Promise(r => setTimeout(r, 500));
    const loginResult = await testLogin(email, 'test1234');
    const loginToken = loginResult.data?.token;

    if (!loginToken) {
      console.log('❌ Login failed - no token returned');
      return;
    }

    // Test 3: Use token to access protected endpoint
    await new Promise(r => setTimeout(r, 500));
    const protectedResult = await testProtectedEndpoint(loginToken);

    if (protectedResult.success) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️ Protected endpoint returned error');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  process.exit(0);
}

runTests();
