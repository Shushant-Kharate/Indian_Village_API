// Debug test script to show actual responses
const http = require('http');

const makeRequest = (method, path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\nStatus: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        console.log(`Body:`, data);
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const main = async () => {
  console.log('Testing /api/v1/health endpoint...');
  await makeRequest('GET', '/api/v1/health');
  
  console.log('\n\nTesting /api/health endpoint (legacy)...');
  await makeRequest('GET', '/api/health');
  
  console.log('\n\nTesting /api/v1/states endpoint...');
  await makeRequest('GET', '/api/v1/states');
};

main().catch(console.error);
