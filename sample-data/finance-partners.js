// Sample Finance Partners data
// This file can be used to populate the database with initial finance partner data

const sampleFinancePartners = [
  {
    code: 'SCB',
    name: 'ธนาคารไทยพาณิชย์',
    nameEn: 'Siam Commercial Bank',
    type: 'bank',
    contact: {
      address: '9 ถนนรัชดาภิเษก แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
      phone: '02-777-7777',
      email: 'info@scb.co.th',
      website: 'https://www.scb.co.th'
    },
    services: ['installment', 'personal_loan', 'business_loan', 'credit_card'],
    interestRates: [
      {
        serviceType: 'installment',
        minRate: 12.5,
        maxRate: 18.5,
        isActive: true
      },
      {
        serviceType: 'personal_loan',
        minRate: 15.0,
        maxRate: 25.0,
        isActive: true
      }
    ],
    approvalCriteria: {
      minIncome: 15000,
      minAge: 20,
      maxAge: 65,
      requiredDocuments: ['id_card', 'income_certificate', 'bank_statement'],
      processingTime: {
        min: 1,
        max: 3
      }
    },
    isActive: true,
    applicableBranches: [], // ทุกสาขา
    stats: {
      totalApplications: 150,
      approvedApplications: 135,
      rejectedApplications: 15,
      averageApprovalTime: 2.1
    }
  },
  {
    code: 'KTB',
    name: 'ธนาคารกรุงไทย',
    nameEn: 'Krung Thai Bank',
    type: 'bank',
    contact: {
      address: '35 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
      phone: '02-208-8888',
      email: 'contact@ktb.co.th',
      website: 'https://www.ktb.co.th'
    },
    services: ['installment', 'personal_loan', 'business_loan'],
    interestRates: [
      {
        serviceType: 'installment',
        minRate: 13.0,
        maxRate: 19.0,
        isActive: true
      }
    ],
    approvalCriteria: {
      minIncome: 12000,
      minAge: 18,
      maxAge: 60,
      requiredDocuments: ['id_card', 'income_certificate'],
      processingTime: {
        min: 2,
        max: 5
      }
    },
    isActive: true,
    applicableBranches: [],
    stats: {
      totalApplications: 95,
      approvedApplications: 78,
      rejectedApplications: 17,
      averageApprovalTime: 3.2
    }
  },
  {
    code: 'AEON',
    name: 'อิออน ธนสินทรัพย์ (ไทยแลนด์)',
    nameEn: 'AEON Thana Sinsap (Thailand)',
    type: 'financial_institution',
    contact: {
      address: '973 เพรสิเดนท์ ทาวเวอร์ ชั้น 11-20 ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330',
      phone: '02-656-1000',
      email: 'info@aeon.co.th',
      website: 'https://www.aeon.co.th'
    },
    services: ['installment', 'credit_card'],
    interestRates: [
      {
        serviceType: 'installment',
        minRate: 20.0,
        maxRate: 28.0,
        isActive: true
      }
    ],
    approvalCriteria: {
      minIncome: 8000,
      minAge: 18,
      maxAge: 70,
      requiredDocuments: ['id_card', 'income_certificate'],
      processingTime: {
        min: 1,
        max: 2
      }
    },
    isActive: true,
    applicableBranches: [],
    stats: {
      totalApplications: 200,
      approvedApplications: 170,
      rejectedApplications: 30,
      averageApprovalTime: 1.5
    }
  },
  {
    code: 'ISUZU',
    name: 'อีซูซุ ลีสซิ่ง',
    nameEn: 'Isuzu Leasing',
    type: 'leasing',
    contact: {
      address: '1 ซอยรัชดา 3 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
      phone: '02-641-2345',
      email: 'info@isuzu-leasing.co.th',
      website: 'https://www.isuzu-leasing.co.th'
    },
    services: ['leasing', 'hire_purchase'],
    interestRates: [
      {
        serviceType: 'leasing',
        minRate: 4.5,
        maxRate: 8.9,
        isActive: true
      },
      {
        serviceType: 'hire_purchase',
        minRate: 6.5,
        maxRate: 12.9,
        isActive: true
      }
    ],
    approvalCriteria: {
      minIncome: 25000,
      minAge: 21,
      maxAge: 65,
      requiredDocuments: ['id_card', 'income_certificate', 'work_certificate', 'bank_statement'],
      processingTime: {
        min: 3,
        max: 7
      }
    },
    isActive: true,
    applicableBranches: [],
    stats: {
      totalApplications: 45,
      approvedApplications: 38,
      rejectedApplications: 7,
      averageApprovalTime: 4.8
    }
  },
  {
    code: 'KRUNGSRI',
    name: 'ธนาคารกรุงศรีอยุธยา',
    nameEn: 'Bank of Ayudhya (Krungsri)',
    type: 'bank',
    contact: {
      address: '1222 ถนนพระราม 3 แขวงบางโพ เขตบางคอแหลม กรุงเทพฯ 10120',
      phone: '02-296-4444',
      email: 'contact@krungsri.com',
      website: 'https://www.krungsri.com'
    },
    services: ['installment', 'personal_loan', 'credit_card'],
    interestRates: [
      {
        serviceType: 'installment',
        minRate: 11.5,
        maxRate: 17.5,
        isActive: true
      }
    ],
    approvalCriteria: {
      minIncome: 18000,
      minAge: 20,
      maxAge: 65,
      requiredDocuments: ['id_card', 'income_certificate', 'bank_statement'],
      processingTime: {
        min: 1,
        max: 4
      }
    },
    isActive: true,
    applicableBranches: ['00001'], // เฉพาะสาขาหลัก
    stats: {
      totalApplications: 88,
      approvedApplications: 72,
      rejectedApplications: 16,
      averageApprovalTime: 2.8
    }
  }
];

module.exports = sampleFinancePartners;