/**
 * LocalStorage Data Validation and Integrity for Thai Accounting System
 * =====================================================================
 *
 * Comprehensive localStorage management with security, validation,
 * and data integrity features for the installment flow.
 *
 * Features:
 * - Data validation before storage
 * - Integrity checks with checksums
 * - Automatic data corruption detection
 * - Secure data sanitization
 * - Age-based expiration
 * - Migration and cleanup utilities
 * - Thai language error messages
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Import security utilities
    const Security = global.FrontendSecurity || {};
    const XSS = Security.XSSPrevention || {};
    const ErrorHandler = Security.ErrorHandler || {};

    /**
     * Enhanced localStorage manager with validation and integrity
     */
    const LocalStorageValidator = {
        // Configuration
        config: {
            maxItemSize: 5 * 1024 * 1024, // 5MB per item
            maxTotalSize: 50 * 1024 * 1024, // 50MB total
            defaultExpiry: 24 * 60 * 60 * 1000, // 24 hours
            checksumAlgorithm: 'djb2', // Simple hash algorithm
            migrationVersion: '1.0.0',
            installmentDataKeys: [
                'installmentData',
                'cartItems',
                'cartData',
                'step1_selectedProducts',
                'customer_data',
                'customer_idCard',
                'customer_selfie',
                'customerSignature',
                'witness_data',
                'bad_debt_check',
                'quotation_data'
            ]
        },

        // Statistics tracking
        stats: {
            validItems: 0,
            corruptedItems: 0,
            expiredItems: 0,
            lastCleanup: null
        },

        /**
         * Validate data before storage
         * @param {any} data - Data to validate
         * @param {string} key - Storage key for context
         * @returns {object} - Validation result
         */
        validateData: function(data, key) {
            try {
                // Check if data exists
                if (data === null || data === undefined) {
                    return { isValid: false, error: 'ข้อมูลว่างเปล่า' };
                }

                // Serialize data to check size and content
                const serialized = JSON.stringify(data);

                // Check data size
                if (serialized.length > this.config.maxItemSize) {
                    return {
                        isValid: false,
                        error: `ข้อมูลมีขนาดใหญ่เกินไป (${this.formatBytes(serialized.length)} > ${this.formatBytes(this.config.maxItemSize)})`
                    };
                }

                // Check for potentially dangerous content
                const dangerousPatterns = [
                    /<script[^>]*>.*<\/script>/gi,
                    /javascript:/gi,
                    /data:text\/html/gi,
                    /vbscript:/gi,
                    /onload=/gi,
                    /onerror=/gi
                ];

                for (const pattern of dangerousPatterns) {
                    if (pattern.test(serialized)) {
                        console.warn('⚠️ Potentially dangerous content detected in:', key);
                        return { isValid: false, error: 'พบเนื้อหาที่อาจเป็นอันตราย' };
                    }
                }

                // Validate installment-specific data structure
                if (this.config.installmentDataKeys.includes(key)) {
                    const structureResult = this.validateInstallmentDataStructure(data, key);
                    if (!structureResult.isValid) {
                        return structureResult;
                    }
                }

                // Check total localStorage usage
                const totalUsage = this.calculateTotalUsage() + serialized.length;
                if (totalUsage > this.config.maxTotalSize) {
                    return {
                        isValid: false,
                        error: `พื้นที่จัดเก็บข้อมูลเต็ม (${this.formatBytes(totalUsage)} > ${this.formatBytes(this.config.maxTotalSize)})`
                    };
                }

                return { isValid: true, serializedSize: serialized.length };

            } catch (error) {
                console.error('❌ Data validation error:', error);
                return { isValid: false, error: 'ข้อมูลไม่ถูกต้อง' };
            }
        },

        /**
         * Validate installment-specific data structures
         * @param {any} data - Data to validate
         * @param {string} key - Storage key
         * @returns {object} - Validation result
         */
        validateInstallmentDataStructure: function(data, key) {
            try {
                switch (key) {
                    case 'installmentData':
                        return this.validateInstallmentData(data);

                    case 'cartItems':
                    case 'cartData':
                    case 'step1_selectedProducts':
                        return this.validateCartData(data);

                    case 'customer_data':
                        return this.validateCustomerData(data);

                    case 'witness_data':
                        return this.validateWitnessData(data);

                    case 'bad_debt_check':
                        return this.validateBadDebtData(data);

                    default:
                        return { isValid: true };
                }
            } catch (error) {
                return { isValid: false, error: 'โครงสร้างข้อมูลไม่ถูกต้อง' };
            }
        },

        /**
         * Validate main installment data structure
         * @param {object} data - Installment data
         * @returns {object} - Validation result
         */
        validateInstallmentData: function(data) {
            if (!data || typeof data !== 'object') {
                return { isValid: false, error: 'ข้อมูลการผ่อนชำระไม่ถูกต้อง' };
            }

            // Check required top-level structure
            const requiredKeys = ['step1', 'step2', 'step3', 'step4'];
            for (const key of requiredKeys) {
                if (!data[key]) {
                    data[key] = { data: {}, completed: false };
                }
            }

            // Validate each step data
            for (const stepKey of requiredKeys) {
                const stepData = data[stepKey];
                if (stepData && typeof stepData !== 'object') {
                    return { isValid: false, error: `ข้อมูล ${stepKey} ไม่ถูกต้อง` };
                }
            }

            return { isValid: true };
        },

        /**
         * Validate cart data structure
         * @param {Array} data - Cart items
         * @returns {object} - Validation result
         */
        validateCartData: function(data) {
            if (!Array.isArray(data)) {
                return { isValid: false, error: 'ข้อมูลตะกร้าสินค้าต้องเป็น Array' };
            }

            if (data.length > 100) {
                return { isValid: false, error: 'จำนวนสินค้าในตะกร้าเกินขีดจำกัด (100 รายการ)' };
            }

            // Validate each cart item
            for (let i = 0; i < data.length; i++) {
                const item = data[i];

                if (!item || typeof item !== 'object') {
                    return { isValid: false, error: `สินค้าลำดับที่ ${i + 1} ไม่ถูกต้อง` };
                }

                // Check required fields
                const requiredFields = ['id', 'name', 'price', 'quantity'];
                for (const field of requiredFields) {
                    if (item[field] === undefined || item[field] === null) {
                        return { isValid: false, error: `สินค้าลำดับที่ ${i + 1} ขาดข้อมูล ${field}` };
                    }
                }

                // Validate numeric fields
                if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                    return { isValid: false, error: `ราคาสินค้าลำดับที่ ${i + 1} ไม่ถูกต้อง` };
                }

                if (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
                    return { isValid: false, error: `จำนวนสินค้าลำดับที่ ${i + 1} ไม่ถูกต้อง` };
                }
            }

            return { isValid: true };
        },

        /**
         * Validate customer data structure
         * @param {object} data - Customer data
         * @returns {object} - Validation result
         */
        validateCustomerData: function(data) {
            if (!data || typeof data !== 'object') {
                return { isValid: false, error: 'ข้อมูลลูกค้าไม่ถูกต้อง' };
            }

            // Check for sensitive data that shouldn't be in localStorage
            const sensitiveFields = ['password', 'pin', 'creditCardNumber', 'bankAccountNumber'];
            for (const field of sensitiveFields) {
                if (data[field]) {
                    console.warn('⚠️ Sensitive data found in customer data:', field);
                    return { isValid: false, error: 'พบข้อมูลที่มีความลับในข้อมูลลูกค้า' };
                }
            }

            // Validate ID card format if present
            if (data.idCard) {
                const idCardValidation = Security.FormValidator?.validateIdCard(data.idCard);
                if (idCardValidation && !idCardValidation.isValid) {
                    return { isValid: false, error: 'เลขบัตรประชาชนไม่ถูกต้อง' };
                }
            }

            // Validate phone number if present
            if (data.phone) {
                const phoneValidation = Security.FormValidator?.validatePhone(data.phone);
                if (phoneValidation && !phoneValidation.isValid) {
                    return { isValid: false, error: 'หมายเลขโทรศัพท์ไม่ถูกต้อง' };
                }
            }

            return { isValid: true };
        },

        /**
         * Validate witness data structure
         * @param {object} data - Witness data
         * @returns {object} - Validation result
         */
        validateWitnessData: function(data) {
            if (!data || typeof data !== 'object') {
                return { isValid: true }; // Witness is optional
            }

            // Validate required fields if witness data exists
            if (data.firstName || data.lastName || data.phone) {
                const requiredFields = ['firstName', 'lastName'];
                for (const field of requiredFields) {
                    if (!data[field] || typeof data[field] !== 'string') {
                        return { isValid: false, error: `ข้อมูลพยาน: ${field} ไม่ถูกต้อง` };
                    }
                }
            }

            return { isValid: true };
        },

        /**
         * Validate bad debt check data
         * @param {object} data - Bad debt data
         * @returns {object} - Validation result
         */
        validateBadDebtData: function(data) {
            if (!data || typeof data !== 'object') {
                return { isValid: false, error: 'ข้อมูลการตรวจสอบหนี้สูญไม่ถูกต้อง' };
            }

            // Check required fields
            const requiredFields = ['idCard', 'result', 'checkedAt'];
            for (const field of requiredFields) {
                if (!data[field]) {
                    return { isValid: false, error: `ข้อมูลการตรวจสอบหนี้สูญขาด ${field}` };
                }
            }

            // Validate timestamp
            const checkedAt = new Date(data.checkedAt);
            if (isNaN(checkedAt.getTime())) {
                return { isValid: false, error: 'เวลาการตรวจสอบไม่ถูกต้อง' };
            }

            return { isValid: true };
        },

        /**
         * Calculate total localStorage usage
         * @returns {number} - Total bytes used
         */
        calculateTotalUsage: function() {
            let totalSize = 0;

            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += key.length + value.length;
                    }
                }
            } catch (error) {
                console.error('❌ Error calculating localStorage usage:', error);
            }

            return totalSize;
        },

        /**
         * Format bytes to human readable string
         * @param {number} bytes - Bytes to format
         * @returns {string} - Formatted string
         */
        formatBytes: function(bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        /**
         * Generate checksum for data integrity
         * @param {string} data - Data to checksum
         * @returns {string} - Checksum
         */
        generateChecksum: function(data) {
            // DJB2 hash algorithm (simple and fast)
            let hash = 5381;
            for (let i = 0; i < data.length; i++) {
                hash = ((hash << 5) + hash) + data.charCodeAt(i);
            }
            return hash >>> 0; // Convert to unsigned 32-bit integer
        },

        /**
         * Create storage envelope with metadata
         * @param {any} data - Data to store
         * @param {object} options - Storage options
         * @returns {object} - Storage envelope
         */
        createStorageEnvelope: function(data, options = {}) {
            const serializedData = JSON.stringify(data);
            const now = Date.now();

            return {
                version: this.config.migrationVersion,
                data: data,
                metadata: {
                    createdAt: now,
                    updatedAt: now,
                    expiresAt: now + (options.ttl || this.config.defaultExpiry),
                    checksum: this.generateChecksum(serializedData),
                    size: serializedData.length,
                    type: typeof data,
                    isArray: Array.isArray(data)
                },
                integrity: {
                    validated: true,
                    lastValidation: now,
                    validationCount: 1
                }
            };
        },

        /**
         * Verify storage envelope integrity
         * @param {object} envelope - Storage envelope
         * @returns {object} - Verification result
         */
        verifyEnvelope: function(envelope) {
            try {
                if (!envelope || typeof envelope !== 'object') {
                    return { isValid: false, error: 'ซองข้อมูลไม่ถูกต้อง' };
                }

                // Check required envelope structure
                if (!envelope.data || !envelope.metadata || !envelope.integrity) {
                    return { isValid: false, error: 'โครงสร้างซองข้อมูลไม่ครบถ้วน' };
                }

                // Check expiration
                const now = Date.now();
                if (envelope.metadata.expiresAt && now > envelope.metadata.expiresAt) {
                    return { isValid: false, error: 'ข้อมูลหมดอายุ', expired: true };
                }

                // Verify checksum
                const currentChecksum = this.generateChecksum(JSON.stringify(envelope.data));
                if (currentChecksum !== envelope.metadata.checksum) {
                    return { isValid: false, error: 'ข้อมูลเสียหาย (checksum ไม่ตรงกัน)', corrupted: true };
                }

                // Validate data structure
                const dataValidation = this.validateData(envelope.data, 'unknown');
                if (!dataValidation.isValid) {
                    return { isValid: false, error: dataValidation.error };
                }

                return { isValid: true };

            } catch (error) {
                console.error('❌ Envelope verification error:', error);
                return { isValid: false, error: 'ไม่สามารถตรวจสอบความถูกต้องได้' };
            }
        },

        /**
         * Safely store data with validation
         * @param {string} key - Storage key
         * @param {any} data - Data to store
         * @param {object} options - Storage options
         * @returns {boolean} - Success status
         */
        setItem: function(key, data, options = {}) {
            try {
                // Sanitize key
                const sanitizedKey = XSS.sanitizeInput(key);
                if (!sanitizedKey) {
                    console.error('❌ Invalid storage key');
                    return false;
                }

                // Validate data
                const validation = this.validateData(data, sanitizedKey);
                if (!validation.isValid) {
                    console.error('❌ Data validation failed:', validation.error);
                    if (ErrorHandler.showToast) {
                        ErrorHandler.showToast(`ไม่สามารถบันทึกข้อมูลได้: ${validation.error}`, 'error');
                    }
                    return false;
                }

                // Create storage envelope
                const envelope = this.createStorageEnvelope(data, options);

                // Store with retry logic
                const maxRetries = 3;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        localStorage.setItem(sanitizedKey, JSON.stringify(envelope));
                        this.stats.validItems++;
                        console.info(`✅ Data stored successfully: ${sanitizedKey} (${this.formatBytes(validation.serializedSize)})`);
                        return true;
                    } catch (storageError) {
                        console.warn(`⚠️ Storage attempt ${attempt} failed:`, storageError.message);

                        if (storageError.name === 'QuotaExceededError') {
                            // Try to free up space
                            this.cleanup(true);

                            if (attempt === maxRetries) {
                                if (ErrorHandler.showToast) {
                                    ErrorHandler.showToast('พื้นที่จัดเก็บข้อมูลเต็ม กรุณาลบข้อมูลเก่า', 'error');
                                }
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }
                }

                return false;

            } catch (error) {
                console.error('❌ setItem error:', error);
                return false;
            }
        },

        /**
         * Safely retrieve data with validation
         * @param {string} key - Storage key
         * @returns {any} - Retrieved data or null
         */
        getItem: function(key) {
            try {
                const sanitizedKey = XSS.sanitizeInput(key);
                const stored = localStorage.getItem(sanitizedKey);

                if (!stored) return null;

                const envelope = JSON.parse(stored);
                const verification = this.verifyEnvelope(envelope);

                if (!verification.isValid) {
                    console.warn(`⚠️ Data integrity check failed for ${sanitizedKey}:`, verification.error);

                    if (verification.expired) {
                        this.removeItem(sanitizedKey);
                        this.stats.expiredItems++;
                    } else if (verification.corrupted) {
                        this.removeItem(sanitizedKey);
                        this.stats.corruptedItems++;
                    }

                    return null;
                }

                // Update access statistics
                envelope.integrity.lastValidation = Date.now();
                envelope.integrity.validationCount++;

                // Update stored envelope with new stats
                localStorage.setItem(sanitizedKey, JSON.stringify(envelope));

                return envelope.data;

            } catch (error) {
                console.error('❌ getItem error:', error);
                return null;
            }
        },

        /**
         * Remove item from storage
         * @param {string} key - Storage key
         */
        removeItem: function(key) {
            try {
                const sanitizedKey = XSS.sanitizeInput(key);
                localStorage.removeItem(sanitizedKey);
                console.info(`🗑️ Removed storage item: ${sanitizedKey}`);
            } catch (error) {
                console.error('❌ removeItem error:', error);
            }
        },

        /**
         * Cleanup expired and corrupted data
         * @param {boolean} aggressive - Perform aggressive cleanup
         */
        cleanup: function(aggressive = false) {
            console.info('🧹 Starting localStorage cleanup...');

            const keysToRemove = [];
            const now = Date.now();
            let freedSpace = 0;

            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;

                    const stored = localStorage.getItem(key);
                    if (!stored) continue;

                    try {
                        const envelope = JSON.parse(stored);
                        const verification = this.verifyEnvelope(envelope);

                        // Mark for removal if invalid
                        if (!verification.isValid) {
                            keysToRemove.push(key);
                            freedSpace += stored.length;
                            continue;
                        }

                        // Aggressive cleanup for quota issues
                        if (aggressive) {
                            // Remove items not accessed recently
                            const lastAccess = envelope.integrity.lastValidation || envelope.metadata.createdAt;
                            const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);

                            if (daysSinceAccess > 7) {
                                keysToRemove.push(key);
                                freedSpace += stored.length;
                            }
                        }

                    } catch (parseError) {
                        // Corrupted JSON
                        keysToRemove.push(key);
                        freedSpace += stored.length;
                    }
                }

                // Remove identified items
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                });

                this.stats.lastCleanup = now;

                console.info(`✅ Cleanup completed: ${keysToRemove.length} items removed, ${this.formatBytes(freedSpace)} freed`);

            } catch (error) {
                console.error('❌ Cleanup error:', error);
            }
        },

        /**
         * Get storage statistics
         * @returns {object} - Storage statistics
         */
        getStats: function() {
            const totalUsage = this.calculateTotalUsage();
            const usagePercentage = (totalUsage / this.config.maxTotalSize) * 100;

            return {
                ...this.stats,
                totalUsage: totalUsage,
                totalUsageFormatted: this.formatBytes(totalUsage),
                usagePercentage: Math.round(usagePercentage * 100) / 100,
                maxSize: this.config.maxTotalSize,
                maxSizeFormatted: this.formatBytes(this.config.maxTotalSize),
                itemCount: localStorage.length
            };
        },

        /**
         * Initialize localStorage validation
         */
        initialize: function() {
            console.info('💾 Initializing localStorage validation...');

            // Perform initial cleanup
            this.cleanup();

            // Setup periodic cleanup
            setInterval(() => {
                this.cleanup();
            }, 60 * 60 * 1000); // Every hour

            // Monitor storage usage
            const checkUsage = () => {
                const stats = this.getStats();
                if (stats.usagePercentage > 80) {
                    console.warn(`⚠️ localStorage usage high: ${stats.usagePercentage}%`);
                    if (ErrorHandler.showToast) {
                        ErrorHandler.showToast('พื้นที่จัดเก็บข้อมูลใกล้เต็ม', 'warning');
                    }
                }
            };

            setInterval(checkUsage, 5 * 60 * 1000); // Every 5 minutes

            console.info('✅ localStorage validation initialized');
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            LocalStorageValidator.initialize();
        });
    } else {
        LocalStorageValidator.initialize();
    }

    // Export to global scope
    global.LocalStorageValidator = LocalStorageValidator;

    console.info('💾 LocalStorage Validation v1.0.0 loaded');

})(window);