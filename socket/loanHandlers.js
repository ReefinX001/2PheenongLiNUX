/**
 * Socket.IO Handlers for Loan Management System
 * Handles real-time updates for loan and installment data
 * @version 1.0.0
 */

const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const BadDebtCriteria = require('../models/BadDebtCriteria');
const LoanInstallmentIntegration = require('../services/loanInstallmentIntegration');

class LoanSocketHandlers {
  constructor(io) {
    this.io = io;
    this.loanNamespace = io.of('/loan');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.loanNamespace.on('connection', (socket) => {
      console.log(`🔗 Loan client connected: ${socket.id}`);

      // Join user to their branch room for targeted updates
      socket.on('join-branch', (branchCode) => {
        if (branchCode) {
          socket.join(`branch-${branchCode}`);
          console.log(`👥 Socket ${socket.id} joined branch: ${branchCode}`);
        }
      });

      // Join user to notification room
      socket.on('join-notifications', (userId) => {
        if (userId) {
          socket.join(`user-${userId}`);
          console.log(`🔔 Socket ${socket.id} joined notifications for user: ${userId}`);
        }
      });

      // Handle real-time dashboard subscriptions
      socket.on('subscribe-dashboard', (branchCode) => {
        const room = branchCode ? `dashboard-${branchCode}` : 'dashboard-all';
        socket.join(room);
        console.log(`📊 Socket ${socket.id} subscribed to dashboard: ${room}`);
      });

      // Handle bad debt monitoring
      socket.on('subscribe-bad-debt', (branchCode) => {
        const room = branchCode ? `bad-debt-${branchCode}` : 'bad-debt-all';
        socket.join(room);
        console.log(`⚠️ Socket ${socket.id} subscribed to bad debt: ${room}`);
      });

      // Handle payment monitoring
      socket.on('subscribe-payments', (contractId) => {
        if (contractId) {
          socket.join(`payments-${contractId}`);
          console.log(`💰 Socket ${socket.id} subscribed to payments for: ${contractId}`);
        }
      });

      // Handle customer loan monitoring
      socket.on('subscribe-customer', (customerId) => {
        if (customerId) {
          socket.join(`customer-${customerId}`);
          console.log(`👤 Socket ${socket.id} subscribed to customer: ${customerId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Loan client disconnected: ${socket.id}`);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to loan management system',
        timestamp: new Date(),
        features: [
          'real-time dashboard updates',
          'payment notifications',
          'bad debt alerts',
          'customer loan monitoring'
        ]
      });
    });
  }

  // ============================================
  // PAYMENT EVENT HANDLERS
  // ============================================

  /**
   * Broadcast payment received event
   */
  async broadcastPaymentReceived(paymentData) {
    try {
      const { contractId, amount, paymentMethod, customerId, branchCode } = paymentData;

      // Get contract details for enriching the event
      const contract = await InstallmentOrder.findById(contractId)
        .select('contractNo customer_info totalAmount paidAmount status')
        .lean();

      if (!contract) {
        console.error('❌ Contract not found for payment broadcast:', contractId);
        return;
      }

      const enrichedPaymentData = {
        ...paymentData,
        contractNo: contract.contractNo,
        customerName: contract.customer_info ?
          `${contract.customer_info.firstName} ${contract.customer_info.lastName}` :
          'ไม่ระบุ',
        remainingBalance: Math.max(0, (contract.totalAmount || 0) - (contract.paidAmount || 0)),
        timestamp: new Date()
      };

      // Broadcast to specific contract subscribers
      this.loanNamespace.to(`payments-${contractId}`).emit('payment-received', enrichedPaymentData);

      // Broadcast to customer subscribers
      if (customerId) {
        this.loanNamespace.to(`customer-${customerId}`).emit('customer-payment-update', enrichedPaymentData);
      }

      // Broadcast to branch subscribers
      if (branchCode) {
        this.loanNamespace.to(`branch-${branchCode}`).emit('branch-payment-update', enrichedPaymentData);
        this.loanNamespace.to(`dashboard-${branchCode}`).emit('dashboard-payment-update', enrichedPaymentData);
      }

      // Broadcast to all dashboard subscribers
      this.loanNamespace.to('dashboard-all').emit('dashboard-payment-update', enrichedPaymentData);

      console.log(`💰 Payment broadcast sent for contract: ${contract.contractNo}, amount: ${amount}`);

    } catch (error) {
      console.error('❌ Error broadcasting payment received:', error);
    }
  }

  /**
   * Broadcast installment status change
   */
  async broadcastInstallmentStatusChange(installmentData) {
    try {
      const { contractId, oldStatus, newStatus, branchCode, customerId } = installmentData;

      const contract = await InstallmentOrder.findById(contractId)
        .select('contractNo customer_info totalAmount paidAmount')
        .lean();

      if (!contract) {
        console.error('❌ Contract not found for status broadcast:', contractId);
        return;
      }

      const statusChangeData = {
        contractId,
        contractNo: contract.contractNo,
        customerName: contract.customer_info ?
          `${contract.customer_info.firstName} ${contract.customer_info.lastName}` :
          'ไม่ระบุ',
        oldStatus,
        newStatus,
        totalAmount: contract.totalAmount,
        paidAmount: contract.paidAmount,
        timestamp: new Date()
      };

      // Broadcast to relevant subscribers
      this.loanNamespace.to(`payments-${contractId}`).emit('installment-status-changed', statusChangeData);

      if (customerId) {
        this.loanNamespace.to(`customer-${customerId}`).emit('customer-installment-update', statusChangeData);
      }

      if (branchCode) {
        this.loanNamespace.to(`branch-${branchCode}`).emit('branch-installment-update', statusChangeData);
        this.loanNamespace.to(`dashboard-${branchCode}`).emit('dashboard-installment-update', statusChangeData);
      }

      this.loanNamespace.to('dashboard-all').emit('dashboard-installment-update', statusChangeData);

      console.log(`📋 Status change broadcast sent for contract: ${contract.contractNo}, ${oldStatus} → ${newStatus}`);

    } catch (error) {
      console.error('❌ Error broadcasting status change:', error);
    }
  }

  // ============================================
  // BAD DEBT EVENT HANDLERS
  // ============================================

  /**
   * Broadcast bad debt alert
   */
  async broadcastBadDebtAlert(badDebtData) {
    try {
      const { contractId, overdueAmount, daysPastDue, riskLevel, branchCode, customerId } = badDebtData;

      const contract = await InstallmentOrder.findById(contractId)
        .select('contractNo customer_info dueDate')
        .lean();

      if (!contract) {
        console.error('❌ Contract not found for bad debt alert:', contractId);
        return;
      }

      const alertData = {
        contractId,
        contractNo: contract.contractNo,
        customerName: contract.customer_info ?
          `${contract.customer_info.firstName} ${contract.customer_info.lastName}` :
          'ไม่ระบุ',
        overdueAmount,
        daysPastDue,
        riskLevel,
        dueDate: contract.dueDate,
        alertType: this.getAlertType(daysPastDue),
        timestamp: new Date()
      };

      // Broadcast to bad debt subscribers
      if (branchCode) {
        this.loanNamespace.to(`bad-debt-${branchCode}`).emit('bad-debt-alert', alertData);
        this.loanNamespace.to(`branch-${branchCode}`).emit('branch-bad-debt-alert', alertData);
      }

      this.loanNamespace.to('bad-debt-all').emit('bad-debt-alert', alertData);

      // Broadcast to customer subscribers
      if (customerId) {
        this.loanNamespace.to(`customer-${customerId}`).emit('customer-overdue-alert', alertData);
      }

      console.log(`⚠️ Bad debt alert sent for contract: ${contract.contractNo}, ${daysPastDue} days overdue`);

    } catch (error) {
      console.error('❌ Error broadcasting bad debt alert:', error);
    }
  }

  /**
   * Broadcast bad debt criteria update
   */
  async broadcastBadDebtCriteriaUpdate(criteriaData) {
    try {
      const updateData = {
        ...criteriaData,
        timestamp: new Date(),
        message: 'เกณฑ์การจัดหนี้สูญได้รับการอัปเดต'
      };

      // Broadcast to all bad debt subscribers
      this.loanNamespace.emit('bad-debt-criteria-updated', updateData);

      console.log('📋 Bad debt criteria update broadcast sent');

    } catch (error) {
      console.error('❌ Error broadcasting bad debt criteria update:', error);
    }
  }

  // ============================================
  // DASHBOARD EVENT HANDLERS
  // ============================================

  /**
   * Broadcast dashboard data update
   */
  async broadcastDashboardUpdate(dashboardData) {
    try {
      const { branchCode, type, data } = dashboardData;

      const updateData = {
        type,
        data,
        timestamp: new Date()
      };

      // Broadcast to specific branch or all
      if (branchCode) {
        this.loanNamespace.to(`dashboard-${branchCode}`).emit('dashboard-update', updateData);
      } else {
        this.loanNamespace.to('dashboard-all').emit('dashboard-update', updateData);
      }

      console.log(`📊 Dashboard update broadcast sent: ${type}${branchCode ? ` for branch ${branchCode}` : ''}`);

    } catch (error) {
      console.error('❌ Error broadcasting dashboard update:', error);
    }
  }

  /**
   * Broadcast new contract creation
   */
  async broadcastNewContract(contractData) {
    try {
      const { contractId, branchCode, customerId } = contractData;

      const contract = await InstallmentOrder.findById(contractId)
        .select('contractNo customer_info totalAmount installmentCount planType')
        .lean();

      if (!contract) {
        console.error('❌ Contract not found for new contract broadcast:', contractId);
        return;
      }

      const newContractData = {
        contractId,
        contractNo: contract.contractNo,
        customerName: contract.customer_info ?
          `${contract.customer_info.firstName} ${contract.customer_info.lastName}` :
          'ไม่ระบุ',
        totalAmount: contract.totalAmount,
        installmentCount: contract.installmentCount,
        planType: contract.planType,
        timestamp: new Date()
      };

      // Broadcast to relevant subscribers
      if (branchCode) {
        this.loanNamespace.to(`branch-${branchCode}`).emit('new-contract-created', newContractData);
        this.loanNamespace.to(`dashboard-${branchCode}`).emit('dashboard-new-contract', newContractData);
      }

      this.loanNamespace.to('dashboard-all').emit('dashboard-new-contract', newContractData);

      if (customerId) {
        this.loanNamespace.to(`customer-${customerId}`).emit('customer-new-contract', newContractData);
      }

      console.log(`🆕 New contract broadcast sent: ${contract.contractNo}`);

    } catch (error) {
      console.error('❌ Error broadcasting new contract:', error);
    }
  }

  // ============================================
  // SYSTEM EVENT HANDLERS
  // ============================================

  /**
   * Broadcast system health update
   */
  async broadcastSystemHealthUpdate(healthData) {
    try {
      const updateData = {
        ...healthData,
        timestamp: new Date()
      };

      // Broadcast to all connected clients
      this.loanNamespace.emit('system-health-update', updateData);

      console.log('🏥 System health update broadcast sent');

    } catch (error) {
      console.error('❌ Error broadcasting system health update:', error);
    }
  }

  /**
   * Broadcast data synchronization status
   */
  async broadcastSyncStatus(syncData) {
    try {
      const { type, status, details, branchCode } = syncData;

      const syncStatusData = {
        type,
        status,
        details,
        timestamp: new Date()
      };

      // Broadcast to relevant subscribers
      if (branchCode) {
        this.loanNamespace.to(`branch-${branchCode}`).emit('sync-status-update', syncStatusData);
      } else {
        this.loanNamespace.emit('sync-status-update', syncStatusData);
      }

      console.log(`🔄 Sync status broadcast sent: ${type} - ${status}`);

    } catch (error) {
      console.error('❌ Error broadcasting sync status:', error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get alert type based on days past due
   */
  getAlertType(daysPastDue) {
    if (daysPastDue >= 180) return 'critical';
    if (daysPastDue >= 90) return 'high';
    if (daysPastDue >= 60) return 'medium';
    if (daysPastDue >= 30) return 'low';
    return 'info';
  }

  /**
   * Send notification to specific user
   */
  async sendUserNotification(userId, notification) {
    try {
      const notificationData = {
        ...notification,
        timestamp: new Date(),
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      this.loanNamespace.to(`user-${userId}`).emit('notification', notificationData);

      console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);

    } catch (error) {
      console.error('❌ Error sending user notification:', error);
    }
  }

  /**
   * Get current statistics for broadcasting
   */
  async getCurrentStats(branchCode = null) {
    try {
      const query = { deleted_at: null };
      if (branchCode) {
        query.branch_code = branchCode;
      }

      const [totalContracts, activeContracts, overdueContracts] = await Promise.all([
        InstallmentOrder.countDocuments(query),
        InstallmentOrder.countDocuments({ ...query, status: { $in: ['active', 'ongoing'] } }),
        InstallmentOrder.countDocuments({
          ...query,
          status: { $in: ['active', 'ongoing'] },
          dueDate: { $lt: new Date() }
        })
      ]);

      return {
        totalContracts,
        activeContracts,
        overdueContracts,
        onTimeRate: activeContracts > 0 ? ((activeContracts - overdueContracts) / activeContracts * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error('❌ Error getting current stats:', error);
      return null;
    }
  }
}

module.exports = LoanSocketHandlers;