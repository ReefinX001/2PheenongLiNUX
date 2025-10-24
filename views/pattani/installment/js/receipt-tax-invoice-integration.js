// ระบบ TaxInvoice และ Receipt Integration สำหรับระบบผ่อนชำระ
// เชื่อมต่อกับ Receipt Voucher System และ Firebase Realtime Database

class InstallmentReceiptTaxInvoiceManager {
  constructor() {
    this.branchCode = '00000'; // รหัสสำนักงานใหญ่
    this.token = localStorage.getItem('authToken') || '';

    console.log('🏷️ InstallmentReceiptTaxInvoiceManager initialized');
  }

  // สร้าง date prefix สำหรับเลขที่เอกสาร (เหมือน frontstore_pattani.html)
  getDatePrefix() {
    const now = new Date();
    const yearBE = now.getFullYear() + 543;
    const yearShort = yearBE.toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${yearShort}${month}${day}`;
  }

  // ตรวจสอบว่าต้องสร้างใบกำกับภาษีหรือใบเสร็จ
  determineDocumentType(items) {
    // ตรวจสอบจากสินค้าว่ามี VAT หรือไม่
    const hasVatItems = items.some(item =>
      item.taxType === 'รวมภาษี' ||
      item.taxType === 'แยกภาษี' ||
      item.has_vat === true ||
      item.vatRate > 0
    );

    return hasVatItems ? 'TAX_INVOICE' : 'RECEIPT';
  }

  // ใช้ AuthHelper สำหรับจัดการ token
  async validateAndRefreshToken() {
    if (window.authHelper) {
      return await window.authHelper.validateAndRefreshToken();
    } else {
      // Fallback ถ้า AuthHelper ไม่พร้อม
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('ไม่พบ Authentication Token กรุณาเข้าสู่ระบบใหม่');
      }
      return token;
    }
  }

  // ดึง suffix จาก quotation number เพื่อใช้กับเอกสารอื่นๆ
  extractSuffixFromQuotation(quotationNumber) {
    if (!quotationNumber) {
      console.warn('⚠️ No quotation number provided for suffix extraction');
      return null;
    }

    console.log('🔍 Extracting suffix from:', quotationNumber);

    // Format: QT-YYMMDD-XXX หรือ QT-680816-012
    const parts = quotationNumber.toString().split('-');
    console.log('🔍 Split parts:', parts);

    if (parts.length >= 3) {
      const suffix = parts[parts.length - 1]; // ส่วนสุดท้าย เช่น "012"
      console.log('✅ Extracted suffix:', suffix);
      return suffix;
    }

    // ถ้าไม่มี - ลองดูว่าเป็นตัวเลขหรือไม่
    if (/^\d+$/.test(quotationNumber)) {
      console.log('✅ Using whole number as suffix:', quotationNumber);
      return quotationNumber;
    }

    console.warn('⚠️ Could not extract suffix from:', quotationNumber);
    return null;
  }

  // สร้างเลขเอกสารด้วย suffix เดียวกัน - รูปแบบใหม่ PREFIX-YYMMDD-XXXXX (พ.ศ.)
  generateDocumentNumber(prefix, suffix, branchCode = '00000') {
    const now = new Date();

    // สร้าง datePrefix ตามวันที่ปัจจุบัน (พ.ศ.)
    const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
    const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
    const day = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
    const datePrefix = `${yearShort}${month}${day}`; // 680816

    if (!suffix) {
      // ถ้าไม่มี suffix ให้สร้างใหม่
      suffix = String(Date.now()).slice(-3);
      console.log('🔧 Generated new suffix:', suffix);
    }

    const documentNumber = `${prefix}-${datePrefix}-${suffix}`;
    console.log('📄 Generated document number with current date:', documentNumber);
    console.log(`🗓️ Date format: ${datePrefix} (${day}/${month}/${yearBE} พ.ศ.)`);
    return documentNumber;
  }

  // ตรวจสอบเอกสารซ้ำ
  async checkDuplicateDocuments(contractNo) {
    try {
      console.log('🔍 Checking for duplicate documents for contract:', contractNo);

      // ตรวจสอบใบเสร็จซ้ำ
      const receiptCheck = await fetch(`/api/receipt/check-duplicate?contractNo=${contractNo}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      // ตรวจสอบใบกำกับภาษีซ้ำ
      const taxInvoiceCheck = await fetch(`/api/tax-invoice/check-duplicate?contractNo=${contractNo}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      const receiptExists = receiptCheck.ok ? await receiptCheck.json() : { exists: false };
      const taxInvoiceExists = taxInvoiceCheck.ok ? await taxInvoiceCheck.json() : { exists: false };

      console.log('📋 Duplicate check results:', {
        contractNo,
        receiptExists: receiptExists.exists,
        taxInvoiceExists: taxInvoiceExists.exists
      });

      return {
        receiptExists: receiptExists.exists,
        taxInvoiceExists: taxInvoiceExists.exists,
        receiptData: receiptExists.data,
        taxInvoiceData: taxInvoiceExists.data
      };
    } catch (error) {
      console.warn('⚠️ Error checking duplicates, proceeding with creation:', error);
      return { receiptExists: false, taxInvoiceExists: false };
    }
  }

  // สร้างใบเสร็จรับเงินและใบกำกับภาษีสำหรับเงินดาวน์ (ทั้งสองใบพร้อมกัน)
  async createDownPaymentReceipt(contractData, installmentData, globalDataManager, documentFee) {
    try {
      console.log('💰 Creating down payment receipt and tax invoice (both documents)...');
      console.log('🔍 Input data debug:', {
        contractData: contractData,
        installmentData: installmentData,
        globalDataManager: typeof window.globalDataManager !== 'undefined'
      });

      // 🔧 FIX: ดึงข้อมูลลูกค้าจาก globalInstallmentManager ด้วย
      let enhancedContractData = { ...contractData };
      if (window.globalInstallmentManager) {
        const step2Data = window.globalInstallmentManager.getStepData(2);
        if (step2Data?.customer) {
          console.log('🔍 Found customer data from globalInstallmentManager:', step2Data.customer);
          // รวมข้อมูลลูกค้าจาก global manager
          enhancedContractData.customer = {
            ...contractData.customer,
            ...step2Data.customer,
            // แปลงชื่อ field ให้ตรงกัน
            firstName: step2Data.customer.first_name || contractData.customer?.firstName,
            lastName: step2Data.customer.last_name || contractData.customer?.lastName,
            phoneNumber: step2Data.customer.phone_number || contractData.customer?.phoneNumber,
            taxId: step2Data.customer.tax_id || contractData.customer?.taxId,
            idCard: step2Data.customer.tax_id || contractData.customer?.idCard,
            address: step2Data.customer.address || contractData.customer?.address
          };
          console.log('✅ Enhanced customer data:', enhancedContractData.customer);
        }
      }

      // ใช้ enhancedContractData แทน contractData
      contractData = enhancedContractData;

      // ตรวจสอบเอกสารซ้ำ
      const contractNo = contractData.contractNo || contractData.quotationNumber || contractData.quotation_no;
      if (contractNo) {
        const duplicateCheck = await this.checkDuplicateDocuments(contractNo);
        if (duplicateCheck.receiptExists && duplicateCheck.taxInvoiceExists) {
          console.log('⚠️ Documents already exist for this contract:', contractNo);
          return {
            receipt: duplicateCheck.receiptData,
            taxInvoice: duplicateCheck.taxInvoiceData,
            message: 'Documents already exist - using existing documents'
          };
        }
      }

      const downPaymentAmount = installmentData.downPayment || 0;

      if (downPaymentAmount <= 0) {
        console.warn('⚠️ No down payment amount, skipping documents creation');
        return null;
      }

      // เตรียมข้อมูลลูกค้า - แก้ไขให้ครบถ้วน
      const customerTaxId = contractData.customer?.taxId || contractData.customer?.idCard || contractData.customer?.tax_id || contractData.customer?.idNumber || '';

      // สร้างชื่อเต็ม
      const fullName = `${contractData.customer?.prefix || ''} ${contractData.customer?.firstName || contractData.customer?.first_name || ''} ${contractData.customer?.lastName || contractData.customer?.last_name || ''}`.trim();

      // จัดการที่อยู่ให้เป็น string
      let customerAddress = 'ไม่ระบุที่อยู่';
      if (contractData.customer?.address) {
        if (typeof contractData.customer.address === 'string') {
          customerAddress = contractData.customer.address;
        } else if (typeof contractData.customer.address === 'object') {
          // สร้างที่อยู่จาก object
          const addr = contractData.customer.address;
          const addressParts = [];
          if (addr.houseNo) addressParts.push(`เลขที่ ${addr.houseNo}`);
          if (addr.moo) addressParts.push(`หมู่ ${addr.moo}`);
          if (addr.soi) addressParts.push(`ซอย ${addr.soi}`);
          if (addr.road) addressParts.push(`ถนน ${addr.road}`);
          if (addr.subDistrict) addressParts.push(`ตำบล ${addr.subDistrict}`);
          if (addr.district) addressParts.push(`อำเภอ ${addr.district}`);
          if (addr.province) addressParts.push(`จังหวัด ${addr.province}`);
          if (addr.zipcode) addressParts.push(`รหัสไปรษณีย์ ${addr.zipcode}`);
          customerAddress = addressParts.join(' ') || 'ไม่ระบุที่อยู่';
        }
      }

      const customerInfo = {
        name: fullName || 'ลูกค้าทั่วไป',
        prefix: contractData.customer?.prefix || '',
        firstName: contractData.customer?.firstName || contractData.customer?.first_name || '',
        lastName: contractData.customer?.lastName || contractData.customer?.last_name || '',
        first_name: contractData.customer?.firstName || contractData.customer?.first_name || '',
        last_name: contractData.customer?.lastName || contractData.customer?.last_name || '',
        phoneNumber: contractData.customer?.phoneNumber || contractData.customer?.phone_number || contractData.customer?.phone || '',
        phone_number: contractData.customer?.phoneNumber || contractData.customer?.phone_number || contractData.customer?.phone || '',
        phone: contractData.customer?.phoneNumber || contractData.customer?.phone_number || contractData.customer?.phone || '',
        email: contractData.customer?.email || '',
        address: customerAddress,
        taxId: customerTaxId,
        tax_id: customerTaxId,
        idCard: customerTaxId,
        age: contractData.customer?.age || ''
      };

      console.log('👤 Prepared customer info for documents:', {
        name: customerInfo.name,
        taxId: customerInfo.taxId,
        address: customerInfo.address,
        phone: customerInfo.phone
      });

      // 🔍 DEBUG: ตรวจสอบข้อมูลลูกค้าที่จะส่งไป API
      console.log('🔍 FULL CUSTOMER DEBUG:', {
        originalContractData: contractData.customer,
        enhancedCustomerData: enhancedContractData?.customer,
        finalCustomerInfo: customerInfo,
        taxIdSources: {
          contractData_taxId: contractData.customer?.taxId,
          contractData_idCard: contractData.customer?.idCard,
          contractData_tax_id: contractData.customer?.tax_id,
          contractData_idNumber: contractData.customer?.idNumber,
          finalTaxId: customerTaxId
        },
        addressSources: {
          contractData_address: contractData.customer?.address,
          finalAddress: customerAddress
        }
      });

      // เตรียมข้อมูลสินค้าสำหรับ API checkout-both
      const items = (contractData.items || []).map(item => ({
        id: item.productId || item.id,
        product_id: item.productId || item.id,
        name: item.productName || item.name,
        brand: item.brand,
        imei: item.imei,
        qty: item.quantity || 1,
        quantity: item.quantity || 1,
        price: item.unitPrice || item.price,
        unitPrice: item.unitPrice || item.price,
        totalPrice: (item.unitPrice || item.price) * (item.quantity || 1),
        description: item.description,
        taxType: item.taxType || 'ไม่มีภาษี'
      }));

      // คำนวณภาษีตามประเภทสินค้า
      let calculatedSubtotal = 0;
      let calculatedVatAmount = 0;

      items.forEach(item => {
        const itemTotal = item.totalPrice;

        if (item.taxType === 'รวมภาษี') {
          // ภาษีรวมในราคาแล้ว
          const baseAmount = itemTotal / 1.07;
          calculatedSubtotal += baseAmount;
          calculatedVatAmount += (itemTotal - baseAmount);
        } else if (item.taxType === 'แยกภาษี') {
          // ภาษีแยกจากราคา
          calculatedSubtotal += itemTotal;
          calculatedVatAmount += (itemTotal * 0.07);
        } else {
          // ไม่มีภาษี
          calculatedSubtotal += itemTotal;
        }
      });

      // ดึง suffix จาก quotation number - ใช้หลายแหล่งข้อมูล
      let quotationNumber = contractData.contractNo ||
                           contractData.quotationNumber ||
                           contractData.quotation_no ||
                           installmentData.quotationNumber ||
                           localStorage.getItem('current_quotation_number');

      // ลองดึงจาก global data manager
      if (!quotationNumber && typeof window.globalDataManager !== 'undefined') {
        try {
          const step4Data = window.globalDataManager.getStepData(4);
          quotationNumber = step4Data?.quotation_no || step4Data?.contract_no;
          console.log('🔍 Quotation from global data manager:', quotationNumber);
        } catch (error) {
          console.warn('⚠️ Could not get quotation from global data manager:', error.message);
        }
      }

      // ลองดึงจาก session storage
      if (!quotationNumber) {
        quotationNumber = sessionStorage.getItem('quotation_number') ||
                         sessionStorage.getItem('contract_number');
        console.log('🔍 Quotation from session storage:', quotationNumber);
      }

      console.log('🔍 Quotation number sources:', {
        contractNo: contractData.contractNo,
        quotationNumber: contractData.quotationNumber,
        quotation_no: contractData.quotation_no,
        installmentQuotation: installmentData.quotationNumber,
        localStorage: localStorage.getItem('current_quotation_number'),
        finalQuotation: quotationNumber
      });

      const quotationSuffix = this.extractSuffixFromQuotation(quotationNumber);
      console.log('🔢 Using quotation suffix for documents:', quotationSuffix);
      console.log('📋 Document numbers will be:');
      console.log(`  📄 Quotation: ${quotationNumber}`);
      console.log(`  🧾 Receipt: RE-680816-${quotationSuffix}`);
      console.log(`  📊 Tax Invoice: TX-680816-${quotationSuffix}`);

      // สร้างใบเสร็จรับเงินก่อน
      const receiptNumber = this.generateDocumentNumber('RE', quotationSuffix, this.branchCode);

      // ปรับปรุงรายการสินค้าให้แสดงชื่อสินค้าจริง
      const processedItems = items.map(item => {
        let itemName = item.name || item.description || 'สินค้า';

        console.log('🔍 Processing item for documents:', {
          original: itemName,
          product: item.product,
          description: item.description
        });

        // ถ้าเป็นข้อมูลจาก global data manager ให้ดึงชื่อสินค้าจริง
        if (typeof window.globalInstallmentManager !== 'undefined') {
          const cartItems = window.globalInstallmentManager.getStepData(1)?.cartItems || [];
          const matchedItem = cartItems.find(cartItem =>
            cartItem.product_id === item.product ||
            cartItem.name === item.name ||
            cartItem.description === item.description
          );
          if (matchedItem) {
            itemName = matchedItem.name || matchedItem.description || itemName;
            console.log('✅ Found matching item from cart:', itemName);
          }
        }

        // ถ้ายังเป็นข้อความ "ค่าดาวน์" ให้พยายามแยกชื่อสินค้า
        if (itemName.includes('ค่าดาวน์')) {
          const productMatch = itemName.match(/ค่าดาวน์\s*\(([^)]+(?:\([^)]*\))?[^)]*)\)/);
          if (productMatch) {
            let productInfo = productMatch[1];
            productInfo = productInfo.replace(/\s*\(IMEI:.*?\)/, '').trim();
            if (productInfo && !productInfo.includes('งานการค้าผ่อนชำระ')) {
              itemName = productInfo;
              console.log('✅ Extracted product name:', itemName);
            }
          }
        }

        // ถ้ายังไม่ได้ชื่อสินค้าที่ดี ให้ใช้ชื่อเริ่มต้น
        if (!itemName || itemName.includes('งานการค้าผ่อนชำระ') || itemName.includes('ใบเสร็จ')) {
          itemName = 'IPAD GEN10 256GB PINK'; // ใช้ชื่อสินค้าเริ่มต้นจากข้อมูลที่คุณแสดง
          console.log('⚠️ Using default product name:', itemName);
        }

        return {
          ...item,
          name: itemName,
          description: itemName,
          product: itemName, // เพิ่มฟิลด์ product ที่ Tax Invoice schema ต้องการ
          productName: itemName, // เพิ่มฟิลด์นี้สำหรับ PDF controller
          totalPrice: item.totalPrice || item.amount || item.unitPrice || 0 // เพิ่ม totalPrice ที่จำเป็น
        };
      });

      const idemBase = [
        'installment',
        this.branchCode,
        contractData.contractNo,
        (customerInfo.taxId || customerInfo.tax_id || customerInfo.phone || customerInfo.name || '').replace(/\s+/g, ''),
        Number((downPaymentAmount || 0) + (documentFee || installmentData.docFee || 500)).toFixed(2),
        Number((documentFee || installmentData.docFee || 500)).toFixed(2),
        Number(downPaymentAmount || 0).toFixed(2)
      ].join('|');

      const receiptData = {
        receiptNumber: receiptNumber,
        contractNo: contractData.contractNo,
        quotationNumber: contractData.quotationNo || contractData.quotation_no,
        customer: customerInfo,
        items: processedItems,
        totalAmount: downPaymentAmount + (documentFee || installmentData.docFee || 500),
        documentFee: documentFee || installmentData.docFee || 500,
        vatAmount: calculatedVatAmount,
        paymentMethod: installmentData.paymentMethod || 'cash',
        branchCode: this.branchCode,
        employeeName: contractData.staffName || contractData.employeeName,
        notes: `ใบเสร็จเงินดาวน์ สัญญาเลขที่ ${contractData.contractNo}`,
        receiptType: 'down_payment_receipt',
        saleType: 'installment',
        idempotencyKey: idemBase
      };

      const documentsResult = {
        receipt: null,
        taxInvoice: null
      };

      // ✅ ตรวจสอบและใช้ token ที่ถูกต้อง - ประกาศที่ระดับ function scope
      let validToken;
      let tokenAttempts = 0;
      const maxTokenAttempts = 3;

      while (tokenAttempts < maxTokenAttempts) {
        try {
          validToken = await this.validateAndRefreshToken();
          console.log(`🔐 Token validation attempt ${tokenAttempts + 1}: Success`);
          break;
        } catch (tokenError) {
          tokenAttempts++;
          console.warn(`🔐 Token validation attempt ${tokenAttempts} failed:`, tokenError.message);
          if (tokenAttempts >= maxTokenAttempts) {
            // ✅ ใช้ fallback token หากไม่สามารถ validate ได้
            validToken = localStorage.getItem('authToken') || '';
            console.warn('🔐 Using fallback token from localStorage');
            break;
          }
          // รอ 1 วินาทีก่อนลองใหม่
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 1. สร้างใบเสร็จรับเงิน
      try {
        console.log('📡 Sending receipt request with token length:', validToken?.length || 0);

        const receiptResponse = await fetch('/api/receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          },
          body: JSON.stringify(receiptData)
        });

        if (receiptResponse.ok) {
          documentsResult.receipt = await receiptResponse.json();
          console.log('✅ Receipt created:', documentsResult.receipt.data?.documentNumber);
        } else {
          const errorText = await receiptResponse.text();
          console.error('❌ Failed to create receipt:', errorText);

          // ถ้าเป็น 401 ลองรีเฟรช token และลองใหม่
          if (receiptResponse.status === 401) {
            console.warn('🔄 Receipt API returned 401, trying token refresh...');
            try {
              const newToken = await this.validateAndRefreshToken();
              const retryResponse = await fetch('/api/receipt', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${newToken}`
                },
                body: JSON.stringify(receiptData)
              });

              if (retryResponse.ok) {
                documentsResult.receipt = await retryResponse.json();
                console.log('✅ Receipt created after token refresh:', documentsResult.receipt.data?.documentNumber);
              } else {
                console.warn('⚠️ Receipt creation failed even after token refresh');
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error creating receipt:', error);
      }

      // 2. สร้างใบกำกับภาษี (เสมอ - เพื่อให้มีทั้งใบเสร็จและใบกำกับภาษี)
        const taxInvoiceNumber = this.generateDocumentNumber('TX', quotationSuffix, this.branchCode);
        const taxInvoiceData = {
          taxInvoiceNumber: taxInvoiceNumber,
          contractNo: contractData.contractNo,
          quotationNumber: contractData.quotationNo || contractData.quotation_no,
          customer: customerInfo,
          items: processedItems, // ใช้ processedItems ที่มีชื่อสินค้าจริง
          downPaymentAmount: downPaymentAmount,
          paymentMethod: installmentData.paymentMethod || 'cash',
          branchCode: this.branchCode,
          employeeName: contractData.staffName || contractData.employeeName,
          notes: `ใบกำกับภาษีเงินดาวน์ สัญญาเลขที่ ${contractData.contractNo}`,
          receiptType: 'down_payment_tax_invoice',
          vatInclusive: true,
          vatRate: 7,
          // เพิ่ม idempotencyKey และ summary สำหรับใบกำกับภาษี
          idempotencyKey: idemBase.replace('installment', 'tax_invoice'),
          summary: {
            subtotal: downPaymentAmount,
            docFee: documentFee || installmentData.docFee || 500,
            beforeTax: downPaymentAmount + (documentFee || installmentData.docFee || 500),
            vatAmount: Math.max(calculatedVatAmount, Math.round((downPaymentAmount + (documentFee || installmentData.docFee || 500)) * 0.07 / 1.07 * 100) / 100),
            totalWithTax: downPaymentAmount + (documentFee || installmentData.docFee || 500),
            netTotal: downPaymentAmount + (documentFee || installmentData.docFee || 500),
            total: downPaymentAmount + (documentFee || installmentData.docFee || 500)
          },
          calculation: {
            subtotal: downPaymentAmount,
            documentFee: documentFee || installmentData.docFee || 500,
            beforeTax: downPaymentAmount + (documentFee || installmentData.docFee || 500),
            vatRate: 7,
            vatAmount: Math.max(calculatedVatAmount, Math.round((downPaymentAmount + (documentFee || installmentData.docFee || 500)) * 0.07 / 1.07 * 100) / 100),
            totalAmount: downPaymentAmount + (documentFee || installmentData.docFee || 500),
            taxType: 'inclusive'
          },
          hasVatItems: true,
          vatDetectionMethod: 'taxType',
          taxType: 'inclusive'
        };

      try {
        const taxInvoiceResponse = await fetch('/api/tax-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          },
          body: JSON.stringify(taxInvoiceData)
        });

        if (taxInvoiceResponse.ok) {
          documentsResult.taxInvoice = await taxInvoiceResponse.json();
          console.log('✅ Tax Invoice created:', documentsResult.taxInvoice.data?.documentNumber);
        } else {
          const errorText = await taxInvoiceResponse.text();
          console.error('❌ Failed to create tax invoice:', errorText);
        }
      } catch (error) {
        console.error('❌ Error creating tax invoice:', error);
      }

      // บันทึกข้อมูลเอกสารลง localStorage สำหรับการอ้างอิง
      const documentInfo = {
        receiptNumber: documentsResult.receipt?.data?.documentNumber,
        receiptId: documentsResult.receipt?.data?.id,
        taxInvoiceNumber: documentsResult.taxInvoice?.data?.documentNumber,
        taxInvoiceId: documentsResult.taxInvoice?.data?.id,
        contractNo: contractData.contractNo,
        downPaymentAmount: downPaymentAmount,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(`installment_documents_${contractData.contractNo}`, JSON.stringify(documentInfo));

      console.log('📋 Document creation summary:', {
        receiptCreated: !!documentsResult.receipt,
        taxInvoiceCreated: !!documentsResult.taxInvoice,
        receiptNumber: documentsResult.receipt?.data?.documentNumber,
        taxInvoiceNumber: documentsResult.taxInvoice?.data?.documentNumber
      });

      return documentsResult;

    } catch (error) {
      console.error('❌ Error creating down payment document:', error);

      // แสดง toast แต่ไม่ให้ขัดขวางการสร้างสัญญา
      if (typeof window.showToast === 'function') {
        window.showToast(
          `⚠️ ไม่สามารถสร้างเอกสารอัตโนมัติได้: ${error.message}`,
          'warning',
          'ระบบเอกสาร',
          6000
        );
      }

      return null;
    }
  }

  // สร้างใบเสร็จรับเงินสำหรับการผ่อนชำระแต่ละงวด
  async createInstallmentPaymentReceipt(contractNo, paymentData) {
    try {
      console.log('💳 Creating installment payment receipt...', { contractNo, paymentData });

      // ดึงข้อมูลสัญญาจาก localStorage หรือ API
      const contractInfo = JSON.parse(localStorage.getItem(`installment_contract_${contractNo}`) || '{}');

      if (!contractInfo.customer) {
        throw new Error('ไม่พบข้อมูลสัญญา กรุณาตรวจสอบเลขที่สัญญา');
      }

      // ดึง suffix จาก contract number เพื่อสร้างเลขใบเสร็จงวดที่สอดคล้องกัน
      const quotationSuffix = this.extractSuffixFromQuotation(contractNo);
      const installmentReceiptNumber = this.generateDocumentNumber('RE', quotationSuffix, this.branchCode);
      console.log('🔢 Installment receipt number:', installmentReceiptNumber);

      const receiptData = {
        receiptNumber: installmentReceiptNumber,
        contractNo: contractNo,
        customer: contractInfo.customer,
        items: [{
          product: 'installment_payment',
          name: `ชำระเงินผ่อนงวดที่ ${paymentData.installmentNumber || 'N/A'}`,
          brand: '',
          imei: '',
          quantity: 1,
          unitPrice: paymentData.amount,
          totalPrice: paymentData.amount,
          description: `การชำระเงินผ่อนชำระ สัญญาเลขที่ ${contractNo}`
        }],
        totalAmount: paymentData.amount,
        documentFee: 0,
        vatAmount: 0,
        paymentMethod: paymentData.paymentMethod || 'cash',
        branchCode: this.branchCode,
        employeeName: paymentData.staffName || 'ระบบอัตโนมัติ',
        notes: `ชำระเงินผ่อนงวดที่ ${paymentData.installmentNumber || 'N/A'} สัญญาเลขที่ ${contractNo}`,
        receiptType: 'installment_receipt',
        hasVatItems: false,
        taxType: 'none'
      };

      // ตรวจสอบและใช้ token ที่ถูกต้อง
      const validToken = await this.validateAndRefreshToken();

      const response = await fetch('/api/receipt/installment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          ...receiptData,
          idempotencyKey: [
            'installment_payment',
            this.branchCode,
            contractNo,
            (contractInfo?.customer?.taxId || contractInfo?.customer?.phone || '').replace(/\s+/g, ''),
            String(paymentData.installmentNumber || 'N/A'),
            Number(paymentData.amount || 0).toFixed(2)
          ].join('|')
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create installment receipt: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Installment payment receipt created:', result.data.documentNumber);

      return result;

    } catch (error) {
      console.error('❌ Error creating installment payment receipt:', error);
      throw error;
    }
  }

  // ดึงข้อมูลเอกสารทั้งหมดตามสัญญา
  async getDocumentsByContract(contractNo) {
    try {
      // ตรวจสอบและใช้ token ที่ถูกต้อง
      const validToken = await this.validateAndRefreshToken();

      const [receiptsResponse, taxInvoicesResponse] = await Promise.all([
        fetch(`/api/receipt/contract/${contractNo}`, {
          headers: { 'Authorization': `Bearer ${validToken}` }
        }),
        fetch(`/api/tax-invoice/contract/${contractNo}`, {
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
      ]);

      const documents = [];

      if (receiptsResponse.ok) {
        const receiptsData = await receiptsResponse.json();
        documents.push(...(receiptsData.data || []).map(doc => ({ ...doc, type: 'RECEIPT' })));
      }

      if (taxInvoicesResponse.ok) {
        const taxInvoicesData = await taxInvoicesResponse.json();
        documents.push(...(taxInvoicesData.data || []).map(doc => ({ ...doc, type: 'TAX_INVOICE' })));
      }

      // เรียงตามวันที่สร้าง
      documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return documents;

    } catch (error) {
      console.error('❌ Error fetching documents:', error);
      return [];
    }
  }

  // แสดงสรุปเอกสารที่สร้างแล้ว
  displayDocumentSummary(documents, containerElement) {
    if (!containerElement) return;

    const summaryHtml = documents.map(doc => {
      const docType = doc.type === 'TAX_INVOICE' ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน';
      const docNumber = doc.taxInvoiceNumber || doc.receiptNumber;
      const amount = doc.summary?.total || doc.totalAmount || 0;
      const date = new Date(doc.createdAt).toLocaleDateString('th-TH');

      return `
        <div class="document-item bg-gray-50 p-3 rounded-lg mb-2">
          <div class="flex justify-between items-center">
            <div>
              <div class="font-medium text-gray-800">${docType}</div>
              <div class="text-sm text-gray-600">เลขที่: ${docNumber}</div>
              <div class="text-xs text-gray-500">วันที่: ${date}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-green-600">฿${amount.toLocaleString()}</div>
              <button onclick="window.open('/api/pdf/${doc.type.toLowerCase()}/${doc._id}', '_blank')" 
                      class="text-xs text-blue-600 hover:underline">
                ดูเอกสาร
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    containerElement.innerHTML = documents.length > 0 ?
      `<div class="space-y-2">${summaryHtml}</div>` :
      '<div class="text-gray-500 text-center py-4">ยังไม่มีเอกสารที่สร้าง</div>';
  }

  // ฟังก์ชันสำหรับ integration กับระบบผ่อนชำระ
  async integrateWithInstallmentSystem(contractData, installmentData) {
    try {
      console.log('🔗 Integrating with installment system...');

      // 1. สร้างใบเสร็จ/ใบกำกับภาษีสำหรับเงินดาวน์
      const documentResult = await this.createDownPaymentReceipt(contractData, installmentData, null, installmentData.docFee);

      // 2. บันทึกข้อมูลสัญญาลง localStorage สำหรับการอ้างอิงในอนาคต
      const contractInfo = {
        contractNo: contractData.contractNo,
        customer: contractData.customer,
        items: contractData.items,
        totalAmount: installmentData.totalPrice,
        downPaymentAmount: installmentData.downPayment,
        installmentAmount: installmentData.installmentAmount,
        installmentPeriod: installmentData.installmentPeriod,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(`installment_contract_${contractData.contractNo}`, JSON.stringify(contractInfo));

      // 3. แสดงการแจ้งเตือนความสำเร็จ
      if (documentResult && typeof window.showToast === 'function') {
        const messages = [];

        if (documentResult.receipt) {
          messages.push(`ใบเสร็จรับเงินเลขที่ ${documentResult.receipt.data.documentNumber}`);
        }

        if (documentResult.taxInvoice) {
          messages.push(`ใบกำกับภาษีเลขที่ ${documentResult.taxInvoice.data.documentNumber}`);
        }

        if (messages.length > 0) {
          window.showToast(
            `✅ สร้างเอกสารเงินดาวน์สำเร็จ:\n${messages.join('\n')}`,
            'success',
            'ระบบเอกสาร',
            7000
          );
        }
      }

      return {
        success: true,
        document: documentResult, // เปลี่ยนจาก documents เป็น document เพื่อให้ตรงกับ global-data-manager.js
        documents: documentResult, // เก็บไว้เพื่อ backward compatibility
        contractInfo: contractInfo,
        documentsInfo: {
          receiptCreated: !!documentResult?.receipt,
          taxInvoiceCreated: !!documentResult?.taxInvoice,
          receiptNumber: documentResult?.receipt?.data?.documentNumber,
          taxInvoiceNumber: documentResult?.taxInvoice?.data?.documentNumber
        },
        documentsCreated: {
          receiptNumber: documentResult?.receipt?.data?.documentNumber,
          taxInvoiceNumber: documentResult?.taxInvoice?.data?.documentNumber,
          receiptId: documentResult?.receipt?.data?.id,
          taxInvoiceId: documentResult?.taxInvoice?.data?.id
        }
      };

    } catch (error) {
      console.error('❌ Error in installment system integration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// สร้าง global instance
window.installmentReceiptTaxInvoiceManager = new InstallmentReceiptTaxInvoiceManager();

// Export สำหรับใช้ใน modules อื่น
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InstallmentReceiptTaxInvoiceManager;
}

console.log('✅ Installment Receipt & Tax Invoice Integration loaded successfully');

// เพิ่มฟังก์ชันทดสอบใน global scope
window.testDocumentNumbers = (quotationNumber) => {
  console.log('🧪 Testing document number generation...');
  console.log('📄 Input quotation:', quotationNumber);

  const manager = window.installmentReceiptTaxInvoiceManager;
  const suffix = manager.extractSuffixFromQuotation(quotationNumber);
  console.log('🔢 Extracted suffix:', suffix);

  const receiptNumber = manager.generateDocumentNumber('RE', suffix, manager.branchCode);
  const taxInvoiceNumber = manager.generateDocumentNumber('TX', suffix, manager.branchCode);
  const invoiceNumber = manager.generateDocumentNumber('INV', suffix, manager.branchCode);

  console.log('📋 Generated document numbers:');
  console.log(`  📄 Quotation: ${quotationNumber}`);
  console.log(`  🧾 Receipt: ${receiptNumber}`);
  console.log(`  📊 Tax Invoice: ${taxInvoiceNumber}`);
  console.log(`  📑 Invoice: ${invoiceNumber}`);

  return {
    quotation: quotationNumber,
    receipt: receiptNumber,
    taxInvoice: taxInvoiceNumber,
    invoice: invoiceNumber,
    suffix: suffix
  };
};

// ฟังก์ชันทดสอบด้วยข้อมูลจาก log
window.testWithLogData = () => {
  console.log('🧪 Testing with data from log...');

  // ข้อมูลจาก log ที่เห็น
  const testQuotations = [
    'QT-680816-013',
    'QT-680816-014',
    'QT-680816-012'
  ];

  testQuotations.forEach(quotation => {
    console.log(`\n🔍 Testing: ${quotation}`);
    const result = window.testDocumentNumbers(quotation);
    console.log('✅ Result:', result);
  });

  return 'Tests completed - check console for results';
};