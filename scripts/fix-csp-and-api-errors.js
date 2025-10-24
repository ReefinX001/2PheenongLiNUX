#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix CSP and API errors script
class CSPAndAPIFixer {
    constructor() {
        this.accountDir = path.join(__dirname, '..', 'views', 'account');
        this.fixedFiles = [];
        this.errors = [];
    }

    // Generate updated CSP that allows necessary external resources
    generateUpdatedCSP() {
        return `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;`;
    }

    // Fix API endpoint URLs to use relative paths
    fixAPIEndpoints(content) {
        // Fix common API endpoint issues
        const apiEndpointFixes = [
            {
                pattern: /fetch\(['"`]https?:\/\/www\.2pheenong\.com(\/api\/[^'"`]+)['"`]/g,
                replacement: "fetch('$1'"
            },
            {
                pattern: /fetch\(['"`]https?:\/\/[^\/]+\.com(\/api\/[^'"`]+)['"`]/g,
                replacement: "fetch('$1'"
            },
            {
                pattern: /[\w\s]*\.get\(['"`]https?:\/\/www\.2pheenong\.com(\/api\/[^'"`]+)['"`]/g,
                replacement: (match) => match.replace(/https?:\/\/www\.2pheenong\.com/, '')
            },
            {
                pattern: /const\s+apiUrl\s*=\s*['"`]https?:\/\/[^'"`]+['"`]/g,
                replacement: "const apiUrl = ''"
            }
        ];

        apiEndpointFixes.forEach(fix => {
            content = content.replace(fix.pattern, fix.replacement);
        });

        return content;
    }

    // Add error handling for API calls
    addAPIErrorHandling(content) {
        // Enhanced fetch wrapper with better error handling
        const enhancedFetchWrapper = `
    // Enhanced fetch wrapper with comprehensive error handling
    async function safeFetch(url, options = {}) {
        try {
            // Ensure URL is relative for same-origin requests
            if (url.startsWith('/api/')) {
                const baseUrl = window.location.origin;
                url = baseUrl + url;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const defaultOptions = {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            // Add CSRF token if available
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                defaultOptions.headers['X-CSRF-Token'] = csrfToken;
            }

            // Add auth token if available
            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                defaultOptions.headers['Authorization'] = \`Bearer \${authToken}\`;
            }

            const mergedOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...(options.headers || {})
                }
            };

            console.log('🌐 API Request:', url, mergedOptions);

            const response = await fetch(url, mergedOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = \`HTTP \${response.status}: \${response.statusText}\`;

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If response is not JSON, use status text
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('✅ API Response:', result);

            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ API Request timeout:', url);
                throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
            }

            console.error('❌ API Error:', error);

            // Handle specific error types
            if (error.message.includes('404')) {
                throw new Error('ไม่พบข้อมูลที่ต้องการ');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                throw new Error('ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่');
            } else if (error.message.includes('500')) {
                throw new Error('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');
            }

            throw error;
        }
    }

    // Replace existing fetch calls with safeFetch
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Use safeFetch for API calls
        if (typeof url === 'string' && url.includes('/api/')) {
            return safeFetch(url, options);
        }
        // Use original fetch for other requests
        return originalFetch.apply(this, arguments);
    };
`;

        // Add the enhanced fetch wrapper before existing script content
        if (!content.includes('safeFetch')) {
            const scriptInsertPoint = content.indexOf('<script>');
            if (scriptInsertPoint !== -1) {
                content = content.slice(0, scriptInsertPoint + 8) + enhancedFetchWrapper + content.slice(scriptInsertPoint + 8);
            }
        }

        return content;
    }

    // Fix CSP violations and API errors in HTML files
    async processFile(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            // Update CSP header
            const cspPattern = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;
            if (cspPattern.test(content)) {
                const newCSP = `<meta http-equiv="Content-Security-Policy" content="${this.generateUpdatedCSP()}">`;
                content = content.replace(cspPattern, newCSP);
                modified = true;
            }

            // Fix API endpoints
            const originalContent = content;
            content = this.fixAPIEndpoints(content);
            if (content !== originalContent) {
                modified = true;
            }

            // Add enhanced API error handling
            content = this.addAPIErrorHandling(content);
            modified = true;

            // Fix specific issues in purchase_product.html
            if (filePath.includes('purchase_product.html')) {
                // Fix the fetchUserProfile function to handle 404 errors gracefully
                content = content.replace(
                    /async function fetchUserProfile\(\) {[\s\S]*?} catch \(error\) {[\s\S]*?}\s*}/,
                    `async function fetchUserProfile() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('No authentication token found');
                loadFallbackUserData();
                return;
            }

            const response = await safeFetch('/api/users/me');

            if (response.success) {
                const userData = response.data || {};
                const userName = (userData.name || userData.username || 'ผู้ใช้').trim();
                const photoUrl = userData.photoUrl || userData.employee?.imageUrl || null;

                updateUserInterface(userName, photoUrl);
                localStorage.setItem('userName', userName);
                if (photoUrl) localStorage.setItem('userPhoto', photoUrl);
            } else {
                throw new Error(response.message || 'Failed to load profile data');
            }

        } catch (error) {
            console.error('Error fetching user profile:', error);

            // Always fallback to stored data or default
            loadFallbackUserData();

            // Show user-friendly message only for severe errors
            if (!error.message.includes('404') && !error.message.includes('ไม่พบข้อมูล')) {
                showNotification('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ ระบบจะใช้ข้อมูลที่บันทึกไว้', 'warning');
            }
        }
    }`
                );
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                this.fixedFiles.push(path.basename(filePath));
                console.log(`✅ Fixed CSP and API issues in: ${path.basename(filePath)}`);
            }

        } catch (error) {
            this.errors.push({ file: path.basename(filePath), error: error.message });
            console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
        }
    }

    // Process all HTML files in account directory
    async processAllFiles() {
        try {
            const files = fs.readdirSync(this.accountDir);
            const htmlFiles = files.filter(file => file.endsWith('.html'));

            console.log(`Found ${htmlFiles.length} HTML files to process...\n`);

            for (const file of htmlFiles) {
                const filePath = path.join(this.accountDir, file);
                await this.processFile(filePath);
            }

        } catch (error) {
            console.error('Error reading account directory:', error);
        }
    }

    // Create a comprehensive API error handler utility
    createAPIErrorHandler() {
        const errorHandlerContent = `// API Error Handler Utility
class APIErrorHandler {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Determine if error is retryable
    isRetryableError(error) {
        const retryableErrors = [
            'network',
            'timeout',
            '500',
            '502',
            '503',
            '504'
        ];

        return retryableErrors.some(errorType =>
            error.message.toLowerCase().includes(errorType)
        );
    }

    // Handle API errors with user-friendly messages
    handleError(error, context = '') {
        console.error(\`API Error in \${context}:\`, error);

        let userMessage = 'เกิดข้อผิดพลาดที่ไม่คาดคิด';

        if (error.message.includes('404')) {
            userMessage = 'ไม่พบข้อมูลที่ต้องการ';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            userMessage = 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่';
            this.handleAuthError();
        } else if (error.message.includes('500')) {
            userMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
        } else if (error.message.includes('timeout') || error.message.includes('การเชื่อมต่อหมดเวลา')) {
            userMessage = 'การเชื่อมต่อหมดเวลา กรุณาตรวจสอบอินเทอร์เน็ต';
        }

        this.showUserMessage(userMessage, 'error');
        return userMessage;
    }

    // Handle authentication errors
    handleAuthError() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }

    // Show user message
    showUserMessage(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else if (typeof alert === 'function') {
            alert(message);
        } else {
            console.log(\`User Message (\${type}): \${message}\`);
        }
    }

    // Retry failed API calls
    async retryAPI(apiCall, context = '', attempts = this.retryAttempts) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await apiCall();
            } catch (error) {
                console.log(\`API retry attempt \${i + 1}/\${attempts} for \${context}\`);

                if (i === attempts - 1 || !this.isRetryableError(error)) {
                    throw error;
                }

                await this.delay(this.retryDelay * (i + 1));
            }
        }
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance
window.apiErrorHandler = new APIErrorHandler();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIErrorHandler;
}`;

        const errorHandlerPath = path.join(__dirname, '..', 'views', 'account', 'js', 'api-error-handler.js');

        // Ensure js directory exists
        const jsDir = path.dirname(errorHandlerPath);
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }

        fs.writeFileSync(errorHandlerPath, errorHandlerContent, 'utf8');
        console.log('✅ Created API error handler utility');
    }

    // Main execution function
    async run() {
        console.log('🔧 Fixing CSP violations and API errors...\n');

        try {
            await this.processAllFiles();
            this.createAPIErrorHandler();

            // Generate summary report
            console.log('\n📊 CSP and API Fix Summary:');
            console.log(`✅ Successfully fixed: ${this.fixedFiles.length} files`);
            console.log(`❌ Errors encountered: ${this.errors.length} files`);

            if (this.fixedFiles.length > 0) {
                console.log('\n✅ Fixed files:');
                this.fixedFiles.forEach(file => {
                    console.log(`   - ${file}`);
                });
            }

            if (this.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                this.errors.forEach(({ file, error }) => {
                    console.log(`   - ${file}: ${error}`);
                });
            }

            console.log('\n📋 Fixes Applied:');
            console.log('   ✓ Updated Content Security Policy to allow external resources');
            console.log('   ✓ Fixed API endpoint URLs to use relative paths');
            console.log('   ✓ Enhanced error handling for API calls');
            console.log('   ✓ Added graceful fallback for 404 errors');
            console.log('   ✓ Improved timeout handling');
            console.log('   ✓ Created comprehensive API error handler utility');

            console.log('\n🎉 CSP and API error fixes complete!');

        } catch (error) {
            console.error('❌ Critical error during CSP and API fixes:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new CSPAndAPIFixer();
    fixer.run();
}

module.exports = CSPAndAPIFixer;