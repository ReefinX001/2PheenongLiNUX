const axios = require('axios');

// Configuration
const BASE_URL = 'http://127.0.0.1:3000';
const BRANCH_CODE = '00000';
const AUTH_TOKEN = 'test_token_12345';

// Set up axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Test data
const MOCK_CART_ITEMS = [
  {
    productId: 'IPHONE15_128_BLACK',
    productName: 'iPhone 15 128GB Black',
    price: 32900,
    quantity: 1,
    imei: '123456789012345'
  }
];

const MOCK_CUSTOMER = {
  customerId: 'CUST001',
  name: 'สมชาย ใจดี',
  phone: '0812345678',
  email: 'test@example.com'
};

const VALID_CHECKOUT_PAYLOAD = {
  cartItems: MOCK_CART_ITEMS,
  totalAmount: 32900,
  paymentMethod: 'cash',
  customer: MOCK_CUSTOMER,
  staffName: 'พนักงานทดสอบ',
  staffId: 'STAFF001',
  branchCode: BRANCH_CODE,
  documentNumberFormat: 'receipt',
  taxType: 'none',
  vatRate: 0,
  discount: 0
};

// Set development mode for authentication
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

// Global variable to store document ID for later tests
let testDocumentId = null;

describe('🏪 Frontstore POS API Tests', () => {

  describe('📦 Stock Management', () => {
    test('should get stock data successfully', async () => {
      const response = await api.get(`/api/branch-stock/taxType?branch_code=${BRANCH_CODE}&verified=true&purchaseType=cash`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);

      console.log(`📋 Retrieved ${response.data.data.length} stock items`);
    });

    test('should handle invalid branch code gracefully', async () => {
      try {
        const response = await api.get('/api/branch-stock/taxType?branch_code=INVALID_BRANCH&verified=true&purchaseType=cash');

        // If request succeeds, should return empty data
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data).toEqual([]);

        console.log('✅ Invalid branch code handled gracefully (empty data)');
      } catch (error) {
        // If request fails, should be 404 or 400
        expect([400, 404]).toContain(error.response.status);
        console.log(`✅ Invalid branch code rejected with ${error.response.status}`);
      }
    });
  });

  describe('🛒 Checkout Process', () => {
    test('should complete checkout successfully', async () => {
      const response = await api.post('/api/taxinvoice/checkout', VALID_CHECKOUT_PAYLOAD);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');

      const checkoutData = response.data.data;
      expect(checkoutData).toBeDefined();

      // Store document ID for PDF test
      testDocumentId = checkoutData.documentId || checkoutData.id;

      if (checkoutData.documentNumber) {
        console.log(`📄 Document created: ${checkoutData.documentNumber}`);
      }
      if (testDocumentId) {
        console.log(`🆔 Document ID: ${testDocumentId}`);
      }
    });

    test('should reject checkout with empty cart', async () => {
      const emptyPayload = {
        ...VALID_CHECKOUT_PAYLOAD,
        cartItems: [],
        totalAmount: 0
      };

      await expect(api.post('/api/taxinvoice/checkout', emptyPayload))
        .rejects.toMatchObject({
          response: {
            status: 400
          }
        });

      console.log('✅ Empty cart correctly rejected');
    });

    test('should reject checkout with missing required fields', async () => {
      const invalidPayload = {
        cartItems: MOCK_CART_ITEMS,
        // Missing totalAmount, paymentMethod, etc.
      };

      await expect(api.post('/api/taxinvoice/checkout', invalidPayload))
        .rejects.toMatchObject({
          response: {
            status: expect.any(Number)
          }
        });

      console.log('✅ Invalid checkout data correctly rejected');
    });
  });

  describe('👥 Customer Management', () => {
    test('should search customers successfully', async () => {
      const searchQuery = '081'; // Partial phone search
      const response = await api.get(`/api/points/members/search?q=${encodeURIComponent(searchQuery)}`);

      expect(response.status).toBe(200);

      const customers = response.data.data || response.data;
      expect(Array.isArray(customers)).toBe(true);

      console.log(`👥 Found ${customers.length} customers matching "${searchQuery}"`);

      // If customers found, validate structure
      if (customers.length > 0) {
        const customer = customers[0];
        expect(customer).toHaveProperty('name');
        expect(customer).toHaveProperty('phone');
      }
    });

    test('should return empty result for non-existent customer', async () => {
      const searchQuery = '9999999999'; // Non-existent phone
      const response = await api.get(`/api/points/members/search?q=${encodeURIComponent(searchQuery)}`);

      expect(response.status).toBe(200);

      const customers = response.data.data || response.data;
      expect(Array.isArray(customers)).toBe(true);
      expect(customers).toHaveLength(0);

      console.log('✅ Non-existent customer search returned empty result');
    });
  });

  describe('🔐 Authentication', () => {
    test('should reject requests with invalid token', async () => {
      const invalidApi = axios.create({
        baseURL: BASE_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer completely_invalid_token_xyz'
        }
      });

      await expect(invalidApi.post('/api/taxinvoice/checkout', VALID_CHECKOUT_PAYLOAD))
        .rejects.toMatchObject({
          response: {
            status: expect.any(Number)
          }
        });

      console.log('✅ Invalid token correctly rejected');
    });
  });

  describe('📄 Receipt Generation', () => {
    test('should generate PDF receipt if document ID is available', async () => {
      // Skip if no document ID from checkout test
      if (!testDocumentId) {
        console.log('⏭️ Skipping PDF test - no document ID available');
        return;
      }

      const response = await api.get(`/api/pdf/a4-receipt/${testDocumentId}`, {
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('pdf');
      expect(response.data).toBeInstanceOf(ArrayBuffer);
      expect(response.data.byteLength).toBeGreaterThan(0);

      console.log(`📄 PDF generated successfully (${response.data.byteLength} bytes)`);
    });
  });

  describe('🚀 API Performance & Reliability', () => {
    test('should handle concurrent stock requests', async () => {
      const concurrentRequests = Array(5).fill().map(() =>
        api.get(`/api/branch-stock/taxType?branch_code=${BRANCH_CODE}&verified=true&purchaseType=cash`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success', true);
        console.log(`📊 Concurrent request ${index + 1}: ${response.data.data.length} items`);
      });

      console.log('✅ API handled concurrent requests successfully');
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await api.get(`/api/branch-stock/taxType?branch_code=${BRANCH_CODE}&verified=true&purchaseType=cash`);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds max

      console.log(`⏱️ API response time: ${responseTime}ms`);
    });
  });

});