// Secure Authentication Handler
(function() {
    'use strict';

    // Load security utilities
    if (typeof SecurityUtils === 'undefined') {
        const script = document.createElement('script');
        script.src = '/views/utils/security.js';
        document.head.appendChild(script);
    }

    const SecureAuth = {
        // Configuration
        config: {
            maxLoginAttempts: 5,
            lockoutDuration: 900000, // 15 minutes in ms
            tokenExpiry: 3600000, // 1 hour in ms
            sessionTimeout: 1800000, // 30 minutes in ms
            passwordMinLength: 8,
            requireStrongPassword: true
        },

        // Initialize authentication
        init: function() {
            this.setupLoginForm();
            this.setupSessionManagement();
            this.checkExistingSession();
        },

        // Setup login form handlers
        setupLoginForm: function() {
            const loginForm = document.getElementById('loginForm');
            if (!loginForm) return;

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e.target);
            });

            // Add input validation
            const inputs = loginForm.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.validateInput(input));
            });
        },

        // Handle login submission
        handleLogin: async function(form) {
            try {
                // Check rate limiting
                if (!SecurityUtils.rateLimiter.checkLimit('login', this.config.maxLoginAttempts, this.config.lockoutDuration)) {
                    const remainingTime = SecurityUtils.rateLimiter.getRemainingTime('login', this.config.lockoutDuration);
                    this.showError(`Too many login attempts. Please try again in ${remainingTime} seconds.`);
                    return;
                }

                // Get form data
                const formData = new FormData(form);
                const username = formData.get('username');
                const password = formData.get('password');

                // Validate inputs
                if (!this.validateCredentials(username, password)) {
                    return;
                }

                // Add CSRF token
                const csrfToken = SecurityUtils.csrf.getToken();

                // Prepare request
                const loginData = {
                    username: SecurityUtils.escapeHtml(username),
                    password: password, // Never log or display password
                    csrf_token: csrfToken,
                    timestamp: Date.now()
                };

                // Show loading state
                this.showLoading(true);

                // Send login request
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    await this.handleSuccessfulLogin(result);
                } else {
                    this.handleFailedLogin(result.message || 'Login failed');
                }

            } catch (error) {
                console.error('Login error:', error);
                this.showError('An error occurred. Please try again.');
            } finally {
                this.showLoading(false);
            }
        },

        // Validate credentials
        validateCredentials: function(username, password) {
            const errors = [];

            // Validate username
            if (!username || username.length < 3) {
                errors.push('Username must be at least 3 characters');
            }

            // Check for SQL injection attempts
            const cleanUsername = SecurityUtils.preventSqlInjection(username);
            if (cleanUsername !== username) {
                errors.push('Invalid characters in username');
            }

            // Validate password
            if (!password || password.length < this.config.passwordMinLength) {
                errors.push(`Password must be at least ${this.config.passwordMinLength} characters`);
            }

            // Check password strength
            if (this.config.requireStrongPassword && !this.isStrongPassword(password)) {
                errors.push('Password must contain uppercase, lowercase, number, and special character');
            }

            if (errors.length > 0) {
                this.showError(errors.join('<br>'));
                return false;
            }

            return true;
        },

        // Check password strength
        isStrongPassword: function(password) {
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

            return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
        },

        // Handle successful login
        handleSuccessfulLogin: async function(result) {
            // Store token securely
            const token = result.token;
            const refreshToken = result.refreshToken;
            const user = result.user;

            // Use secure storage
            if (SecurityUtils && SecurityUtils.secureStorage) {
                SecurityUtils.secureStorage.setSecure('authToken', token, true); // Session storage
                SecurityUtils.secureStorage.setSecure('refreshToken', refreshToken, false); // Local storage
                SecurityUtils.secureStorage.setSecure('userData', user, true);
            } else {
                // Fallback to session storage
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('userData', JSON.stringify(user));
            }

            // Set token expiry
            this.setTokenExpiry(this.config.tokenExpiry);

            // Setup session management
            this.startSessionTimer();

            // Redirect based on user role
            await this.redirectUser(user);
        },

        // Handle failed login
        handleFailedLogin: function(message) {
            // Sanitize and display error message
            const safeMessage = SecurityUtils ? SecurityUtils.escapeHtml(message) : message;
            this.showError(safeMessage);

            // Clear password field
            const passwordField = document.querySelector('input[type="password"]');
            if (passwordField) {
                passwordField.value = '';
            }
        },

        // Redirect user based on role
        redirectUser: async function(user) {
            const roleRedirects = {
                'admin': '/admin/dashboard',
                'manager': '/manager/dashboard',
                'employee': '/employee/dashboard',
                'user': '/user/home'
            };

            const redirectUrl = roleRedirects[user.role] || '/dashboard';

            // Use replace to prevent back button to login page
            window.location.replace(redirectUrl);
        },

        // Session management
        startSessionTimer: function() {
            // Clear any existing timer
            if (this.sessionTimer) {
                clearTimeout(this.sessionTimer);
            }

            // Set new timer
            this.sessionTimer = setTimeout(() => {
                this.showSessionWarning();
            }, this.config.sessionTimeout - 60000); // Warn 1 minute before timeout

            // Track user activity
            this.trackUserActivity();
        },

        // Track user activity to reset session timer
        trackUserActivity: function() {
            const resetTimer = () => {
                this.startSessionTimer();
            };

            // Reset on user activity
            ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, resetTimer, { once: true });
            });
        },

        // Show session warning
        showSessionWarning: function() {
            const extend = confirm('Your session will expire soon. Do you want to continue?');

            if (extend) {
                this.extendSession();
            } else {
                this.logout();
            }
        },

        // Extend session
        extendSession: async function() {
            try {
                const token = this.getAuthToken();
                const response = await fetch('/api/auth/extend', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-Token': SecurityUtils.csrf.getToken()
                    }
                });

                if (response.ok) {
                    this.startSessionTimer();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Failed to extend session:', error);
                this.logout();
            }
        },

        // Get auth token
        getAuthToken: function() {
            if (SecurityUtils && SecurityUtils.secureStorage) {
                return SecurityUtils.secureStorage.getSecure('authToken', true);
            } else {
                return sessionStorage.getItem('authToken');
            }
        },

        // Check existing session
        checkExistingSession: function() {
            const token = this.getAuthToken();

            if (token) {
                // Verify token is still valid
                this.verifyToken(token).then(valid => {
                    if (valid) {
                        this.startSessionTimer();
                    } else {
                        this.logout();
                    }
                });
            }
        },

        // Verify token with server
        verifyToken: async function(token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-Token': SecurityUtils.csrf.getToken()
                    }
                });

                return response.ok;
            } catch (error) {
                console.error('Token verification failed:', error);
                return false;
            }
        },

        // Logout
        logout: async function() {
            try {
                const token = this.getAuthToken();

                // Notify server
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-Token': SecurityUtils.csrf.getToken()
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                // Clear local data
                this.clearAuthData();

                // Redirect to login
                window.location.replace('/login');
            }
        },

        // Clear auth data
        clearAuthData: function() {
            if (SecurityUtils && SecurityUtils.secureStorage) {
                SecurityUtils.secureStorage.removeSecure('authToken', true);
                SecurityUtils.secureStorage.removeSecure('refreshToken', false);
                SecurityUtils.secureStorage.removeSecure('userData', true);
            } else {
                sessionStorage.clear();
                localStorage.removeItem('refreshToken');
            }

            // Clear session timer
            if (this.sessionTimer) {
                clearTimeout(this.sessionTimer);
            }
        },

        // Set token expiry
        setTokenExpiry: function(duration) {
            const expiry = Date.now() + duration;
            sessionStorage.setItem('tokenExpiry', expiry);

            // Set timer to refresh token before expiry
            setTimeout(() => {
                this.refreshAuthToken();
            }, duration - 60000); // Refresh 1 minute before expiry
        },

        // Refresh auth token
        refreshAuthToken: async function() {
            try {
                const refreshToken = SecurityUtils.secureStorage.getSecure('refreshToken', false);

                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': SecurityUtils.csrf.getToken()
                    },
                    body: JSON.stringify({ refreshToken })
                });

                if (response.ok) {
                    const result = await response.json();
                    SecurityUtils.secureStorage.setSecure('authToken', result.token, true);
                    this.setTokenExpiry(this.config.tokenExpiry);
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.logout();
            }
        },

        // Validate input field
        validateInput: function(input) {
            const value = input.value;
            const type = input.type;
            const name = input.name;

            let isValid = true;
            let message = '';

            switch (type) {
                case 'email':
                    isValid = SecurityUtils.validateInput(value, 'email');
                    message = isValid ? '' : 'Invalid email address';
                    break;
                case 'password':
                    isValid = value.length >= this.config.passwordMinLength;
                    message = isValid ? '' : `Password must be at least ${this.config.passwordMinLength} characters`;
                    break;
                case 'text':
                    if (name === 'username') {
                        isValid = value.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(value);
                        message = isValid ? '' : 'Username must be at least 3 characters and contain only letters, numbers, underscore, or dash';
                    }
                    break;
            }

            // Show validation feedback
            this.showInputFeedback(input, isValid, message);

            return isValid;
        },

        // Show input feedback
        showInputFeedback: function(input, isValid, message) {
            // Remove existing feedback
            const existingFeedback = input.parentElement.querySelector('.feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }

            if (!isValid && message) {
                const feedback = document.createElement('div');
                feedback.className = 'feedback error';
                feedback.textContent = message;
                feedback.style.cssText = 'color: red; font-size: 12px; margin-top: 4px;';
                input.parentElement.appendChild(feedback);
            }
        },

        // UI Helper Methods
        showError: function(message) {
            const errorDiv = document.getElementById('loginError') || this.createErrorDiv();
            errorDiv.innerHTML = SecurityUtils ? SecurityUtils.sanitizeHtml(message) : message;
            errorDiv.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        },

        createErrorDiv: function() {
            const div = document.createElement('div');
            div.id = 'loginError';
            div.className = 'error-message';
            div.style.cssText = 'color: red; padding: 10px; margin: 10px 0; border: 1px solid red; border-radius: 4px; background: #ffe6e6;';

            const form = document.getElementById('loginForm');
            if (form) {
                form.insertBefore(div, form.firstChild);
            }

            return div;
        },

        showLoading: function(show) {
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = show;
                submitBtn.textContent = show ? 'Loading...' : 'Login';
            }
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecureAuth.init());
    } else {
        SecureAuth.init();
    }

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecureAuth;
    } else {
        window.SecureAuth = SecureAuth;
    }
})();