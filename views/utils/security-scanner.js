// Automated Security Scanner and Auditor
(function() {
    'use strict';

    const SecurityScanner = {
        // Scanner configuration
        config: {
            autoScan: true,
            scanInterval: 300000, // 5 minutes
            deepScanInterval: 3600000, // 1 hour
            reportToServer: true,
            blockMalicious: true,
            scanDepth: 3
        },

        // Security test results
        results: {
            passed: [],
            warnings: [],
            failures: [],
            critical: [],
            score: 0,
            timestamp: null
        },

        // Initialize scanner
        init: function() {
            console.log('Security Scanner initializing...');
            this.runFullScan();

            if (this.config.autoScan) {
                this.startAutoScan();
            }
        },

        // Start automatic scanning
        startAutoScan: function() {
            // Quick scan every 5 minutes
            setInterval(() => {
                this.runQuickScan();
            }, this.config.scanInterval);

            // Deep scan every hour
            setInterval(() => {
                this.runDeepScan();
            }, this.config.deepScanInterval);
        },

        // Run full security scan
        runFullScan: async function() {
            console.log('Running full security scan...');
            this.resetResults();

            // Run all security checks
            await this.checkHTTPS();
            await this.checkHeaders();
            await this.checkCookies();
            await this.checkLocalStorage();
            await this.checkSessionStorage();
            await this.checkXSS();
            await this.checkCSRF();
            await this.checkClickjacking();
            await this.checkMixedContent();
            await this.checkInsecureScripts();
            await this.checkFormSecurity();
            await this.checkAPIEndpoints();
            await this.checkDependencies();
            await this.checkPermissions();
            await this.checkCrypto();
            await this.checkNetworkSecurity();
            await this.checkDataLeaks();
            await this.checkAuthentication();
            await this.check2FA();
            await this.checkRateLimiting();

            // Calculate score and generate report
            this.calculateScore();
            this.generateReport();

            return this.results;
        },

        // Run quick security scan
        runQuickScan: async function() {
            console.log('Running quick security scan...');
            this.resetResults();

            // Quick essential checks
            await this.checkHTTPS();
            await this.checkCookies();
            await this.checkXSS();
            await this.checkMixedContent();
            await this.checkAuthentication();

            this.calculateScore();
            return this.results;
        },

        // Run deep security scan
        runDeepScan: async function() {
            console.log('Running deep security scan...');
            return this.runFullScan();
        },

        // Security Check Methods

        // Check HTTPS usage
        checkHTTPS: async function() {
            const test = 'HTTPS Protocol';

            if (location.protocol === 'https:') {
                this.addResult('passed', test, 'Site is using HTTPS');
            } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.addResult('warnings', test, 'Running on localhost - HTTPS not required');
            } else {
                this.addResult('critical', test, 'Site is not using HTTPS - all data transmitted is vulnerable');
            }
        },

        // Check security headers
        checkHeaders: async function() {
            const test = 'Security Headers';
            const requiredHeaders = [
                'Content-Security-Policy',
                'X-Frame-Options',
                'X-Content-Type-Options',
                'Strict-Transport-Security',
                'X-XSS-Protection'
            ];

            // Check meta tags as proxy for headers
            requiredHeaders.forEach(header => {
                const meta = document.querySelector(`meta[http-equiv="${header}"]`);
                if (meta) {
                    this.addResult('passed', test, `${header} is set`);
                } else {
                    this.addResult('warnings', test, `${header} is not set`);
                }
            });
        },

        // Check cookie security
        checkCookies: async function() {
            const test = 'Cookie Security';
            const cookies = document.cookie.split(';');

            if (cookies.length === 0 || (cookies.length === 1 && cookies[0] === '')) {
                this.addResult('passed', test, 'No cookies found');
                return;
            }

            cookies.forEach(cookie => {
                if (cookie.trim()) {
                    // Check for sensitive data in cookies
                    if (/password|token|key|secret/i.test(cookie)) {
                        this.addResult('critical', test, 'Potentially sensitive data found in cookies');
                    }

                    // Check for secure flags (limited in JavaScript)
                    if (location.protocol === 'https:' && !cookie.includes('Secure')) {
                        this.addResult('warnings', test, 'Cookies should have Secure flag on HTTPS');
                    }
                }
            });
        },

        // Check localStorage security
        checkLocalStorage: async function() {
            const test = 'LocalStorage Security';

            try {
                const keys = Object.keys(localStorage);

                keys.forEach(key => {
                    const value = localStorage.getItem(key);

                    // Check for sensitive data
                    if (/password|token|secret|key|credit|ssn/i.test(key) ||
                        /password|token|secret|key|credit|ssn/i.test(value)) {
                        this.addResult('critical', test, `Potentially sensitive data in localStorage: ${key}`);
                    }

                    // Check for unencrypted data
                    if (key.startsWith('_enc_')) {
                        this.addResult('passed', test, `Encrypted data found: ${key}`);
                    } else if (value && value.length > 100 && /^[a-zA-Z0-9+/]+=*$/.test(value)) {
                        this.addResult('passed', test, `Possibly encrypted data: ${key}`);
                    }
                });

                if (keys.length === 0) {
                    this.addResult('passed', test, 'LocalStorage is empty');
                }

            } catch (error) {
                this.addResult('warnings', test, 'Could not access localStorage');
            }
        },

        // Check sessionStorage security
        checkSessionStorage: async function() {
            const test = 'SessionStorage Security';

            try {
                const keys = Object.keys(sessionStorage);

                keys.forEach(key => {
                    const value = sessionStorage.getItem(key);

                    // Check for sensitive data
                    if (/password|credit|ssn/i.test(key) || /password|credit|ssn/i.test(value)) {
                        this.addResult('failures', test, `Sensitive data in sessionStorage: ${key}`);
                    }

                    // SessionStorage is generally safer for tokens
                    if (/token|session/i.test(key)) {
                        this.addResult('passed', test, 'Auth tokens stored in sessionStorage (good practice)');
                    }
                });

            } catch (error) {
                this.addResult('warnings', test, 'Could not access sessionStorage');
            }
        },

        // Check XSS vulnerabilities
        checkXSS: async function() {
            const test = 'XSS Protection';

            // Check for innerHTML usage
            const scripts = document.querySelectorAll('script');
            let hasInnerHTML = false;

            scripts.forEach(script => {
                if (script.textContent.includes('innerHTML')) {
                    hasInnerHTML = true;
                }
            });

            if (hasInnerHTML) {
                this.addResult('warnings', test, 'innerHTML usage detected - ensure proper sanitization');
            }

            // Check for event handlers
            const elements = document.querySelectorAll('[onclick], [onerror], [onload]');
            if (elements.length > 0) {
                this.addResult('warnings', test, `${elements.length} inline event handlers found`);
            } else {
                this.addResult('passed', test, 'No inline event handlers found');
            }

            // Check if security utilities are loaded
            if (typeof SecurityUtils !== 'undefined') {
                this.addResult('passed', test, 'Security utilities loaded for XSS protection');
            }
        },

        // Check CSRF protection
        checkCSRF: async function() {
            const test = 'CSRF Protection';

            // Check for CSRF token in sessionStorage
            const csrfToken = sessionStorage.getItem('csrf_token');
            if (csrfToken) {
                this.addResult('passed', test, 'CSRF token found in session');
            } else {
                this.addResult('warnings', test, 'No CSRF token found');
            }

            // Check forms for CSRF tokens
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const hasToken = form.querySelector('input[name*="csrf"], input[name*="token"]');
                if (!hasToken && form.method.toUpperCase() === 'POST') {
                    this.addResult('warnings', test, 'Form without CSRF token found');
                }
            });
        },

        // Check clickjacking protection
        checkClickjacking: async function() {
            const test = 'Clickjacking Protection';

            // Check if in iframe
            if (window.self !== window.top) {
                this.addResult('critical', test, 'Page is loaded in an iframe - vulnerable to clickjacking');
            } else {
                this.addResult('passed', test, 'Page is not in an iframe');
            }

            // Check for frame-busting code
            if (typeof SecurityMiddleware !== 'undefined') {
                this.addResult('passed', test, 'Frame-busting protection active');
            }
        },

        // Check for mixed content
        checkMixedContent: async function() {
            const test = 'Mixed Content';

            if (location.protocol === 'https:') {
                // Check for HTTP resources
                const httpResources = document.querySelectorAll(
                    'img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"]'
                );

                if (httpResources.length > 0) {
                    this.addResult('failures', test, `${httpResources.length} HTTP resources on HTTPS page`);
                    httpResources.forEach(resource => {
                        console.warn('Mixed content:', resource);
                    });
                } else {
                    this.addResult('passed', test, 'No mixed content detected');
                }
            }
        },

        // Check for insecure scripts
        checkInsecureScripts: async function() {
            const test = 'Script Security';

            const scripts = document.querySelectorAll('script');
            let insecureCount = 0;

            scripts.forEach(script => {
                // Check for missing integrity attribute on external scripts
                if (script.src && !script.integrity && !script.src.includes(location.hostname)) {
                    insecureCount++;
                    this.addResult('warnings', test, `Missing integrity check: ${script.src}`);
                }

                // Check for eval usage
                if (script.textContent.includes('eval(')) {
                    this.addResult('critical', test, 'eval() usage detected - major security risk');
                }
            });

            if (insecureCount === 0) {
                this.addResult('passed', test, 'All external scripts have integrity checks');
            }
        },

        // Check form security
        checkFormSecurity: async function() {
            const test = 'Form Security';

            const forms = document.querySelectorAll('form');

            forms.forEach(form => {
                // Check for password fields without autocomplete="off"
                const passwordFields = form.querySelectorAll('input[type="password"]');
                passwordFields.forEach(field => {
                    if (field.autocomplete !== 'off' && field.autocomplete !== 'new-password') {
                        this.addResult('warnings', test, 'Password field allows autocomplete');
                    }
                });

                // Check for HTTPS action URLs
                if (form.action && form.action.startsWith('http:')) {
                    this.addResult('critical', test, 'Form submits to HTTP URL');
                }
            });
        },

        // Check API endpoints
        checkAPIEndpoints: async function() {
            const test = 'API Security';

            // Check if API calls use HTTPS
            if (typeof ApiUtils !== 'undefined' || typeof publicApi !== 'undefined') {
                this.addResult('passed', test, 'API utilities configured');
            }

            // Check for exposed API keys in global scope
            const globalKeys = Object.keys(window);
            globalKeys.forEach(key => {
                if (/api[_-]?key|secret|token/i.test(key)) {
                    this.addResult('critical', test, `Potential API key exposed in global scope: ${key}`);
                }
            });
        },

        // Check dependencies
        checkDependencies: async function() {
            const test = 'Dependencies';

            // Check for known vulnerable libraries
            const vulnerableVersions = {
                'jQuery': ['1.', '2.'],  // Old jQuery versions
                'angular': ['1.0', '1.1', '1.2'], // Old AngularJS
            };

            Object.keys(vulnerableVersions).forEach(lib => {
                if (window[lib]) {
                    const version = window[lib].fn ? window[lib].fn.jquery : window[lib].version;
                    if (version) {
                        vulnerableVersions[lib].forEach(vulnVersion => {
                            if (version.startsWith(vulnVersion)) {
                                this.addResult('warnings', test, `Potentially vulnerable library: ${lib} ${version}`);
                            }
                        });
                    }
                }
            });
        },

        // Check permissions
        checkPermissions: async function() {
            const test = 'Browser Permissions';

            // Check for dangerous permissions
            if (navigator.permissions) {
                const dangerousPermissions = ['camera', 'microphone', 'geolocation'];

                for (const perm of dangerousPermissions) {
                    try {
                        const result = await navigator.permissions.query({ name: perm });
                        if (result.state === 'granted') {
                            this.addResult('warnings', test, `${perm} permission is granted`);
                        }
                    } catch (e) {
                        // Permission not supported
                    }
                }
            }
        },

        // Check crypto implementation
        checkCrypto: async function() {
            const test = 'Cryptography';

            if (typeof crypto !== 'undefined' && crypto.subtle) {
                this.addResult('passed', test, 'Web Crypto API available');
            } else {
                this.addResult('critical', test, 'Web Crypto API not available - encryption compromised');
            }

            if (typeof CryptoAES !== 'undefined') {
                this.addResult('passed', test, 'AES-256 encryption module loaded');
            }
        },

        // Check network security
        checkNetworkSecurity: async function() {
            const test = 'Network Security';

            // Check WebSocket connections
            if (typeof WebSocket !== 'undefined') {
                // Check for insecure WebSocket URLs in page
                const scripts = Array.from(document.scripts);
                scripts.forEach(script => {
                    if (script.textContent.includes('ws://') && location.protocol === 'https:') {
                        this.addResult('failures', test, 'Insecure WebSocket connection detected');
                    }
                });
            }
        },

        // Check for data leaks
        checkDataLeaks: async function() {
            const test = 'Data Leak Prevention';

            // Check console for sensitive data
            const originalLog = console.log;
            let sensitiveLogged = false;

            console.log = function(...args) {
                const str = args.join(' ');
                if (/password|token|key|secret/i.test(str)) {
                    sensitiveLogged = true;
                }
                originalLog.apply(console, args);
            };

            if (sensitiveLogged) {
                this.addResult('warnings', test, 'Sensitive data may be logged to console');
            }

            console.log = originalLog;
        },

        // Check authentication
        checkAuthentication: async function() {
            const test = 'Authentication';

            // Check for auth tokens
            const hasToken = sessionStorage.getItem('authToken') ||
                           sessionStorage.getItem('_enc_authToken') ||
                           localStorage.getItem('_enc_authToken');

            if (hasToken) {
                this.addResult('passed', test, 'Authentication tokens found');

                // Check token expiry
                const expiry = sessionStorage.getItem('tokenExpiry');
                if (expiry && parseInt(expiry) < Date.now()) {
                    this.addResult('warnings', test, 'Authentication token may be expired');
                }
            }

            if (typeof SecureAuth !== 'undefined') {
                this.addResult('passed', test, 'Secure authentication module loaded');
            }
        },

        // Check 2FA
        check2FA: async function() {
            const test = '2FA Security';

            if (typeof TwoFactorAuth !== 'undefined') {
                this.addResult('passed', test, '2FA module loaded');
            } else {
                this.addResult('warnings', test, '2FA not configured');
            }
        },

        // Check rate limiting
        checkRateLimiting: async function() {
            const test = 'Rate Limiting';

            if (typeof SecurityUtils !== 'undefined' && SecurityUtils.rateLimiter) {
                this.addResult('passed', test, 'Rate limiting configured');
            } else {
                this.addResult('warnings', test, 'No rate limiting detected');
            }
        },

        // Helper Methods

        resetResults: function() {
            this.results = {
                passed: [],
                warnings: [],
                failures: [],
                critical: [],
                score: 0,
                timestamp: new Date().toISOString()
            };
        },

        addResult: function(category, test, message) {
            this.results[category].push({
                test: test,
                message: message,
                timestamp: new Date().toISOString()
            });
        },

        calculateScore: function() {
            const weights = {
                passed: 1,
                warnings: -0.25,
                failures: -0.5,
                critical: -2
            };

            let totalTests = 0;
            let weightedScore = 0;

            Object.keys(weights).forEach(category => {
                const count = this.results[category].length;
                totalTests += count;
                weightedScore += count * weights[category];
            });

            if (totalTests > 0) {
                // Calculate percentage (0-100)
                const maxScore = this.results.passed.length + this.results.warnings.length +
                               this.results.failures.length + this.results.critical.length;
                this.results.score = Math.max(0, Math.min(100,
                    Math.round((this.results.passed.length / maxScore) * 100)
                ));
            }
        },

        generateReport: function() {
            const report = {
                summary: {
                    score: this.results.score,
                    passed: this.results.passed.length,
                    warnings: this.results.warnings.length,
                    failures: this.results.failures.length,
                    critical: this.results.critical.length,
                    timestamp: this.results.timestamp
                },
                details: this.results,
                recommendations: this.getRecommendations()
            };

            // Store report
            sessionStorage.setItem('securityScanReport', JSON.stringify(report));

            // Log summary
            console.log('Security Scan Complete:');
            console.log(`Score: ${report.summary.score}/100`);
            console.log(`Passed: ${report.summary.passed}`);
            console.log(`Warnings: ${report.summary.warnings}`);
            console.log(`Failures: ${report.summary.failures}`);
            console.log(`Critical: ${report.summary.critical}`);

            // Send to server if configured
            if (this.config.reportToServer && report.summary.critical > 0) {
                this.sendReport(report);
            }

            return report;
        },

        getRecommendations: function() {
            const recommendations = [];

            if (this.results.critical.length > 0) {
                recommendations.push('URGENT: Address critical security issues immediately');
            }

            if (this.results.score < 50) {
                recommendations.push('Security score is critically low - immediate action required');
            } else if (this.results.score < 70) {
                recommendations.push('Security needs significant improvement');
            } else if (this.results.score < 90) {
                recommendations.push('Security is moderate - consider improvements');
            } else {
                recommendations.push('Security is good - maintain vigilance');
            }

            return recommendations;
        },

        sendReport: async function(report) {
            try {
                await fetch('/api/security/scan-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report)
                });
            } catch (error) {
                console.error('Failed to send security report');
            }
        },

        // Public API
        getLastReport: function() {
            const stored = sessionStorage.getItem('securityScanReport');
            return stored ? JSON.parse(stored) : null;
        },

        getScore: function() {
            return this.results.score;
        },

        isSecure: function() {
            return this.results.score >= 70 && this.results.critical.length === 0;
        }
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityScanner.init());
    } else {
        SecurityScanner.init();
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecurityScanner;
    } else {
        window.SecurityScanner = SecurityScanner;
    }
})();