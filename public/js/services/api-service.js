/**
 * API Service Module - Centralized API handling
 * ระบบจัดการ API calls แบบรวมศูนย์
 */

class APIService {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('authToken') || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Update token when user logs in/out
  updateToken(token) {
    this.token = token;
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Generic request method with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);

      // Handle different response statuses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw new APIError(error.message, endpoint, error.status);
    }
  }

  // Handle different error responses
  async handleErrorResponse(response) {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 401:
        this.handleUnauthorized();
        throw new APIError('การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่', response.url, 401);
      case 403:
        throw new APIError('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้', response.url, 403);
      case 404:
        throw new APIError('ไม่พบข้อมูลที่ต้องการ', response.url, 404);
      case 422:
        throw new ValidationError('ข้อมูลไม่ถูกต้อง', errorData.errors || {});
      case 429:
        throw new APIError('ส่งคำขอเร็วเกินไป กรุณารอสักครู่', response.url, 429);
      case 500:
        throw new APIError('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', response.url, 500);
      default:
        throw new APIError(
          errorData.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
          response.url,
          response.status
        );
    }
  }

  // Handle unauthorized access
  handleUnauthorized() {
    this.updateToken(null);
    // Redirect to login page or show login modal
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return await this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = {}) {
    return await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return await this.request(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch(endpoint, data = {}) {
    return await this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Upload file
  async uploadFile(endpoint, formData) {
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type']; // Let browser set it for FormData

    return await this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers
    });
  }
}

// Specific API methods for Deposit Receipt system
class DepositReceiptAPI extends APIService {
  constructor() {
    super();
  }

  // Get all branches
  async getBranches() {
    return await this.get('/branch');
  }

  // Get deposit receipts for a branch
  async getDepositReceipts(branchCode, limit = 50) {
    return await this.get('/deposit-receipts', { branchCode, limit });
  }

  // Create new deposit receipt
  async createDepositReceipt(data) {
    return await this.post('/deposit-receipts', data);
  }

  // Get single deposit receipt
  async getDepositReceipt(receiptId) {
    return await this.get(`/deposit-receipts/${receiptId}`);
  }

  // Update deposit receipt
  async updateDepositReceipt(receiptId, data) {
    return await this.put(`/deposit-receipts/${receiptId}`, data);
  }

  // Delete deposit receipt
  async deleteDepositReceipt(receiptId) {
    return await this.delete(`/deposit-receipts/${receiptId}`);
  }

  // Get users/salespersons for a branch
  async getBranchUsers(branchCode) {
    return await this.get('/users', { branch: branchCode });
  }

  // Get branch stock
  async getBranchStock(branchCode, includeUnverified = false) {
    return await this.get('/branch-stock', {
      branch_code: branchCode,
      include_unverified: includeUnverified ? 1 : 0
    });
  }

  // Get all products
  async getAllProducts() {
    return await this.get('/product-image');
  }

  // Search products in branch stock
  async searchBranchProducts(branchCode) {
    return await this.get('/branch-stock', { branch_code: branchCode });
  }
}

// Custom Error Classes
class APIError extends Error {
  constructor(message, endpoint, status) {
    super(message);
    this.name = 'APIError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

class ValidationError extends APIError {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIService, DepositReceiptAPI, APIError, ValidationError };
}

// Make available globally for HTML usage
if (typeof window !== 'undefined') {
  window.APIService = APIService;
  window.DepositReceiptAPI = DepositReceiptAPI;
  window.APIError = APIError;
  window.ValidationError = ValidationError;
}