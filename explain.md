common-utils.js:350 📦 Installment Common Utils loaded - version 1.0.0
(index):64 cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation
(anonymous) @ (index):64
(anonymous) @ (index):64
printer-service.js:33 🔧 PrinterService instance created (manual initialization required)
printer-service.js:521 🖨️ PrinterService module loaded
step4:1412 🖨️ PrinterService loaded for branch: 00000
global-data-manager.js:2963 📋 Global Installment Data Manager loaded with flexible navigation [v1.9.2 - PDF Fixes: Invoice Number Format + Payment Method + Address + VAT Display]
global-data-manager.js:2964 ✅ setStep method available: function
global-data-manager.js:2965 💡 Debug functions available:
global-data-manager.js:2966   - debugGlobalDataManager() - Show all data
global-data-manager.js:2967   - debugStockIssues() - Analyze stock problems
global-data-manager.js:2968   - validateCurrentStock() - Check stock availability
auth-helper.js:271 🔐 AuthHelper initialized
receipt-tax-invoice-integration.js:9 🏷️ InstallmentReceiptTaxInvoiceManager initialized
receipt-tax-invoice-integration.js:846 ✅ Installment Receipt & Tax Invoice Integration loaded successfully
step4-integration.js:6124 📋 Step 4 Integration loaded
step4:5157 🕐 Step 4 loaded at: 2025-09-18T01:43:53.539Z
printer-service.js:46 🔧 Initializing PrinterService with Real-time Monitoring...
printer-service.js:80 📍 Detected branch: 00000
printer-service.js:97 🔍 Loading branch data for: 00000
global-data-manager.js:160 📋 Initializing Global Installment Data Manager...
global-data-manager.js:202 🏢 Global Data Manager - Branch Info initialized: {code: '00000', name: 'สำนักงานใหญ่ — 148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000', source: 'localStorage/default', urlParams: ''}
global-data-manager.js:250 📥 Loaded installment data from storage: {step1Items: 1, step1Completed: true, branchCode: '00000', windowBranchCode: '00000', urlParams: ''}
global-data-manager.js:171 ✅ Global Installment Data Manager initialized with branch: 00000
sidebar.js:201 ✅ Sidebar initialized successfully
step4-integration.js:170 📋 Initializing Step 4 Integration...
step4-integration.js:171 🔄 Stock Update Feature: ✅ ENABLED - การตัดสต๊อกเปิดใช้งานแล้ว
global-data-manager.js:528 🔓 Flexible navigation: allowing access to Step 4
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4-integration.js:295 🔍 Debug witness data sources: {witnessFromStep2: {…}, witnessFromLocalStorage: {…}, witnessFromGlobal: {…}, step2DataKeys: Array(9), hasWitnessInStep2: true}
step4-integration.js:310 🔍 Merged witness data: {name: '', id_card: '1-9410-01330-61-0', phone: '062-207-0097', relation: '', firstName: 'อามีน', …}
step4-integration.js:5323 [Step4-Integration] getImageUrl input: /uploads/products/1751450680954-704246399.jpg
step4-integration.js:5366 [Step4-Integration] getImageUrl output: /uploads/products/1751450680954-704246399.jpg
step4-integration.js:387 🔍 Step3 Payment Method Debug: {paymentMethod: 'cash', creditTerm: 'cash', fullStep3Data: {…}}
step4-integration.js:5253 💳 Converting payment method: cash
step4-integration.js:5267 💳 Payment method result: เงินสด
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
step4-integration.js:451 🔍 updatePaymentAmount debug: {step1Data: {…}, step1DataType: 'object', cartItems: Array(1), cartItemsType: 'object', isArray: true, …}
step4-integration.js:99 💰 Calculating VAT amount...
step4-integration.js:100 🔍 Input data check: {step1Data: {…}, step1DataType: 'object', hasCartItems: true, cartItemsType: 'object', isCartItemsArray: true, …}
step4-integration.js:153 💰 VAT calculation result: {subtotal: 13000, docFee: 500, afterDiscount: 13500, taxType: 'inclusive', vatAmount: 883.18}
step4-integration.js:507 💰 Payment amount updated: {downPayment: 4900, docFee: 500, vatAmount: 883.18, totalAmount: 5400, taxType: 'inclusive'}
step4-integration.js:526 💰 Payment amount updated: {downPayment: 4900, docFee: 500, vatAmount: 883.18, totalAmount: 5400, taxType: 'inclusive'}
step4-integration.js:2333 🔍 Enhanced Tax Invoice Availability Check: {hasCartItems: true, cartItemsCount: 1, cartItems: Array(1), hasVatItemsByTaxType: false, hasVatItemsByFlag: false, …}
step4-integration.js:2355 ✅ Tax invoice row shown (always visible)
step4-integration.js:2378 ❌ Print tax invoice button hidden - No VAT items
step4-integration.js:213 📥 Loaded summary data for Step 4
step4-integration.js:190 ✅ Step 4 Integration initialized
step4-integration.js:191 📦 Stock update is ready to process items when contract is created
step4:1847 🚀 Step 4 initialized
global-data-manager.js:202 🏢 Global Data Manager - Branch Info initialized: {code: '00000', name: 'สำนักงานใหญ่ — 148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000', source: 'localStorage/default', urlParams: ''}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:2031 💳 Loading payment method from step3: cash
step4:3893 � MANDATORY: Step4Integration set to DATABASE-ONLY mode
step4:4000 ✅ MANDATORY: Step4Integration configured for DATABASE-ONLY mode
step4:5005 🎯 Connecting Create Contract button to backend...
step4:5040 ✅ Create Contract button connected to backend submission
step4:5265 🔄 Loading Lottie animation from /Loading/Loading.json
common-utils.js:302 🚀 Initializing common installment features...
global-data-manager.js:202 🏢 Global Data Manager - Branch Info initialized: {code: '00000', name: 'สำนักงานใหญ่ — 148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000', source: 'localStorage/default', urlParams: ''}
common-utils.js:322 ✅ Common installment features initialized
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
Fetch finished loading: GET "<URL>".
step4:5282 ✅ Lottie animation loaded successfully
step4:1961 🔄 Restoring from draft...
step4:5161 🔍 Validating user authentication...
step4:5192 📊 Authentication Validation Results: {hasAuthToken: true, hasUserInfo: true, hasBranchInfo: false, userHasId: true, userHasName: true, …}
step4:5199 ✅ Authentication validation passed
printer-service.js:113 ✅ Branch data loaded: สำนักงานใหญ่
printer-service.js:130 🖨️ Printer URL configured: http://100.84.132.71:4004
printer-service.js:148 🔍 Testing printer connection: http://100.84.132.71:4004
printer-service.js:149 🔄 Using proxy endpoint for printer test
printer-service.js:165 ✅ Printer connection successful via proxy
printer-service.js:151 Fetch finished loading: POST "https://www.2pheenong.com/api/printer/print".
testConnection @ printer-service.js:151
setupPrinter @ printer-service.js:133
init @ printer-service.js:48
await in init
(anonymous) @ printer-service.js:509
printer-service.js:190 🕐 Starting real-time printer monitoring (60s intervals)...
printer-service.js:54 ✅ PrinterService initialized successfully with real-time monitoring
step4:1526 💰 Loading document fee from step3...
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:1530 📋 Step3 data: {plan_type: 'custom', down_payment: 4900, installment_count: 12, installment_amount: 2100, credit_amount: 25200, …}
step4:1537 ✅ Document fee found in step3 data: 500
step4:1553 💰 Document fee displayed: 500
step4:1574 💸 Updating today payment amount...
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:1580 Step1 data: {cartItems: Array(1), selectedProducts: Array(1), totalAmount: 13000, subTotal: 0, branchCode: '00000', …}
step4:1581 Step3 data: {plan_type: 'custom', down_payment: 4900, installment_count: 12, installment_amount: 2100, credit_amount: 25200, …}
step4:1600 📊 Calculated subtotal (excluding doc fee): 4900
step4:1624 📊 Calculated tax amounts (normalized): {subtotal: 4900, downPayment: 4900, docFee: 500, baseForTax: 5400, afterDiscount: 5400, …}
step4:1628 📊 Final total with tax: 5400
step4:1633 🔍 Down Payment Debug: {step3_down_payment: 4900, step3_downPayment: undefined, parsedDownPayment: 4900, docFee: 500}
step4:1645 💰 Payment calculation (Fixed - ใบเสร็จและใบกำกับภาษียอดเท่ากัน): {downPayment: 4900, docFee: 500, vatAmount: 353.27, totalWithTax: 5400, todayTotal: 5400, …}
step4:1679 ✅ Today payment amount updated - ยอดชำระวันนี้ (ยอดรวมทั้งหมด): 5400 (เงินดาวน์: 4900 + ค่าธรรมเนียม: 500 + VAT: 353.27 )
step4:1682 📊 PAYMENT SUMMARY - Step4 (Fixed): {step4_downPayment: 4900, step4_docFee: 500, step4_vatAmount: 353.27, step4_todayPayment: 5400, step4_totalWithTax: 5400, …}
global-data-manager.js:293 🔍 [DEBUG] updateStepData(3) called
global-data-manager.js:294 🔍 [DEBUG] incoming data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:295 🔍 [DEBUG] existing data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:272 💾 Saved installment data to storage
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:404 ✅ Step 3 validation passed
global-data-manager.js:514 📍 Suggested next step: 2 (flexible navigation enabled)
global-data-manager.js:304 � [DEBUG] merged result: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:305 �📝 Updated step3 data: {plan_type: 'custom', down_payment: 4900, installment_count: 12, installment_amount: 2100, credit_amount: 25200, …}
step4:1697 🔧 FIXED: Updated step3Data with VAT info for backend: {vatAmount: 353.27, totalWithTax: 5400, taxType: 'inclusive'}
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
step4:4160 ✅ Step4: Items summary loaded with 1 items
step4:3948 🚨 MANDATORY DATABASE-ONLY: Contract creation starting...
step4:3967 🖋️ MANDATORY: Ensuring all signatures are included in database submission...
step4:3975 🔍 MANDATORY Signature status for database: {customer: 'Present', salesperson: 'Present', authorized: 'Present'}
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:293 🔍 [DEBUG] updateStepData(2) called
global-data-manager.js:294 🔍 [DEBUG] incoming data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:295 🔍 [DEBUG] existing data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:272 💾 Saved installment data to storage
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:404 ✅ Step 2 validation passed
global-data-manager.js:514 📍 Suggested next step: 2 (flexible navigation enabled)
global-data-manager.js:304 � [DEBUG] merged result: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:305 �📝 Updated step2 data: {customer: {…}, witness: {…}, attachments: {…}, customerType: 'individual', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC', …}
step4:3994 ✅ MANDATORY: Signatures prepared for database submission
step4-integration.js:2429 ⏰ Process started at: 8:44:01 AM - Max timeout: 6 minutes
step4-integration.js:2445 📦 Checking stock availability BEFORE creating contract...
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
step4-integration.js:2851 📦 Checking stock availability for: [{…}]
step4-integration.js:2876 📦 Stock check data: {branch_code: '00000', allowNegativeStock: false, continueOnError: false, checkOnly: true, items: Array(1)}
step4:5012 📝 Create Contract button clicked
step4:4666 🚀 Starting backend submission...
step4:4669 🔍 Debugging customer data before submission:
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4:4673 📋 Step 1 data: {cartItems: Array(1), selectedProducts: Array(1), totalAmount: 13000, subTotal: 0, branchCode: '00000', …}
step4:4674 📋 Step 2 data: {customer: {…}, witness: {…}, attachments: {…}, customerType: 'individual', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC', …}
step4:4692 ✅ ชื่อ: อามีน
step4:4692 ✅ นามสกุล: ร่าหมาน
step4:4692 ✅ เลขบัตรประชาชน: 1-9410-01330-61-7
step4:4692 ✅ เบอร์โทรศัพท์: 062-207-0097
step4:4199 📦 Collecting all installment data from Steps 1-4...
step4:4288 📦 Getting Step 1 product data...
step4:4315 ✅ Found products in cartItems
step4:4353 👤 Getting Step 2 customer data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4:4361 ✅ Got customer data from globalInstallmentManager
step4:4402 📋 Processing customer data: {prefix: 'นาย', gender: 'ชาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '062-207-0097', …}
step4:4447 ✅ Final customer data structure: {customer: {…}, signatures: {…}}
step4:4448 🔍 Address validation check: {hasHouseNo: true, hasSubDistrict: true, hasDistrict: true, hasProvince: true, hasZipcode: true}
step4:4501 📋 Getting Step 3 invoice data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4518 ✅ Got Step 3 data from globalInstallmentManager: {plan_type: 'custom', down_payment: 4900, installment_amount: 2100, installment_count: 12, document_fee: 500, …}
step4:4547 💳 Getting Step 4 payment data...
step4:4567 🔑 JWT Payload: {userId: '681eb8aeb1593cea17568916', username: 'admin', role: 'Super Admin', iat: 1758109519}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4640 🔍 Real Authentication Data: {branch_code: '00000', salesperson_id: '681eb8aeb1593cea17568916', salesperson_name: 'อารีฟีน กาซอ', salesperson_signature: 'มีลายเซ็น', created_by: 'admin', …}
step4:4180 🔄 Mapping plan type: custom
step4:4193 ✅ Plan type mapped: {original: 'custom', mapped: 'plan1'}
step4:4277 ✅ Data collected successfully: {items: Array(1), customer_type: 'individual', customer: {…}, witness: {…}, attachments: {…}, …}
step4:4738 📤 Sending data to backend: {items: Array(1), customer_type: 'individual', customer: {…}, witness: {…}, attachments: {…}, …}
step4:4739 🔍 Payment Controller Validation Check: {hasCustomer: true, customerType: 'individual', firstName: 'อามีน', lastName: 'ร่าหมาน', phone: '062-207-0097', …}
step4:4766  POST https://www.2pheenong.com/api/installment/create 400 (Bad Request)
submitInstallmentToBackend @ step4:4766
await in submitInstallmentToBackend
(anonymous) @ step4:5034
step4:4818 ❌ Error response data: {success: false, message: 'Missing required fields'}
step4:4870 ❌ Full error details: {status: 400, statusText: '', errorMessage: 'Missing required fields', url: '/api/installment/create', timestamp: '2025-09-18T01:44:02.898Z'}
submitInstallmentToBackend @ step4:4870
await in submitInstallmentToBackend
(anonymous) @ step4:5034
step4:4899 ❌ Submission error: Error: Missing required fields
    at submitInstallmentToBackend (step4:4878:17)
    at async HTMLButtonElement.<anonymous> (step4:5034:13)
submitInstallmentToBackend @ step4:4899
await in submitInstallmentToBackend
(anonymous) @ step4:5034
step4:4199 📦 Collecting all installment data from Steps 1-4...
step4:4288 📦 Getting Step 1 product data...
step4:4315 ✅ Found products in cartItems
step4:4353 👤 Getting Step 2 customer data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4:4361 ✅ Got customer data from globalInstallmentManager
step4:4402 📋 Processing customer data: {prefix: 'นาย', gender: 'ชาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '062-207-0097', …}
step4:4447 ✅ Final customer data structure: {customer: {…}, signatures: {…}}
step4:4448 🔍 Address validation check: {hasHouseNo: true, hasSubDistrict: true, hasDistrict: true, hasProvince: true, hasZipcode: true}
step4:4501 📋 Getting Step 3 invoice data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4518 ✅ Got Step 3 data from globalInstallmentManager: {plan_type: 'custom', down_payment: 4900, installment_amount: 2100, installment_count: 12, document_fee: 500, …}
step4:4547 💳 Getting Step 4 payment data...
step4:4567 🔑 JWT Payload: {userId: '681eb8aeb1593cea17568916', username: 'admin', role: 'Super Admin', iat: 1758109519}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4640 🔍 Real Authentication Data: {branch_code: '00000', salesperson_id: '681eb8aeb1593cea17568916', salesperson_name: 'อารีฟีน กาซอ', salesperson_signature: 'มีลายเซ็น', created_by: 'admin', …}
step4:4766 Fetch failed loading: POST "https://www.2pheenong.com/api/installment/create".
submitInstallmentToBackend @ step4:4766
await in submitInstallmentToBackend
(anonymous) @ step4:5034
step4-integration.js:2879 Fetch finished loading: POST "https://www.2pheenong.com/api/stock/check-after-sale".
checkStockAvailability @ step4-integration.js:2879
createContract @ step4-integration.js:2448
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
step4:4180 🔄 Mapping plan type: custom
step4:4193 ✅ Plan type mapped: {original: 'custom', mapped: 'plan1'}
step4:4277 ✅ Data collected successfully: {items: Array(1), customer_type: 'individual', customer: {…}, witness: {…}, attachments: {…}, …}
step4:5036 Failed to create contract: Error: Missing required fields
    at submitInstallmentToBackend (step4:4878:17)
    at async HTMLButtonElement.<anonymous> (step4:5034:13)
(anonymous) @ step4:5036
step4-integration.js:2898 📦 Stock check result: {success: true, data: {…}, message: 'ตรวจสอบสต๊อกสำเร็จ 1 รายการ (พร้อมขาย)'}
printer-service.js:305 ✅ Printer status changed: เครื่องพิมพ์พร้อมใช้งาน
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:404 ✅ Step 1 validation passed
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:404 ✅ Step 2 validation passed
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:404 ✅ Step 3 validation passed
global-data-manager.js:1849 📤 Submitting installment contract...
global-data-manager.js:1861 🧹 Cleared all quotation/contract related storage before creating new contract
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:404 ✅ Step 1 validation passed
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:404 ✅ Step 2 validation passed
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:404 ✅ Step 3 validation passed
global-data-manager.js:1872 🔍 Pre-validating stock availability...
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:2522 🔍 Stock validation result: {targetBranch: '00000', totalItems: 1, validItems: 1, errors: 0, errorDetails: Array(0)}
global-data-manager.js:852 🔧 Creating installment payload with real authentication data...
global-data-manager.js:1700 🔍 Getting real salesperson data from authentication...
global-data-manager.js:1711 💾 localStorage userInfo: {id: '681eb8aeb1593cea17568916', username: 'admin', userName: 'admin', role: 'Super Admin', fullName: null, …}
global-data-manager.js:1712 💾 localStorage branchInfo: {}
global-data-manager.js:1635 🌐 Fetching user data from API...
global-data-manager.js:1657 ✅ API response received: {success: true, data: {…}}
global-data-manager.js:1687 📋 Processed user data: {id: '681eb8aeb1593cea17568916', username: 'admin', userName: 'admin', role: 'Super Admin', firstName: undefined, …}
global-data-manager.js:1722 ✅ Successfully fetched user data from API
global-data-manager.js:1730 🌟 API has real name, using API data: อารีฟีน กาซอ
 💾 Updated localStorage with API data
 🔍 [DEBUG] getStepData(3) called
 🔍 [DEBUG] stepKey: step3
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
 📊 Final salesperson data: {id: '681eb8aeb1593cea17568916', name: 'อารีฟีน กาซอ', username: 'admin', branch_code: '00000', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC', …}
 👤 Real salesperson data retrieved: {id: '681eb8aeb1593cea17568916', name: 'อารีฟีน กาซอ', username: 'admin', branch_code: '00000', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC', …}
 🔍 [DEBUG] getStepData(1) called
 🔍 [DEBUG] stepKey: step1
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
 🔍 [DEBUG] getStepData(2) called
 🔍 [DEBUG] stepKey: step2
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
 🔍 [DEBUG] Step 2 customer data check:
    - Has customer: true
    - Has customer.first_name: true
    - Has customer.last_name: true
    - Has customer.phone_number: true
    - Has customer.address: true
    - Has witness: true
    - Has attachments: true
 🔍 [DEBUG] getStepData(3) called
 🔍 [DEBUG] stepKey: step3
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
 🔍 [DEBUG] getInstallmentPayload - Step data retrieved:
    Step 1 data: EXISTS
    Step 2 data: EXISTS
    Step 3 data: EXISTS
 🔍 [DEBUG] Step 2 detailed check:
    Customer object: true
    Customer first_name: อามีน
    Customer last_name: ร่าหมาน
    Customer phone: 062-207-0097
    Customer email: Dev.2Pn@hotmail.com
    Customer address: true
    Witness data: true
    Attachments: true
 🔍 Getting quotation data from global manager...
 🔍 [DEBUG] getStepData(1) called
 🔍 [DEBUG] stepKey: step1
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
 🔍 [DEBUG] getStepData(2) called
 🔍 [DEBUG] stepKey: step2
 🔍 [DEBUG] raw data exists: true
 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
 🔍 [DEBUG] Step 2 customer data check:
    - Has customer: true
    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:575 📦 Item pricing debug: {name: 'iPad Air5 10.9" Wi-Fi 64GB Space Gray', originalPrice: 13000, salePrice: undefined, usedPrice: 13000, quantity: 1, …}
global-data-manager.js:587 💰 Pricing breakdown (FIXED): {itemSubtotal: 13000, docFee: 500, beforeDocFee: 13000, afterDocFee: 13500}
global-data-manager.js:617 💰 VAT Calculation - ไม่มีสินค้าที่มี VAT: {subTotal: 13500, vatAmount: 0, totalAmount: 13500}
global-data-manager.js:624 💰 Quotation pricing calculation (FIXED & CONSISTENT): {itemSubtotal: 13000, docFee: 500, subTotal: 13500, hasVatItems: false, vatAmount: 0, …}
global-data-manager.js:644 🔍 ITEMS DEBUG - Final prices for PDF generation (FIXED): {step1ItemsRaw: Array(1), docFeeDetails: {…}, calculationSummary: {…}}
global-data-manager.js:671 🔍 CUSTOMER DATA DEBUG (global-data-manager): {originalCustomerData: {…}, taxIdSources: {…}, addressSources: {…}}
global-data-manager.js:695 🔍 TRANSFORMED CUSTOMER DEBUG: {transformedCustomer: {…}, finalTaxId: '1-9410-01330-61-7', finalAddress: {…}}
global-data-manager.js:720 📄 Generated placeholder quotation number (backend will create actual): QT-680918-1758159854639
global-data-manager.js:896 📋 Generated quotation data for payload: {quotationNumber: 'QT-680918-1758159854639', hasItems: true, hasSummary: true, itemsCount: 2}
global-data-manager.js:911 🏷️ Product name mapping: {originalName: 'iPad Air5 10.9" Wi-Fi 64GB Space Gray', productName: undefined, title: undefined, description: undefined, finalName: 'iPad Air5 10.9" Wi-Fi 64GB Space Gray', …}
global-data-manager.js:946 🏪 Items with branch info: {currentBranch: '00000', itemsCount: 1, items: Array(1)}
global-data-manager.js:993 🔍 Customer Data Debug: {step2Data: {…}, customerData: {…}, step2Customer: {…}, hasFirstName: true, hasLastName: true, …}
global-data-manager.js:1005 🔍 RAW TAX ID DEBUG: {originalTaxId: '1-9410-01330-61-7', alternativeTaxId: undefined, idCard: undefined, willProcessAs: '1-9410-01330-61-7', type: 'string'}
global-data-manager.js:1017 🧹 Cleaning name: {original: 'อามีน', type: 'string', length: 5}
global-data-manager.js:1026 🧹 Name cleaned: {original: 'อามีน', cleaned: 'อามีน', changed: false}
global-data-manager.js:1017 🧹 Cleaning name: {original: 'ร่าหมาน', type: 'string', length: 7}
global-data-manager.js:1026 🧹 Name cleaned: {original: 'ร่าหมาน', cleaned: 'ร่าหมาน', changed: false}
global-data-manager.js:1056 🔍 Transformed Customer: {prefix: 'นาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '0622070097', email: 'Dev.2Pn@hotmail.com', …}
global-data-manager.js:1062 🔍 Witness data sources for payload: {witnessFromStep2: {…}, witnessFromLocalStorage: {…}, hasLocalStorageData: true}
global-data-manager.js:1074 🔄 Merged witness data for payload: {name: '', id_card: '1-9410-01330-61-0', phone: '062-207-0097', relation: '', firstName: 'อามีน', …}
global-data-manager.js:1091 🎯 Final transformed witness for backend payload: {name: 'อามีน ร่าหมาน', id_card: '1941001330610', phone: '0622070097', relation: 'friend'}
global-data-manager.js:1133 📁 Found id_card_image: {hasServerUrl: true, hasBase64: false}
global-data-manager.js:1133 📁 Found selfie_image: {hasServerUrl: true, hasBase64: false}
global-data-manager.js:1133 📁 Found customer_signature: {hasServerUrl: true, hasBase64: true}
global-data-manager.js:1146 📋 Transformed attachments data: {id_card_image: 'Found', selfie_image: 'Found', customer_signature: 'Found', sources: {…}}
global-data-manager.js:1164 🔧 Customer data transformation: {original: {…}, transformed: {…}}
global-data-manager.js:1200 💰 Tax Info from Step3: {taxType: 'inclusive', vatAmount: 353.27, beforeTaxAmount: 4579.439252336449, totalWithTax: 5400, receiptAmount: 5400, …}
global-data-manager.js:1235 🔄 Plan type mapping: {original: 'custom', mapped: 'manual', selectedPlanId: 'custom_plan'}
global-data-manager.js:1306 ✅ Final nationalId validation: {value: '1941001330617', type: 'string', length: 13, isValid: true}
global-data-manager.js:2755 🖋️ GlobalManager getCustomerSignature: {step2Data: undefined, step2SignatureUrl: undefined, localStorage: null, result: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC'}
global-data-manager.js:2755 🖋️ GlobalManager getCustomerSignature: {step2Data: undefined, step2SignatureUrl: undefined, localStorage: null, result: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAA…A//+AZ4FDAAAABklEQVQDAB8bZ/ww3CNhAAAAAElFTkSuQmCC'}
global-data-manager.js:1541 🔍 Transformed payload for API: {customerFirstName: 'อามีน', customerPhone: '0622070097', customerTaxId: '1941001330617', itemsCount: 1, planType: 'manual', …}
global-data-manager.js:1556 🏢 Branch code debug: {windowBranchCode: '00000', step1BranchCode: '00000', finalBranchCode: '00000', urlParams: ''}
global-data-manager.js:1563 ✅ Validation check - Customer data ready: {taxIdLength: 13, phoneLength: 10, hasFirstName: true, hasLastName: true, witnessName: 'อามีน ร่าหมาน', …}
global-data-manager.js:1574 🔍 Stock validation info: {targetBranch: '00000', itemsWithIMEI: 1, allItemsData: Array(1)}
global-data-manager.js:1894 📋 Installment payload: {firstName: 'อามีน', lastName: 'ร่าหมาน', nationalId: '1941001330617', phone: '0622070097', email: 'Dev.2Pn@hotmail.com', …}
global-data-manager.js:1896 🔍 Payment method debug: {stepPaymentMethod: 'cash', payloadPaymentMethod: 'cash', payloadPaymentInfo: {…}, purchaseType: 'installment', transactionType: 'credit_sale', …}
global-data-manager.js:1906 🖋️ Signatures debug in payload: {customerSignature: true, customerSignatureUrl: true, salespersonSignature: true, salespersonSignatureUrl: true, authorizedSignature: true, …}
global-data-manager.js:1918 🔍 Validation check (using installment API):
global-data-manager.js:1919   Customer data: {prefix: 'นาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '0622070097', email: 'Dev.2Pn@hotmail.com', …}
global-data-manager.js:1920   Customer ID Card: 1941001330617
global-data-manager.js:1921   Customer Address: ไม่มีข้อมูล
global-data-manager.js:1922   Tax ID: 1941001330617
global-data-manager.js:1923   Items count: 1
global-data-manager.js:1924   Plan type: manual
global-data-manager.js:1925   PlanType (camelCase): manual
global-data-manager.js:1926   Date: 2025-09-18
global-data-manager.js:1927   Down payment: 4900
global-data-manager.js:1928   Installment count: 12
global-data-manager.js:1929   Branch code: 00000
global-data-manager.js:1932 📋 Complete Customer Data Structure: {customerIdCard: '1941001330617', customerAddress: 'ไม่มีข้อมูล', taxId: '1941001330617', nationalId: '1941001330617', nationalIdLength: 13, …}
global-data-manager.js:1968 ✅ Pre-API validation passed
global-data-manager.js:1995 🧹 Cleaned payload for API submission
global-data-manager.js:1998 🔍 Final payload validation before API call:
global-data-manager.js:1999   nationalId: 1941001330617 (type: string , length: 13 )
global-data-manager.js:2000   nationalId regex test: true
global-data-manager.js:2001   firstName: อามีน
global-data-manager.js:2002   lastName: ร่าหมาน
global-data-manager.js:2003   phone: 0622070097
global-data-manager.js:2004   Has points field: false
global-data-manager.js:2005   Has customer.points field: false
global-data-manager.js:2006   Has customerData.points field: false
global-data-manager.js:2014 🔍 Deep payload scan: {hasPointsReference: false, hasReferenceTypeReference: false, hasHistoryReference: false, payloadSize: 118047}
global-data-manager.js:2050 👤 No existing customerId found, searching for existing customer first...
global-data-manager.js:2058 🔍 Searching for existing customer with: {taxId: '1941001330617', phone: '0622070097', searchQuery: '1941001330617'}
global-data-manager.js:2070 🔍 Customer search result: {success: true, data: Array(1), count: 1}
global-data-manager.js:2074 ✅ Found existing customer with ID: 6887c58d64dbf3bdefa516dd
auth-helper.js:236 ✅ Successfully extracted userId from JWT token: 681eb8aeb1593cea17568916
global-data-manager.js:2210 🔄 Installment payload transformation: {contractNumber: '', customerId: '6887c58d64dbf3bdefa516dd', customerName: 'อามีน ร่าหมาน', customerPhone: '0622070097', productId: '68918c022525710c73a18445', …}
global-data-manager.js:2288 ✅ All installment required fields validated successfully
step4:4199 📦 Collecting all installment data from Steps 1-4...
step4:4288 📦 Getting Step 1 product data...
step4:4315 ✅ Found products in cartItems
step4:4353 👤 Getting Step 2 customer data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4:4361 ✅ Got customer data from globalInstallmentManager
step4:4402 📋 Processing customer data: {prefix: 'นาย', gender: 'ชาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '062-207-0097', …}
step4:4447 ✅ Final customer data structure: {customer: {…}, signatures: {…}}
step4:4448 🔍 Address validation check: {hasHouseNo: true, hasSubDistrict: true, hasDistrict: true, hasProvince: true, hasZipcode: true}
step4:4501 📋 Getting Step 3 invoice data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4518 ✅ Got Step 3 data from globalInstallmentManager: {plan_type: 'custom', down_payment: 4900, installment_amount: 2100, installment_count: 12, document_fee: 500, …}
step4:4547 💳 Getting Step 4 payment data...
step4:4567 🔑 JWT Payload: {userId: '681eb8aeb1593cea17568916', username: 'admin', role: 'Super Admin', iat: 1758109519}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4640 🔍 Real Authentication Data: {branch_code: '00000', salesperson_id: '681eb8aeb1593cea17568916', salesperson_name: 'อารีฟีน กาซอ', salesperson_signature: 'มีลายเซ็น', created_by: 'admin', …}
step4:1979 ✅ Draft auto-saved
step4:4180 🔄 Mapping plan type: custom
step4:4193 ✅ Plan type mapped: {original: 'custom', mapped: 'plan1'}
step4:4277 ✅ Data collected successfully: {items: Array(1), customer_type: 'individual', customer: {…}, witness: {…}, attachments: {…}, …}
global-data-manager.js:2291  POST https://www.2pheenong.com/api/installment/create 500 (Internal Server Error)
submitInstallment @ global-data-manager.js:2291
await in submitInstallment
createContract @ step4-integration.js:2477
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
global-data-manager.js:2300 📡 Response status: 500 
global-data-manager.js:2311 ❌ Server error response: {success: false, message: 'ไม่สามารถสร้างสัญญาผ่อนชำระได้', error: 'Installment validation failed: endDate: Path `endD…quired., createdBy: Path `createdBy` is required.'}
submitInstallment @ global-data-manager.js:2311
await in submitInstallment
createContract @ step4-integration.js:2477
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
global-data-manager.js:2342 ❌ Complete error details: {status: 500, statusText: '', message: 'ไม่สามารถสร้างสัญญาผ่อนชำระได้', details: {…}, url: 'https://www.2pheenong.com/api/installment/create'}
submitInstallment @ global-data-manager.js:2342
await in submitInstallment
createContract @ step4-integration.js:2477
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
global-data-manager.js:2459 ❌ Error submitting installment: Error: เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ: ไม่สามารถสร้างสัญญาผ่อนชำระได้
    at GlobalInstallmentDataManager.submitInstallment (global-data-manager.js:2337:31)
    at async Step4Integration.createContract (step4-integration.js:2477:30)
    at async window.step4Integration.createContract (step4:3955:30)
submitInstallment @ global-data-manager.js:2459
await in submitInstallment
createContract @ step4-integration.js:2477
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
global-data-manager.js:2462 🔍 Debug Information for Error Analysis:
global-data-manager.js:316 🔍 [DEBUG] getStepData(1) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step1
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "cartItems": [
    {
      "id": "68918c022525710c73a18445",
      "branchStockId": "68918c022525710c73a18445",
      "productId": "68918c022525710c73a18442",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "brand": "Apple",
      "price": 13000,
      "quantity": 1,
      "totalPrice": 13000,
      "image": "/uploads/products/1751450680954-704246399.jpg",
      "barcode": "1478523699632",
      "maxStock": 1,
      "downAmount": 4900,
      "downInstallment": 2100,
      "downInstallmentCount": 12,
      "pricePayOff": 15590,
      "purchaseType": [
        "cash",
        "installment"
      ],
      "stockType": "imei",
      "imei": "1478523699632"
    }
  ],
  "selectedProducts": [
    {
      "id": "68918c022525710c73a18445",
      "imei": "1478523699632",
      "name": "iPad Air5 10.9\" Wi-Fi 64GB Space Gray",
      "price": 13000,
      "quantity": 1
    }
  ],
  "totalAmount": 13000,
  "subTotal": 0,
  "branchCode": "00000",
  "salespersonId": null,
  "salespersonName": null
}
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
global-data-manager.js:2615 (index)Value(index)ValueCurrent Branch'00000'URL BranchnullCart Items1Customer Name'อามีน ร่าหมาน'Payment Plan'custom'Down Payment4900Object
global-data-manager.js:2625 🛒 Cart Items Details:
global-data-manager.js:2627 1. iPad Air5 10.9" Wi-Fi 64GB Space Gray {imei: '1478523699632', price: 13000, branch: 'unknown', stockId: 'N/A'}
step4-integration.js:2813 ❌ Error creating contract: Error: เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ: ไม่สามารถสร้างสัญญาผ่อนชำระได้
    at GlobalInstallmentDataManager.submitInstallment (global-data-manager.js:2337:31)
    at async Step4Integration.createContract (step4-integration.js:2477:30)
    at async window.step4Integration.createContract (step4:3955:30)
createContract @ step4-integration.js:2813
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
step4-integration.js:2832 ✅ Global timeout cleared - process completed normally in 22.2s
step4:3956 ✅ MANDATORY: Contract saved to database successfully
global-data-manager.js:2291 Fetch failed loading: POST "https://www.2pheenong.com/api/installment/create".
submitInstallment @ global-data-manager.js:2291
await in submitInstallment
createContract @ step4-integration.js:2477
await in createContract
window.step4Integration.createContract @ step4:3955
await in window.step4Integration.createContract
(anonymous) @ step4-integration.js:2389
printer-service.js:225 📱 Page became hidden, printer monitoring will pause...
step4:4199 📦 Collecting all installment data from Steps 1-4...
step4:4288 📦 Getting Step 1 product data...
step4:4315 ✅ Found products in cartItems
step4:4353 👤 Getting Step 2 customer data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(2) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step2
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "customer": {
    "prefix": "นาย",
    "gender": "ชาย",
    "first_name": "อามีน",
    "last_name": "ร่าหมาน",
    "phone_number": "062-207-0097",
    "email": "Dev.2Pn@hotmail.com",
    "birth_date": "2000-07-19",
    "age": "25",
    "tax_id": "1-9410-01330-61-7",
    "occupation": "นักศึกษา",
    "income": "15000",
    "workplace": "มอปัต",
    "address": {
      "houseNo": "12",
      "moo": "5",
      "lane": "",
      "road": "",
      "subDistrict": "ระเเว้ง",
      "district": "ยะรัง",
      "province": "ปัตตานี",
      "zipcode": "94000"
    },
    "contactAddress": {
      "houseNo": "12",
      "moo": "5",
      "soi": "",
      "road": "",
      "province": "ปัตตานี",
      "district": "ยะรัง",
      "subDistrict": "ระเเว้ง",
      "zipcode": "94000"
    },
    "line_id": "0980931093",
    "facebook": "https://www.facebook.com/bisyrun.2024",
    "authMethod": "signature",
    "coordinates": "6.877930, 101.248588",
    "latitude": "6.87793",
    "longitude": "101.248588",
    "mapUrl": "https://maps.app.goo.gl/Zcik6pNCyMfzqZk4A"
  },
  "witness": {
    "name": "",
    "id_card": "1-9410-01330-61-0",
    "phone": "062-207-0097",
    "relation": ""
  },
  "attachments": {
    "idCard": {
      "url": "/uploads/documents/idCard_temp_1758122331038.jpg",
      "uploadedAt": "2025-09-17T16:33:24.269Z",
      "fileName": "idCard_capture.jpg"
    },
    "selfie": {
      "url": "/uploads/documents/selfie_temp_1758122331605.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "selfie_capture.jpg"
    },
    "salarySlip": {
      "url": "/uploads/documents/salarySlip_temp_1758122334507.jpg",
      "uploadedAt": "2025-09-17T16:33:24.270Z",
      "fileName": "salarySlip_capture.jpg"
    },
    "customerSignature": {
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO
global-data-manager.js:322 🔍 [DEBUG] Step 2 customer data check:
global-data-manager.js:323    - Has customer: true
global-data-manager.js:324    - Has customer.first_name: true
global-data-manager.js:325    - Has customer.last_name: true
global-data-manager.js:326    - Has customer.phone_number: true
global-data-manager.js:327    - Has customer.address: true
global-data-manager.js:328    - Has witness: true
global-data-manager.js:329    - Has attachments: true
step4:4361 ✅ Got customer data from globalInstallmentManager
step4:4402 📋 Processing customer data: {prefix: 'นาย', gender: 'ชาย', first_name: 'อามีน', last_name: 'ร่าหมาน', phone_number: '062-207-0097', …}
step4:4447 ✅ Final customer data structure: {customer: {…}, signatures: {…}}
step4:4448 🔍 Address validation check: {hasHouseNo: true, hasSubDistrict: true, hasDistrict: true, hasProvince: true, hasZipcode: true}
step4:4501 📋 Getting Step 3 invoice data...
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4518 ✅ Got Step 3 data from globalInstallmentManager: {plan_type: 'custom', down_payment: 4900, installment_amount: 2100, installment_count: 12, document_fee: 500, …}
step4:4547 💳 Getting Step 4 payment data...
step4:4567 🔑 JWT Payload: {userId: '681eb8aeb1593cea17568916', username: 'admin', role: 'Super Admin', iat: 1758109519}
global-data-manager.js:316 🔍 [DEBUG] getStepData(3) called
global-data-manager.js:317 🔍 [DEBUG] stepKey: step3
global-data-manager.js:318 🔍 [DEBUG] raw data exists: true
global-data-manager.js:319 🔍 [DEBUG] result data: {
  "plan_type": "custom",
  "down_payment": 4900,
  "installment_count": 12,
  "installment_amount": 2100,
  "credit_amount": 25200,
  "doc_fee": 500,
  "credit_term": "12 เดือน",
  "selectedPlan": {
    "id": "custom_plan",
    "name": "แผนกำหนดเอง",
    "type": "custom",
    "description": "ดาวน์ 4,900.00 ผ่อน 12 งวด งวดละ 2,100.00",
    "downPayment": 4900,
    "installmentCount": 12,
    "installmentAmount": 2100,
    "docFee": 500,
    "creditAmount": 25200,
    "totalAmount": 30600,
    "paymentMethod": "transfer",
    "recommended": false,
    "color": "red"
  },
  "paymentMethod": "cash",
  "creditTerm": "cash",
  "timestamp": "2025-09-17T16:34:26.560Z",
  "docFee": 500,
  "discount": 0,
  "discountType": "amount",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAADACAYAAACERl7/AAAQAElEQVR4AezdB7gVxd3H8f+gIooiAjaw0AQs+KCIIliw81oQWzAmETGSKAYbFqKJgkYJisaGXYM12EUFg4D0KiJKk36pggpKL4J5+c31XG+vp2z5+ni45+zu2Z35LD7358zOTKX/8Q8CCCCAAAIIIIBAqAQqGf8ggAACCCBQZgG+gAACmRQgwGVSn2sjgAACCCCAAALlECDAlQONrwRDgFIggAACCCAQVwECXFzvPPVGAAEEEEAgngKRqDUBLhK3kUoggAACCCCAQJwECHBxutvUFQEEgiFAKRBAAIEKChDgKgjI1xFAAAEEEEAAgXQLEODSLR6M61EKBBBAAAEEEAixAAEuxDePoiOAAAIIIJBeAa4WFAECXFDuBOVAAAEEEEAAAQRKKUCAKyUUhyGAQDAEKAUCCCCAgBkBjr8FCCCAAAIIIIBAyAQIcGW+YXwBAQQQQAABBBDIrAABLrP+XB0BBBBAIC4C1BOBJAoQ4JKIyakQQAABBBBAAIF0CBDg0qHMNRAIhgClQAABBBCIiAABLiI3kmoggAACCCCAQHwE0hvg4uNKTRFAAAEEEEAAgZQJEOBSRsuJEUAAAQSSJcB5EEAgrwABLq8HnxBAAAEEEEAAgcALEOACf4soYDAEKAUCCCCAAALBESDABedeUBIEEEAAAQQQiJpAiupDgEsRLKdFAAEEEEAAAQRSJUCAS5Us50UAAQSCIUApEEAgggIEuAjeVKqEAAIIIIAAAtEWIMBF+/4Go3aUAgEEEEAAAQSSKkCASyonJ0MAAQQQQACBZAlwnqIFCHBF27AHAQQQQAABBBAIpAABLpC3hUIhgEAwBCgFAgggEEwBAlww7wulQgABBBBAAAEEihQgwBVJE4wdlAIBBBBAAAEEEMgvQIDLL8JnBBBAAAEEwi9ADSIuQICL+A2meggggAACCCAQPQECXPTuKTVCIBgClAIBBBBAIGUCBLiU0XJiBBBAAAEEEEAgNQJRDnCpEeOsCCCAAAIIIIBAhgUIcBm+AVweAQQQQCBoApQHgeALEOCCf48oIQIIIIAAAgggkEeAAJeHgw8IBEOAUiCAAAIIIFCcAAGuOB32IYAAAggggAACARQoIsAFsKQUCQEEEEAAAQQQQMALEOA8A38ggAACCCRFgJMggEBaBAhwaWHmIggggAACCCCAQPIECHDJs+RMwRCgFAgggAACCERegAAX+VtMBRFAAAEEEECgZIFwHUGAC9f9orQIIIAAAggggIAR4PhLgAACCAREgGIggAACpRUgwJVWiuMQQAABBBBAAIGACBDgAnIjglEMSoEAAggggAACYRAgwIXhLlFGBBBAAAEEgixA2dIuQIBLOzkXRAABBBBAAAEEKiZAgKuYH99GAIFgCFAKBBBAIFYCBLhY3W4qiwACCCCAAAJRECDAJesuch4EEEAAAQQQQCBNAgS4NEFzGQQQQAABBAoTYBsC5REgwJVHje8ggAACCCCAAAIZFCDAZRCfSyMQDAFKgQACCCAQNgECXNjuGOVFAAEEEEAAgdgLBCLAxf4uAIAAAggggAACCJRBgABXBiwORQABBBAIlACFQSC2AgS42N56Ko4AAggggAACYRUgwIX1zlHuYAhQCgQQQAABBDIgQIDLADqXRAABBBBAAIF4C1S09gS4igryfQQQQAABBBBAIM0CBLg0g3M5BBBAIBgClAIBBMIsQIAL892j7AgggAACCCAQSwECXCxvezAqTSkQQAABBBBAoHwCBLjyufEtBBBAAAEEEMiMAFfdIUCA24HAvwgggAACCCCAQJgECHBhuluUFQEEgiFAKRBAAIEMCxDgMnwDuDwCCCCAAAIIIFBWAQJcWcWCcTylQAABBBBAAIEYCxDgYnzzqXrwBSZOnGinnnqqfx1//PHWvHlzO+qoo+yII46wJk2aWKNGjaxevXp20EEH2QEHHGD77ruv1apVyw488EA75JBD/L633347+BWlhAggkCYBLhMVAQJcVO4k9UirwJIlS+yiiy7ygalSpUqml3POnEvuq2XLljZixAj/mjRpkk2ZMsWmTZtmM2fOtNmzZ9vcuXMtKyvLli5daitWrLDvvvvOVq1aZcuWLbPFixf7fZdeemmecqmslStXtgYNGlibNm3S6sbFEEAAAQSSI0CAS44jZ4mwwPDhw+2ss86y6tWr20477eTD0MEHH2zvvfeeD0z/+9//TK9UEThX9lBYXFlU1p9++skWLFhgI0eO9PVxzvm61ahRw9q2bWtq+bMU/cNpEUAAAQQqLkCAq7ghZ4iYwFNPPWWHH3647brrrj7cnHbaaTZkyBBbs2aN/fzzz6WurVq6FPh23nln31JXp06dnG7NDh062HXXXZfzuvXWW30IVLjK/9I1y/rKfY6vv/7aFEJvueUWa9Gihe2zzz6+bvkromv88MMPNnjwYGu5o+XPOedDnbpl9fmhhx4y/kEAAQQQCIZADANcMOApRTAE1q9f78NalSpVfFhzzlmXLl1s1qxZtnXr1hILucsuu9h+++1nl1xyiQ9j+l4iPG3fvt22bdtmau1auXKl7+bM2tHdqZav/v372xNPPJHzeuCBB0q8VnkPaNy4se8qffDBB03dsN9++61t3rzZB8a1a9f6cNeuXTsfLhMOiWsp1KlbVi1yCoDOOe+kMKou5MRx/EQAAQQQSK8AAS693lwtwwKrV682hRU9A+acsz333NOHtS1bthRbMueyj23atKndd999PvwoqCnk6dmzt956y4cxDSwo9kQB26n66zm4AQMG+OflNm3a5FsZVbdHHnnELrjgAtt///1NQdU5l1P65cuX+y5k55wPdNp/xRVX2PPPP59zDG8QiJwAFUIgQAIEuADdDIqSGoEePXpY3bp1rcqOVraaNWvahx9+6FvFiruaAolGd952220+rKklSq1VX331ld1xxx3FfTUy+2644QZ7//337ZtvvvGtkTJQsOvevbvVrl3b1DWcqKxaGl955RXr3LmzD3R77LGHHX300fbkk08mDuEnAggggEASBQhwScTkVMERuOuuu/xzXs4569mzpy1atMiKamVzztnuu+9uJ5xwgmnKDYUUtaypq7N3797BqZRZIMrSq1cvP8pVXcOy6tOnj7fLHeg2bNhgU6dO9d3Kzjkf9hT61A0biEpQCAQQQCDkAgS4kN9Aip9X4OOPP7bq1avbvffe61uN8u799ZNa2NQd+uabb/ouQwWOcePG2cUXX/zrQbwrlUC3bt1MdolAN2HCBGvYsKHvdk2cQM8DqiVPAyGcy+52VfetWuk0LUriOH4igAACCJROoGwBrnTn5CgE0i6gOc/q169v55xzjh8tWlgB1EJ05plnmsKaWtjUHao50go7lm3lF9CEw5qfTsZqodPzga1atbLddtstz0k1gEStdJqY2LnsVjpNQKxRs3kO5AMCCCCAQAEBAlwBEjaETUAP4OsZt4ULFxZadAU7PfemkZeffPKJ7y4t9EA2pkRAI3THjh1rGzdu9M8TatCHgrNa4JxzOddUK50mID7ssMP8c3RVq1a1q666yk9anHMQb0IrQMERQCC5AgS45HpytjQLaJRk+/btfTDIf2nN3zZq1CibN2+enXfeeX5Os/zH8Dn9App2RV3XGhSigREzZsywTp06mUa7au68RIkU+P7973/7ZcO0XQNQHnvsscRufiKAAAKxFiDAxfr2h7fy6ppTd9sHH3xQoBJq2dF0FsOGDbOTTjrJt+aYFTiMDQER0KTJL774oh/tqlY43duuXbtarVq1cu6dtmkKGI2Mdc6ZpoG5/fbbA1IDioEAAgikX6BS+i/JFRGomMALL7zgW9PU3Zb/TOpy0/Nwf/zjH/Pv4nOIBNTSpgmE1UKn8KaWVg1OSVRBAyY0+bFzzq9D26hRI+PZOeMfBBBIhUBAz0mAC+iNoViFC6hF7eqrry7QZbr33nubuuUU7nL/oi/8LGwNm4Dmo9MyXwpzd999t9WrVy9P65wGTejZOXW1ahBFVlZW2KpIeRFAAIEyCRDgysTFwZkS+Oijj3yr25gxYwoUQb+wNWebHowvsJMNkRPQxMy632qde+edd6xBgwa+FU4VVcDTcmEKeFrLVs9HanvIXxQfAQQQKCBAgCtAwoagCbRo0cLOP/98P19b7rI550y/wDXvGK1uuWXi817r
step4:4640 🔍 Real Authentication Data: {branch_code: '00000', salesperson_id: '681eb8aeb1593cea17568916', salesperson_name: 'อารีฟีน กาซอ', salesperson_signature: 'มีลายเซ็น', created_by: 'admin', …}
step4:1979 ✅ Draft auto-saved
step4:4180 🔄 Mapping plan type: custom
step4:4193 ✅ Plan type mapped: {original: 'custom', mapped: 'plan1'}
step4:4277 ✅ Data collected successfully: {items: Array(1), customer_type: 'individual', customer: {…}, witness: {…}, attachments: {…}, …}
printer-service.js:203 📱 Page not visible, skipping printer status check
printer-service.js:221 📱 Page became visible, resuming printer monitoring...
