/**
 * controllers/purchaseNotesController.js - Controller สำหรับจัดการใบลดหนี้และใบเพิ่มหนี้การซื้อ
 */

const mongoose = require('mongoose');
const Counter = require('../models/POS/Counter');
const PurchaseCreditNote = require('../models/Stock/PurchaseCreditNote');
const PurchaseDebitNote = require('../models/Stock/PurchaseDebitNote');
const PurchaseOrder = require('../models/Stock/purchaseOrderModel');
const Supplier = require('../models/Stock/Supplier');

// Helper function to generate note numbers
async function generateNoteNumber(type) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateKey = `${year}${month}${day}`;

  const prefix = type === 'credit' ? 'PCN' : 'PDN'; // Purchase Credit Note / Purchase Debit Note
  const key = `${prefix}-${dateKey}`;

  try {
    let doc = await Counter.findOne({ key });
    if (!doc) {
      doc = new Counter({ key, seq: 0 });
    }
    doc.seq = (Number(doc.seq) || 0) + 1;
    await doc.save();

    const seq3 = String(doc.seq).padStart(3, '0');
    return `${prefix}-${dateKey}-${seq3}`;
  } catch (error) {
    console.error('Error generating note number:', error);
    return `${prefix}-${dateKey}-001`;
  }
}

// Note: Now using proper database models instead of in-memory storage

class PurchaseNotesController {
  // =============== CREDIT NOTES ===============

  // GET /api/purchase-notes/credit-notes - List credit notes
  static async getCreditNotes(req, res) {
    try {
      const { page = 1, limit = 100, status, search, dateFrom, dateTo } = req.query;

      const filter = {};

      // Apply filters
      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { creditNoteNumber: { $regex: search, $options: 'i' } },
          { reasonText: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const notes = await PurchaseCreditNote.find(filter)
        .populate('supplier', 'name code contact')
        .populate('purchaseOrder', 'poNumber docDate totalAmount')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await PurchaseCreditNote.countDocuments(filter);

      return res.json({
        success: true,
        data: notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total
        }
      });
    } catch (error) {
      console.error('Error getting credit notes:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงข้อมูลใบลดหนี้ได้'
      });
    }
  }

  // POST /api/purchase-notes/credit-notes - Create credit note
  static async createCreditNote(req, res) {
    try {
      const { supplier, purchaseOrder, totalAmount, reason, reasonText, notes } = req.body;
      const userId = req.user.userId || req.user.id;

      // Validation
      if (!supplier) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุผู้จำหน่าย'
        });
      }

      if (!purchaseOrder) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาเลือกใบสั่งซื้อ'
        });
      }

      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง'
        });
      }

      if (!reason || !reasonText) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุเหตุผลการลดหนี้'
        });
      }

      // Validate that PO exists and belongs to supplier
      const po = await PurchaseOrder.findById(purchaseOrder).populate('supplier');
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อที่เลือก'
        });
      }

      if (po.supplier._id.toString() !== supplier) {
        return res.status(400).json({
          success: false,
          error: 'ใบสั่งซื้อไม่ตรงกับผู้จำหน่ายที่เลือก'
        });
      }

      if (po.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          error: 'สามารถออกใบลดหนี้ได้เฉพาะใบสั่งซื้อที่อนุมัติแล้วเท่านั้น'
        });
      }

      const creditNoteNumber = await generateNoteNumber('credit');

      const newCreditNote = new PurchaseCreditNote({
        creditNoteNumber,
        supplier,
        purchaseOrder,
        totalAmount: parseFloat(totalAmount),
        reason,
        reasonText,
        notes: notes || '',
        status: 'pending',
        createdBy: userId
      });

      await newCreditNote.save();

      // Populate the saved document for response
      await newCreditNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'createdBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: newCreditNote,
        message: 'สร้างใบลดหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error creating credit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถสร้างใบลดหนี้ได้'
      });
    }
  }

  // GET /api/purchase-notes/credit-notes/stats - Credit notes statistics
  static async getCreditNoteStats(req, res) {
    try {
      const statsData = await PurchaseCreditNote.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      const stats = {
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalAmount: 0
      };

      statsData.forEach(stat => {
        if (stat._id === 'pending') stats.pendingCount = stat.count;
        if (stat._id === 'approved') {
          stats.approvedCount = stat.count;
          stats.totalAmount = stat.totalAmount;
        }
        if (stat._id === 'rejected') stats.rejectedCount = stat.count;
      });

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting credit note stats:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงสถิติข้อมูลได้'
      });
    }
  }

  // POST /api/purchase-notes/credit-notes/:id/approve - Approve credit note
  static async approveCreditNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.id;

      const creditNote = await PurchaseCreditNote.findById(id);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบลดหนี้'
        });
      }

      if (creditNote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถอนุมัติใบลดหนี้ที่ไม่ได้อยู่ในสถานะรอการอนุมัติ'
        });
      }

      creditNote.status = 'approved';
      creditNote.approvedBy = userId;
      creditNote.approvedAt = new Date();
      await creditNote.save();

      await creditNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'approvedBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: creditNote,
        message: 'อนุมัติใบลดหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error approving credit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถอนุมัติใบลดหนี้ได้'
      });
    }
  }

  // POST /api/purchase-notes/credit-notes/:id/reject - Reject credit note
  static async rejectCreditNote(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId || req.user.id;

      const creditNote = await PurchaseCreditNote.findById(id);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบลดหนี้'
        });
      }

      if (creditNote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถปฏิเสธใบลดหนี้ที่ไม่ได้อยู่ในสถานะรอการอนุมัติ'
        });
      }

      creditNote.status = 'rejected';
      creditNote.rejectedBy = userId;
      creditNote.rejectedAt = new Date();
      creditNote.rejectionReason = reason || 'ไม่ระบุเหตุผล';
      await creditNote.save();

      await creditNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'rejectedBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: creditNote,
        message: 'ปฏิเสธใบลดหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error rejecting credit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถปฏิเสธใบลดหนี้ได้'
      });
    }
  }

  // DELETE /api/purchase-notes/credit-notes/:id - Delete credit note
  static async deleteCreditNote(req, res) {
    try {
      const { id } = req.params;

      const creditNote = await PurchaseCreditNote.findById(id);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบลดหนี้'
        });
      }

      if (creditNote.status === 'approved') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถลบใบลดหนี้ที่อนุมัติแล้ว'
        });
      }

      await PurchaseCreditNote.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: 'ลบใบลดหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error deleting credit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถลบใบลดหนี้ได้'
      });
    }
  }

  // =============== DEBIT NOTES ===============

  // GET /api/purchase-notes/debit-notes - List debit notes
  static async getDebitNotes(req, res) {
    try {
      const { page = 1, limit = 100, status, search, dateFrom, dateTo } = req.query;

      const filter = {};

      // Apply filters
      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { debitNoteNumber: { $regex: search, $options: 'i' } },
          { reasonText: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const notes = await PurchaseDebitNote.find(filter)
        .populate('supplier', 'name code contact')
        .populate('purchaseOrder', 'poNumber docDate totalAmount')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await PurchaseDebitNote.countDocuments(filter);

      return res.json({
        success: true,
        data: notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total
        }
      });
    } catch (error) {
      console.error('Error getting debit notes:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงข้อมูลใบเพิ่มหนี้ได้'
      });
    }
  }

  // POST /api/purchase-notes/debit-notes - Create debit note
  static async createDebitNote(req, res) {
    try {
      const { supplier, purchaseOrder, totalAmount, reason, reasonText, notes } = req.body;
      const userId = req.user.userId || req.user.id;

      // Validation
      if (!supplier) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุผู้จำหน่าย'
        });
      }

      if (!purchaseOrder) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาเลือกใบสั่งซื้อ'
        });
      }

      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง'
        });
      }

      if (!reason || !reasonText) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุเหตุผลการเพิ่มหนี้'
        });
      }

      // Validate that PO exists and belongs to supplier
      const po = await PurchaseOrder.findById(purchaseOrder).populate('supplier');
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อที่เลือก'
        });
      }

      if (po.supplier._id.toString() !== supplier) {
        return res.status(400).json({
          success: false,
          error: 'ใบสั่งซื้อไม่ตรงกับผู้จำหน่ายที่เลือก'
        });
      }

      if (po.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          error: 'สามารถออกใบเพิ่มหนี้ได้เฉพาะใบสั่งซื้อที่อนุมัติแล้วเท่านั้น'
        });
      }

      const debitNoteNumber = await generateNoteNumber('debit');

      const newDebitNote = new PurchaseDebitNote({
        debitNoteNumber,
        supplier,
        purchaseOrder,
        totalAmount: parseFloat(totalAmount),
        reason,
        reasonText,
        notes: notes || '',
        status: 'pending',
        createdBy: userId
      });

      await newDebitNote.save();

      // Populate the saved document for response
      await newDebitNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'createdBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: newDebitNote,
        message: 'สร้างใบเพิ่มหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error creating debit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถสร้างใบเพิ่มหนี้ได้'
      });
    }
  }

  // GET /api/purchase-notes/debit-notes/stats - Debit notes statistics
  static async getDebitNoteStats(req, res) {
    try {
      const statsData = await PurchaseDebitNote.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      const stats = {
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalAmount: 0
      };

      statsData.forEach(stat => {
        if (stat._id === 'pending') stats.pendingCount = stat.count;
        if (stat._id === 'approved') {
          stats.approvedCount = stat.count;
          stats.totalAmount = stat.totalAmount;
        }
        if (stat._id === 'rejected') stats.rejectedCount = stat.count;
      });

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting debit note stats:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงสถิติข้อมูลได้'
      });
    }
  }

  // POST /api/purchase-notes/debit-notes/:id/approve - Approve debit note
  static async approveDebitNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.id;

      const debitNote = await PurchaseDebitNote.findById(id);
      if (!debitNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบเพิ่มหนี้'
        });
      }

      if (debitNote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถอนุมัติใบเพิ่มหนี้ที่ไม่ได้อยู่ในสถานะรอการอนุมัติ'
        });
      }

      debitNote.status = 'approved';
      debitNote.approvedBy = userId;
      debitNote.approvedAt = new Date();
      await debitNote.save();

      await debitNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'approvedBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: debitNote,
        message: 'อนุมัติใบเพิ่มหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error approving debit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถอนุมัติใบเพิ่มหนี้ได้'
      });
    }
  }

  // POST /api/purchase-notes/debit-notes/:id/reject - Reject debit note
  static async rejectDebitNote(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId || req.user.id;

      const debitNote = await PurchaseDebitNote.findById(id);
      if (!debitNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบเพิ่มหนี้'
        });
      }

      if (debitNote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถปฏิเสธใบเพิ่มหนี้ที่ไม่ได้อยู่ในสถานะรอการอนุมัติ'
        });
      }

      debitNote.status = 'rejected';
      debitNote.rejectedBy = userId;
      debitNote.rejectedAt = new Date();
      debitNote.rejectionReason = reason || 'ไม่ระบุเหตุผล';
      await debitNote.save();

      await debitNote.populate([
        { path: 'supplier', select: 'name code contact' },
        { path: 'purchaseOrder', select: 'poNumber docDate totalAmount' },
        { path: 'rejectedBy', select: 'name email' }
      ]);

      return res.json({
        success: true,
        data: debitNote,
        message: 'ปฏิเสธใบเพิ่มหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error rejecting debit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถปฏิเสธใบเพิ่มหนี้ได้'
      });
    }
  }

  // DELETE /api/purchase-notes/debit-notes/:id - Delete debit note
  static async deleteDebitNote(req, res) {
    try {
      const { id } = req.params;

      const debitNote = await PurchaseDebitNote.findById(id);
      if (!debitNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบเพิ่มหนี้'
        });
      }

      if (debitNote.status === 'approved') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถลบใบเพิ่มหนี้ที่อนุมัติแล้ว'
        });
      }

      await PurchaseDebitNote.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: 'ลบใบเพิ่มหนี้เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error deleting debit note:', error);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถลบใบเพิ่มหนี้ได้'
      });
    }
  }
}

module.exports = PurchaseNotesController;