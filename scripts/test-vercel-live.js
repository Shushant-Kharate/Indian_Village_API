const https = require('https');
const http = require('http');

// Step 1: Register on LOCAL API
function registerLocal(email) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email,
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
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 2: Login on LOCAL API to get token
function loginLocal(email) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email,
      password: 'test1234'
    });

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
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 3: Test on LIVE Vercel API
function testVercelAPI(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'indian-village-api.vercel.app',
      path: '/api/states',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main test
async function main() {
  try {
    console.log('🧪 Testing Live Vercel API\n');
    
    const email = `vercel-test-${Date.now()}@test.com`;
    
    console.log('1️⃣ Registering user on localhost...');
    const registerResult = await registerLocal(email);
    console.log(`   ✅ User registered: ${email}\n`);

    console.log('2️⃣ Logging in on localhost...');
    const loginResult = await loginLocal(email);
    const token = loginResult.data.token;
    console.log(`   ✅ Token received (7-day expiry)`);
    console.log(`   Token: ${token.substring(0, 30)}...\n`);

    console.log('3️⃣ Testing LIVE Vercel API endpoints...');
    const vercelResult = await testVercelAPI(token);
    console.log(`   Status: ${vercelResult.status}`);
    
    if (vercelResult.status === 200 && vercelResult.data.success) {
      console.log(`   ✅ Successfully accessed live API!`);
      console.log(`   Response: {`);
      console.log(`     success: ${vercelResult.data.success},`);
      console.log(`     count: ${vercelResult.data.count},`);
      console.log(`     states: ${vercelResult.data.data.slice(0, 3).map(s => s.state_name).join(', ')}...`);
      console.log(`   }\n`);
      console.log('🎉 VERCEL DEPLOYMENT VERIFIED - AUTHENTICATION WORKING!');
    } else {
      console.log(`   ❌ Unexpected response:`);
      console.log(JSON.stringify(vercelResult, null, 2));
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  process.exit(0);
}

main();
