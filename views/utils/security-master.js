// Master Security Initialization and Management
(function() {
    'use strict';

    const SecurityMaster = {
        // Security modules status
        modules: {
            core: false,
            aes: false,
            middleware: false,
            auth: false,
            twoFactor: false,
            scanner: false,
            logger: false,
            cdn: false
        },

        // Configuration
        config: {
            autoInit: true,
            strictMode: true,
            productionMode: location.hostname !== 'localhost' && location.hostname !== '127.0.0.1',
            requiredScore: 90,
            modules: [
                { name: 'security', file: '/views/utils/security.js', required: true },
                { name: 'crypto-aes', file: '/views/utils/crypto-aes.js', required: true },
                { name: 'security-middleware', file: '/views/utils/security-middleware.js', required: true },
                { name: 'secure-auth', file: '/views/utils/secure-auth.js', required: true },
                { name: 'two-factor-auth', file: '/views/utils/two-factor-auth.js', required: false },
                { name: 'security-scanner', file: '/views/utils/security-scanner.js', required: true },
                { name: 'security-logger', file: '/views/utils/security-logger.js', required: true },
                { name: 'cdn-loader', file: '/views/utils/cdn-loader.js', required: false }
            ]
        },

        // Initialize all security systems
        init: async function() {
            console.log('🔒 Initializing Security Master...');

            // Check environment
            this.checkEnvironment();

            // Load security modules
            await this.loadModules();

            // Initialize modules
            await this.initializeModules();

            // Run security audit
            await this.runSecurityAudit();

            // Setup monitoring
            this.setupMonitoring();

            // Verify security
            const isSecure = await this.verifySecurityStatus();

            if (isSecure) {
                console.log('✅ Security Master initialized successfully');
                this.logSecurityEvent('SECURITY_INITIALIZED', 'All security modules loaded');
            } else {
                console.error('❌ Security initialization failed');
                this.handleSecurityFailure();
            }

            return isSecure;
        },

        // Check environment security
        checkEnvironment: function() {
            // Check HTTPS
            if (this.config.productionMode && location.protocol !== 'https:') {
                console.error('⚠️ Production site not using HTTPS!');
                this.redirectToHTTPS();
            }

            // Check for debugging tools in production
            if (this.config.productionMode) {
                this.disableDebugging();
            }

            // Check browser capabilities
            if (!window.crypto || !window.crypto.subtle) {
                console.error('⚠️ Web Crypto API not available');
                alert('Your browser does not support required security features. Please update your browser.');
            }
        },

        // Load security modules
        loadModules: async function() {
            const loadPromises = this.config.modules.map(module => {
                return new Promise((resolve) => {
                    // Check if already loaded
                    if (this.isModuleLoaded(module.name)) {
                        console.log(`✓ ${module.name} already loaded`);
                        resolve(true);
                        return;
                    }

                    // Load module
                    const script = document.createElement('script');
                    script.src = module.file;
                    script.async = true;

                    script.onload = () => {
                        console.log(`✓ ${module.name} loaded`);
                        this.markModuleLoaded(module.name);
                        resolve(true);
                    };

                    script.onerror = () => {
                        if (module.required) {
                            console.error(`✗ Failed to load required module: ${module.name}`);
                            resolve(false);
                        } else {
                            console.warn(`⚠ Failed to load optional module: ${module.name}`);
                            resolve(true);
                        }
                    };

                    document.head.appendChild(script);
                });
            });

            const results = await Promise.all(loadPromises);
            return results.every(result => result === true);
        },

        // Initialize security modules
        initializeModules: async function() {
            // Initialize in specific order for dependencies

            // 1. Core Security Utils
            if (typeof SecurityUtils !== 'undefined') {
                this.modules.core = true;
                console.log('✓ Core security initialized');
            }

            // 2. AES Crypto
            if (typeof CryptoAES !== 'undefined') {
                this.modules.aes = true;
                // Initialize secure storage with master password
                const masterPassword = await this.getMasterPassword();
                if (masterPassword) {
                    await CryptoAES.secureStorage.init(masterPassword);
                }
                console.log('✓ AES encryption initialized');
            }

            // 3. Security Middleware
            if (typeof SecurityMiddleware !== 'undefined') {
                this.modules.middleware = true;
                // Middleware auto-initializes
                console.log('✓ Security middleware active');
            }

            // 4. Secure Authentication
            if (typeof SecureAuth !== 'undefined') {
                this.modules.auth = true;
                // Auth auto-initializes
                console.log('✓ Secure authentication ready');
            }

            // 5. Two-Factor Auth
            if (typeof TwoFactorAuth !== 'undefined') {
                this.modules.twoFactor = true;
                // 2FA auto-initializes
                console.log('✓ 2FA system ready');
            }

            // 6. Security Scanner
            if (typeof SecurityScanner !== 'undefined') {
                this.modules.scanner = true;
                // Scanner auto-initializes
                console.log('✓ Security scanner active');
            }

            // 7. Security Logger
            if (typeof SecurityLogger !== 'undefined') {
                this.modules.logger = true;
                // Logger auto-initializes
                console.log('✓ Security logger active');
            }

            // 8. CDN Loader
            if (typeof CDNLoader !== 'undefined') {
                this.modules.cdn = true;
                console.log('✓ CDN loader ready');
            }
        },

        // Run security audit
        runSecurityAudit: async function() {
            if (typeof SecurityScanner === 'undefined') {
                console.warn('Security scanner not available');
                return null;
            }

            console.log('🔍 Running security audit...');
            const report = await SecurityScanner.runFullScan();

            console.log(`Security Score: ${report.score}/100`);

            if (report.score < this.config.requiredScore) {
                console.warn(`⚠️ Security score below required ${this.config.requiredScore}`);

                if (report.critical.length > 0) {
                    console.error('🚨 Critical security issues found:', report.critical);
                }
            }

            return report;
        },

        // Setup continuous monitoring
        setupMonitoring: function() {
            // Monitor for security violations
            document.addEventListener('securitypolicyviolation', (e) => {
                this.logSecurityEvent('CSP_VIOLATION', 'Content Security Policy violation', {
                    violatedDirective: e.violatedDirective,
                    blockedURI: e.blockedURI
                });
            });

            // Monitor authentication status
            setInterval(() => {
                this.checkAuthenticationStatus();
            }, 60000); // Every minute

            // Monitor for suspicious activity
            this.setupActivityMonitor();
        },

        // Setup activity monitoring
        setupActivityMonitor: function() {
            let suspiciousCount = 0;
            const suspiciousThreshold = 10;

            // Monitor rapid clicks (potential automation)
            let lastClickTime = 0;
            document.addEventListener('click', (e) => {
                const now = Date.now();
                if (now - lastClickTime < 50) {
                    suspiciousCount++;
                    if (suspiciousCount > suspiciousThreshold) {
                        this.logSecurityEvent('SUSPICIOUS_ACTIVITY', 'Rapid clicking detected');
                        suspiciousCount = 0;
                    }
                }
                lastClickTime = now;
            });

            // Monitor copy attempts
            document.addEventListener('copy', (e) => {
                const selection = window.getSelection().toString();
                if (selection.length > 1000) {
                    this.logSecurityEvent('DATA_COPY', 'Large data copy attempted', {
                        length: selection.length
                    });
                }
            });

            // Monitor console usage
            const devtools = { open: false };
            setInterval(() => {
                if (window.outerHeight - window.innerHeight > 100) {
                    if (!devtools.open) {
                        devtools.open = true;
                        this.logSecurityEvent('DEVTOOLS_OPENED', 'Developer tools opened');
                    }
                } else {
                    devtools.open = false;
                }
            }, 1000);
        },

        // Check authentication status
        checkAuthenticationStatus: function() {
            if (typeof SecureAuth === 'undefined') return;

            const token = SecureAuth.getAuthToken();
            if (token) {
                const expiry = sessionStorage.getItem('tokenExpiry');
                if (expiry && parseInt(expiry) < Date.now()) {
                    this.logSecurityEvent('AUTH_EXPIRED', 'Authentication token expired');
                    SecureAuth.logout();
                }
            }
        },

        // Verify security status
        verifySecurityStatus: async function() {
            const checks = {
                https: location.protocol === 'https:' || !this.config.productionMode,
                modules: Object.values(this.modules).filter(m => m).length >= 6,
                crypto: typeof crypto !== 'undefined' && crypto.subtle,
                score: true // Will be updated below
            };

            // Check security score
            if (typeof SecurityScanner !== 'undefined') {
                const score = SecurityScanner.getScore();
                checks.score = score >= this.config.requiredScore;
            }

            const allPassed = Object.values(checks).every(check => check === true);

            if (!allPassed) {
                console.error('Security verification failed:', checks);
            }

            return allPassed;
        },

        // Handle security failure
        handleSecurityFailure: function() {
            if (this.config.strictMode && this.config.productionMode) {
                // In strict production mode, prevent page usage
                document.body.innerHTML = `
                    <div style="padding: 50px; text-align: center; font-family: sans-serif;">
                        <h1 style="color: red;">Security Error</h1>
                        <p>The application cannot start due to security configuration issues.</p>
                        <p>Please contact your system administrator.</p>
                    </div>
                `;

                // Log critical security failure
                this.logSecurityEvent('CRITICAL_SECURITY_FAILURE', 'Application blocked due to security failure');
            } else {
                console.error('⚠️ Running with reduced security');
                this.logSecurityEvent('SECURITY_DEGRADED', 'Running with reduced security');
            }
        },

        // Helper methods
        isModuleLoaded: function(moduleName) {
            const moduleMap = {
                'security': 'SecurityUtils',
                'crypto-aes': 'CryptoAES',
                'security-middleware': 'SecurityMiddleware',
                'secure-auth': 'SecureAuth',
                'two-factor-auth': 'TwoFactorAuth',
                'security-scanner': 'SecurityScanner',
                'security-logger': 'SecurityLogger',
                'cdn-loader': 'CDNLoader'
            };

            return typeof window[moduleMap[moduleName]] !== 'undefined';
        },

        markModuleLoaded: function(moduleName) {
            const moduleKeyMap = {
                'security': 'core',
                'crypto-aes': 'aes',
                'security-middleware': 'middleware',
                'secure-auth': 'auth',
                'two-factor-auth': 'twoFactor',
                'security-scanner': 'scanner',
                'security-logger': 'logger',
                'cdn-loader': 'cdn'
            };

            const key = moduleKeyMap[moduleName];
            if (key) {
                this.modules[key] = true;
            }
        },

        getMasterPassword: async function() {
            // In production, this should come from secure user input or server
            // For now, generate from browser fingerprint
            const fingerprint = [
                navigator.userAgent,
                navigator.language,
                screen.width,
                screen.height,
                new Date().getTimezoneOffset()
            ].join('|');

            if (typeof CryptoAES !== 'undefined') {
                return await CryptoAES.hash(fingerprint);
            }

            return btoa(fingerprint);
        },

        redirectToHTTPS: function() {
            if (location.protocol !== 'https:') {
                location.replace('https:' + window.location.href.substring(window.location.protocol.length));
            }
        },

        disableDebugging: function() {
            // Disable right-click in production
            if (this.config.productionMode) {
                document.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    return false;
                });
            }

            // Override console in production
            if (this.config.productionMode) {
                const noop = () => {};
                ['log', 'debug', 'info', 'warn', 'error', 'trace'].forEach(method => {
                    console[method] = noop;
                });
            }
        },

        logSecurityEvent: function(type, message, details = {}) {
            if (typeof SecurityLogger !== 'undefined') {
                SecurityLogger.logSecurityEvent(type, 'INFO', { message, ...details });
            } else {
                console.log(`[SECURITY] ${type}: ${message}`, details);
            }
        },

        // Public API
        getSecurityStatus: function() {
            return {
                modules: this.modules,
                score: typeof SecurityScanner !== 'undefined' ? SecurityScanner.getScore() : 0,
                https: location.protocol === 'https:',
                production: this.config.productionMode,
                initialized: Object.values(this.modules).filter(m => m).length > 0
            };
        },

        getSecurityReport: async function() {
            const status = this.getSecurityStatus();
            const scanReport = typeof SecurityScanner !== 'undefined' ?
                              SecurityScanner.getLastReport() : null;
            const logs = typeof SecurityLogger !== 'undefined' ?
                        SecurityLogger.getStats() : null;

            return {
                status,
                scanReport,
                logs,
                timestamp: new Date().toISOString()
            };
        },

        forceSecurityScan: async function() {
            return await this.runSecurityAudit();
        }
    };

    // Auto-initialize
    if (SecurityMaster.config.autoInit) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => SecurityMaster.init());
        } else {
            SecurityMaster.init();
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecurityMaster;
    } else {
        window.SecurityMaster = SecurityMaster;
    }
})();