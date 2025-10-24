/**
 * @file validateInstallmentData.js
 * @description Middleware สำหรับตรวจสอบและ validate ข้อมูลจาก step1-4 ก่อนส่งไป PDF controllers
 * @version 1.0.0
 * @date 2025-01-27
 */

const validateInstallmentData = (req, res, next) => {
  try {
    console.log('🔍 Validating installment data from step1-4...');

    const { body } = req;
    const errors = [];
    const warnings = [];

    // === ตรวจสอบข้อมูล Step 1: Product Selection ===
    if (!body.selectedProducts && !body.productName) {
      errors.push('ไม่พบข้อมูลสินค้า (Step 1)');
    } else {
      // ตรวจสอบข้อมูลสินค้าเพิ่มเติม
      if (!body.productType) warnings.push('ไม่พบประเภทสินค้า (productType)');
      if (!body.downAmount && !body.customDownPayment) warnings.push('ไม่พบจำนวนเงินดาวน์');
      if (!body.taxType) warnings.push('ไม่พบประเภทภาษี (taxType)');
      if (!body.taxRate) warnings.push('ไม่พบอัตราภาษี (taxRate)');
    }

    // === ตรวจสอบข้อมูล Step 2: Customer Information ===
    if (!body.firstName && !body.customerName) {
      errors.push('ไม่พบชื่อลูกค้า (Step 2)');
    } else {
      // ตรวจสอบข้อมูลลูกค้าเพิ่มเติม
      if (!body.lastName) warnings.push('ไม่พบนามสกุลลูกค้า');
      if (!body.phone) warnings.push('ไม่พบเบอร์โทรศัพท์');
      if (!body.houseNo) warnings.push('ไม่พบเลขที่บ้าน (houseNo)');
      if (!body.province) warnings.push('ไม่พบจังหวัด');
      if (!body.district) warnings.push('ไม่พบอำเภอ');
      if (!body.subDistrict) warnings.push('ไม่พบตำบล');
      if (!body.zipcode) warnings.push('ไม่พบรหัสไปรษณีย์');
      // ตรวจสอบข้อมูลอาชีพ - รองรับทั้งรูปแบบเก่าและใหม่
      if (!body.occupation && !body.customerOccupation && !body.occupationCategory) {
        warnings.push('ไม่พบข้อมูลอาชีพ');
      } else {
        // ตรวจสอบรูปแบบใหม่
        if (body.occupationCategory === 'อื่นๆ' && !body.otherOccupationDetail) {
          warnings.push('กรุณาระบุรายละเอียดอาชีพเมื่อเลือก "อื่นๆ"');
        }
        // ตรวจสอบข้อมูลที่ทำงาน
        if (body.occupationCategory && !body.workplace) {
          warnings.push('ไม่พบข้อมูลสถานที่ทำงาน');
        }
        if (body.occupationCategory && !body.monthlyIncome && !body.income) {
          warnings.push('ไม่พบข้อมูลรายได้รายเดือน');
        }
      }
      if (!body.income) warnings.push('ไม่พบข้อมูลรายได้');
      if (!body.age) warnings.push('ไม่พบอายุ');
    }

    // === ตรวจสอบข้อมูล Step 3: Payment Plan ===
    if (!body.customInstallmentCount && !body.installmentCount) {
      warnings.push('ไม่พบจำนวนงวดการผ่อนชำระ (Step 3)');
    }
    if (!body.paymentSchedule) {
      warnings.push('ไม่พบตารางการผ่อนชำระ (paymentSchedule)');
    }
    if (!body.globalPaymentMethod) {
      warnings.push('ไม่พบวิธีการชำระเงิน (globalPaymentMethod)');
    }
    if (!body.totalAmount && !body.grandTotal) {
      warnings.push('ไม่พบยอดเงินรวม');
    }

    // === ตรวจสอบข้อมูล Step 4: Contract Details ===
    if (!body.contractTerms) {
      warnings.push('ไม่พบข้อกำหนดสัญญา (Step 4)');
    }
    if (!body.contractNumber) {
      warnings.push('ไม่พบเลขที่สัญญา');
    }
    if (!body.salesPersonInfo && !body.salespersonSignatureUrl) {
      warnings.push('ไม่พบข้อมูลพนักงานขาย');
    }

    // === การแก้ไขข้อมูลอัตโนมัติ ===

    // แปลง selectedProducts ให้เป็น array ถ้าเป็น string
    if (body.selectedProducts && typeof body.selectedProducts === 'string') {
      try {
        body.selectedProducts = JSON.parse(body.selectedProducts);
      } catch (e) {
        console.warn('⚠️ Cannot parse selectedProducts as JSON');
      }
    }

    // รวมชื่อลูกค้าถ้าแยกออกจากกัน
    if (body.firstName && body.lastName && !body.customerName) {
      body.customerName = `${body.prefix || ''}${body.firstName} ${body.lastName}`.trim();
    }

    // รวมที่อยู่ถ้าแยกออกจากกัน
    if (!body.address && body.houseNo) {
      const addressParts = [
        body.houseNo,
        body.moo ? `หมู่ ${body.moo}` : '',
        body.soi ? `ซอย ${body.soi}` : '',
        body.road ? `ถนน ${body.road}` : '',
        body.subDistrict || '',
        body.district || '',
        body.province || '',
        body.zipcode || ''
      ].filter(part => part && part.trim() !== '');

      body.address = addressParts.join(' ').trim();
    }

    // === แปลงข้อมูลอาชีพให้อยู่ในรูปแบบใหม่ ===
    if (!body.occupationData && (body.occupationCategory || body.customerOccupation || body.occupation)) {
      body.occupationData = {
        category: body.occupationCategory || body.customerOccupation || body.occupation || '',
        subcategory: body.occupationSubcategory || '',
        workplace: body.workplace || body.customerWorkplace || '',
        workAddress: body.workAddress || '',
        position: body.position || body.customerPosition || '',
        workExperience: body.workExperience || 0,
        monthlyIncome: body.monthlyIncome || body.income || 0,
        // เก็บข้อมูลเดิมไว้สำหรับ backward compatibility
        legacyOccupationText: body.occupation || body.customerOccupation || '',
        // ข้อมูลเพิ่มเติมสำหรับอาชีพ "อื่นๆ"
        otherOccupationDetail: body.otherOccupationDetail || ''
      };
    }

    // กำหนดค่า default สำหรับข้อมูลที่ขาดหายไป
    if (!body.contractDate) {
      body.contractDate = new Date().toLocaleDateString('th-TH');
    }

    if (!body.quotationNumber && !body.contractNumber) {
      body.quotationNumber = 'QT' + Date.now();
    }

    // === Validate occupation data integrity ===
    if (body.occupationData) {
      const occ = body.occupationData;
      // ตรวจสอบความสมบูรณ์ของข้อมูลอาชีพ
      if (occ.category === 'อื่นๆ' && !occ.otherOccupationDetail) {
        warnings.push('ต้องระบุรายละเอียดอาชีพเมื่อเลือก "อื่นๆ"');
      }

      // ตรวจสอบข้อมูลรายได้
      if (occ.monthlyIncome && occ.monthlyIncome < 0) {
        warnings.push('รายได้รายเดือนต้องไม่เป็นค่าลบ');
      }

      // ตรวจสอบประสบการณ์การทำงาน
      if (occ.workExperience && occ.workExperience < 0) {
        warnings.push('ประสบการณ์การทำงานต้องไม่เป็นค่าลบ');
      }

      // ตรวจสอบความสอดคล้องของข้อมูลรายได้
      if (body.income && occ.monthlyIncome && Math.abs(body.income - occ.monthlyIncome) > 1000) {
        warnings.push('รายได้ในข้อมูลทั่วไปและข้อมูลอาชีพไม่สอดคล้องกัน');
      }
    }

    // === Log สรุปผลการตรวจสอบ ===
    console.log('📊 Data validation summary:', {
      errors: errors.length,
      warnings: warnings.length,
      hasStep1Data: !!(body.selectedProducts || body.productName),
      hasStep2Data: !!(body.firstName || body.customerName),
      hasStep3Data: !!(body.paymentSchedule || body.customInstallmentCount),
      hasStep4Data: !!(body.contractTerms || body.contractNumber),
      hasOccupationData: !!(body.occupationData || body.occupationCategory),
      dataKeys: Object.keys(body).length
    });

    // === ส่งกลับผลลัพธ์ ===
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน',
        errors: errors,
        warnings: warnings,
        missingRequiredData: errors
      });
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Data validation warnings:', warnings);
      // เพิ่ม warnings ใน request เพื่อใช้ใน response
      req.dataWarnings = warnings;
    }

    // เพิ่มข้อมูลสถิติการตรวจสอบ
    req.validationSummary = {
      totalFields: Object.keys(body).length,
      warningCount: warnings.length,
      hasCompleteStepData: {
        step1: !!(body.selectedProducts || body.productName),
        step2: !!(body.firstName || body.customerName),
        step3: !!(body.paymentSchedule || body.customInstallmentCount),
        step4: !!(body.contractTerms || body.contractNumber)
      }
    };

    console.log('✅ Data validation passed');
    next();

  } catch (error) {
    console.error('❌ Error in data validation middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      error: error.message
    });
  }
};

module.exports = validateInstallmentData;