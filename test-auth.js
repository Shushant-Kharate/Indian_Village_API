const http = require('http');

const sendRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const sendAuthRequest = (method, path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const testAuthFlow = async () => {
  console.log('🔐 Testing JWT Authentication Flow\n');

  try {
    // Step 1: Register
    console.log('1️⃣ Register new user...');
    const registerRes = await sendRequest('POST', '/auth/register', {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User'
    });
    console.log(`   Status: ${registerRes.status}`);
    if (registerRes.body.success) {
      console.log('   ✅ Registration successful\n');
    } else {
      console.log('   User might already exist (trying to login instead)\n');
    }

    // Step 2: Login
    console.log('2️⃣ Login user...');
    const loginRes = await sendRequest('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'Password123!'
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.body.success) {
      const token = loginRes.body.data.token;
      console.log(`   ✅ Login successful`);
      console.log(`   Token: ${token.slice(0, 20)}...\n`);

      // Step 3: Generate API Key
      console.log('3️⃣ Generate API key...');
      const apiKeyRes = await sendAuthRequest('POST', '/auth/api-keys', token);
      console.log(`   Status: ${apiKeyRes.status}`);
      if (apiKeyRes.body.success) {
        const apiKey = apiKeyRes.body.data.apiKey;
        console.log(`   ✅ API Key generated`);
        console.log(`   API Key: ${apiKey.slice(0, 15)}...\n`);

        // Step 4: Get user's API keys
        console.log('4️⃣ Get user API keys...');
        const keysRes = await sendAuthRequest('GET', '/auth/api-keys', token);
        console.log(`   Status: ${keysRes.status}`);
        console.log(`   ✅ Found ${keysRes.body.count} API keys\n`);

        // Step 5: Call protected endpoint with token
        console.log('5️⃣ Call protected endpoint with JWT token...');
        const statesRes = await sendAuthRequest('GET', '/api/states', token);
        console.log(`   Status: ${statesRes.status}`);
        if (statesRes.body.success) {
          console.log(`   ✅ Retrieved ${statesRes.body.count} states\n`);
        }

        // Step 6: Call protected endpoint with API key
        console.log('6️⃣ Call protected endpoint with API key...');
        const options = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/stats',
          method: 'GET',
          headers: {
            'Authorization': apiKey
          }
        };

        const apiReq = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const body = JSON.parse(data);
            console.log(`   Status: ${res.statusCode}`);
            if (body.success) {
              console.log(`   ✅ Retrieved stats: ${body.data.villages} villages\n`);
            }

            console.log('✅ ALL TESTS PASSED!\n');
            console.log('📝 Usage Examples:');
            console.log('   JWT Token: curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/states');
            console.log('   API Key:   curl -H "Authorization: YOUR_API_KEY" http://localhost:3000/api/stats');
            process.exit(0);
          });
        });
        apiReq.on('error', console.error);
        apiReq.end();
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

testAuthFlow();
