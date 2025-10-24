const http = require('http');

// Function to make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (err) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('🔍 Testing service health...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3999,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Health check result:', response);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function testServiceInfo() {
  console.log('\n🔍 Testing service info...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3999,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Service info result:', response);
  } catch (error) {
    console.log('❌ Service info failed:', error.message);
  }
}

async function testCardRead() {
  console.log('\n🔍 Testing card reading...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3999,
      path: '/read-card',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Card reading result:', response);

    if (response.data && response.data.success) {
      console.log('\n📋 Card Data Summary:');
      console.log(`   - Citizen ID: ${response.data.data.Citizenid}`);
      console.log(`   - Name: ${response.data.data.TitleTh} ${response.data.data.FirstNameTh} ${response.data.data.LastNameTh}`);
      console.log(`   - English Name: ${response.data.data.TitleEn} ${response.data.data.FirstNameEn} ${response.data.data.LastNameEn}`);
      console.log(`   - Gender: ${response.data.data.Gender}`);
      console.log(`   - Religion: ${response.data.data.Religion}`);
      console.log(`   - Address: ${response.data.data.Address}`);
      console.log(`   - Issue Date: ${response.data.data.IssueDate}`);
      console.log(`   - Expire Date: ${response.data.data.ExpireDate}`);
    }
  } catch (error) {
    console.log('❌ Card reading failed:', error.message);
  }
}

async function testReaderStatus() {
  console.log('\n🔍 Testing reader status...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3999,
      path: '/api/status',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Reader status result:', response);
  } catch (error) {
    console.log('❌ Reader status failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting uTrust 2700 R Card Reader Tests...');
  console.log('===============================================\n');

  await testHealth();
  await testServiceInfo();
  await testReaderStatus();
  await testCardRead();

  console.log('\n===============================================');
  console.log('🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);