/**
 * @file occupationController.js
 * @description Controller for handling occupation-related operations
 * @version 1.0.0
 * @date 2025-01-27
 */

const Customer = require('../models/Customer/Customer');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const {
  transformLegacyOccupation,
  validateOccupationData,
  normalizeOccupationData,
  formatOccupationDisplay,
  requiresIncomeVerification,
  getSubcategoryOptions
} = require('../utils/occupationDataHelper');

class OccupationController {
  /**
   * Get occupation categories and subcategories
   */
  static async getOccupationOptions(req, res) {
    try {
      const categories = [
        'ข้าราชการ',
        'พนักงานรัฐวิสาหกิจ',
        'พนักงานบริษัท',
        'ธุรกิจส่วนตัว',
        'เกษตรกร',
        'รับจ้างทั่วไป',
        'อื่นๆ'
      ];

      const categoryOptions = categories.map(category => ({
        value: category,
        label: category,
        subcategories: getSubcategoryOptions(category)
      }));

      res.json({
        success: true,
        data: {
          categories: categoryOptions,
          requiresOtherDetail: ['อื่นๆ']
        }
      });
    } catch (error) {
      console.error('Error getting occupation options:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลตัวเลือกอาชีพได้',
        error: error.message
      });
    }
  }

  /**
   * Test occupation data validation
   */
  static async testOccupationValidation(req, res) {
    try {
      console.log('🧪 Testing occupation data validation...');
      console.log('Request body:', req.body);

      const normalizedData = normalizeOccupationData(req.body);
      const validation = validateOccupationData(normalizedData);
      const displayText = formatOccupationDisplay(normalizedData);
      const needsVerification = requiresIncomeVerification(normalizedData);

      res.json({
        success: true,
        data: {
          originalData: req.body,
          normalizedData,
          validation,
          displayText,
          needsIncomeVerification: needsVerification,
          testResult: 'Occupation data processing completed successfully'
        }
      });
    } catch (error) {
      console.error('Error testing occupation validation:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบข้อมูลอาชีพ',
        error: error.message
      });
    }
  }

  /**
   * Test customer creation with occupation data
   */
  static async testCustomerCreation(req, res) {
    try {
      console.log('🧪 Testing customer creation with occupation data...');

      const {
        customerType = 'individual',
        firstName = 'ทดสอบ',
        lastName = 'อาชีพ',
        phone = '0123456789',
        taxId = `TEST${Date.now()}`,
        occupationData
      } = req.body;

      const normalizedOccupation = normalizeOccupationData({ occupationData });
      const validation = validateOccupationData(normalizedOccupation);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลอาชีพไม่ถูกต้อง',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Create test customer with occupation data
      const customerData = {
        customerType,
        individual: {
          prefix: 'นาย',
          firstName,
          lastName,
          phone,
          taxId,
          occupation: normalizedOccupation,
          income: normalizedOccupation.monthlyIncome || 0
        }
      };

      const customer = new Customer(customerData);
      await customer.save();

      console.log('✅ Test customer created successfully');

      res.json({
        success: true,
        data: {
          customerId: customer._id,
          customerData: customer.toObject(),
          occupationDisplay: formatOccupationDisplay(normalizedOccupation),
          validation,
          message: 'ทดสอบสร้างลูกค้าพร้อมข้อมูลอาชีพสำเร็จ'
        }
      });
    } catch (error) {
      console.error('Error testing customer creation:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบสร้างลูกค้า',
        error: error.message
      });
    }
  }

  /**
   * Test InstallmentOrder creation with occupation data
   */
  static async testInstallmentOrderCreation(req, res) {
    try {
      console.log('🧪 Testing InstallmentOrder creation with occupation data...');

      const {
        customerType = 'individual',
        firstName = 'ทดสอบ',
        lastName = 'ผ่อน',
        phone = '0123456789',
        taxId = `INST${Date.now()}`,
        occupationData,
        totalAmount = 10000,
        downPayment = 2000,
        installmentCount = 6
      } = req.body;

      const normalizedOccupation = normalizeOccupationData({ occupationData });
      const validation = validateOccupationData(normalizedOccupation);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลอาชีพไม่ถูกต้อง',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Create test customer first
      const customerData = {
        customerType,
        individual: {
          prefix: 'นาย',
          firstName,
          lastName,
          phone,
          taxId,
          occupation: normalizedOccupation,
          income: normalizedOccupation.monthlyIncome || 0
        }
      };

      const customer = new Customer(customerData);
      await customer.save();

      // Create test installment order
      const installmentData = {
        contractNo: `TEST-${Date.now()}`,
        planType: 'manual',
        branch_code: '00000',
        customer: customer._id,
        customer_info: {
          prefix: 'นาย',
          firstName,
          lastName,
          phone,
          taxId,
          occupation: normalizedOccupation,
          income: normalizedOccupation.monthlyIncome || 0
        },
        items: [{
          name: 'สินค้าทดสอบ',
          qty: 1,
          downAmount: downPayment
        }],
        totalAmount,
        downPayment,
        installmentCount,
        monthlyPayment: Math.round((totalAmount - downPayment) / installmentCount)
      };

      const installmentOrder = new InstallmentOrder(installmentData);
      await installmentOrder.save();

      console.log('✅ Test InstallmentOrder created successfully');

      res.json({
        success: true,
        data: {
          customerId: customer._id,
          installmentOrderId: installmentOrder._id,
          customerData: customer.toObject(),
          installmentData: installmentOrder.toObject(),
          occupationDisplay: formatOccupationDisplay(normalizedOccupation),
          validation,
          message: 'ทดสอบสร้างสัญญาผ่อนพร้อมข้อมูลอาชีพสำเร็จ'
        }
      });
    } catch (error) {
      console.error('Error testing InstallmentOrder creation:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบสร้างสัญญาผ่อน',
        error: error.message
      });
    }
  }

  /**
   * Migrate legacy occupation data
   */
  static async migrateLegacyOccupationData(req, res) {
    try {
      console.log('🔄 Starting legacy occupation data migration...');

      const { dryRun = true, limit = 10 } = req.query;
      const results = {
        processed: 0,
        updated: 0,
        errors: [],
        preview: []
      };

      // Find customers with legacy occupation data
      const customers = await Customer.find({
        $or: [
          { 'individual.occupation.legacyOccupationText': { $exists: true, $ne: '' } },
          { 'individual.occupation': { $type: 'string' } }
        ]
      }).limit(parseInt(limit));

      for (const customer of customers) {
        try {
          results.processed++;

          let needsUpdate = false;
          let newOccupationData = null;

          // Check if occupation is still in old string format
          if (typeof customer.individual?.occupation === 'string') {
            newOccupationData = transformLegacyOccupation(customer.individual.occupation);
            needsUpdate = true;
          }

          if (needsUpdate && !dryRun) {
            await Customer.findByIdAndUpdate(customer._id, {
              'individual.occupation': newOccupationData
            });
            results.updated++;
          }

          if (needsUpdate) {
            results.preview.push({
              customerId: customer._id,
              customerName: `${customer.individual?.firstName} ${customer.individual?.lastName}`,
              oldOccupation: customer.individual?.occupation,
              newOccupationData,
              status: dryRun ? 'preview' : 'updated'
            });
          }
        } catch (error) {
          results.errors.push({
            customerId: customer._id,
            error: error.message
          });
        }
      }

      console.log(`✅ Migration ${dryRun ? 'preview' : 'completed'}: ${results.updated}/${results.processed} records`);

      res.json({
        success: true,
        data: results,
        message: `Migration ${dryRun ? 'preview' : 'completed'} successfully`
      });
    } catch (error) {
      console.error('Error migrating legacy occupation data:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการย้ายข้อมูลอาชีพ',
        error: error.message
      });
    }
  }

  /**
   * Get occupation statistics
   */
  static async getOccupationStatistics(req, res) {
    try {
      console.log('📊 Generating occupation statistics...');

      const customerStats = await Customer.aggregate([
        { $match: { customerType: 'individual', deleted_at: null } },
        { $group: {
          _id: '$individual.occupation.category',
          count: { $sum: 1 },
          avgIncome: { $avg: '$individual.occupation.monthlyIncome' }
        }},
        { $sort: { count: -1 } }
      ]);

      const installmentStats = await InstallmentOrder.aggregate([
        { $match: { deleted_at: null } },
        { $group: {
          _id: '$customer_info.occupation.category',
          count: { $sum: 1 },
          avgAmount: { $avg: '$totalAmount' },
          avgIncome: { $avg: '$customer_info.occupation.monthlyIncome' }
        }},
        { $sort: { count: -1 } }
      ]);

      const totalCustomers = await Customer.countDocuments({
        customerType: 'individual',
        deleted_at: null
      });

      const totalInstallments = await InstallmentOrder.countDocuments({
        deleted_at: null
      });

      res.json({
        success: true,
        data: {
          customerOccupationStats: customerStats,
          installmentOccupationStats: installmentStats,
          totals: {
            customers: totalCustomers,
            installments: totalInstallments
          },
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error generating occupation statistics:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างสถิติอาชีพ',
        error: error.message
      });
    }
  }
}

module.exports = OccupationController;