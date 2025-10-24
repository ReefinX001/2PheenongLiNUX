// Security utilities for the application
(function() {
    'use strict';

    // DOMPurify alternative - Basic HTML sanitization
    const SecurityUtils = {
        // HTML Entity encoding to prevent XSS
        escapeHtml: function(unsafe) {
            if (typeof unsafe !== 'string') return '';
            return unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\//g, '&#x2F;');
        },

        // Sanitize HTML content (removes dangerous tags and attributes)
        sanitizeHtml: function(dirty) {
            if (typeof dirty !== 'string') return '';

            // Remove script tags and their content
            dirty = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

            // Remove on* event handlers
            dirty = dirty.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
            dirty = dirty.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

            // Remove javascript: protocol
            dirty = dirty.replace(/javascript:/gi, '');

            // Remove data: protocol for potentially dangerous content
            dirty = dirty.replace(/data:text\/html/gi, '');

            return dirty;
        },

        // Validate and sanitize URLs
        sanitizeUrl: function(url) {
            if (typeof url !== 'string') return '#';

            // Remove whitespace
            url = url.trim();

            // Block dangerous protocols
            const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
            for (let protocol of dangerousProtocols) {
                if (url.toLowerCase().startsWith(protocol)) {
                    return '#';
                }
            }

            return url;
        },

        // Create text node safely (prevents XSS)
        createSafeTextNode: function(text) {
            return document.createTextNode(String(text || ''));
        },

        // Safe setAttribute that validates attribute names
        setSafeAttribute: function(element, attribute, value) {
            const allowedAttributes = ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 'type', 'name', 'value', 'placeholder'];

            if (allowedAttributes.includes(attribute.toLowerCase())) {
                if (attribute === 'href' || attribute === 'src') {
                    value = this.sanitizeUrl(value);
                }
                element.setAttribute(attribute, String(value));
            }
        },

        // Input validation utilities
        validateInput: function(input, type) {
            if (typeof input !== 'string') return false;

            const validators = {
                email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                phone: /^[\d\s\-\+\(\)]+$/,
                alphanumeric: /^[a-zA-Z0-9]+$/,
                numeric: /^\d+$/,
                thai_id: /^\d{13}$/,
                url: /^https?:\/\/.+/
            };

            if (validators[type]) {
                return validators[type].test(input);
            }

            return true;
        },

        // Secure token storage with encryption
        secureStorage: {
            // Simple XOR encryption (for demonstration - use proper encryption in production)
            encrypt: function(text, key) {
                if (!text) return '';
                key = key || 'default-key-change-this';
                let result = '';
                for (let i = 0; i < text.length; i++) {
                    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                }
                return btoa(result);
            },

            decrypt: function(encrypted, key) {
                if (!encrypted) return '';
                key = key || 'default-key-change-this';
                let text = atob(encrypted);
                let result = '';
                for (let i = 0; i < text.length; i++) {
                    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                }
                return result;
            },

            setSecure: function(key, value, isSession = false) {
                const encrypted = this.encrypt(JSON.stringify(value), key);
                const storage = isSession ? sessionStorage : localStorage;
                storage.setItem(key, encrypted);
            },

            getSecure: function(key, isSession = false) {
                const storage = isSession ? sessionStorage : localStorage;
                const encrypted = storage.getItem(key);
                if (!encrypted) return null;

                try {
                    const decrypted = this.decrypt(encrypted, key);
                    return JSON.parse(decrypted);
                } catch (e) {
                    console.error('Failed to decrypt secure storage');
                    return null;
                }
            },

            removeSecure: function(key, isSession = false) {
                const storage = isSession ? sessionStorage : localStorage;
                storage.removeItem(key);
            }
        },

        // CSRF Token management
        csrf: {
            generateToken: function() {
                const array = new Uint8Array(32);
                crypto.getRandomValues(array);
                return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            },

            getToken: function() {
                let token = sessionStorage.getItem('csrf_token');
                if (!token) {
                    token = this.generateToken();
                    sessionStorage.setItem('csrf_token', token);
                }
                return token;
            },

            validateToken: function(token) {
                const storedToken = sessionStorage.getItem('csrf_token');
                return token && token === storedToken;
            }
        },

        // Content Security Policy helper
        csp: {
            getNonce: function() {
                const array = new Uint8Array(16);
                crypto.getRandomValues(array);
                return btoa(String.fromCharCode.apply(null, array));
            },

            addInlineScript: function(scriptContent, nonce) {
                const script = document.createElement('script');
                script.setAttribute('nonce', nonce);
                script.textContent = scriptContent;
                document.head.appendChild(script);
            }
        },

        // SQL Injection prevention (for client-side validation)
        preventSqlInjection: function(input) {
            if (typeof input !== 'string') return '';

            // Remove or escape dangerous SQL keywords and characters
            const dangerous = [
                '--', '/*', '*/', 'xp_', 'sp_', '0x',
                'select', 'insert', 'update', 'delete', 'drop',
                'create', 'alter', 'exec', 'execute', 'script',
                'union', 'from', 'where', 'join'
            ];

            let cleaned = input;
            dangerous.forEach(keyword => {
                const regex = new RegExp(keyword, 'gi');
                cleaned = cleaned.replace(regex, '');
            });

            // Escape single quotes
            cleaned = cleaned.replace(/'/g, "''");

            return cleaned;
        },

        // Rate limiting helper
        rateLimiter: {
            attempts: {},

            checkLimit: function(action, maxAttempts = 5, windowMs = 60000) {
                const now = Date.now();
                const key = action;

                if (!this.attempts[key]) {
                    this.attempts[key] = [];
                }

                // Remove old attempts outside the window
                this.attempts[key] = this.attempts[key].filter(time => now - time < windowMs);

                if (this.attempts[key].length >= maxAttempts) {
                    return false;
                }

                this.attempts[key].push(now);
                return true;
            },

            getRemainingTime: function(action, windowMs = 60000) {
                const key = action;
                if (!this.attempts[key] || this.attempts[key].length === 0) {
                    return 0;
                }

                const oldestAttempt = Math.min(...this.attempts[key]);
                const remainingMs = (oldestAttempt + windowMs) - Date.now();
                return Math.max(0, Math.ceil(remainingMs / 1000));
            }
        }
    };

    // Export for use in other files
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecurityUtils;
    } else {
        window.SecurityUtils = SecurityUtils;
    }
})();