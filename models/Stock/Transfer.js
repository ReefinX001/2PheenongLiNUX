// models/Transfer.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const transferSchema = new Schema({
  transferNo: {
    type: String,
    required: true,
    unique: true
  },
  transferDate: {
    type: Date,
    required: true
  },
  fromBranch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  toBranch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      id: String,

      name: String,
      brand: String,
      imei: String,
      categoryGroup: {
        type: Schema.Types.ObjectId,
        ref: 'CategoryGroup'
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      }
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'pending-stock', 'in-transit', 'pending-receive', 'received', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  // Signature data with timestamps
  senderSignature: {
    data: String,  // Base64 encoded signature image
    signedAt: Date,
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  stockApproverSignature: {
    data: String,  // Base64 encoded signature image
    signedAt: Date,
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  stockApprover: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  stockApprovedAt: Date,
  receiverSignature: {
    data: String,  // Base64 encoded signature image
    signedAt: Date,
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  receivedAt: Date,
  rejectionReason: String,
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,

  // New signature fields for updated flow
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

  note: {
    type: String,
    default: ''
  },
  deliveryMethod: {
    type: String,
    default: 'รถขนส่งของบริษัท'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

transferSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Virtual for sender name
transferSchema.virtual('senderName').get(function() {
  if (this.preparedBy && typeof this.preparedBy === 'object') {
    return this.preparedBy.employee?.name ||
           this.preparedBy.fullName ||
           `${this.preparedBy.firstName || ''} ${this.preparedBy.lastName || ''}`.trim() ||
           this.preparedBy.username ||
           'ไม่ระบุผู้ส่ง';
  }
  if (this.sender && typeof this.sender === 'object') {
    return this.sender.employee?.name ||
           this.sender.fullName ||
           `${this.sender.firstName || ''} ${this.sender.lastName || ''}`.trim() ||
           this.sender.username ||
           'ไม่ระบุผู้ส่ง';
  }
  return 'ไม่ระบุผู้ส่ง';
});

// Virtual for receiver name
transferSchema.virtual('receiverName').get(function() {
  if (this.receiver && typeof this.receiver === 'object') {
    return this.receiver.employee?.name ||
           this.receiver.fullName ||
           `${this.receiver.firstName || ''} ${this.receiver.lastName || ''}`.trim() ||
           this.receiver.username ||
           'ไม่ระบุผู้รับ';
  }
  return 'ไม่ระบุผู้รับ';
});

// Ensure virtuals are included in JSON output
transferSchema.set('toJSON', { virtuals: true });
transferSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transfer', transferSchema);
