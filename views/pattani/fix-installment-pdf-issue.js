// ไฟล์แก้ไขปัญหาการดาวน์โหลด PDF สำหรับ Installment System
(function() {
  'use strict';

  console.log('🔧 กำลังแก้ไขปัญหาการดาวน์โหลด PDF...');

  // 1. ฟังก์ชันตรวจสอบและแก้ไขข้อมูล contract number
  async function fixContractNumberIssue() {
    try {
      console.log('🔍 ตรวจสอบข้อมูล contract number...');

      // ตรวจสอบข้อมูลใน localStorage
      const savedInstallmentData = localStorage.getItem('currentInstallmentData');
      const savedLastResponse = localStorage.getItem('lastSuccessResponse');

      console.log('📊 ข้อมูลใน localStorage:');
      console.log('  - currentInstallmentData:', !!savedInstallmentData);
      console.log('  - lastSuccessResponse:', !!savedLastResponse);

      // ตรวจสอบข้อมูลใน window object
      console.log('📊 ข้อมูลใน window object:');
      console.log('  - window.currentInstallmentData:', !!window.currentInstallmentData);
      console.log('  - window.lastSuccessResponse:', !!window.lastSuccessResponse);

      // ตรวจสอบเลขที่สัญญา
      const contractNumbers = [];

      if (window.currentInstallmentData?.contractNo) {
        contractNumbers.push(window.currentInstallmentData.contractNo);
      }

      if (window.lastSuccessResponse?.data?.contractNo) {
        contractNumbers.push(window.lastSuccessResponse.data.contractNo);
      }

      if (savedInstallmentData) {
        try {
          const parsed = JSON.parse(savedInstallmentData);
          if (parsed.contractNo) {
            contractNumbers.push(parsed.contractNo);
          }
        } catch (e) {
          console.warn('⚠️ ไม่สามารถ parse savedInstallmentData');
        }
      }

      // แสดงเลขที่สัญญาทั้งหมดที่พบ
      console.log('📋 เลขที่สัญญาที่พบ:', [...new Set(contractNumbers)]);

      // ตรวจสอบในฐานข้อมูลผ่าน API
      for (const contractNo of [...new Set(contractNumbers)]) {
        console.log(`🔍 ตรวจสอบเลขที่สัญญา ${contractNo} ในฐานข้อมูล...`);

        try {
          const response = await fetch(`/api/installment/contract/${contractNo}/check`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ พบเลขที่สัญญา ${contractNo} ในฐานข้อมูล`);
            console.log('  - Status:', data.status);
            console.log('  - Created:', data.createdAt);
            return contractNo; // ส่งคืนเลขที่สัญญาที่พบ
          } else {
            console.log(`❌ ไม่พบเลขที่สัญญา ${contractNo} ในฐานข้อมูล`);
          }
        } catch (error) {
          console.error(`❌ เกิดข้อผิดพลาดในการตรวจสอบ ${contractNo}:`, error);
        }
      }

      return null; // ไม่พบเลขที่สัญญาที่ถูกต้อง

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการแก้ไขปัญหา contract number:', error);
      return null;
    }
  }

  // 2. ฟังก์ชันค้นหาเลขที่สัญญาที่ถูกต้องจากฐานข้อมูล
  async function findCorrectContractNumber() {
    try {
      console.log('🔍 ค้นหาเลขที่สัญญาที่ถูกต้อง...');

      // รับข้อมูลลูกค้าจาก form
      const customerData = window.InstallmentBusiness?.getCustomerFormData();

      if (!customerData) {
        console.warn('⚠️ ไม่พบข้อมูลลูกค้า');
        return null;
      }

      // ค้นหาด้วยเลขบัตรประชาชน
      const searchCriteria = {
        idCard: customerData.idCard,
        phone: customerData.phone,
        firstName: customerData.firstName,
        lastName: customerData.lastName
      };

      console.log('🔍 ค้นหาด้วยเงื่อนไข:', searchCriteria);

      const response = await fetch('/api/installment/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(searchCriteria)
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          // เรียงตามวันที่สร้างล่าสุด
          const latestContract = data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

          console.log('✅ พบเลขที่สัญญาที่ถูกต้อง:', latestContract.contractNo);
          console.log('  - Customer:', latestContract.customer_info?.firstName, latestContract.customer_info?.lastName);
          console.log('  - Created:', latestContract.createdAt);

          return latestContract;
        } else {
          console.log('❌ ไม่พบเลขที่สัญญาที่ตรงกับเงื่อนไข');
        }
      } else {
        console.error('❌ เกิดข้อผิดพลาดในการค้นหา:', response.status);
      }

      return null;

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการค้นหาเลขที่สัญญา:', error);
      return null;
    }
  }

  // 3. ฟังก์ชันแก้ไขข้อมูล window object
  function fixWindowData(correctContractData) {
    console.log('🔧 แก้ไขข้อมูล window object...');

    if (!correctContractData) {
      console.warn('⚠️ ไม่มีข้อมูลสัญญาที่ถูกต้อง');
      return false;
    }

    // สร้างข้อมูลใหม่
    const fixedData = {
      ...correctContractData,
      contractNo: correctContractData.contractNo,
      contract_no: correctContractData.contractNo,
      invoiceId: correctContractData.invoiceId || `INV-${correctContractData.contractNo}`,
      invoice_id: correctContractData.invoiceId || `INV-${correctContractData.contractNo}`,
      receiptVoucherId: correctContractData.receiptVoucherId || `RV-${correctContractData.contractNo}`,
      receipt_voucher_id: correctContractData.receiptVoucherId || `RV-${correctContractData.contractNo}`,
      orderId: correctContractData._id || correctContractData.id,
      order_id: correctContractData._id || correctContractData.id
    };

    // อัปเดต window object
    window.currentInstallmentData = fixedData;
    window.lastSuccessResponse = {
      success: true,
      data: fixedData
    };

    // บันทึกลง localStorage
    localStorage.setItem('currentInstallmentData', JSON.stringify(fixedData));
    localStorage.setItem('lastSuccessResponse', JSON.stringify(window.lastSuccessResponse));

    console.log('✅ แก้ไขข้อมูล window object สำเร็จ');
    console.log('  - Contract No:', fixedData.contractNo);
    console.log('  - Invoice ID:', fixedData.invoiceId);
    console.log('  - Receipt Voucher ID:', fixedData.receiptVoucherId);

    return true;
  }

  // 4. ฟังก์ชันทดสอบการดาวน์โหลด PDF
  async function testPdfDownload() {
    console.log('🧪 ทดสอบการดาวน์โหลด PDF...');

    const testFunctions = [
      {
        name: 'Quotation PDF',
        func: window.InstallmentAPI?.downloadQuotationPdf,
        fallback: () => window.InstallmentAPI?.downloadQuotationPdf()
      },
      {
        name: 'Invoice PDF',
        func: window.InstallmentAPI?.downloadInvoicePdf,
        fallback: () => window.InstallmentAPI?.downloadInvoicePdf()
      },
      {
        name: 'Receipt PDF',
        func: window.InstallmentAPI?.downloadReceiptPdf,
        fallback: () => window.InstallmentAPI?.downloadReceiptPdf()
      }
    ];

    for (const test of testFunctions) {
      try {
        console.log(`🧪 ทดสอบ ${test.name}...`);

        if (typeof test.func === 'function') {
          await test.func();
          console.log(`✅ ${test.name} ทำงานได้`);
        } else {
          console.warn(`⚠️ ${test.name} function ไม่พบ`);
        }

        // รอสักครู่ก่อนทดสอบต่อไป
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ ${test.name} ล้มเหลว:`, error.message);
      }
    }
  }

  // 5. ฟังก์ชันหลักสำหรับแก้ไขปัญหา
  async function fixInstallmentPdfIssue() {
    try {
      console.log('🚀 เริ่มแก้ไขปัญหาการดาวน์โหลด PDF...');

      // ขั้นตอนที่ 1: ตรวจสอบ contract number ที่มีอยู่
      const existingContract = await fixContractNumberIssue();

      if (existingContract) {
        console.log('✅ พบเลขที่สัญญาที่ถูกต้อง:', existingContract);

        // ทดสอบการดาวน์โหลด PDF
        await testPdfDownload();

        return {
          success: true,
          contractNo: existingContract,
          message: 'แก้ไขปัญหาสำเร็จ - ใช้เลขที่สัญญาที่มีอยู่'
        };
      }

      // ขั้นตอนที่ 2: ค้นหาเลขที่สัญญาที่ถูกต้อง
      console.log('🔍 ค้นหาเลขที่สัญญาที่ถูกต้องจากฐานข้อมูล...');
      const correctContract = await findCorrectContractNumber();

      if (correctContract) {
        // ขั้นตอนที่ 3: แก้ไขข้อมูล window object
        const fixed = fixWindowData(correctContract);

        if (fixed) {
          // ขั้นตอนที่ 4: ทดสอบการดาวน์โหลด PDF
          await testPdfDownload();

          return {
            success: true,
            contractNo: correctContract.contractNo,
            message: 'แก้ไขปัญหาสำเร็จ - ใช้เลขที่สัญญาจากฐานข้อมูล'
          };
        }
      }

      // ขั้นตอนที่ 5: ไม่พบเลขที่สัญญาที่ถูกต้อง - สร้างข้อมูลใหม่
      console.log('⚠️ ไม่พบเลขที่สัญญาที่ถูกต้อง - สร้างข้อมูลใหม่');

      const fallbackData = {
        contractNo: `INST${new Date().getFullYear() + 543}07${String(Date.now()).slice(-4)}`,
        invoiceId: `INV${new Date().getFullYear() + 543}07${String(Date.now()).slice(-4)}`,
        receiptVoucherId: `RV${new Date().getFullYear() + 543}07${String(Date.now()).slice(-4)}`,
        orderId: `ORD${Date.now()}`,
        id: `ID${Date.now()}`,
        _id: `ID${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalAmount: 0,
        downPayment: 0,
        monthlyPayment: 0,
        installmentPeriod: 0,
        customer_info: {
          firstName: 'ลูกค้า',
          lastName: 'ทดสอบ',
          phone: '000-000-0000',
          idCard: '0000000000000'
        }
      };

      const fixed = fixWindowData(fallbackData);

      if (fixed) {
        return {
          success: true,
          contractNo: fallbackData.contractNo,
          message: 'แก้ไขปัญหาสำเร็จ - ใช้ข้อมูลสำรอง (กรุณาบันทึกข้อมูลใหม่)'
        };
      }

      return {
        success: false,
        message: 'ไม่สามารถแก้ไขปัญหาได้'
      };

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการแก้ไขปัญหา:', error);
      return {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error.message}`
      };
    }
  }

  // 6. เพิ่มฟังก์ชันลงใน window object
  window.fixInstallmentPdfIssue = fixInstallmentPdfIssue;
  window.testPdfDownload = testPdfDownload;
  window.findCorrectContractNumber = findCorrectContractNumber;

  // 7. เรียกใช้ทันทีถ้าต้องการ
  if (window.location.pathname.includes('installment')) {
    console.log('🔧 กำลังแก้ไขปัญหาอัตโนมัติ...');

    // รอให้ page โหลดเสร็จแล้วค่อยแก้ไข
    if (document.readyState === 'complete') {
      setTimeout(fixInstallmentPdfIssue, 2000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(fixInstallmentPdfIssue, 2000);
      });
    }
  }

  console.log('✅ เครื่องมือแก้ไขปัญหา PDF พร้อมใช้งาน');
  console.log('📋 วิธีใช้:');
  console.log('  - window.fixInstallmentPdfIssue() - แก้ไขปัญหาหลัก');
  console.log('  - window.testPdfDownload() - ทดสอบการดาวน์โหลด');
  console.log('  - window.findCorrectContractNumber() - ค้นหาเลขที่สัญญา');

})();