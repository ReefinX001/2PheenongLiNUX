// Controller สำหรับจัดการ Installment (ระบบผ่อนชำระ)
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Installment = require('../models/Installment');
const Customer = require('../models/Customer/Customer');
const User = require('../models/User/User');
const Product = require('../models/Stock/Product');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Payment = require('../models/Account/paymentModel');
const moment = require('moment');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');

// Import additional models
const Contract = require('../models/Load/Contract');
const ContractPaymentLog = require('../models/Load/ContractPaymentLog');
const JournalEntry = require('../models/Account/JournalEntry');
const BadDebtCriteria = require('../models/BadDebtCriteria');

class installmentController {
  // สร้างสัญญาผ่อนชำระใหม่ พร้อมการตรวจสอบข้อมูลที่ปรับปรุง
  static async createInstallment(req, res) {
    try {
      console.log('📝 Creating new installment contract...');
      console.log('Request body:', req.body);

      // Check database connection before proceeding
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.error('❌ Database not connected, readyState:', mongoose.connection.readyState);
        return res.status(503).json({
          success: false,
          message: 'เซิร์ฟเวอร์ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          error: 'DATABASE_NOT_CONNECTED',
          retryable: true
        });
      }

      // ✅ Extract data from frontend format
      console.log('🔍 Raw request body:', JSON.stringify(req.body, null, 2));

      const {
        items = [],
        customer = {},
        branch_code,
        installment_plan = {},
        payment = {},
        customer_type,
        attachments = {}
      } = req.body;

      // ✅ Map frontend data to backend format
      const firstItem = items[0] || {};

      // ✅ Enhanced customer mapping with more field variations
      let customerId = customer.id || customer._id || customer.customerId || customer.customer_id;

      // Enhanced customer name mapping
      const customerFullName = customer.fullName || customer.name ||
                              `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim() ||
                              customer.customerName || '';

      // Enhanced customer phone mapping
      const customerPhone = customer.phone || customer.phoneNumber || customer.phone_number ||
                           customer.mobile || customer.tel || customer.telephone || '';

      // Enhanced customer address mapping with Object to String conversion
      let customerAddress = customer.address || customer.full_address || customer.customerAddress ||
                           customer.street || customer.location || '';

      // Handle address Object conversion to string
      if (typeof customerAddress === 'object' && customerAddress !== null) {
        const addr = customerAddress;
        customerAddress = [
          addr.houseNo && `บ้านเลขที่ ${addr.houseNo}`,
          addr.moo && `หมู่ ${addr.moo}`,
          addr.lane && `ซอย ${addr.lane}`,
          addr.road && `ถนน ${addr.road}`,
          addr.subDistrict && `ตำบล ${addr.subDistrict}`,
          addr.district && `อำเภอ ${addr.district}`,
          addr.province && `จังหวัด ${addr.province.replace(' — Pattani', '').replace(' — ', '').replace('ปัตตานี — Pattani', 'ปัตตานี')}`,
          addr.zipcode && `รหัสไปรษณีย์ ${addr.zipcode}`
        ].filter(Boolean).join(' ') || 'ไม่ระบุที่อยู่';
        console.log('🏠 Address Object converted to string:', { original: addr, converted: customerAddress });
      }

      if (!customerId && (customerFullName || customerPhone)) {
        console.log('🆕 Creating customer from data:', {
          name: customerFullName,
          phone: customerPhone,
          address: customerAddress
        });
        // Generate temporary customer ID
        customerId = new (require('mongodb').ObjectId)();
        console.log('✅ Generated temporary customerId:', customerId);
      }

      // ✅ Enhanced product mapping with more field variations
      const productId = firstItem.productId || firstItem.id || firstItem._id ||
                       firstItem.branchStockId || firstItem.itemId || firstItem.product_id ||
                       firstItem.stockId;

      const productName = firstItem.name || firstItem.productName || firstItem.product_name ||
                         firstItem.title || firstItem.itemName || 'ไม่ระบุสินค้า';

      const productPrice = parseFloat(firstItem.price || firstItem.totalPrice || firstItem.total_price ||
                                     firstItem.unitPrice || firstItem.unit_price || firstItem.amount || 0);

      // ✅ Enhanced payment and installment data mapping
      const planData = installment_plan.selectedPlan || installment_plan || {};

      // Enhanced down payment mapping
      const downPayment = parseFloat(planData.downPayment || planData.down_payment ||
                                    payment.downPayment || payment.down_payment ||
                                    installment_plan.down_payment || req.body.downPayment || 0);

      // Enhanced installment period mapping
      const installmentPeriod = parseInt(planData.installmentPeriod || planData.installmentMonths ||
                                        planData.installment_months || installment_plan.installment_count ||
                                        installment_plan.period || req.body.installmentMonths || 12);

      // Enhanced monthly payment mapping with additional fallbacks
      const monthlyPayment = parseFloat(planData.installmentAmount || planData.monthlyPayment ||
                                       planData.monthly_payment || installment_plan.installment_amount ||
                                       installment_plan.monthly_amount || installment_plan.installmentAmount ||
                                       planData.selectedPlan?.installmentAmount || planData.selectedPlan?.monthly_payment ||
                                       req.body.monthlyPayment || req.body.installmentAmount ||
                                       req.body.installment_amount || 0);

      // Enhanced total amount mapping
      const totalAmount = parseFloat(planData.totalAmount || planData.total_amount ||
                                    firstItem.totalPrice || firstItem.total_price ||
                                    firstItem.price || planData.creditAmount ||
                                    planData.financeAmount || req.body.totalAmount || productPrice || 0);

      // ✅ Calculate missing required fields for model validation
      const financeAmount = totalAmount - downPayment;

      // Calculate interest rate and total interest
      const totalAmountPaid = downPayment + (monthlyPayment * installmentPeriod);
      const totalInterest = Math.max(0, totalAmountPaid - totalAmount);
      const interestRate = financeAmount > 0 ? (totalInterest / financeAmount) * 100 : 0;

      console.log('💰 Financial calculations:', {
        totalAmount,
        downPayment,
        financeAmount,
        monthlyPayment,
        installmentPeriod,
        totalAmountPaid,
        totalInterest,
        interestRate: interestRate.toFixed(2) + '%'
      });

      const branchCode = branch_code || '00000';
      const contractNo = req.body.contractNumber || req.body.contractNo;
      const planType = planData.type || 'manual';
      const customerData = customer;

      // ✅ Debug monthly payment mapping
      console.log('💰 Monthly payment mapping debug:', {
        'planData.installmentAmount': planData.installmentAmount,
        'installment_plan.installment_amount': installment_plan.installment_amount,
        'planData.selectedPlan?.installmentAmount': planData.selectedPlan?.installmentAmount,
        'req.body.installmentAmount': req.body.installmentAmount,
        'finalMonthlyPayment': monthlyPayment
      });

      // ✅ Debug extracted data
      console.log('🔍 Enhanced extracted data:', {
        customerId,
        customerFullName,
        customerPhone,
        customerAddress,
        productId,
        productName,
        productPrice,
        totalAmount,
        installmentPeriod,
        downPayment,
        monthlyPayment,
        branchCode,
        planData
      });

      // ✅ Enhanced validation with Thai error messages and data debugging
      const validationErrors = [];

      // 🔧 Debug incoming data structure to understand the payload
      console.log('🔍 COMPREHENSIVE DATA DEBUGGING:');
      console.log('📋 Request body keys:', Object.keys(req.body));
      console.log('📝 Customer data keys:', customer ? Object.keys(customer) : 'No customer data');
      console.log('📦 Items count:', Array.isArray(items) ? items.length : 'Not array');
      console.log('💰 Payment plan keys:', installment_plan ? Object.keys(installment_plan) : 'No installment_plan');
      console.log('💳 Payment keys:', payment ? Object.keys(payment) : 'No payment data');

      // 📊 Log detailed financial data for debugging
      console.log('💰 FINANCIAL DATA DEBUGGING:');
      console.log('- Down Payment:', downPayment);
      console.log('- Monthly Payment:', monthlyPayment);
      console.log('- Installment Period:', installmentPeriod);
      console.log('- Total Amount:', totalAmount);
      console.log('- Finance Amount:', financeAmount);
      console.log('- Interest Rate:', interestRate);
      console.log('- Total Interest:', totalInterest);

      // Enhanced customer validation with fallbacks
      if (!customerId) {
        if (!customerFullName && !customerPhone) {
          // Try alternative customer field mappings
          const altCustomerName = customer.customerName || customer.name ||
                                 customer.fullName || `${customer.prefix || ''} ${customer.first_name || ''} ${customer.last_name || ''}`.trim();
          const altCustomerPhone = customer.phoneNumber || customer.mobile || customer.tel;

          if (!altCustomerName && !altCustomerPhone) {
            validationErrors.push('ไม่พบข้อมูลลูกค้า - ต้องมีชื่อหรือเบอร์โทรศัพท์');
          } else {
            // Use alternative data if found
            console.log('🔄 Using alternative customer data:', { altCustomerName, altCustomerPhone });
          }
        }
      }

      // Enhanced product validation with detailed logging
      if (!productId) {
        console.log('⚠️ Product ID missing, checking items array:', items);
        if (!items || items.length === 0) {
          validationErrors.push('ไม่พบข้อมูลสินค้า - ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
        } else {
          console.log('📦 Items found but productId missing - this might be acceptable');
        }
      }

      // Financial validation with better error messages
      if (!totalAmount || totalAmount <= 0) {
        console.log('❌ Total amount validation failed:', totalAmount);
        validationErrors.push('ยอดเงินรวมต้องมากกว่า 0');
      }

      if (!installmentPeriod || installmentPeriod <= 0) {
        console.log('❌ Installment period validation failed:', installmentPeriod);
        validationErrors.push('ระยะเวลาผ่อนชำระต้องมากกว่า 0');
      }

      if (downPayment < 0) {
        console.log('❌ Down payment validation failed:', downPayment);
        validationErrors.push('เงินดาวน์ต้องไม่ติดลบ');
      }

      // ✅ Thai financial validation with more flexible checks
      if (downPayment >= totalAmount && totalAmount > 0) {
        console.log('❌ Down payment vs total amount validation failed:', { downPayment, totalAmount });
        validationErrors.push('เงินดาวน์ต้องน้อยกว่ายอดเงินรวม');
      }

      if (!monthlyPayment || monthlyPayment <= 0) {
        console.log('❌ Monthly payment validation failed:', monthlyPayment);
        console.log('🔍 Checking alternative monthly payment sources...');

        // Try alternative sources for monthly payment
        const altMonthlyPayment =
          installment_plan.installmentAmount ||
          installment_plan.monthly_payment ||
          planData.installmentAmount ||
          planData.monthlyPayment ||
          req.body.installmentAmount ||
          req.body.monthlyPayment;

        if (altMonthlyPayment && altMonthlyPayment > 0) {
          console.log('✅ Found alternative monthly payment:', altMonthlyPayment);
          // We'll use this in the model creation below
        } else {
          validationErrors.push('ยอดผ่อนต่อเดือนต้องมากกว่า 0');
        }
      }

      // ✅ Enhanced financial validation for model requirements with flexibility
      if (financeAmount < 0) {
        console.log('❌ Finance amount validation failed:', financeAmount);
        validationErrors.push('จำนวนเงินทุนต้องไม่ติดลบ');
      }

      // Make interest validation more flexible for cash transactions
      if (totalInterest < 0) {
        console.log('❌ Total interest validation failed:', totalInterest);
        // Only validate if this is actually an installment (not cash)
        const paymentMethod = payment?.paymentMethod || installment_plan?.paymentMethod || req.body.paymentMethod;
        if (paymentMethod !== 'cash') {
          validationErrors.push('ดอกเบี้ยรวมต้องไม่ติดลบ');
        }
      }

      if (interestRate < 0 || interestRate > 100) {
        console.log('❌ Interest rate validation failed:', interestRate);
        // Only validate if this is actually an installment (not cash)
        const paymentMethod = payment?.paymentMethod || installment_plan?.paymentMethod || req.body.paymentMethod;
        if (paymentMethod !== 'cash' && interestRate > 100) {
          validationErrors.push('อัตราดอกเบี้ยต้องอยู่ระหว่าง 0-100%');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: validationErrors
        });
      }

      // Extract occupation data from request body
      const occupationData = req.body.occupationData || req.body.occupation || {};

      // Extract additional fields from request body (avoiding duplicates with enhanced variables)
      const {
        contractNumber,
        installmentMonths,
        startDate,
        endDate
      } = req.body;

      // ✅ Create or use enhanced customer/product IDs with better error handling
      const finalCustomerId = customerId || new (require('mongodb').ObjectId)();
      const finalProductId = productId || new (require('mongodb').ObjectId)();

      // 🔧 Enhanced data preparation with fallbacks
      const finalCustomerName = customerFullName ||
                               customer.customerName ||
                               `${customer.prefix || ''} ${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
                               'ไม่ระบุชื่อ';

      const finalCustomerPhone = customerPhone ||
                                customer.phoneNumber ||
                                customer.mobile ||
                                customer.tel ||
                                'ไม่ระบุเบอร์';

      // Handle monthly payment with multiple fallbacks
      const finalMonthlyPayment = monthlyPayment ||
                                 installment_plan.installmentAmount ||
                                 installment_plan.monthly_payment ||
                                 planData.installmentAmount ||
                                 planData.monthlyPayment ||
                                 req.body.installmentAmount ||
                                 req.body.monthlyPayment ||
                                 0;

      console.log('🔧 Final calculated values before model creation:');
      console.log('- Final Customer Name:', finalCustomerName);
      console.log('- Final Customer Phone:', finalCustomerPhone);
      console.log('- Final Monthly Payment:', finalMonthlyPayment);
      console.log('- Final Customer Address:', customerAddress);

      // ✅ Enhanced authentication handling for development/testing
      const defaultUserId = '507f1f77bcf86cd799439011'; // Default test user ID
      const createdByUserId = req.user?.userId || req.userId || defaultUserId;

      console.log('🔐 Authentication info:', {
        hasReqUser: !!req.user,
        reqUserId: req.userId,
        finalUserId: createdByUserId
      });

      // Create new installment with ALL enhanced mapped fields and validation
      const newInstallment = new Installment({
        // Basic identifiers
        contractNumber: await generateContractNumber(branchCode),
        customerId: finalCustomerId,
        productId: finalProductId,

        // Enhanced customer information (required by model)
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerAddress: customerAddress || 'ไม่ระบุที่อยู่',

        // Enhanced product information (required by model)
        productName: productName || 'ไม่ระบุสินค้า',
        productPrice: productPrice || totalAmount || 0,

        // Financial calculations (required by model) - using calculated values
        downPayment: downPayment || 0,
        financeAmount: Math.max(0, financeAmount), // Ensure non-negative
        interestRate: Math.max(0, Math.min(100, interestRate)), // Clamp to 0-100
        totalInterest: Math.max(0, totalInterest), // Ensure non-negative
        totalAmount: totalAmount || 0,
        installmentMonths: installmentPeriod || 12,
        monthlyPayment: finalMonthlyPayment,

        // Dates (required by model)
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + (installmentPeriod || 12) * 30 * 24 * 60 * 60 * 1000),

        // Other fields with safe defaults
        remainingBalance: Math.max(0, financeAmount), // Ensure non-negative
        branchCode: branchCode || '00000',
        status: 'pending',
        approvalStatus: 'pending',
        planType: planType || 'manual',
        createdBy: createdByUserId,

        // Add occupation data if provided
        ...(Object.keys(occupationData).length > 0 && {
          customerOccupation: occupationData
        })
      });

      // 🔍 Log the final installment object for debugging (without sensitive data)
      console.log('📝 Final installment object prepared:', {
        contractNumber: 'WILL_BE_GENERATED',
        customerName: newInstallment.customerName,
        customerPhone: newInstallment.customerPhone,
        productName: newInstallment.productName,
        totalAmount: newInstallment.totalAmount,
        downPayment: newInstallment.downPayment,
        monthlyPayment: newInstallment.monthlyPayment,
        installmentMonths: newInstallment.installmentMonths,
        branchCode: newInstallment.branchCode,
        status: newInstallment.status
      });

      console.log('💾 Attempting to save installment to database...');
      console.log('🔍 Installment object before save:', {
        contractNumber: newInstallment.contractNumber,
        customerName: newInstallment.customerName,
        customerPhone: newInstallment.customerPhone,
        branchCode: newInstallment.branchCode,
        totalAmount: newInstallment.totalAmount,
        isValidData: true
      });

      try {
        await newInstallment.save();
        console.log('✅ Installment saved successfully with contract number:', newInstallment.contractNumber);
      } catch (saveError) {
        console.error('❌ Error during installment save operation:', saveError);

        // Handle specific save errors with more detail
        if (saveError.name === 'ValidationError') {
          const validationDetails = Object.keys(saveError.errors).map(field => ({
            field,
            message: saveError.errors[field].message,
            value: saveError.errors[field].value
          }));

          console.log('🔍 Validation error details:', validationDetails);

          return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้องตามข้อกำหนดของระบบ',
            errors: validationDetails.map(v => `${v.field}: ${v.message}`),
            validationDetails: validationDetails
          });
        }

        // Re-throw other save errors to be handled by main catch block
        throw saveError;
      }

      res.status(201).json({
        success: true,
        message: 'สร้างสัญญาผ่อนชำระเรียบร้อย',
        data: {
          _id: newInstallment._id,
          contractNumber: newInstallment.contractNumber,
          customerName: newInstallment.customerName,
          customerPhone: newInstallment.customerPhone,
          productName: newInstallment.productName,
          totalAmount: newInstallment.totalAmount,
          downPayment: newInstallment.downPayment,
          monthlyPayment: newInstallment.monthlyPayment,
          installmentMonths: newInstallment.installmentMonths,
          status: newInstallment.status,
          branchCode: newInstallment.branchCode,
          createdAt: newInstallment.createdAt
        }
      });

    } catch (error) {
      console.error('❌ COMPREHENSIVE ERROR in createInstallment:', error);
      console.error('❌ Error stack:', error.stack);

      // Enhanced error logging for debugging
      console.log('🔍 Error context:');
      console.log('- Request body keys:', req.body ? Object.keys(req.body) : 'No body');
      console.log('- Error name:', error.name);
      console.log('- Error message:', error.message);

      // จัดการข้อผิดพลาดการซ้ำกันของหมายเลขสัญญา
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];
        console.log('🔄 Duplicate key error for field:', duplicateField);

        if (duplicateField === 'contractNumber') {
          return res.status(409).json({
            success: false,
            message: 'หมายเลขสัญญานี้มีอยู่แล้ว กรุณาลองใหม่อีกครั้ง',
            error: 'DUPLICATE_CONTRACT_NUMBER',
            retryable: true
          });
        }
        return res.status(409).json({
          success: false,
          message: 'ข้อมูลถูกบันทึกไว้แล้ว กรุณาตรวจสอบข้อมูลและลองใหม่',
          error: 'DUPLICATE_DATA',
          retryable: true
        });
      }

      // จัดการข้อผิดพลาดการตรวจสอบข้อมูล
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        console.log('🔍 Validation errors:', validationErrors);

        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: validationErrors,
          errorType: 'VALIDATION_ERROR'
        });
      }

      // Handle MongoDB connection errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        console.log('🔌 Database connection error detected');
        return res.status(503).json({
          success: false,
          message: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          error: 'DATABASE_CONNECTION_ERROR',
          retryable: true
        });
      }

      // Generic error handling
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถสร้างสัญญาผ่อนชำระได้',
        error: error.message,
        errorType: error.name || 'UNKNOWN_ERROR'
      });
    }
  }

  // ดึงรายการสัญญาผ่อนชำระทั้งหมด
  static async getInstallmentList(req, res) {
    try {
      const { page = 1, limit = 10, status, branchCode, search } = req.query;

      const query = {};

      if (status) query.status = status;
      if (branchCode) query.branchCode = branchCode;
      if (search) {
        query.$or = [
          { contractNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } }
        ];
      }

      const installments = await Installment.find(query)
        .populate('customerId')
        .populate('productId')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const count = await Installment.countDocuments(query);

      res.json({
        success: true,
        data: installments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count
        }
      });

    } catch (error) {
      console.error('Error getting installment list:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสัญญาผ่อนชำระได้',
        error: error.message
      });
    }
  }

  // อัพเดทสัญญาผ่อนชำระ
  static async updateInstallment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const installment = await Installment.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: req.user?.userId
        },
        { new: true }
      );

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      res.json({
        success: true,
        message: 'อัพเดทสัญญาผ่อนชำระเรียบร้อย',
        data: installment
      });

    } catch (error) {
      console.error('Error updating installment:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถอัพเดทสัญญาผ่อนชำระได้',
        error: error.message
      });
    }
  }

  // บันทึกการชำระเงิน
  static async recordPayment(req, res) {
    try {
      const { installmentId, amount, paymentMethod, paymentDate } = req.body;

      const installment = await Installment.findById(installmentId);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // Create payment record
      const payment = {
        amount,
        paymentMethod: paymentMethod || 'cash',
        paymentDate: paymentDate || new Date(),
        recordedBy: req.user?.userId
      };

      installment.payments.push(payment);
      installment.paidAmount += amount;
      installment.remainingAmount = installment.totalAmount - installment.paidAmount;

      // Update status if fully paid
      if (installment.remainingAmount <= 0) {
        installment.status = 'completed';
        installment.completedDate = new Date();
      }

      await installment.save();

      res.json({
        success: true,
        message: 'บันทึกการชำระเงินเรียบร้อย',
        data: installment
      });

    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถบันทึกการชำระเงินได้',
        error: error.message
      });
    }
  }

  // ดึงรายงานสรุป
  static async getDashboardSummary(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      const query = {};
      if (branchCode) query.branchCode = branchCode;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get summary statistics
      const totalContracts = await Installment.countDocuments(query);
      const activeContracts = await Installment.countDocuments({ ...query, status: 'active' });
      const completedContracts = await Installment.countDocuments({ ...query, status: 'completed' });

      const aggregateResult = await Installment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalRemaining: { $sum: '$remainingAmount' }
          }
        }
      ]);

      const summary = aggregateResult[0] || {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0
      };

      res.json({
        success: true,
        data: {
          totalContracts,
          activeContracts,
          completedContracts,
          totalAmount: summary.totalAmount,
          totalPaid: summary.totalPaid,
          totalRemaining: summary.totalRemaining
        }
      });

    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสรุปได้',
        error: error.message
      });
    }
  }

  // ดึงรายละเอียดสัญญาผ่อนชำระ
  static async getInstallmentById(req, res) {
    try {
      const { id } = req.params;

      const installment = await Installment.findById(id)
        .populate('customerId')
        .populate('productId')
        .populate('payments.recordedBy')
        .lean();

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      res.json({
        success: true,
        data: installment
      });

    } catch (error) {
      console.error('Error getting installment by id:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสัญญาผ่อนชำระได้',
        error: error.message
      });
    }
  }

  // ดึงตารางการผ่อนชำระ
  static async getPaymentSchedule(req, res) {
    try {
      const { installmentId } = req.params;

      const installment = await Installment.findById(installmentId);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // Generate payment schedule
      const schedule = [];
      const monthlyPayment = installment.monthlyPayment;
      const totalPeriods = installment.installmentPeriod;

      for (let i = 1; i <= totalPeriods; i++) {
        const dueDate = moment(installment.createdAt).add(i, 'months');
        const paid = installment.payments.filter(p =>
          moment(p.paymentDate).format('YYYY-MM') === dueDate.format('YYYY-MM')
        );

        schedule.push({
          period: i,
          dueDate: dueDate.toDate(),
          amount: monthlyPayment,
          paid: paid.length > 0,
          paidAmount: paid.reduce((sum, p) => sum + p.amount, 0),
          paidDate: paid.length > 0 ? paid[0].paymentDate : null
        });
      }

      res.json({
        success: true,
        data: schedule
      });

    } catch (error) {
      console.error('Error getting payment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงตารางการผ่อนชำระได้',
        error: error.message
      });
    }
  }

  // ยกเลิกสัญญาผ่อนชำระ
  static async cancelInstallment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const installment = await Installment.findById(id);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      installment.status = 'cancelled';
      installment.cancelledDate = new Date();
      installment.cancelledReason = reason;
      installment.cancelledBy = req.user?.userId;

      await installment.save();

      res.json({
        success: true,
        message: 'ยกเลิกสัญญาผ่อนชำระเรียบร้อย',
        data: installment
      });

    } catch (error) {
      console.error('Error cancelling installment:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถยกเลิกสัญญาผ่อนชำระได้',
        error: error.message
      });
    }
  }

  // คำนวณดอกเบี้ยและค่าปรับ
  static async calculatePenalty(req, res) {
    try {
      const { installmentId } = req.params;

      const installment = await Installment.findById(installmentId);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // Calculate overdue periods
      const currentDate = moment();
      const overduePayments = [];

      for (let i = 1; i <= installment.installmentPeriod; i++) {
        const dueDate = moment(installment.createdAt).add(i, 'months');

        if (dueDate.isBefore(currentDate)) {
          const paid = installment.payments.filter(p =>
            moment(p.paymentDate).format('YYYY-MM') === dueDate.format('YYYY-MM')
          );

          if (paid.length === 0 || paid.reduce((sum, p) => sum + p.amount, 0) < installment.monthlyPayment) {
            const daysOverdue = currentDate.diff(dueDate, 'days');
            const penaltyRate = 0.03; // 3% per month
            const penalty = installment.monthlyPayment * penaltyRate * (daysOverdue / 30);

            overduePayments.push({
              period: i,
              dueDate: dueDate.toDate(),
              daysOverdue,
              penalty: Math.round(penalty)
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          overduePayments,
          totalPenalty: overduePayments.reduce((sum, p) => sum + p.penalty, 0)
        }
      });

    } catch (error) {
      console.error('Error calculating penalty:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถคำนวณค่าปรับได้',
        error: error.message
      });
    }
  }

  // Export to Excel
  static async exportToExcel(req, res) {
    try {
      const { status, branchCode, startDate, endDate } = req.query;

      const query = {};
      if (status) query.status = status;
      if (branchCode) query.branchCode = branchCode;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const installments = await Installment.find(query)
        .populate('customerId')
        .populate('productId')
        .lean();

      // Format data for Excel
      const excelData = installments.map(inst => ({
        'เลขที่สัญญา': inst.contractNumber,
        'ชื่อลูกค้า': inst.customerName,
        'สินค้า': inst.productName,
        'ยอดรวม': inst.totalAmount,
        'ยอดชำระแล้ว': inst.paidAmount,
        'ยอดคงเหลือ': inst.remainingAmount,
        'สถานะ': inst.status,
        'วันที่สร้าง': moment(inst.createdAt).format('DD/MM/YYYY')
      }));

      // TODO: Implement actual Excel generation
      res.json({
        success: true,
        data: excelData,
        message: 'ข้อมูลพร้อมสำหรับ export'
      });

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถ export ข้อมูลได้',
        error: error.message
      });
    }
  }

  // Generate PDF Contract
  static async generateContract(req, res) {
    try {
      const { installmentId } = req.params;

      const installment = await InstallmentOrder.findById(installmentId)
        .populate('customer')
        .populate('salesperson.id')
        .lean();

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // TODO: Implement actual PDF generation
      res.json({
        success: true,
        message: 'กำลังสร้างเอกสารสัญญา',
        data: {
          contractNo: installment.contractNo,
          customerName: installment.customer_info?.firstName + ' ' + installment.customer_info?.lastName
        }
      });

    } catch (error) {
      console.error('Error generating contract:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถสร้างเอกสารสัญญาได้',
        error: error.message
      });
    }
  }

  // รายงานภาษี
  static async getTaxReports(req, res) {
    try {
      const { startDate, endDate, branchCode } = req.query;

      const query = { status: { $in: ['active', 'completed'] } };

      if (branchCode) query.branchCode = branchCode;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const installments = await Installment.find(query)
        .populate('customerId')
        .lean();

      // คำนวณภาษี
      const taxReport = installments.map(inst => {
        const vat = inst.totalAmount * 0.07; // VAT 7%
        const withholding = inst.totalAmount * 0.03; // หัก ณ ที่จ่าย 3%

        return {
          contractNumber: inst.contractNumber,
          customerName: inst.customerName,
          totalAmount: inst.totalAmount,
          vat,
          withholding,
          netAmount: inst.totalAmount - withholding
        };
      });

      const summary = {
        totalRevenue: taxReport.reduce((sum, r) => sum + r.totalAmount, 0),
        totalVat: taxReport.reduce((sum, r) => sum + r.vat, 0),
        totalWithholding: taxReport.reduce((sum, r) => sum + r.withholding, 0)
      };

      res.json({
        success: true,
        data: {
          reports: taxReport,
          summary
        }
      });

    } catch (error) {
      console.error('Error getting tax reports:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายงานภาษีได้',
        error: error.message
      });
    }
  }

  // Dashboard Trends
  static async getDashboardTrends(req, res) {
    try {
      const { period = 'monthly', year = new Date().getFullYear() } = req.query;

      const trends = [];

      if (period === 'monthly') {
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);

          const monthData = await Installment.aggregate([
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$paidAmount' }
              }
            }
          ]);

          trends.push({
            month: month + 1,
            monthName: moment(startDate).format('MMMM'),
            contracts: monthData[0]?.count || 0,
            revenue: monthData[0]?.totalAmount || 0,
            collected: monthData[0]?.totalPaid || 0
          });
        }
      }

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      console.error('Error getting dashboard trends:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลแนวโน้มได้',
        error: error.message
      });
    }
  }

  // Status Distribution
  static async getStatusDistribution(req, res) {
    try {
      const distribution = await Installment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      const formattedData = distribution.map(item => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
        percentage: 0 // Will calculate after getting total
      }));

      const total = formattedData.reduce((sum, item) => sum + item.count, 0);
      formattedData.forEach(item => {
        item.percentage = total > 0 ? (item.count / total * 100).toFixed(2) : 0;
      });

      res.json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('Error getting status distribution:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลการกระจายสถานะได้',
        error: error.message
      });
    }
  }

  // รายการลูกหนี้
  static async getDebtors(req, res) {
    try {
      const { overdueDays = 0, branchCode } = req.query;

      const query = {
        status: 'active',
        remainingAmount: { $gt: 0 }
      };

      if (branchCode) query.branchCode = branchCode;

      const installments = await Installment.find(query)
        .populate('customerId')
        .lean();

      // Calculate overdue for each
      const debtors = [];
      const currentDate = moment();

      for (const inst of installments) {
        const lastPaymentDate = inst.payments.length > 0
          ? moment(inst.payments[inst.payments.length - 1].paymentDate)
          : moment(inst.createdAt);

        const daysSinceLastPayment = currentDate.diff(lastPaymentDate, 'days');

        if (daysSinceLastPayment >= overdueDays) {
          debtors.push({
            ...inst,
            daysSinceLastPayment,
            overdueAmount: inst.monthlyPayment * Math.floor(daysSinceLastPayment / 30)
          });
        }
      }

      debtors.sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);

      res.json({
        success: true,
        data: debtors,
        total: debtors.length
      });

    } catch (error) {
      console.error('Error getting debtors:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายการลูกหนี้ได้',
        error: error.message
      });
    }
  }

  // จัดการเงินมัดจำ
  static async getDeposits(req, res) {
    try {
      const { branchCode, status } = req.query;

      const query = {};
      if (branchCode) query.branchCode = branchCode;
      if (status) query['depositStatus'] = status;

      const deposits = await Installment.find(query)
        .where('downPayment').gt(0)
        .populate('customerId')
        .lean();

      res.json({
        success: true,
        data: deposits.map(d => ({
          contractNumber: d.contractNumber,
          customerName: d.customerName,
          depositAmount: d.downPayment,
          totalAmount: d.totalAmount,
          depositDate: d.createdAt,
          status: d.status
        }))
      });

    } catch (error) {
      console.error('Error getting deposits:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลเงินมัดจำได้',
        error: error.message
      });
    }
  }

  // บันทึกเงินมัดจำ
  static async createDeposit(req, res) {
    try {
      const { customerId, amount, productId, receiptNo } = req.body;

      // Create temporary installment with deposit
      const deposit = new Installment({
        customerId,
        productId,
        downPayment: amount,
        depositReceiptNo: receiptNo,
        status: 'deposit',
        depositDate: new Date(),
        createdBy: req.user?.userId
      });

      await deposit.save();

      res.json({
        success: true,
        message: 'บันทึกเงินมัดจำเรียบร้อย',
        data: deposit
      });

    } catch (error) {
      console.error('Error creating deposit:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถบันทึกเงินมัดจำได้',
        error: error.message
      });
    }
  }

  // ตรวจสอบสถานะการผ่อนชำระ
  static async getInstallmentStatus(req, res) {
    try {
      const { contractNo } = req.params;

      const installment = await Installment.findOne({ contractNumber: contractNo })
        .populate('customerId')
        .populate('payments.recordedBy')
        .lean();

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // Calculate current status
      const currentDate = moment();
      const createdDate = moment(installment.createdAt);
      const monthsPassed = currentDate.diff(createdDate, 'months');
      const expectedPayments = Math.min(monthsPassed, installment.installmentPeriod);
      const actualPayments = installment.payments.length;

      const status = {
        contractNumber: installment.contractNumber,
        customerName: installment.customerName,
        currentStatus: installment.status,
        totalAmount: installment.totalAmount,
        paidAmount: installment.paidAmount,
        remainingAmount: installment.remainingAmount,
        expectedPayments,
        actualPayments,
        isOverdue: actualPayments < expectedPayments,
        overdueMonths: Math.max(0, expectedPayments - actualPayments),
        completionPercentage: (installment.paidAmount / installment.totalAmount * 100).toFixed(2)
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error getting installment status:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถตรวจสอบสถานะได้',
        error: error.message
      });
    }
  }

  // ตารางการชำระเงิน
  static async getRepaymentSchedule(req, res) {
    try {
      const { contractNo } = req.params;

      const installment = await Installment.findOne({ contractNumber: contractNo });

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      const schedule = [];
      const startDate = moment(installment.createdAt);

      for (let i = 0; i < installment.installmentPeriod; i++) {
        const dueDate = startDate.clone().add(i + 1, 'months');
        const payment = installment.payments.find(p =>
          moment(p.paymentDate).format('YYYY-MM') === dueDate.format('YYYY-MM')
        );

        schedule.push({
          period: i + 1,
          dueDate: dueDate.format('YYYY-MM-DD'),
          amount: installment.monthlyPayment,
          status: payment ? 'paid' : dueDate.isBefore(moment()) ? 'overdue' : 'pending',
          paidAmount: payment?.amount || 0,
          paidDate: payment?.paymentDate || null,
          paymentMethod: payment?.paymentMethod || null
        });
      }

      res.json({
        success: true,
        data: {
          contractNumber: installment.contractNumber,
          customerName: installment.customerName,
          schedule
        }
      });

    } catch (error) {
      console.error('Error getting repayment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงตารางการชำระเงินได้',
        error: error.message
      });
    }
  }

  // ประมวลผลการชำระภาษี
  static async processTaxPayment(req, res) {
    try {
      const { installmentId, taxAmount, taxType } = req.body;

      const installment = await Installment.findById(installmentId);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // Record tax payment
      const taxPayment = {
        amount: taxAmount,
        type: taxType, // 'vat' or 'withholding'
        paymentDate: new Date(),
        processedBy: req.user?.userId
      };

      if (!installment.taxPayments) {
        installment.taxPayments = [];
      }

      installment.taxPayments.push(taxPayment);
      await installment.save();

      res.json({
        success: true,
        message: 'บันทึกการชำระภาษีเรียบร้อย',
        data: installment
      });

    } catch (error) {
      console.error('Error processing tax payment:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถประมวลผลการชำระภาษีได้',
        error: error.message
      });
    }
  }

  // ดึงรายงานหนี้สูญ
  static async getBadDebtReport(req, res) {
    try {
      const { overdueDays = 180, branchCode } = req.query;

      const query = {
        status: 'active',
        remainingAmount: { $gt: 0 }
      };

      if (branchCode) query.branchCode = branchCode;

      const installments = await Installment.find(query)
        .populate('customerId')
        .lean();

      const badDebts = [];
      const currentDate = moment();

      for (const inst of installments) {
        const lastPaymentDate = inst.payments.length > 0
          ? moment(inst.payments[inst.payments.length - 1].paymentDate)
          : moment(inst.createdAt);

        const daysSinceLastPayment = currentDate.diff(lastPaymentDate, 'days');

        if (daysSinceLastPayment >= overdueDays) {
          badDebts.push({
            contractNumber: inst.contractNumber,
            customerName: inst.customerName,
            totalAmount: inst.totalAmount,
            remainingAmount: inst.remainingAmount,
            daysSinceLastPayment,
            lastPaymentDate: lastPaymentDate.format('YYYY-MM-DD'),
            classification: daysSinceLastPayment >= 365 ? 'write-off' : 'bad-debt'
          });
        }
      }

      const summary = {
        totalBadDebt: badDebts.reduce((sum, d) => sum + d.remainingAmount, 0),
        totalContracts: badDebts.length,
        writeOffAmount: badDebts.filter(d => d.classification === 'write-off')
          .reduce((sum, d) => sum + d.remainingAmount, 0)
      };

      res.json({
        success: true,
        data: {
          badDebts,
          summary
        }
      });

    } catch (error) {
      console.error('Error getting bad debt report:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายงานหนี้สูญได้',
        error: error.message
      });
    }
  }

  // แจ้งเตือนการค้างชำระ
  static async sendOverdueNotifications(req, res) {
    try {
      const { branchCode } = req.query;

      const query = {
        status: 'active',
        remainingAmount: { $gt: 0 }
      };

      if (branchCode) query.branchCode = branchCode;

      const installments = await Installment.find(query)
        .populate('customerId')
        .lean();

      const notifications = [];
      const currentDate = moment();

      for (const inst of installments) {
        // Calculate overdue periods
        const createdDate = moment(inst.createdAt);
        const monthsPassed = currentDate.diff(createdDate, 'months');
        const expectedPayments = Math.min(monthsPassed, inst.installmentPeriod);
        const actualPayments = inst.payments.length;
        const overdueMonths = expectedPayments - actualPayments;

        if (overdueMonths > 0) {
          const overdueAmount = inst.monthlyPayment * overdueMonths;

          // Determine notification level
          let severity = 'reminder';
          if (overdueMonths >= 3) severity = 'warning';
          if (overdueMonths >= 6) severity = 'critical';

          const notificationData = {
            contractNumber: inst.contractNumber,
            customerName: inst.customerName,
            customerPhone: inst.customerId?.phone,
            overdueMonths,
            overdueAmount,
            severity,
            message: generateOverdueMessage(overdueMonths, overdueAmount)
          };

          notifications.push(notificationData);

          // TODO: Send actual notification based on severity
          console.log(`⚠️ Sending overdue notification (${notificationData.severity}) to ${notificationData.customerName}`);
        }
      }

      res.json({
        success: true,
        message: `Processed ${notifications.length} overdue notifications`,
        data: {
          notificationsCount: notifications.length,
          notifications: notifications
        }
      });

    } catch (error) {
      console.error('Error in sendOverdueNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send overdue notifications',
        error: error.message
      });
    }
  }

  // 🆕 API สำหรับดึงข้อมูลลูกค้าผ่อนทั้งหมด
  static async getInstallmentCustomers(req, res) {
    try {
      console.log('🔄 Getting installment customers with FULL DATA from InstallmentOrder...');
      const { branch, month, year, search } = req.query;

      // ใช้ InstallmentOrder model เพื่อข้อมูลที่ครบถ้วน
      let matchStage = { deleted_at: null };

      // กรองตามสาขา
      if (branch && branch !== '' && branch !== 'all') {
        matchStage.branch_code = branch;
      }

      // กรองตามคำค้นหา
      if (search && search.trim() !== '') {
        matchStage.$or = [
          { contractNo: { $regex: search, $options: 'i' } },
          { 'customer_info.phone': { $regex: search, $options: 'i' } },
          { 'customer_info.taxId': { $regex: search, $options: 'i' } },
          { 'customer_info.firstName': { $regex: search, $options: 'i' } },
          { 'customer_info.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      // กรองตามเดือน/ปี
      if (month || year) {
        matchStage.createdAt = {};
        if (year) {
          const startYear = new Date(parseInt(year) - 543, 0, 1);
          const endYear = new Date(parseInt(year) - 542, 0, 1);
          matchStage.createdAt.$gte = startYear;
          matchStage.createdAt.$lt = endYear;
        }
        if (month) {
          const monthNum = parseInt(month) - 1;
          if (!matchStage.createdAt.$gte) {
            const currentYear = new Date().getFullYear();
            matchStage.createdAt.$gte = new Date(currentYear, monthNum, 1);
            matchStage.createdAt.$lt = new Date(currentYear, monthNum + 1, 1);
          }
        }
      }

      // ใช้ InstallmentOrder model เพื่อข้อมูลครบถ้วน
      const installmentOrders = await InstallmentOrder.find(matchStage)
        .populate('customer')
        .populate('salesperson.id')
        .lean();

      console.log(`📋 Found ${installmentOrders.length} installment orders`);

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
      const customers = installmentOrders.map(order => {
        const customerInfo = order.customer_info || {};
        const items = order.items || [];
        const productName = items.length > 0 ? items[0].name : 'ไม่ระบุสินค้า';
        const imei = items.length > 0 ? items[0].imei : '';

        // จัดการที่อยู่
        const address = customerInfo.address || {};
        const contactAddress = customerInfo.contactAddress || {};
        const mainAddress = contactAddress.useSameAddress ? address : contactAddress;

        // สร้างที่อยู่แบบเต็ม
        const addressComponents = [
          mainAddress.houseNo && `เลขที่ ${mainAddress.houseNo}`,
          mainAddress.moo && `หมู่ ${mainAddress.moo}`,
          mainAddress.lane && `ซอย ${mainAddress.lane}`,
          mainAddress.road && `ถนน ${mainAddress.road}`,
          mainAddress.subDistrict && `ต.${mainAddress.subDistrict}`,
          mainAddress.district && `อ.${mainAddress.district}`,
          mainAddress.province && `จ.${mainAddress.province}`,
          mainAddress.zipcode
        ].filter(Boolean).join(' ');

        return {
          _id: order._id,
          contractNo: order.contractNo,

          // ข้อมูลส่วนตัว
          prefix: customerInfo.prefix || '',
          firstName: customerInfo.firstName || '',
          lastName: customerInfo.lastName || '',
          customerName: `${customerInfo.prefix || ''} ${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
          gender: order.gender || customerInfo.gender || '',
          phone: customerInfo.phone || '',
          email: customerInfo.email || '',
          taxId: customerInfo.taxId || '',
          age: customerInfo.age || null,

          // ข้อมูลสินค้า
          product: productName,
          productName: productName,
          imei: imei,
          items: items,

          // ข้อมูลการผ่อนชำระ
          totalAmount: order.totalAmount || 0,
          downPayment: order.downPayment || 0,
          monthlyPayment: order.monthlyPayment || 0,
          installmentPeriod: order.installmentPeriod || 0,
          paidAmount: order.paidAmount || 0,
          remainingAmount: (order.totalAmount || 0) - (order.paidAmount || 0),
          status: order.status || 'active',

          // ข้อมูลที่อยู่
          address: {
            houseNo: mainAddress.houseNo || '',
            moo: mainAddress.moo || '',
            lane: mainAddress.lane || '',
            road: mainAddress.road || '',
            subDistrict: mainAddress.subDistrict || '',
            district: mainAddress.district || '',
            province: mainAddress.province || '',
            zipcode: mainAddress.zipcode || '',
            full: addressComponents
          },

          // ข้อมูลเอกสารแนบ
          idCardImageUrl: order.idCardImageUrl || '',
          salarySlipUrl: order.salarySlipUrl || '',
          selfieUrl: order.selfieUrl || '',

          // ข้อมูลพยาน
          witness: order.witness || {},

          // ข้อมูลพนักงานขาย
          salesperson: order.salesperson || {},
          staffName: order.staffName || order.salesperson?.name || '',

          // ข้อมูลสาขา
          branch_code: order.branch_code || '00000',
          branchName: `สาขา ${order.branch_code || '00000'}`,

          // Timestamps
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,

          // ข้อมูลเพิ่มเติมสำหรับ compatibility
          first_name: customerInfo.firstName || '',
          last_name: customerInfo.lastName || '',
          phone_number: customerInfo.phone || '',
          tax_id: customerInfo.taxId || '',
          customer_info: customerInfo,

          // ข้อมูลครบถ้วนทั้งหมดจาก order
          fullOrderData: order
        };
      });

      console.log(`✅ Processed ${customers.length} customers with full data`);

      // Debug: ดูข้อมูลตัวอย่าง
      if (customers.length > 0) {
        console.log('📊 Sample customer data with all fields:');
        const sample = customers[0];
        console.log('- Name:', sample.customerName);
        console.log('- Contract:', sample.contractNo);
        console.log('- Product:', sample.productName);
        console.log('- IMEI:', sample.imei);
        console.log('- Has ID Card Image:', !!sample.idCardImageUrl);
        console.log('- Has Salary Slip:', !!sample.salarySlipUrl);
        console.log('- Has Selfie:', !!sample.selfieUrl);
        console.log('- Has Witness:', !!sample.witness?.name);
        console.log('- Salesperson:', sample.staffName);
      }

      res.json({
        success: true,
        data: customers,
        total: customers.length,
        message: `พบลูกค้าผ่อน ${customers.length} คน (ข้อมูลครบถ้วน)`
      });

    } catch (error) {
      console.error('❌ Error in getInstallmentCustomers:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลลูกค้าผ่อนได้',
        error: error.message
      });
    }
  }

  // =====================================================
  // 🔥 BAD DEBT INTEGRATION SYSTEM - COMPLETE SOLUTION
  // =====================================================

  /**
   * 🎯 Priority 1: Create Data Bridge (Step4 → Bad Debt System)
   * Convert InstallmentOrder to Bad Debt format with aging analysis
   */
  static async convertInstallmentToDebtRecord(installmentOrder, options = {}) {
    try {
      console.log(`🔄 Converting installment contract ${installmentOrder.contractNo} to debt record...`);

      const currentDate = new Date();
      const customerInfo = installmentOrder.customer_info || {};
      const items = installmentOrder.items || [];

      // คำนวณอายุหนี้และสถานะ
      const daysPastDue = installmentOrder.dueDate ?
        Math.max(0, Math.floor((currentDate - new Date(installmentOrder.dueDate)) / (1000 * 60 * 60 * 24))) : 0;

      // คำนวณยอดคงเหลือ
      const totalAmount = installmentOrder.finalTotalAmount || installmentOrder.totalAmount || 0;
      const paidAmount = installmentOrder.paidAmount || 0;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      // กำหนดระดับความเสี่ยง
      let riskLevel = 'ต่ำ';
      if (daysPastDue >= 180) riskLevel = 'สูงมาก';
      else if (daysPastDue >= 90) riskLevel = 'สูง';
      else if (daysPastDue >= 60) riskLevel = 'ปานกลาง';
      else if (daysPastDue >= 30) riskLevel = 'ต่ำ';

      // คำนวณค่าเผื่อหนี้สูญตามเกณฑ์
      const criteria = await BadDebtCriteria.getCurrentCriteria();
      const allowanceCalculation = BadDebtCriteria.calculateAllowance(daysPastDue, remainingAmount, criteria);

      // สร้าง Payment Schedule จาก contract terms
      const paymentSchedule = await this.generatePaymentScheduleFromContract(installmentOrder);

      const debtRecord = {
        // ข้อมูลพื้นฐาน
        sourceType: 'installment_contract',
        sourceId: installmentOrder._id,
        contractNumber: installmentOrder.contractNo,

        // ข้อมูลลูกค้า (Step2 Data)
        customerId: installmentOrder.customer,
        customerName: `${customerInfo.prefix || ''} ${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
        customerPhone: customerInfo.phone || '',
        customerEmail: customerInfo.email || '',
        customerTaxId: customerInfo.taxId || '',
        customerAddress: this.formatCustomerAddress(customerInfo),

        // ข้อมูลการเงิน
        originalAmount: totalAmount,
        currentBalance: remainingAmount,
        paidAmount: paidAmount,
        overdueAmount: remainingAmount,
        monthlyPayment: installmentOrder.monthlyPayment || 0,

        // ข้อมูลการผ่อนชำระ (Step3 Data)
        installmentTerms: {
          totalInstallments: installmentOrder.installmentCount || 0,
          monthlyPayment: installmentOrder.monthlyPayment || 0,
          downPayment: installmentOrder.downPayment || 0,
          startDate: installmentOrder.createdAt,
          originalDueDate: installmentOrder.dueDate,
          paymentSchedule: paymentSchedule
        },

        // การวิเคราะห์อายุหนี้
        agingAnalysis: {
          daysPastDue: daysPastDue,
          riskLevel: riskLevel,
          allowanceAmount: allowanceCalculation.allowanceAmount,
          allowanceStatus: allowanceCalculation.status,
          lastPaymentDate: this.getLastPaymentDate(installmentOrder),
          nextDueDate: this.calculateNextDueDate(installmentOrder)
        },

        // ข้อมูลสินค้า/หลักประกัน
        collateral: items.map(item => ({
          type: 'product',
          name: item.name || '',
          serialNumber: item.imei || '',
          value: item.downAmount || 0,
          condition: 'unknown'
        })),

        // สถานะหนี้
        debtStatus: this.determineDebtStatus(daysPastDue, remainingAmount, paidAmount, totalAmount),

        // ข้อมูลติดตาม
        branchCode: installmentOrder.branch_code || '00000',
        salesPerson: installmentOrder.staffName || installmentOrder.salesperson?.name || '',

        // การจัดหมวดหมู่หนี้สูญ
        badDebtClassification: {
          category: this.classifyBadDebt(daysPastDue),
          reason: this.generateBadDebtReason(daysPastDue, paidAmount, totalAmount),
          recommendations: this.generateRecommendations(daysPastDue, remainingAmount, riskLevel)
        },

        // ข้อมูลเพิ่มเติม
        metadata: {
          convertedAt: currentDate,
          convertedBy: options.userId || null,
          originalData: {
            contractType: 'installment',
            planType: installmentOrder.planType,
            installmentType: installmentOrder.installmentType
          }
        }
      };

      console.log(`✅ Successfully converted contract ${installmentOrder.contractNo} to debt record`);
      console.log(`📊 Debt Analysis: ${daysPastDue} days overdue, Risk: ${riskLevel}, Amount: ${remainingAmount}`);

      return debtRecord;

    } catch (error) {
      console.error('❌ Error converting installment to debt record:', error);
      throw new Error(`Failed to convert installment to debt record: ${error.message}`);
    }
  }

  /**
   * 🎯 Priority 2: Auto-generate payment schedules from contract terms (Step3)
   */
  static async generatePaymentScheduleFromContract(installmentOrder) {
    try {
      const schedule = [];
      const startDate = moment(installmentOrder.createdAt);
      const monthlyPayment = installmentOrder.monthlyPayment || 0;
      const installmentCount = installmentOrder.installmentCount || 0;
      const payments = installmentOrder.payments || [];

      for (let i = 1; i <= installmentCount; i++) {
        const dueDate = startDate.clone().add(i, 'months');

        // ตรวจสอบการชำระเงินในงวดนี้
        const payment = payments.find(p =>
          moment(p.payDate).format('YYYY-MM') === dueDate.format('YYYY-MM')
        );

        const scheduleItem = {
          installmentNumber: i,
          dueDate: dueDate.toDate(),
          amount: monthlyPayment,
          status: payment ? 'paid' : (dueDate.isBefore(moment()) ? 'overdue' : 'pending'),
          paidAmount: payment ? payment.amount : 0,
          paidDate: payment ? payment.payDate : null,
          paymentMethod: payment ? payment.method : null,
          notes: payment ? payment.note : '',
          daysOverdue: dueDate.isBefore(moment()) && !payment ?
            moment().diff(dueDate, 'days') : 0
        };

        schedule.push(scheduleItem);
      }

      return schedule;
    } catch (error) {
      console.error('❌ Error generating payment schedule:', error);
      return [];
    }
  }

  /**
   * 🎯 Step4 Completion Process - Auto Create Debt Records
   */
  static async completeStep4AndCreateDebtRecord(req, res) {
    try {
      const { installmentId } = req.params;
      const { approvalData, userId } = req.body;

      console.log(`🎯 Completing Step4 for installment ${installmentId} and creating debt record...`);

      // 1. อัปเดตสถานะ InstallmentOrder ให้เป็น approved/active
      const installmentOrder = await InstallmentOrder.findById(installmentId);
      if (!installmentOrder) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสัญญาผ่อนชำระ'
        });
      }

      // อัปเดตสถานะสัญญา
      installmentOrder.status = 'active';
      installmentOrder.approvalStatus = 'approved';
      installmentOrder.approvedBy = userId;
      installmentOrder.approvalDate = new Date();
      if (approvalData) {
        installmentOrder.approvalNotes = approvalData.notes || '';
      }

      // คำนวณ due date ครั้งแรก
      if (!installmentOrder.dueDate) {
        installmentOrder.dueDate = moment(installmentOrder.createdAt).add(1, 'month').toDate();
      }

      await installmentOrder.save();

      // 2. สร้าง Debt Record ในระบบหนี้สูญ
      const debtRecord = await this.convertInstallmentToDebtRecord(installmentOrder, { userId });

      // 3. บันทึกใน BadDebtCriteria collection (หรือ collection ที่เกี่ยวข้อง)
      // Note: ในที่นี้จะเก็บเป็น metadata ใน installmentOrder เพื่อไม่ให้ซับซ้อน
      installmentOrder.debtTrackingInfo = {
        isTrackedForBadDebt: true,
        trackedSince: new Date(),
        initialRiskLevel: debtRecord.agingAnalysis.riskLevel,
        debtRecord: debtRecord
      };

      await installmentOrder.save();

      // 4. Log การเปลี่ยนแปลง
      console.log(`✅ Step4 completed for contract ${installmentOrder.contractNo}`);
      console.log(`📊 Debt tracking initiated - Risk: ${debtRecord.agingAnalysis.riskLevel}`);

      res.json({
        success: true,
        message: 'อนุมัติสัญญาและเชื่อมโยงระบบติดตามหนี้เรียบร้อย',
        data: {
          installmentOrder: installmentOrder,
          debtRecord: debtRecord,
          trackingInfo: {
            contractNumber: installmentOrder.contractNo,
            riskLevel: debtRecord.agingAnalysis.riskLevel,
            nextDueDate: debtRecord.agingAnalysis.nextDueDate,
            monthlyPayment: debtRecord.monthlyPayment
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in completeStep4AndCreateDebtRecord:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถอนุมัติสัญญาและเชื่อมโยงระบบติดตามหนี้ได้',
        error: error.message
      });
    }
  }

  /**
   * 🎯 Get contracts for Bad Debt Management Display
   */
  static async getContractsForBadDebtDisplay(req, res) {
    try {
      const {
        overdueDays = 30,
        riskLevel,
        branchCode,
        page = 1,
        limit = 20,
        sortBy = 'daysPastDue',
        sortOrder = 'desc'
      } = req.query;

      console.log('🔍 Fetching contracts for bad debt display...');

      const currentDate = new Date();
      const overdueDate = moment().subtract(parseInt(overdueDays), 'days').toDate();

      // สร้าง query
      const matchQuery = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing', 'approved'] },
        dueDate: { $lt: overdueDate }
      };

      if (branchCode) {
        matchQuery.branch_code = branchCode;
      }

      // Aggregation pipeline
      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            daysPastDue: {
              $divide: [
                { $subtract: [currentDate, '$dueDate'] },
                86400000 // milliseconds in a day
              ]
            },
            remainingAmount: {
              $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
            }
          }
        },
        {
          $match: {
            remainingAmount: { $gt: 0 },
            daysPastDue: { $gte: parseInt(overdueDays) }
          }
        },
        {
          $addFields: {
            riskLevel: {
              $switch: {
                branches: [
                  { case: { $gte: ['$daysPastDue', 180] }, then: 'สูงมาก' },
                  { case: { $gte: ['$daysPastDue', 90] }, then: 'สูง' },
                  { case: { $gte: ['$daysPastDue', 60] }, then: 'ปานกลาง' },
                  { case: { $gte: ['$daysPastDue', 30] }, then: 'ต่ำ' }
                ],
                default: 'ปกติ'
              }
            }
          }
        }
      ];

      // Add risk level filter
      if (riskLevel) {
        pipeline.push({
          $match: { riskLevel: riskLevel }
        });
      }

      // Add sorting
      const sortStage = {};
      sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortStage });

      // Execute with pagination
      const [contracts, totalCount] = await Promise.all([
        InstallmentOrder.aggregate([
          ...pipeline,
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) }
        ]),
        InstallmentOrder.aggregate([
          ...pipeline,
          { $count: 'total' }
        ])
      ]);

      // Transform contracts สำหรับ bad debt display
      const transformedContracts = await Promise.all(
        contracts.map(async (contract) => {
          const debtRecord = await this.convertInstallmentToDebtRecord(contract);
          return {
            id: contract._id,
            contractNumber: contract.contractNo,

            // Customer Info
            customerName: debtRecord.customerName,
            customerPhone: debtRecord.customerPhone,
            customerAddress: debtRecord.customerAddress,

            // Financial Data
            originalAmount: debtRecord.originalAmount,
            currentBalance: debtRecord.currentBalance,
            paidAmount: debtRecord.paidAmount,
            monthlyPayment: debtRecord.monthlyPayment,

            // Aging Analysis
            daysPastDue: Math.round(contract.daysPastDue || 0),
            riskLevel: contract.riskLevel,
            debtStatus: debtRecord.debtStatus,

            // Additional Info
            branchCode: contract.branch_code,
            productName: contract.items?.[0]?.name || 'ไม่ระบุ',
            salesPerson: contract.staffName,
            lastPaymentDate: debtRecord.agingAnalysis.lastPaymentDate,
            nextDueDate: debtRecord.agingAnalysis.nextDueDate,

            // Bad Debt Classification
            badDebtCategory: debtRecord.badDebtClassification.category,
            recommendations: debtRecord.badDebtClassification.recommendations,

            // Original contract reference
            originalContract: contract
          };
        })
      );

      const total = totalCount[0]?.total || 0;

      console.log(`✅ Found ${transformedContracts.length} contracts for bad debt display`);

      res.json({
        success: true,
        data: transformedContracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          totalContracts: total,
          totalOverdueAmount: transformedContracts.reduce((sum, c) => sum + c.currentBalance, 0),
          riskDistribution: this.calculateRiskDistribution(transformedContracts)
        }
      });

    } catch (error) {
      console.error('❌ Error getting contracts for bad debt display:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสัญญาเพื่อแสดงในระบบหนี้สูญได้',
        error: error.message
      });
    }
  }

  /**
   * 🎯 Helper Methods for Bad Debt Integration
   */

  // จัดรูปแบบที่อยู่ลูกค้า
  static formatCustomerAddress(customerInfo) {
    const address = customerInfo.address || {};
    const contactAddress = customerInfo.contactAddress || {};
    const mainAddress = contactAddress.useSameAddress ? address : contactAddress;

    const components = [
      mainAddress.houseNo && `เลขที่ ${mainAddress.houseNo}`,
      mainAddress.moo && `หมู่ ${mainAddress.moo}`,
      mainAddress.lane && `ซอย ${mainAddress.lane}`,
      mainAddress.road && `ถนน ${mainAddress.road}`,
      mainAddress.subDistrict && `ต.${mainAddress.subDistrict}`,
      mainAddress.district && `อ.${mainAddress.district}`,
      mainAddress.province && `จ.${mainAddress.province}`,
      mainAddress.zipcode
    ].filter(Boolean);

    return components.join(' ') || 'ไม่ระบุที่อยู่';
  }

  // หาวันที่ชำระครั้งล่าสุด
  static getLastPaymentDate(installmentOrder) {
    const payments = installmentOrder.payments || [];
    if (payments.length === 0) return null;

    return payments.reduce((latest, payment) => {
      const paymentDate = new Date(payment.payDate);
      return paymentDate > latest ? paymentDate : latest;
    }, new Date(payments[0].payDate));
  }

  // คำนวณวันครบกำหนดถัดไป
  static calculateNextDueDate(installmentOrder) {
    const payments = installmentOrder.payments || [];
    const totalInstallments = installmentOrder.installmentCount || 0;
    const paidInstallments = payments.length;

    if (paidInstallments >= totalInstallments) {
      return null; // ชำระครบแล้ว
    }

    const startDate = moment(installmentOrder.createdAt);
    const nextInstallmentNumber = paidInstallments + 1;

    return startDate.clone().add(nextInstallmentNumber, 'months').toDate();
  }

  // กำหนดสถานะหนี้
  static determineDebtStatus(daysPastDue, remainingAmount, paidAmount, totalAmount) {
    if (remainingAmount <= 0) return 'ชำระครบ';
    if (daysPastDue === 0) return 'ปกติ';
    if (daysPastDue <= 30) return 'เริ่มค้างชำระ';
    if (daysPastDue <= 60) return 'ค้างชำระ';
    if (daysPastDue <= 90) return 'ค้างชำระรุนแรง';
    if (daysPastDue <= 180) return 'หนี้สงสัยจะสูญ';
    return 'หนี้สูญ';
  }

  // จัดหมวดหมู่หนี้สูญ
  static classifyBadDebt(daysPastDue) {
    if (daysPastDue <= 30) return 'ปกติ';
    if (daysPastDue <= 60) return 'เฝ้าระวัง';
    if (daysPastDue <= 90) return 'ต้องติดตาม';
    if (daysPastDue <= 180) return 'หนี้สงสัย';
    return 'หนี้สูญ';
  }

  // สร้างเหตุผลหนี้สูญ
  static generateBadDebtReason(daysPastDue, paidAmount, totalAmount) {
    const paymentRatio = totalAmount > 0 ? (paidAmount / totalAmount) : 0;

    let reasons = [];

    if (daysPastDue > 180) {
      reasons.push('ค้างชำระเกิน 180 วัน');
    } else if (daysPastDue > 90) {
      reasons.push('ค้างชำระเกิน 90 วัน');
    }

    if (paymentRatio < 0.3) {
      reasons.push('ชำระเงินได้น้อยกว่า 30% ของยอดรวม');
    }

    if (reasons.length === 0) {
      reasons.push('ค้างชำระตามกำหนด');
    }

    return reasons.join(', ');
  }

  // สร้างข้อเสนอแนะ
  static generateRecommendations(daysPastDue, remainingAmount, riskLevel) {
    const recommendations = [];

    if (daysPastDue >= 180) {
      recommendations.push('พิจารณาดำเนินการทางกฎหมาย');
      recommendations.push('ตั้งค่าเผื่อหนี้สูญ 100%');
    } else if (daysPastDue >= 90) {
      recommendations.push('ติดต่อลูกค้าเพื่อเจรจาการชำระเงิน');
      recommendations.push('พิจารณายึดสินค้า');
      recommendations.push('ตั้งค่าเผื่อหนี้สูญ 50%');
    } else if (daysPastDue >= 60) {
      recommendations.push('เข้มงวดในการติดตาม');
      recommendations.push('ส่งจดหมายเตือน');
      recommendations.push('ตั้งค่าเผื่อหนี้สูญ 15%');
    } else if (daysPastDue >= 30) {
      recommendations.push('ติดต่อเตือนทางโทรศัพท์');
      recommendations.push('ตั้งค่าเผื่อหนี้สูญ 5%');
    }

    if (remainingAmount > 50000) {
      recommendations.push('หนี้มูลค่าสูง - ให้ความสำคัญพิเศษ');
    }

    return recommendations;
  }

  // คำนวณการกระจายตัวของความเสี่ยง
  static calculateRiskDistribution(contracts) {
    const distribution = {
      'ต่ำ': 0,
      'ปานกลาง': 0,
      'สูง': 0,
      'สูงมาก': 0
    };

    contracts.forEach(contract => {
      if (distribution.hasOwnProperty(contract.riskLevel)) {
        distribution[contract.riskLevel]++;
      }
    });

    return distribution;
  }

  /**
   * อัปโหลดสลิปการชำระงวด
   */
  static async uploadPaymentSlip(req, res) {
    try {
      const { id: customerId, paymentId } = req.params;
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์สลิปที่อัปโหลด'
        });
      }

      // Find installment order
      const installmentOrder = await InstallmentOrder.findOne({
        'customer_info.phone': customerId
      }).populate('payments');

      if (!installmentOrder) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลใบสัญญาผ่อนชำระ'
        });
      }

      // Find specific payment
      const payment = installmentOrder.payments.find(p => p._id.toString() === paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการชำระที่ระบุ'
        });
      }

      // Update payment with slip information
      payment.slip = {
        filename: uploadedFile.filename,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        path: uploadedFile.path,
        uploadDate: new Date()
      };

      await installmentOrder.save();

      console.log(`✅ Payment slip uploaded for payment ${paymentId}`);

      res.json({
        success: true,
        message: 'อัปโหลดสลิปการชำระเรียบร้อยแล้ว',
        data: {
          paymentId: payment._id,
          slipInfo: payment.slip
        }
      });

    } catch (error) {
      console.error('Error uploading payment slip:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Helper functions สำหรับ claim items
function getClaimStatus(overdueDays) {
  if (overdueDays >= 90) return 'legal_action';
  if (overdueDays >= 60) return 'claim_required';
  if (overdueDays >= 30) return 'warning';
  return 'overdue';
}

function getClaimPriority(overdueDays, overdueAmount) {
  if (overdueDays >= 90 || overdueAmount >= 50000) return 'high';
  if (overdueDays >= 60 || overdueAmount >= 20000) return 'medium';
  return 'low';
}

// Helper function to generate contract number with better error handling
async function generateContractNumber(branchCode) {
  try {
    const date = moment().format('YYMMDD');
    const branchPrefix = branchCode ? `${branchCode}-` : '';

    console.log('🔢 Generating contract number with params:', { branchCode, date, branchPrefix });

    // ใช้ MongoDB aggregation เพื่อหาหมายเลขสูงสุดและเพิ่มขึ้น 1 - มีประสิทธิภาพมากกว่า
    const pipeline = [
      {
        $match: {
          contractNumber: { $regex: `^INST-${branchPrefix}${date}-\\d{3}$` }
        }
      },
      {
        $project: {
          sequenceNumber: {
            $toInt: {
              $substr: ['$contractNumber', -3, 3]
            }
          }
        }
      },
      {
        $sort: { sequenceNumber: -1 }
      },
      {
        $limit: 1
      }
    ];

    const result = await Installment.aggregate(pipeline);
    const lastSequence = result.length > 0 ? result[0].sequenceNumber : 0;
    const newSequence = lastSequence + 1;

    // สร้างหมายเลขสัญญาใหม่
    const contractNumber = `INST-${branchPrefix}${date}-${String(newSequence).padStart(3, '0')}`;

    console.log(`🔍 Generated contract number: ${contractNumber} (sequence: ${newSequence})`);

    // ตรวจสอบครั้งเดียวเพื่อความปลอดภัย
    const exists = await Installment.findOne({ contractNumber }).lean();
    if (!exists) {
      console.log('✅ Contract number confirmed unique:', contractNumber);
      return contractNumber;
    }

    // หากยังมีอยู่ ใช้ timestamp เป็น fallback (น่าจะเกิดขึ้นยาก)
    const timestamp = Date.now().toString().slice(-6);
    const fallbackNumber = `INST-${branchPrefix}${date}-${timestamp}`;
    console.log('🚨 Using fallback contract number:', fallbackNumber);
    return fallbackNumber;

  } catch (error) {
    console.error('❌ Critical error in generateContractNumber:', error);
    // Emergency fallback with high entropy
    const emergencyNumber = `INST-EMRG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log('🚨 Using emergency contract number:', emergencyNumber);
    return emergencyNumber;
  }
}

// Helper function to generate overdue message
function generateOverdueMessage(overdueMonths, overdueAmount) {
  if (overdueMonths >= 6) {
    return `คุณค้างชำระมาแล้ว ${overdueMonths} เดือน จำนวน ${overdueAmount.toLocaleString()} บาท กรุณาติดต่อเจ้าหน้าที่โดยด่วน`;
  } else if (overdueMonths >= 3) {
    return `คุณค้างชำระ ${overdueMonths} เดือน จำนวน ${overdueAmount.toLocaleString()} บาท กรุณาชำระภายในสิ้นเดือนนี้`;
  } else {
    return `แจ้งเตือน: คุณมียอดค้างชำระ ${overdueAmount.toLocaleString()} บาท`;
  }
}


module.exports = installmentController;
