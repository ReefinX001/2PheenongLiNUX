// Security Middleware for Frontend Protection
(function() {
    'use strict';

    const SecurityMiddleware = {
        // Configuration
        config: {
            enableCSP: true,
            enableXSSProtection: true,
            enableClickjacking: true,
            enableHTTPS: true,
            enableIntegrityCheck: true,
            enableConsoleProtection: false,
            enableRightClickProtection: false,
            enableDevToolsDetection: true,
            maxRequestsPerMinute: 60,
            suspiciousPatterns: [
                /<script/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /data:text\/html/gi,
                /<iframe/gi,
                /<embed/gi,
                /<object/gi,
                /eval\(/gi,
                /expression\(/gi,
                /import\(/gi,
                /require\(/gi,
                /\.constructor/gi,
                /\.__proto__/gi,
                /\.prototype/gi
            ]
        },

        // Initialize all security measures
        init: function() {
            this.enforceHTTPS();
            this.setupCSP();
            this.preventXSS();
            this.preventClickjacking();
            this.setupRequestInterceptor();
            this.monitorDOMChanges();
            this.detectDevTools();
            this.setupEventSecurity();
            this.protectCookies();
            this.setupErrorHandler();
            console.log('Security middleware initialized');
        },

        // Force HTTPS redirect
        enforceHTTPS: function() {
            if (this.config.enableHTTPS && location.protocol !== 'https:' && location.hostname !== 'localhost') {
                location.replace('https:' + window.location.href.substring(window.location.protocol.length));
            }
        },

        // Setup Content Security Policy
        setupCSP: function() {
            if (!this.config.enableCSP) return;

            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
                "img-src 'self' data: https:",
                "font-src 'self' data: https://cdnjs.cloudflare.com",
                "connect-src 'self' https://api.* wss://",
                "media-src 'self'",
                "object-src 'none'",
                "frame-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                'upgrade-insecure-requests'
            ].join('; ');
            document.head.appendChild(meta);
        },

        // XSS Protection
        preventXSS: function() {
            if (!this.config.enableXSSProtection) return;

            // Override dangerous methods
            const originalWrite = document.write;
            document.write = function(content) {
                if (SecurityMiddleware.containsSuspiciousPattern(content)) {
                    console.error('Blocked potentially malicious document.write');
                    SecurityMiddleware.logSecurityEvent('XSS_BLOCKED', { method: 'document.write' });
                    return;
                }
                originalWrite.call(document, content);
            };

            // Monitor innerHTML changes
            const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
            Object.defineProperty(Element.prototype, 'innerHTML', {
                set: function(value) {
                    if (SecurityMiddleware.containsSuspiciousPattern(value)) {
                        console.error('Blocked potentially malicious innerHTML');
                        SecurityMiddleware.logSecurityEvent('XSS_BLOCKED', { method: 'innerHTML' });
                        value = SecurityMiddleware.sanitizeHTML(value);
                    }
                    originalInnerHTML.set.call(this, value);
                }
            });

            // Monitor outerHTML changes
            const originalOuterHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
            if (originalOuterHTML) {
                Object.defineProperty(Element.prototype, 'outerHTML', {
                    set: function(value) {
                        if (SecurityMiddleware.containsSuspiciousPattern(value)) {
                            console.error('Blocked potentially malicious outerHTML');
                            SecurityMiddleware.logSecurityEvent('XSS_BLOCKED', { method: 'outerHTML' });
                            value = SecurityMiddleware.sanitizeHTML(value);
                        }
                        originalOuterHTML.set.call(this, value);
                    }
                });
            }
        },

        // Prevent Clickjacking
        preventClickjacking: function() {
            if (!this.config.enableClickjacking) return;

            // Check if we're in an iframe
            if (window.self !== window.top) {
                // Try to break out
                try {
                    window.top.location = window.self.location;
                } catch (e) {
                    // If we can't break out, make the page unusable
                    document.body.innerHTML = '';
                    alert('This page cannot be displayed in an iframe for security reasons.');
                    this.logSecurityEvent('CLICKJACKING_ATTEMPT', { blocked: true });
                }
            }

            // Add X-Frame-Options meta equivalent
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-Frame-Options';
            meta.content = 'DENY';
            document.head.appendChild(meta);
        },

        // Request Interceptor
        setupRequestInterceptor: function() {
            const requestLog = new Map();
            const originalFetch = window.fetch;

            window.fetch = async function(...args) {
                const now = Date.now();
                const minute = Math.floor(now / 60000);

                // Rate limiting
                if (!requestLog.has(minute)) {
                    requestLog.set(minute, 0);
                }

                const count = requestLog.get(minute);
                if (count >= SecurityMiddleware.config.maxRequestsPerMinute) {
                    SecurityMiddleware.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                        count,
                        url: args[0]
                    });
                    throw new Error('Rate limit exceeded');
                }

                requestLog.set(minute, count + 1);

                // Clean old entries
                for (const [key] of requestLog) {
                    if (key < minute - 1) {
                        requestLog.delete(key);
                    }
                }

                // Validate URL
                const url = args[0];
                if (typeof url === 'string' && SecurityMiddleware.containsSuspiciousPattern(url)) {
                    SecurityMiddleware.logSecurityEvent('SUSPICIOUS_REQUEST', { url });
                    throw new Error('Suspicious URL detected');
                }

                // Add security headers
                if (args[1] && args[1].headers) {
                    args[1].headers['X-Requested-With'] = 'XMLHttpRequest';
                }

                return originalFetch.apply(this, args);
            };

            // Also intercept XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (SecurityMiddleware.containsSuspiciousPattern(url)) {
                    SecurityMiddleware.logSecurityEvent('SUSPICIOUS_XHR', { url, method });
                    throw new Error('Suspicious XHR detected');
                }
                return originalOpen.apply(this, [method, url, ...args]);
            };
        },

        // Monitor DOM changes for suspicious activity
        monitorDOMChanges: function() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                this.validateElement(node);
                            }
                        });
                    } else if (mutation.type === 'attributes') {
                        this.validateAttribute(mutation.target, mutation.attributeName);
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                attributes: true,
                subtree: true,
                attributeFilter: ['src', 'href', 'action', 'formaction', 'onclick', 'onerror', 'onload']
            });
        },

        // Validate DOM elements
        validateElement: function(element) {
            // Check for suspicious scripts
            if (element.tagName === 'SCRIPT') {
                const src = element.src;
                const content = element.textContent;

                if (src && !this.isTrustedSource(src)) {
                    element.remove();
                    this.logSecurityEvent('UNTRUSTED_SCRIPT_BLOCKED', { src });
                }

                if (content && this.containsSuspiciousPattern(content)) {
                    element.remove();
                    this.logSecurityEvent('MALICIOUS_INLINE_SCRIPT_BLOCKED', {});
                }
            }

            // Check for suspicious iframes
            if (element.tagName === 'IFRAME') {
                const src = element.src;
                if (!this.isTrustedSource(src)) {
                    element.remove();
                    this.logSecurityEvent('UNTRUSTED_IFRAME_BLOCKED', { src });
                }
            }
        },

        // Validate attributes
        validateAttribute: function(element, attributeName) {
            const value = element.getAttribute(attributeName);

            if (attributeName.startsWith('on') && value) {
                // Remove inline event handlers
                element.removeAttribute(attributeName);
                this.logSecurityEvent('INLINE_EVENT_HANDLER_REMOVED', {
                    element: element.tagName,
                    attribute: attributeName
                });
            }

            if ((attributeName === 'src' || attributeName === 'href') && value) {
                if (this.containsSuspiciousPattern(value)) {
                    element.removeAttribute(attributeName);
                    this.logSecurityEvent('SUSPICIOUS_URL_REMOVED', {
                        element: element.tagName,
                        attribute: attributeName,
                        value: value.substring(0, 50)
                    });
                }
            }
        },

        // DevTools Detection
        detectDevTools: function() {
            if (!this.config.enableDevToolsDetection) return;

            let devtools = { open: false, orientation: null };
            const threshold = 160;
            let emitEvent = false;

            setInterval(() => {
                if (window.outerHeight - window.innerHeight > threshold ||
                    window.outerWidth - window.innerWidth > threshold) {
                    if (!devtools.open) {
                        emitEvent = true;
                    }
                    devtools.open = true;
                    devtools.orientation = window.outerWidth - window.innerWidth > threshold ? 'vertical' : 'horizontal';
                } else {
                    if (devtools.open) {
                        emitEvent = true;
                    }
                    devtools.open = false;
                    devtools.orientation = null;
                }

                if (emitEvent) {
                    this.logSecurityEvent('DEVTOOLS_STATE_CHANGED', devtools);
                    emitEvent = false;
                }
            }, 500);

            // Additional console detection
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function() {
                    SecurityMiddleware.logSecurityEvent('CONSOLE_OPENED', {});
                }
            });

            console.log('%c', element);
        },

        // Setup secure event handling
        setupEventSecurity: function() {
            // Prevent right-click if configured
            if (this.config.enableRightClickProtection) {
                document.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    return false;
                });
            }

            // Prevent text selection on sensitive elements
            document.addEventListener('selectstart', (e) => {
                if (e.target.classList.contains('no-select') ||
                    e.target.closest('.sensitive-data')) {
                    e.preventDefault();
                    return false;
                }
            });

            // Prevent drag and drop of sensitive elements
            document.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('no-drag') ||
                    e.target.closest('.sensitive-data')) {
                    e.preventDefault();
                    return false;
                }
            });

            // Monitor clipboard events
            document.addEventListener('copy', (e) => {
                const selection = window.getSelection().toString();
                if (this.containsSensitiveData(selection)) {
                    e.preventDefault();
                    this.logSecurityEvent('SENSITIVE_DATA_COPY_BLOCKED', {});
                }
            });
        },

        // Cookie Protection
        protectCookies: function() {
            // Override document.cookie setter
            const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

            Object.defineProperty(document, 'cookie', {
                get: function() {
                    return originalCookie.get.call(this);
                },
                set: function(value) {
                    // Ensure secure flags
                    if (location.protocol === 'https:') {
                        if (!value.includes('Secure')) {
                            value += '; Secure';
                        }
                    }
                    if (!value.includes('SameSite')) {
                        value += '; SameSite=Strict';
                    }
                    if (!value.includes('HttpOnly')) {
                        // Note: HttpOnly cannot be set from JavaScript
                        SecurityMiddleware.logSecurityEvent('COOKIE_WITHOUT_HTTPONLY', {});
                    }

                    originalCookie.set.call(this, value);
                }
            });
        },

        // Global Error Handler
        setupErrorHandler: function() {
            window.addEventListener('error', (event) => {
                // Don't log sensitive information
                const sanitizedError = {
                    message: this.sanitizeErrorMessage(event.message),
                    source: event.filename ? event.filename.replace(/.*\//, '') : 'unknown',
                    line: event.lineno,
                    column: event.colno,
                    timestamp: new Date().toISOString()
                };

                this.logSecurityEvent('JAVASCRIPT_ERROR', sanitizedError);

                // Prevent error details from leaking to console in production
                if (window.location.hostname !== 'localhost') {
                    event.preventDefault();
                }
            });

            window.addEventListener('unhandledrejection', (event) => {
                const sanitizedError = {
                    reason: this.sanitizeErrorMessage(String(event.reason)),
                    timestamp: new Date().toISOString()
                };

                this.logSecurityEvent('UNHANDLED_PROMISE_REJECTION', sanitizedError);

                if (window.location.hostname !== 'localhost') {
                    event.preventDefault();
                }
            });
        },

        // Helper Functions
        containsSuspiciousPattern: function(content) {
            if (typeof content !== 'string') return false;

            return this.config.suspiciousPatterns.some(pattern => pattern.test(content));
        },

        containsSensitiveData: function(content) {
            // Check for patterns that look like sensitive data
            const patterns = [
                /\b\d{13,16}\b/, // Credit card
                /\b\d{3}-\d{2}-\d{4}\b/, // SSN
                /password\s*[:=]\s*\S+/i, // Password
                /api[_-]?key\s*[:=]\s*\S+/i, // API key
                /token\s*[:=]\s*\S+/i // Token
            ];

            return patterns.some(pattern => pattern.test(content));
        },

        isTrustedSource: function(url) {
            const trustedDomains = [
                'self',
                'localhost',
                '127.0.0.1',
                'cdn.jsdelivr.net',
                'cdnjs.cloudflare.com',
                'cdn.tailwindcss.com',
                window.location.hostname
            ];

            try {
                const urlObj = new URL(url, window.location.origin);
                return trustedDomains.some(domain =>
                    urlObj.hostname === domain ||
                    urlObj.hostname.endsWith('.' + domain)
                );
            } catch {
                return false;
            }
        },

        sanitizeHTML: function(html) {
            // Basic HTML sanitization
            return html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        },

        sanitizeErrorMessage: function(message) {
            // Remove potentially sensitive information from error messages
            return String(message)
                .replace(/\/([^\/]+)\.js/g, '/[filename].js')
                .replace(/\b\d{13,16}\b/g, '[REDACTED]')
                .replace(/["'].*?["']/g, '[STRING]')
                .replace(/https?:\/\/[^\s]+/g, '[URL]');
        },

        // Security Event Logging
        logSecurityEvent: function(eventType, details) {
            const event = {
                type: eventType,
                details: details,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            // Store in session for analysis
            const events = JSON.parse(sessionStorage.getItem('securityEvents') || '[]');
            events.push(event);

            // Keep only last 100 events
            if (events.length > 100) {
                events.shift();
            }

            sessionStorage.setItem('securityEvents', JSON.stringify(events));

            // Send to server if critical
            if (['XSS_BLOCKED', 'CLICKJACKING_ATTEMPT', 'SUSPICIOUS_REQUEST'].includes(eventType)) {
                this.sendSecurityAlert(event);
            }

            // Console log in development
            if (window.location.hostname === 'localhost') {
                console.warn('Security Event:', event);
            }
        },

        // Send security alerts to server
        sendSecurityAlert: async function(event) {
            try {
                await fetch('/api/security/alert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(event)
                });
            } catch (error) {
                console.error('Failed to send security alert');
            }
        },

        // Get security report
        getSecurityReport: function() {
            return {
                events: JSON.parse(sessionStorage.getItem('securityEvents') || '[]'),
                config: this.config,
                timestamp: new Date().toISOString()
            };
        }
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityMiddleware.init());
    } else {
        SecurityMiddleware.init();
    }

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecurityMiddleware;
    } else {
        window.SecurityMiddleware = SecurityMiddleware;
    }
})();