/**
 * Accounting Service for Installment System
 * Handles journal entries, accounts receivable, and financial transactions
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const JournalEntry = require('../models/Account/JournalEntry');
const ChartOfAccount = require('../models/Account/ChartOfAccount');

class AccountingService {

  /**
   * Get or create account ID for chart of accounts
   * @param {string} accountCode - Account code
   * @param {string} accountName - Account name
   */
  static async getOrCreateAccountId(accountCode, accountName) {
    try {
      // First try to find existing account
      let account = await ChartOfAccount.findOne({
        $or: [
          { code: accountCode },
          { name: accountName }
        ]
      });

      if (!account) {
        // Create basic account mapping if not exists
        const accountTypeMapping = {
          'accounts_receivable_installment': { type: 'Asset', category: 'Asset' },
          'sales_revenue_installment': { type: 'Income', category: 'Income' },
          'unearned_interest_income': { type: 'Liabilities', category: 'Liabilities' },
          'cash_on_hand': { type: 'Asset', category: 'Asset' },
          'bank_account': { type: 'Asset', category: 'Asset' },
          'interest_income': { type: 'Income', category: 'Income' },
          'penalty_income': { type: 'Income', category: 'Income' }
        };

        const accountConfig = accountTypeMapping[accountCode] || { type: 'Asset', category: 'Asset' };

        account = new ChartOfAccount({
          code: accountCode,
          name: accountName,
          type: accountConfig.type,
          category: accountConfig.category,
          level: 2,
          isMainCategory: false,
          isActive: true
        });

        await account.save();
        console.log(`📊 Created new chart account: ${accountCode} - ${accountName}`);
      }

      return account._id;
    } catch (error) {
      console.error('Error getting/creating account:', error);
      // Return a default account ID or null
      return null;
    }
  }

  /**
   * Create journal entry for installment contract creation
   * @param {Object} contractData - Contract information
   * @param {Object} session - MongoDB session for transaction
   */
  static async createContractJournalEntry(contractData, session = null) {
    try {
      const {
        contractId,
        contractNo,
        totalAmount,
        downPayment,
        financeAmount,
        branchCode
      } = contractData;

      // Journal entries for new installment contract
      const entries = [
        {
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: totalAmount,
          credit: 0,
          description: `สัญญาผ่อนใหม่ ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        {
          account: 'sales_revenue_installment',
          accountName: 'รายได้จากการขายผ่อน',
          debit: 0,
          credit: totalAmount - financeAmount,
          description: `รายได้จากการขายผ่อน ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        {
          account: 'unearned_interest_income',
          accountName: 'รายได้ดอกเบี้ยรอตัดบัญชี',
          debit: 0,
          credit: financeAmount,
          description: `ดอกเบี้ยรอตัดบัญชี ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        }
      ];

      // If down payment received
      if (downPayment > 0) {
        entries.push({
          account: 'cash_on_hand',
          accountName: 'เงินสดในมือ',
          debit: downPayment,
          credit: 0,
          description: `รับชำระเงินดาวน์ ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });

        entries.push({
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: 0,
          credit: downPayment,
          description: `ตัดลูกหนี้เงินดาวน์ ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });
      }

      // Find or create chart of accounts entries
      const journalLines = [];
      for (const entry of entries) {
        // Find account by code/name or create basic mapping
        let accountId = await this.getOrCreateAccountId(entry.account, entry.accountName);

        journalLines.push({
          account_id: accountId,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          description: entry.description
        });
      }

      const journalEntry = new JournalEntry({
        date: new Date(),
        reference: contractNo,
        memo: `สัญญาผ่อนใหม่ ${contractNo}`,
        lines: journalLines,
        posted: true
      });

      await journalEntry.save({ session });

      console.log('📊 Created contract journal entry:', journalEntry._id);
      return journalEntry;

    } catch (error) {
      console.error('❌ Error creating contract journal entry:', error);
      throw new Error(`Failed to create contract journal entry: ${error.message}`);
    }
  }

  /**
   * Create journal entry for payment received
   * @param {Object} paymentData - Payment information
   * @param {Object} session - MongoDB session for transaction
   */
  static async createPaymentJournalEntry(paymentData, session = null) {
    try {
      const {
        contractId,
        contractNo,
        paymentAmount,
        principalAmount,
        interestAmount,
        paymentMethod,
        branchCode,
        createdBy
      } = paymentData;

      const entries = [
        // Cash received
        {
          account: paymentMethod === 'cash' ? 'cash_on_hand' : 'bank_account',
          accountName: paymentMethod === 'cash' ? 'เงินสดในมือ' : 'เงินฝากธนาคาร',
          debit: paymentAmount,
          credit: 0,
          description: `รับชำระงวดที่ ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        // Reduce accounts receivable
        {
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: 0,
          credit: principalAmount,
          description: `ตัดลูกหนี้เงินต้น ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        // Recognize interest income
        {
          account: 'unearned_interest_income',
          accountName: 'รายได้ดอกเบี้ยรอตัดบัญชี',
          debit: interestAmount,
          credit: 0,
          description: `ตัดรายได้ดอกเบี้ยรอตัดบัญชี ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        {
          account: 'interest_income',
          accountName: 'รายได้ดอกเบี้ย',
          debit: 0,
          credit: interestAmount,
          description: `รับรู้รายได้ดอกเบี้ย ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        }
      ];

      // Create journal lines
      const journalLines = [];
      for (const entry of entries) {
        let accountId = await this.getOrCreateAccountId(entry.account, entry.accountName);

        journalLines.push({
          account_id: accountId,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          description: entry.description
        });
      }

      const journalEntry = new JournalEntry({
        date: new Date(),
        reference: contractNo,
        memo: `รับชำระงวดที่ ${contractNo}`,
        lines: journalLines,
        posted: true
      });

      await journalEntry.save({ session });

      console.log('📊 Created payment journal entry:', journalEntry._id);
      return journalEntry;

    } catch (error) {
      console.error('❌ Error creating payment journal entry:', error);
      throw new Error(`Failed to create payment journal entry: ${error.message}`);
    }
  }

  /**
   * Create journal entry for refund processing
   * @param {Object} refundData - Refund information
   * @param {Object} session - MongoDB session for transaction
   */
  static async createRefundJournalEntry(refundData, session = null) {
    try {
      const {
        contractId,
        contractNo,
        refundAmount,
        refundReason,
        paymentMethod,
        branchCode,
        createdBy
      } = refundData;

      const entries = [
        // Increase accounts receivable (reverse previous payment)
        {
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: refundAmount,
          credit: 0,
          description: `คืนเงิน: ${refundReason} - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        // Reduce cash/bank
        {
          account: paymentMethod === 'cash' ? 'cash_on_hand' : 'bank_account',
          accountName: paymentMethod === 'cash' ? 'เงินสดในมือ' : 'เงินฝากธนาคาร',
          debit: 0,
          credit: refundAmount,
          description: `จ่ายเงินคืน: ${refundReason} - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        }
      ];

      // Create journal lines
      const journalLines = [];
      for (const entry of entries) {
        let accountId = await this.getOrCreateAccountId(entry.account, entry.accountName);

        journalLines.push({
          account_id: accountId,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          description: entry.description
        });
      }

      const journalEntry = new JournalEntry({
        date: new Date(),
        reference: contractNo,
        memo: `คืนเงิน: ${refundReason} - ${contractNo}`,
        lines: journalLines,
        posted: true
      });

      await journalEntry.save({ session });

      console.log('📊 Created refund journal entry:', journalEntry._id);
      return journalEntry;

    } catch (error) {
      console.error('❌ Error creating refund journal entry:', error);
      throw new Error(`Failed to create refund journal entry: ${error.message}`);
    }
  }

  /**
   * Create journal entry for contract cancellation
   * @param {Object} cancellationData - Cancellation information
   * @param {Object} session - MongoDB session for transaction
   */
  static async createCancellationJournalEntry(cancellationData, session = null) {
    try {
      const {
        contractId,
        contractNo,
        cancellationReason,
        remainingBalance,
        refundAmount,
        branchCode,
        createdBy
      } = cancellationData;

      const entries = [];

      // Reverse remaining receivables
      if (remainingBalance > 0) {
        entries.push({
          account: 'sales_revenue_installment',
          accountName: 'รายได้จากการขายผ่อน',
          debit: remainingBalance,
          credit: 0,
          description: `ยกเลิกสัญญา: ${cancellationReason} - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });

        entries.push({
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: 0,
          credit: remainingBalance,
          description: `ตัดลูกหนี้ยกเลิกสัญญา - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });
      }

      // Process refund if applicable
      if (refundAmount > 0) {
        entries.push({
          account: 'cash_on_hand',
          accountName: 'เงินสดในมือ',
          debit: 0,
          credit: refundAmount,
          description: `จ่ายเงินคืนจากการยกเลิก - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });

        entries.push({
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: refundAmount,
          credit: 0,
          description: `เพิ่มลูกหนี้เงินคืน - ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        });
      }

      if (entries.length > 0) {
        // Create journal lines
        const journalLines = [];
        for (const entry of entries) {
          let accountId = await this.getOrCreateAccountId(entry.account, entry.accountName);

          journalLines.push({
            account_id: accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            description: entry.description
          });
        }

        const journalEntry = new JournalEntry({
          date: new Date(),
          reference: contractNo,
          memo: `ยกเลิกสัญญา: ${cancellationReason} - ${contractNo}`,
          lines: journalLines,
          posted: true
        });

        await journalEntry.save({ session });

        console.log('📊 Created cancellation journal entry:', journalEntry._id);
        return journalEntry;
      }

      return null;

    } catch (error) {
      console.error('❌ Error creating cancellation journal entry:', error);
      throw new Error(`Failed to create cancellation journal entry: ${error.message}`);
    }
  }

  /**
   * Create journal entry for late payment penalties
   * @param {Object} penaltyData - Penalty information
   * @param {Object} session - MongoDB session for transaction
   */
  static async createPenaltyJournalEntry(penaltyData, session = null) {
    try {
      const {
        contractId,
        contractNo,
        penaltyAmount,
        branchCode,
        createdBy
      } = penaltyData;

      const entries = [
        // Increase accounts receivable for penalty
        {
          account: 'accounts_receivable_installment',
          accountName: 'ลูกหนี้การขายผ่อน',
          debit: penaltyAmount,
          credit: 0,
          description: `ค่าปรับชำระล่าช้า ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        },
        // Recognize penalty income
        {
          account: 'penalty_income',
          accountName: 'รายได้ค่าปรับ',
          debit: 0,
          credit: penaltyAmount,
          description: `รายได้ค่าปรับชำระล่าช้า ${contractNo}`,
          contractId: contractId,
          branchCode: branchCode
        }
      ];

      // Create journal lines
      const journalLines = [];
      for (const entry of entries) {
        let accountId = await this.getOrCreateAccountId(entry.account, entry.accountName);

        journalLines.push({
          account_id: accountId,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          description: entry.description
        });
      }

      const journalEntry = new JournalEntry({
        date: new Date(),
        reference: contractNo,
        memo: `ค่าปรับชำระล่าช้า ${contractNo}`,
        lines: journalLines,
        posted: true
      });

      await journalEntry.save({ session });

      console.log('📊 Created penalty journal entry:', journalEntry._id);
      return journalEntry;

    } catch (error) {
      console.error('❌ Error creating penalty journal entry:', error);
      throw new Error(`Failed to create penalty journal entry: ${error.message}`);
    }
  }

  /**
   * Get accounting summary for installment operations
   * @param {string} branchCode - Branch code
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   */
  static async getAccountingSummary(branchCode, fromDate, toDate) {
    try {
      const matchCriteria = {
        branchCode: branchCode,
        entryDate: {
          $gte: fromDate,
          $lte: toDate
        },
        referenceType: {
          $in: ['installment_contract', 'installment_payment', 'installment_refund', 'installment_cancellation', 'installment_penalty']
        }
      };

      const summary = await JournalEntry.aggregate([
        { $match: matchCriteria },
        { $unwind: '$entries' },
        {
          $group: {
            _id: '$entries.account',
            accountName: { $first: '$entries.accountName' },
            totalDebit: { $sum: '$entries.debit' },
            totalCredit: { $sum: '$entries.credit' },
            netAmount: { $sum: { $subtract: ['$entries.debit', '$entries.credit'] } },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return summary;

    } catch (error) {
      console.error('❌ Error getting accounting summary:', error);
      throw new Error(`Failed to get accounting summary: ${error.message}`);
    }
  }
}

module.exports = AccountingService;