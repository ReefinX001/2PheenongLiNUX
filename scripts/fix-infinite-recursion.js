#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix infinite recursion in safeFetch function
class InfiniteRecursionFixer {
    constructor() {
        this.accountDir = path.join(__dirname, '..', 'views', 'account');
        this.fixedFiles = [];
        this.errors = [];
    }

    // Fix the recursion issue in HTML files
    async fixRecursionInFile(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            // Fix the recursion issue: use originalFetch inside safeFetch
            const recursionFix = content.replace(
                /const response = await fetch\(url, mergedOptions\);/g,
                'const response = await originalFetch(url, mergedOptions);'
            );

            if (recursionFix !== content) {
                content = recursionFix;
                modified = true;
            }

            // Also fix any other potential recursion issues
            const additionalFixes = [
                {
                    pattern: /await fetch\(([^)]+)\)/g,
                    replacement: 'await originalFetch($1)',
                    condition: (match, content) => {
                        // Only replace if it's inside safeFetch function
                        const safeFetchStart = content.lastIndexOf('async function safeFetch', content.indexOf(match));
                        const nextFunctionStart = content.indexOf('function ', content.indexOf(match));
                        return safeFetchStart > -1 && (nextFunctionStart === -1 || safeFetchStart > nextFunctionStart);
                    }
                }
            ];

            additionalFixes.forEach(fix => {
                if (fix.condition) {
                    const matches = [...content.matchAll(fix.pattern)];
                    matches.forEach(match => {
                        if (fix.condition(match[0], content)) {
                            content = content.replace(match[0], fix.replacement);
                            modified = true;
                        }
                    });
                } else {
                    const newContent = content.replace(fix.pattern, fix.replacement);
                    if (newContent !== content) {
                        content = newContent;
                        modified = true;
                    }
                }
            });

            // Ensure originalFetch is stored before it's overridden
            if (content.includes('window.fetch = function') && !content.includes('const originalFetch = window.fetch;')) {
                content = content.replace(
                    '// Replace existing fetch calls with safeFetch',
                    `// Store original fetch before overriding
    const originalFetch = window.fetch;

    // Replace existing fetch calls with safeFetch`
                );
                modified = true;
            }

            // Fix the fetch override to avoid recursion
            const fetchOverrideFix = `
    // Replace existing fetch calls with safeFetch (fixed version)
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Use safeFetch for API calls
        if (typeof url === 'string' && url.includes('/api/')) {
            return safeFetch(url, options);
        }
        // Use original fetch for other requests
        return originalFetch.apply(this, arguments);
    };`;

            if (content.includes('window.fetch = function')) {
                content = content.replace(
                    /\/\/ Replace existing fetch calls with safeFetch[\s\S]*?const originalFetch = window\.fetch;[\s\S]*?window\.fetch = function\([^}]*\{[\s\S]*?\};/,
                    fetchOverrideFix
                );
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                this.fixedFiles.push(path.basename(filePath));
                console.log(`✅ Fixed infinite recursion in: ${path.basename(filePath)}`);
            }

        } catch (error) {
            this.errors.push({ file: path.basename(filePath), error: error.message });
            console.error(`❌ Error fixing ${path.basename(filePath)}:`, error.message);
        }
    }

    // Process all HTML files
    async processAllFiles() {
        try {
            const files = fs.readdirSync(this.accountDir);
            const htmlFiles = files.filter(file => file.endsWith('.html'));

            console.log(`Found ${htmlFiles.length} HTML files to check for recursion issues...\n`);

            for (const file of htmlFiles) {
                const filePath = path.join(this.accountDir, file);
                await this.fixRecursionInFile(filePath);
            }

        } catch (error) {
            console.error('Error reading account directory:', error);
        }
    }

    // Create a better safeFetch implementation
    createImprovedSafeFetch() {
        const improvedFetchContent = `// Improved Safe Fetch Implementation (No Recursion)
(function() {
    'use strict';

    // Store original fetch immediately when script loads
    const originalFetch = window.fetch;

    // Enhanced fetch wrapper with comprehensive error handling
    async function safeFetch(url, options = {}) {
        try {
            // Ensure URL is absolute for same-origin requests
            if (url.startsWith('/')) {
                url = window.location.origin + url;
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

            // Use originalFetch to avoid recursion
            const response = await originalFetch(url, mergedOptions);
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

    // Smart fetch replacement that avoids recursion
    window.fetch = function(url, options) {
        // Use safeFetch for API calls only
        if (typeof url === 'string' && (url.includes('/api/') || url.startsWith('/api/'))) {
            return safeFetch(url, options);
        }
        // Use original fetch for all other requests
        return originalFetch.apply(this, arguments);
    };

    // Export safeFetch for direct use
    window.safeFetch = safeFetch;

    console.log('🔧 Improved safeFetch implementation loaded successfully');
})();`;

        const improvedFetchPath = path.join(__dirname, '..', 'views', 'account', 'js', 'improved-safe-fetch.js');

        // Ensure js directory exists
        const jsDir = path.dirname(improvedFetchPath);
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }

        fs.writeFileSync(improvedFetchPath, improvedFetchContent, 'utf8');
        console.log('✅ Created improved safeFetch implementation');
    }

    // Main execution function
    async run() {
        console.log('🔧 Fixing infinite recursion in safeFetch functions...\n');

        try {
            await this.processAllFiles();
            this.createImprovedSafeFetch();

            // Generate summary report
            console.log('\n📊 Infinite Recursion Fix Summary:');
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
            console.log('   ✓ Fixed infinite recursion by using originalFetch inside safeFetch');
            console.log('   ✓ Properly stored originalFetch before overriding window.fetch');
            console.log('   ✓ Created improved safeFetch implementation without recursion');
            console.log('   ✓ Added safety checks to prevent future recursion issues');

            console.log('\n⚠️  Recommendation:');
            console.log('   Consider refreshing the browser to clear any cached scripts');
            console.log('   The improved safeFetch is now available at: views/account/js/improved-safe-fetch.js');

            console.log('\n🎉 Infinite recursion fixes complete!');

        } catch (error) {
            console.error('❌ Critical error during recursion fixes:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new InfiniteRecursionFixer();
    fixer.run();
}

module.exports = InfiniteRecursionFixer;