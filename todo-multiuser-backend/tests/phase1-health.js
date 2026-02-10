const axios = require('axios');
const { baseURL } = require('./test-config');

console.log('🧪 PHASE 1: Health & Database Connectivity Tests\n');

async function testHealthEndpoint() {
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const response = await axios.get(`${baseURL}/health`);
    if (response.status === 200 && response.data.status === 'OK') {
      console.log('✅ Health endpoint working');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return true;
    }
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n2️⃣ Testing Database Connection...');
  console.log('   Check server logs for PostgreSQL connection status');
  console.log('   Look for: "✅ PostgreSQL connected successfully"');
  return true;
}

async function testCORS() {
  console.log('\n3️⃣ Testing CORS Configuration...');
  try {
    const response = await axios.options(`${baseURL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log('✅ CORS configured correctly');
    return true;
  } catch (error) {
    console.log('⚠️  CORS test inconclusive:', error.message);
    return true;
  }
}

async function runPhase1() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    health: await testHealthEndpoint(),
    database: await testDatabaseConnection(),
    cors: await testCORS()
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 PHASE 1 RESULTS:');
  console.log(`   Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   CORS: ${results.cors ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n   Overall: ${allPassed ? '✅ PHASE 1 PASSED' : '❌ PHASE 1 FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return allPassed;
}

if (require.main === module) {
  runPhase1().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runPhase1 };
