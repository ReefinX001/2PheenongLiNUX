/**
 * Form Progress Manager
 * จัดการความคืบหน้าของการกรอกฟอร์มลูกค้า
 */
class FormProgressManager {
  constructor() {
    this.requiredFields = [
      'customerFirstName',
      'customerLastName',
      'customerIdCard',
      'customerPhone',
      'customerBirthDate',
      'customerAge',
      'customerOccupation',
      'customerIncome',
      'houseNo',
      'province',
      'district',
      'subDistrict'
    ];

    this.optionalFields = [
      'customerPrefix',
      'customerEmail',
      'customerFacebook',
      'customerLineId',
      'customerWorkplace',
      'moo',
      'soi',
      'road',
      'zipcode'
    ];

    this.documentFields = [
      'idCardImageUrl',
      'selfieUrl',
      'customerSignatureUrl',
      'salespersonSignatureUrl'
    ];

    this.progressBar = null;
    this.progressText = null;
    this.progressDetails = null;
    this.nextButton = null;
  }

  initialize() {
    console.log('📊 Initializing Form Progress Manager...');

    this.setupElements();
    this.setupEventListeners();
    this.updateProgress();

    console.log('✅ Form Progress Manager initialized');
  }

  setupElements() {
    this.progressBar = document.getElementById('formProgressBar');
    this.progressText = document.getElementById('formProgress');
    this.progressDetails = document.getElementById('formProgressDetails');
    this.nextButton = document.getElementById('btnStep2ToStep3');
  }

  setupEventListeners() {
    // Listen to all form inputs
    const allFields = [...this.requiredFields, ...this.optionalFields];

    allFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.addEventListener('input', () => {
          // Add delay for ID card formatting
          if (fieldId === 'customerIdCard') {
            setTimeout(() => this.updateProgress(), 100);
          } else {
            this.updateProgress();
          }
        });
        element.addEventListener('change', () => this.updateProgress());
        element.addEventListener('blur', () => this.updateProgress());
      }
    });

    // Listen to document upload events
    document.addEventListener('documentUploaded', () => this.updateProgress());
    document.addEventListener('signatureCompleted', () => this.updateProgress());

    // Listen to Global Data Manager updates
    document.addEventListener('installmentDataUpdated', () => {
      setTimeout(() => this.updateProgress(), 50);
    });
  }

  updateProgress() {
    const progress = this.calculateProgress();
    this.displayProgress(progress);
    this.updateNextButton(progress);
  }

  calculateProgress() {
    let completedRequired = 0;
    let totalRequired = this.requiredFields.length;
    let completedOptional = 0;
    let totalOptional = this.optionalFields.length;
    let completedDocuments = 0;
    let totalDocuments = this.documentFields.length;

    // Check required fields
    this.requiredFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element && element.value && element.value.trim() !== '') {
        // Special validation for ID Card - check if it has 13 digits
        if (fieldId === 'customerIdCard') {
          const digits = element.value.replace(/\D/g, ''); // Remove non-digits
          if (digits.length === 13) {
            completedRequired++;
          }
        }
        // Special validation for phone - check if it has 9-10 digits
        else if (fieldId === 'customerPhone') {
          const digits = element.value.replace(/\D/g, ''); // Remove non-digits
          if (digits.length >= 9 && digits.length <= 10) {
            completedRequired++;
          }
        }
        // Regular validation for other fields
        else {
          completedRequired++;
        }
      }
    });

    // Check optional fields
    this.optionalFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element && element.value && element.value.trim() !== '') {
        completedOptional++;
      }
    });

    // Check documents
    this.documentFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element && element.value && element.value.trim() !== '') {
        completedDocuments++;
      }
    });

    // Calculate weighted progress
    const requiredWeight = 60; // 60% for required fields
    const optionalWeight = 20; // 20% for optional fields
    const documentWeight = 20; // 20% for documents

    const requiredProgress = (completedRequired / totalRequired) * requiredWeight;
    const optionalProgress = (completedOptional / totalOptional) * optionalWeight;
    const documentProgress = (completedDocuments / totalDocuments) * documentWeight;

    const totalProgress = requiredProgress + optionalProgress + documentProgress;

    return {
      total: Math.round(totalProgress),
      required: {
        completed: completedRequired,
        total: totalRequired,
        percentage: Math.round((completedRequired / totalRequired) * 100)
      },
      optional: {
        completed: completedOptional,
        total: totalOptional,
        percentage: Math.round((completedOptional / totalOptional) * 100)
      },
      documents: {
        completed: completedDocuments,
        total: totalDocuments,
        percentage: Math.round((completedDocuments / totalDocuments) * 100)
      }
    };
  }

  displayProgress(progress) {
    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${progress.total}%`;

      // Change color based on progress
      if (progress.total >= 90) {
        this.progressBar.className = 'progress-fill bg-green-500';
      } else if (progress.total >= 60) {
        this.progressBar.className = 'progress-fill bg-blue-500';
      } else if (progress.total >= 30) {
        this.progressBar.className = 'progress-fill bg-yellow-500';
      } else {
        this.progressBar.className = 'progress-fill bg-red-500';
      }
    }

    // Update progress text
    if (this.progressText) {
      this.progressText.textContent = `${progress.total}%`;
    }

    // Update progress details
    if (this.progressDetails) {
      let detailsHtml = '';

      if (progress.required.percentage < 100) {
        detailsHtml += `📋 ข้อมูลจำเป็น: ${progress.required.completed}/${progress.required.total} (${progress.required.percentage}%) `;
      } else {
        detailsHtml += `✅ ข้อมูลจำเป็น: ครบถ้วน `;
      }

      if (progress.optional.percentage > 0) {
        detailsHtml += `📝 ข้อมูลเสริม: ${progress.optional.completed}/${progress.optional.total} (${progress.optional.percentage}%) `;
      }

      if (progress.documents.percentage > 0) {
        detailsHtml += `📄 เอกสาร: ${progress.documents.completed}/${progress.documents.total} (${progress.documents.percentage}%)`;
      }

      if (progress.total === 100) {
        detailsHtml = '🎉 ข้อมูลครบถ้วนแล้ว พร้อมไปขั้นตอนถัดไป!';
      } else if (progress.required.percentage === 100) {
        detailsHtml += ' - พร้อมไปขั้นตอนถัดไป';
      } else {
        const missing = this.getMissingRequiredFields();
        if (missing.length <= 3) {
          detailsHtml += ` - ยังขาด: ${missing.join(', ')}`;
        } else {
          detailsHtml += ` - ยังขาดข้อมูลจำเป็น ${missing.length} รายการ`;
        }
      }

      this.progressDetails.innerHTML = detailsHtml;
    }
  }

  getMissingRequiredFields() {
    const missing = [];
      const fieldNames = {
        'customerFirstName': 'ชื่อ',
        'customerLastName': 'นามสกุล',
        'customerIdCard': 'เลขบัตรประชาชน',
      'customerPhone': 'โทรศัพท์',
        'customerBirthDate': 'วันเกิด',
        'customerAge': 'อายุ',
        'customerOccupation': 'อาชีพ',
        'customerIncome': 'รายได้',
        'houseNo': 'บ้านเลขที่',
        'province': 'จังหวัด',
        'district': 'อำเภอ',
        'subDistrict': 'ตำบล'
      };

    this.requiredFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      let isFieldComplete = false;

      if (element && element.value && element.value.trim() !== '') {
        // Special validation for ID Card - check if it has 13 digits
        if (fieldId === 'customerIdCard') {
          const digits = element.value.replace(/\D/g, '');
          isFieldComplete = digits.length === 13;
        }
        // Special validation for phone - check if it has 9-10 digits
        else if (fieldId === 'customerPhone') {
          const digits = element.value.replace(/\D/g, '');
          isFieldComplete = digits.length >= 9 && digits.length <= 10;
        }
        // Regular validation for other fields
        else {
          isFieldComplete = true;
        }
      }

      if (!isFieldComplete) {
        missing.push(fieldNames[fieldId] || fieldId);
      }
    });

    return missing;
  }

  updateNextButton(progress) {
    if (!this.nextButton) return;

    const canProceed = progress.required.percentage === 100;

    this.nextButton.disabled = !canProceed;

    if (canProceed) {
      this.nextButton.classList.remove('btn-disabled', 'cursor-not-allowed');
      this.nextButton.classList.add('btn-primary');
      this.nextButton.innerHTML = '<i class="bi bi-arrow-right mr-2"></i> ไปขั้นตอนถัดไป';
    } else {
      this.nextButton.classList.add('btn-disabled', 'cursor-not-allowed');
      this.nextButton.classList.remove('btn-primary');
      this.nextButton.innerHTML = '<i class="bi bi-exclamation-circle mr-2"></i> กรุณากรอกข้อมูลให้ครบถ้วน';
    }
  }

  // Public method to manually trigger progress update
  refresh() {
    this.updateProgress();
  }

  // Get current progress data
  getProgress() {
    return this.calculateProgress();
  }

  // Check if form is ready for next step
  isReady() {
    const progress = this.calculateProgress();
    return progress.required.percentage === 100;
  }

  // Get validation summary
  getValidationSummary() {
    const progress = this.calculateProgress();
    const missing = this.getMissingRequiredFields();

    return {
      isValid: progress.required.percentage === 100,
      totalProgress: progress.total,
      missingFields: missing,
      completedSections: {
        required: progress.required.percentage === 100,
        optional: progress.optional.percentage > 0,
        documents: progress.documents.percentage > 0
      }
    };
  }

  // Debug function to check field values
  debugFieldValues() {
    console.log('🔍 Form Progress Debug:');

    this.requiredFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        let status = '';
        let value = element.value;

        if (fieldId === 'customerIdCard') {
          const digits = value.replace(/\D/g, '');
          status = `Original: "${value}", Digits: "${digits}", Length: ${digits.length}, Valid: ${digits.length === 13}`;
        } else if (fieldId === 'customerPhone') {
          const digits = value.replace(/\D/g, '');
          status = `Original: "${value}", Digits: "${digits}", Length: ${digits.length}, Valid: ${digits.length >= 9 && digits.length <= 10}`;
        } else {
          status = `Value: "${value}", Valid: ${value.trim() !== ''}`;
        }

        console.log(`  ${fieldId}: ${status}`);
      } else {
        console.log(`  ${fieldId}: Element not found`);
      }
    });

    const progress = this.calculateProgress();
    console.log('Progress:', progress);
    console.log('Missing fields:', this.getMissingRequiredFields());
  }
}

// Make it globally available
window.FormProgressManager = FormProgressManager;

// Auto-initialize if updateFormProgress function is called
window.updateFormProgress = function() {
  if (window.formProgressManager) {
    window.formProgressManager.refresh();
  }
};