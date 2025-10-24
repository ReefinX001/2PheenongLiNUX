/**
 * Authentication Helper for Installment System
 * ช่วยจัดการ Authentication Token และการรีเฟรช
 */

class AuthHelper {
  constructor() {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * ตรวจสอบและรีเฟรช token หากจำเป็น
   * @returns {Promise<string>} Valid token
   */
  async validateAndRefreshToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('ไม่พบ Authentication Token กรุณาเข้าสู่ระบบใหม่');
      }

      // ถ้ากำลัง refresh อยู่ ให้รอให้เสร็จ
      if (this.isRefreshing && this.refreshPromise) {
        console.log('🔄 Waiting for ongoing token refresh...');
        return await this.refreshPromise;
      }

      // ทดสอบ token ด้วยการเรียก API ง่ายๆ
      const testResponse = await fetch('/api/users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // ถ้า token ยังใช้ได้ ให้ return
      if (testResponse.ok) {
        return token;
      }

      // ถ้า token หมดอายุ ลองรีเฟรช
      if (testResponse.status === 401) {
        console.warn('🔄 Token expired, attempting to refresh...');
        return await this.refreshToken();
      }

      // ถ้าเป็น 500 Server Error ให้ใช้ token เดิม (server อาจมีปัญหาชั่วคราว)
      if (testResponse.status === 500) {
        console.warn('⚠️ Server error during token validation, using existing token');
        return token;
      }

      // ถ้าเป็น error อื่นๆ ให้ return token เดิม
      console.warn('⚠️ Token validation returned:', testResponse.status);
      return token;

    } catch (error) {
      console.error('❌ Token validation error:', error);

      // ถ้าเป็น network error ให้ใช้ token เดิม
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.warn('⚠️ Network error, using existing token');
        return localStorage.getItem('authToken') || '';
      }

      throw error;
    }
  }

  /**
   * รีเฟรช token
   * @returns {Promise<string>} New token
   */
  async refreshToken() {
    // ป้องกันการ refresh หลายครั้งพร้อมกัน
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * ทำการรีเฟรช token จริง
   * @private
   */
  async _performRefresh() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const userId = localStorage.getItem('userId');

      if (!refreshToken && !userId) {
        throw new Error('ไม่พบข้อมูลสำหรับรีเฟรช token');
      }

      // ลองใช้ refresh token ก่อน
      if (refreshToken) {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('authToken', refreshData.token);
          if (refreshData.refreshToken) {
            localStorage.setItem('refreshToken', refreshData.refreshToken);
          }
          console.log('✅ Token refreshed successfully using refresh token');
          return refreshData.token;
        }
      }

      // ถ้า refresh token ไม่ได้ ลองใช้ silent refresh
      if (userId) {
        const silentResponse = await fetch('/api/auth/silent-refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });

        if (silentResponse.ok) {
          const silentData = await silentResponse.json();
          localStorage.setItem('authToken', silentData.token);
          console.log('✅ Token refreshed successfully using silent refresh');
          return silentData.token;
        }
      }

      // ถ้าทุกวิธีไม่ได้ ให้แจ้งเตือน
      throw new Error('ไม่สามารถรีเฟรช token ได้');

    } catch (error) {
      console.error('❌ Token refresh failed:', error);

      // แจ้งเตือนผู้ใช้แต่ไม่ redirect ทันที
      console.warn('⚠️ กรุณาเข้าสู่ระบบใหม่หากพบปัญหา');

      // ส่งคืน token เดิม เผื่อยังใช้ได้
      return localStorage.getItem('authToken') || '';
    }
  }

  /**
   * ตรวจสอบว่า token มีอยู่หรือไม่
   * @returns {boolean}
   */
  hasToken() {
    return !!localStorage.getItem('authToken');
  }

  /**
   * ล้าง token ทั้งหมด
   */
  clearTokens() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    console.log('🧹 All tokens cleared');
  }

  /**
   * สร้าง headers สำหรับ API request
   * @param {string} token - Authentication token
   * @returns {Object} Headers object
   */
  createAuthHeaders(token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * ทำ API request พร้อม token validation
   * @param {string} url - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async authenticatedFetch(url, options = {}) {
    const token = await this.validateAndRefreshToken();

    const authOptions = {
      ...options,
      headers: {
        ...this.createAuthHeaders(token),
        ...options.headers
      }
    };

    return fetch(url, authOptions);
  }

  /**
   * Extract user ID from JWT token
   * @returns {string|null} User ID from token or null if not found
   */
  getUserIdFromToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ No auth token found in localStorage');
        return null;
      }

      // Decode JWT token (simple base64 decode of payload)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT token format');
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      const userId = payload.userId || payload.id || payload.sub;

      if (!userId) {
        console.warn('⚠️ No userId found in JWT token payload');
        return null;
      }

      console.log('✅ Successfully extracted userId from JWT token:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Get current user information from JWT token
   * @returns {Object|null} User data from token or null if not found
   */
  getCurrentUser() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('❌ Error getting current user from token:', error);
      return null;
    }
  }
}

// สร้าง instance เดียวสำหรับใช้ทั้งระบบ
window.authHelper = new AuthHelper();

console.log('🔐 AuthHelper initialized');
