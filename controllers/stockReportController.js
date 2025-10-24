// controllers/stockReportController.js

const StockReport = require('../models/Stock/StockReport');

/**
 * POST /api/stock-report
 * สร้าง StockReport ใหม่
 */
exports.createReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      report_date,
      time_period,
      branch_code,
      product_id,
      remaining_stock,
      minimum_stock,
      is_dead_stock,
      graph_data
    } = req.body;

    const newReport = new StockReport({
      report_date: report_date ? new Date(report_date) : new Date(),
      time_period: time_period || '',
      branch_code: branch_code || null,
      product_id: product_id || null,
      remaining_stock: remaining_stock || 0,
      minimum_stock: minimum_stock || 0,
      is_dead_stock: is_dead_stock || false,
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
 * GET /api/stock-report
 * ดึง StockReport ทั้งหมด
 */
exports.getAllReports = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate branch_id, product_id ถ้าต้องการ
    const reports = await StockReport.find().limit(100).lean()
      .populate('branch_code', 'name')    // สมมติ Branch มีฟิลด์ name
      .populate('product_id', 'name')   // สมมติ Product มีฟิลด์ name
      .sort({ report_date: -1 });

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-report/:id
 * ดึง StockReport ตาม _id
 */
exports.getReportById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const report = await StockReport.findById(id).lean()
      .populate('branch_code', 'name')
      .populate('product_id', 'name');

    if (!report) {
      return res.status(404).json({ error: 'StockReport not found' });
    }
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('getReportById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-report/branch/:branchId
 * ดึง StockReport เฉพาะสาขานั้น
 */
exports.getReportsByBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branchId } = req.params;
    const reports = await StockReport.find({ branch_code: branchId }).limit(100).lean()
      .populate('product_id', 'name')
      .sort({ report_date: -1 });

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('getReportsByBranch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-report/product/:productId
 * ดึง StockReport เฉพาะสินค้านั้น
 */
exports.getReportsByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const reports = await StockReport.find({ product_id: productId }).limit(100).lean()
      .populate('branch_code', 'name')
      .sort({ report_date: -1 });

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('getReportsByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/stock-report/:id
 * อัปเดตบางส่วนของ StockReport
 */
exports.updateReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      report_date,
      time_period,
      branch_code,
      product_id,
      remaining_stock,
      minimum_stock,
      is_dead_stock,
      graph_data
    } = req.body;

    const report = await StockReport.findById(id).lean();
    if (!report) {
      return res.status(404).json({ error: 'StockReport not found' });
    }

    if (report_date !== undefined) report.report_date = new Date(report_date);
    if (time_period !== undefined) report.time_period = time_period;
    if (branch_code !== undefined) report.branch_code = branch_code;
    if (product_id !== undefined) report.product_id = product_id;
    if (remaining_stock !== undefined) report.remaining_stock = remaining_stock;
    if (minimum_stock !== undefined) report.minimum_stock = minimum_stock;
    if (is_dead_stock !== undefined) report.is_dead_stock = is_dead_stock;
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
 * DELETE /api/stock-report/:id
 * ลบออกจาก DB จริง
 */
exports.deleteReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const report = await StockReport.findById(id).lean();
    if (!report) {
      return res.status(404).json({ error: 'StockReport not found' });
    }

    await report.remove();
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('deleteReport error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
