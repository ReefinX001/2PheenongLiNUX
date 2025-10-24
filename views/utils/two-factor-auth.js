// Two-Factor Authentication System
(function() {
    'use strict';

    const TwoFactorAuth = {
        // Configuration
        config: {
            otpLength: 6,
            otpExpiry: 300000, // 5 minutes
            maxAttempts: 3,
            backupCodesCount: 10,
            qrCodeSize: 256,
            allowedMethods: ['totp', 'sms', 'email', 'backup']
        },

        // Initialize 2FA
        init: function() {
            this.setupUI();
            this.loadUserPreferences();
        },

        // Generate TOTP Secret
        generateSecret: function() {
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let secret = '';
            const randomBytes = new Uint8Array(20);
            crypto.getRandomValues(randomBytes);

            for (let i = 0; i < 32; i++) {
                secret += charset[randomBytes[i % 20] % 32];
            }

            return secret;
        },

        // Generate TOTP Token
        generateTOTP: async function(secret, counter = null) {
            if (!counter) {
                counter = Math.floor(Date.now() / 30000);
            }

            // Decode base32 secret
            const decodedSecret = this.base32Decode(secret);

            // Create HMAC
            const key = await crypto.subtle.importKey(
                'raw',
                decodedSecret,
                { name: 'HMAC', hash: 'SHA-1' },
                false,
                ['sign']
            );

            // Convert counter to 8-byte buffer
            const counterBuffer = new ArrayBuffer(8);
            const view = new DataView(counterBuffer);
            view.setUint32(4, counter, false);

            // Generate HMAC
            const hmac = await crypto.subtle.sign('HMAC', key, counterBuffer);
            const hmacArray = new Uint8Array(hmac);

            // Dynamic truncation
            const offset = hmacArray[hmacArray.length - 1] & 0x0f;
            const truncated = (hmacArray[offset] & 0x7f) << 24 |
                            (hmacArray[offset + 1] & 0xff) << 16 |
                            (hmacArray[offset + 2] & 0xff) << 8 |
                            (hmacArray[offset + 3] & 0xff);

            // Generate 6-digit code
            const otp = truncated % 1000000;
            return otp.toString().padStart(6, '0');
        },

        // Verify TOTP Token
        verifyTOTP: async function(token, secret, window = 1) {
            const counter = Math.floor(Date.now() / 30000);

            // Check current and adjacent time windows
            for (let i = -window; i <= window; i++) {
                const expectedToken = await this.generateTOTP(secret, counter + i);
                if (this.timeSafeCompare(token, expectedToken)) {
                    return true;
                }
            }

            return false;
        },

        // Setup 2FA for user
        setup2FA: async function(userId, method = 'totp') {
            try {
                const setupData = {};

                switch (method) {
                    case 'totp':
                        const secret = this.generateSecret();
                        const qrCode = await this.generateQRCode(userId, secret);
                        const backupCodes = this.generateBackupCodes();

                        setupData.secret = secret;
                        setupData.qrCode = qrCode;
                        setupData.backupCodes = backupCodes;
                        setupData.method = 'totp';
                        break;

                    case 'sms':
                    case 'email':
                        setupData.method = method;
                        setupData.verified = false;
                        break;

                    default:
                        throw new Error('Invalid 2FA method');
                }

                // Send setup data to server
                const response = await this.sendRequest('/api/2fa/setup', {
                    userId: userId,
                    method: method,
                    setupData: setupData
                });

                if (response.success) {
                    this.show2FASetupUI(setupData);
                    return setupData;
                } else {
                    throw new Error(response.message || '2FA setup failed');
                }

            } catch (error) {
                console.error('2FA setup error:', error);
                this.showError('Failed to setup 2FA: ' + error.message);
                return null;
            }
        },

        // Generate QR Code for TOTP
        generateQRCode: async function(userId, secret) {
            const issuer = window.location.hostname;
            const label = `${issuer}:${userId}`;
            const uri = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

            // Generate QR code data URL (using simple ASCII representation)
            // In production, use a proper QR code library
            return this.createQRCodeDataURL(uri);
        },

        // Simple QR Code generator (replace with proper library in production)
        createQRCodeDataURL: function(data) {
            // This is a placeholder - use qrcode.js or similar in production
            const canvas = document.createElement('canvas');
            canvas.width = this.config.qrCodeSize;
            canvas.height = this.config.qrCodeSize;
            const ctx = canvas.getContext('2d');

            // Draw placeholder QR code
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#000000';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('QR Code for:', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillText(data.substring(0, 30) + '...', canvas.width / 2, canvas.height / 2);
            ctx.fillText('Use QR library in production', canvas.width / 2, canvas.height / 2 + 20);

            return canvas.toDataURL();
        },

        // Generate backup codes
        generateBackupCodes: function() {
            const codes = [];
            for (let i = 0; i < this.config.backupCodesCount; i++) {
                const code = this.generateRandomCode(8);
                codes.push(this.formatBackupCode(code));
            }
            return codes;
        },

        // Generate random code
        generateRandomCode: function(length) {
            const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let code = '';
            const randomBytes = new Uint8Array(length);
            crypto.getRandomValues(randomBytes);

            for (let i = 0; i < length; i++) {
                code += charset[randomBytes[i] % charset.length];
            }

            return code;
        },

        // Format backup code
        formatBackupCode: function(code) {
            // Format as XXXX-XXXX
            return code.substring(0, 4) + '-' + code.substring(4, 8);
        },

        // Verify 2FA code
        verify2FA: async function(userId, code, method = null) {
            try {
                // Check rate limiting
                if (!this.checkRateLimit(userId)) {
                    throw new Error('Too many attempts. Please try again later.');
                }

                const response = await this.sendRequest('/api/2fa/verify', {
                    userId: userId,
                    code: code,
                    method: method,
                    timestamp: Date.now()
                });

                if (response.success) {
                    this.resetRateLimit(userId);
                    return true;
                } else {
                    this.incrementFailedAttempts(userId);
                    return false;
                }

            } catch (error) {
                console.error('2FA verification error:', error);
                return false;
            }
        },

        // Send OTP via SMS or Email
        sendOTP: async function(userId, method) {
            try {
                const otp = this.generateRandomCode(this.config.otpLength);
                const expiry = Date.now() + this.config.otpExpiry;

                // Store OTP temporarily (encrypted)
                const encryptedOTP = await this.encryptOTP(otp, expiry);
                sessionStorage.setItem(`otp_${userId}`, encryptedOTP);

                // Send OTP to server for delivery
                const response = await this.sendRequest('/api/2fa/send-otp', {
                    userId: userId,
                    method: method,
                    otp: otp,
                    expiry: expiry
                });

                if (response.success) {
                    this.showOTPInput(method);
                    return true;
                } else {
                    throw new Error(response.message || 'Failed to send OTP');
                }

            } catch (error) {
                console.error('Send OTP error:', error);
                this.showError('Failed to send OTP: ' + error.message);
                return false;
            }
        },

        // Verify OTP
        verifyOTP: async function(userId, inputOTP) {
            try {
                const encryptedOTP = sessionStorage.getItem(`otp_${userId}`);
                if (!encryptedOTP) {
                    throw new Error('No OTP found. Please request a new one.');
                }

                const { otp, expiry } = await this.decryptOTP(encryptedOTP);

                if (Date.now() > expiry) {
                    sessionStorage.removeItem(`otp_${userId}`);
                    throw new Error('OTP has expired. Please request a new one.');
                }

                if (this.timeSafeCompare(inputOTP, otp)) {
                    sessionStorage.removeItem(`otp_${userId}`);
                    return true;
                } else {
                    return false;
                }

            } catch (error) {
                console.error('OTP verification error:', error);
                this.showError(error.message);
                return false;
            }
        },

        // Encrypt OTP for storage
        encryptOTP: async function(otp, expiry) {
            if (window.CryptoAES) {
                const data = JSON.stringify({ otp, expiry });
                return await CryptoAES.encrypt(data, 'otp-encryption-key');
            } else {
                // Fallback to base64 encoding (not secure)
                return btoa(JSON.stringify({ otp, expiry }));
            }
        },

        // Decrypt stored OTP
        decryptOTP: async function(encryptedOTP) {
            if (window.CryptoAES) {
                const decrypted = await CryptoAES.decrypt(encryptedOTP, 'otp-encryption-key');
                return JSON.parse(decrypted);
            } else {
                // Fallback from base64
                return JSON.parse(atob(encryptedOTP));
            }
        },

        // Rate limiting
        checkRateLimit: function(userId) {
            const key = `2fa_attempts_${userId}`;
            const attempts = JSON.parse(sessionStorage.getItem(key) || '[]');
            const now = Date.now();
            const recentAttempts = attempts.filter(time => now - time < 900000); // 15 minutes

            if (recentAttempts.length >= this.config.maxAttempts) {
                return false;
            }

            return true;
        },

        incrementFailedAttempts: function(userId) {
            const key = `2fa_attempts_${userId}`;
            const attempts = JSON.parse(sessionStorage.getItem(key) || '[]');
            attempts.push(Date.now());
            sessionStorage.setItem(key, JSON.stringify(attempts));
        },

        resetRateLimit: function(userId) {
            const key = `2fa_attempts_${userId}`;
            sessionStorage.removeItem(key);
        },

        // UI Functions
        setupUI: function() {
            // Create 2FA modal container
            if (!document.getElementById('twoFactorModal')) {
                const modal = document.createElement('div');
                modal.id = 'twoFactorModal';
                modal.className = 'two-factor-modal';
                modal.style.display = 'none';
                document.body.appendChild(modal);
            }
        },

        show2FASetupUI: function(setupData) {
            const modal = document.getElementById('twoFactorModal');

            let content = `
                <div class="two-factor-setup">
                    <h2>Setup Two-Factor Authentication</h2>
            `;

            if (setupData.method === 'totp') {
                content += `
                    <div class="qr-code-container">
                        <img src="${setupData.qrCode}" alt="QR Code" />
                        <p>Scan this QR code with your authenticator app</p>
                    </div>
                    <div class="manual-entry">
                        <p>Or enter this code manually:</p>
                        <code class="secret-code">${setupData.secret}</code>
                    </div>
                    <div class="backup-codes">
                        <h3>Backup Codes</h3>
                        <p>Save these codes in a secure place. Each can be used once if you lose access to your authenticator.</p>
                        <div class="codes-list">
                            ${setupData.backupCodes.map(code => `<code>${code}</code>`).join('')}
                        </div>
                    </div>
                `;
            }

            content += `
                    <div class="verification">
                        <label>Enter verification code:</label>
                        <input type="text" id="verificationCode" maxlength="6" />
                        <button onclick="TwoFactorAuth.completeSetup()">Complete Setup</button>
                    </div>
                    <button onclick="TwoFactorAuth.closeModal()">Cancel</button>
                </div>
            `;

            modal.innerHTML = content;
            modal.style.display = 'flex';
        },

        showOTPInput: function(method) {
            const modal = document.getElementById('twoFactorModal');

            const content = `
                <div class="two-factor-verify">
                    <h2>Enter Verification Code</h2>
                    <p>We've sent a verification code to your ${method === 'sms' ? 'phone' : 'email'}.</p>
                    <div class="otp-input">
                        <input type="text" id="otpCode" maxlength="${this.config.otpLength}" />
                        <button onclick="TwoFactorAuth.submitOTP()">Verify</button>
                    </div>
                    <p class="resend">
                        Didn't receive the code? 
                        <a href="#" onclick="TwoFactorAuth.resendOTP(); return false;">Resend</a>
                    </p>
                    <button onclick="TwoFactorAuth.closeModal()">Cancel</button>
                </div>
            `;

            modal.innerHTML = content;
            modal.style.display = 'flex';
        },

        completeSetup: async function() {
            const code = document.getElementById('verificationCode').value;
            // Implementation for completing setup
            console.log('Completing 2FA setup with code:', code);
        },

        submitOTP: async function() {
            const code = document.getElementById('otpCode').value;
            // Implementation for submitting OTP
            console.log('Submitting OTP:', code);
        },

        resendOTP: async function() {
            // Implementation for resending OTP
            console.log('Resending OTP');
        },

        closeModal: function() {
            const modal = document.getElementById('twoFactorModal');
            modal.style.display = 'none';
        },

        showError: function(message) {
            alert('2FA Error: ' + message);
        },

        // Utility Functions
        base32Decode: function(base32) {
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let bits = '';
            let result = new Uint8Array(Math.floor(base32.length * 5 / 8));

            for (let i = 0; i < base32.length; i++) {
                const val = charset.indexOf(base32[i].toUpperCase());
                if (val === -1) continue;
                bits += val.toString(2).padStart(5, '0');
            }

            for (let i = 0; i < result.length; i++) {
                result[i] = parseInt(bits.substr(i * 8, 8), 2);
            }

            return result;
        },

        timeSafeCompare: function(a, b) {
            if (a.length !== b.length) {
                return false;
            }

            let result = 0;
            for (let i = 0; i < a.length; i++) {
                result |= a.charCodeAt(i) ^ b.charCodeAt(i);
            }

            return result === 0;
        },

        // Load user preferences
        loadUserPreferences: function() {
            const prefs = localStorage.getItem('2fa_preferences');
            if (prefs) {
                const parsed = JSON.parse(prefs);
                Object.assign(this.config, parsed);
            }
        },

        // Save user preferences
        saveUserPreferences: function() {
            localStorage.setItem('2fa_preferences', JSON.stringify(this.config));
        },

        // Send request to server
        sendRequest: async function(url, data) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                return await response.json();
            } catch (error) {
                console.error('Request failed:', error);
                return { success: false, message: error.message };
            }
        }
    };

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .two-factor-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .two-factor-setup, .two-factor-verify {
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 100%;
        }
        
        .qr-code-container {
            text-align: center;
            margin: 20px 0;
        }
        
        .qr-code-container img {
            border: 1px solid #ddd;
            padding: 10px;
        }
        
        .secret-code {
            display: block;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            font-size: 16px;
            text-align: center;
            margin: 10px 0;
        }
        
        .backup-codes {
            margin: 20px 0;
            padding: 15px;
            background: #fff9e6;
            border: 1px solid #ffd700;
            border-radius: 4px;
        }
        
        .codes-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        
        .codes-list code {
            padding: 5px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
        }
        
        .verification {
            margin-top: 20px;
            text-align: center;
        }
        
        .verification input, .otp-input input {
            width: 200px;
            padding: 10px;
            font-size: 18px;
            text-align: center;
            letter-spacing: 5px;
            margin: 10px 0;
        }
        
        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        
        button:hover {
            background: #0056b3;
        }
    `;
    document.head.appendChild(style);

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TwoFactorAuth.init());
    } else {
        TwoFactorAuth.init();
    }

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TwoFactorAuth;
    } else {
        window.TwoFactorAuth = TwoFactorAuth;
    }
})();