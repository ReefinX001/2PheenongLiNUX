// controllers/Acc/chartOfAccountController.js
const ChartOfAccount = require('../../models/Account/ChartOfAccount');
const mongoose = require('mongoose');

class chartOfAccountController {
  // ดึงข้อมูลผังบัญชีทั้งหมด
  async getAll(req, res) {
    try {
      const {
        search,
        category,
        type,
        level,
        parentId,
        status = 'active'
      } = req.query;

      const query = {};

      // Filter by status
      if (status) query.status = status;

      // Filter by category
      if (category) query.category = category;

      // Filter by type
      if (type) query.type = type;

      // Filter by level
      if (level !== undefined) query.level = parseInt(level);

      // Filter by parent
      if (parentId) query.parent = parentId;

      // Search
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { code: searchRegex },
          { name: searchRegex }
        ];
      }

      // ดึงข้อมูลจากฐานข้อมูล
      const accounts = await ChartOfAccount.find(query).limit(100).lean()
        .populate('parent', 'code name')
        .populate('createdBy', 'name email')
        .sort('code')
        .lean();

      // สร้าง summary
      const summary = {
        total: accounts.length,
        byCategory: {},
        byType: {}
      };

      // นับจำนวนตาม category
      const categories = ['Asset', 'Liabilities', 'Equity', 'Income', 'Expense'];
      categories.forEach(cat => {
        summary.byCategory[cat] = accounts.filter(a => a.category === cat).length;
      });

      // นับจำนวนตาม type
      const types = ['header', 'detail'];
      types.forEach(t => {
        summary.byType[t] = accounts.filter(a => a.type === t).length;
      });

      return res.json({
        success: true,
        data: accounts,
        summary
      });

    } catch (error) {
      console.error('Get all accounts error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผังบัญชี',
        error: error.message
      });
    }
  }

  // สร้างบัญชีใหม่
  async create(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        code,
        name,
        category,
        type = 'detail',
        parent,
        description,
        status = 'active'
      } = req.body;

      // Validate required fields
      if (!code || !name || !category) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลที่จำเป็น (รหัสบัญชี, ชื่อบัญชี, หมวดหมู่)'
        });
      }

      // ตรวจสอบรหัสซ้ำ
      const existingAccount = await ChartOfAccount.findOne({ code }).lean().session(session);
      if (existingAccount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `รหัสบัญชี ${code} มีอยู่ในระบบแล้ว`
        });
      }

      // คำนวณ level
      let level = 0;
      let parentAccount = null;

      if (parent) {
        parentAccount = await ChartOfAccount.findById(parent).lean().session(session);
        if (!parentAccount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'ไม่พบบัญชีหลักที่ระบุ'
          });
        }
        level = parentAccount.level + 1;

        // ตรวจสอบ level สูงสุด
        if (level > 3) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'ไม่สามารถสร้างบัญชีเกิน 4 ระดับได้'
          });
        }
      }

      // สร้างบัญชีใหม่
      const newAccount = new ChartOfAccount({
        code,
        name,
        category,
        type,
        parent,
        level,
        description,
        status,
        balance: 0,
        createdBy: req.user?._id
      });

      const savedAccount = await newAccount.save({ session });

      // อัพเดท parent ให้เป็น header ถ้ามี child
      if (parent && parentAccount) {
        parentAccount.type = 'header';
        await parentAccount.save({ session });
      }

      await session.commitTransaction();

      // Populate ข้อมูลสำหรับ response
      const populatedAccount = await ChartOfAccount.findById(savedAccount._id).lean()
        .populate('parent', 'code name')
        .populate('createdBy', 'name email')
        .lean();

      // Emit event
      const io = req.app.get('io');
      if (io) {
        io.emit('accountCreated', {
          success: true,
          message: `สร้างบัญชี ${code} - ${name} สำเร็จ`,
          data: populatedAccount
        });
      }

      return res.status(201).json({
        success: true,
        message: 'สร้างบัญชีสำเร็จ',
        data: populatedAccount
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Create account error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างบัญชี',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // อัพเดทบัญชี
  async update(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { name, category, description, status } = req.body;

      const account = await ChartOfAccount.findById(id).lean().session(session);
      if (!account) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบบัญชีที่ต้องการแก้ไข'
        });
      }

      // อัพเดทข้อมูล
      if (name) account.name = name;
      if (category) account.category = category;
      if (description !== undefined) account.description = description;
      if (status) account.status = status;

      account.updatedBy = req.user?._id;
      account.updatedAt = new Date();

      const updatedAccount = await account.save({ session });

      await session.commitTransaction();

      // Populate ข้อมูล
      const populatedAccount = await ChartOfAccount.findById(updatedAccount._id).lean()
        .populate('parent', 'code name')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      return res.json({
        success: true,
        message: 'แก้ไขบัญชีสำเร็จ',
        data: populatedAccount
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Update account error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการแก้ไขบัญชี',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ลบบัญชี
  async delete(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      const account = await ChartOfAccount.findById(id).lean().session(session);
      if (!account) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบบัญชีที่ต้องการลบ'
        });
      }

      // ตรวจสอบว่ามีบัญชีย่อยหรือไม่
      const childCount = await ChartOfAccount.countDocuments({
        parent: id
      }).session(session);

      if (childCount > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลบบัญชีที่มีบัญชีย่อยได้'
        });
      }

      // ตรวจสอบว่ามีการใช้งานในรายการบัญชีหรือไม่
      const JournalEntry = require('../../models/POS/JournalEntry');
      const usageCount = await JournalEntry.countDocuments({
        accountCode: account.code
      }).session(session);

      if (usageCount > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลบบัญชีที่มีรายการใช้งานแล้วได้'
        });
      }

      // ลบบัญชี
      await ChartOfAccount.findByIdAndDelete(id).session(session);

      await session.commitTransaction();

      return res.json({
        success: true,
        message: `ลบบัญชี ${account.code} - ${account.name} สำเร็จ`
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Delete account error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบบัญชี',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ดึงข้อมูลบัญชีตาม ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const account = await ChartOfAccount.findById(id).lean()
        .populate('parent', 'code name')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบบัญชีที่ต้องการ'
        });
      }

      // ดึงบัญชีย่อย
      const children = await ChartOfAccount.find({ parent: id }).limit(100).lean()
        .select('code name type')
        .sort('code')
        .lean();

      account.children = children;

      return res.json({
        success: true,
        data: account
      });

    } catch (error) {
      console.error('Get by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        error: error.message
      });
    }
  }

  // Export ข้อมูลเป็น Excel
  async exportExcel(req, res) {
    try {
      const accounts = await ChartOfAccount.find({ status: 'active' }).limit(100).lean()
        .populate('parent', 'code name')
        .sort('code')
        .lean();

      // แปลงข้อมูลสำหรับ Excel
      const exportData = accounts.map(acc => ({
        'รหัสบัญชี': acc.code,
        'ชื่อบัญชี': acc.name,
        'หมวดหมู่': this.getCategoryText(acc.category),
        'ประเภท': acc.type === 'header' ? 'หัวข้อ' : 'รายละเอียด',
        'บัญชีหลัก': acc.parent ? `${acc.parent.code} - ${acc.parent.name}` : '-',
        'ระดับ': acc.level,
        'ยอดคงเหลือ': acc.balance || 0,
        'สถานะ': acc.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'
      }));

      // สร้าง workbook
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ผังบัญชี');

      // ตั้งค่า column width
      const colWidths = [
        { wch: 10 }, // รหัสบัญชี
        { wch: 30 }, // ชื่อบัญชี
        { wch: 15 }, // หมวดหมู่
        { wch: 12 }, // ประเภท
        { wch: 30 }, // บัญชีหลัก
        { wch: 8 },  // ระดับ
        { wch: 15 }, // ยอดคงเหลือ
        { wch: 10 }  // สถานะ
      ];
      ws['!cols'] = colWidths;

      // สร้าง buffer
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      // ส่ง response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=chart_of_accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);

    } catch (error) {
      console.error('Export Excel error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล',
        error: error.message
      });
    }
  }

  // Import ข้อมูลจาก Excel
  async importExcel(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!req.file) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกไฟล์ Excel'
        });
      }

      const XLSX = require('xlsx');
      const workbook = XLSX.read(req.file.buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        success: [],
        failed: [],
        total: jsonData.length
      };

      for (const row of jsonData) {
        try {
          const code = row['รหัสบัญชี'];
          const name = row['ชื่อบัญชี'];
          const category = this.getCategoryFromText(row['หมวดหมู่']);

          if (!code || !name || !category) {
            results.failed.push({
              row: row,
              error: 'ข้อมูลไม่ครบถ้วน'
            });
            continue;
          }

          // ตรวจสอบว่ามีอยู่แล้วหรือไม่
          const existing = await ChartOfAccount.findOne({ code }).lean().session(session);
          if (existing) {
            results.failed.push({
              row: row,
              error: `รหัสบัญชี ${code} มีอยู่แล้ว`
            });
            continue;
          }

          // สร้างบัญชีใหม่
          const newAccount = new ChartOfAccount({
            code,
            name,
            category,
            type: row['ประเภท'] === 'หัวข้อ' ? 'header' : 'detail',
            level: parseInt(row['ระดับ']) || 0,
            balance: parseFloat(row['ยอดคงเหลือ']) || 0,
            status: row['สถานะ'] === 'ไม่ใช้งาน' ? 'inactive' : 'active',
            createdBy: req.user?._id
          });

          await newAccount.save({ session });
          results.success.push(code);

        } catch (error) {
          results.failed.push({
            row: row,
            error: error.message
          });
        }
      }

      await session.commitTransaction();

      return res.json({
        success: true,
        message: `นำเข้าสำเร็จ ${results.success.length} จาก ${results.total} รายการ`,
        data: results
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Import Excel error:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // Helper functions
  getCategoryText(category) {
    const map = {
      'Asset': 'สินทรัพย์',
      'Liabilities': 'หนี้สิน',
      'Equity': 'ส่วนของเจ้าของ',
      'Income': 'รายได้',
      'Expense': 'ค่าใช้จ่าย'
    };
    return map[category] || category;
  }

  getCategoryFromText(text) {
    const map = {
      'สินทรัพย์': 'Asset',
      'หนี้สิน': 'Liabilities',
      'ส่วนของเจ้าของ': 'Equity',
      'รายได้': 'Income',
      'ค่าใช้จ่าย': 'Expense'
    };
    return map[text] || null;
  }
}

module.exports = new chartOfAccountController();
