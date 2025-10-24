const TaxInvoice = require('../models/TaxInvoice');
const Receipt = require('../models/Receipt');

// ฟังก์ชันสร้างเลขที่เอกสาร (แบบมีลำดับต่อเนื่อง) - รูปแบบใหม่ TX-YYMMDD-XXX (พ.ศ.)
async function generateDocumentNumber(type, branchCode = 'PT', customPrefix = null, customDateFormat = null) {
  const now = new Date();

  // ใช้ custom date format ถ้ามี หรือสร้างใหม่ตามวันที่ปัจจุบัน (พ.ศ.)
  let datePrefix = customDateFormat;
  if (!datePrefix) {
    const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
    const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
    const day = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
    datePrefix = `${yearShort}${month}${day}`; // 680816
  }

  console.log('📄 Using current date format for document number:', datePrefix, `(${now.toLocaleDateString('th-TH')})`);

  // ใช้ custom prefix ถ้ามี หรือกำหนดตาม type
  const typePrefix = customPrefix || (type === 'TAX_INVOICE' ? 'TX' : 'RE');
  const searchPrefix = `${typePrefix}-${datePrefix}`;

  try {
    // หาเอกสารล่าสุดของวันนี้
    let lastDoc;
    if (type === 'TAX_INVOICE') {
      lastDoc = await TaxInvoice.findOne({
        taxInvoiceNumber: { $regex: `^${searchPrefix}-` }
      }).sort({ createdAt: -1 });
    } else {
      lastDoc = await Receipt.findOne({
        receiptNumber: { $regex: `^${searchPrefix}-` }
      }).sort({ createdAt: -1 });
    }

    let sequence = 1;
    if (lastDoc) {
      const docNumber = type === 'TAX_INVOICE' ? lastDoc.taxInvoiceNumber : lastDoc.receiptNumber;
      const lastSequence = parseInt(docNumber.split('-').pop());
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${searchPrefix}-${sequence.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating document number:', error);
    // Fallback to timestamp if error
    const timestamp = Date.now().toString().slice(-6);
    return `${searchPrefix}-${timestamp}`;
  }
}

// Tax Invoice Controller
class TaxInvoiceController {

  // สร้าง Tax Invoice ใหม่
  static async create(req, res) {
    try {
      console.log('📋 Creating new Tax Invoice...');
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

      const taxInvoiceData = req.body;

      // Calculate idempotency key for duplicate prevention
      const summary = taxInvoiceData.summary || {};
      const calculation = taxInvoiceData.calculation || {};
      const branchCode = taxInvoiceData.branchCode || '00000';
      const customerKey = (taxInvoiceData.customer?.taxId || taxInvoiceData.customer?.tax_id || taxInvoiceData.customer?.phone || '').toString().replace(/\s+/g, '');
      const subtotal = Number(summary.subtotal ?? calculation.subtotal ?? taxInvoiceData.downPaymentAmount ?? 0);
      const docFee = Number(summary.docFee ?? calculation.documentFee ?? taxInvoiceData.documentFee ?? 0);
      const totalWithTax = Number(summary.totalWithTax ?? calculation.totalAmount ?? (subtotal + docFee));
      const stableIdemKey = [
        'tax_invoice',
        branchCode,
        taxInvoiceData.contractNo || 'N/A',
        customerKey || 'N/A',
        totalWithTax.toFixed(2),
        docFee.toFixed(2),
        subtotal.toFixed(2)
      ].join('|');

      // Check for existing tax invoices (idempotency)
      const incomingKey = taxInvoiceData.idempotencyKey;
      let existingTaxInvoice = null;

      if (incomingKey) {
        existingTaxInvoice = await TaxInvoice.findOne({ idempotencyKey: incomingKey });
      }
      if (!existingTaxInvoice) {
        existingTaxInvoice = await TaxInvoice.findOne({ idempotencyKey: stableIdemKey });
      }
      if (!existingTaxInvoice && taxInvoiceData.receiptType === 'down_payment_tax_invoice' && taxInvoiceData.contractNo) {
        existingTaxInvoice = await TaxInvoice.findOne({
          contractNo: taxInvoiceData.contractNo,
          receiptType: 'down_payment_tax_invoice'
        }).sort({ createdAt: -1 });
      }
      if (!existingTaxInvoice && taxInvoiceData.taxInvoiceNumber) {
        existingTaxInvoice = await TaxInvoice.findOne({
          taxInvoiceNumber: taxInvoiceData.taxInvoiceNumber
        });
      }

      if (existingTaxInvoice) {
        return res.status(200).json({
          success: true,
          message: 'Tax Invoice already exists (idempotent)',
          data: existingTaxInvoice
        });
      }

      // Set idempotencyKey in data
      taxInvoiceData.idempotencyKey = incomingKey || stableIdemKey;

      // สร้างเลขที่ใบกำกับภาษีถ้าไม่มี
      if (!taxInvoiceData.taxInvoiceNumber) {
        taxInvoiceData.taxInvoiceNumber = await generateDocumentNumber('TAX_INVOICE', taxInvoiceData.branchCode || '00000');
        console.log('📄 Generated tax invoice number:', taxInvoiceData.taxInvoiceNumber);
      }

      // Note: Duplicate check already handled above in idempotency section

      // สร้าง Tax Invoice ใหม่
      const newTaxInvoice = new TaxInvoice(taxInvoiceData);
      const savedTaxInvoice = await newTaxInvoice.save();

      console.log('✅ Tax Invoice created successfully:', savedTaxInvoice._id);

      // Return response immediately - don't wait for sync
      res.status(201).json({
        success: true,
        message: 'Tax Invoice created successfully',
        data: {
          ...savedTaxInvoice.toObject(),
          invoiceNumber: savedTaxInvoice.taxInvoiceNumber
        }
      });

      // 🔄 Non-blocking sync to Receipt Voucher System (after response sent)
      setImmediate(async () => {
        try {
          const token = req.header('Authorization')?.replace('Bearer ', '');
          const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
          const payload = {
          source: 'legacy_taxinvoice_api',
          sourceId: savedTaxInvoice._id,
          documentNumber: `RV-${savedTaxInvoice.taxInvoiceNumber}`,
          customerName: savedTaxInvoice.customer?.name || 'ลูกค้าทั่วไป',
          totalAmount: savedTaxInvoice.summary?.totalWithTax || savedTaxInvoice.totalAmount,
          netAmount: savedTaxInvoice.summary?.netTotal || savedTaxInvoice.summary?.totalWithTax || 0,
          vatAmount: savedTaxInvoice.summary?.vatAmount || savedTaxInvoice.vatAmount || 0,
          paymentMethod: savedTaxInvoice.paymentMethod || 'cash',
          description: `ใบกำกับภาษี เลขที่ ${savedTaxInvoice.taxInvoiceNumber}`,
          notes: 'สร้างอัตโนมัติจากระบบ Legacy /api/tax-invoice',
          metadata: {
            documentType: savedTaxInvoice.documentType || 'TAX_INVOICE',
            documentNumber: savedTaxInvoice.taxInvoiceNumber,
            branchCode: savedTaxInvoice.branchCode,
            employeeName: savedTaxInvoice.employeeName,
            contractNo: savedTaxInvoice.contractNo,
            quotationNumber: savedTaxInvoice.quotationNumber,
            items: (savedTaxInvoice.items || []).map(item => ({
              name: item.name || item.product || 'สินค้า',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || ((item.unitPrice || 0) * (item.quantity || 1))
            }))
          }
          };

          // Add timeout to sync operation
          const syncController = new AbortController();
          const syncTimeout = setTimeout(() => syncController.abort(), 5000); // 5 second timeout for sync

          try {
            const response = await fetch(`${baseUrl}/api/receipt-vouchers/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(payload),
              signal: syncController.signal
            });

            clearTimeout(syncTimeout);

            if (!response.ok) {
              console.warn('⚠️ Receipt Voucher sync failed (HTTP):', response.status);
            } else {
              const result = await response.json();
              console.log('🔗 Synced to Receipt Voucher System:', result?.data?.documentNumber || 'OK');
            }
          } catch (syncErr) {
            clearTimeout(syncTimeout);
            if (syncErr.name === 'AbortError') {
              console.warn('⚠️ Receipt Voucher sync timeout after 5 seconds');
            } else {
              console.warn('⚠️ Receipt Voucher sync error:', syncErr.message);
            }
          }
        } catch (outerSyncErr) {
          console.warn('⚠️ Receipt Voucher sync setup error:', outerSyncErr.message);
        }
      });

    } catch (error) {
      console.error('❌ Error creating Tax Invoice:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors
        });
      }

      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.idempotencyKey) {
          try {
            const dup = await TaxInvoice.findOne({ idempotencyKey: (taxInvoiceData?.idempotencyKey || stableIdemKey) });
            if (dup) {
              return res.status(200).json({ success: true, message: 'Tax Invoice already exists (dup-key)', data: dup });
            }
          } catch {}
        }
        return res.status(409).json({
          success: false,
          error: 'Duplicate Tax Invoice Number'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Tax Invoice ทั้งหมด
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, branchCode, customerTaxId } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (customerTaxId) filter['customer.taxId'] = customerTaxId;

      const taxInvoices = await TaxInvoice
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await TaxInvoice.countDocuments(filter);

      res.json({
        success: true,
        data: taxInvoices,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: taxInvoices.length,
          totalRecords: total
        }
      });

    } catch (error) {
      console.error('❌ Error fetching Tax Invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Tax Invoice ตาม ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const taxInvoice = await TaxInvoice.findById(id);

      if (!taxInvoice) {
        return res.status(404).json({
          success: false,
          error: 'Tax Invoice not found'
        });
      }

      res.json({
        success: true,
        data: taxInvoice
      });

    } catch (error) {
      console.error('❌ Error fetching Tax Invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Tax Invoice ตามเลขที่
  static async getByNumber(req, res) {
    try {
      const { number } = req.params;

      const taxInvoice = await TaxInvoice.findOne({
        taxInvoiceNumber: number
      });

      if (!taxInvoice) {
        return res.status(404).json({
          success: false,
          error: 'Tax Invoice not found'
        });
      }

      res.json({
        success: true,
        data: taxInvoice
      });

    } catch (error) {
      console.error('❌ Error fetching Tax Invoice by number:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // อัปเดต Tax Invoice
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // เพิ่ม updatedAt
      updateData.updatedAt = new Date();

      const updatedTaxInvoice = await TaxInvoice.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedTaxInvoice) {
        return res.status(404).json({
          success: false,
          error: 'Tax Invoice not found'
        });
      }

      console.log('✅ Tax Invoice updated successfully:', updatedTaxInvoice._id);

      res.json({
        success: true,
        message: 'Tax Invoice updated successfully',
        data: updatedTaxInvoice
      });

    } catch (error) {
      console.error('❌ Error updating Tax Invoice:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ลบ Tax Invoice
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deletedTaxInvoice = await TaxInvoice.findByIdAndDelete(id);

      if (!deletedTaxInvoice) {
        return res.status(404).json({
          success: false,
          error: 'Tax Invoice not found'
        });
      }

      console.log('✅ Tax Invoice deleted successfully:', deletedTaxInvoice._id);

      res.json({
        success: true,
        message: 'Tax Invoice deleted successfully',
        data: { id: deletedTaxInvoice._id }
      });

    } catch (error) {
      console.error('❌ Error deleting Tax Invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // สถิติ Tax Invoice
  static async getStatistics(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const stats = await TaxInvoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalAmount: { $sum: '$summary.totalWithTax' },
            totalVat: { $sum: '$summary.vatAmount' },
            avgAmount: { $avg: '$summary.totalWithTax' }
          }
        }
      ]);

      const byBranch = await TaxInvoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$branchCode',
            count: { $sum: 1 },
            totalAmount: { $sum: '$summary.totalWithTax' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const byPaymentMethod = await TaxInvoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$summary.totalWithTax' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          overall: stats[0] || {
            totalCount: 0,
            totalAmount: 0,
            totalVat: 0,
            avgAmount: 0
          },
          byBranch,
          byPaymentMethod
        }
      });

    } catch (error) {
      console.error('❌ Error fetching Tax Invoice statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Tax Invoice ตามเลขที่สัญญา
  static async getByContractNumber(req, res) {
    try {
      const { contractNo } = req.params;
      console.log(`📋 Fetching Tax Invoices for contract: ${contractNo}`);

      const taxInvoices = await TaxInvoice.find({
        contractNo: contractNo
      }).sort({ createdAt: -1 });

      console.log(`✅ Found ${taxInvoices.length} Tax Invoices for contract ${contractNo}`);

      res.status(200).json({
        success: true,
        data: taxInvoices,
        count: taxInvoices.length
      });

    } catch (error) {
      console.error('❌ Error fetching Tax Invoices by contract number:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

module.exports = TaxInvoiceController;
