// Enhanced File Upload Security Middleware
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const fileType = require('file-type');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// File validation configuration
const FILE_CONFIG = {
  maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  allowedMimeTypes: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  dangerousPatterns: [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ],
  quarantinePath: './uploads/quarantine',
  uploadPath: './uploads/secure'
};

// Create secure storage configuration
const secureStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(FILE_CONFIG.quarantinePath, req.user?.userId || 'anonymous');

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    // Generate secure filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const sanitizedName = path.basename(file.originalname)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
    const secureFilename = `${timestamp}-${uniqueSuffix}-${sanitizedName}`;

    // Store original filename for reference
    file.secureFilename = secureFilename;
    file.uploadTimestamp = timestamp;

    cb(null, secureFilename);
  }
});

// Advanced file filter with multiple checks
const advancedFileFilter = async (req, file, cb) => {
  try {
    // 1. Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = Object.values(FILE_CONFIG.allowedMimeTypes).flat();

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`File type ${ext} not allowed`), false);
    }

    // 2. Check MIME type
    if (!FILE_CONFIG.allowedMimeTypes[file.mimetype]) {
      return cb(new Error(`MIME type ${file.mimetype} not allowed`), false);
    }

    // 3. Check for double extensions
    const filename = path.basename(file.originalname);
    const parts = filename.split('.');
    if (parts.length > 2) {
      const suspiciousExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.com'];
      for (const suspExt of suspiciousExtensions) {
        if (filename.includes(suspExt)) {
          console.warn('⚠️ Suspicious double extension detected:', filename);
          return cb(new Error('Suspicious filename detected'), false);
        }
      }
    }

    // 4. Check filename for path traversal
    if (filename.includes('../') || filename.includes('..\\')) {
      return cb(new Error('Path traversal attempt detected'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// File content scanner
class FileScanner {
  /**
   * Scan file for malicious content
   */
  static async scanFile(filepath) {
    try {
      // 1. Verify actual file type using magic bytes
      const fileTypeResult = await fileType.fromFile(filepath);

      if (!fileTypeResult) {
        throw new Error('Unable to determine file type');
      }

      // Check if detected type matches allowed types
      if (!FILE_CONFIG.allowedMimeTypes[fileTypeResult.mime]) {
        throw new Error(`Detected file type ${fileTypeResult.mime} not allowed`);
      }

      // 2. Scan for malicious patterns in file content
      const content = await fs.readFile(filepath, 'utf8').catch(() => null);

      if (content) {
        for (const pattern of FILE_CONFIG.dangerousPatterns) {
          if (pattern.test(content)) {
            throw new Error('Potentially malicious content detected');
          }
        }
      }

      // 3. Check file size
      const stats = await fs.stat(filepath);
      if (stats.size > FILE_CONFIG.maxSize) {
        throw new Error(`File size ${stats.size} exceeds maximum ${FILE_CONFIG.maxSize}`);
      }

      // 4. Calculate file hash for integrity
      const hash = await this.calculateFileHash(filepath);

      return {
        safe: true,
        actualType: fileTypeResult.mime,
        size: stats.size,
        hash
      };
    } catch (error) {
      return {
        safe: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate file hash
   */
  static async calculateFileHash(filepath) {
    const fileBuffer = await fs.readFile(filepath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Quarantine suspicious file
   */
  static async quarantineFile(filepath, reason) {
    const filename = path.basename(filepath);
    const quarantinePath = path.join(FILE_CONFIG.quarantinePath, 'suspicious', `${Date.now()}-${filename}`);

    await fs.mkdir(path.dirname(quarantinePath), { recursive: true });
    await fs.rename(filepath, quarantinePath);

    // Log quarantine event
    console.warn('⚠️ File quarantined:', {
      originalPath: filepath,
      quarantinePath,
      reason
    });

    return quarantinePath;
  }

  /**
   * Move file to secure storage
   */
  static async moveToSecureStorage(filepath, userId) {
    const filename = path.basename(filepath);
    const securePath = path.join(FILE_CONFIG.uploadPath, userId, filename);

    await fs.mkdir(path.dirname(securePath), { recursive: true });
    await fs.rename(filepath, securePath);

    return securePath;
  }
}

// Create multer upload instance
const upload = multer({
  storage: secureStorage,
  fileFilter: advancedFileFilter,
  limits: {
    fileSize: FILE_CONFIG.maxSize,
    files: 10, // Maximum 10 files per request
    fields: 20, // Maximum 20 fields
    parts: 30 // Maximum parts (fields + files)
  }
});

// Post-upload security middleware
const postUploadSecurity = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  const scanResults = [];

  try {
    for (const file of files) {
      // Scan each uploaded file
      const scanResult = await FileScanner.scanFile(file.path);

      if (!scanResult.safe) {
        // Quarantine suspicious file
        await FileScanner.quarantineFile(file.path, scanResult.error);

        // Log security event
        console.error('🚨 Malicious file detected:', {
          filename: file.originalname,
          reason: scanResult.error,
          user: req.user?.userId,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'File security check failed',
          message: scanResult.error
        });
      }

      // Move to secure storage if safe
      const securePath = await FileScanner.moveToSecureStorage(
        file.path,
        req.user?.userId || 'anonymous'
      );

      // Update file information
      file.securePath = securePath;
      file.hash = scanResult.hash;
      file.verifiedType = scanResult.actualType;

      scanResults.push({
        filename: file.originalname,
        ...scanResult
      });
    }

    // Attach scan results to request
    req.fileScanResults = scanResults;

    next();
  } catch (error) {
    console.error('Error in post-upload security:', error);

    // Clean up files on error
    for (const file of files) {
      await fs.unlink(file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: 'File processing failed',
      message: 'An error occurred while processing the uploaded files'
    });
  }
};

// File download security
const secureFileDownload = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Validate file access permissions
    // This should check if user has permission to download this file

    // Set security headers for file download
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Download-Options', 'noopen');

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
};

// Clean up old files periodically
const fileCleanupJob = async () => {
  try {
    const quarantinePath = FILE_CONFIG.quarantinePath;
    const files = await fs.readdir(quarantinePath);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filepath = path.join(quarantinePath, file);
      const stats = await fs.stat(filepath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filepath);
        console.log('Cleaned up old quarantine file:', file);
      }
    }
  } catch (error) {
    console.error('Error in file cleanup job:', error);
  }
};

// Schedule cleanup job
setInterval(fileCleanupJob, 60 * 60 * 1000); // Every hour

module.exports = {
  upload,
  postUploadSecurity,
  secureFileDownload,
  FileScanner,
  FILE_CONFIG
};