// File: views/loan/js/loan-installment-integration.js
// Purpose: JavaScript integration between loan module and pattani installment system

// Global configuration
const LOAN_INTEGRATION_CONFIG = {
  API_BASE: window.location.origin,
  INSTALLMENT_BASE_PATH: '/views/pattani/installment',
  TOKEN_KEY: 'authToken',
  USER_KEY: 'userData'
};

// Utility functions
const LoanIntegrationUtils = {
  // Get auth token
  getToken() {
    return localStorage.getItem(LOAN_INTEGRATION_CONFIG.TOKEN_KEY);
  },

  // Get user data
  getUserData() {
    const userData = localStorage.getItem(LOAN_INTEGRATION_CONFIG.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  },

  // Format date
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Calculate age of debt
  calculateDebtAge(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // API request helper
  async apiRequest(url, options = {}) {
    const token = this.getToken();
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }
};

// Loan Dashboard Integration
const LoanDashboardIntegration = {
  // Get dashboard summary
  async getDashboardSummary(branchCode = null) {
    try {
      const params = branchCode ? `?branch_code=${branchCode}` : '';
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/dashboard/summary${params}`
      );
      return result;
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      throw error;
    }
  },

  // Get dashboard trends
  async getDashboardTrends(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/dashboard/trends?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get dashboard trends error:', error);
      throw error;
    }
  },

  // Get status distribution
  async getStatusDistribution(branchCode = null) {
    try {
      const params = branchCode ? `?branch_code=${branchCode}` : '';
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/dashboard/status-distribution${params}`
      );
      return result;
    } catch (error) {
      console.error('Get status distribution error:', error);
      throw error;
    }
  },

  // Get recent loans
  async getRecentLoans(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/dashboard/recent-loans?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get recent loans error:', error);
      throw error;
    }
  },

  // Get daily statistics
  async getDailyStats(date = null, branchCode = null) {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (branchCode) params.append('branch_code', branchCode);

      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/dashboard/daily-stats?${params.toString()}`
      );
      return result;
    } catch (error) {
      console.error('Get daily stats error:', error);
      throw error;
    }
  },

  // Sync customer data
  async syncCustomerData(customerId) {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/sync/customer/${customerId}`,
        {
          method: 'POST'
        }
      );

      if (result.success) {
        this.showSuccessMessage('ซิงค์ข้อมูลลูกค้าสำเร็จ');
        return result;
      }

      throw new Error(result.message);
    } catch (error) {
      this.showErrorMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  },

  // Sync payment status
  async syncPaymentStatus(contractId) {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/sync/payment/${contractId}`,
        {
          method: 'POST'
        }
      );

      if (result.success) {
        this.showSuccessMessage('ซิงค์สถานะการชำระเงินสำเร็จ');
        return result;
      }

      throw new Error(result.message);
    } catch (error) {
      this.showErrorMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  },

  // Show success message
  showSuccessMessage(message) {
    if (window.LoadingSystem && window.LoadingSystem.show) {
      const loaderId = window.LoadingSystem.show({
        message,
        type: 'success'
      });
      setTimeout(() => window.LoadingSystem.hide(loaderId), 3000);
    } else {
      alert(message);
    }
  },

  // Show error message
  showErrorMessage(message) {
    if (window.LoadingSystem && window.LoadingSystem.show) {
      const loaderId = window.LoadingSystem.show({
        message,
        type: 'error'
      });
      setTimeout(() => window.LoadingSystem.hide(loaderId), 5000);
    } else {
      alert(message);
    }
  }
};

// Bad Debt Management Integration
const BadDebtIntegration = {
  // Get bad debt list
  async getBadDebtList(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/list?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get bad debt list error:', error);
      throw error;
    }
  },

  // Get bad debt statistics
  async getStatistics(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/statistics?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get bad debt statistics error:', error);
      throw error;
    }
  },

  // Get aged analysis
  async getAgedAnalysis(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/aged-analysis?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get aged analysis error:', error);
      throw error;
    }
  },

  // Get bad debt criteria
  async getCriteria() {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/criteria`
      );
      return result.data;
    } catch (error) {
      console.error('Get bad debt criteria error:', error);
      throw error;
    }
  },

  // Update bad debt criteria
  async updateCriteria(criteriaData) {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/criteria`,
        {
          method: 'POST',
          body: JSON.stringify(criteriaData)
        }
      );

      if (result.success) {
        this.showSuccessMessage('อัพเดทเกณฑ์หนี้สูญสำเร็จ');
        return result.data;
      }

      throw new Error(result.message);
    } catch (error) {
      this.showErrorMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  },

  // Export bad debt report
  async exportReport(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/bad-debt/export?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Export bad debt report error:', error);
      throw error;
    }
  },

  // Get debtors list (alias for bad debt list)
  async getDebtors(filters = {}) {
    return this.getBadDebtList(filters);
  },

  // Calculate bad debt provision
  calculateProvision(debtAmount, debtAge, criteria) {
    let provisionRate = 0;

    if (debtAge >= 180) {
      provisionRate = criteria.bad_debt_percentage;
    } else if (debtAge >= 90) {
      provisionRate = criteria.doubtful_percentage;
    } else if (debtAge >= 60) {
      provisionRate = criteria.allowance_percentage;
    }

    return (debtAmount * provisionRate) / 100;
  },

  showSuccessMessage: LoanDashboardIntegration.showSuccessMessage,
  showErrorMessage: LoanDashboardIntegration.showErrorMessage
};

// Deposit Management Integration
const DepositIntegration = {
  // Get deposit receipts
  async getDeposits(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/deposits?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get deposits error:', error);
      throw error;
    }
  },

  // Create deposit receipt
  async createDeposit(depositData) {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/deposits`,
        {
          method: 'POST',
          body: JSON.stringify(depositData)
        }
      );

      if (result.success) {
        this.showSuccessMessage('บันทึกเงินมัดจำสำเร็จ');
        return result.data;
      }

      throw new Error(result.message);
    } catch (error) {
      this.showErrorMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  },

  showSuccessMessage: LoanDashboardIntegration.showSuccessMessage,
  showErrorMessage: LoanDashboardIntegration.showErrorMessage
};

// Credit Approval Integration
const CreditApprovalIntegration = {
  // Get credit approved list
  async getCreditApproved(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/credit-approved?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get credit approved error:', error);
      throw error;
    }
  },

  // Navigate to installment creation
  navigateToInstallmentCreation(customerId, creditData) {
    // Store credit data in session storage for step1
    sessionStorage.setItem('creditApprovalData', JSON.stringify({
      customerId,
      ...creditData,
      fromLoanModule: true
    }));

    // Navigate to pattani installment step1
    window.location.href = `${LOAN_INTEGRATION_CONFIG.INSTALLMENT_BASE_PATH}/step1/step1.html`;
  }
};

// Installment Navigation Helper
const InstallmentNavigator = {
  // Navigate to specific step
  goToStep(stepNumber, data = {}) {
    // Store navigation data
    sessionStorage.setItem('installmentNavigationData', JSON.stringify({
      fromLoanModule: true,
      ...data
    }));

    // Navigate to step
    window.location.href = `${LOAN_INTEGRATION_CONFIG.INSTALLMENT_BASE_PATH}/step${stepNumber}/step${stepNumber}.html`;
  },

  // Navigate to installment history
  goToInstallmentHistory(contractId) {
    sessionStorage.setItem('viewContractId', contractId);
    window.location.href = '/views/pattani/installment_history.html';
  },

  // Navigate to payment
  goToPayment(contractId, installmentId) {
    sessionStorage.setItem('paymentData', JSON.stringify({
      contractId,
      installmentId,
      fromLoanModule: true
    }));
    window.location.href = '/views/pattani/payment.html';
  }
};

// Real-time Updates Integration
const RealtimeIntegration = {
  socket: null,

  // Initialize socket connection
  init() {
    if (typeof io === 'undefined') {
      console.warn('Socket.io not loaded');
      return;
    }

    this.socket = io(window.location.origin, {
      transports: ['websocket'],
      path: '/socket.io'
    });

    this.setupListeners();
  },

  // Setup socket listeners
  setupListeners() {
    // Listen for installment updates
    this.socket.on('installmentUpdated', (data) => {
      console.log('Installment updated:', data);
      this.handleInstallmentUpdate(data);
    });

    // Listen for contract updates
    this.socket.on('contractUpdated', (data) => {
      console.log('Contract updated:', data);
      this.handleContractUpdate(data);
    });

    // Listen for payment updates
    this.socket.on('paymentReceived', (data) => {
      console.log('Payment received:', data);
      this.handlePaymentUpdate(data);
    });
  },

  // Handle installment update
  handleInstallmentUpdate(data) {
    // Trigger refresh if on relevant page
    if (window.refreshInstallmentData) {
      window.refreshInstallmentData();
    }
  },

  // Handle contract update
  handleContractUpdate(data) {
    // Trigger refresh if on relevant page
    if (window.refreshContractData) {
      window.refreshContractData();
    }
  },

  // Handle payment update
  handlePaymentUpdate(data) {
    // Show notification
    if (window.showNotification) {
      window.showNotification({
        type: 'success',
        title: 'การชำระเงิน',
        message: `ได้รับการชำระเงินจำนวน ${LoanIntegrationUtils.formatCurrency(data.amount)}`
      });
    }

    // Trigger refresh if on relevant page
    if (window.refreshPaymentData) {
      window.refreshPaymentData();
    }
  },

  // Emit event
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  },

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize realtime connection
  RealtimeIntegration.init();

  // Check if coming from installment module
  const navigationData = sessionStorage.getItem('installmentNavigationData');
  if (navigationData) {
    const data = JSON.parse(navigationData);
    if (data.fromInstallmentModule) {
      console.log('Navigated from installment module:', data);
      // Handle navigation data
      if (window.handleInstallmentNavigation) {
        window.handleInstallmentNavigation(data);
      }
    }
  }
});

// Customer Loan Integration
const CustomerLoanIntegration = {
  // Get unified customer loans
  async getCustomerLoans(customerId, options = {}) {
    try {
      const queryParams = new URLSearchParams(options).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/customer/${customerId}/loans?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get customer loans error:', error);
      throw error;
    }
  },

  // Get customer installments
  async getCustomerInstallments(customerId, options = {}) {
    try {
      const queryParams = new URLSearchParams(options).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/customer/${customerId}/installments?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get customer installments error:', error);
      throw error;
    }
  }
};

// System Integration
const SystemIntegration = {
  // Get system health
  async getSystemHealth() {
    try {
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/system/health`
      );
      return result;
    } catch (error) {
      console.error('Get system health error:', error);
      throw error;
    }
  },

  // Generate consolidated reports
  async generateReport(reportType, options = {}) {
    try {
      const queryParams = new URLSearchParams(options).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/reports/${reportType}?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Generate report error:', error);
      throw error;
    }
  }
};

// Additional API functions for other loan pages
const CostsExpensesIntegration = {
  async getSummary(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/costs-expenses/summary?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get costs expenses summary error:', error);
      throw error;
    }
  }
};

const TaxIntegration = {
  async getCalculations(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/tax/calculations?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get tax calculations error:', error);
      throw error;
    }
  }
};

const ClaimItemsIntegration = {
  async getList(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const result = await LoanIntegrationUtils.apiRequest(
        `${LOAN_INTEGRATION_CONFIG.API_BASE}/api/loan/claim-items/list?${queryParams}`
      );
      return result;
    } catch (error) {
      console.error('Get claim items error:', error);
      throw error;
    }
  }
};

// Export for use in other scripts
window.LoanIntegration = {
  Utils: LoanIntegrationUtils,
  Dashboard: LoanDashboardIntegration,
  BadDebt: BadDebtIntegration,
  Deposit: DepositIntegration,
  CreditApproval: CreditApprovalIntegration,
  Customer: CustomerLoanIntegration,
  System: SystemIntegration,
  CostsExpenses: CostsExpensesIntegration,
  Tax: TaxIntegration,
  ClaimItems: ClaimItemsIntegration,
  Navigator: InstallmentNavigator,
  Realtime: RealtimeIntegration
};