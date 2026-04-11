const http = require('http');

const tests = [
  { endpoint: '/api/health', name: '🏥 Health Check' },
  { endpoint: '/api/stats', name: '📊 Statistics' },
  { endpoint: '/api/states', name: '🗺️ All States' },
  { endpoint: '/api/districts/2', name: '🏙️ Districts (State Code 2)' },
  { endpoint: '/api/subdistricts/23', name: '📍 Subdistricts' },
  { endpoint: '/api/villages/search/Mumbai', name: '🔍 Search Villages' },
];

let completed = 0;

tests.forEach(test => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: test.endpoint,
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const isSuccess = !parsed.error || parsed.error === '';
        const status = isSuccess ? '✅' : '❌';
        console.log(`${status} ${test.name}`);
        if (parsed.states || parsed.districts || parsed.subdistricts || parsed.villages) {
          console.log(`   → States: ${parsed.states}, Districts: ${parsed.districts}, Subdistricts: ${parsed.subdistricts}, Villages: ${parsed.villages}`);
        }
        if (Array.isArray(parsed)) {
          console.log(`   → Returned ${parsed.length} records`);
        }
      } catch (e) {
        console.log(`❌ ${test.name} - Parse error`);
      }
      completed++;
      if (completed === tests.length) {
        console.log('\n✅ All tests completed!');
        process.exit(0);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`❌ ${test.name} - ${e.message}`);
    completed++;
    if (completed === tests.length) {
      console.log('\n❌ Tests failed - Is the API running?');
      process.exit(1);
    }
  });

  req.end();
});

console.log('🧪 Running API Tests...\n');
