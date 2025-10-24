// ======================= CART MANAGER =======================

const cartManager = {
  // Load cart items from global data manager
  loadCartItems() {
    if (window.globalDataManager) {
      const step1Data = globalDataManager.getStepData(1);
      if (step1Data && step1Data.cartItems) {
        return step1Data.cartItems;
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('cartItems');
    return saved ? JSON.parse(saved) : [];
  },

  // Get cart total
  getCartTotal() {
    const items = this.loadCartItems();
    return items.reduce((total, item) => total + (item.price || 0), 0);
  },

  // Get cart count
  getCartCount() {
    const items = this.loadCartItems();
    return items.length;
  },

  // Display cart summary
  displayCartSummary(containerId = 'productSummary') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = this.loadCartItems();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="bi bi-cart text-4xl mb-2"></i>
          <p>ยังไม่มีสินค้าในตะกร้า</p>
          <button onclick="goToStep1()" class="btn btn-outline btn-sm mt-2">
            <i class="bi bi-arrow-left"></i> กลับไปเลือกสินค้า
          </button>
        </div>
      `;
      return;
    }

    const total = this.getCartTotal();

    container.innerHTML = `
      <div class="space-y-3">
        ${items.map(item => `
          <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-lg">
            <div class="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
              <i class="bi bi-phone text-gray-400"></i>
            </div>
            <div class="flex-1">
              <div class="font-medium text-sm">${item.name || 'สินค้า'}</div>
              <div class="text-green-600 font-bold text-sm">${this.formatPrice(item.price || 0)}</div>
            </div>
          </div>
        `).join('')}
        <div class="border-t pt-3">
          <div class="flex justify-between font-semibold">
            <span>รวม:</span>
            <span class="text-green-600">${this.formatPrice(total)}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Format price
  formatPrice(price) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(price);
  }
};

// Export to global scope
window.cartManager = cartManager;

function goToStep1() {
  // Redirect to step 1
  window.location.href = '/step1';
}