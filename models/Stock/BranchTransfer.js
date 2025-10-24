// models/BranchTransfer.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// สร้าง Schema สำหรับ BranchTransfer
const branchTransferSchema = new Schema(
  {
    source_branch_code: {
      type: Schema.Types.ObjectId,
      ref: 'Branch', // คล้าย belongsTo(Branch::class, 'source_branch_id')
      required: true
    },
    destination_branch_code: {
      type: Schema.Types.ObjectId,
      ref: 'Branch', // คล้าย belongsTo(Branch::class, 'destination_branch_id')
      required: true
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Product', // คล้าย belongsTo(Product::class, 'product_id')
      required: true
    },
    quantity: {
      type: Number,
      default: 0
    },
    transfer_date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      default: 'pending' // หรือค่า default อื่น ๆ เช่น "pending"
    },
    reason: {
      type: String,
      default: ''
    },
    transfer_cost: {
      type: Number,
      default: 0
    },
    tracking_number: {
      type: String,
      default: ''
    },
    performed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User', // คล้าย belongsTo(User::class, 'performed_by')
      default: null
    },

    // Signature fields for new status flow
    preparedSignature: {
      type: String, // Base64 encoded signature image
      default: null
    },
    preparedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    preparedAt: {
      type: Date,
      default: null
    },

    receiverSignature: {
      type: String, // Base64 encoded signature image
      default: null
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    receivedAt: {
      type: Date,
      default: null
    },

    // Cancel fields
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelReason: {
      type: String,
      default: null
    },

    // Additional fields for transfer details
    note: {
      type: String,
      default: ''
    },
    deliveryMethod: {
      type: String,
      default: 'รถขนส่งของบริษัท'
    },
    transferNo: {
      type: String,
      unique: true,
      sparse: true // Allow null values but ensure uniqueness when present
    },

    // Soft delete
    deleted_at: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'tb_branch_transfers', // ชื่อ collection ตาม Laravel
    timestamps: true // ถ้าต้องการ createdAt, updatedAt อัตโนมัติ
  }
);

// Pre-save middleware to generate transfer number
branchTransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNo) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      // Find the latest transfer number for today
      const datePrefix = `TRF-${year}${month}${day}`;
      const latestTransfer = await this.constructor.findOne({
        transferNo: { $regex: `^${datePrefix}` }
      }).sort({ transferNo: -1 });

      let sequence = 1;
      if (latestTransfer && latestTransfer.transferNo) {
        const lastSequence = parseInt(latestTransfer.transferNo.split('-').pop());
        sequence = lastSequence + 1;
      }

      this.transferNo = `${datePrefix}-${String(sequence).padStart(3, '0')}`;
      console.log('Generated transfer number:', this.transferNo);

    } catch (error) {
      console.error('Error generating transfer number:', error);
      // Fallback to timestamp-based number
      this.transferNo = `TRF-${Date.now()}`;
    }
  }
  next();
});

// Virtual for populated sender and receiver names
branchTransferSchema.virtual('senderName').get(function() {
  if (this.preparedBy && typeof this.preparedBy === 'object') {
    return this.preparedBy.employee?.name ||
           this.preparedBy.fullName ||
           this.preparedBy.name ||
           this.preparedBy.username ||
           'ไม่ระบุผู้ส่ง';
  }
  return 'ไม่ระบุผู้ส่ง';
});

branchTransferSchema.virtual('receiverName').get(function() {
  if (this.receivedBy && typeof this.receivedBy === 'object') {
    return this.receivedBy.employee?.name ||
           this.receivedBy.fullName ||
           this.receivedBy.name ||
           this.receivedBy.username ||
           'ไม่ระบุผู้รับ';
  }
  return 'ไม่ระบุผู้รับ';
});

// Ensure virtuals are included in JSON output
branchTransferSchema.set('toJSON', { virtuals: true });
branchTransferSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.BranchTransfer || mongoose.model('BranchTransfer', branchTransferSchema);
