// Validation Utility Functions
class ValidationUtils {
    // Email validation
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone number validation (Thai format)
    static isValidPhoneNumber(phone) {
        // Remove all non-digit characters
        const cleanPhone = phone.replace(/\D/g, '');

        // Check for Thai phone number patterns
        const thaiPhoneRegex = /^(0[689]\d{8}|0[2-7]\d{7})$/;
        return thaiPhoneRegex.test(cleanPhone);
    }

    // URL validation
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Required field validation
    static isRequired(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }

    // String length validation
    static isValidLength(value, min = 0, max = Infinity) {
        if (typeof value !== 'string') return false;
        const length = value.trim().length;
        return length >= min && length <= max;
    }

    // Number validation
    static isValidNumber(value, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // Integer validation
    static isValidInteger(value, min = -Infinity, max = Infinity) {
        const num = parseInt(value);
        return !isNaN(num) && num === parseFloat(value) && num >= min && num <= max;
    }

    // Price validation (Thai Baht)
    static isValidPrice(value) {
        const price = parseFloat(value);
        return !isNaN(price) && price >= 0;
    }

    // Image file validation
    static isValidImageFile(file) {
        if (!file) return false;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    // Video file validation
    static isValidVideoFile(file) {
        if (!file) return false;

        const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
        const maxSize = 104857600; // 100MB in bytes (100 * 1024 * 1024)

        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    // Google Drive URL validation
    static isValidGoogleDriveUrl(url) {
        if (!this.isValidUrl(url)) return false;
        return url.includes('drive.google.com');
    }

    // Google Apps Script URL validation
    static isValidGoogleAppsScriptUrl(url) {
        if (!this.isValidUrl(url)) return false;
        return url.includes('script.google.com/macros');
    }

    // Product data validation
    static validateProduct(product) {
        const errors = [];

        if (!this.isRequired(product.name)) {
            errors.push('ชื่อสินค้าเป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(product.name, 2, 100)) {
            errors.push('ชื่อสินค้าต้องมีความยาว 2-100 ตัวอักษร');
        }

        if (!this.isRequired(product.tagline)) {
            errors.push('คำอธิบายสินค้าเป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(product.tagline, 5, 200)) {
            errors.push('คำอธิบายสินค้าต้องมีความยาว 5-200 ตัวอักษร');
        }

        if (product.image && !this.isValidUrl(product.image)) {
            errors.push('URL รูปภาพไม่ถูกต้อง');
        }

        if (!Array.isArray(product.storage) || product.storage.length === 0) {
            errors.push('ต้องมีขนาดความจำอย่างน้อย 1 รายการ');
        } else {
            product.storage.forEach((storage, index) => {
                if (!this.isRequired(storage.capacity)) {
                    errors.push(`ขนาดความจำรายการที่ ${index + 1} เป็นสิ่งจำเป็น`);
                }
                if (!this.isValidPrice(storage.price)) {
                    errors.push(`ราคารายการที่ ${index + 1} ไม่ถูกต้อง`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Company information validation
    static validateCompanyInfo(company) {
        const errors = [];

        if (!this.isRequired(company.name)) {
            errors.push('ชื่อบริษัทเป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(company.name, 3, 100)) {
            errors.push('ชื่อบริษัทต้องมีความยาว 3-100 ตัวอักษร');
        }

        if (!this.isRequired(company.phone)) {
            errors.push('เบอร์โทรเป็นสิ่งจำเป็น');
        } else if (!this.isValidPhoneNumber(company.phone)) {
            errors.push('เบอร์โทรไม่ถูกต้อง');
        }

        if (company.email && !this.isValidEmail(company.email)) {
            errors.push('อีเมลไม่ถูกต้อง');
        }

        if (!this.isRequired(company.address)) {
            errors.push('ที่อยู่เป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(company.address, 10, 500)) {
            errors.push('ที่อยู่ต้องมีความยาว 10-500 ตัวอักษร');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Review settings validation
    static validateReviewSettings(settings) {
        const errors = [];

        if (!this.isRequired(settings.folderId)) {
            errors.push('Google Drive Folder ID เป็นสิ่งจำเป็น');
        }

        if (!this.isRequired(settings.appsScriptUrl)) {
            errors.push('Google Apps Script URL เป็นสิ่งจำเป็น');
        } else if (!this.isValidGoogleAppsScriptUrl(settings.appsScriptUrl)) {
            errors.push('Google Apps Script URL ไม่ถูกต้อง');
        }

        if (settings.refreshInterval && !this.isValidInteger(settings.refreshInterval, 30000, 3600000)) {
            errors.push('ช่วงเวลารีเฟรชต้องอยู่ระหว่าง 30 วินาที - 1 ชั่วโมง');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Contact form validation
    static validateContactForm(contact) {
        const errors = [];

        if (!this.isRequired(contact.name)) {
            errors.push('ชื่อเป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(contact.name, 2, 50)) {
            errors.push('ชื่อต้องมีความยาว 2-50 ตัวอักษร');
        }

        if (contact.email && !this.isValidEmail(contact.email)) {
            errors.push('อีเมลไม่ถูกต้อง');
        }

        if (!this.isRequired(contact.phone)) {
            errors.push('เบอร์โทรเป็นสิ่งจำเป็น');
        } else if (!this.isValidPhoneNumber(contact.phone)) {
            errors.push('เบอร์โทรไม่ถูกต้อง');
        }

        if (!this.isRequired(contact.message)) {
            errors.push('ข้อความเป็นสิ่งจำเป็น');
        } else if (!this.isValidLength(contact.message, 10, 1000)) {
            errors.push('ข้อความต้องมีความยาว 10-1000 ตัวอักษร');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Sanitize input (remove potentially harmful characters)
    static sanitize(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
    }

    // Escape HTML characters
    static escapeHtml(text) {
        if (typeof text !== 'string') return text;

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Format Thai phone number
    static formatThaiPhoneNumber(phone) {
        const cleanPhone = phone.replace(/\D/g, '');

        if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
            // Mobile: 08X-XXX-XXXX
            return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
        } else if (cleanPhone.length === 8 && cleanPhone.startsWith('0')) {
            // Landline: 0X-XXX-XXXX
            return `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5)}`;
        }

        return phone; // Return original if can't format
    }

    // Currency formatter
    static formatCurrency(amount, currency = 'THB') {
        if (isNaN(amount)) return amount;

        const number = parseFloat(amount);

        if (currency === 'THB') {
            return `฿${number.toLocaleString('th-TH')}`;
        }

        return number.toLocaleString();
    }

    // Validate and format price input
    static validateAndFormatPrice(input) {
        // Remove non-numeric characters except decimal point
        const cleaned = input.replace(/[^\d.]/g, '');
        const number = parseFloat(cleaned);

        if (isNaN(number) || number < 0) {
            return { isValid: false, value: input, formatted: input };
        }

        return {
            isValid: true,
            value: number,
            formatted: this.formatCurrency(number)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
} else {
    window.ValidationUtils = ValidationUtils;
}
