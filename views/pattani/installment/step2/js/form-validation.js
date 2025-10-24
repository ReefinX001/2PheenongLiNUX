// ======================= FORM VALIDATION =======================

const formValidation = {
  // Validate form fields
  validateForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return { isValid: false, errors: ['Form not found'] };

    const errors = [];
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
      if (!this.isFieldValid(field)) {
        const fieldName = this.getFieldName(field);
        errors.push(`กรุณากรอก${fieldName}`);
        this.markFieldInvalid(field);
      } else {
        this.markFieldValid(field);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  // Check if field is valid
  isFieldValid(field) {
    if (!field.value.trim()) return false;

    // Special validations
    if (field.type === 'email') {
      return validateEmail(field.value);
    }

    if (field.classList.contains('id-card')) {
      return validateIdCard(field.value);
    }

    if (field.classList.contains('phone')) {
      return validatePhone(field.value);
    }

    return true;
  },

  // Get field display name
  getFieldName(field) {
    return field.getAttribute('data-name') ||
           field.getAttribute('placeholder') ||
           field.name ||
           field.id ||
           'ฟิลด์นี้';
  },

  // Mark field as invalid
  markFieldInvalid(field) {
    field.classList.add('border-red-500');
    field.classList.remove('border-green-500');
  },

  // Mark field as valid
  markFieldValid(field) {
    field.classList.add('border-green-500');
    field.classList.remove('border-red-500');
  },

  // Clear field validation
  clearFieldValidation(field) {
    field.classList.remove('border-red-500', 'border-green-500');
  }
};

// Export to global scope
window.formValidation = formValidation;