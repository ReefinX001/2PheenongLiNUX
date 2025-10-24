/**
 * services/sync/loanSync.service.js
 * Loan Synchronization Service between InstallmentOrder and Contract systems
 *
 * This service handles:
 * 1. Payment schedule generation from InstallmentOrder
 * 2. Contract creation/updates from InstallmentOrder
 * 3. Payment reconciliation between InstallmentPayment and Contract
 * 4. Change Stream monitoring for real-time synchronization
 */

const mongoose = require('mongoose');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../../models/Installment/InstallmentPayment');
const Contract = require('../../models/Load/Contract');
const ContractPaymentLog = require('../../models/Load/ContractPaymentLog');

/**
 * Logger utility for service operations
 */
class ServiceLogger {
  static info(message, data = null) {
    console.log(`[LoanSync] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static error(message, error = null) {
    console.error(`[LoanSync] ERROR: ${message}`, error ? error.stack || error : '');
  }

  static warn(message, data = null) {
    console.warn(`[LoanSync] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LoanSync] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

/**
 * MongoDB Replica Set Checker
 */
class ReplicaSetChecker {
  /**
   * Check if MongoDB is running as a replica set
   * @returns {Promise<boolean>}
   */
  static async isReplicaSet() {
    try {
      const admin = mongoose.connection.db.admin();
      const status = await admin.replSetGetStatus();
      return status && status.ok === 1;
    } catch (error) {
      // If replSetGetStatus fails, it's likely not a replica set
      if (error.codeName === 'NotYetInitialized' || error.code === 94) {
        return false;
      }
      // Other errors might indicate connection issues
      ServiceLogger.error('Error checking replica set status', error);
      return false;
    }
  }

  /**
   * Get replica set configuration info
   * @returns {Promise<Object|null>}
   */
  static async getReplicaSetInfo() {
    try {
      if (!(await this.isReplicaSet())) {
        return null;
      }

      const admin = mongoose.connection.db.admin();
      const config = await admin.replSetGetConfig();
      const status = await admin.replSetGetStatus();

      return {
        name: config.config._id,
        version: config.config.version,
        members: config.config.members.length,
        primary: status.members.find(m => m.stateStr === 'PRIMARY')?.name,
        health: status.members.every(m => m.health === 1)
      };
    } catch (error) {
      ServiceLogger.error('Error getting replica set info', error);
      return null;
    }
  }
}

/**
 * Payment Schedule Generator
 */
class PaymentScheduleGenerator {
  /**
   * Generate payment schedule from InstallmentOrder
   * @param {Object} installmentOrder - InstallmentOrder document
   * @returns {Array} Array of payment schedule objects
   */
  static generateSchedule(installmentOrder) {
    try {
      ServiceLogger.debug('Generating payment schedule', {
        contractNo: installmentOrder.contractNo,
        installmentCount: installmentOrder.installmentCount
      });

      const schedule = [];
      const startDate = new Date(installmentOrder.createdAt);
      const monthlyPayment = installmentOrder.monthlyPayment || 0;
      const installmentCount = installmentOrder.installmentCount || 1;

      for (let i = 1; i <= installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Set due date to the same day of the month, or last day if not available
        const targetDay = startDate.getDate();
        dueDate.setDate(Math.min(targetDay, new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()));

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate,
          amount: monthlyPayment,
          principalAmount: monthlyPayment, // Simplified - could be calculated with interest
          interestAmount: 0,
          penaltyAmount: 0,
          status: 'pending',
          contractId: installmentOrder._id,
          contractNumber: installmentOrder.contractNo
        });
      }

      ServiceLogger.info(`Generated payment schedule with ${schedule.length} installments`, {
        contractNo: installmentOrder.contractNo,
        totalAmount: schedule.reduce((sum, item) => sum + item.amount, 0)
      });

      return schedule;
    } catch (error) {
      ServiceLogger.error('Error generating payment schedule', error);
      throw new Error(`Payment schedule generation failed: ${error.message}`);
    }
  }

  /**
   * Update payment schedule based on actual payments
   * @param {String} contractId - Contract ID
   * @param {Array} payments - Array of InstallmentPayment documents
   * @returns {Array} Updated schedule
   */
  static async updateScheduleWithPayments(contractId, payments) {
    try {
      const installmentOrder = await InstallmentOrder.findById(contractId);
      if (!installmentOrder) {
        throw new Error(`InstallmentOrder not found: ${contractId}`);
      }

      const schedule = this.generateSchedule(installmentOrder);

      // Apply actual payments to schedule
      payments.forEach(payment => {
        const scheduleItem = schedule.find(item => item.installmentNumber === payment.installmentNumber);
        if (scheduleItem) {
          scheduleItem.paidAmount = payment.amount;
          scheduleItem.paidDate = payment.paymentDate;
          scheduleItem.status = payment.status === 'confirmed' ? 'paid' : 'pending';
          scheduleItem.paymentMethod = payment.paymentMethod;
        }
      });

      return schedule;
    } catch (error) {
      ServiceLogger.error('Error updating schedule with payments', error);
      throw error;
    }
  }
}

/**
 * Contract Synchronization Service
 */
class ContractSyncService {
  /**
   * Create or update Contract from InstallmentOrder
   * @param {Object} installmentOrder - InstallmentOrder document
   * @param {Object} session - MongoDB transaction session (optional)
   * @returns {Promise<Object>} Contract document
   */
  static async upsertContractFromInstallmentOrder(installmentOrder, session = null) {
    try {
      ServiceLogger.info('Upserting contract from installment order', {
        installmentOrderId: installmentOrder._id,
        contractNo: installmentOrder.contractNo
      });

      const contractData = {
        customer_id: installmentOrder.customer,
        contract_number: installmentOrder.contractNo,
        start_date: installmentOrder.createdAt,
        total_amount: installmentOrder.finalTotalAmount || installmentOrder.totalAmount,
        penalty_fee: 0, // Could be calculated based on business rules
        status: this._mapInstallmentStatusToContractStatus(installmentOrder.status)
      };

      // Check if contract already exists
      let contract = await Contract.findOne({
        contract_number: installmentOrder.contractNo,
        deleted_at: null
      }).session(session);

      if (contract) {
        // Update existing contract
        Object.assign(contract, contractData);
        contract = await contract.save({ session });
        ServiceLogger.info('Contract updated successfully', { contractId: contract._id });
      } else {
        // Create new contract
        const [newContract] = await Contract.create([contractData], { session });
        contract = newContract;
        ServiceLogger.info('Contract created successfully', { contractId: contract._id });
      }

      return contract;
    } catch (error) {
      ServiceLogger.error('Error upserting contract from installment order', error);
      throw new Error(`Contract upsert failed: ${error.message}`);
    }
  }

  /**
   * Map InstallmentOrder status to Contract status
   * @param {String} installmentStatus
   * @returns {String} Contract status
   */
  static _mapInstallmentStatusToContractStatus(installmentStatus) {
    const statusMap = {
      'pending': 'pending',
      'approved': 'active',
      'active': 'active',
      'ongoing': 'active',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'rejected': 'cancelled'
    };

    return statusMap[installmentStatus] || 'active';
  }

  /**
   * Reconcile payments between InstallmentPayment and Contract
   * @param {String} contractNumber - Contract number
   * @param {Object} session - MongoDB transaction session (optional)
   * @returns {Promise<Object>} Reconciliation result
   */
  static async reconcileContract(contractNumber, session = null) {
    try {
      ServiceLogger.info('Starting contract reconciliation', { contractNumber });

      // Find contract
      const contract = await Contract.findOne({
        contract_number: contractNumber,
        deleted_at: null
      }).session(session);

      if (!contract) {
        throw new Error(`Contract not found: ${contractNumber}`);
      }

      // Find installment order
      const installmentOrder = await InstallmentOrder.findOne({
        contractNo: contractNumber,
        deleted_at: null
      }).session(session);

      if (!installmentOrder) {
        throw new Error(`InstallmentOrder not found for contract: ${contractNumber}`);
      }

      // Get all payments for this contract
      const installmentPayments = await InstallmentPayment.find({
        contractNumber: contractNumber,
        status: 'confirmed'
      }).sort({ installmentNumber: 1 }).session(session);

      // Calculate totals
      const totalPaid = installmentPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const contractTotal = contract.total_amount;
      const remainingAmount = Math.max(0, contractTotal - totalPaid);

      // Update contract payment status
      contract.paid_amount = totalPaid;
      contract.remaining_amount = remainingAmount;
      contract.payment_status = this._calculatePaymentStatus(totalPaid, contractTotal);

      if (remainingAmount === 0) {
        contract.status = 'completed';
        contract.end_date = new Date();
      }

      await contract.save({ session });

      // Update installment order
      installmentOrder.paidAmount = totalPaid;
      await installmentOrder.save({ session });

      // Sync contract payment logs
      await this._syncContractPaymentLogs(contract._id, installmentPayments, session);

      const result = {
        contractId: contract._id,
        contractNumber,
        totalAmount: contractTotal,
        paidAmount: totalPaid,
        remainingAmount,
        paymentStatus: contract.payment_status,
        paymentsCount: installmentPayments.length,
        lastPaymentDate: installmentPayments.length > 0 ?
          installmentPayments[installmentPayments.length - 1].paymentDate : null
      };

      ServiceLogger.info('Contract reconciliation completed', result);
      return result;

    } catch (error) {
      ServiceLogger.error('Error reconciling contract', error);
      throw new Error(`Contract reconciliation failed: ${error.message}`);
    }
  }

  /**
   * Calculate payment status based on amounts
   * @param {Number} paidAmount
   * @param {Number} totalAmount
   * @returns {String} Payment status
   */
  static _calculatePaymentStatus(paidAmount, totalAmount) {
    if (paidAmount >= totalAmount) {
      return 'fully_paid';
    } else if (paidAmount > 0) {
      return 'partially_paid';
    } else {
      return 'unpaid';
    }
  }

  /**
   * Synchronize contract payment logs from installment payments
   * @param {ObjectId} contractId
   * @param {Array} installmentPayments
   * @param {Object} session
   */
  static async _syncContractPaymentLogs(contractId, installmentPayments, session) {
    try {
      // Delete existing payment logs for this contract
      await ContractPaymentLog.deleteMany({ contract_id: contractId }, { session });

      // Create new payment logs from installment payments
      const paymentLogs = installmentPayments.map(payment => ({
        contract_id: contractId,
        payment_date: payment.paymentDate,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        reference_number: payment.paymentId,
        installment_number: payment.installmentNumber,
        notes: payment.notes || `Payment for installment ${payment.installmentNumber}`,
        recorded_by: payment.recordedBy,
        branch_code: payment.branchCode,
        status: 'confirmed'
      }));

      if (paymentLogs.length > 0) {
        await ContractPaymentLog.create(paymentLogs, { session });
        ServiceLogger.debug(`Created ${paymentLogs.length} contract payment logs`);
      }
    } catch (error) {
      ServiceLogger.error('Error syncing contract payment logs', error);
      throw error;
    }
  }
}

/**
 * Change Stream Watcher for real-time synchronization
 * Note: Requires MongoDB replica set to function
 */
class ChangeStreamWatcher {
  constructor() {
    this.installmentOrderWatcher = null;
    this.installmentPaymentWatcher = null;
    this.contractWatcher = null;
    this.isWatching = false;
  }

  /**
   * Start watching for changes in InstallmentOrder and InstallmentPayment collections
   * @returns {Promise<void>}
   */
  async startWatching() {
    try {
      // Check if replica set is available
      const isReplicaSet = await ReplicaSetChecker.isReplicaSet();
      if (!isReplicaSet) {
        ServiceLogger.warn('MongoDB replica set not detected. Change streams require replica set configuration.');
        ServiceLogger.info('To enable change streams:');
        ServiceLogger.info('1. Convert standalone MongoDB to replica set');
        ServiceLogger.info('2. Or use MongoDB Atlas (cloud) which provides replica sets by default');
        ServiceLogger.info('3. For development, you can start MongoDB with: mongod --replSet rs0');
        ServiceLogger.info('4. Then initialize with: rs.initiate() in MongoDB shell');
        return;
      }

      const replicaInfo = await ReplicaSetChecker.getReplicaSetInfo();
      ServiceLogger.info('Starting change stream watchers', replicaInfo);

      // Watch InstallmentOrder changes
      this.installmentOrderWatcher = InstallmentOrder.watch([
        { $match: { 'operationType': { $in: ['insert', 'update', 'replace'] } } }
      ]);

      this.installmentOrderWatcher.on('change', async (change) => {
        try {
          await this._handleInstallmentOrderChange(change);
        } catch (error) {
          ServiceLogger.error('Error handling InstallmentOrder change', error);
        }
      });

      // Watch InstallmentPayment changes
      this.installmentPaymentWatcher = InstallmentPayment.watch([
        { $match: { 'operationType': { $in: ['insert', 'update', 'replace'] } } }
      ]);

      this.installmentPaymentWatcher.on('change', async (change) => {
        try {
          await this._handleInstallmentPaymentChange(change);
        } catch (error) {
          ServiceLogger.error('Error handling InstallmentPayment change', error);
        }
      });

      // Watch Contract changes
      this.contractWatcher = Contract.watch([
        { $match: { 'operationType': { $in: ['insert', 'update', 'replace'] } } }
      ]);

      this.contractWatcher.on('change', async (change) => {
        try {
          await this._handleContractChange(change);
        } catch (error) {
          ServiceLogger.error('Error handling Contract change', error);
        }
      });

      this.isWatching = true;
      ServiceLogger.info('Change stream watchers started successfully');

    } catch (error) {
      ServiceLogger.error('Error starting change stream watchers', error);
      throw error;
    }
  }

  /**
   * Stop watching for changes
   */
  async stopWatching() {
    try {
      if (this.installmentOrderWatcher) {
        await this.installmentOrderWatcher.close();
        this.installmentOrderWatcher = null;
      }

      if (this.installmentPaymentWatcher) {
        await this.installmentPaymentWatcher.close();
        this.installmentPaymentWatcher = null;
      }

      if (this.contractWatcher) {
        await this.contractWatcher.close();
        this.contractWatcher = null;
      }

      this.isWatching = false;
      ServiceLogger.info('Change stream watchers stopped');
    } catch (error) {
      ServiceLogger.error('Error stopping change stream watchers', error);
    }
  }

  /**
   * Handle InstallmentOrder changes
   * @param {Object} change - Change stream event
   */
  async _handleInstallmentOrderChange(change) {
    ServiceLogger.debug('InstallmentOrder change detected', {
      operationType: change.operationType,
      documentId: change.documentKey?._id
    });

    if (change.operationType === 'insert' || change.operationType === 'update') {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          let installmentOrder;

          if (change.fullDocument) {
            installmentOrder = change.fullDocument;
          } else {
            installmentOrder = await InstallmentOrder.findById(change.documentKey._id).session(session);
          }

          if (installmentOrder && installmentOrder.contractNo) {
            // Sync contract from installment order
            await ContractSyncService.upsertContractFromInstallmentOrder(installmentOrder, session);

            // Reconcile payments
            await ContractSyncService.reconcileContract(installmentOrder.contractNo, session);
          }
        });

        ServiceLogger.info('InstallmentOrder change processed successfully');
      } catch (error) {
        ServiceLogger.error('Error processing InstallmentOrder change', error);
      } finally {
        await session.endSession();
      }
    }
  }

  /**
   * Handle InstallmentPayment changes
   * @param {Object} change - Change stream event
   */
  async _handleInstallmentPaymentChange(change) {
    ServiceLogger.debug('InstallmentPayment change detected', {
      operationType: change.operationType,
      documentId: change.documentKey?._id
    });

    if (change.operationType === 'insert' || change.operationType === 'update') {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          let installmentPayment;

          if (change.fullDocument) {
            installmentPayment = change.fullDocument;
          } else {
            installmentPayment = await InstallmentPayment.findById(change.documentKey._id).session(session);
          }

          if (installmentPayment && installmentPayment.contractNumber) {
            // Reconcile contract payments
            await ContractSyncService.reconcileContract(installmentPayment.contractNumber, session);
          }
        });

        ServiceLogger.info('InstallmentPayment change processed successfully');
      } catch (error) {
        ServiceLogger.error('Error processing InstallmentPayment change', error);
      } finally {
        await session.endSession();
      }
    }
  }

  /**
   * Handle Contract changes (for logging purposes)
   * @param {Object} change - Change stream event
   */
  async _handleContractChange(change) {
    ServiceLogger.debug('Contract change detected', {
      operationType: change.operationType,
      documentId: change.documentKey?._id
    });

    // This could be used for audit logging or triggering other business processes
  }

  /**
   * Get watching status
   * @returns {Boolean}
   */
  getWatchingStatus() {
    return this.isWatching;
  }
}

/**
 * Main Loan Synchronization Service
 */
class LoanSyncService {
  constructor() {
    this.changeStreamWatcher = new ChangeStreamWatcher();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      ServiceLogger.info('Initializing Loan Synchronization Service');

      // Check MongoDB replica set status
      const isReplicaSet = await ReplicaSetChecker.isReplicaSet();
      if (isReplicaSet) {
        const replicaInfo = await ReplicaSetChecker.getReplicaSetInfo();
        ServiceLogger.info('MongoDB replica set detected', replicaInfo);
      } else {
        ServiceLogger.warn('MongoDB replica set not detected - Change streams will not be available');
      }

      ServiceLogger.info('Loan Synchronization Service initialized');
    } catch (error) {
      ServiceLogger.error('Error initializing Loan Synchronization Service', error);
      throw error;
    }
  }

  /**
   * Generate payment schedule from InstallmentOrder
   * @param {String|Object} installmentOrderId - InstallmentOrder ID or document
   * @returns {Promise<Array>} Payment schedule
   */
  async generateSchedule(installmentOrderId) {
    try {
      let installmentOrder;

      if (typeof installmentOrderId === 'string') {
        installmentOrder = await InstallmentOrder.findById(installmentOrderId);
        if (!installmentOrder) {
          throw new Error(`InstallmentOrder not found: ${installmentOrderId}`);
        }
      } else {
        installmentOrder = installmentOrderId;
      }

      return PaymentScheduleGenerator.generateSchedule(installmentOrder);
    } catch (error) {
      ServiceLogger.error('Error generating payment schedule', error);
      throw error;
    }
  }

  /**
   * Create or update Contract from InstallmentOrder
   * @param {String} installmentOrderId - InstallmentOrder ID
   * @returns {Promise<Object>} Contract document
   */
  async upsertContractFromInstallmentOrder(installmentOrderId) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const installmentOrder = await InstallmentOrder.findById(installmentOrderId).session(session);
        if (!installmentOrder) {
          throw new Error(`InstallmentOrder not found: ${installmentOrderId}`);
        }

        return await ContractSyncService.upsertContractFromInstallmentOrder(installmentOrder, session);
      });
    } catch (error) {
      ServiceLogger.error('Error upserting contract', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Reconcile payments between InstallmentPayment and Contract
   * @param {String} contractNumber - Contract number
   * @returns {Promise<Object>} Reconciliation result
   */
  async reconcileContract(contractNumber) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        return await ContractSyncService.reconcileContract(contractNumber, session);
      });
    } catch (error) {
      ServiceLogger.error('Error reconciling contract', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Start change stream monitoring
   * @returns {Promise<void>}
   */
  async startChangeStreamWatcher() {
    return await this.changeStreamWatcher.startWatching();
  }

  /**
   * Stop change stream monitoring
   * @returns {Promise<void>}
   */
  async stopChangeStreamWatcher() {
    return await this.changeStreamWatcher.stopWatching();
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  async getStatus() {
    const isReplicaSet = await ReplicaSetChecker.isReplicaSet();
    const replicaInfo = await ReplicaSetChecker.getReplicaSetInfo();

    return {
      isInitialized: true,
      mongodb: {
        isReplicaSet,
        replicaSetInfo: replicaInfo
      },
      changeStreams: {
        isWatching: this.changeStreamWatcher.getWatchingStatus(),
        available: isReplicaSet
      },
      timestamp: new Date()
    };
  }

  /**
   * Perform full synchronization of all contracts
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async performFullSync(options = {}) {
    try {
      ServiceLogger.info('Starting full contract synchronization');

      const {
        batchSize = 100,
        skipReconciliation = false,
        onlyActive = true
      } = options;

      const query = { deleted_at: null };
      if (onlyActive) {
        query.status = { $in: ['approved', 'active', 'ongoing'] };
      }

      const totalCount = await InstallmentOrder.countDocuments(query);
      let processed = 0;
      let errors = 0;
      let syncResults = [];

      ServiceLogger.info(`Found ${totalCount} installment orders to sync`);

      // Process in batches to avoid memory issues
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const installmentOrders = await InstallmentOrder.find(query)
          .skip(skip)
          .limit(batchSize)
          .select('_id contractNo customer totalAmount status');

        for (const installmentOrder of installmentOrders) {
          try {
            // Upsert contract
            const contract = await this.upsertContractFromInstallmentOrder(installmentOrder._id);

            // Reconcile payments if not skipped
            let reconcileResult = null;
            if (!skipReconciliation && installmentOrder.contractNo) {
              reconcileResult = await this.reconcileContract(installmentOrder.contractNo);
            }

            syncResults.push({
              installmentOrderId: installmentOrder._id,
              contractId: contract._id,
              contractNumber: installmentOrder.contractNo,
              success: true,
              reconcileResult
            });

            processed++;

            if (processed % 50 === 0) {
              ServiceLogger.info(`Processed ${processed}/${totalCount} contracts`);
            }

          } catch (error) {
            ServiceLogger.error(`Error syncing contract ${installmentOrder.contractNo}`, error);
            errors++;

            syncResults.push({
              installmentOrderId: installmentOrder._id,
              contractNumber: installmentOrder.contractNo,
              success: false,
              error: error.message
            });
          }
        }
      }

      const result = {
        totalCount,
        processed,
        errors,
        successCount: processed - errors,
        results: syncResults.slice(0, 100) // Return first 100 results to avoid large responses
      };

      ServiceLogger.info('Full synchronization completed', {
        totalCount: result.totalCount,
        processed: result.processed,
        errors: result.errors,
        successRate: `${((result.successCount / result.totalCount) * 100).toFixed(2)}%`
      });

      return result;

    } catch (error) {
      ServiceLogger.error('Error performing full sync', error);
      throw error;
    }
  }
}

// Export the service and utility classes
module.exports = {
  LoanSyncService,
  PaymentScheduleGenerator,
  ContractSyncService,
  ChangeStreamWatcher,
  ReplicaSetChecker,
  ServiceLogger
};

// Export a default instance for convenience
module.exports.default = new LoanSyncService();