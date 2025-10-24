// controllers/salesReportController.js

const SalesReport = require('../models/POS/SalesReport');

/**
 * POST /api/sales-report
 * สร้าง SalesReport ใหม่
 */
exports.createReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      report_date,
      time_period,
      total_sales,
      total_orders,
      category_id,
      product_id,
      branch_code,
      graph_data
    } = req.body;

    const newReport = new SalesReport({
      report_date: report_date ? new Date(report_date) : new Date(),
      time_period: time_period || '',
      total_sales: total_sales || 0,
      total_orders: total_orders || 0,
      category_id: category_id || null,
      product_id: product_id || null,
      branch_code: branch_code || null,
      graph_data: graph_data || ''
    });

    await newReport.save();

    io.emit('newreportCreated', {
      id: newReport.save()._id,
      data: newReport.save()
    });



    return res.json({ success: true, data: newReport });
  } catch (err) {
    console.error('createReport error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/sales-report
 * ดึงรายการ SalesReport ทั้งหมด
 */
exports.getAllReports = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate category_id, product_id, branch_id ถ้าต้องการ
    const reports = await SalesReport.find().limit(100).lean()
      .populate('category_id', 'name')  // สมมติ Category มีฟิลด์ name
      .populate('product_id', 'name sku')
      .populate('branch_code', 'name')    // สมมติ Branch มีฟิลด์ name
      .sort({ report_date: -1 });

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/sales-report/:id
 * ดึง SalesReport ตาม _id
 */
exports.getReportById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const report = await SalesReport.findById(id).lean()
      .populate('category_id', 'name')
      .populate('product_id', 'name sku')
      .populate('branch_code', 'name');

    if (!report) {
      return res.status(404).json({ error: 'SalesReport not found' });
    }
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('getReportById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/sales-report/:id
 * อัปเดตข้อมูลบางส่วนของ SalesReport
 */
exports.updateReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      report_date,
      time_period,
      total_sales,
      total_orders,
      category_id,
      product_id,
      branch_code,
      graph_data
    } = req.body;

    const report = await SalesReport.findById(id).lean();
    if (!report) {
      return res.status(404).json({ error: 'SalesReport not found' });
    }

    if (report_date !== undefined) report.report_date = new Date(report_date);
    if (time_period !== undefined) report.time_period = time_period;
    if (total_sales !== undefined) report.total_sales = total_sales;
    if (total_orders !== undefined) report.total_orders = total_orders;
    if (category_id !== undefined) report.category_id = category_id;
    if (product_id !== undefined) report.product_id = product_id;
    if (branch_code !== undefined) report.branch_code = branch_code;
    if (graph_data !== undefined) report.graph_data = graph_data;

    await report.save();

    io.emit('reportCreated', {
      id: report.save()._id,
      data: report.save()
    });



    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('updateReport error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/sales-report/:id
 * ลบออกจาก DB จริง
 * (ถ้าต้องการ Soft Delete ให้เพิ่มฟิลด์ deleted_at และฟังก์ชัน softDelete() ใน Schema)
 */
exports.deleteReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const report = await SalesReport.findById(id).lean();
    if (!report) {
      return res.status(404).json({ error: 'SalesReport not found' });
    }

    await report.remove();
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('deleteReport error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
