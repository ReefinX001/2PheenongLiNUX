const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema สำหรับบันทึกรายการบัญชีแยกประเภท (Journal Entry)
const journalEntrySchema = new Schema({
  // ประเภทเอกสาร
  documentType: {
    type: String,
    required: true,
    enum: [
      'RV',  // Receipt Voucher - ใบสำคัญรับเงิน
      'PV',  // Payment Voucher - ใบสำคัญจ่ายเงิน
      'JV',  // Journal Voucher - ใบสำคัญทั่วไป
      'INV', // Invoice - ใบแจ้งหนี้
      'CN',  // Credit Note - ใบลดหนี้
      'DN',  // Debit Note - ใบเพิ่มหนี้
      'PO',  // Purchase Order - ใบสั่งซื้อ
      'SO',  // Sales Order - ใบสั่งขาย
      'QT',  // Quotation - ใบเสนอราคา
      'RC',  // Receipt - ใบเสร็จรับเงิน
      'TX',  // Tax Invoice - ใบกำกับภาษี
      'DP',  // Deposit - เงินมัดจำ
      'ST',  // Stock Transfer - โอนย้ายสินค้า
      'ADJ'  // Adjustment - ปรับปรุง
    ],
    index: true
  },

  // Reference to original document
  documentId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'documentModel'
  },

  // Model name for reference
  documentModel: {
    type: String,
    required: true,
    enum: [
      'ReceiptVoucher',
      'PaymentVoucher',
      'Invoice',
      'CreditNote',
      'DebitNote',
      'PurchaseOrder',
      'SalesOrder',
      'Quotation',
      'Receipt',
      'TaxInvoice',
      'Deposit',
      'StockTransfer',
      'Adjustment'
    ]
  },

  // เลขที่เอกสาร
  documentNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // วันที่ทำรายการ
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  // วันที่บันทึกบัญชี (Posting Date)
  postingDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  // รหัสบัญชี
  accountCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // ชื่อบัญชี
  accountName: {
    type: String,
    required: true,
    trim: true
  },

  // ประเภทบัญชี
  accountType: {
    type: String,
    enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
    required: true
  },

  // ยอดเดบิต
  debit: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(value) {
        // ต้องมีค่า debit หรือ credit อย่างใดอย่างหนึ่ง
        return value > 0 || this.credit > 0;
      },
      message: 'รายการต้องมียอด Debit หรือ Credit'
    }
  },

  // ยอดเครดิต
  credit: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(value) {
        // ต้องมีค่า debit หรือ credit อย่างใดอย่างหนึ่ง
        return value > 0 || this.debit > 0;
      },
      message: 'รายการต้องมียอด Debit หรือ Credit'
    }
  },

  // สกุลเงิน
  currency: {
    type: String,
    default: 'THB',
    uppercase: true,
    trim: true
  },

  // อัตราแลกเปลี่ยน
  exchangeRate: {
    type: Number,
    default: 1,
    min: 0
  },

  // ยอดเงินตามสกุลเงินต้นทาง
  originalAmount: {
    debit: {
      type: Number,
      default: 0,
      min: 0
    },
    credit: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // คำอธิบายรายการ
  description: {
    type: String,
    required: true,
    trim: true
  },

  // รายละเอียดเพิ่มเติม
  details: {
    type: String,
    trim: true
  },

  // ข้อมูลการอ้างอิง
  reference: {
    // เลขที่อ้างอิงภายนอก
    externalRef: {
      type: String,
      trim: true
    },
    // ลูกค้า/ผู้จำหน่าย
    partnerId: {
      type: Schema.Types.ObjectId,
      refPath: 'reference.partnerType'
    },
    partnerType: {
      type: String,
      enum: ['Customer', 'Supplier']
    },
    partnerName: {
      type: String,
      trim: true
    },
    // โครงการ
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectName: {
      type: String,
      trim: true
    },
    // แผนก
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    departmentName: {
      type: String,
      trim: true
    },
    // Cost Center
    costCenterId: {
      type: Schema.Types.ObjectId,
      ref: 'CostCenter'
    },
    costCenterName: {
      type: String,
      trim: true
    }
  },

  // ข้อมูลภาษี
  tax: {
    // ประเภทภาษี
    taxType: {
      type: String,
      enum: ['VAT', 'WHT', 'NONE'],
      default: 'NONE'
    },
    // อัตราภาษี
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // ยอดภาษี
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    // เลขที่ใบกำกับภาษี
    taxInvoiceNumber: {
      type: String,
      trim: true
    },
    // วันที่ใบกำกับภาษี
    taxInvoiceDate: {
      type: Date
    }
  },

  // สถานะการ Reverse
  reversal: {
    isReversed: {
      type: Boolean,
      default: false
    },
    reversedDate: {
      type: Date
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reversedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry'
    },
    reversalReason: {
      type: String,
      trim: true
    }
  },

  // การกระทบยอด
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciledDate: {
      type: Date
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    statementRef: {
      type: String,
      trim: true
    }
  },

  // งวดบัญชี
  period: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4
    },
    fiscalYear: {
      type: Number
    }
  },

  // สถานะ
  status: {
    type: String,
    enum: ['draft', 'posted', 'cancelled'],
    default: 'posted',
    index: true
  },

  // การอนุมัติ
  approval: {
    isRequired: {
      type: Boolean,
      default: false
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedDate: {
      type: Date
    },
    approvalNotes: {
      type: String,
      trim: true
    }
  },

  // สาขา
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  // ข้อมูลการสร้างและแก้ไข
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Tags สำหรับการจัดกลุ่ม
  tags: [{
    type: String,
    trim: true
  }],

  // Custom fields
  customFields: {
    type: Map,
    of: Schema.Types.Mixed
  },

  // Audit trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'posted', 'reversed', 'reconciled', 'approved']
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String
    },
    oldValues: {
      type: Map,
      of: Schema.Types.Mixed
    },
    newValues: {
      type: Map,
      of: Schema.Types.Mixed
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes สำหรับ Performance
journalEntrySchema.index({ documentType: 1, documentId: 1 });
journalEntrySchema.index({ transactionDate: -1, accountCode: 1 });
journalEntrySchema.index({ 'period.year': -1, 'period.month': -1 });
journalEntrySchema.index({ branch: 1, status: 1 });
journalEntrySchema.index({ 'reference.partnerId': 1 });
journalEntrySchema.index({ 'reconciliation.isReconciled': 1 });
journalEntrySchema.index({ createdAt: -1 });

// Virtual for account balance impact
journalEntrySchema.virtual('balanceImpact').get(function() {
  const impact = this.debit - this.credit;
  switch(this.accountType) {
    case 'Asset':
    case 'Expense':
      return impact; // Debit increases, Credit decreases
    case 'Liability':
    case 'Equity':
    case 'Income':
      return -impact; // Credit increases, Debit decreases
    default:
      return 0;
  }
});

// Virtual for formatted amounts
journalEntrySchema.virtual('formattedDebit').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: this.currency
  }).format(this.debit);
});

journalEntrySchema.virtual('formattedCredit').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: this.currency
  }).format(this.credit);
});

// Pre-save middleware
journalEntrySchema.pre('save', async function(next) {
  // Validate that only debit or credit has value, not both
  if (this.debit > 0 && this.credit > 0) {
    return next(new Error('รายการไม่สามารถมีทั้ง Debit และ Credit'));
  }

  if (this.debit === 0 && this.credit === 0) {
    return next(new Error('รายการต้องมี Debit หรือ Credit'));
  }

  // Set period based on transaction date
  const date = new Date(this.transactionDate);
  this.period.year = date.getFullYear();
  this.period.month = date.getMonth() + 1;
  this.period.quarter = Math.ceil(this.period.month / 3);

  // Calculate amounts in base currency
  if (this.currency !== 'THB' && this.exchangeRate) {
    this.originalAmount.debit = this.debit;
    this.originalAmount.credit = this.credit;
    this.debit = this.debit * this.exchangeRate;
    this.credit = this.credit * this.exchangeRate;
  }

  // Add to audit log
  if (this.isNew) {
    this.auditLog.push({
      action: 'created',
      performedBy: this.createdBy,
      details: 'Journal entry created'
    });
  }

  next();
});

// Methods
journalEntrySchema.methods = {
  // Reverse entry
  async createReversal(userId, reason) {
    if (this.reversal.isReversed) {
      throw new Error('รายการนี้ถูก reverse แล้ว');
    }

    const ReversalEntry = this.constructor;

    const reversal = new ReversalEntry({
      documentType: this.documentType,
      documentId: this.documentId,
      documentModel: this.documentModel,
      documentNumber: this.documentNumber + '-REV',
      transactionDate: new Date(),
      accountCode: this.accountCode,
      accountName: this.accountName,
      accountType: this.accountType,
      debit: this.credit, // Swap debit/credit
      credit: this.debit,
      currency: this.currency,
      exchangeRate: this.exchangeRate,
      description: `Reversal: ${this.description}`,
      details: reason,
      reference: this.reference,
      branch: this.branch,
      createdBy: userId,
      reversal: {
        reversedFrom: this._id
      },
      status: 'posted'
    });

    await reversal.save();

    // Update original entry
    this.reversal.isReversed = true;
    this.reversal.reversedDate = new Date();
    this.reversal.reversedBy = userId;
    this.reversal.reversalReason = reason;
    this.status = 'cancelled';

    await this.save();

    return reversal;
  },

  // Reconcile entry
  async reconcile(userId, statementRef) {
    if (this.reconciliation.isReconciled) {
      throw new Error('รายการนี้ถูกกระทบยอดแล้ว');
    }

    this.reconciliation.isReconciled = true;
    this.reconciliation.reconciledDate = new Date();
    this.reconciliation.reconciledBy = userId;
    this.reconciliation.statementRef = statementRef;

    this.auditLog.push({
      action: 'reconciled',
      performedBy: userId,
      details: `Reconciled with statement: ${statementRef}`
    });

    return this.save();
  },

  // Approve entry
  async approve(userId, notes) {
    if (!this.approval.isRequired) {
      throw new Error('รายการนี้ไม่ต้องอนุมัติ');
    }

    if (this.approval.isApproved) {
      throw new Error('รายการนี้ถูกอนุมัติแล้ว');
    }

    this.approval.isApproved = true;
    this.approval.approvedBy = userId;
    this.approval.approvedDate = new Date();
    this.approval.approvalNotes = notes;
    this.status = 'posted';

    this.auditLog.push({
      action: 'approved',
      performedBy: userId,
      details: notes || 'Entry approved'
    });

    return this.save();
  }
};

// Statics
journalEntrySchema.statics = {
  // Get trial balance
  async getTrialBalance(filters = {}) {
    const matchStage = {
      status: 'posted',
      'reversal.isReversed': false
    };

    if (filters.startDate || filters.endDate) {
      matchStage.transactionDate = {};
      if (filters.startDate) matchStage.transactionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.transactionDate.$lte = new Date(filters.endDate);
    }

    if (filters.branch) {
      matchStage.branch = new mongoose.Types.ObjectId(filters.branch);
    }

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            accountCode: '$accountCode',
            accountName: '$accountName',
            accountType: '$accountType'
          },
          debit: { $sum: '$debit' },
          credit: { $sum: '$credit' }
        }
      },
      {
        $project: {
          accountCode: '$_id.accountCode',
          accountName: '$_id.accountName',
          accountType: '$_id.accountType',
          debit: 1,
          credit: 1,
          balance: { $subtract: ['$debit', '$credit'] }
        }
      },
      { $sort: { accountCode: 1 } }
    ]);
  },

  // Get account ledger
  async getAccountLedger(accountCode, filters = {}) {
    const query = {
      accountCode,
      status: 'posted',
      'reversal.isReversed': false
    };

    if (filters.startDate || filters.endDate) {
      query.transactionDate = {};
      if (filters.startDate) query.transactionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.transactionDate.$lte = new Date(filters.endDate);
    }

    if (filters.branch) {
      query.branch = filters.branch;
    }

    const entries = await this.find(query)
      .sort('transactionDate documentNumber')
      .populate('createdBy', 'name')
      .lean();

    // Calculate running balance
    let balance = 0;
    return entries.map(entry => {
      balance += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: balance
      };
    });
  },

  // Check if accounting equation is balanced
  async checkBalance(documentType, documentId) {
    const entries = await this.find({
      documentType,
      documentId,
      status: 'posted',
      'reversal.isReversed': false
    });

    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

    return {
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit
    };
  },

  // Create batch journal entries
  async createBatch(entries, session) {
    // Validate total debit = credit
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new Error(`ยอด Debit (${totalDebit}) ไม่เท่ากับ Credit (${totalCredit})`);
    }

    return this.insertMany(entries, { session });
  }
};

// Plugins
journalEntrySchema.plugin(require('mongoose-paginate-v2'));

module.exports = mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema);
