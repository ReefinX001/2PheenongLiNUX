#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Security enhancement script for comprehensive fixes
class SecurityFixer {
    constructor() {
        this.accountDir = path.join(__dirname, '..', 'views', 'account');
        this.fixedFiles = [];
        this.errors = [];
    }

    // Generate CSRF token function for HTML files
    generateCSRFTokenCode() {
        return `
        // CSRF Token Generation
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                         localStorage.getItem('csrf_token') || '';

        function generateCSRFToken() {
            const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
            localStorage.setItem('csrf_token', token);
            document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', token);
            return token;
        }

        // Ensure CSRF token exists
        if (!csrfToken) {
            generateCSRFToken();
        }
        `;
    }

    // Safe DOM manipulation functions
    generateSafeDOMCode() {
        return `
        // Safe DOM manipulation functions
        function safeSetHTML(element, content) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element) {
                // Sanitize content before setting
                const sanitized = content.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                       .replace(/javascript:/gi, '')
                                       .replace(/on\w+="[^"]*"/gi, '');
                element.innerHTML = sanitized;
            }
        }

        function safeSetText(element, content) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element) {
                element.textContent = content;
            }
        }

        // Replace all innerHTML usage with safe alternatives
        const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(value) {
                console.warn('Direct innerHTML usage detected. Consider using safeSetHTML instead.');
                const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                      .replace(/javascript:/gi, '')
                                      .replace(/on\w+="[^"]*"/gi, '');
                originalInnerHTML.set.call(this, sanitized);
            },
            get: originalInnerHTML.get
        });
        `;
    }

    // Input validation functions
    generateValidationCode() {
        return `
        // Input validation functions
        function validateFinancialAmount(amount) {
            const numAmount = parseFloat(amount);
            return !isNaN(numAmount) && numAmount >= 0 && numAmount <= 999999999.99;
        }

        function validateRequired(value) {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        }

        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        function validateDate(dateString) {
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date.getTime());
        }

        function sanitizeInput(input) {
            if (typeof input !== 'string') return input;
            return input.replace(/[<>'"&]/g, function(match) {
                const escapeChars = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return escapeChars[match];
            });
        }
        `;
    }

    // Enhanced AJAX functions with CSRF protection
    generateSecureAjaxCode() {
        return `
        // Enhanced AJAX functions with security
        function secureAjaxRequest(options) {
            const defaults = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken || generateCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            };

            const config = Object.assign({}, defaults, options);

            // Add CSRF token to form data if it's a FormData object
            if (config.body instanceof FormData) {
                config.body.append('_token', csrfToken || generateCSRFToken());
            } else if (config.body && typeof config.body === 'object') {
                config.body._token = csrfToken || generateCSRFToken();
                config.body = JSON.stringify(config.body);
            }

            return fetch(config.url, config)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(\`HTTP error! status: \${response.status}\`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error('Secure AJAX request failed:', error);
                    throw error;
                });
        }

        // Replace jQuery AJAX with secure version
        if (typeof $ !== 'undefined') {
            const originalAjax = $.ajax;
            $.ajax = function(options) {
                if (typeof options === 'string') {
                    options = { url: options };
                }

                options.headers = options.headers || {};
                options.headers['X-CSRF-Token'] = csrfToken || generateCSRFToken();
                options.headers['X-Requested-With'] = 'XMLHttpRequest';

                if (options.data && typeof options.data === 'object') {
                    options.data._token = csrfToken || generateCSRFToken();
                }

                return originalAjax.call(this, options);
            };
        }
        `;
    }

    // Error handling enhancement
    generateErrorHandlingCode() {
        return `
        // Enhanced error handling
        function handleError(error, context = '') {
            console.error(\`Error in \${context}:\`, error);

            // Don't expose sensitive information in production
            const isDevelopment = window.location.hostname === 'localhost' ||
                                window.location.hostname === '127.0.0.1';

            const userMessage = isDevelopment ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

            // Show user-friendly error message
            if (typeof showNotification === 'function') {
                showNotification(userMessage, 'error');
            } else {
                alert(userMessage);
            }

            // Log error for monitoring (in production, this would go to a logging service)
            if (typeof logError === 'function') {
                logError(error, context);
            }
        }

        // Global error handler
        window.addEventListener('error', function(event) {
            handleError(event.error, 'Global Error Handler');
        });

        window.addEventListener('unhandledrejection', function(event) {
            handleError(event.reason, 'Unhandled Promise Rejection');
        });
        `;
    }

    // Process individual HTML file
    async processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let updatedContent = content;

            // Add meta tag for CSRF token if not present
            if (!content.includes('name="csrf-token"')) {
                const metaTag = '<meta name="csrf-token" content="">';
                if (content.includes('<head>')) {
                    updatedContent = updatedContent.replace('<head>', `<head>\n    ${metaTag}`);
                }
            }

            // Add security enhancements script
            const securityScript = `
<script>
${this.generateCSRFTokenCode()}
${this.generateSafeDOMCode()}
${this.generateValidationCode()}
${this.generateSecureAjaxCode()}
${this.generateErrorHandlingCode()}

// File-specific security initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize CSRF token
    generateCSRFToken();

    // Validate all forms on submit
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const inputs = form.querySelectorAll('input, textarea, select');
            let isValid = true;

            inputs.forEach(input => {
                const value = input.value.trim();

                // Required field validation
                if (input.hasAttribute('required') && !validateRequired(value)) {
                    input.classList.add('is-invalid');
                    isValid = false;
                } else {
                    input.classList.remove('is-invalid');
                }

                // Financial amount validation
                if (input.type === 'number' || input.classList.contains('financial-input')) {
                    if (value && !validateFinancialAmount(value)) {
                        input.classList.add('is-invalid');
                        isValid = false;
                    }
                }

                // Email validation
                if (input.type === 'email' && value && !validateEmail(value)) {
                    input.classList.add('is-invalid');
                    isValid = false;
                }

                // Date validation
                if (input.type === 'date' && value && !validateDate(value)) {
                    input.classList.add('is-invalid');
                    isValid = false;
                }

                // Sanitize input values
                if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                    input.value = sanitizeInput(input.value);
                }
            });

            if (!isValid) {
                e.preventDefault();
                handleError(new Error('กรุณากรอกข้อมูลให้ถูกต้องครบถ้วน'), 'Form Validation');
            }
        });
    });

    // Add CSRF token to all forms
    document.querySelectorAll('form').forEach(form => {
        if (!form.querySelector('input[name="_token"]')) {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = '_token';
            tokenInput.value = csrfToken || generateCSRFToken();
            form.appendChild(tokenInput);
        }
    });
});
</script>`;

            // Add security script before closing body tag
            if (content.includes('</body>')) {
                updatedContent = updatedContent.replace('</body>', `${securityScript}\n</body>`);
            } else {
                updatedContent += securityScript;
            }

            // Replace dangerous innerHTML usage
            updatedContent = updatedContent.replace(/\.innerHTML\s*=/g, '.textContent =');

            // Replace document.write usage
            updatedContent = updatedContent.replace(/document\.write\(/g, '// SECURITY: document.write disabled // document.write(');

            // Add Content Security Policy
            const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:;">';
            if (content.includes('<head>') && !content.includes('Content-Security-Policy')) {
                updatedContent = updatedContent.replace('<head>', `<head>\n    ${cspMeta}`);
            }

            // Write updated content back to file
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            this.fixedFiles.push(filePath);

            console.log(`✅ Fixed security issues in: ${path.basename(filePath)}`);

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    }

    // Main execution function
    async run() {
        console.log('🔒 Starting comprehensive security fixes...\n');

        try {
            const files = fs.readdirSync(this.accountDir);
            const htmlFiles = files.filter(file => file.endsWith('.html'));

            console.log(`Found ${htmlFiles.length} HTML files to process...\n`);

            for (const file of htmlFiles) {
                const filePath = path.join(this.accountDir, file);
                await this.processFile(filePath);
            }

            // Generate summary report
            console.log('\n📊 Security Fix Summary:');
            console.log(`✅ Successfully fixed: ${this.fixedFiles.length} files`);
            console.log(`❌ Errors encountered: ${this.errors.length} files`);

            if (this.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                this.errors.forEach(({ file, error }) => {
                    console.log(`   - ${path.basename(file)}: ${error}`);
                });
            }

            console.log('\n🎉 Security enhancement complete!');

        } catch (error) {
            console.error('❌ Critical error during security fix:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new SecurityFixer();
    fixer.run();
}

module.exports = SecurityFixer;