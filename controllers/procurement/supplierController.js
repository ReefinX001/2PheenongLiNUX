// controllers/supplierController.js
const Supplier = require('../models/Stock/Supplier');

/**
 * POST /api/supplier
 * สร้าง Supplier ใหม่ (Soft Delete ยังเป็น null)
 */
exports.createSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, code, taxId, contact, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Supplier name is required.' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: 'Supplier code is required.' });
    }

    const newSupplier = new Supplier({
      name,
      code,
      taxId: taxId || '',
      contact: contact || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      deleted_at: null
    });

    await newSupplier.save();

    io.emit('newsupplierCreated', {
      id: newSupplier.save()._id,
      data: newSupplier.save()
    });



    return res.json({
      success: true,
      data: newSupplier,
      message: 'Supplier created successfully.'
    });
  } catch (err) {
    console.error('createSupplier error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create supplier.'
    });
  }
};

/**
 * GET /api/supplier
 * ดึงซัพพลายเออร์ทั้งหมดที่ deleted_at = null
 */
exports.getAllSuppliers = async (req, res) => {
  const io = req.app.get('io');
  try {
    const suppliers = await Supplier.find({ deleted_at: null }).limit(100).lean().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: suppliers,
      message: 'Retrieved all suppliers.'
    });
  } catch (err) {
    console.error('getAllSuppliers error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to get suppliers.'
    });
  }
};

/**
 * GET /api/supplier/:id
 * ดึงซัพพลายเออร์ตาม _id (ที่ยังไม่ถูกลบ)
 */
exports.getSupplierById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const supplier = await Supplier.findOne({ _id: id, deleted_at: null }).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found or already deleted.'
      });
    }

    return res.json({
      success: true,
      data: supplier,
      message: 'Supplier retrieved successfully.'
    });
  } catch (err) {
    console.error('getSupplierById error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to get supplier.'
    });
  }
};

/**
 * PATCH /api/supplier/:id
 * อัปเดตข้อมูลบางส่วน (Soft Delete ไม่กระทบ ถ้ายัง deleted_at = null)
 */
exports.updateSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { name, code, taxId, contact, phone, email, address } = req.body;

    const supplier = await Supplier.findOne({ _id: id, deleted_at: null }).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found or already deleted.'
      });
    }

    if (name !== undefined) supplier.name = name;
    if (code !== undefined) supplier.code = code;
    if (taxId !== undefined) supplier.taxId = taxId;
    if (contact !== undefined) supplier.contact = contact;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;

    await supplier.save();

    io.emit('supplierCreated', {
      id: supplier.save()._id,
      data: supplier.save()
    });



    return res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully.'
    });
  } catch (err) {
    console.error('updateSupplier error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update supplier.'
    });
  }
};

/**
 * DELETE /api/supplier/:id
 * Soft Delete (ตั้ง deleted_at = Date.now())
 */
exports.deleteSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const supplier = await Supplier.findOne({ _id: id, deleted_at: null }).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found or already deleted.'
      });
    }

    // softDelete => supplier.deleted_at = Date.now()
    await supplier.softDelete();

    return res.json({
      success: true,
      data: supplier,
      message: 'Supplier soft-deleted successfully.'
    });
  } catch (err) {
    console.error('deleteSupplier error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete supplier.'
    });
  }
};

/**
 * (Optional) DELETE /api/supplier/:id/force
 * ลบข้อมูล Supplier ออกจากฐานข้อมูลจริง
 */
exports.forceDeleteSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found in DB.'
      });
    }

    await supplier.remove();

    return res.json({
      success: true,
      data: supplier,
      message: 'Supplier force-deleted from DB.'
    });
  } catch (err) {
    console.error('forceDeleteSupplier error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to force delete supplier.'
    });
  }
};
