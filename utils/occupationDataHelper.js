/**
 * @file occupationDataHelper.js
 * @description Helper functions for handling occupation data transformations and validations
 * @version 1.0.0
 * @date 2025-01-27
 */

/**
 * Transform legacy occupation string to new occupation structure
 * @param {string} legacyOccupation - Old occupation string
 * @returns {object} New occupation structure
 */
function transformLegacyOccupation(legacyOccupation) {
  if (!legacyOccupation || typeof legacyOccupation !== 'string') {
    return getDefaultOccupationStructure();
  }

  const occupation = legacyOccupation.trim();

  // Map common legacy occupation values to new categories
  const occupationMapping = {
    'ข้าราชการ': { category: 'ข้าราชการ', subcategory: '' },
    'พนักงานรัฐวิสาหกิจ': { category: 'พนักงานรัฐวิสาหกิจ', subcategory: '' },
    'พนักงานบริษัท': { category: 'พนักงานบริษัท', subcategory: '' },
    'ธุรกิจส่วนตัว': { category: 'ธุรกิจส่วนตัว', subcategory: '' },
    'เกษตรกร': { category: 'เกษตรกร', subcategory: '' },
    'รับจ้างทั่วไป': { category: 'รับจ้างทั่วไป', subcategory: '' },
    'ค้าขาย': { category: 'ธุรกิจส่วนตัว', subcategory: 'ค้าขาย' },
    'รับราชการ': { category: 'ข้าราชการ', subcategory: '' },
    'อาชีพอิสระ': { category: 'ธุรกิจส่วนตัว', subcategory: 'อาชีพอิสระ' }
  };

  const mapped = occupationMapping[occupation];

  if (mapped) {
    return {
      category: mapped.category,
      subcategory: mapped.subcategory,
      workplace: '',
      workAddress: '',
      position: '',
      workExperience: 0,
      monthlyIncome: 0,
      legacyOccupationText: occupation,
      otherOccupationDetail: ''
    };
  }

  // If not mapped, treat as "อื่นๆ"
  return {
    category: 'อื่นๆ',
    subcategory: '',
    workplace: '',
    workAddress: '',
    position: '',
    workExperience: 0,
    monthlyIncome: 0,
    legacyOccupationText: occupation,
    otherOccupationDetail: occupation
  };
}

/**
 * Get default occupation structure
 * @returns {object} Default occupation structure
 */
function getDefaultOccupationStructure() {
  return {
    category: '',
    subcategory: '',
    workplace: '',
    workAddress: '',
    position: '',
    workExperience: 0,
    monthlyIncome: 0,
    legacyOccupationText: '',
    otherOccupationDetail: ''
  };
}

/**
 * Validate occupation data
 * @param {object} occupationData - Occupation data to validate
 * @returns {object} Validation result with errors and warnings
 */
function validateOccupationData(occupationData) {
  const errors = [];
  const warnings = [];

  if (!occupationData || typeof occupationData !== 'object') {
    warnings.push('ไม่พบข้อมูลอาชีพ');
    return { isValid: true, errors, warnings };
  }

  // Validate category
  const validCategories = [
    'ข้าราชการ',
    'พนักงานรัฐวิสาหกิจ',
    'พนักงานบริษัท',
    'ธุรกิจส่วนตัว',
    'เกษตรกร',
    'รับจ้างทั่วไป',
    'อื่นๆ',
    ''
  ];

  if (occupationData.category && !validCategories.includes(occupationData.category)) {
    errors.push(`ประเภทอาชีพไม่ถูกต้อง: ${occupationData.category}`);
  }

  // Validate "อื่นๆ" requirement
  if (occupationData.category === 'อื่นๆ' && !occupationData.otherOccupationDetail) {
    warnings.push('กรุณาระบุรายละเอียดอาชีพเมื่อเลือก "อื่นๆ"');
  }

  // Validate numeric fields
  if (occupationData.monthlyIncome && (typeof occupationData.monthlyIncome !== 'number' || occupationData.monthlyIncome < 0)) {
    warnings.push('รายได้รายเดือนต้องเป็นตัวเลขที่ไม่เป็นค่าลบ');
  }

  if (occupationData.workExperience && (typeof occupationData.workExperience !== 'number' || occupationData.workExperience < 0)) {
    warnings.push('ประสบการณ์การทำงานต้องเป็นตัวเลขที่ไม่เป็นค่าลบ');
  }

  // Validate required fields based on category
  if (occupationData.category && occupationData.category !== '') {
    if (!occupationData.workplace) {
      warnings.push('ควรระบุสถานที่ทำงาน');
    }
    if (!occupationData.monthlyIncome || occupationData.monthlyIncome === 0) {
      warnings.push('ควรระบุรายได้รายเดือน');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Normalize occupation data from various input formats
 * @param {object} inputData - Input data containing occupation information
 * @returns {object} Normalized occupation structure
 */
function normalizeOccupationData(inputData) {
  if (!inputData || typeof inputData !== 'object') {
    return getDefaultOccupationStructure();
  }

  // If already in new format
  if (inputData.occupationData) {
    return { ...getDefaultOccupationStructure(), ...inputData.occupationData };
  }

  // Transform from various field name formats
  const normalized = {
    category: inputData.occupationCategory || inputData.customerOccupation || inputData.occupation || '',
    subcategory: inputData.occupationSubcategory || inputData.subcategory || '',
    workplace: inputData.workplace || inputData.customerWorkplace || '',
    workAddress: inputData.workAddress || inputData.work_address || '',
    position: inputData.position || inputData.customerPosition || '',
    workExperience: Number(inputData.workExperience || inputData.work_experience || 0),
    monthlyIncome: Number(inputData.monthlyIncome || inputData.monthly_income || inputData.income || 0),
    legacyOccupationText: inputData.legacyOccupation || inputData.legacy_occupation || inputData.occupation || '',
    otherOccupationDetail: inputData.otherOccupationDetail || inputData.other_occupation_detail || ''
  };

  // If only legacy occupation string is provided, transform it
  if (!normalized.category && normalized.legacyOccupationText) {
    return transformLegacyOccupation(normalized.legacyOccupationText);
  }

  return normalized;
}

/**
 * Format occupation data for display
 * @param {object} occupationData - Occupation data
 * @returns {string} Formatted occupation string for display
 */
function formatOccupationDisplay(occupationData) {
  if (!occupationData || typeof occupationData !== 'object') {
    return 'ไม่ระบุอาชีพ';
  }

  const { category, subcategory, workplace, position, otherOccupationDetail } = occupationData;

  if (!category) {
    return occupationData.legacyOccupationText || 'ไม่ระบุอาชีพ';
  }

  if (category === 'อื่นๆ') {
    return otherOccupationDetail || 'อื่นๆ';
  }

  let display = category;

  if (subcategory) {
    display += ` (${subcategory})`;
  }

  if (position) {
    display += ` - ${position}`;
  }

  if (workplace) {
    display += ` ที่ ${workplace}`;
  }

  return display;
}

/**
 * Check if occupation data requires income verification
 * @param {object} occupationData - Occupation data
 * @returns {boolean} True if income verification is recommended
 */
function requiresIncomeVerification(occupationData) {
  if (!occupationData || !occupationData.category) {
    return false;
  }

  const highVerificationCategories = [
    'ข้าราชการ',
    'พนักงานรัฐวิสาหกิจ',
    'พนักงานบริษัท'
  ];

  const highIncomeThreshold = 50000; // 50,000 บาท

  return highVerificationCategories.includes(occupationData.category) ||
         (occupationData.monthlyIncome && occupationData.monthlyIncome > highIncomeThreshold);
}

/**
 * Generate occupation subcategory options based on category
 * @param {string} category - Main occupation category
 * @returns {array} Array of subcategory options
 */
function getSubcategoryOptions(category) {
  const subcategoryMap = {
    'ข้าราชการ': [
      'ข้าราชการครู',
      'ข้าราชการตำรวจ',
      'ข้าราชการทหาร',
      'ข้าราชการพลเรือน',
      'ข้าราชการท้องถิ่น'
    ],
    'พนักงานรัฐวิสาหกิจ': [
      'การไฟฟ้า',
      'การประปา',
      'การสื่อสาร',
      'การขนส่ง',
      'ธนาคารรัฐ'
    ],
    'พนักงานบริษัท': [
      'บริษัทเอกชน',
      'บริษัทมหาชน',
      'บริษัทข้ามชาติ',
      'สำนักงานบัญชี',
      'สำนักงานกฎหมาย'
    ],
    'ธุรกิจส่วนตัว': [
      'ค้าขาย',
      'ร้านอาหาร',
      'ซ่อมแซม',
      'บริการ',
      'อาชีพอิสระ'
    ],
    'เกษตรกร': [
      'ปลูกข้าว',
      'ปลูกผลไม้',
      'ปลูกผัก',
      'เลี้ยงสัตว์',
      'ประมง'
    ],
    'รับจ้างทั่วไป': [
      'งานก่อสร้าง',
      'แรงงานทั่วไป',
      'งานบ้าน',
      'รับจ้างรายวัน',
      'ขับรถ'
    ]
  };

  return subcategoryMap[category] || [];
}

module.exports = {
  transformLegacyOccupation,
  getDefaultOccupationStructure,
  validateOccupationData,
  normalizeOccupationData,
  formatOccupationDisplay,
  requiresIncomeVerification,
  getSubcategoryOptions
};