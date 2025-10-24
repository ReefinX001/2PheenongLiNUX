/**
 * Document Manager for Step 2 - Installment Application Documents
 * จัดการเอกสารประกอบการสมัครผ่อน
 */

// Immediate cleanup of corrupted localStorage entries
(function immediateCleanup() {
  console.log('🧹 Running immediate localStorage cleanup...');

  const keysToCheck = [];

  // Get all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('customer_') || key.includes('Signature'))) {
      keysToCheck.push(key);
    }
  }

  let cleanedCount = 0;
  keysToCheck.forEach(key => {
    const value = localStorage.getItem(key);
    if (value && (
      value === '[object Object]' ||
      value === 'undefined' ||
      value === 'null' ||
      value.startsWith('[object') ||
      value === 'NaN' ||
      value === ''
    )) {
      console.log(`🗑️ Immediate cleanup removing: ${key} = ${value}`);
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`✅ Immediate cleanup removed ${cleanedCount} corrupted entries`);
  }
})();

class DocumentManager {
  constructor() {
    this.documents = {
      idCard: { status: 'pending', file: null, preview: null },
      selfie: { status: 'pending', file: null, preview: null },
      salarySlip: { status: 'pending', file: null, preview: null },
      customerSignature: { status: 'pending', file: null, preview: null },
      salespersonSignature: { status: 'pending', file: null, preview: null }
    };

    this.currentStream = null;
    this.currentDocumentType = null;
    this.signaturePad = null;

    this.initialize();
  }

  initialize() {
    console.log('📄 Initializing Document Manager...');

    // Ensure document object is available
    if (typeof document === 'undefined') {
      console.error('❌ Document object not available during initialization');
      return;
    }

    // Function to perform initialization
    const performInitialization = () => {
      try {
        this.debugDOMElements();
        this.setupEventListeners();
        this.setupFileInputs();
        this.loadSavedDocuments(); // โหลดภาพที่บันทึกไว้จาก localStorage
        this.updateUI();
        console.log('✅ Document Manager initialized successfully');
      } catch (error) {
        console.error('❌ Error during Document Manager initialization:', error);
      }
    };

    // Check if DOM is ready
    if (document.readyState === 'loading') {
      // DOM is still loading, wait for it
      document.addEventListener('DOMContentLoaded', performInitialization);
    } else {
      // DOM is ready, but wait a bit more to ensure all elements are rendered
      setTimeout(performInitialization, 300);
    }
  }

  setupEventListeners() {
    console.log('⚠️ DocumentManager setupEventListeners called - deferring to integration method');
    // Don't setup duplicate event listeners here - will be handled by integrateWithExistingHandlers()

    // Only setup modal controls that don't conflict with existing handlers
    this.setupCameraModal();
    this.setupSignatureModal();
  }

  // New method to integrate with existing step2.html event handlers
  integrateWithExistingHandlers() {
    console.log('🔗 Integrating DocumentManager with existing handlers...');

    // Check if existing handlers already exist and work with them instead of replacing
    const existingCameraHandlers = {
      idCard: window.openIdCardCamera,
      selfie: window.openSelfieCamera,
      salarySlip: window.openSalarySlipCamera
    };

    const existingUploadHandlers = {
      idCard: document.getElementById('uploadIdCard'),
      selfie: document.getElementById('uploadSelfie'),
      salarySlip: document.getElementById('uploadSalarySlip')
    };

    // Override window functions to integrate with DocumentManager
    if (existingCameraHandlers.idCard) {
      console.log('🔗 Found existing idCard camera handler, integrating...');
      const originalHandler = existingCameraHandlers.idCard;
      window.openIdCardCamera = (...args) => {
        console.log('📷 Integrated idCard camera call');
        this.openCamera('idCard');
      };
    }

    if (existingCameraHandlers.selfie) {
      console.log('🔗 Found existing selfie camera handler, integrating...');
      window.openSelfieCamera = (...args) => {
        console.log('📷 Integrated selfie camera call');
        this.openCamera('selfie');
      };
    }

    // Make DocumentManager methods available globally for step2.html
    window.documentManagerIntegration = {
      openCamera: (type) => this.openCamera(type),
      openFileSelect: (type) => this.openFileSelect(type),
      handleFileUpload: (type, file) => this.handleFileUpload(type, file),
      showDocumentPreview: (type) => this.showDocumentPreview(type),
      openSignatureModal: (type) => this.openSignatureModal(type),
      updateSignaturePreview: (type) => this.updateSignaturePreview(type)
    };

    console.log('✅ DocumentManager integration complete');
  }

  cleanupCorruptedLocalStorage() {
    console.log('🧹 Cleaning up corrupted localStorage entries...');

    // List of all possible localStorage keys that might contain URLs
    const possibleKeys = [
      'customer_idCard_url',
      'customer_selfie_url',
      'customer_salarySlip_url',
      'customerSignature_url',
      'customerSignature',
      'salespersonSignature_url',
      'salespersonSignature'
    ];

    let cleanedCount = 0;

    possibleKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && (
        value === '[object Object]' ||
        value === 'undefined' ||
        value === 'null' ||
        value.startsWith('[object') ||
        value === 'NaN' ||
        value === ''
      )) {
        console.log(`🗑️ Removing corrupted localStorage entry: ${key} = ${value}`);
        localStorage.removeItem(key);
        cleanedCount++;
      }
    });

    // Also check all localStorage keys for any that might contain objects
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('customer_') || key.includes('Signature'))) {
        const value = localStorage.getItem(key);
        if (value && (
          value === '[object Object]' ||
          value === 'undefined' ||
          value === 'null' ||
          value.startsWith('[object')
        )) {
          console.log(`🗑️ Removing additional corrupted entry: ${key} = ${value}`);
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} corrupted localStorage entries`);
    }
  }

  setupFileInputs() {
    // Create hidden file inputs for each document type
    const documentTypes = ['idCard', 'selfie', 'salarySlip'];

    documentTypes.forEach(type => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = `${type}FileInput`;

      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          this.handleFileUpload(type, file);
        }
      });

      document.body.appendChild(fileInput);
    });
  }

  loadSavedDocuments() {
    console.log('📂 Loading saved documents from localStorage...');

    // First, clean up any corrupted localStorage entries
    this.cleanupCorruptedLocalStorage();

    // โหลดภาพที่บันทึกไว้จาก localStorage
    const documentTypes = ['idCard', 'selfie', 'salarySlip'];

    documentTypes.forEach(type => {
      const urlKey = `customer_${type}_url`;
      const savedUrl = localStorage.getItem(urlKey);

      if (savedUrl) {
        console.log(`🔍 Debug localStorage ${type}:`, {
          key: urlKey,
          value: savedUrl,
          type: typeof savedUrl,
          isObject: savedUrl === '[object Object]'
        });

        // Check if localStorage contains stringified objects
        let validUrl = '';

        if (typeof savedUrl === 'string') {
          if (savedUrl === '[object Object]' || savedUrl === 'undefined' || savedUrl === 'null') {
            console.warn(`⚠️ Invalid string value found for ${type}:`, savedUrl);
            localStorage.removeItem(urlKey);
          } else if (savedUrl.startsWith('{') || savedUrl.startsWith('[')) {
            // Try to parse JSON if it looks like a JSON string
            try {
              const parsed = JSON.parse(savedUrl);
              console.log(`🔍 Parsed JSON for ${type}:`, parsed);

              // Extract URL from parsed object
              if (typeof parsed === 'string') {
                validUrl = parsed;
              } else if (parsed && typeof parsed === 'object') {
                validUrl = parsed.url || parsed.src || parsed.data || '';
              }
            } catch (e) {
              console.warn(`⚠️ Failed to parse JSON for ${type}:`, e);
              localStorage.removeItem(urlKey);
            }
          } else {
            validUrl = savedUrl;
          }
        }

        console.log(`🔍 Final validUrl for ${type}:`, validUrl);

        if (validUrl && validUrl !== 'undefined' && validUrl !== 'null' && validUrl !== '[object Object]') {
          // อัปเดต document object
          this.documents[type] = {
            status: 'completed',
            file: null,
            preview: validUrl,
            url: validUrl,
            uploadedAt: new Date().toISOString()
          };

          // แสดงภาพ preview
          this.showDocumentPreview(type);
        } else {
          console.warn(`⚠️ No valid URL found for ${type}, clearing localStorage`);
          localStorage.removeItem(urlKey);
        }
      }
    });

    // โหลดลายเซ็น
    const signatureTypes = ['customerSignature', 'salespersonSignature'];
    signatureTypes.forEach(type => {
      const urlKey = `${type}_url`;
      const savedUrl = localStorage.getItem(urlKey) || localStorage.getItem(type);

      if (savedUrl) {
        console.log(`✅ Found saved ${type}:`, typeof savedUrl === 'string' ? savedUrl.substring(0, 50) + '...' : savedUrl);

        // Ensure saved URL is a valid string
        const validUrl = typeof savedUrl === 'string' ? savedUrl : '';

        if (validUrl && validUrl !== 'undefined' && validUrl !== 'null') {
          this.documents[type] = {
            status: 'completed',
            file: null,
            preview: validUrl,
            url: validUrl,
            uploadedAt: new Date().toISOString()
          };
        } else {
          console.warn(`⚠️ Invalid signature URL found for ${type}:`, savedUrl);
          // Clear invalid localStorage entries
          localStorage.removeItem(`${type}_url`);
          localStorage.removeItem(type);
        }
      }
    });

    console.log('📂 Loaded documents status:', {
      idCard: this.documents.idCard.status,
      selfie: this.documents.selfie.status,
      salarySlip: this.documents.salarySlip.status
    });
  }

  openFileSelect(documentType) {
    console.log(`📁 Opening file select for ${documentType}`);
    const fileInput = document.getElementById(`${documentType}FileInput`);
    if (fileInput) {
      fileInput.click();
    }
  }

  async openCamera(documentType) {
    console.log(`📷 Opening camera for ${documentType}`);
    this.currentDocumentType = documentType;

    try {
      // Create camera modal if it doesn't exist
      if (!document.getElementById('cameraModal')) {
        this.createCameraModal();
      }

      const modal = document.getElementById('cameraModal');
      const video = document.getElementById('cameraVideo');
      const title = document.getElementById('cameraModalTitle');

      // Set modal title
      const titles = {
        idCard: 'ถ่ายรูปบัตรประชาชน',
        selfie: 'ถ่ายรูปเซลฟี่พร้อมบัตร',
        salarySlip: 'ถ่ายรูปสลิปเงินเดือน'
      };

      title.textContent = titles[documentType] || 'ถ่ายรูป';

      // Request camera access
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: documentType === 'selfie' ? 'user' : 'environment'
        }
      });

      video.srcObject = this.currentStream;
      video.play();

      // Show modal - with null check
      if (modal && modal.style && modal.classList) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      } else {
        console.error('❌ Modal element not found or not properly initialized');
        throw new Error('Cannot show signature modal - modal element missing');
      }

      // Update document status
      this.updateDocumentStatus(documentType, 'capturing');

    } catch (error) {
      console.error('❌ Error accessing camera:', error);

      let errorMessage = 'ไม่สามารถเข้าถึงกล้องได้';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์ แล้วกดปุ่ม "อัปโหลดรูป" แทน';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'ไม่พบกล้องในอุปกรณ์ กรุณาใช้ปุ่ม "อัปโหลดรูป" แทน';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น กรุณาปิดแอปอื่นแล้วลองใหม่';
      }

      this.showToast(errorMessage, 'error');

      // Show file upload option as fallback
      setTimeout(() => {
        const uploadBtn = document.querySelector(`[data-document-type="${documentType}"][data-action="upload"]`);
        if (uploadBtn) {
          uploadBtn.click();
        }
      }, 2000);
    }
  }

  createCameraModal() {
    const modalHTML = `
      <div id="cameraModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 id="cameraModalTitle" class="text-lg font-semibold">ถ่ายรูป</h3>
            <button id="closeCameraModal" class="text-gray-500 hover:text-gray-700">
              <i class="bi bi-x-lg text-xl"></i>
            </button>
          </div>
          
          <div class="relative mb-4">
            <video id="cameraVideo" class="w-full h-64 bg-black rounded-lg object-cover" autoplay muted playsinline></video>
            <canvas id="cameraCanvas" class="hidden"></canvas>
          </div>
          
          <div class="flex gap-3 justify-center">
            <button id="capturePhoto" class="btn btn-primary">
              <i class="bi bi-camera"></i> ถ่ายรูป
            </button>
            <button id="retakePhoto" class="btn btn-outline hidden">
              <i class="bi bi-arrow-clockwise"></i> ถ่ายใหม่
            </button>
            <button id="confirmPhoto" class="btn btn-success hidden">
              <i class="bi bi-check"></i> ใช้รูปนี้
            </button>
          </div>
          
          <div id="capturedPreview" class="mt-4 hidden">
            <img id="previewImage" class="w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  setupCameraModal() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeCameraControls();
    });

    // Also try to initialize immediately if DOM is already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeCameraControls());
    } else {
      this.initializeCameraControls();
    }
  }

  initializeCameraControls() {
    // Close camera modal
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closeCameraModal') {
        this.closeCameraModal();
      }
    });

    // Capture photo
    document.addEventListener('click', (e) => {
      if (e.target.id === 'capturePhoto') {
        this.capturePhoto();
      }
    });

    // Retake photo
    document.addEventListener('click', (e) => {
      if (e.target.id === 'retakePhoto') {
        this.retakePhoto();
      }
    });

    // Confirm photo
    document.addEventListener('click', (e) => {
      if (e.target.id === 'confirmPhoto') {
        this.confirmPhoto();
      }
    });
  }

  capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const preview = document.getElementById('previewImage');
    const capturedPreview = document.getElementById('capturedPreview');

    if (!video || !canvas || !preview) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL (avoid CSP issues with blob URLs)
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    preview.src = dataURL;
    capturedPreview.classList.remove('hidden');

    // Convert data URL to blob for uploading
    fetch(dataURL)
      .then(res => res.blob())
      .then(blob => {
        this.tempCapturedImage = blob;
      });

    // Update button visibility
    document.getElementById('capturePhoto').classList.add('hidden');
    document.getElementById('retakePhoto').classList.remove('hidden');
    document.getElementById('confirmPhoto').classList.remove('hidden');
  }

  retakePhoto() {
    const capturedPreview = document.getElementById('capturedPreview');
    capturedPreview.classList.add('hidden');

    // Update button visibility
    document.getElementById('capturePhoto').classList.remove('hidden');
    document.getElementById('retakePhoto').classList.add('hidden');
    document.getElementById('confirmPhoto').classList.add('hidden');

    this.tempCapturedImage = null;
  }

  confirmPhoto() {
    if (this.tempCapturedImage && this.currentDocumentType) {
      this.handleFileUpload(this.currentDocumentType, this.tempCapturedImage);
      this.closeCameraModal();
    }
  }

  closeCameraModal() {
    const modal = document.getElementById('cameraModal');
    if (modal && modal.style && modal.classList) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    } else if (modal) {
      console.warn('⚠️ Modal found but style/classList missing');
    }

    // Stop camera stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    // Reset states
    this.currentDocumentType = null;
    this.tempCapturedImage = null;

    // Reset camera modal UI
    const capturedPreview = document.getElementById('capturedPreview');
    if (capturedPreview) capturedPreview.classList.add('hidden');

    const captureBtn = document.getElementById('capturePhoto');
    const retakeBtn = document.getElementById('retakePhoto');
    const confirmBtn = document.getElementById('confirmPhoto');

    if (captureBtn) captureBtn.classList.remove('hidden');
    if (retakeBtn) retakeBtn.classList.add('hidden');
    if (confirmBtn) confirmBtn.classList.add('hidden');
  }

  async handleFileUpload(documentType, file) {
    console.log(`📤 Processing ${documentType}:`, file.name || 'captured photo');

    try {
      // Update status to uploading/processing
      this.updateDocumentStatus(documentType, 'uploading');

      // For signatures, handle locally without server upload
      if (documentType.includes('Signature')) {
        console.log(`🖊️ Processing signature locally: ${documentType}`);
        this.handleSignatureLocally(documentType, file);
        return;
      }

      // For other documents, try server upload with fallback
      try {
        await this.uploadToServer(documentType, file);
      } catch (uploadError) {
        console.warn(`⚠️ Server upload failed for ${documentType}, using local storage fallback:`, uploadError.message);
        await this.handleDocumentLocally(documentType, file);
      }

    } catch (error) {
      console.error(`❌ Error processing ${documentType}:`, error);
      this.updateDocumentStatus(documentType, 'error');
      this.showToast(`เกิดข้อผิดพลาดในการประมวลผล${this.getDocumentDisplayName(documentType)}`, 'error');
    }
  }

  async handleSignatureLocally(documentType, file) {
    console.log(`🖊️ Handling signature locally: ${documentType}`);

    // Convert file to data URL for local storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      this.documents[documentType] = {
        status: 'completed',
        file: file,
        preview: dataUrl,
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
        storageType: 'local'
      };

      // Save to localStorage
      localStorage.setItem(`${documentType}_url`, dataUrl);
      console.log(`💾 Saved signature to localStorage: ${documentType}_url`);

      this.showDocumentPreview(documentType);
      this.updateDocumentStatus(documentType, 'completed');
      this.showToast(`บันทึก${this.getDocumentDisplayName(documentType)}สำเร็จ`, 'success');

      // Update form progress
      if (window.formProgressManager) {
        window.formProgressManager.refresh();
      }
    };

    reader.onerror = (error) => {
      console.error('❌ Error reading signature file:', error);
      throw new Error('Failed to process signature file');
    };

    reader.readAsDataURL(file);
  }

  async handleDocumentLocally(documentType, file) {
    console.log(`💾 Handling document locally: ${documentType}`);

    // Convert file to data URL for local storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      this.documents[documentType] = {
        status: 'completed',
        file: file,
        preview: dataUrl,
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
        storageType: 'local'
      };

      // Save to localStorage
      const storageKey = `customer_${documentType}_url`;
      localStorage.setItem(storageKey, dataUrl);
      console.log(`💾 Saved document to localStorage: ${storageKey}`);

      this.showDocumentPreview(documentType);
      this.updateDocumentStatus(documentType, 'completed');
      this.showToast(`บันทึก${this.getDocumentDisplayName(documentType)}สำเร็จ (ออฟไลน์)`, 'success');

      // Update form progress
      if (window.formProgressManager) {
        window.formProgressManager.refresh();
      }
    };

    reader.onerror = (error) => {
      console.error('❌ Error reading document file:', error);
      throw new Error('Failed to process document file');
    };

    reader.readAsDataURL(file);
  }

  async uploadToServer(documentType, file) {
    console.log(`☁️ Uploading ${documentType} to server...`);

    // Create FormData for upload
    const formData = new FormData();

    // Create filename with document type to help server identify it
    const timestamp = Date.now();
    const ext = file.name ? file.name.split('.').pop() : 'jpg';
    const filename = `${documentType}_${timestamp}.${ext}`;

    // Create a new file with proper name
    const renamedFile = new File([file], filename, { type: file.type });

    formData.append('file', renamedFile);
    formData.append('documentType', documentType);
    formData.append('customerId', this.getCurrentCustomerId());

    // Upload to server
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }

    // Store server response data
    const reader = new FileReader();
    reader.onload = (e) => {
      // Ensure we have a valid preview URL
      const previewUrl = result.data.url && typeof result.data.url === 'string'
        ? result.data.url
        : (typeof e.target.result === 'string' ? e.target.result : '');

      if (!previewUrl) {
        throw new Error(`No valid preview URL available for ${documentType}`);
      }

      this.documents[documentType] = {
        status: 'completed',
        file: file,
        preview: previewUrl,
        url: result.data.url || previewUrl,
        uploadedAt: new Date().toISOString(),
        storageType: 'server'
      };

      // บันทึก URL ลง localStorage สำหรับใช้แสดงภาพ
      if (result.data.url && typeof result.data.url === 'string') {
        const storageKey = `customer_${documentType}_url`;
        localStorage.setItem(storageKey, result.data.url);
        console.log(`💾 Saved ${documentType} URL to localStorage:`, storageKey, result.data.url);
      }

      this.showDocumentPreview(documentType);
      this.updateDocumentStatus(documentType, 'completed');
      this.showToast(`อัปโหลด${this.getDocumentDisplayName(documentType)}สำเร็จ`, 'success');

      // Update form progress
      if (window.formProgressManager) {
        window.formProgressManager.refresh();
      }
    };

    reader.readAsDataURL(file);
  }

  showDocumentPreview(documentType) {
    const documentData = this.documents[documentType];
    if (!documentData || !documentData.preview) {
      console.warn(`⚠️ No document data or preview for ${documentType}`);
      return;
    }

    console.log(`📸 Attempting to show preview for ${documentType}`, documentData);

    // Ensure we have access to the global document object
    if (typeof document === 'undefined' || !document.getElementById) {
      console.error('❌ Document object not available in showDocumentPreview');
      return;
    }

    // Wait for DOM elements to be available
    setTimeout(() => {
      try {
        const previewElement = document.getElementById(`${documentType}Preview`);
        const imageElement = document.getElementById(`${documentType}Image`);

        console.log(`🔍 Elements found - Preview: ${!!previewElement}, Image: ${!!imageElement}`);

        if (previewElement && imageElement) {
          // Debug: Log the actual documentData to see what's being passed
          console.log(`🔍 Debug ${documentType} documentData:`, documentData);
          console.log(`🔍 Debug ${documentType} preview type:`, typeof documentData.preview);
          console.log(`🔍 Debug ${documentType} preview value:`, documentData.preview);

          // Try to extract a valid URL from various possible formats
          let previewUrl = '';

          if (typeof documentData.preview === 'string') {
            previewUrl = documentData.preview;
          } else if (typeof documentData.url === 'string') {
            previewUrl = documentData.url;
          } else if (documentData.preview && typeof documentData.preview === 'object') {
            // If preview is an object, try to extract URL from common object properties
            console.log(`🔍 Preview is object, keys:`, Object.keys(documentData.preview));
            if (documentData.preview.url) {
              previewUrl = documentData.preview.url;
            } else if (documentData.preview.src) {
              previewUrl = documentData.preview.src;
            } else if (documentData.preview.data) {
              previewUrl = documentData.preview.data;
            }
          }

          console.log(`🔍 Final previewUrl for ${documentType}:`, previewUrl);

          if (!previewUrl || previewUrl === '[object Object]') {
            console.error(`❌ No valid preview URL for ${documentType}:`, {
              documentData,
              previewType: typeof documentData.preview,
              urlType: typeof documentData.url
            });
            return;
          }

          imageElement.src = previewUrl;
          imageElement.onload = () => {
            console.log(`✅ Image loaded successfully for ${documentType}`);
            previewElement.classList.remove('hidden');

            // Add preview actions if not already exists
            this.addPreviewActions(documentType, previewElement);
          };

          imageElement.onerror = () => {
            console.error(`❌ Failed to load image for ${documentType}`, {
              previewUrl,
              documentData: documentData
            });
          };
        } else {
          console.error(`❌ Preview elements not found for ${documentType}:`, {
            previewElement: !!previewElement,
            imageElement: !!imageElement,
            expectedPreviewId: `${documentType}Preview`,
            expectedImageId: `${documentType}Image`
          });
        }
      } catch (error) {
        console.error(`❌ Error in showDocumentPreview for ${documentType}:`, error);
      }
    }, 100);
  }

  addPreviewActions(documentType, previewElement) {
    // Check if actions already exist
    if (previewElement.querySelector('.preview-actions')) {
      return;
    }

    // Create preview overlay with actions
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100 rounded';

    const actions = document.createElement('div');
    actions.className = 'preview-actions flex gap-2';

    // View full size button
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn btn-sm btn-primary';
    viewBtn.innerHTML = '<i class="bi bi-eye"></i> ดูใหญ่';
    viewBtn.addEventListener('click', () => this.showFullPreview(documentType));

    // Retake button
    const retakeBtn = document.createElement('button');
    retakeBtn.type = 'button';
    retakeBtn.className = 'btn btn-sm btn-outline';
    retakeBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> ถ่ายใหม่';
    retakeBtn.addEventListener('click', () => this.retakeDocument(documentType));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-sm btn-error';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i> ลบ';
    deleteBtn.addEventListener('click', () => this.deleteDocument(documentType));

    actions.appendChild(viewBtn);
    actions.appendChild(retakeBtn);
    actions.appendChild(deleteBtn);
    overlay.appendChild(actions);

    // Make preview container relative for overlay positioning - with null check
    if (previewElement && previewElement.style) {
      previewElement.style.position = 'relative';
    } else {
      console.warn('⚠️ Cannot set preview element style - element or style missing');
    }
    previewElement.appendChild(overlay);

    // Add file info
    this.addFileInfo(documentType, previewElement);
  }

  addFileInfo(documentType, previewElement) {
    const documentData = this.documents[documentType];
    if (!documentData || !documentData.file) return;

    // Check if file info already exists
    if (previewElement.querySelector('.file-info')) {
      return;
    }

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info mt-2 text-xs text-gray-500';

    const fileSize = this.formatFileSize(documentData.file.size);
    const uploadTime = documentData.uploadedAt ? new Date(documentData.uploadedAt).toLocaleString('th-TH') : '';

    fileInfo.innerHTML = `
      <div class="flex justify-between items-center">
        <span><i class="bi bi-file-earmark"></i> ${fileSize}</span>
        ${uploadTime ? `<span><i class="bi bi-clock"></i> ${uploadTime}</span>` : ''}
      </div>
    `;

    previewElement.appendChild(fileInfo);
  }

  showFullPreview(documentType) {
    const documentData = this.documents[documentType];
    if (!documentData || !documentData.preview) return;

    // Create full preview modal
    const modalHTML = `
      <div id="fullPreviewModal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div class="relative max-w-4xl max-h-full">
          <button id="closeFullPreview" class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10">
            <i class="bi bi-x-lg"></i>
          </button>
          
          <div class="bg-white rounded-lg p-4">
            <div class="text-center mb-4">
              <h3 class="text-lg font-semibold">${this.getDocumentDisplayName(documentType)}</h3>
            </div>
            
            <div class="text-center">
              <img src="${documentData.preview}" alt="${this.getDocumentDisplayName(documentType)}" 
                   class="max-w-full max-h-96 object-contain rounded shadow-lg">
            </div>
            
            <div class="flex justify-center gap-3 mt-4">
              <button id="downloadDocument" class="btn btn-outline">
                <i class="bi bi-download"></i> ดาวน์โหลด
              </button>
              <button id="retakeFromModal" class="btn btn-primary">
                <i class="bi bi-arrow-repeat"></i> ถ่าย/อัปโหลดใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('fullPreviewModal');
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    document.getElementById('closeFullPreview').addEventListener('click', () => {
      document.getElementById('fullPreviewModal').remove();
    });

    document.getElementById('downloadDocument').addEventListener('click', () => {
      this.downloadDocument(documentType);
    });

    document.getElementById('retakeFromModal').addEventListener('click', () => {
      document.getElementById('fullPreviewModal').remove();
      this.retakeDocument(documentType);
    });

    // Close on backdrop click
    document.getElementById('fullPreviewModal').addEventListener('click', (e) => {
      if (e.target.id === 'fullPreviewModal') {
        document.getElementById('fullPreviewModal').remove();
      }
    });
  }

  retakeDocument(documentType) {
    // Show options for retake
    if (confirm(`ต้องการถ่าย/อัปโหลด${this.getDocumentDisplayName(documentType)}ใหม่ใช่หรือไม่?`)) {
      // Clear current document
      this.deleteDocument(documentType, false);

      // Show retake options
      this.showRetakeOptions(documentType);
    }
  }

  showRetakeOptions(documentType) {
    const modalHTML = `
      <div id="retakeOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 class="text-lg font-semibold mb-4 text-center">เลือกวิธีการอัปโหลดใหม่</h3>
          <p class="text-gray-600 mb-6 text-center">${this.getDocumentDisplayName(documentType)}</p>
          
          <div class="grid grid-cols-1 gap-3">
            <button id="retakeWithCamera" class="btn btn-primary w-full">
              <i class="bi bi-camera"></i> ถ่ายรูปด้วยกล้อง
            </button>
            <button id="retakeWithFile" class="btn btn-outline w-full">
              <i class="bi bi-upload"></i> เลือกไฟล์จากเครื่อง
            </button>
            <button id="cancelRetake" class="btn btn-ghost w-full">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    document.getElementById('retakeWithCamera').addEventListener('click', () => {
      document.getElementById('retakeOptionsModal').remove();
      this.openCamera(documentType);
    });

    document.getElementById('retakeWithFile').addEventListener('click', () => {
      document.getElementById('retakeOptionsModal').remove();
      this.openFileSelect(documentType);
    });

    document.getElementById('cancelRetake').addEventListener('click', () => {
      document.getElementById('retakeOptionsModal').remove();
    });
  }

  deleteDocument(documentType, showConfirm = true) {
    if (showConfirm && !confirm(`ต้องการลบ${this.getDocumentDisplayName(documentType)}ใช่หรือไม่?`)) {
      return;
    }

    // Reset document data
    this.documents[documentType] = {
      status: 'pending',
      file: null,
      preview: null
    };

    // Hide preview
    const previewElement = document.getElementById(`${documentType}Preview`);
    if (previewElement) {
      previewElement.classList.add('hidden');
      // Remove preview actions and file info
      const overlay = previewElement.querySelector('.preview-overlay');
      const fileInfo = previewElement.querySelector('.file-info');
      if (overlay) overlay.remove();
      if (fileInfo) fileInfo.remove();
    }

    // Update status
    this.updateDocumentStatus(documentType, 'pending');

    // Show success message
    if (showConfirm) {
      this.showToast(`ลบ${this.getDocumentDisplayName(documentType)}สำเร็จ`, 'success');
    }

    // Update form progress
    if (window.formProgressManager) {
      window.formProgressManager.refresh();
    }
  }

  downloadDocument(documentType) {
    const documentData = this.documents[documentType];
    if (!documentData || !documentData.preview) return;

    const link = document.createElement('a');
    link.href = documentData.preview;
    link.download = `${this.getDocumentDisplayName(documentType)}_${new Date().toISOString().split('T')[0]}.jpg`;
    link.click();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper Functions
  getDocumentDisplayName(documentType) {
    const displayNames = {
      idCard: 'รูปบัตรประชาชน',
      selfie: 'รูปเซลฟี่พร้อมบัตร',
      salarySlip: 'สลิปเงินเดือน',
      customerSignature: 'ลายเซ็นลูกค้า',
      salespersonSignature: 'ลายเซ็นพนักงานขาย'
    };
    return displayNames[documentType] || documentType;
  }

  // Convert dataURL to Blob for consistent file handling
  dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  getCurrentCustomerId() {
    // Try to get customer ID from various sources

    // 1. Try from ID card input
    const customerIdInput = document.getElementById('customerIdCard');
    if (customerIdInput && customerIdInput.value && customerIdInput.value !== 'undefined') {
      return customerIdInput.value;
    }

    // 2. Try from tax ID input
    const taxIdInput = document.getElementById('customerTaxId');
    if (taxIdInput && taxIdInput.value && taxIdInput.value !== 'undefined') {
      return taxIdInput.value;
    }

    // 3. Try from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const branchCode = urlParams.get('branch');
    if (branchCode && branchCode !== 'undefined') {
      return `${branchCode}_${Date.now()}`;
    }

    // 4. Try from localStorage
    const storedCustomerId = localStorage.getItem('currentCustomerId');
    if (storedCustomerId && storedCustomerId !== 'undefined') {
      return storedCustomerId;
    }

    // 5. Fallback to generating temporary ID with branch code
    const branch = urlParams.get('branch') || '00000';
    return `${branch}_customer_${Date.now()}`;
  }

  updateDocumentStatus(documentType, status) {
    const statusElement = document.getElementById(`${documentType}Status`);
    if (!statusElement) return;

      const statusConfig = {
        pending: { icon: 'clock', class: 'badge-warning', text: 'รอดำเนินการ' },
      capturing: { icon: 'camera', class: 'badge-info', text: 'กำลังถ่าย' },
      uploading: { icon: 'upload', class: 'badge-info', text: 'กำลังอัปโหลด' },
        completed: { icon: 'check-circle', class: 'badge-success', text: 'เสร็จสิ้น' },
      error: { icon: 'x-circle', class: 'badge-error', text: 'เกิดข้อผิดพลาด' }
      };

      const config = statusConfig[status] || statusConfig.pending;

    statusElement.innerHTML = `
          <i class="bi bi-${config.icon}"></i> ${config.text}
    `;
    statusElement.className = `status-badge ${config.class}`;

    // Update document object
    if (this.documents[documentType]) {
      this.documents[documentType].status = status;
    }
  }

  async openSignatureModal(signatureType) {
    console.log(`✍️ Opening signature modal for ${signatureType}`);

    try {
      // Validate signature type
      if (!signatureType || !['customer', 'salesperson'].includes(signatureType)) {
        throw new Error(`Invalid signature type: ${signatureType}`);
      }

      // Create signature modal if it doesn't exist
      let modal = document.getElementById('signatureModal');
      if (!modal) {
        console.log('📋 Creating signature modal...');
        this.createSignatureModal();

        // Wait for modal to be created in DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get modal reference after creation
        modal = document.getElementById('signatureModal');

        if (!modal) {
          throw new Error('Failed to create signature modal');
        }
      }

      const title = document.getElementById('signatureModalTitle');

      // Enhanced title handling with fallback
      const titles = {
        customer: 'ลายเซ็นลูกค้า',
        salesperson: 'ลายเซ็นพนักงานขาย'
      };

      if (title) {
        title.textContent = titles[signatureType] || 'ลายเซ็น';
      } else {
        console.warn('⚠️ Signature modal title element not found');
      }

      // Store current signature type before initialization
      this.currentSignatureType = signatureType;

      // Show modal first and wait for it to be fully rendered
      if (modal && modal.style && modal.classList) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Force reflow to ensure modal is visible
        modal.offsetHeight;

        // Wait for modal to be fully rendered
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
      }

      // Initialize signature pad with enhanced error handling after modal is shown
      try {
        console.log('🎨 Starting signature pad initialization...');
        const initResult = await this.initializeSignaturePad();
        if (initResult === false) {
          throw new Error('Signature pad initialization returned false');
        }
        console.log('✅ Signature pad initialized successfully');

        // Verify signature pad is really working
        if (this.signaturePad && typeof this.signaturePad.toDataURL === 'function') {
          // Show success message
          this.showToast('ระบบลายเซ็นพร้อมใช้งาน', 'success');
          console.log('🎯 Signature system fully operational:', {
            type: this.signaturePad._isFallback ? 'fallback' : 'standard',
            functions: Object.keys(this.signaturePad)
          });
        } else {
          throw new Error('Signature pad verification failed');
        }

      } catch (padError) {
        console.error('❌ Signature pad initialization failed:', padError);
        this.showToast('ไม่สามารถเตรียมระบบลายเซ็นได้ กรุณาลองใหม่', 'error');
        // Close modal on error
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
        return;
      }

      // Show modal with comprehensive checks
      if (modal && modal.style && modal.classList) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Focus on canvas for better user experience
        setTimeout(() => {
          const canvas = document.getElementById('signatureModalCanvas');
          if (canvas && canvas.focus) {
            canvas.focus();
          }
        }, 200);

        console.log(`✅ Signature modal opened for ${signatureType}`);

        // Show usage hint
        this.showToast(`กรุณาเซ็นลายเซ็น${signatureType === 'customer' ? 'ลูกค้า' : 'พนักงานขาย'}ในกรอบ`, 'info');

      } else {
        throw new Error('Signature modal elements not properly initialized');
      }

    } catch (error) {
      console.error('❌ Error opening signature modal:', error);
      this.showToast(`เกิดข้อผิดพลาดในการเปิดหน้าต่างลายเซ็น: ${error.message}`, 'error');

      // Reset state on error
      this.currentSignatureType = null;
    }
  }

  createSignatureModal() {
    const modalHTML = `
      <div id="signatureModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 id="signatureModalTitle" class="text-lg font-semibold">ลายเซ็น</h3>
            <button id="closeSignatureModal" class="text-gray-500 hover:text-gray-700">
              <i class="bi bi-x-lg text-xl"></i>
            </button>
          </div>
          
          <div class="mb-4">
            <canvas id="signatureModalCanvas" class="border border-gray-300 rounded-lg w-full h-48 bg-white cursor-crosshair"></canvas>
          </div>
          
          <div class="flex gap-3 justify-center">
            <button id="clearSignature" class="btn btn-outline">
              <i class="bi bi-eraser"></i> ล้าง
            </button>
            <button id="saveSignature" class="btn btn-primary">
              <i class="bi bi-check"></i> บันทึก
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  setupSignatureModal() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closeSignatureModal') {
        this.closeSignatureModal();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'clearSignature') {
        this.clearSignature();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'saveSignature') {
        this.saveSignature();
      }
    });
  }

  initializeSignaturePad() {
    console.log('🎨 Initializing signature pad...');

    // Enhanced canvas element validation with detailed logging
    console.log('🔍 Looking for signature canvas element...');
    const canvas = document.getElementById('signatureModalCanvas');
    if (!canvas) {
      console.error('❌ Signature canvas not found - DOM elements available:', {
        modalExists: !!document.getElementById('signatureModal'),
        availableElements: Array.from(document.querySelectorAll('[id*="signature"], [id*="canvas"]')).map(el => el.id)
      });
      this.showToast('กำลังเตรียมระบบลายเซ็น กรุณารอสักครู่...', 'info');

      // Try to create the modal if it doesn't exist
      if (!document.getElementById('signatureModal')) {
        console.log('🔨 Creating signature modal...');
        this.createSignatureModal();
        // Try again after creation
        setTimeout(() => {
          this.initializeSignaturePad();
        }, 200);
      }
      return false;
    }

    // Validate canvas context support
    if (!canvas.getContext || typeof canvas.getContext !== 'function') {
      console.error('❌ Canvas context not supported');
      this.showToast('เบราว์เซอร์ไม่รองรับระบบลายเซ็น', 'error');
      return false;
    }

    console.log('🎨 Canvas found and validated:', canvas);

    // Clear any existing signature pad safely
    if (this.signaturePad) {
      try {
        if (typeof this.signaturePad.clear === 'function') {
          this.signaturePad.clear();
        }
        if (typeof this.signaturePad.off === 'function') {
          this.signaturePad.off();
        }
      } catch (error) {
        console.warn('⚠️ Error clearing existing signature pad:', error);
      }
      this.signaturePad = null;
    }

    try {
      // Wait for canvas to be fully rendered
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            this._setupCanvasAndSignaturePad(canvas);
            resolve(true);
          } catch (error) {
            reject(error);
          }
        }, 100);
      }).catch(error => {
        console.error('❌ Error in signature pad setup:', error);
        console.log('🔄 Attempting fallback drawing system...');

        // Try fallback system immediately
        try {
          this.createFallbackDrawingSystem(canvas);
          if (this.signaturePad) {
            console.log('✅ Fallback system created successfully');
            this.showToast('ใช้ระบบลายเซ็นสำรอง', 'info');
            return true;
          } else {
            throw new Error('Fallback system failed to create signaturePad');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback system also failed:', fallbackError);
          this.showToast('ไม่สามารถเริ่มต้นระบบลายเซ็นได้ กรุณาปิดและเปิดหน้าต่างใหม่', 'error');
          return false;
        }
      });

    } catch (error) {
      console.error('❌ Error initializing signature pad:', error);

      // Final fallback attempt
      try {
        console.log('🚨 Final attempt: creating fallback system');
        this.createFallbackDrawingSystem(canvas);
        if (this.signaturePad) {
          console.log('✅ Final fallback successful');
          this.showToast('ใช้ระบบลายเซ็นสำรอง', 'info');
          return true;
        } else {
          throw new Error('Final fallback failed');
        }
      } catch (finalError) {
        console.error('❌ All attempts failed:', finalError);
        this.showToast('ไม่สามารถเริ่มต้นระบบลายเซ็นได้ กรุณารีเฟรชหน้า', 'error');
        return false;
      }
    }
  }

  _setupCanvasAndSignaturePad(canvas) {
    // Get canvas dimensions with validation
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Canvas has zero dimensions - not ready yet');
    }

    const dpr = window.devicePixelRatio || 1;

    console.log('🎨 Canvas dimensions:', {
      clientWidth: rect.width,
      clientHeight: rect.height,
      devicePixelRatio: dpr
    });

    // Set display size with enhanced validation
    if (!canvas.style) {
      throw new Error('Canvas style object not available');
    }

    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Set actual size in memory (scaled up for high DPI displays)
    canvas.width = Math.max(rect.width * dpr, 300); // Minimum width
    canvas.height = Math.max(rect.height * dpr, 150); // Minimum height

    // Get and validate context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Scale the drawing context
    ctx.scale(dpr, dpr);

    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    console.log('🎨 Final canvas setup:', {
      width: canvas.width,
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height
    });

    // Initialize SignaturePad with enhanced error handling
    if (typeof SignaturePad !== 'undefined') {
      console.log('🎨 SignaturePad library found, creating instance...');

      try {
        this.signaturePad = new SignaturePad(canvas, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)',
          minWidth: 0.5,
          maxWidth: 2.5,
          throttle: 16,
          minDistance: 5
        });

        // Validate SignaturePad creation
        if (!this.signaturePad || typeof this.signaturePad.toDataURL !== 'function') {
          throw new Error('SignaturePad creation failed or invalid instance');
        }

        console.log('✅ SignaturePad created successfully');

        // Add event listeners with error handling
        try {
          if (typeof this.signaturePad.addEventListener === 'function') {
            this.signaturePad.addEventListener('beginStroke', () => {
              console.log('🎨 Signature drawing started');
            });

            this.signaturePad.addEventListener('endStroke', () => {
              console.log('🎨 Signature drawing ended');
            });
          }
        } catch (eventError) {
          console.warn('⚠️ Could not add event listeners:', eventError);
        }

        return true;

      } catch (signaturePadError) {
        console.error('❌ SignaturePad creation failed:', signaturePadError);
        throw new Error('SignaturePad library error: ' + signaturePadError.message);
      }

    } else {
      console.warn('⚠️ SignaturePad library not loaded, using fallback');
      this.createFallbackDrawingSystem(canvas);
      return true;
    }
  }

  createFallbackDrawingSystem(canvas) {
    console.log('🎨 Creating enhanced fallback drawing system...');

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasDrawn = false; // Track if anything has been drawn

    // Enhanced drawing settings
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;

    // Clear canvas with white background initially
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startDrawing = (e) => {
      isDrawing = true;
      hasDrawn = true; // Mark that drawing has started
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width; // Account for high DPI
      lastX = (e.clientX - rect.left) * scale;
      lastY = (e.clientY - rect.top) * scale;

      // Draw a dot for single clicks
      ctx.beginPath();
      ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width; // Account for high DPI
      const currentX = (e.clientX - rect.left) * scale;
      const currentY = (e.clientY - rect.top) * scale;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    // Enhanced touch support
    const getTouch = (e) => e.touches[0] || e.changedTouches[0];

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = getTouch(e);
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;

      isDrawing = true;
      hasDrawn = true;
      lastX = (touch.clientX - rect.left) * scale;
      lastY = (touch.clientY - rect.top) * scale;

      // Draw dot for touch start
      ctx.beginPath();
      ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing) return;

      const touch = getTouch(e);
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const currentX = (touch.clientX - rect.left) * scale;
      const currentY = (touch.clientY - rect.top) * scale;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      isDrawing = false;
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Enhanced touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Create an enhanced mock signature pad object
    this.signaturePad = {
      clear: () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        console.log('🎨 Fallback signature cleared');
      },

      isEmpty: () => {
        // First check our tracking flag
        if (!hasDrawn) return true;

        // Fallback to pixel checking for more accuracy
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Sample pixels instead of checking all for performance
          const sampleRate = 20; // Check every 20th pixel
          for (let i = 0; i < data.length; i += 4 * sampleRate) {
            // Check if any pixel is not white (with some tolerance)
            if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
              return false;
            }
          }
          return true;
        } catch (error) {
          console.warn('⚠️ Fallback isEmpty check failed:', error);
          return !hasDrawn; // Fallback to tracking flag
        }
      },

      toDataURL: (type = 'image/png', quality = 0.9) => {
        try {
          return canvas.toDataURL(type, quality);
        } catch (error) {
          console.error('❌ Fallback toDataURL failed:', error);
          throw new Error('Cannot generate signature image: ' + error.message);
        }
      },

      // Additional utility methods for compatibility
      addEventListener: (event, callback) => {
        console.log(`🎨 Fallback addEventListener: ${event}`);
        // Mock implementation - just call immediately for begin/end stroke
        if (event === 'beginStroke' || event === 'endStroke') {
          // Store callback for potential future use
          this._fallbackCallbacks = this._fallbackCallbacks || {};
          this._fallbackCallbacks[event] = callback;
        }
      },

      // Mark this as a fallback implementation
      _isFallback: true
    };

    // Verify the fallback system is working
    if (!this.signaturePad || typeof this.signaturePad.toDataURL !== 'function') {
      console.error('❌ Fallback system created but signaturePad is invalid');
      throw new Error('Fallback signaturePad creation failed');
    }

    // Show informative message to user
    this.showToast('ใช้ระบบลายเซ็นสำรอง - สามารถใช้งานได้ปกติ', 'info');

    console.log('✅ Enhanced fallback drawing system created and verified');
    return true;
  }

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  async saveSignature() {
    console.log('💾 Saving signature...');

    // Enhanced validation with simplified fallback
    if (!this.signaturePad) {
      console.error('❌ SignaturePad not initialized');

      // Check if we can use fallback drawing system instead
      const canvas = document.getElementById('signatureModalCanvas');
      if (canvas && canvas.getContext) {
        console.log('🎨 SignaturePad missing, creating fallback system');
        try {
          this.createFallbackDrawingSystem(canvas);
          if (this.signaturePad) {
            console.log('✅ Fallback system created successfully');
            this.showToast('ใช้ระบบลายเซ็นสำรอง', 'info');
            // Continue with the rest of the function
          } else {
            throw new Error('Fallback system creation failed');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback creation failed:', fallbackError);
          this.showToast('กรุณาปิดหน้าต่างลายเซ็นแล้วเปิดใหม่อีกครั้ง', 'error');
          return;
        }
      } else {
        console.error('❌ Canvas element not available');
        this.showToast('กรุณาปิดหน้าต่างลายเซ็นแล้วเปิดใหม่อีกครั้ง', 'error');
        return;
      }
    }

    // Check if signature is empty with fallback methods
    let isEmpty = false;
    try {
      isEmpty = this.signaturePad.isEmpty();
    } catch (emptyCheckError) {
      console.warn('⚠️ isEmpty() check failed, using canvas fallback:', emptyCheckError);
      // Fallback check using canvas data
      const canvas = document.getElementById('signatureModalCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        isEmpty = !imageData.data.some(channel => channel !== 0);
      } else {
        isEmpty = true;
      }
    }

    if (isEmpty) {
      this.showToast('กรุณาเซ็นลายเซ็นก่อน', 'warning');
      return;
    }

    // Add loading state
    const saveBtn = document.getElementById('saveSignature');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';
    }

    try {
      const signatureType = this.currentSignatureType;
      const documentType = signatureType === 'customer' ? 'customerSignature' : 'salespersonSignature';
      console.log(`💾 Processing ${signatureType} signature...`);

      // Get canvas and validate with comprehensive checks
      const canvas = document.getElementById('signatureModalCanvas');
      if (!canvas) {
        throw new Error('Signature canvas not found');
      }

      if (!canvas.getContext) {
        throw new Error('Canvas context not available');
      }

      // Enhanced data URL generation with multiple methods
      let dataUrl;
      let generationMethod = 'unknown';

      try {
        // Method 1: Try SignaturePad's built-in method first (most reliable)
        if (typeof this.signaturePad.toDataURL === 'function') {
          dataUrl = this.signaturePad.toDataURL('image/png');
          generationMethod = 'SignaturePad.toDataURL';
          console.log('✅ Used SignaturePad.toDataURL()');
        }
      } catch (signaturePadError) {
        console.warn('⚠️ SignaturePad.toDataURL() failed:', signaturePadError);
      }

      // Method 2: Fallback to canvas toDataURL
      if (!dataUrl) {
        try {
          dataUrl = canvas.toDataURL('image/png');
          generationMethod = 'Canvas.toDataURL';
          console.log('✅ Used Canvas.toDataURL()');
        } catch (canvasError) {
          console.warn('⚠️ Canvas.toDataURL() failed:', canvasError);
        }
      }

      // Method 3: Manual canvas extraction as last resort
      if (!dataUrl) {
        try {
          const ctx = canvas.getContext('2d');
          dataUrl = canvas.toDataURL('image/png', 1.0);
          generationMethod = 'Manual Canvas extraction';
          console.log('✅ Used manual canvas extraction');
        } catch (manualError) {
          console.error('❌ Manual canvas extraction failed:', manualError);
          throw new Error('All signature capture methods failed');
        }
      }

      // Validate generated data URL
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error(`Generated data URL is invalid (method: ${generationMethod}, length: ${dataUrl ? dataUrl.length : 0})`);
      }

      console.log(`✅ Generated data URL via ${generationMethod} (${dataUrl.length} chars)`);

      // Enhanced blob creation with error handling
      let blob;
      try {
        blob = this.dataURLtoBlob(dataUrl);
        if (!blob || blob.size === 0) {
          throw new Error('Generated blob is invalid or empty');
        }
        console.log(`✅ Created blob: ${blob.size} bytes, type: ${blob.type}`);
      } catch (blobError) {
        console.error('❌ Blob creation failed:', blobError);
        throw new Error(`Failed to create blob: ${blobError.message}`);
      }

      // Enhanced file handling with better filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `signature-${signatureType}-${timestamp}.png`;

      // Create file object with proper metadata
      const file = new File([blob], filename, {
        type: 'image/png',
        lastModified: Date.now()
      });

      console.log(`📁 Created file: ${file.name}, size: ${file.size} bytes`);

      // Use the improved handleFileUpload system
      await this.handleFileUpload(documentType, file);

      // Show success feedback
      this.showToast(`บันทึกลายเซ็น${signatureType === 'customer' ? 'ลูกค้า' : 'พนักงาน'}สำเร็จ`, 'success');

      // Close modal after successful processing
      this.closeSignatureModal();
      console.log('✅ Signature saved successfully');

    } catch (error) {
      console.error('❌ Error saving signature:', error);
      this.showToast(`เกิดข้อผิดพลาดในการบันทึกลายเซ็น: ${error.message}`, 'error');

      // Enhanced debugging information
      console.log('🔍 Signature save failure debug info:');

      const canvas = document.getElementById('signatureModalCanvas');
      if (canvas) {
        console.log('🔍 Canvas debug:', {
          element: !!canvas,
          width: canvas.width,
          height: canvas.height,
          context: !!canvas.getContext('2d'),
          hasContent: canvas.toDataURL().length > 100
        });
      }

      if (this.signaturePad) {
        console.log('🔍 SignaturePad debug:', {
          exists: !!this.signaturePad,
          isEmpty: this.signaturePad.isEmpty(),
          hasToDataURL: typeof this.signaturePad.toDataURL === 'function',
          constructor: this.signaturePad.constructor.name
        });
      }

      console.log('🔍 Current state:', {
        currentSignatureType: this.currentSignatureType,
        documentsState: Object.keys(this.documents || {})
      });

    } finally {
      // Reset save button state
      const saveBtn = document.getElementById('saveSignature');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check"></i> บันทึก';
      }
    }
  }

  updateSignaturePreview(signatureType) {
    const documentType = signatureType === 'customer' ? 'customerSignature' : 'salespersonSignature';
    const documentData = this.documents[documentType];

    if (!documentData || !documentData.preview) return;

    // Ensure we have access to the global document object
    if (typeof document === 'undefined' || !document.getElementById) {
      console.error('❌ Document object not available in updateSignaturePreview');
      return;
    }

    // Wait for DOM to be ready
    setTimeout(() => {
      try {
        const previewElement = document.getElementById(`${signatureType}SignaturePreview`);
        const imageElement = document.getElementById(`${signatureType}SignatureImage`);
        const placeholderElement = document.getElementById(`${signatureType}SignaturePlaceholder`);

        if (previewElement && imageElement) {
          // Ensure preview is a valid URL string
          const previewUrl = typeof documentData.preview === 'string'
            ? documentData.preview
            : (documentData.url || '');

          if (!previewUrl) {
            console.error(`❌ No valid signature preview URL for ${signatureType}:`, documentData);
            return;
          }

          imageElement.src = previewUrl;
          previewElement.classList.remove('hidden');

          if (placeholderElement) {
            placeholderElement.classList.add('hidden');
          }

          console.log(`✅ ${signatureType} signature preview updated successfully`);
        } else {
          console.warn(`⚠️ Signature preview elements not found for ${signatureType}:`, {
            previewElement: !!previewElement,
            imageElement: !!imageElement,
            expectedPreviewId: `${signatureType}SignaturePreview`,
            expectedImageId: `${signatureType}SignatureImage`
          });
        }
      } catch (error) {
        console.error(`❌ Error in updateSignaturePreview for ${signatureType}:`, error);
      }
    }, 100);
  }

  closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal && modal.style && modal.classList) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    } else if (modal) {
      console.warn('⚠️ Modal found but style/classList missing');
    }

    this.currentSignatureType = null;
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  showToast(message, type = 'info') {
    // Create toast notification
    const toastId = `toast_${Date.now()}`;
    const typeClasses = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    };

    const toastHTML = `
      <div id="${toastId}" class="fixed top-4 right-4 z-50 ${typeClasses[type] || typeClasses.info} px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300">
        <div class="flex items-center gap-2">
          <i class="bi bi-${this.getToastIcon(type)}"></i>
          <span>${message}</span>
          <button onclick="document.getElementById('${toastId}').remove()" class="ml-2 text-white hover:text-gray-200">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHTML);

    // Animate in
    setTimeout(() => {
      const toast = document.getElementById(toastId);
      if (toast) {
        toast.classList.remove('translate-x-full');
      }
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      const toast = document.getElementById(toastId);
      if (toast) {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  getToastIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || icons.info;
  }

  updateUI() {
    // Update form progress if available
    if (window.formProgressManager) {
      window.formProgressManager.refresh();
    }

    // Update document status display
    Object.keys(this.documents).forEach(documentType => {
      this.updateDocumentStatus(documentType, this.documents[documentType].status);
    });
  }

  // Validation Methods
  validateDocument(documentType, file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (file.size > maxSize) {
      throw new Error('ขนาดไฟล์เกิน 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('รองรับเฉพาะไฟล์ JPG, PNG และ PDF เท่านั้น');
    }

    return true;
  }

  // Check if all required documents are uploaded
  isDocumentationComplete() {
    const requiredDocs = ['idCard', 'selfie', 'customerSignature'];
    return requiredDocs.every(docType =>
      this.documents[docType] && this.documents[docType].status === 'completed'
    );
  }

  // Validate documents and return detailed validation result
  validateDocuments() {
    const requiredDocs = ['idCard', 'selfie', 'customerSignature'];
    const missingDocuments = [];

    requiredDocs.forEach(docType => {
      const doc = this.documents[docType];
      if (!doc || doc.status !== 'completed') {
        missingDocuments.push(this.getDocumentDisplayName(docType));
      }
    });

    return {
      isValid: missingDocuments.length === 0,
      missingDocuments: missingDocuments,
      completedDocuments: requiredDocs.filter(docType =>
        this.documents[docType] && this.documents[docType].status === 'completed'
      ).map(docType => this.getDocumentDisplayName(docType)),
      totalRequired: requiredDocs.length,
      totalCompleted: requiredDocs.filter(docType =>
        this.documents[docType] && this.documents[docType].status === 'completed'
      ).length
    };
  }

  // Get uploaded documents data for form submission
  getDocumentsData() {
    const documentsData = {};
    Object.keys(this.documents).forEach(docType => {
      const doc = this.documents[docType];
      if (doc.status === 'completed') {
        documentsData[docType] = {
          url: doc.url || doc.preview,
          uploadedAt: doc.uploadedAt,
          fileName: doc.file ? doc.file.name : `${docType}_capture.jpg`
        };
      }
    });
    return documentsData;
  }

  // Cleanup method
  cleanup() {
    // Stop any active camera streams
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    // Close any open modals
    const cameraModal = document.getElementById('cameraModal');
    const signatureModal = document.getElementById('signatureModal');
    const fullPreviewModal = document.getElementById('fullPreviewModal');
    const retakeOptionsModal = document.getElementById('retakeOptionsModal');

    [cameraModal, signatureModal, fullPreviewModal, retakeOptionsModal].forEach(modal => {
    if (modal) {
        modal.remove();
      }
    });
  }

  // Debug Functions
  debugDOMElements() {
    if (typeof document === 'undefined' || !document.getElementById) {
      console.warn('⚠️ Document object not available for debugging');
      return;
    }

    const documentTypes = ['idCard', 'selfie', 'salarySlip'];
    console.log('🔍 Debugging DOM Elements:');

    try {
      documentTypes.forEach(type => {
        const previewElement = document.getElementById(`${type}Preview`);
        const imageElement = document.getElementById(`${type}Image`);
        const uploadButton = document.getElementById(`btnUpload${type.charAt(0).toUpperCase() + type.slice(1)}`);
        const cameraButton = document.getElementById(`btnTake${type.charAt(0).toUpperCase() + type.slice(1)}`);

        console.log(`${type}:`, {
          preview: !!previewElement,
          image: !!imageElement,
          uploadBtn: !!uploadButton,
          cameraBtn: !!cameraButton
        });
      });

      // Check signature elements
      const customerSigPreview = document.getElementById('customerSignaturePreview');
      const salespersonSigPreview = document.getElementById('salespersonSignaturePreview');
      console.log('Signatures:', {
        customerSignature: !!customerSigPreview,
        salespersonSignature: !!salespersonSigPreview
      });
    } catch (error) {
      console.error('❌ Error during DOM elements debugging:', error);
    }
  }

  validateDocumentElements(documentType) {
    const requiredElements = [
      `${documentType}Preview`,
      `${documentType}Image`,
      `btnUpload${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`,
      `btnTake${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`
    ];

    const missing = requiredElements.filter(id => !document.getElementById(id));

    if (missing.length > 0) {
      console.error(`❌ Missing elements for ${documentType}:`, missing);
      return false;
    }

    console.log(`✅ All elements found for ${documentType}`);
    return true;
  }

  // Check if DocumentManager is properly initialized
  isInitialized() {
    const requiredMethods = [
      'validateDocuments', 'getDocumentsData', 'isDocumentationComplete',
      'openCamera', 'openFileSelect', 'handleFileUpload', 'showDocumentPreview'
    ];

    const missingMethods = requiredMethods.filter(method =>
      typeof this[method] !== 'function'
    );

    const hasDocumentStructure = this.documents &&
      typeof this.documents === 'object' &&
      ['idCard', 'selfie', 'customerSignature'].every(key =>
        this.documents.hasOwnProperty(key)
      );

    return {
      isValid: missingMethods.length === 0 && hasDocumentStructure,
      missingMethods: missingMethods,
      hasDocumentStructure: hasDocumentStructure,
      documentsKeys: this.documents ? Object.keys(this.documents) : []
    };
  }

  // Get current status summary
  getStatusSummary() {
    const summary = {
      initialized: this.isInitialized().isValid,
      documents: {},
      stats: {
        total: 0,
        pending: 0,
        completed: 0,
        error: 0
      }
    };

    Object.keys(this.documents).forEach(docType => {
      const doc = this.documents[docType];
      summary.documents[docType] = {
        status: doc.status,
        hasFile: !!doc.file,
        hasPreview: !!doc.preview,
        displayName: this.getDocumentDisplayName(docType)
      };

      summary.stats.total++;
      summary.stats[doc.status] = (summary.stats[doc.status] || 0) + 1;
    });

    return summary;
  }
}

// Initialize Document Manager when DOM is loaded
let documentManager;

function initializeDocumentManager() {
  try {
    console.log('📄 Initializing Document Manager...');

    if (window.documentManager) {
      console.log('📄 Document Manager already exists, checking status...');
      const status = window.documentManager.isInitialized();
      if (status.isValid) {
        console.log('✅ Document Manager already properly initialized');
        return window.documentManager;
      } else {
        console.log('⚠️ Existing Document Manager has issues:', status);
      }
    }

    // Wait for DOM elements to be fully loaded
    const waitForElements = () => {
      const requiredElements = [
        'idCardPreview', 'idCardImage', 'btnTakeIdCard', 'btnUploadIdCard',
        'selfiePreview', 'selfieImage', 'btnTakeSelfie', 'btnUploadSelfie',
        'salarySlipPreview', 'salarySlipImage', 'btnTakeSalarySlip', 'btnUploadSalarySlip',
        'customerSignaturePreview', 'customerSignatureImage', 'btnOpenCustomerSignature',
        'salespersonSignaturePreview', 'salespersonSignatureImage', 'btnOpenSalespersonSignature'
      ];

      const missingElements = requiredElements.filter(id => !document.getElementById(id));

      if (missingElements.length === 0) {
        console.log('✅ All DOM elements ready, creating DocumentManager');
        documentManager = new DocumentManager();
        window.documentManager = documentManager;

        // Integration with step2.html - avoid double event listeners
        window.documentManager.integrateWithExistingHandlers();

        return true;
      } else {
        console.log(`⏳ Waiting for ${missingElements.length} DOM elements:`, missingElements.slice(0, 5));
        return false;
      }
    };

    if (waitForElements()) {
      return window.documentManager;
    }

    // Retry mechanism for DOM loading
    let retryCount = 0;
    const maxRetries = 20;
    const retryInterval = setInterval(() => {
      retryCount++;

      if (waitForElements() || retryCount >= maxRetries) {
        clearInterval(retryInterval);

        if (retryCount >= maxRetries) {
          console.warn('⚠️ Max retries reached, creating fallback DocumentManager');
          createFallbackDocumentManager();
        } else {
          console.log('✅ Document Manager initialized after', retryCount, 'retries');
        }
      }
    }, 250);

    return null; // Will be set by retry mechanism

  } catch (error) {
    console.error('❌ Failed to initialize Document Manager:', error);
    createFallbackDocumentManager(error.message);
    return window.documentManager;
  }
}

function createFallbackDocumentManager(errorMessage = null) {
  // Create minimal fallback with better error handling
  window.documentManager = {
    documents: {
      idCard: { status: 'pending', file: null, preview: null },
      selfie: { status: 'pending', file: null, preview: null },
      salarySlip: { status: 'pending', file: null, preview: null },
      customerSignature: { status: 'pending', file: null, preview: null },
      salespersonSignature: { status: 'pending', file: null, preview: null }
    },

    validateDocuments: () => {
      console.log('🔧 Using fallback validateDocuments');
      return {
        isValid: true,
        missingDocuments: [],
        completedDocuments: [],
        totalRequired: 0,
        totalCompleted: 0
      };
    },

    getDocumentsData: () => {
      console.log('🔧 Using fallback getDocumentsData');
      return {};
    },

    isDocumentationComplete: () => {
      console.log('🔧 Using fallback isDocumentationComplete');
      return true;
    },

    isInitialized: () => ({
      isValid: false,
      error: errorMessage || 'Fallback mode',
      isFallback: true
    }),

    showDocumentPreview: (documentType) => {
      console.log('🔧 Fallback showDocumentPreview for', documentType);
    },

    updateSignaturePreview: (signatureType) => {
      console.log('🔧 Fallback updateSignaturePreview for', signatureType);
    },

    integrateWithExistingHandlers: () => {
      console.log('🔧 Fallback integration - no integration needed');
    }
  };

  console.log('🔧 Created fallback Document Manager to prevent errors');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDocumentManager);
} else {
  // DOM already loaded
  setTimeout(initializeDocumentManager, 100);
}

// Also try to initialize immediately if possible
try {
  if (typeof DocumentManager !== 'undefined') {
    initializeDocumentManager();
  }
} catch (error) {
  console.warn('⚠️ Could not initialize Document Manager immediately:', error.message);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentManager;
}

// Global test function for debugging
window.testDocumentManager = function() {
  console.log('🧪 Testing Document Manager...');

  if (typeof window.documentManager === 'undefined') {
    console.error('❌ Document Manager not found in window object');
    return false;
  }

  try {
    // Test DOM access
    const testElement = document.getElementById('idCardPreview');
    console.log('✅ DOM access test:', !!testElement);

    // Test document manager methods
    console.log('✅ Document Manager instance:', window.documentManager);
    console.log('✅ Document Manager methods available:', {
      showDocumentPreview: typeof window.documentManager.showDocumentPreview,
      updateSignaturePreview: typeof window.documentManager.updateSignaturePreview,
      debugDOMElements: typeof window.documentManager.debugDOMElements
    });

    // Run debug
    window.documentManager.debugDOMElements();

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Global error handler for document-related errors
window.addEventListener('error', function(event) {
  if (event.filename && event.filename.includes('document-manager.js')) {
    console.error('🚨 Document Manager Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});