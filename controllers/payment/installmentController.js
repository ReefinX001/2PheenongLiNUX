const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Customer = require('../models/Customer/Customer'); // ใช้แทน InstallmentCustomer
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Branch = require('../models/Account/Branch');
const InstallmentCounter = require('../models/Installment/InstallmentCounter');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Quotation = require('../models/Installment/Quotation');
const InstallmentAgreement = require('../models/Installment/InstallmentAgreement');
const CreditFollowUp = require('../models/Account/CreditFollowUp');
const Promotion = require('../models/MKT/Promotion');
const CustomerService = require('../services/customerService'); // เพิ่ม import

/**
 * สร้างเลขสัญญา (INST<ปีพ.ศ.><เดือน><running>)
 */
// Updated to trigger nodemon restart
async function getNextContractNo() {
  const now = new Date();
  const yearCE = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearBE = yearCE + 543;

  const doc = await InstallmentCounter.findOneAndUpdate(
    { name: 'installment', year: yearBE, month },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqStr = String(doc.seq).padStart(4, '0');
  return `INST${yearBE}${String(month).padStart(2, '0')}${seqStr}`;
}

/**
 * บันทึกการใช้โปรโมชั่น
 */
async function recordPromotionUsage(promotionId) {
  try {
    const promotion = await Promotion.findById(promotionId).lean();
    if (!promotion) {
      return;
    }

    promotion.usageCount = (promotion.usageCount || 0) + 1;
    await promotion.save();
  } catch (err) {
  }
}

class installmentController {
  // -----------------------------------------------------
  // GET /api/installment/level1
  // -----------------------------------------------------
  static async getLevel1(req, res) {
    try {
      const stocks = await BranchStock.find({ verified: true, stock_value: { $gt: 0 } }).lean();
      const brandMap = {};
      for (const st of stocks) {
        const brand = (st.brand || '').trim();
        if (!brand) continue;
        const key = brand.toLowerCase();
        if (!brandMap[key]) {
          brandMap[key] = { key, label: brand, stock: 0 };
        }
        brandMap[key].stock += st.stock_value;
      }
      return res.json({ success: true, data: Object.values(brandMap) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/level2?parent=...
  // -----------------------------------------------------
  static async getLevel2(req, res) {
    try {
      const parentKey = (req.query.parent || '').trim().toLowerCase();
      const stocks = await BranchStock.find({ verified: true, stock_value: { $gt: 0 } }).lean();
      const list = stocks
        .filter(st => (st.brand || '').trim().toLowerCase() === parentKey)
        .map(st => ({
          _id: st._id,
          name: st.name || '-',
          brand: st.brand || '-',
          model: st.model || '-',
          price: st.price || 0,
          image: st.image || '',
          stock: st.stock_value || 0,
          imei: st.imei || '',
        }));
      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // POST /api/installment/log-follow-up
  // -----------------------------------------------------
  static async logFollowUp(req, res) {
    const {
      order_id,
      customer_name,
      plan_type,
      down_payment,
      credit_amount,
      payoff_amount
    } = req.body;

    try {
      await CreditFollowUp.create({
        installmentOrder: order_id,
        customerName:     customer_name,
        planType:         plan_type,
        downPayment:      down_payment,
        creditAmount:     credit_amount,
        payoffAmount:     payoff_amount,
        createdAt:        new Date(),
      });

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // POST /api/installment
  // สร้างใบสัญญาผ่อน
  // -----------------------------------------------------
  static async createInstallment(req, res) {
    // เริ่ม database session สำหรับ transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        items = [],
        customer_type: customerType = 'individual',
        customer: {
          prefix       = '',
          first_name:   firstName    = '',
          last_name:    lastName     = '',
          phone_number: phoneNumber  = '',
          email        = '',
          invoice_no   : invoiceNo   = '',
          tax_id       : taxId       = '',
          address      = {},
          // ข้อมูลอาชีพ - รองรับรูปแบบใหม่
          occupation_category: occupationCategory = '',
          occupation_subcategory: occupationSubcategory = '',
          workplace = '',
          work_address: workAddress = '',
          position = '',
          work_experience: workExperience = 0,
          monthly_income: monthlyIncome = 0,
          legacy_occupation: legacyOccupation = '',
          other_occupation_detail: otherOccupationDetail = '',
          income = 0, // เก็บไว้สำหรับ backward compatibility
          // สำหรับ corporate
          companyName     = '',
          companyTaxId    = '',
          contactPerson   = '',
          corporatePhone  = '',
          corporateEmail  = '',
          companyAddress  = ''
        } = {},
        witness: {
          name:     witnessName     = '',
          id_card:  witnessIdCard   = '',
          idCard:   witnessIdCardC  = '',
          phone:    witnessPhone    = '',
          relation: witnessRelation = ''
        } = {},
        attachments: {
          id_card_image: idCardImage = '',
          income_slip: incomeSlip = '',
          selfie_image: selfieImage = '',
          customer_signature: customerSignature = '',
          salesperson_signature: employeeSignature = '',
          authorized_signature: authorizedSignature = ''
        } = {},
        plan_type: planType,
        down_payment: downPayment = 0,
        installment_count: installmentCount = 1,
        installment_amount: installmentAmount = 0,
        credit_amount: creditAmount = 0,
        payoff_amount: payoffAmount = 0,
        doc_fee: docFee = 0,
        quotation_no: quotationNo = '',
        credit_term: creditTerm = '',
        sub_total: subTotal = 0,
        total_amount: totalAmount = 0,
        total_text: totalText = '',
        quotation_terms: quotationTerms = '',
        branch_code,
        salesperson_id: salespersonFromBody,
        appliedPromotions = [],
        promotionDiscount = 0,
        skipStockDeduction = false,
        payoffContract = false
      } = req.body;

      // Log parameters สำหรับ debug
      // console.log('📋 Create Installment Parameters:', {
      //   userId: req.user?.id || req.user?._id,
      //   userName: req.user?.name,
      //   userBranch: req.user?.branch,
      //   planType,
      //   skipStockDeduction,
      //   payoffContract,
      //   itemsCount: items.length,
      //   totalAmount,
      //   customerType,
      //   timestamp: new Date().toISOString()
      // });

      // 🔍 Debug: ตรวจสอบข้อมูลลูกค้าที่ได้รับ
      // 1) ตรวจสอบข้อมูลพื้นฐาน
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'ไม่มีสินค้าในตะกร้า' });
      }
      if (!['plan1','plan2','plan3'].includes(planType)) {
        return res.status(400).json({ success: false, error: 'planType ไม่ถูกต้อง' });
      }

      // ตรวจสอบข้อมูลลูกค้าที่จำเป็น
      if (customerType === 'individual') {
        if (!firstName) {
          return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อลูกค้า' });
        }
      } else if (customerType === 'corporate') {
        if (!companyName) {
          return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อบริษัท' });
        }
      }

      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'กรุณากรอกเบอร์โทรศัพท์' });
      }

      // ✅ ตรวจสอบความถูกต้องของยอดเงิน
      if (totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'ยอดรวมต้องมากกว่า 0' });
      }

      if (downPayment < 0) {
        return res.status(400).json({ success: false, error: 'เงินดาวน์ต้องไม่เป็นค่าลบ' });
      }

      if (downPayment > totalAmount) {
        return res.status(400).json({
          success: false,
          error: `เงินดาวน์ (${downPayment.toLocaleString()}) ต้องไม่เกินยอดรวม (${totalAmount.toLocaleString()})`
        });
      }

      // คำนวณ creditAmount ที่ถูกต้อง (ถ้าไม่ได้ส่งมาหรือส่งมาผิด)
      let correctedCreditAmount = creditAmount;
      const calculatedCreditAmount = totalAmount - downPayment;

      if (calculatedCreditAmount < 0) {
        return res.status(400).json({
          success: false,
          error: `ยอดเครดิตคำนวณได้เป็นค่าลบ (${calculatedCreditAmount.toLocaleString()}) - กรุณาตรวจสอบยอดรวมและเงินดาวน์`
        });
      }

      // ใช้ยอดที่คำนวณได้ถ้าแตกต่างจากที่ส่งมา
      if (Math.abs(correctedCreditAmount - calculatedCreditAmount) > 1) { // ยอมรับความผิดพลาดปัดเศษ 1 บาท
        console.log(`⚠️ Credit amount corrected: ${correctedCreditAmount} -> ${calculatedCreditAmount}`);
        correctedCreditAmount = calculatedCreditAmount;
      }

      // 2) หาสาขา
      let realBranchCode;
      if (req.user?.branch) {
        const br = await Branch.findById(req.user.branch).lean();
        if (!br) throw new Error(`ไม่พบสาขา _id=${req.user.branch}`);
        realBranchCode = br.branch_code;
      } else if (branch_code) {
        const br = await Branch.findOne({ branch_code }).lean();
        if (!br) return res.status(404).json({ success: false, error: `ไม่พบสาขา ${branch_code}` });
        realBranchCode = br.branch_code;
      } else {
        console.error('❌ No branch information found');
        return res.status(400).json({ success: false, error: 'ไม่ทราบสาขา' });
      }

      // 3) สร้างเลข contract
      const contractNo = await getNextContractNo();

      // 4) หา salesperson
      let salespersonId = req.user?.id || req.user?._id;  // รองรับทั้ง id และ _id
      if (!salespersonId && salespersonFromBody) {
        if (!mongoose.Types.ObjectId.isValid(salespersonFromBody)) {
          return res.status(400).json({ success: false, error: 'Invalid salesperson ID' });
        }
        salespersonId = new mongoose.Types.ObjectId(salespersonFromBody);
      }
      if (!salespersonId) {
        return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลพนักงานขาย' });
      }
      // 5) ตรวจสอบสต็อกสินค้า (ข้ามถ้าเป็น skipStockDeduction)
      if (!skipStockDeduction) {
        for (const it of items) {
          const stockId = it.productId || it.product_id;
          const st = await BranchStock.findOne({ _id: stockId, branch_code: realBranchCode }).lean();
          if (!st) {
            return res.status(400).json({ success: false, error: `ไม่พบสต๊อกของ ${it.name}` });
          }
        }
      } else {
        // console.log('🔥 ข้ามการตรวจสอบสต็อก - skipStockDeduction = true (สัญญาผ่อนหมดรับของ)');
      }

      // 6) จัดการลูกค้าผ่าน Customer model
      const idCard = customerType === 'individual' ? taxId : (companyTaxId || taxId);

      // 🔍 Debug: ตรวจสอบค่า idCard
      // ✅ ตรวจสอบว่า idCard มีค่าก่อนเรียก checkCustomerStatus
      if (!idCard || idCard.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอกเลขบัตรประชาชน / เลขประจำตัวผู้เสียภาษี'
        });
      }

      // ตรวจสอบสถานะลูกค้า
      const customerStatus = await CustomerService.checkCustomerStatus(idCard.trim());

      // เตรียมข้อมูลสำหรับ upsert
      const customerData = { customerType };
      if (customerType === 'individual') {
        customerData.individual = {
          prefix: prefix || 'นาย',
          firstName,
          lastName,
          phone: phoneNumber,
          email,
          address,
          taxId: idCard,
          // เพิ่มข้อมูลอาชีพ
          occupation: {
            category: occupationCategory,
            subcategory: occupationSubcategory,
            workplace,
            workAddress,
            position,
            workExperience: workExperience || 0,
            monthlyIncome: monthlyIncome || income || 0,
            legacyOccupationText: legacyOccupation,
            otherOccupationDetail
          },
          income: income || monthlyIncome || 0 // เก็บไว้สำหรับ backward compatibility
        };
      } else {
        customerData.corporate = {
          companyName,
          companyTaxId: idCard,
          contactPerson: contactPerson || `${firstName} ${lastName}`.trim(),
          corporatePhone: corporatePhone || phoneNumber,
          corporateEmail: corporateEmail || email,
          companyAddress: typeof companyAddress === 'string' ? companyAddress : JSON.stringify(companyAddress || address)
        };
      }

      // Upsert customer
      const custFilter = customerType === 'individual'
        ? { 'individual.taxId': idCard }
        : { 'corporate.companyTaxId': idCard };

      let customer;
      try {
        customer = await Customer.findOneAndUpdate(
          custFilter,
          { $set: customerData },
          { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true, session }
        );
      } catch (customerError) {
        if (customerError.name === 'ValidationError') {
          return res.status(400).json({
            success: false,
            error: `Customer validation failed: ${customerError.message}`
          });
        }
        throw new Error(`Failed to upsert customer: ${customerError.message}`);
      }

      if (!customer || !customer._id) {
        console.error('❌ Customer record could not be created');
        throw new Error('Customer record could not be created.');
      }

      // ✅ ระบบไม่มีการตรวจสอบวงเงิน - อนุญาตให้ทำรายการได้ทุกจำนวน

      // อัพเดทข้อมูลเอกสารแนบ
      if (idCardImage || incomeSlip || selfieImage) {
        await Customer.findByIdAndUpdate(customer._id, {
          $set: {
            documents: {
              idCardImage,
              incomeSlip,
              selfieImage,
              customerSignature,
              employeeSignature,
              authorizedSignature
            }
          }
        }, { session });
      }

      // อัพเดทข้อมูลการผ่อน (แปลง 'custom' เป็น 'manual')
      const normalizedPlanType = planType === 'custom' ? 'manual' : planType;

      // ✅ แก้ไข: ใช้ correctedCreditAmount โดยตรง ไม่บวกเพิ่มเติม
      // เพื่อป้องกันการได้ค่าลบจากข้อมูลเก่าที่อาจผิดพลาด
      const safeCreditAmount = Math.max(0, correctedCreditAmount);

      // 🔍 Debug: ตรวจสอบค่าก่อนบันทึก
      console.log('💰 Credit calculation:', {
        totalAmount,
        downPayment,
        correctedCreditAmount,
        safeCreditAmount,
        timestamp: new Date().toISOString()
      });

      await Customer.findByIdAndUpdate(customer._id, {
        $addToSet: {
          'installmentInfo.paymentPlans': normalizedPlanType
        },
        $inc: {
          'installmentInfo.currentActiveContracts': 1
        },
        $set: {
          'installmentInfo.totalCreditAmount': safeCreditAmount
        }
      }, { session });

      // คำนวณราคาหลังหักโปรโมชั่น
      const finalTotalAmount = totalAmount - promotionDiscount;
      // 7) สร้าง InstallmentOrder
      const staffName = req.user?.name || 'พนักงาน';
      const newOrder = await InstallmentOrder.create({
        contractNo,
        planType,
        branch_code: realBranchCode,
        staffName,
        customer: customer._id,  // ← แก้จาก customer_id เป็น customer
        customer_info: {
          prefix: customerType === 'individual' ? (prefix || 'นาย') : '',
          firstName: customerType === 'individual' ? firstName : companyName,
          lastName: customerType === 'individual' ? lastName : '',
          phone: phoneNumber,
          email,
          invoiceNo,
          taxId: idCard,
          address,
          // เพิ่มข้อมูลอาชีพ snapshot ณ เวลาที่สร้างสัญญา
          occupation: {
            category: occupationCategory,
            subcategory: occupationSubcategory,
            workplace,
            workAddress,
            position,
            workExperience: workExperience || 0,
            monthlyIncome: monthlyIncome || income || 0,
            legacyOccupationText: legacyOccupation,
            otherOccupationDetail
          },
          income: income || monthlyIncome || 0
        },
        items: items.map(it => ({
          productId: new mongoose.Types.ObjectId(it.productId || it.product_id),
          name: it.name,
          qty: it.qty,
          imei: it.imei,
          downAmount: it.downAmount,
          downInstallmentCount: it.downInstallmentCount,
          downInstallment: it.downInstallment,
          creditThreshold: it.creditThreshold,
          payUseInstallmentCount: it.payUseInstallmentCount,
          payUseInstallment: it.payUseInstallment,
          pricePayOff: it.pricePayOff,
          promotion: it.promotion || null,
          itemDiscount: it.itemDiscount || 0
        })),
        downPayment,
        monthlyPayment: installmentAmount,
        installmentCount,
        subTotal,
        totalAmount,
        totalText,
        creditTerm,
        quotationTerms,
        promotionDiscount,
        appliedPromotions: appliedPromotions.map(promo => ({
          id: promo.id || promo._id,
          name: promo.name,
          type: promo.type,
          discount: promo.discount
        })),
        finalTotalAmount,
        idCardImageUrl: idCardImage,
        salarySlipUrl: incomeSlip,
        selfieUrl: selfieImage,
        customerSignatureUrl: customerSignature,
        salespersonSignatureUrl: employeeSignature,
        authorizedSignatureUrl: authorizedSignature,
        witness: {
          name: witnessName,
          idCard: witnessIdCard || witnessIdCardC,
          phone: witnessPhone,
          relation: witnessRelation
        },
        status: 'ongoing',
        paidAmount: downPayment,
        isStockCommitted: false,
        purchaseType: 'installment',
        hasWarranty: true,
        warrantyStartDate: new Date(),
        warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        eligibleServices: ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty'],
        serviceUsageCount: {
          'phone-film': 0,
          'ipad-film': 0,
          'phone-warranty': 0,
          'ipad-warranty': 0
        }
      }, { session });

      // 8) เพิ่มประวัติการซื้อ - แยกตาม planType
      let purchaseType = 'installment_new';
      let saleDetails = {
        pickupMethod: 'store',
        deliveryStatus: 'pending',
        usageStatus: 'active'
      };

      // กำหนด type และ saleDetails ตาม planType
      if (planType === 'plan1') {
        purchaseType = 'installment_new';
        saleDetails.deliveryStatus = 'delivered'; // plan1 รับของทันที
        saleDetails.completionDate = new Date();
      } else if (planType === 'plan2') {
        purchaseType = 'installment_ongoing';
        saleDetails.usageStatus = 'active';
      } else if (planType === 'plan3') {
        purchaseType = 'installment_pickup';
        saleDetails.deliveryStatus = 'pending';
      }

      // 🔍 Debug: ตรวจสอบข้อมูลก่อน addPurchaseHistory
      // console.log('🔍 Customer before addPurchaseHistory:', {
      //   customerId: customer._id,
      //   purchaseHistoryLength: customer.purchaseHistory.length,
      //   existingTypes: customer.purchaseHistory.map(p => p.type),
      //   newPurchaseType: purchaseType
      // });

      customer.addPurchaseHistory({
        type: purchaseType,
        orderId: newOrder._id,
        orderModel: 'InstallmentOrder',
        purchaseDate: new Date(),
        amount: finalTotalAmount,
        branchCode: realBranchCode,
        contractNo: contractNo,
        planType: planType,
        saleDetails: saleDetails,
        items: items.map(it => ({
          productId: it.productId || it.product_id,
          name: it.name,
          imei: it.imei || '',
          qty: it.qty,
          unitPrice: it.price,
          totalPrice: it.price * it.qty,
          downPayment: it.downAmount || 0,
          installmentAmount: it.installmentAmount || 0,
          installmentTerms: installmentCount
        }))
      });

      // อัพเดทสถิติลูกค้า
      await customer.updateStatistics();

      // บันทึกข้อมูลลูกค้าครั้งเดียว (แก้ไข version conflict)
      await customer.save({ session });

      // 9) จัดการ Quotation
      let quotationNumberFinal = quotationNo;
      if (quotationNumberFinal) {
        const exists = await Quotation.findOne({ quotation_number: quotationNumberFinal }).lean();
        if (exists) {
          quotationNumberFinal = `${quotationNumberFinal}-${Date.now()}`;
        }
      }

      let createdQuotationId = null;
      let finalQuotationNumberForResponse = quotationNo;

      if (quotationNo) {
        const quotation = await Quotation.create({
          quotation_number: quotationNumberFinal,
          customer_name: customerType === 'individual'
            ? `${firstName} ${lastName}`.trim()
            : companyName,
          tax_number: idCard,
          invoice_no: invoiceNo,
          address: typeof address === 'string'
            ? address
            : (() => {
                const { houseNo, moo, subDistrict, district, province, zipcode } = address;
                return `${houseNo||''} หมู่${moo||''} ต.${subDistrict||''} อ.${district||''} จ.${province||''} ${zipcode||''}`.trim();
              })(),
          phone: phoneNumber,
          email,
          quotation_date: new Date(),
          valid_until: '',
          sales_person: salespersonId,
          payment_method: 'installment',
          contact_person: salespersonId,
          items: items.map(it => ({
            description: it.name,
            quantity: it.qty,
            unitPrice: it.price,
            discount: 0,
            amount: (it.price || 0) * (it.qty || 1)
          })),
          sub_total: subTotal,
          total_amount: totalAmount,
          contact_info: {
            totalText,
            terms: quotationTerms
          }
        }, { session });
        createdQuotationId = quotation._id;
        finalQuotationNumberForResponse = quotation.quotation_number;
      }

      // 10) สร้าง InstallmentAgreement
      if (createdQuotationId) {
        await InstallmentAgreement.create({
          quotation: createdQuotationId,
          downPayment,
          terms: installmentCount,
          installmentAmt: installmentAmount,
          planType,
          attachments: { idCardImage, incomeSlip, selfieImage, customerSignature, employeeSignature, authorizedSignature },
          witness: {
            name: witnessName,
            idCard: witnessIdCard || witnessIdCardC,
            phone: witnessPhone,
            relation: witnessRelation
          },
          customerSignature,
          employeeSignature
        }, { session });
      }

      // 11) ตัดสต็อกทันทีถ้า plan1 และไม่ใช่ skipStockDeduction
      if (planType === 'plan1' && !skipStockDeduction) {
        const finalItems = [];
        let totalQty = 0;
        for (const it of items) {
          const stockId = it.productId || it.product_id;
          const st = await BranchStock.findOne({ _id: stockId, branch_code: realBranchCode }).lean();
          if (!st) {
            continue;
          }
          await BranchStock.deleteOne({ _id: stockId, branch_code: realBranchCode }).session(session);
          finalItems.push({
            name: it.name,
            model: it.model || st.model,
            imei: it.imei || st.imei,
            qty: it.qty,
            price: it.price,
            cost: st.cost
          });
          totalQty += it.qty;
        }
        if (finalItems.length) {
          await BranchStockHistory.create({
            branch_code: realBranchCode,
            change_type: 'OUT',
            transactionType: 'credit_sale',  // เปลี่ยนเป็น credit_sale ที่อยู่ใน enum
            reason: `ขายผ่อน ${planType}`,
            performed_by: salespersonId,
            performed_at: new Date(),
            order_id: newOrder._id,
            installment_id: newOrder._id,
            contract_no: contractNo,
            items: finalItems,
            quantity: totalQty,
            sale_date: new Date(),
            staff_name: staffName,
            paymentInfo: {
              method: 'none',
              received: false
            }
          }, { session });
          newOrder.isStockCommitted = true;
          await newOrder.save({ session });
        }
      } else if (skipStockDeduction) {
        // console.log('🔥 ข้ามการตัดสต็อก - skipStockDeduction = true (สัญญาผ่อนหมดรับของ)');
        // สำหรับ payoff contract ไม่ต้องตัดสต็อกเพราะลูกค้ายังไม่ได้รับของ
        // สต็อกจะถูกตัดเมื่อลูกค้ามารับของจริงในภายหลัง
      }

      // บันทึกการใช้โปรโมชั่น
      if (appliedPromotions && appliedPromotions.length > 0) {
        for (const promo of appliedPromotions) {
          await recordPromotionUsage(promo.id || promo._id);
        }
      }

      // 12) บันทึก down payment
      if (downPayment > 0) {
        await InstallmentPayment.create({
          customer_id: customer._id,
          installmentOrder: newOrder._id,
          installmentNumber: 0,
          amountDue: downPayment,
          amountPaid: downPayment,
          paymentMethod: 'cash',
          dueDate: new Date(),
          paymentDate: new Date(),
          note: 'ดาวน์'
        }, { session });
      }

      // Push update
      const io = req.app.get('io');
      io.emit('installmentHistoryUpdated', {
        orderId: newOrder._id,
        customerId: customer._id
      });

      // Commit transaction ก่อนส่งผลลัพธ์
      await session.commitTransaction();
      session.endSession();

      // ส่งผลลัพธ์
      return res.json({
        success: true,
        data: {
          orderId: newOrder._id,
          installment_id: newOrder._id,  // เพิ่มสำหรับการตัดสต๊อก
          contract_no: contractNo,       // เพิ่มสำหรับการตัดสต๊อก
          customerId: customer._id,
          contractNo,
          quotationId: createdQuotationId,
          quotationNo: finalQuotationNumberForResponse,
          promotionDiscount,
          appliedPromotions: appliedPromotions.length,
          finalTotalAmount,
          customerInfo: {
            isNewCustomer: customerStatus.isNewCustomer,
            displayName: customer.displayName
          }
        }
      });
    } catch (err) {
      // Rollback transaction ถ้ามี error
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/search-by-taxid
  // -----------------------------------------------------
  static async searchInstallmentByTaxId(req, res) {
    try {
      const { taxId } = req.query;
      if (!taxId) {
        return res.status(400).json({ success: false, error: 'Missing taxId' });
      }

      // ค้นหาจาก Customer model
      const customer = await Customer.findOne({
        $or: [
          { 'individual.taxId': taxId },
          { 'corporate.companyTaxId': taxId }
        ]
      }).lean();

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: `ไม่พบลูกค้าที่มี taxId = ${taxId}`
        });
      }

      // หา installment orders
      const orders = await InstallmentOrder.find({
        customer: customer._id  // ← แก้จาก customer_id เป็น customer
      })
      .populate('installmentPayments')
      .populate('customer')  // ← เพิ่ม populate customer
      .sort({ createdAt: -1 })
      .lean();

      return res.json({
        success: true,
        data: {
          customer,
          orders,
          purchaseHistory: customer.purchaseHistory.filter(p => p.type.startsWith('installment_'))
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // POST /api/installment/pay
  // -----------------------------------------------------
  static async payInstallment(req, res) {
    try {
      const {
        orderId,
        installmentNumber,
        amountDue,
        amountPaid,
        paymentMethod,
        dueDate,
        paymentDate,
        note
      } = req.body;

      const usedInstallmentNumber = note && /down/i.test(note)
        ? 0
        : installmentNumber;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid orderId' });
      }
      if (!amountPaid || amountPaid <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amountPaid' });
      }

      const order = await InstallmentOrder.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({ success: false, error: `ไม่พบใบสัญญาผ่อน (orderId: ${orderId})` });
      }

      const exists = await InstallmentPayment.findOne({
        installmentOrder:  order._id,
        installmentNumber: usedInstallmentNumber
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          error: `งวดที่ ${usedInstallmentNumber} ได้บันทึกการชำระไปแล้ว`
        });
      }

      const newPayment = await InstallmentPayment.create({
        customer_id: order.customer,  // ← เปลี่ยนจาก order.customer_id เป็น order.customer
        installmentOrder:  order._id,
        installmentNumber: usedInstallmentNumber,
        amountDue:         amountDue  || order.monthlyPayment || 0,
        amountPaid,
        paymentMethod:     paymentMethod || 'cash',
        dueDate:           dueDate     ? new Date(dueDate)     : new Date(),
        paymentDate:       paymentDate ? new Date(paymentDate) : new Date(),
        note:              note        || ''
      });

      order.paidAmount = (order.paidAmount || 0) + amountPaid;
      const totalDue = order.finalTotalAmount || order.totalAmount;
      if (order.paidAmount >= totalDue) {
        order.status = 'completed';
      }
      await order.save();

      const io = req.app.get('io');
      if (io && typeof io.emit === 'function') {
        io.emit('installmentHistoryUpdated', {
          orderId: order._id,
          customerId: order.customer  // ← แก้จาก order.customer_id เป็น order.customer
        });
      }

      return res.json({ success: true, data: newPayment });

    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          error: `งวดที่ ${req.body.installmentNumber} ได้บันทึกการชำระไปแล้ว`
        });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/:id/receipt
  // -----------------------------------------------------
  static async getInstallmentReceiptById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: `Invalid Order ID format: ${id}` });
      }

      const order = await InstallmentOrder.findById(id).lean()
        .populate('customer')  // ← แก้จาก customer_id เป็น customer
        .lean();

      if (!order) {
        return res.status(404).json({ success: false, error: `ไม่พบ InstallmentOrder _id=${id}` });
      }

      let customerInfoForReceipt = order.customer_info;
      if (order.customer) {  // ← แก้จาก order.customer_id เป็น order.customer
        const cust = order.customer;  // ← แก้จาก order.customer_id เป็น order.customer
        if (cust.customerType === 'individual') {
          customerInfoForReceipt = {
            name: `${cust.individual.firstName || ''} ${cust.individual.lastName || ''}`.trim(),
            address: cust.individual.address,
            phone: cust.individual.phone,
            taxId: cust.individual.taxId,
            email: cust.individual.email,
          };
        } else {
          customerInfoForReceipt = {
            name: cust.corporate.companyName,
            address: cust.corporate.companyAddress,
            phone: cust.corporate.corporatePhone,
            taxId: cust.corporate.companyTaxId,
            email: cust.corporate.corporateEmail,
          };
        }
      }

      const payload = {
        contractNo: order.contractNo,
        planType: order.planType,
        staffName: order.staffName,
        orderDate: order.createdAt,
        customerInfo: customerInfoForReceipt,
        items: order.items || [],
        downPayment: order.downPayment,
        monthlyPayment: order.monthlyPayment,
        installmentCount: order.installmentCount,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
      };
      return res.json({ success: true, data: payload });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/history-receipt-image
  // -----------------------------------------------------
  static async getHistoryReceiptImage(req, res) {
    try {
      const { historyId } = req.query;
      if (!historyId || !mongoose.Types.ObjectId.isValid(historyId)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid historyId' });
      }

      const history = await BranchStockHistory.findById(historyId).lean();
      if (!history) {
        return res.status(404).json({ success: false, error: `ไม่พบประวัติสต๊อก _id=${historyId}` });
      }

      if (history.change_type !== 'OUT' || !(history.reason?.toLowerCase().includes('ขายผ่อน') || history.reason?.toLowerCase().includes('ขายแบบผ่อน'))) {
        return res.status(400).json({ success: false, error: 'ไม่ใช่รายการสินค้าออกจากการขายผ่อน' });
      }

      let orderDetails = {};
      if (history.installment_id && mongoose.Types.ObjectId.isValid(history.installment_id)) {
          const order = await InstallmentOrder.findById(history.installment_id).lean()
              .populate('customer')  // ← แก้จาก customer_id เป็น customer
              .lean();
          if (order) {
              let customerNameStr = 'N/A';
              if (order.customer) {  // ← แก้จาก order.customer_id เป็น order.customer
                const cust = order.customer;  // ← แก้จาก order.customer_id เป็น order.customer
                if (cust.customerType === 'individual') {
                  customerNameStr = `${cust.individual.firstName || ''} ${cust.individual.lastName || ''}`.trim();
                } else {
                  customerNameStr = cust.corporate.companyName;
                }
              } else if (order.customer_info) {
                customerNameStr = `${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim();
              }
              orderDetails = {
                  customerName: customerNameStr,
                  orderDate: order.createdAt,
                  planType: order.planType,
              };
          }
      }

      const payload = {
        contractNo: history.contract_no,
        items: history.items || [],
        staffName: history.staff_name,
        transactionDate: history.performed_at,
        reason: history.reason,
        branchCode: history.branch_code,
        totalQuantity: history.quantity,
         ...orderDetails
      };
      return res.json({ success: true, data: payload });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/customers/:id
  // -----------------------------------------------------
  static async getCustomerDetail(req, res) {
    try {
      const customerId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ success: false, error: 'Invalid customerId format' });
      }

      const cust = await Customer.findById(customerId).lean();
      if (!cust) {
        return res.status(404).json({ success: false, error: 'ไม่พบลูกค้า' });
      }

      const orders = await InstallmentOrder
        .find({ customer: cust._id }).lean()  // ← แก้จาก customer_id เป็น customer
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        data: {
          ...cust,
          installmentOrdersAssociated: orders
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // GET /api/installment/history
  // -----------------------------------------------------
  static async getInstallmentHistory(req, res) {
    try {
      const { startDate, endDate, customerName, status, planType, contractNo, branchCode, page = 1, limit = 20 } = req.query;
      const filter = {};

      if (startDate) {
        const sDate = new Date(startDate);
         sDate.setHours(0, 0, 0, 0);
        filter.createdAt = { ...filter.createdAt, $gte: sDate };
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt = { ...filter.createdAt, $lte: eDate };
      }
       if (status) {
         filter.status = status;
       }
       if (planType) {
         filter.planType = planType;
       }
       if (contractNo) {
         filter.contractNo = { $regex: contractNo.trim(), $options: 'i' };
       }
       if (branchCode) {
           filter.branch_code = branchCode;
       }
       if (customerName) {
        const nameParts = customerName.trim().split(' ');
        const nameRegexps = nameParts.map(part => new RegExp(part, 'i'));
        filter.$or = [
            { 'customer_info.firstName': { $in: nameRegexps } },
            { 'customer_info.lastName': { $in: nameRegexps } }
        ];
       }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const ordersQuery = InstallmentOrder.find(filter).lean()
        .populate('customer')  // ← แก้จาก customer_id เป็น customer
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const orders = await ordersQuery;
      const total = await InstallmentOrder.countDocuments(filter);

      let filteredOrders = orders;
      if (customerName && !filter.$or) {
        const lowerCustomerName = customerName.toLowerCase();
        filteredOrders = orders.filter(o => {
          let fullName = '';
          if (o.customer) {  // ← แก้จาก o.customer_id เป็น o.customer
            const cust = o.customer;  // ← แก้จาก o.customer_id เป็น o.customer
            if (cust.customerType === 'individual') {
              fullName = `${cust.individual.firstName || ''} ${cust.individual.lastName || ''}`.trim().toLowerCase();
            } else {
              fullName = (cust.corporate.companyName || '').toLowerCase();
            }
          } else if (o.customer_info) {
              fullName = `${o.customer_info.firstName || ''} ${o.customer_info.lastName || ''}`.trim().toLowerCase();
          }
          return fullName.includes(lowerCustomerName);
        });
      }

      return res.json({
          success: true,
          data: filteredOrders,
          pagination: {
              total,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(total / parseInt(limit))
          }
       });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // -----------------------------------------------------
  // POST /api/installment/customers/:id/installments/:paymentId/slip
  // อัปโหลดสลิปการโอน
  // -----------------------------------------------------
  static async uploadPaymentSlip(req, res) {
    try {
      const { id: customerId, paymentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({ success: false, error: 'Invalid paymentId format' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      const slipUrl = `${req.protocol}://${req.get('host')}/uploads/slips/${req.file.filename}`;
      const payment = await InstallmentPayment.findByIdAndUpdate(
        paymentId,
        { slipUrl, status: 'pending_verification' },
        { new: true }
      );
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = installmentController;
