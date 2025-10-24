// controllers/PDFPurchaseOrderController.js
const PurchaseOrder = require('../models/Stock/purchaseOrderModel');
const Branch = require('../models/Account/Branch');
const User = require('../models/User/User');
const jwt = require('jsonwebtoken');

// Helper function เพื่อดึงข้อมูล user จาก token
async function getUserFromToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId || decoded.id).lean();
    return user;
  } catch (error) {
    return null;
  }
}

class PurchaseOrderController {
  // สร้าง PO ใหม่ พร้อมบันทึกข้อมูลผู้สร้าง
  static async createPO(req, res) {
    try {
      const {
        docDate,
        branch_code,
        supplierId,
        categoryGroup,
        notes,
        items
      } = req.body;

      // ดึงข้อมูลผู้สร้างจาก token
      const currentUser = await getUserFromToken(req);

      // หา branch จาก branch_code
      const branch = await Branch.findOne({ branch_code }).lean();
      if (!branch) {
        return res.status(400).json({
          success: false,
          error: 'ไม่พบข้อมูลสาขาที่ระบุ'
        });
      }

      // สร้างเลขที่ PO
      const count = await PurchaseOrder.countDocuments();
      const poNumber = `PO${String(count + 1).padStart(6, '0')}`;

      // สร้าง PO object
      const newPO = new PurchaseOrder({
        poNumber,
        docDate: docDate || new Date(),
        branch: branch._id,
        branch_code,
        supplier: supplierId,
        categoryGroup: categoryGroup || null,
        notes: notes || '',
        items: items || [],
        status: 'Pending',
        // บันทึกข้อมูลผู้สร้าง
        createdBy: currentUser ? currentUser._id : null,
        createdByName: currentUser ? (currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`.trim()) : 'Unknown'
      });

      // บันทึกประวัติการสร้าง
      newPO.history.push({
        oldStatus: '',
        newStatus: 'Pending',
        changedBy: currentUser ? currentUser._id : null,
        changedByName: currentUser ? (currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`.trim()) : 'Unknown',
        note: 'สร้างใบสั่งซื้อ'
      });

      await newPO.save();

      return res.status(201).json({
        success: true,
        data: newPO,
        message: 'สร้างใบสั่งซื้อเรียบร้อย'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ'
      });
    }
  }

  // ดึงรายการ PO ทั้งหมด พร้อมนับจำนวนตามสถานะ
  static async getAllPO(req, res) {
    try {
      const { mode, branch_code } = req.query;
      let filter = {};

      // กรองตาม mode
      if (mode === 'pending') {
        filter.status = 'Pending';
      } else if (mode === 'history') {
        filter.status = { $in: ['Approved', 'Rejected'] };
      }

      // กรองตาม branch_code
      if (branch_code && branch_code !== 'all') {
        filter.branch_code = branch_code;
      }

      const orders = await PurchaseOrder.find(filter).limit(100).lean()
        .sort({ createdAt: -1 })
        .populate('supplier', 'name')
        .populate('branch', 'name')
        .populate('categoryGroup', 'name')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email');

      // นับจำนวนตามสถานะ
      const counts = {
        pending: await PurchaseOrder.countDocuments({ status: 'Pending' }),
        approved: await PurchaseOrder.countDocuments({ status: 'Approved' }),
        rejected: await PurchaseOrder.countDocuments({ status: 'Rejected' })
      };

      return res.json({
        success: true,
        data: orders,
        counts
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // อนุมัติ PO พร้อมบันทึกข้อมูลผู้อนุมัติ
  static async approvePO(req, res) {
    try {
      const { poId } = req.params;
      const { signatureImage } = req.body; // รับลายเซ็นจาก request body

      // ดึงข้อมูลผู้อนุมัติจาก token
      const currentUser = await getUserFromToken(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนทำการอนุมัติ'
        });
      }

      const po = await PurchaseOrder.findById(poId).lean();
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      if (po.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          error: 'ใบสั่งซื้อนี้ได้รับการอนุมัติหรือปฏิเสธไปแล้ว'
        });
      }

      // สร้าง document number (ถ้ายังไม่มี)
      if (!po.documentNumber) {
        const approvedCount = await PurchaseOrder.countDocuments({
          status: 'Approved'
        });
        po.documentNumber = `DOC${String(approvedCount + 1).padStart(6, '0')}`;
      }

      // อัพเดทสถานะและข้อมูลผู้อนุมัติ
      po.status = 'Approved';
      po.approvedBy = currentUser._id;

      // ปรับปรุงการสร้างชื่อผู้อนุมัติ
      let approverName = 'ผู้อนุมัติ';
      if (currentUser.name && currentUser.name.trim()) {
        approverName = currentUser.name.trim();
      } else if (currentUser.firstName || currentUser.lastName) {
        const firstName = (currentUser.firstName || '').trim();
        const lastName = (currentUser.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          approverName = fullName;
        }
      } else if (currentUser.email) {
        approverName = currentUser.email;
      }

      po.approvedByName = approverName;
      po.approvedAt = new Date();

      // บันทึกลายเซ็นผู้อนุมัติ (ถ้ามี)
      if (signatureImage) {
        po.approverSignature = signatureImage;
      }

      // เพิ่มประวัติการอนุมัติ
      po.history.push({
        oldStatus: 'Pending',
        newStatus: 'Approved',
        changedBy: currentUser._id,
        changedByName: po.approvedByName,
        note: 'อนุมัติใบสั่งซื้อ'
      });

      await po.save();

      return res.json({
        success: true,
        data: po,
        message: 'อนุมัติใบสั่งซื้อเรียบร้อย'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ปฏิเสธ PO พร้อมบันทึกข้อมูลผู้ปฏิเสธ
  static async rejectPO(req, res) {
    try {
      const { poId } = req.params;
      const { note } = req.body; // รับหมายเหตุการปฏิเสธ (ถ้ามี)

      // ดึงข้อมูลผู้ปฏิเสธจาก token
      const currentUser = await getUserFromToken(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนทำการปฏิเสธ'
        });
      }

      const po = await PurchaseOrder.findById(poId).lean();
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      if (po.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          error: 'ใบสั่งซื้อนี้ได้รับการอนุมัติหรือปฏิเสธไปแล้ว'
        });
      }

      // อัพเดทสถานะและข้อมูลผู้ปฏิเสธ
      po.status = 'Rejected';
      po.rejectedBy = currentUser._id;

      // ปรับปรุงการสร้างชื่อผู้ปฏิเสธ
      let rejectorName = 'ผู้ปฏิเสธ';
      if (currentUser.name && currentUser.name.trim()) {
        rejectorName = currentUser.name.trim();
      } else if (currentUser.firstName || currentUser.lastName) {
        const firstName = (currentUser.firstName || '').trim();
        const lastName = (currentUser.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          rejectorName = fullName;
        }
      } else if (currentUser.email) {
        rejectorName = currentUser.email;
      }

      po.rejectedByName = rejectorName;
      po.rejectedAt = new Date();

      // เพิ่มประวัติการปฏิเสธ
      po.history.push({
        oldStatus: 'Pending',
        newStatus: 'Rejected',
        changedBy: currentUser._id,
        changedByName: po.rejectedByName,
        note: note || 'ปฏิเสธใบสั่งซื้อ'
      });

      await po.save();

      return res.json({
        success: true,
        data: po,
        message: 'ปฏิเสธใบสั่งซื้อเรียบร้อย'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ดึง PO ตาม ID
  static async getPOById(req, res) {
    try {
      const { id } = req.params;

      const po = await PurchaseOrder.findById(id).lean()
        .populate('supplier')
        .populate('branch')
        .populate('categoryGroup')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email');

      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      return res.json({
        success: true,
        data: po
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ลบ PO
  static async deletePO(req, res) {
    try {
      const { id } = req.params;

      const po = await PurchaseOrder.findById(id).lean();
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      // ตรวจสอบว่า PO ถูกอนุมัติแล้วหรือไม่
      if (po.status === 'Approved') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถลบใบสั่งซื้อที่อนุมัติแล้วได้'
        });
      }

      await PurchaseOrder.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: 'ลบใบสั่งซื้อเรียบร้อย'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ดึงประวัติ PO
  static async getHistoryPO(req, res) {
    try {
      const { date, branch_code } = req.query;
      let filter = {
        status: { $in: ['Approved', 'Rejected'] }
      };

      // กรองตามวันที่
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        filter.docDate = {
          $gte: startDate,
          $lte: endDate
        };
      }

      // กรองตาม branch
      if (branch_code && branch_code !== 'all') {
        filter.branch_code = branch_code;
      }

      const orders = await PurchaseOrder.find(filter).limit(100).lean()
        .sort({ createdAt: -1 })
        .populate('supplier', 'name')
        .populate('branch', 'name')
        .populate('categoryGroup', 'name')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email');

      return res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // อัพเดท PO (สำหรับแก้ไขข้อมูลทั่วไป)
  static async updatePO(req, res) {
    try {
      const { id } = req.params;

      const po = await PurchaseOrder.findById(id).lean();
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      // ไม่อนุญาตให้แก้ไข PO ที่อนุมัติแล้ว
      if (po.status === 'Approved') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถแก้ไขใบสั่งซื้อที่อนุมัติแล้วได้'
        });
      }

      const updatedPO = await PurchaseOrder.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );

      return res.json({
        success: true,
        data: updatedPO
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // อัพเดทรายการสินค้าใน PO
  static async updatePOItem(req, res) {
    try {
      const { poId, itemIndex } = req.params;

      const po = await PurchaseOrder.findById(poId).lean();
      if (!po) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบสั่งซื้อ'
        });
      }

      if (po.status === 'Approved') {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถแก้ไขรายการในใบสั่งซื้อที่อนุมัติแล้วได้'
        });
      }

      const index = parseInt(itemIndex);
      if (index < 0 || index >= po.items.length) {
        return res.status(400).json({
          success: false,
          error: 'Invalid item index'
        });
      }

      // อัพเดทข้อมูล item
      Object.assign(po.items[index], req.body);

      // ถ้ามีการอัพโหลดรูป
      if (req.file) {
        po.items[index].image = `/uploads/${req.file.filename}`;
      }

      await po.save();

      return res.json({
        success: true,
        data: po
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // สร้าง PDF จาก PO
  static async generatePDF(req, res) {
    try {
      // 1) ดึง PO พร้อม populate ชื่อ approver
      const po = await PurchaseOrder.findById(req.params.id).lean()
        .populate('supplier')
        .populate('branch')
        .populate('categoryGroup')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name');      // ← เติมตรงนี้
      if (!po) return res.status(404).send('ไม่พบ PO');

      // 2) หาชื่อผู้อนุมัติ
      const currentUser = await getUserFromToken(req);
      let approverName = 'ผู้อนุมัติ';

      if (po.approvedByName && po.approvedByName.trim()) {
        approverName = po.approvedByName.trim();
      } else if (currentUser) {
        if (currentUser.name && currentUser.name.trim()) {
          approverName = currentUser.name.trim();
        } else if (currentUser.firstName || currentUser.lastName) {
          const firstName = (currentUser.firstName || '').trim();
          const lastName = (currentUser.lastName || '').trim();
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) {
            approverName = fullName;
          }
        }
      }

      const isApproved = po.status === 'Approved';

      // การแสดง signature box และ script จะแตกต่างกันตามสถานะ
      let signatureSection = '';
      let scriptSection = '';

      if (isApproved && po.approverSignature) {
        // ถ้าอนุมัติแล้วและมีลายเซ็น แสดงลายเซ็นที่บันทึกไว้
        signatureSection = `
          <div class="signature-box">
            <div class="signature-line">
              <img src="${po.approverSignature}" style="width:300px; height:80px; border:1px solid #ccc;" />
              <br>
              (${approverName})<br>
              ผู้อนุมัติ<br>
              <small>อนุมัติเมื่อ: ${new Date(po.approvedAt).toLocaleString('th-TH')}</small>
            </div>
          </div>`;
      } else if (isApproved) {
        // ถ้าอนุมัติแล้วแต่ไม่มีลายเซ็น
        signatureSection = `
          <div class="signature-box">
            <div class="signature-line">
              ลงชื่อ...............................................<br>
              (${approverName})<br>
              ผู้อนุมัติ<br>
              <small>อนุมัติเมื่อ: ${new Date(po.approvedAt).toLocaleString('th-TH')}</small>
            </div>
          </div>`;
      } else {
        // ถ้ายังไม่อนุมัติ แสดงปุ่มสำหรับเซ็นชื่อ
        signatureSection = `
          <div class="signature-box">
            <div id="openSig" class="signature-line clickable">
              ลงชื่อ...............................................<br>
              (${approverName})<br>
              ผู้อนุมัติ
            </div>
          </div>`;

        // เพิ่ม modal และ script สำหรับการเซ็นชื่อ
        scriptSection = `
          <!-- Modal signature pad -->
          <div id="sigModal">
            <div class="content">
              <h3>วาดลายเซ็น: ${approverName}</h3>
              <canvas id="sigPad" width="400" height="150"></canvas><br>
              <button id="clearSig" class="btn">ล้าง</button>
              <button id="saveSig" class="btn btn-primary">ยืนยันและอนุมัติ</button>
            </div>
          </div>

          <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js"></script>
          <script>
            const token = localStorage.getItem('authToken');
            const openSig = document.getElementById('openSig');

            if (openSig) {
              const modal = document.getElementById('sigModal');
              const canvas = document.getElementById('sigPad');
              const clear  = document.getElementById('clearSig');
              const save   = document.getElementById('saveSig');
              const sigPad = new SignaturePad(canvas, { backgroundColor: 'rgba(0,0,0,0)' });

              openSig.addEventListener('click', () => {
                document.getElementById('sigModal').style.display = 'flex';
              });
              clear.addEventListener('click', () => sigPad.clear());

              save.addEventListener('click', async () => {
                if (sigPad.isEmpty()) return alert('กรุณาวาดลายเซ็นก่อน');
                const dataURL = sigPad.toDataURL();
                const res = await fetch('/api/purchase-order/approve/${po._id}', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type':'application/json',
                    'Authorization':'Bearer ' + token
                  },
                  body: JSON.stringify({ signatureImage: dataURL })
                });
                const result = await res.json();
                if (!res.ok) return alert('Error: ' + result.error);
                alert('อนุมัติสำเร็จ');
                window.location.reload();
              });
            }
          </script>`;
      }

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PO ${po.poNumber}</title>
  <style>
    body { 
      font-family: 'THSarabunNew', sans-serif; 
      margin: 20px; 
      font-size: 14px; 
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-pending { background: #ffeaa7; color: #d63031; }
    .status-approved { background: #d5f4e6; color: #00b894; }
    .status-rejected { background: #fab1a0; color: #e17055; }
    .company-info {
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .company-logo-section {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .company-logo {
      width: 80px;
      height: 80px;
      margin-right: 20px;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px;
    }
    .company-details {
      flex: 1;
    }
    .company-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .po-info table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .po-info td {
      padding: 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th, .items-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
    }
    .items-table th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .total-section {
      margin: 20px 0;
    }
    .approval-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .signature-box {
      text-align: center;
      width: 300px;
    }
    .signature-line {
      min-height: 100px;
      border-bottom: 1px solid #000;
      margin-bottom: 10px;
      padding-top: 20px;
      position: relative;
    }
    .clickable {
      cursor: pointer;
      background-color: #f0f8ff;
      border: 2px dashed #007bff;
    }
    .clickable:hover {
      background-color: #e6f3ff;
    }
    #sigModal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    #sigModal .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    #sigPad { border:1px solid #ccc; }
    .btn { padding:8px 16px; margin:4px; }
    .btn-primary { background:#28a745; color:#fff; border:none; }
    .btn-secondary { background:#ccc; border:none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ใบสั่งซื้อ (Purchase Order)</h1>
    <div>
      เลขที่ ${po.poNumber}
      <span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span>
    </div>
  </div>
  
  <div class="company-info">
    <div class="company-logo-section">
      <img src="/Logo/Logo2png.png" alt="Company Logo" class="company-logo" 
           onerror="this.style.display='none'; this.parentElement.querySelector('.logo-placeholder').style.display='flex';" />
      <div class="logo-placeholder" style="display:none; width:80px; height:80px; border:2px solid #007bff; border-radius:4px; margin-right:20px; align-items:center; justify-content:center; background:#f8f9fa; font-size:12px; text-align:center; color:#007bff; font-weight:bold;">
        LOGO
      </div>
      <div class="company-details">
        <strong class="company-name">บริษัท 2 พี่น้อง โมบาย จำกัด</strong><br>
        สาขา: ${po.branch?.name || po.branch_code || '-'}<br>
        ${po.branch?.address || ''}<br>
        โทร: ${po.branch?.phone || '-'}<br>
      </div>
    </div>
  </div>
  
  <div class="po-info">
    <table>
      <tr>
        <td width="50%"><strong>ซัพพลายเออร์:</strong> ${po.supplier?.name || '-'}</td>
        <td><strong>วันที่ออกเอกสาร:</strong> ${new Date(po.docDate).toLocaleDateString('th-TH')}</td>
      </tr>
      <tr>
        <td><strong>ที่อยู่:</strong> ${po.supplier?.address || '-'}</td>
        <td><strong>กลุ่มจัดประเภท:</strong> ${po.categoryGroup?.name || '-'}</td>
      </tr>
      <tr>
        <td><strong>โทร:</strong> ${po.supplier?.phone || '-'}</td>
        <td><strong>ผู้สร้าง:</strong> ${po.createdByName || '-'}</td>
      </tr>
      <tr>
        <td><strong>อีเมล:</strong> ${po.supplier?.email || '-'}</td>
        <td><strong>สถานะ:</strong> ${
          po.status === 'Pending' ? 'รออนุมัติ' :
          po.status === 'Approved' ? 'อนุมัติแล้ว' :
          po.status === 'Rejected' ? 'ปฏิเสธแล้ว' : po.status
        }</td>
      </tr>
      <tr>
        <td colspan="2"><strong>หมายเหตุ:</strong> ${po.notes || '-'}</td>
      </tr>
    </table>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>ลำดับ</th>
        <th>รายการ</th>
        <th>แบรนด์</th>
        <th>จำนวน</th>
        <th>ราคา/หน่วย</th>
        <th>ส่วนลด</th>
        <th>ภาษี</th>
        <th>รวม</th>
      </tr>
    </thead>
    <tbody>
      ${po.items.map((item, index) => {
        const baseAmount = item.qty * (item.cost - item.discount);
        let netAmount = baseAmount;
        let taxAmount = 0;

        if (item.taxType === 'แยกภาษี') {
          taxAmount = baseAmount * (item.taxRate / 100);
        } else if (item.taxType === 'รวมภาษี') {
          netAmount = baseAmount / (1 + (item.taxRate / 100));
          taxAmount = baseAmount - netAmount;
        }

        const totalWithTax = netAmount + taxAmount;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${item.name || '-'}</td>
            <td>${item.brand || '-'}</td>
            <td>${item.qty}</td>
            <td>${item.cost.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
            <td>${item.discount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
            <td>${item.taxType === 'ไม่มีภาษี' ? '-' : `${item.taxRate}%`}</td>
            <td>${totalWithTax.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="total-section">
    <table style="width: 300px; margin-left: auto;">
      <tr>
        <td><strong>รวม:</strong></td>
        <td>
          ${po.items.reduce((sum, item) => {
            const baseAmount = item.qty * (item.cost - item.discount);
            let netAmount = baseAmount;
            let taxAmount = 0;

            if (item.taxType === 'แยกภาษี') {
              taxAmount = baseAmount * (item.taxRate / 100);
            } else if (item.taxType === 'รวมภาษี') {
              netAmount = baseAmount / (1 + (item.taxRate / 100));
              taxAmount = baseAmount - netAmount;
            }

            return sum + netAmount + taxAmount;
          }, 0).toLocaleString('th-TH', {minimumFractionDigits: 2})}
        </td>
      </tr>
    </table>
  </div>
  
  <div class="approval-section">
    <div class="signature-box">
      <div class="signature-line">
        ลงชื่อ...............................................<br>
        (${po.createdByName})<br>
        ผู้สร้าง
      </div>
    </div>
    ${signatureSection}
  </div>

  ${scriptSection}
</body>
</html>`;
      res.setHeader('Content-Type','text/html');
      res.send(html);

    } catch (error) {
      res.status(500).json({ success:false, error:error.message });
    }
  }
}

module.exports = PurchaseOrderController;
