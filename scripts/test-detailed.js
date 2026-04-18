const http = require('http');

// Test 1: /api/states without auth (should fail with auth error)
console.log('Testing /api/states without auth...');
const options1 = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/states',
  method: 'GET'
};

const req1 = http.request(options1, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    console.log('\n---\n');
    
    // Test 2: /auth/register (with body)
    console.log('Testing /auth/register with POST...');
    const body = JSON.stringify({
      email: 'test@example.com',
      password: 'test1234',
      name: 'Test User'
    });
    
    const options2 = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };
    
    const req2 = http.request(options2, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        process.exit(0);
      });
    });
    
    req2.on('error', (e) => {
      console.error('Error:', e.message);
      process.exit(1);
    });
    
    req2.write(body);
    req2.end();
  });
});

req1.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req1.end();
