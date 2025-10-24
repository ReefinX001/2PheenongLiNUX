// Two-Factor Authentication Service
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TwoFactorAuthService {
  constructor() {
    this.issuer = process.env.COMPANY_NAME || 'MyAccountingApp';
  }

  /**
   * Generate a new 2FA secret for a user
   */
  generateSecret(username, email) {
    const secret = speakeasy.generateSecret({
      name: `${this.issuer} (${email})`,
      issuer: this.issuer,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
      backup_codes: this.generateBackupCodes()
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   */
  verifyToken(secret, token, window = 2) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window // Allow 2 time steps before/after for clock skew
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for recovery
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  hashBackupCode(code) {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code, hashedCodes) {
    const hashedInput = this.hashBackupCode(code);
    return hashedCodes.includes(hashedInput);
  }

  /**
   * Generate temporary one-time password for email/SMS
   */
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
  }

  /**
   * Send OTP via email
   */
  async sendOTPEmail(email, otp, purpose = 'login') {
    // Integrate with your email service
    const emailContent = {
      to: email,
      subject: `${this.issuer} - Your verification code`,
      html: `
        <h2>Verification Code</h2>
        <p>Your verification code for ${purpose} is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px;">${otp.code}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `
    };

    // Send email using your email service
    console.log('Sending OTP email:', emailContent);
    return true;
  }

  /**
   * Validate 2FA setup
   */
  async validateSetup(secret, token1, token2) {
    // Verify two consecutive tokens to ensure proper setup
    const firstValid = this.verifyToken(secret, token1);

    // Wait for next token window (30 seconds for TOTP)
    if (firstValid) {
      // In real implementation, store token1 and wait for user to provide token2
      const secondValid = this.verifyToken(secret, token2);
      return firstValid && secondValid && token1 !== token2;
    }

    return false;
  }

  /**
   * Check if 2FA is required based on risk assessment
   */
  assessRisk(req) {
    const factors = {
      newDevice: false,
      newLocation: false,
      suspiciousActivity: false,
      highValueTransaction: false
    };

    // Check for new device
    const knownDevices = req.user?.knownDevices || [];
    const currentDevice = req.get('user-agent');
    factors.newDevice = !knownDevices.includes(currentDevice);

    // Check for new location (simplified)
    const knownIPs = req.user?.knownIPs || [];
    factors.newLocation = !knownIPs.includes(req.ip);

    // Check for suspicious patterns
    const recentFailedAttempts = req.user?.failedLoginAttempts || 0;
    factors.suspiciousActivity = recentFailedAttempts > 3;

    // Calculate risk score
    const riskScore = Object.values(factors).filter(v => v).length;

    return {
      requireMFA: riskScore >= 2,
      factors,
      riskLevel: riskScore === 0 ? 'low' : riskScore === 1 ? 'medium' : 'high'
    };
  }

  /**
   * Rate limit OTP attempts
   */
  checkOTPRateLimit(userId, attempts = []) {
    const recentAttempts = attempts.filter(
      attempt => new Date() - attempt < 60 * 60 * 1000 // Last hour
    );

    if (recentAttempts.length >= 5) {
      return {
        allowed: false,
        waitTime: 60 * 60 * 1000 - (new Date() - recentAttempts[0]),
        message: 'Too many OTP attempts. Please try again later.'
      };
    }

    return { allowed: true };
  }
}

// Middleware for 2FA verification
const require2FA = async (req, res, next) => {
  // Skip for certain paths
  const skipPaths = ['/api/auth/2fa/setup', '/api/auth/2fa/verify'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  // Check if user has 2FA enabled
  if (!req.user?.twoFactorEnabled) {
    return next();
  }

  // Check if 2FA has been verified in this session
  if (req.session?.twoFactorVerified) {
    const verifiedAt = new Date(req.session.twoFactorVerifiedAt);
    const hoursSinceVerification = (new Date() - verifiedAt) / (1000 * 60 * 60);

    // Re-verify after 12 hours
    if (hoursSinceVerification < 12) {
      return next();
    }
  }

  // Require 2FA verification
  return res.status(403).json({
    success: false,
    error: 'Two-factor authentication required',
    require2FA: true
  });
};

module.exports = {
  TwoFactorAuthService: new TwoFactorAuthService(),
  require2FA
};