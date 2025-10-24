/**
 * Shared Promotion Manager Library
 * ใช้งานร่วมกันระหว่าง campaigns.html, frontstore_pattani.html, และ step1.html
 * Version: 1.0.0
 */

class PromotionManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.activePromotions = [];
    this.appliedPromotions = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the promotion manager
   */
  async initialize(branchCode = null) {
    try {
      this.branchCode = branchCode || this.getBranchCode();
      console.log('🎯 Initializing PromotionManager for branch:', this.branchCode);

      await this.loadActivePromotions();
      this.isInitialized = true;

      console.log('✅ PromotionManager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PromotionManager:', error);
      return false;
    }
  }

  /**
   * Get branch code from various sources
   */
  getBranchCode() {
    return window.BRANCH_CODE ||
           window.currentBranchCode ||
           localStorage.getItem('branchCode') ||
           'PTN01';
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token found');
      return null;
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Load active promotions from API
   */
  async loadActivePromotions(branchCode = null) {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) return [];

      const targetBranchCode = branchCode || this.branchCode;
      console.log('🔄 Loading active promotions for branch:', targetBranchCode);

      const response = await fetch('/api/promotion/active', { headers });

      if (!response.ok) {
        console.error('❌ Failed to load active promotions:', response.status);
        return [];
      }

      const result = await response.json();
      if (result.status === 'success' && result.data) {
        // Filter promotions by branch and conditions
        const now = new Date();
        this.activePromotions = result.data.filter(promo => {
          const branchOk = !promo.applicableBranches ||
                          promo.applicableBranches.length === 0 ||
                          promo.applicableBranches.includes(targetBranchCode);
          const startOk = new Date(promo.startDate) <= now;
          const endOk = new Date(promo.endDate) >= now;
          const activeOk = promo.isActive;
          const usageOk = !promo.usageLimit || (promo.usageCount || 0) < promo.usageLimit;

          return branchOk && startOk && endOk && activeOk && usageOk;
        });

        console.log('✅ Loaded active promotions:', this.activePromotions.length);
        return this.activePromotions;
      }

      return [];
    } catch (error) {
      console.error('❌ Error loading active promotions:', error);
      this.activePromotions = [];
      return [];
    }
  }

  /**
   * Check if a product has promotions (local check)
   */
  checkPromotionLocally(productId) {
    if (!this.activePromotions.length) return false;

    return this.activePromotions.some(promo => {
      // Check if promotion applies to all products
      if (!promo.applicableProducts || promo.applicableProducts.length === 0) {
        return true;
      }

      // Check if product is in applicable products
      return promo.applicableProducts.some(p => {
        const id = p._id || p;
        return id.toString() === productId.toString();
      });
    });
  }

  /**
   * Check promotions for a product via API
   */
  async checkPromotionsForProduct(productId, branchCode = null) {
    console.log('🔍 Checking promotions for product:', productId);

    const headers = this.getAuthHeaders();
    if (!headers) {
      console.warn('⚠️ No auth headers, falling back to local check');
      return this.checkPromotionLocally(productId);
    }

    const targetBranchCode = branchCode || this.branchCode;
    const cacheKey = `${productId}_${targetBranchCode}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data.length > 0;
    }

    try {
      const response = await fetch('/api/promotion/check-available', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          productIds: Array.isArray(productId) ? productId : [productId],
          branchCode: targetBranchCode
        })
      });

      if (!response.ok) {
        console.error('❌ API call failed:', response.status);
        return this.checkPromotionLocally(productId);
      }

      const result = await response.json();
      const checkId = Array.isArray(productId) ? productId[0] : productId;
      const promotions = (result.status === 'success' && result.data && result.data[checkId])
                       ? result.data[checkId] : [];

      // Cache the result
      this.cache.set(cacheKey, {
        data: promotions,
        timestamp: Date.now()
      });

      console.log('📦 Found promotions:', promotions.length);
      return promotions.length > 0;

    } catch (error) {
      console.error('❌ Error checking promotions:', error);
      return this.checkPromotionLocally(productId);
    }
  }

  /**
   * Get detailed promotions for a product
   */
  async getPromotionsForProduct(productId, branchCode = null) {
    console.log('🔍 Getting promotion details for product:', productId);

    const headers = this.getAuthHeaders();
    if (!headers) return [];

    const targetBranchCode = branchCode || this.branchCode;
    const cacheKey = `details_${productId}_${targetBranchCode}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('/api/promotion/check-available', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          productIds: Array.isArray(productId) ? productId : [productId],
          branchCode: targetBranchCode
        })
      });

      if (!response.ok) {
        console.error('❌ API call failed:', response.status);
        return [];
      }

      const result = await response.json();
      const checkId = Array.isArray(productId) ? productId[0] : productId;
      const promotions = (result.status === 'success' && result.data && result.data[checkId])
                       ? result.data[checkId] : [];

      // Cache the result
      this.cache.set(cacheKey, {
        data: promotions,
        timestamp: Date.now()
      });

      return promotions;

    } catch (error) {
      console.error('❌ Error getting promotion details:', error);
      return [];
    }
  }

  /**
   * Check available promotions for multiple products (bulk check)
   */
  async checkAvailablePromotions(productIds, branchCode = null) {
    console.log('🔍 Bulk checking promotions for products:', productIds.length);

    const headers = this.getAuthHeaders();
    if (!headers) return {};

    const targetBranchCode = branchCode || this.branchCode;

    try {
      const response = await fetch('/api/promotion/check-available', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          productIds: productIds,
          branchCode: targetBranchCode
        })
      });

      if (!response.ok) {
        console.error('❌ Bulk API call failed:', response.status);
        return {};
      }

      const result = await response.json();
      return result.status === 'success' ? (result.data || {}) : {};

    } catch (error) {
      console.error('❌ Error bulk checking promotions:', error);
      return {};
    }
  }

  /**
   * Record promotion usage
   */
  async recordPromotionUsage(promotionId) {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) return false;

      const response = await fetch('/api/promotion/use', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ promotionId })
      });

      const result = await response.json();
      if (result.status === 'success') {
        console.log('✅ Promotion usage recorded:', promotionId);
        return true;
      } else {
        console.error('❌ Failed to record promotion usage:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error recording promotion usage:', error);
      return false;
    }
  }

  /**
   * Calculate promotion discount for cart items
   */
  calculatePromotionDiscount(cartItems = [], appliedPromotions = null) {
    const promos = appliedPromotions || this.appliedPromotions;
    let totalDiscount = 0;
    const details = [];

    Object.values(promos).forEach(promo => {
      if (promo && promo.discount) {
        totalDiscount += promo.discount;
        details.push({
          name: promo.name,
          discount: promo.discount,
          productName: promo.productName || 'ทั้งหมด'
        });
      }
    });

    return { totalDiscount, details };
  }

  /**
   * Apply promotion to cart
   */
  applyPromotion(promotionId, promotionData) {
    this.appliedPromotions[promotionId] = promotionData;
    console.log('✅ Applied promotion:', promotionId, promotionData);
  }

  /**
   * Remove promotion from cart
   */
  removePromotion(promotionId) {
    delete this.appliedPromotions[promotionId];
    console.log('🗑️ Removed promotion:', promotionId);
  }

  /**
   * Clear all applied promotions
   */
  clearPromotions() {
    this.appliedPromotions = {};
    console.log('🧹 Cleared all applied promotions');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Promotion cache cleared');
  }

  /**
   * Get promotion type label in Thai
   */
  getPromotionTypeLabel(type) {
    const labels = {
      'discount_percentage': 'ส่วนลด %',
      'discount_amount': 'ส่วนลดเงิน',
      'special_price': 'ราคาพิเศษ',
      'buy_x_get_y': 'ซื้อ X แถม Y',
      'bundle': 'จัดชุดสินค้า',
      'installment_discount': 'ส่วนลดดอกเบี้ยผ่อน',
      'installment_free_interest': 'ผ่อน 0%',
      'installment_special_terms': 'เงื่อนไขผ่อนพิเศษ',
      'installment_down_payment_discount': 'ลดเงินดาวน์',
      'installment_gift': 'ของแถม (ผ่อน)'
    };
    return labels[type] || type;
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '0';
    return Number(price).toLocaleString('th-TH', { minimumFractionDigits: 0 });
  }
}

// Create global instance
window.PromotionManager = PromotionManager;
window.promotionManager = new PromotionManager();

// Export for compatibility
window.checkPromotionsForProduct = (productId, branchCode) =>
  window.promotionManager.checkPromotionsForProduct(productId, branchCode);

window.getPromotionsForProduct = (productId, branchCode) =>
  window.promotionManager.getPromotionsForProduct(productId, branchCode);

window.checkAvailablePromotions = (productIds, branchCode) =>
  window.promotionManager.checkAvailablePromotions(productIds, branchCode);

window.recordPromotionUsage = (promotionId) =>
  window.promotionManager.recordPromotionUsage(promotionId);

window.loadActivePromotions = (branchCode) =>
  window.promotionManager.loadActivePromotions(branchCode);

window.calculatePromotionDiscount = (cartItems, appliedPromotions) =>
  window.promotionManager.calculatePromotionDiscount(cartItems, appliedPromotions);

// Alias for frontstore_pattani.html compatibility
window.checkPromotionForProduct = window.checkPromotionsForProduct;

console.log('🎯 Shared Promotion Manager Library loaded successfully');
