// AES-256 Encryption Module using Web Crypto API
(function() {
    'use strict';

    const CryptoAES = {
        // Configuration
        config: {
            algorithm: 'AES-GCM',
            keyLength: 256,
            ivLength: 12,
            saltLength: 16,
            tagLength: 128,
            iterations: 100000
        },

        // Generate cryptographically secure random bytes
        generateRandomBytes: function(length) {
            return crypto.getRandomValues(new Uint8Array(length));
        },

        // Derive key from password using PBKDF2
        deriveKey: async function(password, salt) {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            // Import password as key
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveKey']
            );

            // Derive AES key
            return crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.config.iterations,
                    hash: 'SHA-256'
                },
                passwordKey,
                {
                    name: this.config.algorithm,
                    length: this.config.keyLength
                },
                false,
                ['encrypt', 'decrypt']
            );
        },

        // Generate new encryption key
        generateKey: async function() {
            return crypto.subtle.generateKey(
                {
                    name: this.config.algorithm,
                    length: this.config.keyLength
                },
                true,
                ['encrypt', 'decrypt']
            );
        },

        // Export key to storable format
        exportKey: async function(key) {
            const exported = await crypto.subtle.exportKey('raw', key);
            return this.bufferToBase64(exported);
        },

        // Import key from stored format
        importKey: async function(keyData) {
            const keyBuffer = this.base64ToBuffer(keyData);
            return crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: this.config.algorithm,
                    length: this.config.keyLength
                },
                false,
                ['encrypt', 'decrypt']
            );
        },

        // Encrypt data with AES-256-GCM
        encrypt: async function(plaintext, password) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(plaintext);

                // Generate salt and IV
                const salt = this.generateRandomBytes(this.config.saltLength);
                const iv = this.generateRandomBytes(this.config.ivLength);

                // Derive key from password
                const key = await this.deriveKey(password, salt);

                // Encrypt
                const encrypted = await crypto.subtle.encrypt(
                    {
                        name: this.config.algorithm,
                        iv: iv,
                        tagLength: this.config.tagLength
                    },
                    key,
                    data
                );

                // Combine salt, iv, and encrypted data
                const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
                combined.set(salt, 0);
                combined.set(iv, salt.length);
                combined.set(new Uint8Array(encrypted), salt.length + iv.length);

                // Return base64 encoded
                return this.bufferToBase64(combined.buffer);
            } catch (error) {
                console.error('Encryption failed:', error);
                throw new Error('Failed to encrypt data');
            }
        },

        // Decrypt data with AES-256-GCM
        decrypt: async function(encryptedData, password) {
            try {
                // Decode from base64
                const combined = new Uint8Array(this.base64ToBuffer(encryptedData));

                // Extract salt, iv, and encrypted data
                const salt = combined.slice(0, this.config.saltLength);
                const iv = combined.slice(this.config.saltLength, this.config.saltLength + this.config.ivLength);
                const encrypted = combined.slice(this.config.saltLength + this.config.ivLength);

                // Derive key from password
                const key = await this.deriveKey(password, salt);

                // Decrypt
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: this.config.algorithm,
                        iv: iv,
                        tagLength: this.config.tagLength
                    },
                    key,
                    encrypted
                );

                // Decode and return plaintext
                const decoder = new TextDecoder();
                return decoder.decode(decrypted);
            } catch (error) {
                console.error('Decryption failed:', error);
                throw new Error('Failed to decrypt data');
            }
        },

        // Encrypt with key (faster than password)
        encryptWithKey: async function(plaintext, key) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(plaintext);

                // Generate IV
                const iv = this.generateRandomBytes(this.config.ivLength);

                // Encrypt
                const encrypted = await crypto.subtle.encrypt(
                    {
                        name: this.config.algorithm,
                        iv: iv,
                        tagLength: this.config.tagLength
                    },
                    key,
                    data
                );

                // Combine iv and encrypted data
                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                combined.set(iv, 0);
                combined.set(new Uint8Array(encrypted), iv.length);

                return this.bufferToBase64(combined.buffer);
            } catch (error) {
                console.error('Encryption failed:', error);
                throw new Error('Failed to encrypt data');
            }
        },

        // Decrypt with key (faster than password)
        decryptWithKey: async function(encryptedData, key) {
            try {
                // Decode from base64
                const combined = new Uint8Array(this.base64ToBuffer(encryptedData));

                // Extract iv and encrypted data
                const iv = combined.slice(0, this.config.ivLength);
                const encrypted = combined.slice(this.config.ivLength);

                // Decrypt
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: this.config.algorithm,
                        iv: iv,
                        tagLength: this.config.tagLength
                    },
                    key,
                    encrypted
                );

                // Decode and return plaintext
                const decoder = new TextDecoder();
                return decoder.decode(decrypted);
            } catch (error) {
                console.error('Decryption failed:', error);
                throw new Error('Failed to decrypt data');
            }
        },

        // Hash data using SHA-256
        hash: async function(data) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            return this.bufferToHex(hashBuffer);
        },

        // Create HMAC signature
        sign: async function(data, secret) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const keyBuffer = encoder.encode(secret);

            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: 'HMAC',
                    hash: 'SHA-256'
                },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
            return this.bufferToBase64(signature);
        },

        // Verify HMAC signature
        verify: async function(data, signature, secret) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const keyBuffer = encoder.encode(secret);
            const signatureBuffer = this.base64ToBuffer(signature);

            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: 'HMAC',
                    hash: 'SHA-256'
                },
                false,
                ['verify']
            );

            return crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer);
        },

        // Secure key derivation for passwords
        derivePasswordKey: async function(password, salt = null) {
            if (!salt) {
                salt = this.generateRandomBytes(this.config.saltLength);
            }

            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            const key = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits']
            );

            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.config.iterations,
                    hash: 'SHA-256'
                },
                key,
                256
            );

            return {
                key: this.bufferToBase64(derivedBits),
                salt: this.bufferToBase64(salt)
            };
        },

        // Secure random token generation
        generateSecureToken: function(length = 32) {
            const bytes = this.generateRandomBytes(length);
            return this.bufferToBase64url(bytes);
        },

        // Time-constant comparison to prevent timing attacks
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

        // Utility functions
        bufferToBase64: function(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        },

        base64ToBuffer: function(base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        },

        bufferToBase64url: function(buffer) {
            return this.bufferToBase64(buffer)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        },

        bufferToHex: function(buffer) {
            const bytes = new Uint8Array(buffer);
            return Array.from(bytes)
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        },

        // Secure storage with AES encryption
        secureStorage: {
            masterKey: null,

            // Initialize with master password
            init: async function(masterPassword) {
                const stored = sessionStorage.getItem('_mk');
                if (stored) {
                    const { salt } = JSON.parse(stored);
                    const derived = await CryptoAES.derivePasswordKey(masterPassword, CryptoAES.base64ToBuffer(salt));
                    this.masterKey = derived.key;
                } else {
                    const derived = await CryptoAES.derivePasswordKey(masterPassword);
                    this.masterKey = derived.key;
                    sessionStorage.setItem('_mk', JSON.stringify({ salt: derived.salt }));
                }
            },

            // Store encrypted data
            set: async function(key, value) {
                if (!this.masterKey) {
                    throw new Error('Secure storage not initialized');
                }

                const encrypted = await CryptoAES.encrypt(JSON.stringify(value), this.masterKey);
                localStorage.setItem(`_enc_${key}`, encrypted);
            },

            // Retrieve and decrypt data
            get: async function(key) {
                if (!this.masterKey) {
                    throw new Error('Secure storage not initialized');
                }

                const encrypted = localStorage.getItem(`_enc_${key}`);
                if (!encrypted) return null;

                try {
                    const decrypted = await CryptoAES.decrypt(encrypted, this.masterKey);
                    return JSON.parse(decrypted);
                } catch (error) {
                    console.error('Failed to decrypt stored data');
                    return null;
                }
            },

            // Remove encrypted data
            remove: function(key) {
                localStorage.removeItem(`_enc_${key}`);
            },

            // Clear all encrypted data
            clear: function() {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith('_enc_')) {
                        localStorage.removeItem(key);
                    }
                });
                this.masterKey = null;
                sessionStorage.removeItem('_mk');
            }
        }
    };

    // Check Web Crypto API availability
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        console.error('Web Crypto API not available. AES encryption requires HTTPS in production.');
    }

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CryptoAES;
    } else {
        window.CryptoAES = CryptoAES;
    }
})();