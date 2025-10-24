// test/hr-endpoints.test.js
// Comprehensive test for HR Attendance System endpoints

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Assuming server exports the Express app

describe('HR Attendance System Endpoints', () => {
  let authToken;
  let testEmployeeId;
  let testBranchId;
  let testScheduleId;
  let testOvertimeId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URL || process.env.MONGODB_URL);
    }
  });

  afterAll(async () => {
    // Clean up test data and close connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Get authentication token for tests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: process.env.TEST_USERNAME || 'admin',
        password: process.env.TEST_PASSWORD || 'admin123'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.token;
    }
  });

  describe('Authentication', () => {
    test('Should authenticate with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: process.env.TEST_USERNAME || 'admin',
          password: process.env.TEST_PASSWORD || 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Zone/Branch Management', () => {
    test('Should get all active zones/branches', async () => {
      const response = await request(app)
        .get('/api/zone')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        testBranchId = response.body.data[0]._id;
      }
    });

    test('Should create a new branch', async () => {
      const branchData = {
        name: 'Test Branch HR',
        branch_code: 'TESTHR001',
        center: {
          latitude: 13.7563,
          longitude: 100.5018
        },
        radius: 100,
        address: 'Test Address Bangkok',
        description: 'Test branch for HR system'
      };

      const response = await request(app)
        .post('/api/zone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(branchData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(branchData.name);

      testBranchId = response.body.data._id;
    });
  });

  describe('Employee Management', () => {
    test('Should get employees by branch', async () => {
      if (!testBranchId) {
        const zones = await request(app)
          .get('/api/zone')
          .set('Authorization', `Bearer ${authToken}`);
        testBranchId = zones.body.data[0]?._id;
      }

      const response = await request(app)
        .get(`/api/users/by-checkinBranches/${testBranchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Work Schedule Management', () => {
    test('Should get work schedules', async () => {
      const response = await request(app)
        .get('/api/hr/work-schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should get work schedule templates', async () => {
      const response = await request(app)
        .get('/api/hr/work-schedules/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should create a work schedule template', async () => {
      const scheduleData = {
        name: 'Test Schedule Template',
        description: 'Test template for HR system',
        branchId: testBranchId,
        scheduleType: 'regular',
        isTemplate: true,
        templateName: 'Test Template',
        workDays: [
          {
            day: 'monday',
            startTime: '08:00',
            endTime: '17:00',
            breakTime: { start: '12:00', end: '13:00', duration: 60 }
          },
          {
            day: 'tuesday',
            startTime: '08:00',
            endTime: '17:00',
            breakTime: { start: '12:00', end: '13:00', duration: 60 }
          }
        ],
        startDate: new Date().toISOString(),
        overtimeAllowed: true,
        maxOvertimeHours: 4
      };

      const response = await request(app)
        .post('/api/hr/work-schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(scheduleData.name);

      testScheduleId = response.body.data._id;
    });

    test('Should handle user active schedule request with invalid user ID', async () => {
      const response = await request(app)
        .get('/api/hr/work-schedules/user/invalid-user-id/active')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('รหัสผู้ใช้ไม่ถูกต้อง');
    });

    test('Should handle user active schedule request with valid but non-existent user ID', async () => {
      const nonExistentUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
      const response = await request(app)
        .get(`/api/hr/work-schedules/user/${nonExistentUserId}/active`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ไม่พบตารางเวลาทำงาน');
      expect(response.body.data).toBeNull();
    });

    test('Should get user active schedule if exists', async () => {
      // First try to get a user from the system
      const usersResponse = await request(app)
        .get(`/api/users/by-checkinBranches/${testBranchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (usersResponse.body.data && usersResponse.body.data.length > 0) {
        const testUserId = usersResponse.body.data[0]._id;

        const response = await request(app)
          .get(`/api/hr/work-schedules/user/${testUserId}/active`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ branchId: testBranchId });

        // Should either return the schedule (200) or not found (404)
        expect([200, 404]).toContain(response.status);
        expect(response.body.success).toBeDefined();

        if (response.status === 200) {
          expect(response.body.data).toBeDefined();
          expect(response.body.data.status).toBe('active');
        } else {
          expect(response.body.data).toBeNull();
        }
      }
    });
  });

  describe('Attendance Management', () => {
    test('Should get accessible branches for user', async () => {
      const response = await request(app)
        .get('/api/hr/attendance/accessible-branches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should check current attendance session', async () => {
      const response = await request(app)
        .get('/api/hr/attendance/current-session')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should get today attendance', async () => {
      const response = await request(app)
        .get('/api/hr/attendance/today')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should get attendance statistics', async () => {
      const response = await request(app)
        .get('/api/hr/attendance/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'monthly',
          branchId: testBranchId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('monthly');
    });

    test('Should perform check-in', async () => {
      const checkinData = {
        branch: testBranchId,
        checkInType: 'normal',
        isOT: false,
        location: {
          latitude: 13.7563,
          longitude: 100.5018
        },
        note: 'Test check-in'
      };

      const response = await request(app)
        .post('/api/hr/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData);

      // May return 400 if already checked in, which is valid
      expect([200, 201, 400]).toContain(response.status);
      expect(response.body.success).toBeDefined();
    });
  });

  describe('Overtime Management', () => {
    test('Should get overtime requests', async () => {
      const response = await request(app)
        .get('/api/hr/overtime')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should get pending overtime approvals', async () => {
      const response = await request(app)
        .get('/api/hr/overtime/pending-approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: testBranchId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should create overtime request', async () => {
      const overtimeData = {
        date: new Date().toISOString().split('T')[0],
        startTime: '18:00',
        endTime: '20:00',
        reason: 'Test overtime request for project completion',
        branch: testBranchId,
        description: 'Working on urgent project requirements',
        overtimeType: 'regular',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/hr/overtime')
        .set('Authorization', `Bearer ${authToken}`)
        .send(overtimeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe(overtimeData.reason);

      testOvertimeId = response.body.data._id;
    });

    test('Should get my overtime history', async () => {
      const response = await request(app)
        .get('/api/hr/overtime/my-history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/hr/attendance');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should handle invalid branch ID', async () => {
      const response = await request(app)
        .get('/api/hr/attendance/today')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: 'invalid-branch-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should validate overtime request data', async () => {
      const invalidOvertimeData = {
        date: 'invalid-date',
        startTime: 'invalid-time',
        reason: '', // Empty reason should fail
        branch: testBranchId
      };

      const response = await request(app)
        .post('/api/hr/overtime')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOvertimeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    test('Should sanitize XSS attempts', async () => {
      const xssData = {
        name: '<script>alert("xss")</script>Test Branch',
        branch_code: 'XSS001',
        center: {
          latitude: 13.7563,
          longitude: 100.5018
        },
        radius: 100
      };

      const response = await request(app)
        .post('/api/zone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssData);

      if (response.status === 201) {
        expect(response.body.data.name).not.toContain('<script>');
      }
    });

    test('Should respect rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 35; i++) {
        requests.push(
          request(app)
            .get('/api/hr/attendance/statistics')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to run tests
if (require.main === module) {
  console.log('Running HR Endpoints Tests...');

  // Set test environment
  process.env.NODE_ENV = 'test';

  // Run the tests
  const { execSync } = require('child_process');
  try {
    execSync('npm test -- --testPathPattern=hr-endpoints.test.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  // Export for programmatic testing
  testEndpoints: async (authToken) => {
    const results = {
      zones: false,
      attendance: false,
      overtime: false,
      workSchedules: false
    };

    try {
      // Test zone endpoints
      const zonesResponse = await request(app)
        .get('/api/zone')
        .set('Authorization', `Bearer ${authToken}`);
      results.zones = zonesResponse.status === 200;

      // Test attendance endpoints
      const attendanceResponse = await request(app)
        .get('/api/hr/attendance/accessible-branches')
        .set('Authorization', `Bearer ${authToken}`);
      results.attendance = attendanceResponse.status === 200;

      // Test overtime endpoints
      const overtimeResponse = await request(app)
        .get('/api/hr/overtime')
        .set('Authorization', `Bearer ${authToken}`);
      results.overtime = overtimeResponse.status === 200;

      // Test work schedule endpoints
      const scheduleResponse = await request(app)
        .get('/api/hr/work-schedules')
        .set('Authorization', `Bearer ${authToken}`);
      results.workSchedules = scheduleResponse.status === 200;

    } catch (error) {
      console.error('Test error:', error.message);
    }

    return results;
  }
};