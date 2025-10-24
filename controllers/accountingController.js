const mongoose = require('mongoose');
const DepositReceiptLegacy = require('../models/DepositReceipt');

class AccountingController {

  /**
   * Create accounting entries for deposit receipt
   * POST /api/accounting/deposit-receipt/:id/entries
   */
  static async createDepositReceiptEntries(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceiptLegacy.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      // Create accounting entries
      const entries = depositReceipt.createAccountingEntries();
      await depositReceipt.save();

      res.json({
        success: true,
        data: entries,
        message: 'สร้างรายการบัญชีสำเร็จ'
      });
    } catch (error) {
      console.error('Error creating deposit receipt entries:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างรายการบัญชี',
        message: error.message
      });
    }
  }

  /**
   * Reverse accounting entries for deposit receipt when completing sale
   * POST /api/accounting/deposit-receipt/:id/reverse-entries
   */
  static async reverseDepositReceiptEntries(req, res) {
    try {
      const { id } = req.params;
      const { saleAmount } = req.body;

      const depositReceipt = await DepositReceiptLegacy.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      // Create reversal entries for completing the sale
      const reversalEntries = [
        // Reverse advance revenue (Debit)
        {
          account: '2030', // รายได้รับล่วงหน้า
          accountName: 'รายได้รับล่วงหน้า',
          debit: depositReceipt.amounts.depositAmount,
          credit: 0,
          description: `หักล้างรายได้รับล่วงหน้า ${depositReceipt.documentNumber}`
        },
        // Record actual sales revenue (Credit)
        {
          account: '4010', // รายได้จากการขาย
          accountName: 'รายได้จากการขาย',
          debit: 0,
          credit: saleAmount || depositReceipt.amounts.totalAmount,
          description: `รายได้จากการขาย ${depositReceipt.documentNumber}`
        }
      ];

      // If there's remaining amount to be paid
      const remainingAmount = (saleAmount || depositReceipt.amounts.totalAmount) - depositReceipt.amounts.depositAmount;
      if (remainingAmount > 0) {
        reversalEntries.push({
          account: '1010', // เงินสด
          accountName: 'เงินสด',
          debit: remainingAmount,
          credit: 0,
          description: `รับเงินส่วนที่เหลือ ${depositReceipt.documentNumber}`
        });
      }

      // Add reversal entries to deposit receipt
      depositReceipt.accountingEntries.push(...reversalEntries);
      await depositReceipt.save();

      res.json({
        success: true,
        data: reversalEntries,
        message: 'หักล้างรายการบัญชีสำเร็จ'
      });
    } catch (error) {
      console.error('Error reversing deposit receipt entries:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการหักล้างรายการบัญชี',
        message: error.message
      });
    }
  }

  /**
   * Get all accounting entries for a deposit receipt
   * GET /api/accounting/deposit-receipt/:id/entries
   */
  static async getDepositReceiptEntries(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: depositReceipt.accountingEntries,
        summary: {
          totalDebits: depositReceipt.accountingEntries.reduce((sum, entry) => sum + entry.debit, 0),
          totalCredits: depositReceipt.accountingEntries.reduce((sum, entry) => sum + entry.credit, 0),
          isBalanced: depositReceipt.accountingEntries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0) === 0
        }
      });
    } catch (error) {
      console.error('Error getting deposit receipt entries:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดรายการบัญชี',
        message: error.message
      });
    }
  }

  /**
   * Generate journal entries report for a date range
   * GET /api/accounting/journal-entries
   */
  static async getJournalEntries(req, res) {
    try {
      const {
        startDate,
        endDate,
        branchCode,
        account,
        page = 1,
        limit = 50
      } = req.query;

      const filter = {};

      if (branchCode) {
        filter.branchCode = branchCode;
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Get deposit receipts with accounting entries
      const depositReceipts = await DepositReceipt.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Flatten all accounting entries
      const journalEntries = [];

      depositReceipts.forEach(receipt => {
        receipt.accountingEntries.forEach(entry => {
          // Filter by account if specified
          if (account && entry.account !== account) {
            return;
          }

          journalEntries.push({
            ...entry.toObject(),
            documentNumber: receipt.documentNumber,
            documentDate: receipt.documentDate,
            customerName: receipt.customer.name,
            branchCode: receipt.branchCode,
            depositReceiptId: receipt._id
          });
        });
      });

      // Calculate totals
      const totals = journalEntries.reduce((acc, entry) => {
        acc.totalDebits += entry.debit;
        acc.totalCredits += entry.credit;
        return acc;
      }, { totalDebits: 0, totalCredits: 0 });

      const total = await DepositReceipt.countDocuments(filter);

      res.json({
        success: true,
        data: journalEntries,
        totals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting journal entries:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดรายการสมุดรายวัน',
        message: error.message
      });
    }
  }

  /**
   * Get account balance for specific account
   * GET /api/accounting/account-balance/:accountCode
   */
  static async getAccountBalance(req, res) {
    try {
      const { accountCode } = req.params;
      const { branchCode, startDate, endDate } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const depositReceipts = await DepositReceipt.find(filter);

      let totalDebits = 0;
      let totalCredits = 0;
      let entryCount = 0;

      depositReceipts.forEach(receipt => {
        receipt.accountingEntries.forEach(entry => {
          if (entry.account === accountCode) {
            totalDebits += entry.debit;
            totalCredits += entry.credit;
            entryCount++;
          }
        });
      });

      const balance = totalDebits - totalCredits;

      res.json({
        success: true,
        data: {
          accountCode,
          totalDebits,
          totalCredits,
          balance,
          entryCount,
          accountType: AccountingController._getAccountType(accountCode)
        }
      });
    } catch (error) {
      console.error('Error getting account balance:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดยอดคงเหลือบัญชี',
        message: error.message
      });
    }
  }

  /**
   * Get trial balance for all accounts
   * GET /api/accounting/trial-balance
   */
  static async getTrialBalance(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const depositReceipts = await DepositReceipt.find(filter);

      const accounts = {};

      depositReceipts.forEach(receipt => {
        receipt.accountingEntries.forEach(entry => {
          if (!accounts[entry.account]) {
            accounts[entry.account] = {
              accountCode: entry.account,
              accountName: entry.accountName,
              totalDebits: 0,
              totalCredits: 0,
              balance: 0,
              accountType: AccountingController._getAccountType(entry.account)
            };
          }

          accounts[entry.account].totalDebits += entry.debit;
          accounts[entry.account].totalCredits += entry.credit;
          accounts[entry.account].balance = accounts[entry.account].totalDebits - accounts[entry.account].totalCredits;
        });
      });

      const trialBalance = Object.values(accounts).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      const totals = trialBalance.reduce((acc, account) => {
        acc.totalDebits += account.totalDebits;
        acc.totalCredits += account.totalCredits;
        return acc;
      }, { totalDebits: 0, totalCredits: 0 });

      res.json({
        success: true,
        data: trialBalance,
        totals,
        isBalanced: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01
      });
    } catch (error) {
      console.error('Error getting trial balance:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดงบทดลอง',
        message: error.message
      });
    }
  }

  // Helper method to determine account type
  static _getAccountType(accountCode) {
    const code = accountCode.toString();

    if (code.startsWith('1')) return 'asset'; // สินทรัพย์
    if (code.startsWith('2')) return 'liability'; // หนี้สิน
    if (code.startsWith('3')) return 'equity'; // ทุน
    if (code.startsWith('4')) return 'revenue'; // รายได้
    if (code.startsWith('5')) return 'expense'; // ค่าใช้จ่าย

    return 'other';
  }
}

module.exports = AccountingController;