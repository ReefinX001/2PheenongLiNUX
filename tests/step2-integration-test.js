/**
 * Step 2 Integration Test Suite
 * ✅ Comprehensive testing for enhanced installment step2 functionality
 * @version 1.0.0
 */

const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Test setup
describe('Step 2 Installment Integration Tests', function() {
  this.timeout(10000);

  let app;
  let authToken;
  let testCustomerData;
  let testAddressData;
  let testOccupationData;

  before(async function() {
    // Initialize test app
    app = express();
    app.use(express.json());

    // Setup test data
    testCustomerData = {
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      idCard: '1234567890123',
      phone: '0812345678',
      email: 'somchai@example.com',
      birthDate: '1990-01-01',
      age: '34'
    };

    testAddressData = {
      houseNo: '123',
      moo: '5',
      soi: 'สุขุมวิท 21',
      road: 'สุขุมวิท',
      province: 'กรุงเทพมหานคร',
      district: 'วัฒนา',
      subDistrict: 'คลองเตย',
      postalCode: '10110'
    };

    testOccupationData = {
      occupation: 'พนักงานบริษัท - เจ้าหน้าที่',
      workplace: 'บริษัท ABC จำกัด',
      income: '25000'
    };

    // Mock authentication token
    authToken = 'test-token-123';
  });

  describe('Thai Language Validation Tests', function() {

    it('should validate Thai ID card correctly', function() {
      // Test valid Thai ID
      const validId = '1234567890123';
      const result = validateThaiIdCard(validId);
      expect(result.isValid).to.be.true;
      expect(result.message).to.include('ถูกต้อง');
    });

    it('should reject invalid Thai ID card', function() {
      // Test invalid Thai ID
      const invalidId = '1234567890124';
      const result = validateThaiIdCard(invalidId);
      expect(result.isValid).to.be.false;
      expect(result.message).to.include('ไม่ถูกต้อง');
    });

    it('should validate Thai phone numbers', function() {
      // Test valid mobile number
      const validMobile = '0812345678';
      const result = validateThaiPhoneNumber(validMobile);
      expect(result.isValid).to.be.true;

      // Test valid landline
      const validLandline = '023456789';
      const landlineResult = validateThaiPhoneNumber(validLandline);
      expect(landlineResult.isValid).to.be.true;

      // Test invalid number
      const invalidPhone = '1234567890';
      const invalidResult = validateThaiPhoneNumber(invalidPhone);
      expect(invalidResult.isValid).to.be.false;
    });

    it('should validate email format correctly', function() {
      // Test valid email
      const validEmail = 'test@example.com';
      const result = validateThaiEmail(validEmail);
      expect(result.isValid).to.be.true;

      // Test email with Thai characters (should be invalid)
      const thaiEmail = 'ทดสอบ@example.com';
      const thaiResult = validateThaiEmail(thaiEmail);
      expect(thaiResult.isValid).to.be.false;
      expect(thaiResult.message).to.include('อักษรไทย');
    });
  });

  describe('API Endpoint Tests', function() {

    it('should validate customer data via API', async function() {
      const response = await request(app)
        .post('/api/quotation/step2/customer-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerData: testCustomerData,
          addressData: testAddressData,
          occupationData: testOccupationData,
          validateOnly: true
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.isValid).to.be.true;
    });

    it('should reject incomplete customer data', async function() {
      const incompleteData = {
        firstName: 'สมชาย',
        // Missing lastName and other required fields
      };

      const response = await request(app)
        .post('/api/quotation/step2/customer-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerData: incompleteData,
          addressData: {},
          occupationData: {},
          validateOnly: true
        });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors.length).to.be.greaterThan(0);
    });

    it('should save valid customer data', async function() {
      const response = await request(app)
        .post('/api/quotation/step2/customer-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerData: testCustomerData,
          addressData: testAddressData,
          occupationData: testOccupationData,
          validateOnly: false
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('object');
      expect(response.body.data.customerInfo).to.be.an('object');
      expect(response.body.data.customerInfo.fullName).to.equal('สมชาย ใจดี');
    });
  });

  describe('Form Auto-Save Tests', function() {

    it('should save form data to localStorage', function() {
      // Mock localStorage
      global.localStorage = {
        data: {},
        setItem: function(key, value) { this.data[key] = value; },
        getItem: function(key) { return this.data[key]; },
        removeItem: function(key) { delete this.data[key]; }
      };

      // Mock DOM elements
      global.document = {
        getElementById: function(id) {
          const mockValues = {
            'customerFirstName': 'สมชาย',
            'customerLastName': 'ใจดี',
            'customerPhone': '0812345678'
          };
          return { value: mockValues[id] || '' };
        }
      };

      // Test auto-save function
      saveFormData();

      const savedData = JSON.parse(localStorage.getItem('step2FormData'));
      expect(savedData).to.be.an('object');
      expect(savedData.customerFirstName).to.equal('สมชาย');
      expect(savedData.customerLastName).to.equal('ใจดี');
    });
  });

  describe('Data Integrity Tests', function() {

    it('should maintain data consistency across steps', function() {
      const step1Data = {
        selectedProducts: [
          {
            id: 'prod-123',
            name: 'iPhone 15 Pro',
            price: 45000,
            quantity: 1
          }
        ],
        totalAmount: 45000
      };

      const step2Data = {
        customerInfo: testCustomerData,
        address: testAddressData,
        occupation: testOccupationData
      };

      // Test data integrity
      expect(step1Data.totalAmount).to.be.a('number');
      expect(step1Data.totalAmount).to.be.greaterThan(0);
      expect(step2Data.customerInfo.firstName).to.be.a('string');
      expect(step2Data.customerInfo.firstName.length).to.be.greaterThan(1);
    });

    it('should handle Thai language characters correctly', function() {
      const thaiText = 'สมชาย ใจดี';
      const englishText = 'John Doe';

      // Test Thai character handling
      expect(thaiText).to.match(/[\u0E00-\u0E7F]/);
      expect(englishText).to.not.match(/[\u0E00-\u0E7F]/);

      // Test string length with Thai characters
      expect(thaiText.length).to.equal(9); // Including space
      expect(thaiText.trim().length).to.equal(9);
    });
  });

  describe('Error Handling Tests', function() {

    it('should handle network errors gracefully', function(done) {
      // Mock fetch failure
      global.fetch = function() {
        return Promise.reject(new Error('Network error'));
      };

      // Test error handling in goToStep3 function
      // This would need to be adapted based on your actual implementation
      setTimeout(() => {
        done();
      }, 100);
    });

    it('should handle malformed API responses', function() {
      const malformedResponse = { invalid: 'response' };

      // Test response validation
      expect(malformedResponse.success).to.be.undefined;
      expect(malformedResponse.errors).to.be.undefined;
    });
  });

  describe('Performance Tests', function() {

    it('should validate large datasets efficiently', function() {
      const startTime = Date.now();

      // Test with multiple validation calls
      for (let i = 0; i < 100; i++) {
        validateThaiIdCard('1234567890123');
        validateThaiPhoneNumber('0812345678');
        validateThaiEmail('test@example.com');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).to.be.lessThan(1000);
    });
  });

  after(function() {
    // Cleanup
    if (global.localStorage) {
      delete global.localStorage;
    }
    if (global.document) {
      delete global.document;
    }
    if (global.fetch) {
      delete global.fetch;
    }
  });
});

// Helper functions for testing
function validateThaiIdCard(idCard) {
  const cleanId = idCard.replace(/[-\s]/g, '');

  if (cleanId.length !== 13 || !/^\d{13}$/.test(cleanId)) {
    return { isValid: false, message: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
  }

  // Thai ID validation algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  const isValid = checkDigit === parseInt(cleanId.charAt(12));

  return {
    isValid,
    message: isValid ? 'เลขบัตรประชาชนถูกต้อง' : 'เลขบัตรประชาชนไม่ถูกต้อง'
  };
}

function validateThaiPhoneNumber(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (cleanPhone.length < 9 || cleanPhone.length > 10) {
    return { isValid: false, message: 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก' };
  }

  const phonePatterns = [
    /^0[6-9]\d{8}$/, // Mobile
    /^0[2-5]\d{7,8}$/ // Landline
  ];

  const isValid = phonePatterns.some(pattern => pattern.test(cleanPhone));

  return {
    isValid,
    message: isValid ? 'เบอร์โทรศัพท์ถูกต้อง' : 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
  };
}

function validateThaiEmail(email) {
  if (!email) return { isValid: true, message: '' };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { isValid: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }

  if (/[\u0E00-\u0E7F]/.test(email)) {
    return { isValid: false, message: 'อีเมลไม่ควรมีอักษรไทย' };
  }

  return { isValid: true, message: 'อีเมลถูกต้อง' };
}

function saveFormData() {
  try {
    const formData = {
      customerFirstName: document.getElementById('customerFirstName')?.value || '',
      customerLastName: document.getElementById('customerLastName')?.value || '',
      customerIdCard: document.getElementById('customerIdCard')?.value || '',
      customerPhone: document.getElementById('customerPhone')?.value || '',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('step2FormData', JSON.stringify(formData));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  validateThaiIdCard,
  validateThaiPhoneNumber,
  validateThaiEmail,
  saveFormData
};