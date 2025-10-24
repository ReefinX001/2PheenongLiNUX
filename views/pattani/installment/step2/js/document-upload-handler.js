/**
 * Document Upload Handler
 * จัดการการอัปโหลดเอกสารไปยัง server และเชื่อมต่อกับ quotationController
 */

class DocumentUploadHandler {
  constructor() {
    this.uploadQueue = [];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    this.uploadedDocuments = {};

    this.initialize();
  }

  initialize() {
    console.log('📤 Initializing Document Upload Handler...');
    this.setupUploadEndpoint();
    console.log('✅ Document Upload Handler initialized');
  }

  setupUploadEndpoint() {
    // Create upload endpoint if it doesn't exist
    this.checkServerEndpoint();
  }

  async checkServerEndpoint() {
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'OPTIONS'
      });

      if (!response.ok) {
        console.warn('⚠️ Document upload endpoint not available, using fallback');
        this.useFallbackUpload = true;
      }
    } catch (error) {
      console.warn('⚠️ Cannot reach upload endpoint, using fallback');
      this.useFallbackUpload = true;
    }
  }

  async uploadDocument(file, documentType, metadata = {}) {
    console.log(`📤 Uploading ${documentType}:`, {
      fileName: file.name || 'captured-photo.jpg',
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      let uploadResult;

      if (this.useFallbackUpload) {
        // Use fallback upload (base64 encoding)
        uploadResult = await this.fallbackUpload(file, documentType, metadata);
      } else {
        // Use proper multipart upload
        uploadResult = await this.multipartUpload(file, documentType, metadata);
      }

      // Store uploaded document data
      this.uploadedDocuments[documentType] = {
        ...uploadResult,
        originalFile: file,
        uploadedAt: new Date().toISOString(),
        metadata
      };

      console.log(`✅ Successfully uploaded ${documentType}`);
      return uploadResult;

    } catch (error) {
      console.error(`❌ Failed to upload ${documentType}:`, error);
      throw error;
    }
  }

  async multipartUpload(file, documentType, metadata) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('customerId', this.getCurrentCustomerId());
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }

    return {
      url: result.data.url,
      filename: result.data.filename,
      size: result.data.size,
      type: result.data.type,
      uploadId: result.data.uploadId || Date.now().toString()
    };
  }

  async fallbackUpload(file, documentType, metadata) {
    console.log(`📤 Using fallback upload for ${documentType}`);

    // Convert file to base64
    const base64Data = await this.fileToBase64(file);

    // Store in localStorage for later use
    const documentData = {
      data: base64Data,
      type: file.type,
      size: file.size,
      name: file.name || `${documentType}-${Date.now()}.jpg`,
      documentType,
      uploadedAt: new Date().toISOString(),
      metadata
    };

    const storageKey = `document_${documentType}_${this.getCurrentCustomerId()}`;
    localStorage.setItem(storageKey, JSON.stringify(documentData));

    // Create object URL for preview
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);

    return {
      url: url,
      filename: documentData.name,
      size: file.size,
      type: file.type,
      uploadId: `fallback_${Date.now()}`,
      isLocal: true,
      storageKey: storageKey
    };
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  validateFile(file) {
    if (!file) {
      return { isValid: false, error: 'ไม่มีไฟล์' };
    }

    if (file.size > this.maxFileSize) {
      return { isValid: false, error: `ไฟล์ใหญ่เกินไป (สูงสุด ${this.maxFileSize / (1024 * 1024)}MB)` };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ JPG, PNG, PDF)' };
    }

    return { isValid: true };
  }

  getCurrentCustomerId() {
    // Try multiple sources for customer ID
    return localStorage.getItem('currentCustomerId') ||
           sessionStorage.getItem('customerId') ||
           document.getElementById('customerIdCard')?.value ||
           `temp_${Date.now()}`;
  }

  // Get all uploaded documents for form submission
  getUploadedDocuments() {
    const documents = {};

    Object.keys(this.uploadedDocuments).forEach(documentType => {
      const doc = this.uploadedDocuments[documentType];

      if (doc.isLocal) {
        // For local storage documents, include base64 data
        const storedData = localStorage.getItem(doc.storageKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          documents[documentType] = {
            url: doc.url,
            data: parsedData.data, // base64 data
            type: doc.type,
            filename: doc.filename,
            uploadedAt: doc.uploadedAt,
            isLocal: true
          };
        }
      } else {
        // For server documents, just include URL
        documents[documentType] = {
          url: doc.url,
          filename: doc.filename,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
          uploadId: doc.uploadId
        };
      }
    });

    return documents;
  }

  // Prepare documents for installment submission
  prepareDocumentsForSubmission() {
    const documents = this.getUploadedDocuments();
    const attachments = {};

    // Map document types to installment controller expected format
    const documentMapping = {
      idCard: 'id_card_image',
      selfie: 'selfie_image',
      salarySlip: 'income_slip',
      customerSignature: 'customer_signature',
      salespersonSignature: 'salesperson_signature'
    };

    Object.keys(documents).forEach(documentType => {
      const mappedKey = documentMapping[documentType];
      if (mappedKey) {
        const doc = documents[documentType];

        if (doc.isLocal && doc.data) {
          // For local documents, use base64 data
          attachments[mappedKey] = doc.data;
        } else {
          // For server documents, use URL
          attachments[mappedKey] = doc.url;
        }
      }
    });

    console.log('📋 Prepared documents for submission:', Object.keys(attachments));
    return attachments;
  }

  // Clean up resources
  cleanup() {
    // Revoke object URLs to free memory
    Object.keys(this.uploadedDocuments).forEach(documentType => {
      const doc = this.uploadedDocuments[documentType];
      if (doc.url && doc.url.startsWith('blob:')) {
        URL.revokeObjectURL(doc.url);
      }
    });

    this.uploadedDocuments = {};
    console.log('🧹 Document upload handler cleaned up');
  }

  // Remove a specific document
  removeDocument(documentType) {
    const doc = this.uploadedDocuments[documentType];
    if (doc) {
      // Clean up URL
      if (doc.url && doc.url.startsWith('blob:')) {
        URL.revokeObjectURL(doc.url);
      }

      // Remove from localStorage if local
      if (doc.isLocal && doc.storageKey) {
        localStorage.removeItem(doc.storageKey);
      }

      delete this.uploadedDocuments[documentType];
      console.log(`🗑️ Removed ${documentType} document`);
    }
  }

  // Get upload progress (for future enhancement)
  getUploadProgress() {
    const total = Object.keys(this.uploadedDocuments).length;
    const completed = Object.values(this.uploadedDocuments).filter(doc => doc.uploadedAt).length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // Validate all required documents
  validateRequiredDocuments() {
    const requiredDocuments = ['idCard', 'selfie', 'customerSignature'];
    const missingDocuments = [];

    requiredDocuments.forEach(docType => {
      if (!this.uploadedDocuments[docType]) {
        missingDocuments.push(docType);
      }
    });

    return {
      isValid: missingDocuments.length === 0,
      missingDocuments,
      completedDocuments: Object.keys(this.uploadedDocuments),
      totalRequired: requiredDocuments.length,
      completedRequired: requiredDocuments.length - missingDocuments.length
    };
  }

  // Reset all uploads
  reset() {
    this.cleanup();
    this.uploadQueue = [];
    console.log('🔄 Document upload handler reset');
  }
}

// Initialize upload handler
let documentUploadHandler;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    documentUploadHandler = new DocumentUploadHandler();
    window.documentUploadHandler = documentUploadHandler;
  });
} else {
  documentUploadHandler = new DocumentUploadHandler();
  window.documentUploadHandler = documentUploadHandler;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentUploadHandler;
}