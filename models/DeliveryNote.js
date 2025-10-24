const mongoose = require('mongoose');

const deliveryNoteSchema = new mongoose.Schema({
  // Document identification
  documentNumber: {
    type: String,
    required: true,
    unique: true
  },
  documentDate: {
    type: Date,
    default: Date.now
  },

  // Branch information
  branchCode: {
    type: String,
    required: true
  },
  branchName: {
    type: String,
    required: true
  },

  // Customer information
  customer: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String
    },
    taxId: {
      type: String
    },
    phone: {
      type: String
    },
    email: {
      type: String
    }
  },

  // Delivery information
  delivery: {
    address: {
      type: String,
      required: true
    },
    contactPerson: {
      type: String
    },
    contactPhone: {
      type: String
    },
    deliveryDate: {
      type: Date,
      default: Date.now
    },
    deliveryTime: {
      type: String
    },
    specialInstructions: {
      type: String
    }
  },

  // Items for delivery
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BranchStock'
    },
    name: {
      type: String,
      required: true
    },
    brand: {
      type: String
    },
    model: {
      type: String
    },
    imei: {
      type: String
    },
    serialNumber: {
      type: String
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    description: {
      type: String
    }
  }],

  // Related documents
  relatedDocuments: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    depositReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepositReceipt'
    },
    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installment'
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation'
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxInvoice'
    }
  },

  // Financial summary
  summary: {
    subtotal: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    depositApplied: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number
    }
  },

  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Delivery tracking
  tracking: {
    preparedAt: {
      type: Date
    },
    shippedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    deliveredBy: {
      type: String
    },
    receivedBy: {
      type: String
    },
    signature: {
      type: String // Base64 encoded signature or path to signature image
    }
  },

  // Notes and remarks
  notes: {
    internalNotes: {
      type: String
    },
    deliveryNotes: {
      type: String
    },
    customerNotes: {
      type: String
    }
  },

  // Staff information
  staff: {
    preparedBy: {
      id: {
        type: String
      },
      name: {
        type: String
      }
    },
    deliveredBy: {
      id: {
        type: String
      },
      name: {
        type: String
      }
    }
  },

  // Source information
  sourceType: {
    type: String,
    enum: ['deposit_receipt', 'direct_sale', 'installment', 'quotation'],
    default: 'direct_sale'
  },

  // Audit trail
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  },

  // System timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
deliveryNoteSchema.index({ documentNumber: 1 });
deliveryNoteSchema.index({ branchCode: 1 });
deliveryNoteSchema.index({ 'customer.name': 1 });
deliveryNoteSchema.index({ status: 1 });
deliveryNoteSchema.index({ createdAt: -1 });
deliveryNoteSchema.index({ 'relatedDocuments.depositReceiptId': 1 });
deliveryNoteSchema.index({ 'relatedDocuments.orderId': 1 });

// Pre-save middleware
deliveryNoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate summary totals
  if (this.items && this.items.length > 0) {
    this.summary.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.summary.totalAmount = this.summary.subtotal + this.summary.taxAmount;
    this.summary.remainingAmount = this.summary.totalAmount - this.summary.depositApplied;
  }

  next();
});

// Instance methods
deliveryNoteSchema.methods.generateDocumentNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

  return `DN${year}${month}${day}${random}`;
};

deliveryNoteSchema.methods.markAsDelivered = function(deliveredBy, receivedBy, signature) {
  this.status = 'delivered';
  this.tracking.deliveredAt = new Date();
  this.tracking.deliveredBy = deliveredBy;
  this.tracking.receivedBy = receivedBy;
  if (signature) {
    this.tracking.signature = signature;
  }
  return this.save();
};

deliveryNoteSchema.methods.canDeliver = function() {
  return this.status === 'preparing' || this.status === 'out_for_delivery';
};

// Static methods
deliveryNoteSchema.statics.generateNextDocumentNumber = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');

  const prefix = `DN${year}${month}${day}`;

  // Find the last document number for today
  const lastDoc = await this.findOne({
    documentNumber: { $regex: `^${prefix}` }
  }).sort({ documentNumber: -1 });

  let sequence = 1;
  if (lastDoc) {
    const lastSequence = parseInt(lastDoc.documentNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

deliveryNoteSchema.statics.createFromDepositReceipt = async function(depositReceipt, deliveryInfo) {
  const documentNumber = await this.generateNextDocumentNumber();

  const deliveryNote = new this({
    documentNumber,
    branchCode: depositReceipt.branchCode,
    branchName: depositReceipt.branchName,
    customer: depositReceipt.customer,
    delivery: {
      address: deliveryInfo.address || depositReceipt.customer.address,
      contactPerson: deliveryInfo.contactPerson || depositReceipt.customer.name,
      contactPhone: deliveryInfo.contactPhone || depositReceipt.customer.phone,
      deliveryDate: deliveryInfo.deliveryDate || new Date(),
      deliveryTime: deliveryInfo.deliveryTime,
      specialInstructions: deliveryInfo.specialInstructions
    },
    items: [{
      productId: depositReceipt.product.id,
      name: depositReceipt.product.name,
      brand: depositReceipt.product.brand,
      model: depositReceipt.product.model,
      imei: depositReceipt.product.imei,
      quantity: 1,
      unitPrice: depositReceipt.product.price,
      totalPrice: depositReceipt.product.price,
      description: `${depositReceipt.product.brand} ${depositReceipt.product.model}`
    }],
    relatedDocuments: {
      depositReceiptId: depositReceipt._id,
      orderId: depositReceipt.integration.orderId,
      installmentId: depositReceipt.integration.installmentId
    },
    summary: {
      subtotal: depositReceipt.amounts.totalAmount,
      taxAmount: depositReceipt.tax.taxAmount,
      totalAmount: depositReceipt.amounts.totalAmount,
      depositApplied: depositReceipt.amounts.depositAmount,
      remainingAmount: depositReceipt.amounts.remainingAmount
    },
    sourceType: 'deposit_receipt',
    staff: {
      preparedBy: {
        id: depositReceipt.salesperson.id,
        name: depositReceipt.salesperson.name
      }
    },
    createdBy: depositReceipt.salesperson.id
  });

  return deliveryNote;
};

module.exports = mongoose.model('DeliveryNote', deliveryNoteSchema);