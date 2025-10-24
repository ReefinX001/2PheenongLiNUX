// controllers/supplierController.js
const Supplier = require('../models/Stock/Supplier');

/**
 * POST /api/supplier
 * สร้าง Supplier ใหม่ (Soft Delete ยังเป็น null)
 */
exports.createSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      name, code, taxId, branchCode,
      contact, contactPerson, position,
      phone, mobile, fax, email, website,
      address, subDistrict, district, province, postalCode,
      creditDays, creditLimit, paymentType,
      bankAccount, bankName, bankBranch,
      notes, remark, status
    } = req.body;

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
      branchCode: branchCode || '',
      contact: contact || '',
      contactPerson: contactPerson || '',
      position: position || '',
      phone: phone || '',
      mobile: mobile || '',
      fax: fax || '',
      email: email || '',
      website: website || '',
      address: address || '',
      subDistrict: subDistrict || '',
      district: district || '',
      province: province || '',
      postalCode: postalCode || '',
      creditDays: creditDays || 0,
      creditLimit: creditLimit || 0,
      paymentType: paymentType || '',
      bankAccount: bankAccount || '',
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      notes: notes || '',
      remark: remark || '',
      status: status || 'active',
      deleted_at: null
    });

    await newSupplier.save();

    io.emit('newsupplierCreated', {
      id: newSupplier._id,
      data: newSupplier
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
    const supplier = await Supplier.findOne({ _id: id, deleted_at: null });
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
    const {
      name, code, taxId, branchCode,
      contact, contactPerson, position,
      phone, mobile, fax, email, website,
      address, subDistrict, district, province, postalCode,
      creditDays, creditLimit, paymentType,
      bankAccount, bankName, bankBranch,
      notes, remark, status
    } = req.body;

    const supplier = await Supplier.findOne({ _id: id, deleted_at: null });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found or already deleted.'
      });
    }

    // Update fields if provided
    if (name !== undefined) supplier.name = name;
    if (code !== undefined) supplier.code = code;
    if (taxId !== undefined) supplier.taxId = taxId;
    if (branchCode !== undefined) supplier.branchCode = branchCode;
    if (contact !== undefined) supplier.contact = contact;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (position !== undefined) supplier.position = position;
    if (phone !== undefined) supplier.phone = phone;
    if (mobile !== undefined) supplier.mobile = mobile;
    if (fax !== undefined) supplier.fax = fax;
    if (email !== undefined) supplier.email = email;
    if (website !== undefined) supplier.website = website;
    if (address !== undefined) supplier.address = address;
    if (subDistrict !== undefined) supplier.subDistrict = subDistrict;
    if (district !== undefined) supplier.district = district;
    if (province !== undefined) supplier.province = province;
    if (postalCode !== undefined) supplier.postalCode = postalCode;
    if (creditDays !== undefined) supplier.creditDays = creditDays;
    if (creditLimit !== undefined) supplier.creditLimit = creditLimit;
    if (paymentType !== undefined) supplier.paymentType = paymentType;
    if (bankAccount !== undefined) supplier.bankAccount = bankAccount;
    if (bankName !== undefined) supplier.bankName = bankName;
    if (bankBranch !== undefined) supplier.bankBranch = bankBranch;
    if (notes !== undefined) supplier.notes = notes;
    if (remark !== undefined) supplier.remark = remark;
    if (status !== undefined) supplier.status = status;

    await supplier.save();

    io.emit('supplierUpdated', {
      id: supplier._id,
      data: supplier
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
    const supplier = await Supplier.findOne({ _id: id, deleted_at: null });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found or already deleted.'
      });
    }

    // softDelete => supplier.deleted_at = Date.now()
    await supplier.softDelete();

    io.emit('supplierDeleted', {
      id: supplier._id,
      data: supplier
    });

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
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found in DB.'
      });
    }

    await Supplier.findByIdAndDelete(id);

    io.emit('supplierForceDeleted', {
      id: supplier._id,
      data: supplier
    });

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
