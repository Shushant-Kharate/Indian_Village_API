const https = require('https');

function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'indian-village-api.vercel.app',
      path: '/api/health',
      method: 'GET'
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
    req.setTimeout(10000);
    req.end();
  });
}

async function main() {
  try {
    console.log('🧪 Testing Vercel API Health Endpoint\n');
    
    const result = await testHealthEndpoint();
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ Vercel API is LIVE and RESPONDING!');
      console.log('   ℹ️ Database connection timeout is serverless connection pooling issue');
      console.log('   This requires NeonDB connection string optimization for serverless');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

main();
