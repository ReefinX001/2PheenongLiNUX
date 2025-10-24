/**
 * Commission Tracker Module
 * Integrates sales data from POS system with HR commission tracking
 * Version: 1.0.0
 */

(function() {
  'use strict';

  // Commission Tracker Object
  window.CommissionTracker = {

    /**
     * Save transaction data for commission tracking
     * Called after successful checkout in POS system
     */
    saveTransaction: function(transactionData) {
      try {
        // Get existing POS transactions
        let posTransactions = localStorage.getItem('pos_transactions');
        posTransactions = posTransactions ? JSON.parse(posTransactions) : [];

        // Prepare commission data
        const commissionData = {
          // Transaction identifiers
          id: transactionData.transactionId || `TXN-${Date.now()}`,
          receiptNumber: transactionData.receiptNumber || `RCP-${Date.now()}`,
          billNumber: transactionData.billNumber,

          // Employee information
          employeeId: transactionData.staffId || localStorage.getItem('userId'),
          employeeName: transactionData.staffName || localStorage.getItem('userName'),

          // Sale details
          saleType: transactionData.paymentMethod === 'CASH' ? 'cash' : 'other',
          saleAmount: transactionData.totalAmount || transactionData.total,
          paymentMethod: transactionData.paymentMethod,

          // Date and location
          date: transactionData.timestamp || new Date().toISOString(),
          branchCode: transactionData.branchCode || 'PATTANI',

          // Customer information
          customerName: transactionData.customerName,
          customerEmail: transactionData.customerEmail,
          customerPhone: transactionData.customerPhone,

          // Product details
          items: transactionData.cartItems || transactionData.items,
          productDetails: transactionData.productDetails,

          // Commission activities (based on MEMO 2025-005)
          activities: transactionData.activities || {
            interview: false,
            boomerang: false,
            googleReview: false,
            video: false,
            videoLink: ''
          }
        };

        // Add to transactions array
        posTransactions.push(commissionData);

        // Keep only last 1000 transactions to manage storage
        if (posTransactions.length > 1000) {
          posTransactions = posTransactions.slice(-1000);
        }

        // Save to localStorage
        localStorage.setItem('pos_transactions', JSON.stringify(posTransactions));

        // Also save to employee-specific key for quick access
        const employeeKey = `sales_${commissionData.employeeId || commissionData.employeeName}`;
        let employeeSales = localStorage.getItem(employeeKey);
        employeeSales = employeeSales ? JSON.parse(employeeSales) : [];
        employeeSales.push(commissionData);

        // Keep only current month's sales for employee
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        employeeSales = employeeSales.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });

        localStorage.setItem(employeeKey, JSON.stringify(employeeSales));

        console.log('✅ Transaction saved for commission:', commissionData);

        // Trigger custom event for other modules
        window.dispatchEvent(new CustomEvent('commissionTransactionSaved', {
          detail: commissionData
        }));

        return commissionData;

      } catch (error) {
        console.error('❌ Error saving transaction for commission:', error);
        return null;
      }
    },

    /**
     * Track customer promotional activities
     * Based on MEMO 2025-005 requirements
     */
    trackActivity: function(transactionId, activities) {
      try {
        let posTransactions = localStorage.getItem('pos_transactions');
        if (!posTransactions) return false;

        posTransactions = JSON.parse(posTransactions);
        const transactionIndex = posTransactions.findIndex(t => t.id === transactionId);

        if (transactionIndex !== -1) {
          posTransactions[transactionIndex].activities = {
            ...posTransactions[transactionIndex].activities,
            ...activities,
            lastUpdated: new Date().toISOString()
          };

          localStorage.setItem('pos_transactions', JSON.stringify(posTransactions));

          console.log('✅ Activities tracked for transaction:', transactionId, activities);
          return true;
        }

        return false;

      } catch (error) {
        console.error('❌ Error tracking activities:', error);
        return false;
      }
    },

    /**
     * Get sales data for specific employee
     */
    getEmployeeSales: function(employeeId, month, year) {
      try {
        const targetMonth = month !== undefined ? month : new Date().getMonth();
        const targetYear = year || new Date().getFullYear();

        let allTransactions = localStorage.getItem('pos_transactions');
        if (!allTransactions) return [];

        allTransactions = JSON.parse(allTransactions);

        return allTransactions.filter(transaction => {
          const transDate = new Date(transaction.date);
          return (
            transaction.employeeId === employeeId &&
            transDate.getMonth() === targetMonth &&
            transDate.getFullYear() === targetYear
          );
        });

      } catch (error) {
        console.error('Error getting employee sales:', error);
        return [];
      }
    },

    /**
     * Calculate commission for employee based on MEMO rules
     */
    calculateCommission: function(employeeId, month, year) {
      const sales = this.getEmployeeSales(employeeId, month, year);
      let totalCommission = 0;
      let details = [];

      sales.forEach(sale => {
        let saleCommission = 0;

        // Base commission for cash sales (10 baht per bill)
        if (sale.saleType === 'cash') {
          saleCommission += 10;
        }

        // Activity bonuses
        const activities = sale.activities || {};
        if (activities.interview) saleCommission += 10;
        if (activities.boomerang) saleCommission += 10;
        if (activities.googleReview) saleCommission += 10;
        if (activities.video) saleCommission += 20;

        // Apply rounding rule (round up if > 0.50 baht)
        const decimal = saleCommission - Math.floor(saleCommission);
        if (decimal > 0.50) {
          saleCommission = Math.ceil(saleCommission);
        } else {
          saleCommission = Math.floor(saleCommission);
        }

        totalCommission += saleCommission;

        details.push({
          transactionId: sale.id,
          date: sale.date,
          amount: sale.saleAmount,
          commission: saleCommission,
          activities: activities
        });
      });

      return {
        employeeId,
        totalSales: sales.length,
        totalSalesAmount: sales.reduce((sum, s) => sum + (s.saleAmount || 0), 0),
        totalCommission,
        details
      };
    },

    /**
     * Get all employees with sales in current month
     */
    getActiveEmployees: function() {
      try {
        let transactions = localStorage.getItem('pos_transactions');
        if (!transactions) return [];

        transactions = JSON.parse(transactions);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const employeeMap = new Map();

        transactions.forEach(transaction => {
          const transDate = new Date(transaction.date);
          if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
            if (transaction.employeeId && transaction.employeeName) {
              employeeMap.set(transaction.employeeId, {
                id: transaction.employeeId,
                name: transaction.employeeName,
                branch: transaction.branchCode
              });
            }
          }
        });

        return Array.from(employeeMap.values());

      } catch (error) {
        console.error('Error getting active employees:', error);
        return [];
      }
    },

    /**
     * Clear old transactions (keep only current month)
     */
    cleanupOldTransactions: function() {
      try {
        let transactions = localStorage.getItem('pos_transactions');
        if (!transactions) return;

        transactions = JSON.parse(transactions);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const filteredTransactions = transactions.filter(transaction => {
          const transDate = new Date(transaction.date);
          return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        });

        localStorage.setItem('pos_transactions', JSON.stringify(filteredTransactions));

        console.log(`Cleaned up transactions. Kept ${filteredTransactions.length} current month transactions.`);

      } catch (error) {
        console.error('Error cleaning up transactions:', error);
      }
    }
  };

  // Auto-cleanup on page load (run once per day)
  const lastCleanup = localStorage.getItem('lastCommissionCleanup');
  const today = new Date().toDateString();

  if (lastCleanup !== today) {
    CommissionTracker.cleanupOldTransactions();
    localStorage.setItem('lastCommissionCleanup', today);
  }

  // Make it available globally
  window.saveTransactionForCommission = CommissionTracker.saveTransaction.bind(CommissionTracker);

})();