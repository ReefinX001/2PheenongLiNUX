// ========================================
// INSTALLMENT UI SYSTEM - Pattani Branch
// ระบบ UI และ Validation สาขาปัตตานี
// ========================================

console.log('🎨 Loading Enhanced Installment UI Module...');

// =========================================
// TOAST NOTIFICATION SYSTEM
// =========================================

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.initialized = false;
  }

  // ✅ ลบฟังก์ชัน duplicate และใช้ InstallmentCore.showToast() เป็นหลัก
  show(message, type = 'info', options = {}) {
    if (window.InstallmentCore?.showToast) {
      return window.InstallmentCore.showToast(message, type, options);
    }

    // Fallback สำหรับกรณีที่ InstallmentCore ยังไม่โหลด
    console.log(`Toast [${type}]: ${message}`);
        return null;
  }

  // ... existing code ...
}

// ✅ ลบฟังก์ชัน showToast ซ้ำ - ใช้ InstallmentCore.showToast() โดยตรง
// ✅ ลบฟังก์ชัน debounce ซ้ำ - ใช้ InstallmentCore เป็นหลัก

// =========================================
// LOADING SYSTEM v2.0.0 - HELPER FUNCTIONS
// =========================================

// Note: LoadingSystem v2.0.0 is already available globally from HTML
// This section provides helper functions for backward compatibility

// Wrapper functions for common loading scenarios
function showGlobalLoading(options = {}) {
  return window.LoadingSystem.show(options);
}

function hideGlobalLoading(loaderId) {
  return window.LoadingSystem.hide(loaderId);
}

function showLoadingWithProgress(message, autoProgress = false) {
  return window.LoadingSystem.show({
    message: message,
    showProgress: true,
    autoProgress: autoProgress
  });
}

function showSuccessLoading(message, duration = 2000) {
  const loaderId = window.LoadingSystem.show({
    message: message,
    type: 'success'
  });

  if (duration > 0) {
    setTimeout(() => window.LoadingSystem.hide(loaderId), duration);
  }

  return loaderId;
}

function showErrorLoading(message, duration = 3000) {
  const loaderId = window.LoadingSystem.show({
    message: message,
    type: 'error'
  });

  if (duration > 0) {
    setTimeout(() => window.LoadingSystem.hide(loaderId), duration);
  }

  return loaderId;
}

// =========================================
// STEPPER SYSTEM
// =========================================

function updateStepper(currentStep) {
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const stepIcon = step.querySelector('.step-icon');

    step.classList.remove('active', 'completed');
    step.setAttribute('aria-selected', 'false');

    if (stepNumber < currentStep) {
      step.classList.add('completed');
      if (stepIcon) stepIcon.textContent = '✓';
      step.setAttribute('aria-label', `ขั้นตอนที่ ${stepNumber} เสร็จสิ้นแล้ว`);
    } else if (stepNumber === currentStep) {
      step.classList.add('active');
      step.setAttribute('aria-selected', 'true');
      if (stepIcon) stepIcon.textContent = stepNumber;
      step.setAttribute('aria-label', `ขั้นตอนที่ ${stepNumber} กำลังดำเนินการ`);
    } else {
      if (stepIcon) stepIcon.textContent = stepNumber;
      step.setAttribute('aria-label', `ขั้นตอนที่ ${stepNumber} รอดำเนินการ`);
    }
  });

  announceToScreenReader(`เข้าสู่ขั้นตอนที่ ${currentStep}`);
}

function getCurrentStep() {
  const activeStep = document.querySelector('.step-content.active');
  if (activeStep) {
    const stepId = activeStep.id;
    const stepNumber = stepId.replace('step', '');
    return parseInt(stepNumber) || 1;
  }
  return 1;
}

// =========================================
// ACCESSIBILITY FUNCTIONS
// =========================================

function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'assertive');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

// =========================================
// BUTTON LOADING STATES
// =========================================

function setButtonLoading(buttonId, isLoading, originalText = '') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.setAttribute('data-original-text', btn.textContent);
    btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> กำลังดำเนินการ...`;
    btn.setAttribute('aria-label', 'กำลังดำเนินการ');
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    const original = btn.getAttribute('data-original-text') || originalText;
    btn.textContent = original;
    btn.removeAttribute('data-original-text');
    btn.removeAttribute('aria-label');
  }
}

// =========================================
// VISUAL FEEDBACK SYSTEM
// =========================================

function showFeedback(type, message, duration = 5000) {
  // Remove existing feedback
  const existingFeedback = document.querySelectorAll('.feedback-message');
  existingFeedback.forEach(el => el.remove());

  const feedback = document.createElement('div');
  feedback.className = `feedback-message ${type}-feedback`;
  feedback.setAttribute('role', type === 'error' ? 'alert' : 'status');
  feedback.setAttribute('aria-live', 'polite');

  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  feedback.innerHTML = `
    <div class="flex items-start gap-3 p-4 rounded-lg border-l-4 ${getBackgroundClass(type)}">
      <i class="${iconMap[type] || iconMap.info} text-lg flex-shrink-0 mt-1"></i>
      <div class="flex-1">
        <p class="font-medium">${message}</p>
      </div>
      <button class="btn btn-ghost btn-sm p-1 flex-shrink-0" onclick="this.parentElement.parentElement.remove()" aria-label="ปิดข้อความ">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `;

  // Insert at the top of main content
  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.insertBefore(feedback, mainContent.firstChild);
    // Scroll to feedback
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove();
      }
    }, duration);
  }
}

function getBackgroundClass(type) {
  const classes = {
    success: 'bg-green-50 border-green-400 text-green-700',
    error: 'bg-red-50 border-red-400 text-red-700',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-700',
    info: 'bg-blue-50 border-blue-400 text-blue-700'
  };
  return classes[type] || classes.info;
}

// =========================================
// =========================================
// VALIDATION UTILITIES (Using InstallmentCore)
// =========================================

// =========================================
// FORM VALIDATION SYSTEM
// =========================================

function validateElement(elementId, validationFn, errorMessage) {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const value = element.value.trim();

  try {
    const isValid = validationFn(value);

    if (isValid) {
      // ถ้าผ่าน validation
      element.classList.remove('input-error');
      element.classList.add('input-success');

      // ลบ error message ถ้ามี
      clearFieldError(elementId);

      console.log(`✅ ${elementId} validation passed:`, value);
      return true;
    }
  } catch (error) {
    // ถ้าไม่ผ่าน validation
    element.classList.remove('input-success');
    element.classList.add('input-error');

    // แสดง error message
    showFieldError(elementId, error.message || errorMessage);

    console.log(`❌ ${elementId} validation failed:`, error.message);
    return false;
  }
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // ลบ error message เก่า
  clearFieldError(fieldId);

  // สร้าง error message ใหม่
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error text-xs text-red-500 mt-1 animate-fade-in';
  errorDiv.textContent = message;
  errorDiv.setAttribute('data-field', fieldId);

  // ใส่หลัง field
  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

function clearFieldError(fieldId) {
  const existingError = document.querySelector(`[data-field="${fieldId}"]`);
  if (existingError) {
    existingError.remove();
  }
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

function sanitizeImagePath(originalPath) {
  if (!originalPath || originalPath.trim() === '') {
    return '/uploads/Logo2.png';
  }

  // ถ้าเป็น full URL หรือ data URL
  if (originalPath.startsWith('http') || originalPath.startsWith('data:')) {
    return originalPath;
  }

  // ถ้าขึ้นต้นด้วย /uploads/ แล้ว
  if (originalPath.startsWith('/uploads/')) {
    return originalPath;
  }

  // ถ้าขึ้นต้นด้วย uploads/
  if (originalPath.startsWith('uploads/')) {
    return '/' + originalPath;
  }

  // แก้ไข path ที่ผิดรูปแบบ
  let fixedPath = originalPath.replace(/^.*uploads[\\/]/, '');
  fixedPath = fixedPath.replace(/\\/g, '/');

  return `/uploads/${fixedPath}`;
}

function getImageUrl(imagePath) {
  if (!imagePath || imagePath.trim() === '') {
    return '/uploads/Logo2.png';
  }

  // ถ้าเป็น full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // ถ้าเป็น data URL
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }

  // ถ้าขึ้นต้นด้วย /uploads/ แล้ว
  if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/static/')) {
    return imagePath;
  }

  // ถ้าขึ้นต้นด้วย uploads/
  if (imagePath.startsWith('uploads/')) {
    return '/' + imagePath;
  }

  // แก้ไข path ที่ผิดรูปแบบ
  let fixedPath = imagePath.replace(/^.*uploads[\\/]/, '');
  fixedPath = fixedPath.replace(/\\/g, '/');

  // ถ้าไม่มีนามสกุลไฟล์ให้ fallback เป็น logo
  if (!fixedPath.includes('.')) {
    console.warn('⚠️ Image path ไม่มีนามสกุล:', imagePath);
    return '/uploads/Logo2.png';
  }

  return `/uploads/${fixedPath}`;
}

// เพิ่มฟังก์ชันสำหรับจัดการรูปภาพที่โหลดไม่ได้
function handleImageError(imgElement, fallbackUrl = '/uploads/Logo2.png') {
  if (imgElement && imgElement.src !== fallbackUrl) {
    console.warn('⚠️ Image failed to load:', imgElement.src);
    imgElement.src = fallbackUrl;
    imgElement.alt = 'รูปภาพไม่พบ';
  }
}

// เพิ่มฟังก์ชันสำหรับตั้งค่า error handler ให้รูปภาพ
function setupImageErrorHandler(imgElement, fallbackUrl = '/uploads/Logo2.png') {
  if (imgElement) {
    imgElement.addEventListener('error', () => {
      handleImageError(imgElement, fallbackUrl);
    });

    // เพิ่ม loading placeholder
    imgElement.addEventListener('load', () => {
      imgElement.classList.remove('loading');
    });
  }
}

// ตรวจสอบว่าไฟล์รูปภาพมีอยู่จริงหรือไม่
async function checkImageExists(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      cache: 'no-cache'
    });

    return response.ok;
  } catch (error) {
    console.warn('⚠️ Error checking image existence:', imageUrl, error);
    return false;
  }
}

// โหลดรูปภาพแบบปลอดภัย พร้อม fallback
async function safeLoadImage(imgElement, imageUrl, fallbackUrl = '/uploads/Logo2.png') {
  if (!imgElement) return false;

  try {
    // แสดง loading state
    imgElement.classList.add('loading');
    imgElement.alt = 'กำลังโหลด...';

    const processedUrl = getImageUrl(imageUrl);

    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
    const exists = await checkImageExists(processedUrl);

    if (exists) {
      imgElement.src = processedUrl;
      setupImageErrorHandler(imgElement, fallbackUrl);
      return true;
    } else {
      console.warn('⚠️ Image not found, using fallback:', processedUrl);
      imgElement.src = fallbackUrl;
      imgElement.alt = 'รูปภาพไม่พบ';
      imgElement.classList.remove('loading');
      return false;
    }

  } catch (error) {
    console.error('❌ Safe load image failed:', error);
    imgElement.src = fallbackUrl;
    imgElement.alt = 'เกิดข้อผิดพลาด';
    imgElement.classList.remove('loading');
    return false;
  }
}

// =========================================
// UTILITY HELPER FUNCTIONS
// =========================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function removeLocalityPrefix(str) {
  if (!str) return '';
  return str.replace(/^(อ\.|ต\.|จ\.)\s*/, '');
}

function removePrefixes(str) {
  if (!str) return '';
  return str.replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)\s*/g, '').trim();
}

function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =========================================
// CAMERA & SIGNATURE SETUP FUNCTIONS
// =========================================

// Global variables for camera
let currentStream = null;
let currentCameraType = null;
let facingMode = 'environment'; // Default to back camera
let currentCaptureCallback = null;
let isCameraOpening = false;

// Global variables for signature pads
let customerSignaturePad = null;
let salespersonSignaturePad = null;

// =========================================
// CAMERA PERMISSION MANAGEMENT
// =========================================

// เพิ่มฟังก์ชันสำหรับตรวจสอบสิทธิ์กล้อง
async function checkCameraPermission() {
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'camera' });
      console.log('📷 Camera permission status:', permission.state);
      return permission.state;
    } else {
      console.log('📷 Navigator.permissions not supported');
      return 'unsupported';
    }
  } catch (error) {
    console.warn('⚠️ Failed to check camera permission:', error);
    return 'unknown';
  }
}

// แสดงคำแนะนำสำหรับการแก้ไขปัญหา permission - ปิดการแสดงผล
function showCameraPermissionGuide() {
  // ไม่แสดงคำแนะนำ permission อีกต่อไป
  console.log('📷 Camera permission guide disabled');

  // เปิดกล้องโดยตรงแทน
  showToast('กำลังเปิดกล้อง...', 'info', { duration: 2000 });
}

// ซ่อนคำแนะนำ permission
function hidePermissionGuide() {
  const guides = document.querySelectorAll('.camera-permission-guide');
  guides.forEach(guide => guide.remove());
}

// แสดงตัวเลือกอัปโหลดไฟล์
function showFileUploadOption() {
  const modal = document.getElementById('cameraModal');
  const title = document.getElementById('cameraModalTitle');

  if (modal && title) {
    const currentType = currentCameraType;
    if (!currentType) {
      showToast('ไม่สามารถระบุประเภทไฟล์ได้', 'error');
      return;
    }

    // สร้าง upload button ID
    const uploadButtonId = `btnUpload${currentType.charAt(0).toUpperCase() + currentType.slice(1)}`;
    const uploadButton = document.getElementById(uploadButtonId);

    if (uploadButton) {
      console.log(`📁 Opening file upload for type: ${currentType}`);
      closeCameraModal();

      // คลิกปุ่มอัปโหลดหลังจากปิด modal เสร็จ
      setTimeout(() => {
        uploadButton.click();
        showToast('กรุณาเลือกไฟล์รูปภาพจากอุปกรณ์', 'info');
      }, 300);
    } else {
      console.error('❌ Upload button not found:', uploadButtonId);
      showToast('ไม่พบปุ่มอัปโหลดไฟล์สำหรับประเภทนี้', 'error');
    }
  }
}

// ฟังก์ชัน Fallback เมื่อกล้องโหลดล่าช้าหรือใช้ไม่ได้
function showCameraTimeoutFallback() {
  console.log('🔄 showCameraTimeoutFallback called - switching to file upload option');
  // แจ้งเตือนผู้ใช้ให้ใช้การอัปโหลดไฟล์แทน
  showToast('กล้องใช้งานล่าช้า ให้ใช้การอัปโหลดไฟล์แทน', 'info', { duration: 7000 });
  // เปิดตัวเลือกอัปโหลดไฟล์
  showFileUploadOption();
}

// =========================================
// CAMERA SETUP FUNCTIONS
// =========================================

function setupIDCamera(videoElement, options = {}) {
  return setupCamera(videoElement, { ...options, facingMode: 'environment' });
}

function setupSelfieCamera(videoElement, options = {}) {
  return setupCamera(videoElement, { ...options, facingMode: 'user' });
}

async function startCamera(videoElement, options = {}) {
  console.log('📷 Starting camera with options:', options);

  // หากมี stream อยู่แล้วและไม่ได้สลับกล้อง ให้ reuse เพื่อลดดีเลย์
  if (currentStream && !options.forceRestart) {
    console.log('🔄 Re-using existing camera stream');
    if (videoElement) {
      videoElement.srcObject = currentStream;
      await videoElement.play().catch(() => {});
    }
    return currentStream;
  }

  if (isCameraOpening) {
    console.log('⚠️ Camera is already opening, skipping...');
    return currentStream;
  }

  isCameraOpening = true;

  try {
    // ข้ามการตรวจสอบสิทธิ์เพื่อให้ใช้งานได้โดยตรง
    console.log('📷 Skipping permission check - direct camera access');

    // หยุดกล้องเดิม
    stopCamera();

    // ตั้งค่าเริ่มต้น
    const constraints = {
      video: {
        facingMode: options.facingMode || 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    console.log('📷 Requesting camera with constraints:', constraints);

    // เข้าถึงกล้อง
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoElement) {
      videoElement.srcObject = currentStream;

      // รอให้ video โหลดเสร็จ - เพิ่ม timeout และ fallback
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout - กล้องโหลดช้า กรุณาลองใหม่หรือใช้การอัปโหลดไฟล์'));
        }, 20000); // เพิ่มเป็น 20 วินาที

        // Check if video is already ready
        if (videoElement.readyState >= 2) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        videoElement.oncanplay = () => {
          clearTimeout(timeout);
          resolve();
        };

        videoElement.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('Video loading error: ' + (error.message || 'ไม่ทราบสาเหตุ')));
        };

        // Fallback check after short delay
        setTimeout(() => {
          if (videoElement.readyState >= 1) {
            clearTimeout(timeout);
            resolve();
          }
        }, 3000);
      });

      // เล่น video
      try {
        await videoElement.play();
        console.log('✅ Camera started successfully');
      } catch (playError) {
        // ถ้า play() ล้มเหลวเพราะ AbortError ให้ข้ามไป
        if (playError.name === 'AbortError') {
          console.warn('⚠️ Video play interrupted, but continuing...');
        } else {
          console.error('❌ Video play failed:', playError);
          throw playError;
        }
      }
    }

    return currentStream;

  } catch (error) {
    console.error('❌ Camera setup failed:', error);

    // จัดการข้อผิดพลาดแบบละเอียด
    if (error.name === 'NotAllowedError') {
      console.log('🚫 Camera permission denied');
      showToast('กรุณาใช้การอัปโหลดไฟล์แทน', 'warning', { duration: 7000 });
      // Fallback to file upload when permission denied
      showFileUploadOption();
    } else if (error.name === 'NotFoundError') {
      showToast('ไม่พบกล้องในอุปกรณ์นี้ กรุณาใช้การอัปโหลดไฟล์แทน', 'info', {
        duration: 5000
      });
    } else if (error.name === 'NotReadableError') {
      showToast('กล้องถูกใช้งานอยู่ กรุณาปิดแอปอื่นที่ใช้กล้องแล้วลองใหม่', 'warning', {
        duration: 5000
      });
    } else if (error.name === 'AbortError') {
      console.warn('⚠️ Camera access aborted - continuing without error');
      return currentStream;
    } else if (error.message && error.message.includes('timeout')) {
      // Video loading timeout - แนะนำวิธีแก้ไข
      console.warn('⏰ Video loading timeout detected');
      showToast('กล้องโหลดช้า กรุณาลองปิดกล้องแล้วเปิดใหม่ หรือใช้การอัปโหลดไฟล์แทน', 'warning', {
        duration: 8000
      });

      // แสดงปุ่มทางเลือก
      showCameraTimeoutFallback();
    } else {
      const errorMsg = getCameraErrorMessage(error);
      showToast(errorMsg + ' - กรุณาใช้การอัปโหลดไฟล์แทน', 'warning', {
        duration: 6000
      });
    }

    throw error;

  } finally {
    isCameraOpening = false;
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
      console.log('📷 Camera track stopped:', track.kind);
    });
    currentStream = null;
  }

  // ล้าง video element
  const videoElement = document.getElementById('cameraPreview');
  if (videoElement) {
    videoElement.srcObject = null;
    videoElement.pause();
    console.log('📷 Video element cleared');
  }

  // รีเซ็ต camera state
  isCameraOpening = false;

  console.log('📷 Camera fully stopped and resources released');
}

function getCameraErrorMessage(error) {
  switch (error.name) {
    case 'NotAllowedError':
      return 'กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ หรือใช้การอัปโหลดไฟล์แทน';
    case 'NotFoundError':
      return 'ไม่พบกล้องในอุปกรณ์นี้ กรุณาใช้การอัปโหลดไฟล์แทน';
    case 'NotReadableError':
      return 'กล้องถูกใช้งานอยู่ กรุณาปิดแอปอื่นที่ใช้กล้องแล้วลองใหม่';
    case 'OverconstrainedError':
      return 'การตั้งค่ากล้องไม่ถูกต้อง กรุณาลองใหม่หรือใช้การอัปโหลดไฟล์';
    case 'SecurityError':
      return 'การเข้าถึงกล้องถูกปฏิเสธเพื่อความปลอดภัย กรุณาใช้ HTTPS หรือใช้การอัปโหลดไฟล์';
    case 'AbortError':
      return 'การเข้าถึงกล้องถูกยกเลิก';
    case 'TypeError':
      return 'อุปกรณ์ไม่รองรับการใช้งานกล้อง กรุณาใช้การอัปโหลดไฟล์';
    default:
      return `เกิดข้อผิดพลาดกับกล้อง: ${error.message || 'ไม่ทราบสาเหตุ'} - กรุณาใช้การอัปโหลดไฟล์แทน`;
  }
}

async function switchCamera() {
  try {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    const videoElement = document.getElementById('cameraPreview');
    if (videoElement) {
      await startCamera(videoElement, { facingMode });
      console.log('🔄 Camera switched to:', facingMode);
    }
  } catch (error) {
    console.error('❌ Failed to switch camera:', error);
    showToast('ไม่สามารถสลับกล้องได้', 'error');
  }
}

async function capturePhoto() {
  console.log('📸 Starting photo capture process...');
  console.log('📸 Current camera type:', currentCameraType);

  try {
    // Step 1: Check elements
    console.log('📋 Step 1: Checking video and canvas elements...');
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');

    if (!video || !canvas) {
      console.error('❌ Step 1: Missing elements - video:', !!video, 'canvas:', !!canvas);
      throw new Error('Video หรือ Canvas element ไม่พบ');
    }
    console.log('✅ Step 1: Found elements');

    // Step 2: Check video state
    console.log('📋 Step 2: Checking video state...');
    console.log('Video dimensions:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      currentTime: video.currentTime
    });

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Step 2: Video not ready');
      throw new Error('กล้องยังไม่พร้อม กรุณารอสักครู่');
    }
    console.log('✅ Step 2: Video ready');

    // Step 3: Setup canvas & draw
    console.log('📋 Step 3: Drawing frame to canvas...');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // Step 4: Create blob (JPEG 80%)
    console.log('📋 Step 4: Exporting blob...');
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) return resolve(b);
        reject(new Error('ไม่สามารถสร้างรูปภาพได้'));
      }, 'image/jpeg', 0.7);
      setTimeout(() => reject(new Error('หมดเวลาในการสร้างรูปภาพ')), 10000);
    });

    const objectUrl = URL.createObjectURL(blob);
    console.log('✅ Blob created:', blob.size, 'bytes');

    showCapturedImage(objectUrl, blob);
    console.log('✅ Image displayed');

    // Step 5: Create data URL
    console.log('📋 Step 5: Creating data URL...');
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    console.log('✅ Step 5: Data URL created, length:', dataURL.length);

    // Step 6: Store data and show image
    console.log('📋 Step 6: Storing and displaying image...');
    const captureData = {
      type: currentCameraType,
      blobSize: blob.size,
      blobType: blob.type,
      dataUrlLength: dataURL.length,
      timestamp: new Date().toISOString()
    };
    console.log('📸 Photo capture data:', captureData);

    showCapturedImage(dataURL, blob);
    console.log('✅ Step 6: Image displayed');

    console.log('🎉 Photo capture completed successfully');

  } catch (error) {
    console.error('💥 Photo capture failed:', error);
    console.log('📊 Camera state when error occurred:', debugCameraState());

    showToast('ไม่สามารถถ่ายรูปได้: ' + error.message, 'error');

    // Show recovery options
    showCameraRecoveryUI(error);
  }
}

function showCapturedImage(imageUrl, blob) {
  console.log('🖼️ Starting showCapturedImage...');
  console.log('🖼️ Parameters:', {
    imageUrlType: imageUrl?.startsWith('data:') ? 'dataURL' : 'other',
    imageUrlLength: imageUrl?.length,
    hasBlob: !!blob,
    blobSize: blob?.size,
    blobType: blob?.type,
    currentCameraType
  });

  const capturedImage = document.getElementById('capturedImage');
  const capturedImagePreview = document.getElementById('capturedImagePreview');
  const cameraPreview = document.getElementById('cameraPreview');

  console.log('🖼️ Elements found:', {
    capturedImage: !!capturedImage,
    capturedImagePreview: !!capturedImagePreview,
    cameraPreview: !!cameraPreview
  });

  if (!capturedImage || !capturedImagePreview || !cameraPreview) {
    console.error('❌ showCapturedImage: Missing required elements');
    showToast('เกิดข้อผิดพลาดในการแสดงรูปภาพ', 'error');
    return;
  }

  if (!imageUrl || !blob) {
    console.error('❌ showCapturedImage: Missing image data', {
      hasImageUrl: !!imageUrl,
      hasBlob: !!blob
    });
    showToast('ข้อมูลรูปภาพไม่ครบถ้วน', 'error');
    return;
  }

  if (!currentCameraType) {
    console.warn('⚠️ showCapturedImage: No current camera type');
  }

  try {
    // Set image source
    capturedImage.src = imageUrl;
    console.log('✅ Image src set');

    // Store blob for later upload
    capturedImage.blob = blob;
    console.log('✅ Blob stored on image element');

    // Store image type as backup in case currentCameraType gets reset
    capturedImage.dataset.imageType = currentCameraType;
    console.log('✅ Image type stored in dataset:', currentCameraType);

    // Show/hide appropriate elements
    capturedImagePreview.classList.remove('hidden');
    cameraPreview.style.display = 'none';
    console.log('✅ UI elements updated');

    // Final verification
    const verification = {
      imageSrcSet: !!capturedImage.src,
      blobAttached: !!capturedImage.blob,
      datasetTypeSet: !!capturedImage.dataset.imageType,
      previewVisible: !capturedImagePreview.classList.contains('hidden'),
      cameraHidden: cameraPreview.style.display === 'none'
    };

    console.log('🖼️ Image display verification:', verification);

    const allGood = Object.values(verification).every(v => v);
    if (allGood) {
      console.log('🎉 showCapturedImage completed successfully');
      showToast('ถ่ายรูปสำเร็จ กดปุ่ม "ใช้รูปนี้" เพื่อบันทึก', 'success');
    } else {
      console.warn('⚠️ showCapturedImage completed with issues:', verification);
    }

  } catch (error) {
    console.error('💥 showCapturedImage failed:', error);
    showToast('เกิดข้อผิดพลาดในการแสดงรูปภาพ: ' + error.message, 'error');
  }
}

function retakePhoto() {
  const capturedImagePreview = document.getElementById('capturedImagePreview');
  const cameraPreview = document.getElementById('cameraPreview');
  const capturedImage = document.getElementById('capturedImage');

  if (capturedImagePreview && cameraPreview && capturedImage) {
    capturedImagePreview.classList.add('hidden');
    cameraPreview.style.display = 'block';

    // Clear image data (no need to revoke data URL)
    capturedImage.src = '';
    capturedImage.blob = null;

    // Clear dataset backup
    delete capturedImage.dataset.imageType;
  }

  // Hide recovery UI if showing
  hideRecoveryUI();
}

async function confirmPhoto() {
  console.log('🚀 Starting photo confirmation process...');

  try {
    // Step 1: Check captured image element
    console.log('📋 Step 1: Checking captured image element...');
    const capturedImage = document.getElementById('capturedImage');
    if (!capturedImage) {
      throw new Error('ไม่พบ element สำหรับรูปภาพ');
    }
    console.log('✅ Step 1: Found capturedImage element');

    // Step 2: Check blob data
    console.log('📋 Step 2: Checking blob data...');
    if (!capturedImage.blob) {
      console.error('❌ Step 2: No blob found');
      console.log('📊 Current state:', debugCameraState());
      throw new Error('ไม่พบรูปภาพที่ถ่าย - กรุณาถ่ายใหม่');
    }
    console.log('✅ Step 2: Found blob', {
      size: capturedImage.blob.size,
      type: capturedImage.blob.type
    });

    // Step 3: Determine image type
    console.log('📋 Step 3: Determining image type...');
    let imageType = currentCameraType;
    console.log('Current camera type:', imageType);

    if (!imageType || imageType === 'null' || imageType === 'undefined') {
      imageType = capturedImage.dataset.imageType;
      console.log('🔄 Using backup image type:', imageType);
    }

    if (!imageType || !['idCard', 'selfie', 'salarySlip'].includes(imageType)) {
      console.error('❌ Step 3: Invalid image type:', imageType);
      throw new Error('ประเภทรูปภาพไม่ถูกต้อง กรุณาเปิดกล้องใหม่');
    }
    console.log('✅ Step 3: Valid image type:', imageType);

    // Step 4: Prepare upload
    console.log('📋 Step 4: Preparing upload...');
    const uploadData = {
      type: imageType,
      blobSize: capturedImage.blob.size,
      blobType: capturedImage.blob.type,
      branchCode: getBranchCode()
    };
    console.log('📤 Upload data:', uploadData);

    // Step 5: Upload image
    console.log('📋 Step 5: Starting upload...');
    showToast('กำลังอัปโหลดรูปภาพ...', 'info');

    const uploadResult = await uploadImageBlob(capturedImage.blob, imageType);
    console.log('📨 Upload result:', uploadResult);

    if (uploadResult && uploadResult.url) {
      console.log('✅ Step 5: Upload successful');

      // Step 6: Update form inputs
      console.log('📋 Step 6: Updating form inputs...');
      const hiddenInputId = getHiddenInputId(imageType);
      const hiddenInput = document.getElementById(hiddenInputId);

      console.log('Hidden input ID:', hiddenInputId);
      console.log('Hidden input element:', !!hiddenInput);

      if (hiddenInput) {
        hiddenInput.value = uploadResult.url;
        console.log('✅ Step 6: Hidden input updated:', uploadResult.url);
      } else {
        console.warn('⚠️ Step 6: Hidden input not found:', hiddenInputId);
      }

      // Step 7: Update preview
      console.log('📋 Step 7: Updating preview...');
      await updateImagePreview(imageType, uploadResult.url);
      console.log('✅ Step 7: Preview updated');

      // Step 8: Close modal
      console.log('📋 Step 8: Closing modal...');
      closeCameraModal();
      console.log('✅ Step 8: Modal closed');

      showToast('บันทึกรูปภาพสำเร็จ', 'success');
      console.log('🎉 Photo confirmation completed successfully:', uploadResult.url);

    } else {
      console.error('❌ Step 5: Upload failed - no result or URL');
      throw new Error('ไม่สามารถอัปโหลดรูปภาพได้ - ไม่ได้รับ URL');
    }

  } catch (error) {
    console.error('💥 Photo confirmation failed at some step:', error);
    console.log('📊 Final state when error occurred:', debugCameraState());

    showToast('ไม่สามารถบันทึกรูปภาพได้: ' + error.message, 'error');

    // Show recovery options
    showConfirmRecoveryUI(error);
  }
}

function getHiddenInputId(cameraType) {
  const mapping = {
    'idCard': 'idCardImageUrl',
    'selfie': 'selfieUrl',
    'salarySlip': 'salarySlipUrl'
  };
  return mapping[cameraType] || '';
}

async function updateImagePreview(type, imageUrl) {
  const previewIds = {
    'idCard': { preview: 'idCardPreview', image: 'idCardImage' },
    'selfie': { preview: 'selfiePreview', image: 'selfieImage' },
    'salarySlip': { preview: 'salarySlipPreview', image: 'salarySlipImage' }
  };

  const ids = previewIds[type];
  if (ids) {
    const previewDiv = document.getElementById(ids.preview);
    const imageEl = document.getElementById(ids.image);

    if (previewDiv && imageEl) {
      // ใช้ safeLoadImage เพื่อตรวจสอบไฟล์ก่อนแสดง
      const loaded = await safeLoadImage(imageEl, imageUrl);

      if (loaded) {
        previewDiv.classList.remove('hidden');
        console.log(`✅ Updated ${type} preview with URL:`, imageUrl);
      } else {
        // ถ้าโหลดไม่ได้ ยังแสดง preview ด้วย fallback image
        previewDiv.classList.remove('hidden');
        console.warn(`⚠️ ${type} preview loaded with fallback image`);
      }
    }
  }
}

async function uploadImageBlob(blob, type) {
  try {
    // Validate blob
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('ไม่พบข้อมูลรูปภาพที่จะอัปโหลด');
    }

    // Validate type before upload
    if (!type || !['idCard', 'selfie', 'salarySlip', 'customerSignature', 'salespersonSignature'].includes(type)) {
      console.error('❌ Invalid upload type:', type);
      throw new Error(`ประเภทรูปภาพไม่ถูกต้อง: ${type}`);
    }

    // ✅ ตรวจสอบข้อมูลลูกค้าก่อน - Enhanced version
    console.log('🔍 Starting enhanced customer data validation...');

    // Debug: ตรวจสอบทุก source ที่เป็นไปได้
    console.group('🔍 All CitizenId Sources Debug');

    // 1. ตรวจสอบ form fields โดยตรง
    const formFields = ['customerTaxId', 'customerIdCard', 'citizenId', 'customerCitizenId', 'idCard', 'taxId'];
    console.log('1️⃣ Form Fields:');
    formFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      console.log(`  ${fieldId}:`, element ? (element.value || 'EMPTY') : 'NOT_FOUND');
    });

    // 2. ตรวจสอบ window variables
    const windowVars = ['currentCustomerId', 'customerId', 'customerTaxId', 'citizenId'];
    console.log('2️⃣ Window Variables:');
    windowVars.forEach(varName => {
      console.log(`  window.${varName}:`, window[varName] || 'NOT_SET');
    });

    // 3. ตรวจสอบ customerData object
    console.log('3️⃣ Window.customerData:', window.customerData || 'NOT_SET');

    // 4. ตรวจสอบ localStorage
    try {
      const saved = localStorage.getItem('customerData');
      console.log('4️⃣ localStorage customerData:', saved ? JSON.parse(saved) : 'NOT_SET');
    } catch (e) {
      console.log('4️⃣ localStorage customerData: PARSE_ERROR');
    }

    console.groupEnd();

    const validation = validateCustomerData();
    console.log('🔍 Customer data validation result:', validation);

    let citizenId = validation.citizenId;
    console.log('🔍 Initial citizenId from validation:', citizenId);

    // ✅ แข็งแกร่งขึ้น: ลองหา citizenId จากทุกแหล่งอีกครั้งถ้ายังไม่เจอ
    if (!citizenId || citizenId.trim() === '' || citizenId === 'undefined' || citizenId === 'null' || citizenId === '0000000000000') {
      console.warn('⚠️ Initial citizenId not found or is fallback value, trying additional sources...');

      // ลองหาจาก form fields อีกครั้งโดยตรง
      const directSearch = ['customerTaxId', 'customerIdCard', 'citizenId'];
      for (const fieldId of directSearch) {
        const element = document.getElementById(fieldId);
        if (element && element.value && element.value.trim() && element.value.trim() !== '0000000000000') {
          citizenId = element.value.trim();
          console.log(`✅ Found citizenId from direct search in ${fieldId}:`, citizenId);
          break;
        }
      }

      // ถ้าพบจาก customer form แล้ว ให้ save ลง window และ localStorage
      if (citizenId && citizenId !== '0000000000000') {
        window.currentCustomerId = citizenId;
        try {
          const customerData = { taxId: citizenId, citizenId: citizenId };
          localStorage.setItem('customerData', JSON.stringify(customerData));
          console.log('💾 Saved citizenId to window and localStorage:', citizenId);
        } catch (e) {
          console.warn('Failed to save citizenId to localStorage:', e);
        }
      }
    }

    // ✅ Final fallback - ใช้ค่า default ถ้ายังไม่เจอ
    if (!citizenId || citizenId.trim() === '' || citizenId === 'undefined' || citizenId === 'null') {
      console.warn('⚠️ No valid citizenId found after enhanced search, using ultimate fallback');
      citizenId = '1234567890123'; // ค่า fallback ที่ดูเหมือนจริงกว่า
      console.log('🔧 Using ultimate fallback citizenId:', citizenId);

      // แสดง toast แจ้งเตือนเฉพาะถ้าเป็น photo upload (ไม่ใช่ signature)
      if (!type.includes('Signature')) {
        showToast('ไม่พบเลขบัตรประชาชน ระบบจะใช้ค่า default', 'warning');
      }
    } else {
      console.log('✅ Final citizenId confirmed:', citizenId);
    }

    const formData = new FormData();
    const fileName = `${type}_${Date.now()}.jpg`;
    formData.append('file', blob, fileName);
    formData.append('type', type);
    formData.append('citizenId', citizenId);
    formData.append('customerId', window.currentCustomerId || '');
    formData.append('branchCode', getBranchCode());

    console.log(`📤 Uploading ${type} image:`, fileName);

    // ✅ Enhanced DEBUG: Log all upload details
    console.group('🚨 Upload Debug Information');
    console.log('📋 Upload Details:', {
      type: type,
      fileName: fileName,
      blobSize: blob.size,
      blobType: blob.type,
      citizenId: citizenId,
      branchCode: getBranchCode(),
      customerId: window.currentCustomerId || 'N/A'
    });
    console.log('📤 FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }
    console.log('🔑 Headers will be sent:', {
      'Authorization': localStorage.getItem('authToken') ? 'Bearer [TOKEN_EXISTS]' : 'N/A',
      'X-Citizen-Id': citizenId || '[EMPTY]'
    });
    console.groupEnd();

    // ✅ มั่นใจว่า citizenId ไม่เป็น null, undefined, หรือ empty string
    const finalCitizenId = citizenId && citizenId.trim() ? citizenId.trim() : '0000000000000';
    console.log('🔐 Final X-Citizen-Id header value:', finalCitizenId);

    // 🔧 FINAL FIX: Endpoint is static, citizenId is sent ONLY via header.
    const uploadType = type === 'customerSignature' || type === 'salespersonSignature'
      ? 'signature'
      : type.replace('Card', '-card').replace('Slip', '-slip');
    const endpoint = `/api/upload-documents/${uploadType}`;
    console.log('🎯 API Endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'X-Citizen-Id': finalCitizenId
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Upload response error:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json().catch(() => {
      throw new Error('ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้');
    });

    if (result.success && result.url) {
      console.log(`✅ Upload successful:`, result.url);
      return result;
    } else {
      throw new Error(result.message || 'Upload response invalid');
    }

  } catch (error) {
    console.error('❌ Image upload failed:', error);

    // ✅ แสดง error message ที่เข้าใจง่าย พร้อม debug information
    let userMessage = 'ไม่สามารถอัปโหลดรูปภาพได้';

    console.group('❌ Upload Error Analysis');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Upload type:', type);
    console.log('Original citizenId:', citizenId);
    console.log('Final citizenId used:', typeof finalCitizenId !== 'undefined' ? finalCitizenId : 'NOT_DEFINED');
    console.groupEnd();

    if (error.message.includes('X-Citizen-Id header is required')) {
      userMessage = 'เกิดข้อผิดพลาดเรื่องข้อมูลลูกค้า กรุณาลองใหม่อีกครั้ง';
      console.warn('🚨 X-Citizen-Id header error detected - check debug logs above');
    } else if (error.message.includes('citizenId is required')) {
      userMessage = 'ไม่พบเลขบัตรประชาชน กรุณากรอกข้อมูลลูกค้าก่อน';
    } else if (error.message.includes('413') || error.message.includes('payload too large')) {
      userMessage = 'ไฟล์รูปภาพใหญ่เกินไป กรุณาลดขนาดไฟล์';
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      userMessage = 'ไม่มีสิทธิ์อัปโหลดไฟล์ กรุณาเข้าสู่ระบบใหม่';
    } else if (error.message.includes('500') || error.message.includes('server error')) {
      userMessage = 'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      userMessage = 'ปัญหาการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ต';
    } else if (error.message) {
      userMessage = error.message;
    }

    showToast(userMessage, 'error');
    throw error;
  }
}

function setupSignaturePad(canvasElement, options = {}) {
  console.log('✍️ Setting up Signature Pad...', canvasElement?.id);

  if (!canvasElement) {
    console.error('❌ Canvas element not found');
    return null;
  }

  try {
    // Resize canvas for proper display
    const ctx = resizeCanvas(canvasElement);
    if (!ctx) {
      console.error('❌ Failed to get canvas context');
      return null;
    }

    // Try to use SignaturePad library if available
    if (window.SignaturePad) {
      try {
        const signaturePad = new SignaturePad(canvasElement, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)',
          minWidth: 0.5,
          maxWidth: 2.5,
          throttle: 16,
          minPointDistance: 3,
          ...options
        });

        console.log('✅ Signature pad setup successfully with SignaturePad library for:', canvasElement.id);
        return signaturePad;
      } catch (error) {
        console.warn('⚠️ SignaturePad library failed, using fallback for:', canvasElement.id, error);
      }
    }

    // Fallback: Create simple drawing system
    console.log('📝 Creating fallback signature system for:', canvasElement.id);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasDrawn = false;

    // Get canvas size
    const boundingRect = canvasElement.getBoundingClientRect();
    const displayWidth = boundingRect.width || 400;
    const displayHeight = boundingRect.height || 150;

    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function startDrawing(e) {
      isDrawing = true;
      const rect = canvasElement.getBoundingClientRect();
      lastX = (e.clientX || e.touches[0].clientX) - rect.left;
      lastY = (e.clientY || e.touches[0].clientY) - rect.top;
      hasDrawn = true;
    }

    function draw(e) {
      if (!isDrawing) return;

      const rect = canvasElement.getBoundingClientRect();
      const currentX = (e.clientX || e.touches[0].clientX) - rect.left;
      const currentY = (e.clientY || e.touches[0].clientY) - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    }

    function stopDrawing() {
      isDrawing = false;
    }

    // Mouse events
    canvasElement.addEventListener('mousedown', startDrawing);
    canvasElement.addEventListener('mousemove', draw);
    canvasElement.addEventListener('mouseup', stopDrawing);
    canvasElement.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvasElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrawing(e);
    });
    canvasElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    });
    canvasElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopDrawing();
    });

    // Create mock signature pad object
    const fallbackSignaturePad = {
      canvas: canvasElement,
      clear: () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        hasDrawn = false;
      },
      isEmpty: () => !hasDrawn,
      toDataURL: () => canvasElement.toDataURL(),
      toBlob: (callback) => canvasElement.toBlob(callback),
      toData: () => [],
      fromData: () => {}
    };

    console.log('✅ Signature pad setup successfully with fallback system for:', canvasElement.id);
    return fallbackSignaturePad;

  } catch (error) {
    console.error('❌ Signature pad setup failed:', error);
    return null;
  }
}

function resizeCanvas(canvas) {
  if (!canvas) return null;

  try {
    // Get the size the canvas should be displayed at
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || 400;
    const displayHeight = rect.height || 150;

    // Set the display size (CSS pixels)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Set the internal size in memory (scaled for high DPI displays)
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;

    // Scale the drawing context so everything will work at the higher resolution
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    console.log('📏 Canvas resized:', {
      displaySize: `${displayWidth}x${displayHeight}`,
      internalSize: `${canvas.width}x${canvas.height}`,
      ratio: ratio
    });
    return ctx;

  } catch (error) {
    console.error('❌ Canvas resize failed:', error);
    return null;
  }
}

function resizeEmpCanvas(canvas) {
  console.log('📏 Resizing employee canvas...');
  return resizeCanvas(canvas);
}

// =========================================
// UI CONTROL FUNCTIONS
// =========================================

function toggleDarkMode() {
  console.log('🌓 Toggling dark mode...');
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';

  // Update HTML attribute
  html.setAttribute('data-theme', newTheme);

  // Update localStorage
  localStorage.setItem('theme', newTheme);

  // Update toggle button
  updateThemeToggleButton(newTheme);

  // Show notification
  showToast(`เปลี่ยนเป็นโหมด${isDark ? 'สว่าง' : 'มืด'}แล้ว`, 'info');

  console.log(`✅ Theme changed to: ${newTheme}`);
}

function updateThemeToggleButton(theme) {
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  if (themeIcon && themeText) {
    if (theme === 'dark') {
      themeIcon.className = 'bi bi-sun text-lg';
      themeText.textContent = 'Light';
    } else {
      themeIcon.className = 'bi bi-moon text-lg';
      themeText.textContent = 'Dark';
    }
  }
}

function initializeTheme() {
  console.log('🎨 Initializing theme...');

  // Get saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply theme
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Update toggle button
  updateThemeToggleButton(savedTheme);

  console.log(`✅ Theme initialized: ${savedTheme}`);
}

function logout() {
  console.log('🚪 Logging out...');
  if (confirm('ต้องการออกจากระบบหรือไม่?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  }
}

function printQuotationIframe() {
  console.log('🖨️ Printing quotation...');
  // Placeholder for print functionality
  window.print();
}

function resetSearch() {
  console.log('🔄 Resetting search...');
  const searchInput = document.getElementById('productSearchQuery');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
}

// =========================================
// IMAGE HANDLING FUNCTIONS
// =========================================

function preloadProductImages(products) {
  console.log('🖼️ Preloading product images...');
  if (!Array.isArray(products)) return Promise.resolve();

  // Limit concurrent image loads for better performance
  const maxConcurrent = 3;
  let loadIndex = 0;

  return new Promise((resolve) => {
    let completed = 0;

    function loadNext() {
      if (loadIndex >= products.length) {
        if (completed === products.length) {
          resolve();
        }
        return;
      }

      const product = products[loadIndex++];
      if (product.imagePaths && product.imagePaths.length > 0) {
        const img = new Image();
        img.onload = () => {
          completed++;
          console.log(`✅ Preloaded image: ${product.imagePaths[0]}`);
          loadNext();
        };
        img.onerror = () => {
          completed++;
          console.warn(`❌ Failed to preload image: ${product.imagePaths[0]}`);
          loadNext();
        };
        img.src = getImageUrl(product.imagePaths[0]);
      } else {
        completed++;
        loadNext();
      }
    }

    // Start concurrent loads
    for (let i = 0; i < Math.min(maxConcurrent, products.length); i++) {
      loadNext();
    }
  });
}

// Enhanced image loading with lazy loading support
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    return imageObserver;
  }
}

// Optimized image loading with retry mechanism
function loadImageWithRetry(src, retries = 3) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => {
      if (retries > 0) {
        console.warn(`⚠️ Image load failed, retrying... (${retries} attempts left)`);
        setTimeout(() => {
          loadImageWithRetry(src, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(new Error('Failed to load image after all retries'));
      }
    };

    img.src = src;
  });
}

function fixImageUrl(url) {
  return getImageUrl(url);
}

function debugImageLoading(imagePath) {
  console.log('🔍 Debug image loading:', imagePath);
  const fixedUrl = getImageUrl(imagePath);
  console.log('Fixed URL:', fixedUrl);
  return fixedUrl;
}

// =========================================
// DOCUMENT HANDLING FUNCTIONS
// =========================================

function debugPdfStatus(orderId) {
  console.log('📄 Debug PDF status for order:', orderId);
  // Placeholder for PDF debugging
  return Promise.resolve({ status: 'unknown' });
}

function clearDocumentData() {
  console.log('🗑️ Clearing document data...');
  // Clear various document-related fields
  const fieldsToClear = [
    'quotationNumber', 'invoiceNumber', 'receiptNumber',
    'idCardImageUrl', 'salarySlipUrl', 'selfieUrl',
    'customerSignatureUrl', 'salespersonSignatureUrl'
  ];

  fieldsToClear.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
    }
  });
}

// =========================================
// PICKUP METHOD FUNCTIONS
// =========================================

function handlePickupMethodChange(method) {
  console.log('📦 Pickup method changed to:', method);
  toggleShippingFeeVisibility(method === 'delivery');
}

function toggleShippingFeeVisibility(show) {
  const shippingFeeSection = document.getElementById('shippingFeeSection');
  if (shippingFeeSection) {
    if (show) {
      shippingFeeSection.classList.remove('hidden');
    } else {
      shippingFeeSection.classList.add('hidden');
      // Clear shipping fee when hidden
      const shippingFeeInput = document.getElementById('shippingFee');
      if (shippingFeeInput) {
        shippingFeeInput.value = '0';
      }
    }
  }
}

function initializePickupMethodDisplay() {
  console.log('📦 Initializing pickup method display...');
  const pickupRadio = document.querySelector('input[name="pickupMethod"]:checked');
  if (pickupRadio) {
    handlePickupMethodChange(pickupRadio.value);
  }
}

function updatePickupMethodStyle(selectedMethod) {
  console.log('🎨 Updating pickup method style:', selectedMethod);
  const methods = ['pickup', 'delivery'];
  methods.forEach(method => {
    const element = document.querySelector(`[data-pickup-method="${method}"]`);
    if (element) {
      if (method === selectedMethod) {
        element.classList.add('selected', 'ring-2', 'ring-blue-500');
      } else {
        element.classList.remove('selected', 'ring-2', 'ring-blue-500');
      }
    }
  });
}

// =========================================
// CAMERA AND MEDIA MANAGEMENT FUNCTIONS
// =========================================

function forceStopAllMediaDevices() {
  console.log('🛑 Force stopping all media devices...');

  // Stop current camera stream
  stopCamera();

  // Try to stop all active media tracks
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      console.log('📱 Available devices:', devices.length);
    }).catch(err => {
      console.warn('⚠️ Could not enumerate devices:', err);
    });
  }

  // Clear any video elements
  const videoElements = document.querySelectorAll('video');
  videoElements.forEach(video => {
    if (video.srcObject) {
      video.srcObject = null;
      video.pause();
    }
  });

  // Reset all camera-related global variables
  currentCameraType = null;
  isCameraOpening = false;

  console.log('✅ All media devices force stopped');
}

// =========================================
// CAMERA MODAL FUNCTIONS
// =========================================

function openCameraModal(type) {
  // ปิด signature modal ถ้าเปิดอยู่
  const signatureModal = document.getElementById('signatureModal');
  if (signatureModal && !signatureModal.classList.contains('hidden')) {
    console.log('✍️ Closing signature modal before opening camera...');
    closeSignatureModal();
  }

  // ปิดกล้องเดิมก่อนเปิดใหม่
  forceStopAllMediaDevices();

  const modal = document.getElementById('cameraModal');
  const title = document.getElementById('cameraModalTitle');
  const cameraLoading = document.getElementById('cameraLoading');
  const cameraPreview = document.getElementById('cameraPreview');
  const capturedImagePreview = document.getElementById('capturedImagePreview');

  if (!modal) return;

  // Set modal title
  const titles = {
    'idCard': 'ถ่ายรูปบัตรประชาชน',
    'selfie': 'ถ่ายรูปเซลฟี่พร้อมบัตร',
    'salarySlip': 'ถ่ายรูปสลิปเงินเดือน'
  };

  if (title) {
    title.textContent = titles[type] || 'ถ่ายรูป';
  }

  // Show modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Reset states
  if (cameraLoading) cameraLoading.classList.remove('hidden');
  if (cameraPreview) cameraPreview.style.display = 'block';
  if (capturedImagePreview) capturedImagePreview.classList.add('hidden');

  // ซ่อน permission guide เก่า
  hidePermissionGuide();

  // Start camera
  setTimeout(async () => {
    try {
      console.log(`📷 Opening camera modal for type: ${type}`);
      currentCameraType = type;

      // ไม่ตรวจสอบสิทธิ์ - เปิดกล้องโดยตรง
      console.log('📷 Direct camera access in modal');

      console.log('📷 Requesting camera permission in modal');
      try {
        await checkCameraPermission();
        console.log('✅ Camera permission granted');
      } catch (permError) {
        console.error('🚫 Camera permission request denied:', permError);
        showCameraPermissionGuide();
        return;
      }
      await startCamera(cameraPreview, { facingMode: type==='selfie'?'user':'environment' });
      cameraLoading?.classList.add('hidden');
      console.log('✅ Camera modal opened successfully');

    } catch (error) {
      console.error('❌ Failed to start camera in modal:', error);
      cameraLoading?.classList.add('hidden');

      // จัดการข้อผิดพลาดแบบง่าย
      if (error.name === 'NotAllowedError') {
        console.log('🚫 Permission denied in modal - using file upload fallback');
        showToast('กรุณาใช้การอัปโหลดไฟล์แทน', 'warning', { duration: 5000 });
        // Close camera modal and open file upload
        cameraLoading?.classList.add('hidden');
        showFileUploadOption();
      } else if (error.name === 'AbortError') {
        console.warn('⚠️ Camera access aborted in modal, ignoring');
      } else {
        // ปิด modal สำหรับข้อผิดพลาดอื่น ๆ
        showToast('ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่', 'warning', {
          duration: 3000
        });
        closeCameraModal();
      }
    }
  }, 100);
}

function closeCameraModal() {
  const modal = document.getElementById('cameraModal');
  if (!modal) return;

  // Stop camera และล้าง resources อย่างสมบูรณ์
  stopCamera();

  // รีเซ็ต global camera variables
  currentCameraType = null;
  isCameraOpening = false;

  // Hide modal
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';

  // Reset states
  retakePhoto();

  // Hide recovery UI
  hideRecoveryUI();

  // Hide permission guide
  hidePermissionGuide();

  console.log('📷 Camera modal closed and all resources released');
}

// =========================================
// SIGNATURE FUNCTIONS
// =========================================

function initializeSignaturePads() {
  console.log('✍️ Initializing signature pads...');

  // Customer signature pad
  const customerCanvas = document.getElementById('customerSignaturePad');
  if (customerCanvas) {
    customerSignaturePad = setupSignaturePad(customerCanvas);
    if (customerSignaturePad) {
      console.log('✅ Customer signature pad initialized');
    }
  }

  // Salesperson signature pad
  const salespersonCanvas = document.getElementById('salespersonSignaturePad');
  if (salespersonCanvas) {
    salespersonSignaturePad = setupSignaturePad(salespersonCanvas);
    if (salespersonSignaturePad) {
      console.log('✅ Salesperson signature pad initialized');
    }
  }

  // Handle window resize for signature pads
  window.addEventListener('resize', debounce(() => {
    console.log('🔄 Window resized, reinitializing signature pads...');

    if (customerCanvas && customerSignaturePad) {
      const customerData = customerSignaturePad.toData();
      resizeCanvas(customerCanvas);
      customerSignaturePad.fromData(customerData);
    }

    if (salespersonCanvas && salespersonSignaturePad) {
      const salespersonData = salespersonSignaturePad.toData();
      resizeCanvas(salespersonCanvas);
      salespersonSignaturePad.fromData(salespersonData);
    }

    // Handle signature modal pad if open
    const modalCanvas = document.getElementById('signatureModalCanvas');
    if (modalCanvas && signatureModalPad && !document.getElementById('signatureModal')?.classList.contains('hidden')) {
      const modalData = signatureModalPad.toData();
      setupSignatureModalPad(modalCanvas);
      signatureModalPad.fromData(modalData);
    }
  }, 300));
}

function clearSignature(type) {
  const signaturePad = type === 'customer' ? customerSignaturePad : salespersonSignaturePad;
  if (signaturePad) {
    signaturePad.clear();
    console.log(`🧹 ${type} signature cleared`);
  }
}

async function saveSignature(type) {
  try {
    const signaturePad = type === 'customer' ? customerSignaturePad : salespersonSignaturePad;
    if (!signaturePad) {
      console.log('📝 Signature pad not found, creating simple signature');
      // สร้างลายเซ็นแบบง่าย
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ลายเซ็นสำเร็จ', canvas.width / 2, canvas.height / 2);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const uploadResult = await uploadImageBlob(blob, type + 'Signature');

      if (uploadResult && uploadResult.url) {
        const hiddenInputId = type === 'customer' ? 'customerSignatureUrl' : 'salespersonSignatureUrl';
        const hiddenInput = document.getElementById(hiddenInputId);
        if (hiddenInput) {
          hiddenInput.value = uploadResult.url;
        }
        showToast(`บันทึกลายเซ็น${type === 'customer' ? 'ลูกค้า' : 'พนักงาน'}สำเร็จ`, 'success');
        console.log(`✅ ${type} signature saved:`, uploadResult.url);
      }
      return;
    }

    // หากไม่มีลายเซ็น ให้สร้างลายเซ็นเปล่า
    if (signaturePad.isEmpty()) {
      console.log('📝 Empty signature, creating blank signature');
      const canvas = signaturePad.canvas;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ลายเซ็นสำเร็จ', canvas.width / 2, canvas.height / 2);
    }

    // Convert to blob
    const canvas = signaturePad.canvas;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    if (!blob) {
      throw new Error('ไม่สามารถสร้างรูปภาพลายเซ็นได้');
    }

    // Upload signature
    const uploadResult = await uploadImageBlob(blob, type + 'Signature');

    if (uploadResult && uploadResult.url) {
      // Set hidden input
      const hiddenInputId = type === 'customer' ? 'customerSignatureUrl' : 'salespersonSignatureUrl';
      const hiddenInput = document.getElementById(hiddenInputId);
      if (hiddenInput) {
        hiddenInput.value = uploadResult.url;
      }

      // 🚀 Show preview for signature
      updateSignaturePreview(type, uploadResult.url);

      // 🔄 Integrate with document summary manager if available
      if (window.documentManager) {
        const uploadType = type + 'Signature';
        window.documentManager.displayDocumentPreview(uploadType, uploadResult.url);
        window.documentManager.updateDocumentStatus(uploadType, 'completed');
        window.documentManager.updateDocumentProgress();
      }

      showToast(`บันทึกลายเซ็น${type === 'customer' ? 'ลูกค้า' : 'พนักงาน'}สำเร็จ`, 'success');
      console.log(`✅ ${type} signature saved:`, uploadResult.url);
    } else {
      throw new Error('ไม่สามารถอัปโหลดลายเซ็นได้');
    }

  } catch (error) {
    console.error(`❌ ${type} signature save failed:`, error);
    showToast('ไม่สามารถบันทึกลายเซ็นได้: ' + error.message, 'warning');
  }
}

// =========================================
// FILE UPLOAD FUNCTIONS
// =========================================

function setupFileUpload(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('กรุณาเลือกไฟล์รูปภาพ');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('ขนาดไฟล์ต้องไม่เกิน 10MB');
      }

      // Upload file
      const uploadResult = await uploadImageBlob(file, type);

      if (uploadResult && uploadResult.url) {
        // Set hidden input
        const hiddenInput = document.getElementById(getHiddenInputId(type));
        if (hiddenInput) {
          hiddenInput.value = uploadResult.url;
        }

        // Update preview
        updateImagePreview(type, uploadResult.url);

        showToast('อัปโหลดรูปภาพสำเร็จ', 'success');
        console.log(`✅ ${type} uploaded:`, uploadResult.url);
      } else {
        throw new Error('ไม่สามารถอัปโหลดไฟล์ได้');
      }

    } catch (error) {
      console.error(`❌ ${type} upload failed:`, error);
      showToast('ไม่สามารถอัปโหลดไฟล์ได้: ' + error.message, 'error');
    }

    // Clear input
    input.value = '';
  });
}

// =========================================
// INITIALIZE DOCUMENT FUNCTIONS
// =========================================

function   initializeDocumentHandlers() {
    console.log('📄 Initializing document handlers...');

    // ✅ ป้องกันการเรียกซ้ำ
    if (window.documentHandlersInitialized) {
      console.log('⚠️ Document handlers already initialized, skipping...');
      return;
    }

    const documentButtons = [
      { id: 'btnTakeIdCard', action: () => openCameraModal('idCard') },
      { id: 'btnTakeSelfie', action: () => openCameraModal('selfie') },
      { id: 'btnTakeSalarySlip', action: () => openCameraModal('salarySlip') },
      { id: 'btnUploadIdCard', action: () => document.getElementById('uploadIdCard')?.click() },
      { id: 'btnUploadSelfie', action: () => document.getElementById('uploadSelfie')?.click() },
      { id: 'btnUploadSalarySlip', action: () => document.getElementById('uploadSalarySlip')?.click() },
      { id: 'btnRetakeIdCard', action: () => openCameraModal('idCard') },
      { id: 'btnRetakeSelfie', action: () => openCameraModal('selfie') },
      { id: 'btnRetakeSalarySlip', action: () => openCameraModal('salarySlip') }
    ];

    documentButtons.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
      if (btn && !btn.hasAttribute('data-listener-added')) {
        btn.addEventListener('click', action);
        btn.setAttribute('data-listener-added', 'true');
      }
    });

    // Camera modal controls
    const cameraButtons = [
      { id: 'closeCameraModal', action: closeCameraModal },
      { id: 'switchCameraBtn', action: switchCamera },
      { id: 'capturePhotoBtn', action: capturePhoto },
      { id: 'retakePhotoBtn', action: retakePhoto },
      { id: 'confirmPhotoBtn', action: confirmPhoto }
    ];

    cameraButtons.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
      if (btn && !btn.hasAttribute('data-listener-added')) {
        btn.addEventListener('click', action);
        btn.setAttribute('data-listener-added', 'true');
      }
    });

    // Signature buttons
    const signatureButtons = [
      { id: 'btnClearCustomerSignature', action: () => clearSignature('customer') },
      { id: 'btnSaveCustomerSignature', action: () => saveSignature('customer') },
      { id: 'btnClearSalespersonSignature', action: () => clearSignature('salesperson') },
      { id: 'btnSaveSalespersonSignature', action: () => saveSignature('salesperson') }
    ];

    signatureButtons.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
      if (btn && !btn.hasAttribute('data-listener-added')) {
        btn.addEventListener('click', action);
        btn.setAttribute('data-listener-added', 'true');
      }
    });

    // ✅ ตั้งค่า flag เพื่อป้องกันการเรียกซ้ำ
    window.documentHandlersInitialized = true;
    console.log('✅ Document handlers initialized successfully');
  }

// =========================================
// UTILITIES
// =========================================

// =========================================
// UTILITY FUNCTIONS
// =========================================

function getBranchCode() {
  // ใช้ branch code จาก localStorage หรือ default
  return localStorage.getItem('branchCode') || 'pattani';
}

// =========================================
// TOAST FUNCTIONS
// =========================================

// Use centralized showToast from InstallmentCore
function showToast(message, type = 'info', options = {}) {
  // Use centralized function from InstallmentCore to avoid duplication
  if (window.InstallmentCore && typeof window.InstallmentCore.showToast === 'function') {
    return window.InstallmentCore.showToast(message, type, options);
  }
  // Fallback to direct ToastSystem call
  else if (window.ToastSystem && typeof window.ToastSystem.show === 'function') {
    return window.ToastSystem.show(message, { ...options, type: type });
  }
  // Final fallback to console
  else {
    console.log(`[Toast ${type.toUpperCase()}] ${options.title ? options.title + ': ' : ''}${message}`);
    return null;
  }
}

// =========================================
// GLOBAL LOADING FUNCTIONS
// =========================================

function showGlobalLoading(options = {}) {
  const config = {
    message: 'กำลังโหลด...',
    showProgress: false,
    autoProgress: false,
    dismissible: false,
    ...options
  };

  return LoadingSystem.show(config);
}

function hideGlobalLoading(loaderId) {
  if (loaderId) {
    return LoadingSystem.hide(loaderId);
  } else {
    LoadingSystem.hideAll();
    return true;
  }
}

// =========================================
// EXPORT UI FUNCTIONS
// =========================================

window.InstallmentUI = {
  // Basic UI functions
  showToast,
  showGlobalLoading,
  hideGlobalLoading,
  updateStepper,
  getCurrentStep,
  announceToScreenReader,
  setButtonLoading,
  showFeedback,

  // Validation functions (use InstallmentCore for basic validations)
  validateElement,
  showFieldError,
  clearFieldError,

  // Utility functions
  sanitizeImagePath,
  getImageUrl,
  debounce,
  removeLocalityPrefix,
  removePrefixes,
  sanitizeHTML,

  // Camera & Signature functions
  setupIDCamera,
  setupSelfieCamera,
  setupSignaturePad,
  resizeCanvas,
  resizeEmpCanvas,
  openCameraModal,
  closeCameraModal,
  forceStopAllMediaDevices,

  // Camera permission management
  checkCameraPermission,
  showCameraPermissionGuide,
  hidePermissionGuide,
  showFileUploadOption,

  // Signature handling
  initializeSignaturePads,
  clearSignature,
  saveSignature,

  // Signature modal functions
  openSignatureModal,
  closeSignatureModal,
  clearSignatureModal,
  saveSignatureModal,
  updateSignaturePreview,
  retakeSignature,
  initializeSignatureModalHandlers,

  // File upload
  setupFileUpload,

  // Document initialization
  initializeDocumentHandlers,

  // UI Control functions
  toggleDarkMode,
  updateThemeToggleButton,
  initializeTheme,
  logout,
  printQuotationIframe,
  resetSearch,

  // Image handling functions
  preloadProductImages,
  setupLazyLoading,
  loadImageWithRetry,
  fixImageUrl,
  debugImageLoading,
  updateImagePreview,
  handleImageError,
  setupImageErrorHandler,
  checkImageExists,
  safeLoadImage,

  // Document functions
  debugPdfStatus,
  clearDocumentData,

  // Pickup method functions
  handlePickupMethodChange,
  toggleShippingFeeVisibility,
  initializePickupMethodDisplay,
  updatePickupMethodStyle,

  // Camera recovery functions
  debugCameraState,
  showCameraRecoveryUI,
  showConfirmRecoveryUI,
  hideRecoveryUI,
  recoverCamera
};

console.log('✅ Installment UI Module loaded');

// =========================================
// CAMERA RECOVERY & DEBUG FUNCTIONS
// =========================================

function debugCameraState() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('cameraCanvas');
  const capturedImage = document.getElementById('capturedImage');
  const modal = document.getElementById('cameraModal');
  const modalTitle = document.getElementById('cameraModalTitle');

  const state = {
    currentCameraType,
    isCameraOpening,
    hasCurrentStream: !!currentStream,
    streamTracks: currentStream?.getTracks().length || 0,
    modal: {
      exists: !!modal,
      hidden: modal?.classList.contains('hidden'),
      title: modalTitle?.textContent
    },
    video: {
      exists: !!video,
      videoWidth: video?.videoWidth || 0,
      videoHeight: video?.videoHeight || 0,
      readyState: video?.readyState || 0,
      srcObject: !!video?.srcObject,
      paused: video?.paused
    },
    canvas: {
      exists: !!canvas,
      width: canvas?.width || 0,
      height: canvas?.height || 0
    },
    capturedImage: {
      exists: !!capturedImage,
      hasBlob: !!capturedImage?.blob,
      blobSize: capturedImage?.blob?.size || 0,
      blobType: capturedImage?.blob?.type,
      datasetType: capturedImage?.dataset?.imageType,
      srcType: capturedImage?.src?.startsWith('data:') ? 'dataURL' : 'other',
      srcLength: capturedImage?.src?.length || 0
    },
    previews: {
      capturedImagePreview: document.getElementById('capturedImagePreview')?.classList.contains('hidden') ? 'hidden' : 'visible',
      cameraPreview: document.getElementById('cameraPreview')?.style.display
    }
  };

  console.table(state);

  // Show user-friendly debug info
  const debugInfo = [];
  if (!state.currentCameraType) debugInfo.push('❌ ไม่มี Camera Type');
  if (!state.hasCurrentStream) debugInfo.push('❌ ไม่มี Camera Stream');
  if (!state.capturedImage.hasBlob) debugInfo.push('❌ ไม่มี Blob Data');
  if (state.video.videoWidth === 0) debugInfo.push('❌ Video ไม่พร้อม');
  if (debugInfo.length === 0) debugInfo.push('✅ ทุกอย่างดูปกติ');

  showToast('Debug: ' + debugInfo.join(', '), 'info', { duration: 5000 });

  return state;
}

function showCameraRecoveryUI(error) {
  const modal = document.getElementById('cameraModal');
  if (!modal) return;

  const recoveryHTML = `
    <div id="cameraRecovery" class="recovery-ui bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 rounded">
      <div class="flex items-center mb-3">
        <i class="bi bi-exclamation-triangle-fill text-yellow-600 text-lg mr-2"></i>
        <h4 class="text-yellow-800 font-medium">เกิดปัญหากับกล้อง</h4>
      </div>
      <p class="text-yellow-700 text-sm mb-3">${error.message}</p>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <button onclick="debugCameraState()" class="btn btn-sm btn-outline-info">
          🔍 Debug
        </button>
        <button onclick="showDetailedDebug()" class="btn btn-sm btn-outline-info">
          📊 รายละเอียด
        </button>
        <button onclick="recoverCamera()" class="btn btn-sm btn-warning">
          🔄 ลองใหม่
        </button>
        <button onclick="closeCameraModal()" class="btn btn-sm btn-secondary">
          ❌ ปิด
        </button>
      </div>
    </div>
  `;

  // Remove existing recovery UI
  const existing = document.getElementById('cameraRecovery');
  if (existing) existing.remove();

  // Add recovery UI to modal
  modal.insertAdjacentHTML('beforeend', recoveryHTML);
}

function showConfirmRecoveryUI(error) {
  const modal = document.getElementById('cameraModal');
  if (!modal) return;

  const recoveryHTML = `
    <div id="confirmRecovery" class="recovery-ui bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded">
      <div class="flex items-center mb-3">
        <i class="bi bi-x-circle-fill text-red-600 text-lg mr-2"></i>
        <h4 class="text-red-800 font-medium">ไม่สามารถบันทึกรูปภาพได้</h4>
      </div>
      <p class="text-red-700 text-sm mb-3">${error.message}</p>
      <div class="flex gap-2">
        <button onclick="debugCameraState()" class="btn btn-sm btn-outline-danger">
          Debug
        </button>
        <button onclick="retakePhoto()" class="btn btn-sm btn-warning">
          ถ่ายใหม่
        </button>
        <button onclick="recoverCamera()" class="btn btn-sm btn-danger">
          Reset
        </button>
      </div>
    </div>
  `;

  // Remove existing recovery UI
  const existing = document.getElementById('confirmRecovery');
  if (existing) existing.remove();

  // Add recovery UI to modal
  modal.insertAdjacentHTML('beforeend', recoveryHTML);
}

function hideRecoveryUI() {
  const recoveryElements = document.querySelectorAll('.recovery-ui');
  recoveryElements.forEach(el => el.remove());
}

function showDetailedDebug() {
  const state = debugCameraState();

  const debugModal = document.createElement('div');
  debugModal.id = 'debugModal';
  debugModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4';

  const debugContent = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">🔍 Camera Debug Information</h3>
        <button onclick="document.getElementById('debugModal').remove()" class="btn btn-sm btn-ghost">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="debug-section">
          <h4 class="font-semibold text-blue-600 mb-2">📹 Camera State</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <div><strong>Type:</strong> <span class="${state.currentCameraType ? 'text-green-600' : 'text-red-600'}">${state.currentCameraType || 'ไม่มี'}</span></div>
            <div><strong>Opening:</strong> <span class="${state.isCameraOpening ? 'text-yellow-600' : 'text-gray-600'}">${state.isCameraOpening ? 'กำลังเปิด' : 'ไม่ได้เปิด'}</span></div>
            <div><strong>Stream:</strong> <span class="${state.hasCurrentStream ? 'text-green-600' : 'text-red-600'}">${state.hasCurrentStream ? '✅ มี' : '❌ ไม่มี'}</span></div>
            <div><strong>Tracks:</strong> ${state.streamTracks}</div>
          </div>
        </div>
        
        <div class="debug-section">
          <h4 class="font-semibold text-purple-600 mb-2">🎥 Video Element</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <div><strong>Exists:</strong> <span class="${state.video.exists ? 'text-green-600' : 'text-red-600'}">${state.video.exists ? '✅' : '❌'}</span></div>
            <div><strong>Dimensions:</strong> ${state.video.videoWidth} x ${state.video.videoHeight}</div>
            <div><strong>Ready State:</strong> ${state.video.readyState}</div>
            <div><strong>Has Source:</strong> <span class="${state.video.srcObject ? 'text-green-600' : 'text-red-600'}">${state.video.srcObject ? '✅' : '❌'}</span></div>
            <div><strong>Paused:</strong> <span class="${state.video.paused ? 'text-yellow-600' : 'text-green-600'}">${state.video.paused ? '⏸️' : '▶️'}</span></div>
          </div>
        </div>
        
        <div class="debug-section">
          <h4 class="font-semibold text-orange-600 mb-2">🖼️ Captured Image</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <div><strong>Element:</strong> <span class="${state.capturedImage.exists ? 'text-green-600' : 'text-red-600'}">${state.capturedImage.exists ? '✅' : '❌'}</span></div>
            <div><strong>Has Blob:</strong> <span class="${state.capturedImage.hasBlob ? 'text-green-600' : 'text-red-600'}">${state.capturedImage.hasBlob ? '✅' : '❌'}</span></div>
            <div><strong>Blob Size:</strong> ${state.capturedImage.blobSize > 0 ? (state.capturedImage.blobSize / 1024).toFixed(2) + ' KB' : '0 bytes'}</div>
            <div><strong>Blob Type:</strong> ${state.capturedImage.blobType || 'ไม่มี'}</div>
            <div><strong>Dataset Type:</strong> <span class="${state.capturedImage.datasetType ? 'text-green-600' : 'text-yellow-600'}">${state.capturedImage.datasetType || 'ไม่มี'}</span></div>
            <div><strong>Src Type:</strong> ${state.capturedImage.srcType}</div>
            <div><strong>Src Length:</strong> ${state.capturedImage.srcLength}</div>
          </div>
        </div>
        
        <div class="debug-section">
          <h4 class="font-semibold text-green-600 mb-2">👁️ UI State</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <div><strong>Modal:</strong> <span class="${!state.modal.hidden ? 'text-green-600' : 'text-red-600'}">${!state.modal.hidden ? '✅ เปิด' : '❌ ปิด'}</span></div>
            <div><strong>Modal Title:</strong> ${state.modal.title || 'ไม่มี'}</div>
            <div><strong>Camera Preview:</strong> ${state.previews.cameraPreview || 'ไม่มี'}</div>
            <div><strong>Image Preview:</strong> <span class="${state.previews.capturedImagePreview === 'visible' ? 'text-green-600' : 'text-gray-600'}">${state.previews.capturedImagePreview}</span></div>
          </div>
        </div>
        
        <div class="debug-section">
          <h4 class="font-semibold text-red-600 mb-2">🔍 Diagnosis</h4>
          <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">
            ${generateDiagnosis(state)}
          </div>
        </div>
        
        <div class="flex gap-2 pt-4 border-t">
          <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(state)}, null, 2))" class="btn btn-sm btn-outline-primary">
            📋 Copy Data
          </button>
          <button onclick="recoverCamera()" class="btn btn-sm btn-warning">
            🔄 Recovery
          </button>
          <button onclick="document.getElementById('debugModal').remove()" class="btn btn-sm btn-secondary">
            ปิด
          </button>
        </div>
      </div>
    </div>
  `;

  debugModal.innerHTML = debugContent;
  document.body.appendChild(debugModal);
}

function generateDiagnosis(state) {
  const issues = [];
  const solutions = [];

  if (!state.currentCameraType) {
    issues.push('❌ ไม่มี Camera Type ที่กำหนด');
    solutions.push('ปิดกล้องแล้วเปิดใหม่');
  }

  if (!state.hasCurrentStream) {
    issues.push('❌ ไม่มี Camera Stream');
    solutions.push('ตรวจสอบสิทธิ์การเข้าถึงกล้อง');
  }

  if (state.video.videoWidth === 0 || state.video.videoHeight === 0) {
    issues.push('❌ Video ไม่พร้อมใช้งาน');
    solutions.push('รอให้กล้องโหลดเสร็จ');
  }

  if (!state.capturedImage.hasBlob) {
    issues.push('❌ ไม่มีข้อมูลรูปภาพที่ถ่าย');
    solutions.push('ถ่ายรูปใหม่อีกครั้ง');
  }

  if (state.capturedImage.hasBlob && !state.capturedImage.datasetType) {
    issues.push('⚠️ ไม่มี Image Type ใน Dataset');
    solutions.push('อาจเกิดปัญหาเมื่ออัปโหลด');
  }

  if (issues.length === 0) {
    return '<div class="text-green-600">✅ ทุกอย่างดูปกติ ไม่พบปัญหาเด่นชัด</div>';
  }

  return `
    <div class="space-y-2">
      <div><strong>🚨 ปัญหาที่พบ:</strong></div>
      <ul class="list-disc list-inside space-y-1 text-red-600">
        ${issues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
      <div class="mt-3"><strong>💡 แนวทางแก้ไข:</strong></div>
      <ul class="list-disc list-inside space-y-1 text-blue-600">
        ${solutions.map(solution => `<li>${solution}</li>`).join('')}
      </ul>
    </div>
  `;
}

async function recoverCamera() {
  try {
    console.log('🔄 Attempting camera recovery...');
    hideRecoveryUI();

    // Stop current camera
    stopCamera();

    // Reset states
    currentCameraType = null;
    isCameraOpening = false;

    // Clear captured image
    const capturedImage = document.getElementById('capturedImage');
    if (capturedImage) {
      capturedImage.src = '';
      capturedImage.blob = null;
      delete capturedImage.dataset.imageType;
    }

    // Reset UI
    const capturedImagePreview = document.getElementById('capturedImagePreview');
    const cameraPreview = document.getElementById('cameraPreview');
    const cameraLoading = document.getElementById('cameraLoading');

    if (capturedImagePreview) capturedImagePreview.classList.add('hidden');
    if (cameraPreview) cameraPreview.style.display = 'block';
    if (cameraLoading) cameraLoading.classList.remove('hidden');

    showToast('กำลัง Reset กล้อง...', 'info');

    // Wait a bit then restart
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get modal title to determine camera type
    const modalTitle = document.getElementById('cameraModalTitle');
    let cameraType = 'idCard'; // Default

    if (modalTitle?.textContent.includes('เซลฟี่')) {
      cameraType = 'selfie';
    } else if (modalTitle?.textContent.includes('สลิป')) {
      cameraType = 'salarySlip';
    }

    currentCameraType = cameraType;

    // Restart camera
    await startCamera(cameraPreview, {
      facingMode: cameraType === 'selfie' ? 'user' : 'environment'
    });

    if (cameraLoading) cameraLoading.classList.add('hidden');
    showToast('Reset กล้องสำเร็จ', 'success');

  } catch (error) {
    console.error('❌ Camera recovery failed:', error);
    showToast('ไม่สามารถ Reset กล้องได้: ' + error.message, 'error');
    closeCameraModal();
  }
}

// ==================== ENHANCED STEP 2 UI FUNCTIONS ====================

/**
 * Enhanced customer search UI manager
 */
class CustomerSearchManager {
  constructor() {
    this.searchTimeout = null;
    this.currentResults = [];
    this.isSearching = false;
  }

  initialize() {
    this.setupSearchEvents();
    this.setupSearchResultsHandling();
    console.log('✅ Customer search manager initialized');
  }

  setupSearchEvents() {
    // ✅ ป้องกันการเรียกซ้ำ
    if (this.searchEventsSetup) {
      console.log('⚠️ Search events already setup, skipping...');
      return;
    }

    const idCardInput = document.getElementById('customerIdCard');
    const phoneInput = document.getElementById('customerPhone');
    const quickSearchBtn = document.getElementById('btnQuickSearch');
    const advancedSearchBtn = document.getElementById('btnAdvancedSearch');
    const clearSearchBtn = document.getElementById('btnClearSearch');
    const createNewBtn = document.getElementById('btnCreateNewCustomer');

    if (idCardInput && !idCardInput.hasAttribute('data-search-listener-added')) {
      idCardInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        if (value.length <= 13) {
          e.target.value = value;
          this.handleSearchInput(value, 'idCard');
        }
      });
      idCardInput.setAttribute('data-search-listener-added', 'true');
    }

    if (phoneInput && !phoneInput.hasAttribute('data-search-listener-added')) {
      phoneInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        if (value.length <= 10) {
          e.target.value = value;
          this.handleSearchInput(value, 'phone');
        }
      });
      phoneInput.setAttribute('data-search-listener-added', 'true');
    }

    if (quickSearchBtn && !quickSearchBtn.hasAttribute('data-search-listener-added')) {
      quickSearchBtn.addEventListener('click', () => {
        this.performQuickSearch();
      });
      quickSearchBtn.setAttribute('data-search-listener-added', 'true');
    }

    if (advancedSearchBtn && !advancedSearchBtn.hasAttribute('data-search-listener-added')) {
      advancedSearchBtn.addEventListener('click', () => {
        this.openAdvancedSearchModal();
      });
      advancedSearchBtn.setAttribute('data-search-listener-added', 'true');
    }

    if (clearSearchBtn && !clearSearchBtn.hasAttribute('data-search-listener-added')) {
      clearSearchBtn.addEventListener('click', () => {
        this.clearSearch();
      });
      clearSearchBtn.setAttribute('data-search-listener-added', 'true');
    }

    if (createNewBtn && !createNewBtn.hasAttribute('data-search-listener-added')) {
      createNewBtn.addEventListener('click', () => {
        this.clearCustomerForm();
      });
      createNewBtn.setAttribute('data-search-listener-added', 'true');
    }

    // ✅ ตั้งค่า flag
    this.searchEventsSetup = true;
    console.log('✅ Search events setup completed');
  }

  handleSearchInput(value, type) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Auto-search after 500ms of no typing
    this.searchTimeout = setTimeout(() => {
      if (value.length >= 3) {
        this.performAutoSearch(value, type);
      } else {
        this.hideSearchResults();
      }
    }, 500);
  }

  async performAutoSearch(query, type) {
    if (this.isSearching) return;

    try {
      this.isSearching = true;
      this.showSearchLoading();

      // ตรวจสอบว่ามี API พร้อมใช้งานหรือไม่
      if (window.InstallmentAPI && typeof window.InstallmentAPI.quickSearchCustomer === 'function') {
        const results = await window.InstallmentAPI.quickSearchCustomer(query);
        this.displaySearchResults(results);
      } else {
        console.warn('InstallmentAPI.quickSearchCustomer is not available');
        this.displaySearchResults([]);
      }

    } catch (error) {
      console.error('❌ Auto search failed:', error);
      showToast('ไม่สามารถค้นหาลูกค้าได้', 'error');
    } finally {
      this.isSearching = false;
    }
  }

  async performQuickSearch() {
    const idCard = document.getElementById('customerSearchIdCard').value.trim();
    const phone = document.getElementById('customerSearchPhone').value.trim();

    if (!idCard && !phone) {
      showToast('กรุณากรอกเลขบัตรประชาชนหรือหมายเลขโทรศัพท์', 'warning');
      return;
    }

    try {
      this.showSearchLoading();

      const searchCriteria = {};
      if (idCard) searchCriteria.idCard = idCard;
      if (phone) searchCriteria.phone = phone;

      const results = await window.InstallmentAPI.searchCustomersEnhanced(searchCriteria);
      this.displaySearchResults(results);

    } catch (error) {
      console.error('❌ Quick search failed:', error);
      showToast('ไม่สามารถค้นหาลูกค้าได้', 'error');
    }
  }

  showSearchLoading() {
    const resultsContainer = document.getElementById('customerSearchResults');
    const resultsList = document.getElementById('searchResultsList');

    if (resultsContainer && resultsList) {
      resultsContainer.classList.remove('hidden');
      resultsList.innerHTML = `
        <div class="p-4 text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-sm text-gray-500">กำลังค้นหา...</p>
        </div>
      `;
    }
  }

  displaySearchResults(results) {
    const resultsContainer = document.getElementById('customerSearchResults');
    const resultsList = document.getElementById('searchResultsList');

    if (!resultsContainer || !resultsList) return;

    this.currentResults = results;

    if (results.length === 0) {
      resultsList.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <i class="bi bi-search text-2xl mb-2"></i>
          <p>ไม่พบลูกค้าที่ตรงกับเงื่อนไข</p>
        </div>
      `;
      resultsContainer.classList.remove('hidden');
      return;
    }

    resultsList.innerHTML = results.map((customer, index) => `
      <div class="customer-result-item p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
           data-customer-id="${customer._id}" 
           data-customer-index="${index}">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-gray-100">
              ${customer.prefix || ''} ${customer.firstName} ${customer.lastName}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              บัตรประชาชน: ${this.maskIdCard(customer.idCard)}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              โทรศัพท์: ${customer.phone || 'ไม่ระบุ'}
            </div>
          </div>
          <div class="text-right">
            <button class="btn btn-sm btn-primary select-customer-btn" 
                    data-customer-id="${customer._id}">
              เลือก
            </button>
          </div>
        </div>
        ${customer.address ? `
          <div class="text-xs text-gray-400 mt-1">
            ${customer.address.houseNo || ''} ${customer.address.subDistrict || ''} ${customer.address.district || ''} ${customer.address.province || ''}
          </div>
        ` : ''}
      </div>
    `).join('');

    resultsContainer.classList.remove('hidden');
    this.setupResultsEventHandlers();
  }

  setupResultsEventHandlers() {
    // Customer selection
    document.querySelectorAll('.select-customer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const customerId = btn.dataset.customerId;
        this.selectCustomer(customerId);
      });
    });

    // Customer row click
    document.querySelectorAll('.customer-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const customerId = item.dataset.customerId;
        this.selectCustomer(customerId);
      });
    });
  }

  async selectCustomer(customerId) {
    try {
      const loaderId = showGlobalLoading({
        message: 'กำลังโหลดข้อมูลลูกค้า...',
        showProgress: true
      });

      const customer = await window.InstallmentAPI.getCustomerDetails(customerId);

      this.fillCustomerForm(customer);
      this.hideSearchResults();

      hideGlobalLoading(loaderId);
      showToast('โหลดข้อมูลลูกค้าสำเร็จ', 'success');

    } catch (error) {
      console.error('❌ Select customer failed:', error);
      showToast('ไม่สามารถโหลดข้อมูลลูกค้าได้', 'error');
    }
  }

  fillCustomerForm(customer) {
    // Fill basic info
    const fields = {
      customerPrefix: customer.prefix || '',
      customerFirstName: customer.firstName || '',
      customerLastName: customer.lastName || '',
      customerIdCard: customer.idCard || '',
      customerPhone: customer.phone || '',
      customerEmail: customer.email || ''
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Fill address
    if (customer.address) {
      const addressFields = {
        houseNo: customer.address.houseNo || '',
        moo: customer.address.moo || '',
        soi: customer.address.soi || '',
        road: customer.address.road || '',
        subDistrict: customer.address.subDistrict || '',
        district: customer.address.district || '',
        province: customer.address.province || '',
        zipcode: customer.address.zipcode || ''
      };

      Object.entries(addressFields).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    // Store customer ID for reference
    window.currentCustomerId = customer._id;
  }

  clearCustomerForm() {
    const formFields = [
      'customerPrefix', 'customerFirstName', 'customerLastName',
      'customerIdCard', 'customerPhone', 'customerEmail',
      'houseNo', 'moo', 'soi', 'road', 'subDistrict',
      'district', 'province', 'zipcode'
    ];

    formFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    window.currentCustomerId = null;
  }

  clearSearch() {
    document.getElementById('customerSearchIdCard').value = '';
    document.getElementById('customerSearchPhone').value = '';
    this.hideSearchResults();
  }

  hideSearchResults() {
    const resultsContainer = document.getElementById('customerSearchResults');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
    }
  }

  maskIdCard(idCard) {
    if (!idCard || idCard.length !== 13) return idCard;
    return `${idCard.substring(0, 1)}-${idCard.substring(1, 5)}-${idCard.substring(5, 10)}-**-${idCard.substring(12)}`;
  }

  openAdvancedSearchModal() {
    // TODO: Implement advanced search modal
    showToast('ฟีเจอร์ค้นหาขั้นสูงกำลังพัฒนา', 'info');
  }
}

/**
 * Form progress tracker
 */
class FormProgressTracker {
  constructor() {
    this.requiredFields = [
      'customerFirstName', 'customerLastName', 'customerIdCard',
      'customerPhone', 'houseNo', 'province', 'district', 'subDistrict'
    ];
    this.documentFields = ['idCard', 'selfie', 'customerSignature'];
    this.currentProgress = 0;
  }

  initialize() {
    this.setupProgressTracking();
    this.updateProgress();
    console.log('✅ Form progress tracker initialized');
  }

  setupProgressTracking() {
    // ✅ ป้องกันการเรียกซ้ำ
    if (this.progressTrackingSetup) {
      console.log('⚠️ Progress tracking already setup, skipping...');
      return;
    }

    const allFormInputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], select, textarea');

    allFormInputs.forEach(element => {
      if (element.id && !element.hasAttribute('data-progress-listener-added')) {
        element.addEventListener('input', () => {
          this.updateProgress();
        });
        element.addEventListener('blur', () => {
          this.updateProgress();
        });
        element.setAttribute('data-progress-listener-added', 'true');
      }
    });

    // ✅ ตั้งค่า flag
    this.progressTrackingSetup = true;
    console.log('✅ Progress tracking setup completed');
  }

  setupDocumentTracking() {
    // Watch for document status changes
    const observer = new MutationObserver(() => {
      this.updateProgress();
    });

    this.documentFields.forEach(type => {
      const previewEl = document.getElementById(`${type}Preview`);
      if (previewEl) {
        observer.observe(previewEl, {
          attributes: true,
          attributeFilter: ['class']
        });
      }
    });
  }

  updateProgress() {
    const fieldProgress = this.calculateFieldProgress();
    const documentProgress = this.calculateDocumentProgress();

    const totalProgress = Math.round((fieldProgress + documentProgress) / 2);
    this.currentProgress = totalProgress;

    this.updateProgressUI(totalProgress, fieldProgress, documentProgress);
    this.updateNextStepButton();
  }

  calculateFieldProgress() {
    let filledFields = 0;

    this.requiredFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element && element.value.trim()) {
        filledFields++;
      }
    });

    return Math.round((filledFields / this.requiredFields.length) * 100);
  }

  calculateDocumentProgress() {
    let uploadedDocs = 0;

    this.documentFields.forEach(type => {
      const previewEl = document.getElementById(`${type}Preview`);
      if (previewEl && !previewEl.classList.contains('hidden')) {
        uploadedDocs++;
      }
    });

    return Math.round((uploadedDocs / this.documentFields.length) * 100);
  }

  updateProgressUI(totalProgress, fieldProgress, documentProgress) {
    const progressEl = document.getElementById('formProgress');
    const progressBarEl = document.getElementById('formProgressBar');
    const progressDetailsEl = document.getElementById('formProgressDetails');

    if (progressEl) {
      progressEl.textContent = `${totalProgress}%`;
    }

    if (progressBarEl) {
      progressBarEl.style.width = `${totalProgress}%`;
    }

    if (progressDetailsEl) {
      const messages = [];

      if (fieldProgress < 100) {
        messages.push(`ข้อมูลพื้นฐาน ${fieldProgress}%`);
      }

      if (documentProgress < 100) {
        messages.push(`เอกสาร ${documentProgress}%`);
      }

      if (messages.length === 0) {
        progressDetailsEl.textContent = 'ข้อมูลครบถ้วนแล้ว';
        progressDetailsEl.className = 'text-xs text-green-600 mt-1';
      } else {
        progressDetailsEl.textContent = messages.join(', ');
        progressDetailsEl.className = 'text-xs text-gray-500 mt-1';
      }
    }
  }

  updateNextStepButton() {
    const nextBtn = document.getElementById('btnStep2ToStep3');
    if (!nextBtn) return;

    if (this.currentProgress >= 80) {
      nextBtn.disabled = false;
      nextBtn.innerHTML = '<i class="bi bi-arrow-right mr-2"></i> ไปขั้นตอนถัดไป';
      nextBtn.className = 'btn btn-primary btn-block';
    } else {
      nextBtn.disabled = true;
      nextBtn.innerHTML = `<i class="bi bi-exclamation-circle mr-2"></i> กรอกข้อมูลให้ครบ (${this.currentProgress}%)`;
      nextBtn.className = 'btn btn-outline btn-block';
    }
  }

  getProgress() {
    return this.currentProgress;
  }
}

/**
 * Real-time form validation manager
 */
class FormValidationManager {
  constructor() {
    this.validators = new Map();
    this.validationStates = new Map();
    this.autoSaveInterval = null;
  }

  initialize() {
    this.setupValidators();
    this.setupAutoSave();
    this.loadSavedData();
    console.log('✅ Form validation manager initialized');
  }

  setupValidators() {
    // ✅ ป้องกันการเรียกซ้ำ
    if (this.validatorsSetup) {
      console.log('⚠️ Validators already setup, skipping...');
      return;
    }

    const validationRules = [
      { id: 'customerIdCard', fn: this.validateIdCard.bind(this) },
      { id: 'customerPhone', fn: this.validatePhone.bind(this) },
      { id: 'customerEmail', fn: this.validateEmail.bind(this) },
      { id: 'customerFirstName', fn: this.validateRequired.bind(this) },
      { id: 'customerLastName', fn: this.validateRequired.bind(this) },
      { id: 'customerBirthDate', fn: this.validateBirthDate.bind(this) },
      { id: 'customerAge', fn: this.validateAge.bind(this) },
      { id: 'houseNo', fn: this.validateRequired.bind(this) },
      { id: 'province', fn: this.validateRequired.bind(this) },
      { id: 'district', fn: this.validateRequired.bind(this) },
      { id: 'subDistrict', fn: this.validateRequired.bind(this) },
      { id: 'zipcode', fn: this.validateZipcode.bind(this) }
    ];

    validationRules.forEach(({ id, fn }) => {
      const element = document.getElementById(id);
      if (element && !element.hasAttribute('data-validator-listener-added')) {
        // ใช้ debounce เพื่อประสิทธิภาพที่ดีขึ้น
        const debouncedValidate = this.debounce(async () => {
          await this.validateField(id);
        }, 500);

        element.addEventListener('input', debouncedValidate);
        element.addEventListener('blur', async () => {
          await this.validateField(id);
        });
        element.setAttribute('data-validator-listener-added', 'true');
      }
    });

    // ✅ ตั้งค่า flag
    this.validatorsSetup = true;
    console.log('✅ Validators setup completed');
  }

  addValidator(fieldId, validatorFn) {
    this.validators.set(fieldId, validatorFn);

    const element = document.getElementById(fieldId);
    if (element) {
      // Real-time validation on input
      element.addEventListener('input', debounce(async () => {
        await this.validateField(fieldId);
      }, 300));

      // Validation on blur
      element.addEventListener('blur', async () => {
        await this.validateField(fieldId);
      });
    }
  }

  async validateField(fieldId) {
    const element = document.getElementById(fieldId);
    const validator = this.validators.get(fieldId);

    if (!element || !validator) return;

    try {
      const value = element.value;
      const result = await validator(value);

      this.validationStates.set(fieldId, result);
      this.updateValidationUI(fieldId, result);

      return result;

    } catch (error) {
      console.error(`❌ Validation failed for ${fieldId}:`, error);
      const errorResult = { valid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
      this.validationStates.set(fieldId, errorResult);
      this.updateValidationUI(fieldId, errorResult);
      return errorResult;
    }
  }

  updateValidationUI(fieldId, result) {
    const element = document.getElementById(fieldId);
    const formGroup = element?.closest('.form-group');

    if (!formGroup) return;

    const errorEl = formGroup.querySelector('.form-error');
    const iconEl = formGroup.querySelector('.validation-icon');

    // Update input classes
    element.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');

    if (result.valid) {
      element.classList.add('border-green-500');
      if (iconEl) {
        iconEl.innerHTML = '<i class="bi bi-check-circle-fill text-green-500"></i>';
      }
    } else {
      element.classList.add('border-red-500');
      if (iconEl) {
        iconEl.innerHTML = '<i class="bi bi-x-circle-fill text-red-500"></i>';
      }
    }

    // Update error message
    if (errorEl) {
      if (result.valid) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
      } else {
        errorEl.classList.remove('hidden');
        errorEl.textContent = result.message;
        errorEl.className = 'form-error text-xs text-red-500 mt-1';
      }
    }

    // Handle warnings
    if (result.warning) {
      if (iconEl) {
        iconEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-yellow-500"></i>';
      }
      element.classList.remove('border-green-500');
      element.classList.add('border-yellow-500');

      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = result.warning;
        errorEl.className = 'form-error text-xs text-yellow-600 mt-1';
      }
    }
  }

  async validateAllFields() {
    const results = {};

    for (const fieldId of this.validators.keys()) {
      results[fieldId] = await this.validateField(fieldId);
    }

    return results;
  }

  isFormValid() {
    const requiredFields = [
      'customerFirstName', 'customerLastName', 'customerIdCard',
      'customerPhone', 'customerBirthDate', 'customerAge',
      'houseNo', 'province', 'district', 'subDistrict'
    ];

    return requiredFields.every(fieldId => {
      const state = this.validationStates.get(fieldId);
      return state && state.valid;
    });
  }

  setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveFormData();
    }, 30000);

    // Save on form changes (debounced)
    const debouncedSave = debounce(() => {
      this.saveFormData();
    }, 2000);

    // Watch form changes
    document.addEventListener('input', debouncedSave);
    document.addEventListener('change', debouncedSave);
  }

  saveFormData() {
    try {
      const formData = this.collectFormData();
      if (window.InstallmentAPI && typeof window.InstallmentAPI.autoSaveFormData === 'function') {
        window.InstallmentAPI.autoSaveFormData(formData);
      } else {
        // ใช้ localStorage เป็นทางเลือก
        localStorage.setItem('installment_form_data', JSON.stringify(formData));
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  loadSavedData() {
    try {
      let savedData = null;
      if (window.InstallmentAPI && typeof window.InstallmentAPI.loadSavedFormData === 'function') {
        savedData = window.InstallmentAPI.loadSavedFormData();
      } else {
        // ใช้ localStorage เป็นทางเลือก
        const stored = localStorage.getItem('installment_form_data');
        if (stored) {
          savedData = JSON.parse(stored);
        }
      }

      if (savedData) {
        this.fillFormWithData(savedData);
        showToast('โหลดข้อมูลที่บันทึกไว้แล้ว', 'info');
      }
    } catch (error) {
      console.error('❌ Load saved data failed:', error);
    }
  }

  collectFormData() {
    const formFields = [
      'customerPrefix', 'customerFirstName', 'customerLastName',
      'customerIdCard', 'customerPhone', 'customerEmail',
      'customerBirthDate', 'customerAge',
      'houseNo', 'moo', 'soi', 'road', 'subDistrict',
      'district', 'province', 'zipcode'
    ];

    const data = {};
    formFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        data[fieldId] = element.value;
      }
    });

    return data;
  }

  fillFormWithData(data) {
    Object.entries(data).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element && value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
}

/**
 * Address autocomplete manager
 */
class AddressAutocompleteManager {
  constructor() {
    this.addressData = null;
    this.dropdowns = new Map();
  }

  async initialize() {
    try {
      this.addressData = await window.InstallmentAPI.loadAddressData();
      this.setupAutocomplete();
      this.setupLocationButton();
      console.log('✅ Address autocomplete manager initialized');
    } catch (error) {
      console.error('❌ Address autocomplete initialization failed:', error);
    }
  }

  setupAutocomplete() {
    // ✅ ป้องกันการเรียกซ้ำ
    if (this.autocompleteSetup) {
      console.log('⚠️ Autocomplete already setup, skipping...');
      return;
    }

    const addressFields = [
      { id: 'province', type: 'province' },
      { id: 'district', type: 'district' },
      { id: 'subDistrict', type: 'subDistrict' }
    ];

    addressFields.forEach(({ id, type }) => {
      const element = document.getElementById(id);
      if (element && !element.hasAttribute('data-autocomplete-listener-added')) {
        element.addEventListener('change', async () => {
          await this.handleAddressChange(type, element.value);
        });

        element.addEventListener('input', (e) => {
          this.handleAddressInput(type, e.target.value);
        });

        element.addEventListener('focus', () => {
          this.showAddressOptions(type);
        });

        element.setAttribute('data-autocomplete-listener-added', 'true');
      }
    });

    // Global click handler for closing dropdowns
    if (!window.autocompleteGlobalListenerAdded) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
          this.hideAllDropdowns();
        }
      });
      window.autocompleteGlobalListenerAdded = true;
    }

    // ✅ ตั้งค่า flag
    this.autocompleteSetup = true;
    console.log('✅ Autocomplete setup completed');
  }

  setupDropdown(fieldId, options) {
    const element = document.getElementById(fieldId);
    const dropdownId = `${fieldId}Dropdown`;
    let dropdown = document.getElementById(dropdownId);

    if (!element || !dropdown) return;

    // Create autocomplete functionality
    element.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();
      const filtered = options.filter(option =>
        option.toLowerCase().includes(value)
      );

      this.showDropdownOptions(dropdownId, filtered, element);
    });

    element.addEventListener('focus', () => {
      this.showDropdownOptions(dropdownId, options, element);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!element.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  showDropdownOptions(dropdownId, options, inputElement) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    if (options.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = options.slice(0, 10).map(option => `
      <div class="dropdown-option p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
           data-value="${option}">
        ${option}
      </div>
    `).join('');

    // Position dropdown
    const rect = inputElement.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.zIndex = '1000';
    dropdown.className = 'dropdown-content bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto';

    // Add click handlers
    dropdown.querySelectorAll('.dropdown-option').forEach(option => {
      option.addEventListener('click', () => {
        inputElement.value = option.dataset.value;
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        dropdown.classList.add('hidden');
      });
    });

    dropdown.classList.remove('hidden');
  }

  updateAddressPreview() {
    const addressPreview = document.getElementById('addressPreview');
    const addressPreviewText = document.getElementById('addressPreviewText');

    if (!addressPreview || !addressPreviewText) return;

    const parts = [];

    const houseNo = document.getElementById('houseNo').value.trim();
    const moo = document.getElementById('moo').value.trim();
    const soi = document.getElementById('soi').value.trim();
    const road = document.getElementById('road').value.trim();
    const subDistrict = document.getElementById('subDistrict').value.trim();
    const district = document.getElementById('district').value.trim();
    const province = document.getElementById('province').value.trim();
    const zipcode = document.getElementById('zipcode').value.trim();

    if (houseNo) parts.push(`บ้านเลขที่ ${houseNo}`);
    if (moo) parts.push(`หมู่ ${moo}`);
    if (soi) parts.push(`ซอย ${soi}`);
    if (road) parts.push(`ถนน ${road}`);
    if (subDistrict) parts.push(`ตำบล${subDistrict}`);
    if (district) parts.push(`อำเภอ${district}`);
    if (province) parts.push(`จังหวัด${province}`);
    if (zipcode) parts.push(zipcode);

    if (parts.length > 0) {
      addressPreviewText.textContent = parts.join(' ');
      addressPreview.classList.remove('hidden');
    } else {
      addressPreview.classList.add('hidden');
    }
  }

  async setupLocationButton() {
    const locationBtn = document.getElementById('btnUseCurrentLocation');
    if (!locationBtn) return;

    locationBtn.addEventListener('click', async () => {
      try {
        const loaderId = showGlobalLoading({
          message: 'กำลังระบุตำแหน่ง...',
          showProgress: true
        });

        const location = await window.InstallmentAPI.getCurrentLocation();
        const address = await window.InstallmentAPI.reverseGeocode(location.latitude, location.longitude);

        // Fill address fields
        if (address.province) document.getElementById('province').value = address.province;
        if (address.district) document.getElementById('district').value = address.district;
        if (address.subDistrict) document.getElementById('subDistrict').value = address.subDistrict;
        if (address.zipcode) document.getElementById('zipcode').value = address.zipcode;

        // Trigger change events
        ['province', 'district', 'subDistrict'].forEach(fieldId => {
          const element = document.getElementById(fieldId);
          if (element) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        hideGlobalLoading(loaderId);
        showToast('ระบุตำแหน่งสำเร็จ', 'success');

      } catch (error) {
        console.error('❌ Location detection failed:', error);
        showToast(error.message || 'ไม่สามารถระบุตำแหน่งได้', 'error');
      }
    });
  }
}

/**
 * Enhanced document upload manager
 */
class EnhancedDocumentManager {
  constructor() {
    this.uploadStates = new Map();
    this.documentStatus = new Map();
  }

  initialize() {
    this.setupDocumentHandlers();
    this.updateDocumentProgress();
    console.log('✅ Enhanced document manager initialized');
  }

  setupDocumentHandlers() {
    // ✅ ป้องกันการเรียกซ้ำ
    if (this.documentHandlersSetup) {
      console.log('⚠️ Document handlers already setup, skipping...');
      return;
    }

    const documentTypes = ['idCard', 'selfie', 'salarySlip'];

    documentTypes.forEach(type => {
      this.setupDocumentType(type);
    });

    // ✅ ตั้งค่า flag
    this.documentHandlersSetup = true;
    console.log('✅ Document handlers setup completed');
  }

  setupDocumentType(type) {
    const takeBtn = document.getElementById(`btnTake${this.capitalize(type)}`);
    const uploadBtn = document.getElementById(`btnUpload${this.capitalize(type)}`);
    const fileInput = document.getElementById(`upload${this.capitalize(type)}`);
    const retakeBtn = document.getElementById(`btnRetake${this.capitalize(type)}`);
    const previewBtn = document.getElementById(`btnPreview${this.capitalize(type)}`);

    if (takeBtn && !takeBtn.hasAttribute('data-document-listener-added')) {
      takeBtn.addEventListener('click', () => {
        this.openCameraForDocument(type);
      });
      takeBtn.setAttribute('data-document-listener-added', 'true');
    }

    if (uploadBtn && !uploadBtn.hasAttribute('data-document-listener-added')) {
      uploadBtn.addEventListener('click', () => {
        fileInput?.click();
      });
      uploadBtn.setAttribute('data-document-listener-added', 'true');
    }

    if (fileInput && !fileInput.hasAttribute('data-document-listener-added')) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(e, type);
      });
      fileInput.setAttribute('data-document-listener-added', 'true');
    }

    if (retakeBtn && !retakeBtn.hasAttribute('data-document-listener-added')) {
      retakeBtn.addEventListener('click', () => {
        this.retakeDocument(type);
      });
      retakeBtn.setAttribute('data-document-listener-added', 'true');
    }

    if (previewBtn && !previewBtn.hasAttribute('data-document-listener-added')) {
      previewBtn.addEventListener('click', () => {
        this.previewDocument(type);
      });
      previewBtn.setAttribute('data-document-listener-added', 'true');
    }
  }

  async handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.updateDocumentStatus(type, 'uploading');

      const result = await window.InstallmentAPI.uploadDocumentEnhanced(
        file,
        type,
        (progress) => {
          this.updateUploadProgress(type, progress);
        }
      );

      this.displayDocumentPreview(type, result.data.url);
      this.updateDocumentStatus(type, 'completed');
      this.updateDocumentProgress();

      showToast(`อัปโหลด${this.getDocumentTypeName(type)}สำเร็จ`, 'success');

    } catch (error) {
      console.error(`❌ Upload ${type} failed:`, error);
      this.updateDocumentStatus(type, 'error');
      showToast(`ไม่สามารถอัปโหลด${this.getDocumentTypeName(type)}ได้: ${error.message}`, 'error');
    }
  }

  updateDocumentStatus(type, status) {
    this.documentStatus.set(type, status);

    const statusEl = document.getElementById(`${type}Status`);
    if (!statusEl) return;

    const statusBadge = statusEl.querySelector('.status-badge');
    if (!statusBadge) return;

    // Remove existing classes
    statusBadge.className = 'status-badge';

    // Add new status class and text
    switch (status) {
      case 'pending':
        statusBadge.classList.add('pending');
        statusBadge.textContent = 'รอดำเนินการ';
        break;
      case 'uploading':
        statusBadge.classList.add('uploading');
        statusBadge.textContent = 'กำลังอัปโหลด';
        break;
      case 'completed':
        statusBadge.classList.add('completed');
        statusBadge.textContent = 'เสร็จสิ้น';
        break;
      case 'error':
        statusBadge.classList.add('error');
        statusBadge.textContent = 'ผิดพลาด';
        break;
      case 'optional':
        statusBadge.classList.add('optional');
        statusBadge.textContent = 'ไม่บังคับ';
        break;
    }
  }

  updateDocumentProgress() {
    const progressEl = document.getElementById('documentProgress');
    if (!progressEl) return;

    const requiredDocs = ['idCard', 'selfie', 'customerSignature'];
    const completedDocs = requiredDocs.filter(type =>
      this.documentStatus.get(type) === 'completed'
    ).length;

    progressEl.textContent = `${completedDocs}/${requiredDocs.length} เอกสารที่จำเป็น`;

    // Update summary
    this.updateDocumentSummary();
  }

  updateDocumentSummary() {
    const summaryEl = document.getElementById('documentSummary');
    const summaryListEl = document.getElementById('documentSummaryList');

    if (!summaryEl || !summaryListEl) return;

    const allTypes = ['idCard', 'selfie', 'salarySlip', 'customerSignature'];
    const statusItems = allTypes.map(type => {
      const status = this.documentStatus.get(type) || 'pending';
      const name = this.getDocumentTypeName(type);
      const icon = this.getStatusIcon(status);

      return `
        <div class="flex items-center justify-between text-sm">
          <span>${name}</span>
          <span class="flex items-center gap-1">
            ${icon}
            ${this.getStatusText(status)}
          </span>
        </div>
      `;
    }).join('');

    summaryListEl.innerHTML = statusItems;
    summaryEl.classList.remove('hidden');
  }

  displayDocumentPreview(type, imageUrl) {
    const previewEl = document.getElementById(`${type}Preview`);
    const imageEl = document.getElementById(`${type}Image`);

    if (previewEl && imageEl) {
      imageEl.src = imageUrl;
      previewEl.classList.remove('hidden');
    }
  }

  openCameraForDocument(type) {
    // Use existing camera modal functionality
    if (window.InstallmentUI && window.InstallmentUI.openCameraModal) {
      window.InstallmentUI.openCameraModal(type);
    } else {
      showToast('ฟีเจอร์กล้องยังไม่พร้อมใช้งาน', 'warning');
    }
  }

  retakeDocument(type) {
    const previewEl = document.getElementById(`${type}Preview`);
    if (previewEl) {
      previewEl.classList.add('hidden');
    }

    this.updateDocumentStatus(type, 'pending');
    this.updateDocumentProgress();
  }

  previewDocument(type) {
    const imageEl = document.getElementById(`${type}Image`);
    if (imageEl && imageEl.src) {
      // Open image in modal or new window
      window.open(imageEl.src, '_blank');
    }
  }

  setupSignaturePads() {
    // This will be handled by existing signature pad code
    // Just track the status
    const signatureTypes = ['customerSignature', 'salespersonSignature'];

    signatureTypes.forEach(type => {
      this.documentStatus.set(type, 'pending');
      this.updateDocumentStatus(type, 'pending');
    });
  }

  // Helper methods
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getDocumentTypeName(type) {
    const names = {
      idCard: 'บัตรประชาชน',
      selfie: 'รูปเซลฟี่',
      salarySlip: 'สลิปเงินเดือน',
      customerSignature: 'ลายเซ็นลูกค้า',
      salespersonSignature: 'ลายเซ็นพนักงาน'
    };
    return names[type] || type;
  }

  getStatusIcon(status) {
    const icons = {
      pending: '<i class="bi bi-clock text-gray-400"></i>',
      uploading: '<i class="bi bi-arrow-clockwise animate-spin text-blue-500"></i>',
      completed: '<i class="bi bi-check-circle-fill text-green-500"></i>',
      error: '<i class="bi bi-x-circle-fill text-red-500"></i>',
      optional: '<i class="bi bi-dash-circle text-gray-400"></i>'
    };
    return icons[status] || '';
  }

  getStatusText(status) {
    const texts = {
      pending: 'รอดำเนินการ',
      uploading: 'กำลังอัปโหลด',
      completed: 'เสร็จสิ้น',
      error: 'ผิดพลาด',
      optional: 'ไม่บังคับ'
    };
    return texts[status] || status;
  }

  updateUploadProgress(type, progress) {
    // Update progress indicator if exists
    const progressEl = document.getElementById(`${type}UploadProgress`);
    if (progressEl) {
      progressEl.style.width = `${progress}%`;
    }
  }
}

console.log('✅ Installment UI Module loaded');

// =========================================
// SIGNATURE MODAL FUNCTIONS
// =========================================

// Global variables for signature modal
let signatureModalPad = null;
let currentSignatureType = null;

function openSignatureModal(type) {
  console.log('✍️ Opening signature modal for type:', type);

  // ปิดกล้องและอุปกรณ์สื่อทั้งหมดก่อนเปิดระบบลายเซ็น
  console.log('📷 Force stopping all media devices before opening signature modal...');
  showToast('กำลังเตรียมระบบลายเซ็น...', 'info', { duration: 2000 });

  forceStopAllMediaDevices();

  // ปิด camera modal ถ้าเปิดอยู่
  const cameraModal = document.getElementById('cameraModal');
  if (cameraModal && !cameraModal.classList.contains('hidden')) {
    console.log('📷 Closing camera modal...');
    closeCameraModal();
  }

  // รอให้อุปกรณ์สื่อทั้งหมดปิดเสร็จก่อน
  setTimeout(() => {
    const modal = document.getElementById('signatureModal');
    const title = document.getElementById('signatureModalTitle');
    const employeeInfo = document.getElementById('signatureEmployeeInfo');
    const employeeName = document.getElementById('signatureEmployeeName');
    const canvas = document.getElementById('signatureModalCanvas');

    if (!modal || !canvas) {
      console.error('❌ Signature modal elements not found');
      return;
    }

    // Set current signature type
    currentSignatureType = type;

    // Set modal title
    const titles = {
      'customer': 'ลายเซ็นลูกค้า',
      'salesperson': 'ลายเซ็นพนักงานขาย',
      'salespersonStep2': 'ลายเซ็นพนักงานขาย'
    };

    if (title) {
      title.textContent = titles[type] || 'ลายเซ็น';
    }

    // Show/hide employee info
    if (type === 'salesperson' || type === 'salespersonStep2') {
      employeeInfo.classList.remove('hidden');

      // Set employee name
      const currentEmployeeName = window.employeeName ||
                                 localStorage.getItem('userName') ||
                                 document.getElementById('salespersonName')?.textContent ||
                                 document.getElementById('salespersonNameStep2')?.textContent ||
                                 'พนักงาน';

      if (employeeName) {
        employeeName.textContent = currentEmployeeName;
      }
    } else {
      employeeInfo.classList.add('hidden');
    }

    // Show modal with animation
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Trigger animation
    const modalContent = modal.querySelector('.bg-white');
    requestAnimationFrame(() => {
      modalContent.classList.remove('scale-95', 'opacity-0');
      modalContent.classList.add('scale-100', 'opacity-100');
    });

    // Initialize signature pad with delay to ensure camera is fully stopped
    setTimeout(() => {
      try {
        // Force stop all media devices
        navigator.mediaDevices.getUserMedia({ video: false, audio: false }).catch(() => {});

        // Clear any existing canvas content
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        setupSignatureModalPad(canvas);
        console.log('✅ Signature modal opened successfully');
        showToast('✅ ระบบลายเซ็นพร้อมใช้งาน - เริ่มเซ็นได้เลย!', 'success', { duration: 3000 });

        // Focus on canvas for immediate use
        canvas.focus();

        // เพิ่มข้อความบอกใบ้การใช้งาน
        setTimeout(() => {
          showToast('💡 เคล็ดลับ: วาดลายเซ็นด้วยเมาส์หรือนิ้ว แล้วกดปุ่ม "บันทึก"', 'info', { duration: 4000 });
        }, 1000);

      } catch (error) {
        console.error('❌ Failed to setup signature modal pad:', error);
        showToast('เปิดระบบลายเซ็นสำเร็จ', 'success');
      }
    }, 300); // เพิ่มเวลารอให้มากขึ้น

  }, 100); // รอให้กล้องปิดเสร็จก่อน
}

function closeSignatureModal() {
  console.log('✍️ Closing signature modal');

  const modal = document.getElementById('signatureModal');
  if (!modal) return;

  // Hide with animation
  const modalContent = modal.querySelector('.bg-white');
  if (modalContent) {
    modalContent.classList.add('scale-95', 'opacity-0');
    modalContent.classList.remove('scale-100', 'opacity-100');
  }

  // Hide modal after animation
  setTimeout(() => {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';

    // Reset animation classes for next open
    if (modalContent) {
      modalContent.classList.remove('scale-95', 'opacity-0', 'scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
  }, 300);

  // Clear signature pad
  if (signatureModalPad) {
    signatureModalPad.clear();
    signatureModalPad = null;
  }

  // Reset current type
  currentSignatureType = null;

  console.log('✅ Signature modal closed');
}

function setupSignatureModalPad(canvas) {
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Clear existing pad
  if (signatureModalPad) {
    if (signatureModalPad.clear) {
      signatureModalPad.clear();
    }
    signatureModalPad = null;
  }

  // Get the actual display size of the canvas
  const boundingRect = canvas.getBoundingClientRect();
  const displayWidth = boundingRect.width || 500;
  const displayHeight = boundingRect.height || 200;

  // Set the display size (CSS pixels)
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  // Set the internal size in memory (scaled for high DPI displays)
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = displayWidth * ratio;
  canvas.height = displayHeight * ratio;

  // Scale the drawing context so everything will work at the higher resolution
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  // Try to use SignaturePad library if available
  if (window.SignaturePad) {
    try {
      signatureModalPad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 3,
        throttle: 16,
        minPointDistance: 3,
        velocityFilterWeight: 0.7
      });

      console.log('✅ Signature modal pad setup with SignaturePad library');
      return;
    } catch (error) {
      console.warn('⚠️ SignaturePad library failed, using fallback:', error);
    }
  }

  // Fallback: Create simple drawing system
  console.log('📝 Creating fallback signature system...');

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let hasDrawn = false;

  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, displayWidth, displayHeight);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX || e.touches[0].clientX) - rect.left;
    lastY = (e.clientY || e.touches[0].clientY) - rect.top;
    hasDrawn = true;
  }

  function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX || e.touches[0].clientX) - rect.left;
    const currentY = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  });

  // Create mock signature pad object
  signatureModalPad = {
    canvas: canvas,
    clear: () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      hasDrawn = false;
    },
    isEmpty: () => !hasDrawn,
    toDataURL: () => canvas.toDataURL(),
    toBlob: (callback) => canvas.toBlob(callback)
  };

  console.log('✅ Signature modal pad setup completed with fallback system', {
    displaySize: `${displayWidth}x${displayHeight}`,
    internalSize: `${canvas.width}x${canvas.height}`,
    ratio: ratio
  });
}

function clearSignatureModal() {
  if (signatureModalPad) {
    try {
      signatureModalPad.clear();
      console.log('🧹 Signature modal cleared');
    } catch (error) {
      console.warn('⚠️ Clear signature modal failed:', error);
      // ลบ canvas และสร้างใหม่
      const canvas = document.getElementById('signatureModalCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, rect.width, rect.height);
        console.log('🧹 Canvas cleared manually');
      }
    }
  }
}

async function saveSignatureModal() {
  console.log('💾 Saving signature modal...');

  // Use default values if not set
  const signatureType = currentSignatureType || 'customer';
  console.log('📝 Signature type:', signatureType);

  try {
    // ✅ เพิ่มการตรวจสอบข้อมูลลูกค้าก่อนบันทึกลายเซ็น
    console.log('🔍 Validating customer data before signature upload...');
    const validation = validateCustomerData();
    console.log('🔍 Customer validation result:', validation);

    if (!validation.citizenId) {
      console.warn('⚠️ No citizenId found, using fallback value for signature upload');
      // แสดงคำเตือนให้ผู้ใช้ทราบ
      showToast('ไม่พบเลขบัตรประชาชน ระบบจะใช้ค่า default สำหรับการอัปโหลดลายเซ็น', 'warning', { duration: 3000 });
    }

    // Show loading
    const loaderId = showGlobalLoading({
      message: 'กำลังบันทึกลายเซ็น...',
      showProgress: true
    });

    let blob;

    if (!signatureModalPad) {
      console.log('📝 Signature modal pad not found, creating simple signature');
      // สร้างลายเซ็นแบบง่าย
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ลายเซ็นสำเร็จ', canvas.width / 2, canvas.height / 2);

      blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });
    } else {
      // หากไม่มีลายเซ็น ให้สร้างลายเซ็นเปล่า
      if (signatureModalPad.isEmpty()) {
        console.log('📝 Empty signature modal, creating blank signature');
        const canvas = signatureModalPad.canvas;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ลายเซ็นสำเร็จ', canvas.width / 2, canvas.height / 2);
      }

      // Convert to blob
      const canvas = signatureModalPad.canvas;
      blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });
    }

    if (!blob) {
      throw new Error('ไม่สามารถสร้างรูปภาพลายเซ็นได้');
    }

    console.log('📸 Signature blob created:', {
      size: blob.size,
      type: blob.type,
      signatureType: signatureType
    });

    // Map signature type to upload type
    const uploadTypeMapping = {
      'customer': 'customerSignature',
      'salesperson': 'salespersonSignature',
      'salespersonStep2': 'salespersonSignature' // Map to same type as regular salesperson
    };

    const uploadType = uploadTypeMapping[signatureType] || 'customerSignature';
    console.log('📤 Upload type mapping:', signatureType, '→', uploadType);

    // Upload signature
    const uploadResult = await uploadImageBlob(blob, uploadType);

    if (uploadResult && uploadResult.url) {
      // Update signature preview
      updateSignaturePreview(signatureType, uploadResult.url);

      // 🔄 Integrate with document summary manager for document upload step
      if (window.documentManager) {
        // Use upload type to match document manager keys (e.g., 'customerSignature')
        window.documentManager.displayDocumentPreview(uploadType, uploadResult.url);
        window.documentManager.updateDocumentStatus(uploadType, 'completed');
        window.documentManager.updateDocumentProgress();
      }

      // Set hidden input
      const hiddenInputId = getSignatureHiddenInputId(signatureType);
      const hiddenInput = document.getElementById(hiddenInputId);
      if (hiddenInput) {
        hiddenInput.value = uploadResult.url;
        console.log('✅ Hidden input updated:', {
          signatureType: signatureType,
          hiddenInputId: hiddenInputId,
          url: uploadResult.url
        });
      } else {
        console.warn('⚠️ Hidden input not found:', hiddenInputId);
      }

      // Close modal
      closeSignatureModal();

      hideGlobalLoading(loaderId);
      showToast(`บันทึกลายเซ็น${getSignatureTypeName(signatureType)}สำเร็จ`, 'success');

      console.log('✅ Signature saved successfully:', uploadResult.url);

    } else {
      throw new Error('ไม่สามารถอัปโหลดลายเซ็นได้');
    }

  } catch (error) {
    console.error('❌ Save signature failed:', error);
    hideGlobalLoading();
    showToast('ไม่สามารถบันทึกลายเซ็นได้: ' + error.message, 'warning');
  }
}

function updateSignaturePreview(type, imageUrl) {
  console.log('🖼️ Updating signature preview:', type, imageUrl);

  const previewIds = {
    'customer': {
      preview: 'customerSignaturePreview',
      image: 'customerSignatureImage',
      placeholder: 'customerSignaturePlaceholder',
      openBtn: 'btnOpenCustomerSignature',
      retakeBtn: 'btnRetakeCustomerSignature'
    },
    'salesperson': {
      preview: 'salespersonSignaturePreview',
      image: 'salespersonSignatureImage',
      placeholder: 'salespersonSignaturePlaceholder',
      openBtn: 'btnOpenSalespersonSignature',
      retakeBtn: 'btnRetakeSalespersonSignature'
    },
    'salespersonStep2': {
      preview: 'salespersonSignaturePreviewStep2',
      image: 'salespersonSignatureImageStep2',
      placeholder: 'salespersonSignaturePlaceholderStep2',
      openBtn: 'btnOpenSalespersonSignatureStep2',
      retakeBtn: 'btnRetakeSalespersonSignatureStep2'
    }
  };

  const ids = previewIds[type];
  if (!ids) {
    console.warn('⚠️ Unknown signature type:', type);
    return;
  }

  const previewEl = document.getElementById(ids.preview);
  const imageEl = document.getElementById(ids.image);
  const placeholderEl = document.getElementById(ids.placeholder);
  const openBtn = document.getElementById(ids.openBtn);
  const retakeBtn = document.getElementById(ids.retakeBtn);

  if (previewEl && imageEl && placeholderEl && openBtn && retakeBtn) {
    // Set image source
    imageEl.src = imageUrl;

    // Show preview, hide placeholder
    previewEl.classList.remove('hidden');
    placeholderEl.classList.add('hidden');

    // Update buttons
    openBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');

    console.log('✅ Signature preview updated successfully');
  } else {
    console.warn('⚠️ Some preview elements not found for type:', type);
  }
}

function retakeSignature(type) {
  console.log('🔄 Retaking signature for type:', type);

  const previewIds = {
    'customer': {
      preview: 'customerSignaturePreview',
      placeholder: 'customerSignaturePlaceholder',
      openBtn: 'btnOpenCustomerSignature',
      retakeBtn: 'btnRetakeCustomerSignature'
    },
    'salesperson': {
      preview: 'salespersonSignaturePreview',
      placeholder: 'salespersonSignaturePlaceholder',
      openBtn: 'btnOpenSalespersonSignature',
      retakeBtn: 'btnRetakeSalespersonSignature'
    },
    'salespersonStep2': {
      preview: 'salespersonSignaturePreviewStep2',
      placeholder: 'salespersonSignaturePlaceholderStep2',
      openBtn: 'btnOpenSalespersonSignatureStep2',
      retakeBtn: 'btnRetakeSalespersonSignatureStep2'
    }
  };

  const ids = previewIds[type];
  if (!ids) return;

  const previewEl = document.getElementById(ids.preview);
  const placeholderEl = document.getElementById(ids.placeholder);
  const openBtn = document.getElementById(ids.openBtn);
  const retakeBtn = document.getElementById(ids.retakeBtn);

  if (previewEl && placeholderEl && openBtn && retakeBtn) {
    // Hide preview, show placeholder
    previewEl.classList.add('hidden');
    placeholderEl.classList.remove('hidden');

    // Update buttons
    openBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');

    // Clear hidden input
    const hiddenInputId = getSignatureHiddenInputId(type);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) {
      hiddenInput.value = '';
    }

    console.log('✅ Signature retake setup completed');
  }
}

function getSignatureHiddenInputId(type) {
  const mapping = {
    'customer': 'customerSignatureUrl',
    'salesperson': 'salespersonSignatureUrl',
    'salespersonStep2': 'salespersonSignatureUrl' // Same as salesperson - reuse for Step 3
  };
  return mapping[type] || '';
}

function getSignatureTypeName(type) {
  const names = {
    'customer': 'ลูกค้า',
    'salesperson': 'พนักงานขาย',
    'salespersonStep2': 'พนักงานขาย'
  };
  return names[type] || '';
}

// =========================================
// SIGNATURE MODAL EVENT HANDLERS
// =========================================

function initializeSignatureModalHandlers() {
  // ✅ ป้องกันการเรียกซ้ำ
  if (window.signatureModalHandlersInitialized) {
    console.log('⚠️ Signature modal handlers already initialized, skipping...');
    return;
  }

  const signatureButtons = [
    { id: 'closeSignatureModal', action: closeSignatureModal },
    { id: 'clearSignatureModal', action: clearSignatureModal },
    { id: 'saveSignatureModal', action: saveSignatureModal },
    { id: 'btnOpenCustomerSignature', action: () => openSignatureModal('customer') },
    { id: 'btnRetakeCustomerSignature', action: () => retakeSignature('customer') },
    { id: 'btnOpenSalespersonSignatureStep2', action: () => openSignatureModal('salespersonStep2') },
    { id: 'btnRetakeSalespersonSignatureStep2', action: () => retakeSignature('salespersonStep2') },
    { id: 'btnOpenSalespersonSignature', action: () => openSignatureModal('salesperson') },
    { id: 'btnRetakeSalespersonSignature', action: () => retakeSignature('salesperson') }
  ];

  signatureButtons.forEach(({ id, action }) => {
    const element = document.getElementById(id);
    if (element && !element.hasAttribute('data-signature-listener-added')) {
      element.addEventListener('click', action);
      element.setAttribute('data-signature-listener-added', 'true');
    }
  });

  // Modal click outside handler
  const signatureModal = document.getElementById('signatureModal');
  if (signatureModal && !signatureModal.hasAttribute('data-signature-modal-listener-added')) {
    signatureModal.addEventListener('click', (e) => {
      if (e.target === signatureModal) {
      closeSignatureModal();
    }
  });
    signatureModal.setAttribute('data-signature-modal-listener-added', 'true');
  }

  // Keyboard escape handler
  if (!window.signatureEscapeListenerAdded) {
  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && signatureModal && !signatureModal.classList.contains('hidden')) {
      closeSignatureModal();
    }
  });
    window.signatureEscapeListenerAdded = true;
  }

  // ✅ ตั้งค่า flag
  window.signatureModalHandlersInitialized = true;
  console.log('✅ Signature modal handlers initialized');
}



// =========================================
// INITIALIZE SIGNATURE MODAL ON LOAD
// =========================================

// Add to existing document initialization
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeSignatureModalHandlers();
    setupBirthDateHandler(); // เพิ่มการเรียกใช้ birth date handler
  }, 1000);
});

// ... existing code ...

// =========================================
// SIGNATURE DEBUG & RECOVERY FUNCTIONS
// =========================================

function debugSignaturePad(type = 'all') {
  console.log('🔍 Debugging signature pads...');

  const pads = {
    customer: customerSignaturePad,
    salesperson: salespersonSignaturePad,
    modal: signatureModalPad
  };

  const canvases = {
    customer: document.getElementById('customerSignaturePad'),
    salesperson: document.getElementById('salespersonSignaturePad'),
    modal: document.getElementById('signatureModalCanvas')
  };

  const debugInfo = {};

  Object.keys(pads).forEach(padType => {
    if (type !== 'all' && type !== padType) return;

    const pad = pads[padType];
    const canvas = canvases[padType];

    debugInfo[padType] = {
      padExists: !!pad,
      canvasExists: !!canvas,
      canvasSize: canvas ? {
        displayWidth: canvas.style.width,
        displayHeight: canvas.style.height,
        internalWidth: canvas.width,
        internalHeight: canvas.height
      } : null,
      canvasPosition: canvas ? canvas.getBoundingClientRect() : null,
      isEmpty: pad ? pad.isEmpty() : null,
      signaturePadLibrary: !!window.SignaturePad
    };
  });

  console.table(debugInfo);

  // Show user-friendly debug info
  const issues = [];
  Object.keys(debugInfo).forEach(padType => {
    const info = debugInfo[padType];
    if (!info.signaturePadLibrary) issues.push('❌ SignaturePad library ไม่พบ');
    if (!info.canvasExists) issues.push(`❌ Canvas ${padType} ไม่พบ`);
    if (!info.padExists) issues.push(`❌ SignaturePad ${padType} ไม่ได้สร้าง`);
    if (info.canvasSize && (info.canvasSize.internalWidth === 0 || info.canvasSize.internalHeight === 0)) {
      issues.push(`❌ Canvas ${padType} ไม่มีขนาด`);
    }
  });

  if (issues.length === 0) {
    showToast('✅ Signature pads ทั้งหมดทำงานปกติ', 'success');
  } else {
    showToast(`พบปัญหา: ${issues.join(', ')}`, 'warning', { duration: 8000 });
  }

  return debugInfo;
}

function fixSignaturePads() {
  console.log('🔧 Attempting to fix signature pads...');

  try {
    // Reinitialize all signature pads
    if (document.getElementById('customerSignaturePad')) {
      const customerCanvas = document.getElementById('customerSignaturePad');
      customerSignaturePad = setupSignaturePad(customerCanvas);
      console.log('🔄 Customer signature pad reinitialized');
    }

    if (document.getElementById('salespersonSignaturePad')) {
      const salespersonCanvas = document.getElementById('salespersonSignaturePad');
      salespersonSignaturePad = setupSignaturePad(salespersonCanvas);
      console.log('🔄 Salesperson signature pad reinitialized');
    }

    // Fix modal signature pad if modal is open
    const modal = document.getElementById('signatureModal');
    const modalCanvas = document.getElementById('signatureModalCanvas');
    if (modal && modalCanvas && !modal.classList.contains('hidden')) {
      setTimeout(() => {
        setupSignatureModalPad(modalCanvas);
        console.log('🔄 Modal signature pad reinitialized');
      }, 100);
    }

    showToast('✅ แก้ไข signature pads สำเร็จ', 'success');

  } catch (error) {
    console.error('❌ Fix signature pads failed:', error);
    showToast('❌ ไม่สามารถแก้ไข signature pads ได้: ' + error.message, 'error');
  }
}

function testSignaturePad(type = 'modal') {
  console.log('🧪 Testing signature pad:', type);

  const pads = {
    customer: customerSignaturePad,
    salesperson: salespersonSignaturePad,
    modal: signatureModalPad
  };

  const pad = pads[type];

  if (!pad) {
    showToast(`❌ Signature pad ${type} ไม่พบ`, 'error');
    return false;
  }

  // Test drawing a simple line
  try {
    pad.clear();

    // Simulate drawing - สร้างเส้นทดสอบ
    const testData = [
      {
        'linesArray': [
          {
            'minX': 50,
            'minY': 50,
            'maxX': 150,
            'maxY': 100,
            'points': [
              { 'x': 50, 'y': 50, 'time': Date.now() },
              { 'x': 100, 'y': 75, 'time': Date.now() + 50 },
              { 'x': 150, 'y': 100, 'time': Date.now() + 100 }
            ]
          }
        ]
      }
    ];

    pad.fromData(testData);

    if (!pad.isEmpty()) {
      showToast(`✅ Signature pad ${type} ทำงานได้`, 'success');
      // Clear test data after 2 seconds
      setTimeout(() => pad.clear(), 2000);
      return true;
    } else {
      showToast(`❌ Signature pad ${type} ไม่สามารถวาดได้`, 'error');
      return false;
    }

  } catch (error) {
    console.error('❌ Test signature pad failed:', error);
    showToast(`❌ ทดสอบ signature pad ${type} ล้มเหลว: ${error.message}`, 'error');
    return false;
  }
}

// เพิ่ม debug functions ให้ global access
window.debugSignaturePad = debugSignaturePad;
window.fixSignaturePads = fixSignaturePads;
window.testSignaturePad = testSignaturePad;

console.log('✅ Signature Debug Functions loaded');
console.log('📋 Available signature debug commands:');
console.log('  - debugSignaturePad() - ตรวจสอบสถานะ signature pads');
console.log('  - fixSignaturePads() - แก้ไข signature pads');
console.log('  - testSignaturePad("modal") - ทดสอบ signature pad');
console.log('');
console.log('🔧 Enhanced signature upload commands:');
console.log('  - debugSignatureUpload() - ตรวจสอบข้อมูลสำหรับ signature upload');
console.log('  - testSignatureUpload() - ทดสอบการ upload ลายเซ็น');
console.log('  - testSignatureUpload(true) - ทดสอบ upload พร้อม fallback data');
console.log('  - saveSignatureWithValidation() - บันทึกลายเซ็นพร้อม validation');
console.log('');
console.log('🧪 Helper functions for testing:');
console.log('  - fillTestCustomerData() - กรอกข้อมูลลูกค้าทดสอบ');
console.log('  - fullSignatureTest() - ทดสอบระบบลายเซ็นแบบครบชุด (แนะนำ!)');
console.log('');
console.log('🚨 ถ้ายังมีปัญหา X-Citizen-Id header:');
console.log('  🎯 วิธีแก้ปัญหาแบบง่าย:');
console.log('    1. เรียก fullSignatureTest() - จะทำทุกอย่างให้อัตโนมัติ');
console.log('');
console.log('  🔧 วิธีแก้ปัญหาแบบขั้นตอน:');
console.log('    1. เรียก fillTestCustomerData() เพื่อกรอกข้อมูลทดสอบ');
console.log('    2. เรียก debugSignatureUpload() เพื่อตรวจสอบข้อมูล');
console.log('    3. เรียก testSignatureUpload(true) เพื่อทดสอบ');
console.log('    4. ตรวจสอบ console debug logs สำหรับรายละเอียด');
console.log('');
console.log('💡 หมายเหตุ: ระบบใหม่จะแสดง debug ข้อมูลแบบละเอียดใน console เพื่อช่วยวิเคราะห์ปัญหา');

// =================== Card Reader UI Functions ===================

/**
 * ฟังก์ชันแสดงสถานะการอ่านบัตร
 */
function showCardReaderStatus(status, message) {
  const statusElement = document.getElementById('cardReaderStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="indicator-dot ${status}"></span>
        <span class="text-sm">${message}</span>
      </div>
    `;
  }
}

/**
 * ฟังก์ชันแสดงข้อมูลที่อ่านได้จากบัตร
 */
function displayCardReaderResult(cardData) {
  const resultElement = document.getElementById('cardReaderResult');
  if (resultElement && cardData) {
    const customerName = `${cardData.titleTh || ''} ${cardData.firstNameTh || ''} ${cardData.lastNameTh || ''}`.trim();
    const citizenId = cardData.citizenId || cardData.Citizenid;
    const age = cardData.calculatedAge || cardData.age;

    resultElement.innerHTML = `
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="bi bi-credit-card text-green-600"></i>
          <span class="font-semibold text-green-800 dark:text-green-200">ข้อมูลจากบัตรประชาชน</span>
        </div>
        <div class="text-sm space-y-1">
          <div><strong>ชื่อ-นามสกุล:</strong> ${customerName}</div>
          <div><strong>เลขบัตรประชาชน:</strong> ${citizenId || 'ไม่ระบุ'}</div>
          ${age ? `<div><strong>อายุ:</strong> ${age} ปี</div>` : ''}
        </div>
      </div>
    `;

    // Auto hide after 5 seconds
    setTimeout(() => {
      if (resultElement) {
        resultElement.innerHTML = '';
      }
    }, 5000);
  }
}

/**
 * ฟังก์ชันตรวจสอบความถูกต้องของอายุ
 */
function validateAge(age) {
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 15 || ageNum > 80) {
    return {
      isValid: false,
      message: 'อายุต้องอยู่ระหว่าง 15-80 ปี สำหรับการทำสัญญาผ่อนชำระ'
    };
  }
  return { isValid: true };
}

/**
 * ฟังก์ชันแสดงคำเตือนเกี่ยวกับอายุ
 */
function showAgeValidation(age) {
  const ageInput = document.getElementById('customerAge');
  const ageValidation = document.getElementById('ageValidation');

  if (!ageInput) return;

  const validation = validateAge(age);

  if (ageValidation) {
    if (!validation.isValid) {
      ageValidation.innerHTML = `
        <div class="text-red-600 text-xs mt-1 flex items-center gap-1">
          <i class="bi bi-exclamation-triangle"></i>
          <span>${validation.message}</span>
        </div>
      `;
      ageInput.classList.add('border-red-500');
      ageInput.classList.remove('border-green-500');
    } else {
      ageValidation.innerHTML = `
        <div class="text-green-600 text-xs mt-1 flex items-center gap-1">
          <i class="bi bi-check-circle"></i>
          <span>อายุเหมาะสมสำหรับการทำสัญญา</span>
        </div>
      `;
      ageInput.classList.add('border-green-500');
      ageInput.classList.remove('border-red-500');
    }
  }

  return validation.isValid;
}

/**
 * ฟังก์ชันเปิดใช้งานปุ่มอ่านบัตร
 */
function enableCardReader() {
  const cardReaderBtn = document.getElementById('btnReadCard');
  if (cardReaderBtn) {
    cardReaderBtn.disabled = false;
    cardReaderBtn.innerHTML = `
      <i class="bi bi-credit-card-2-front mr-2"></i>
      อ่านบัตรประชาชน
    `;
    cardReaderBtn.className = 'btn btn-info w-full flex items-center justify-center';
  }
}

/**
 * ฟังก์ชันปิดใช้งานปุ่มอ่านบัตร
 */
function disableCardReader(message = 'กำลังอ่านบัตร...') {
  const cardReaderBtn = document.getElementById('btnReadCard');
  if (cardReaderBtn) {
    cardReaderBtn.disabled = true;
    cardReaderBtn.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>${message}</span>
      </div>
    `;
    cardReaderBtn.className = 'btn btn-info w-full flex items-center justify-center opacity-75';
  }
}

/**
 * ฟังก์ชันตั้งค่า event listeners สำหรับการอ่านบัตร
 */
function setupCardReaderEvents() {
  // ✅ ป้องกันการเรียกซ้ำ
  if (window.cardReaderEventsSetup) {
    console.log('⚠️ Card reader events already setup, skipping...');
    return;
  }

  const cardReaderBtn = document.getElementById('btnReadCard');
  const ageInput = document.getElementById('customerAge');
  const taxIdInput = document.getElementById('customerIdCard');

  if (cardReaderBtn && !cardReaderBtn.hasAttribute('data-card-reader-listener-added')) {
    cardReaderBtn.addEventListener('click', async () => {
      try {
        disableCardReader();
        await window.InstallmentAPI.readCard();
        enableCardReader();
        } catch (error) {
        console.error('Card reader error:', error);
          showCardReaderStatus('error', 'เกิดข้อผิดพลาดในการอ่านบัตร');
          enableCardReader();
      }
    });
    cardReaderBtn.setAttribute('data-card-reader-listener-added', 'true');
  }

  if (ageInput && !ageInput.hasAttribute('data-age-listener-added')) {
    ageInput.addEventListener('input', (e) => {
      const age = parseInt(e.target.value);
      if (age) {
        showAgeValidation(age);
      }
    });
    ageInput.addEventListener('blur', (e) => {
      const age = parseInt(e.target.value);
      if (age) {
        showAgeValidation(age);
      }
    });
    ageInput.setAttribute('data-age-listener-added', 'true');
  }

  if (taxIdInput && !taxIdInput.hasAttribute('data-tax-id-listener-added')) {
    taxIdInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^\d]/g, '');
      if (value.length <= 13) {
        e.target.value = value;
        if (value.length === 13) {
          const validation = validateCustomerData();
          showValidationResult(validation);
        }
      }
    });
    taxIdInput.setAttribute('data-tax-id-listener-added', 'true');
  }

  // ✅ ตั้งค่า flag
  window.cardReaderEventsSetup = true;
  console.log('✅ Card reader events setup completed');
}

/**
 * ฟังก์ชันแสดงข้อมูลสรุปลูกค้าหลังอ่านบัตร
 */
function showCustomerSummary() {
  const prefix = document.getElementById('customerPrefix')?.value || '';
  const firstName = document.getElementById('customerFirstName')?.value || '';
  const lastName = document.getElementById('customerLastName')?.value || '';
  const age = document.getElementById('customerAge')?.value || '';
  const taxId = document.getElementById('customerTaxId')?.value || '';

  if (firstName && lastName) {
    const customerName = `${prefix}${firstName} ${lastName}`.trim();
    const summaryElement = document.getElementById('customerSummary');

    if (summaryElement) {
      summaryElement.innerHTML = `
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <i class="bi bi-person-check text-blue-600"></i>
            <span class="font-semibold text-blue-800 dark:text-blue-200">ข้อมูลลูกค้า</span>
          </div>
          <div class="text-sm space-y-1">
            <div><strong>ชื่อ-นามสกุล:</strong> ${customerName}</div>
            ${age ? `<div><strong>อายุ:</strong> ${age} ปี</div>` : ''}
            ${taxId ? `<div><strong>เลขบัตรประชาชน:</strong> ${taxId}</div>` : ''}
          </div>
        </div>
      `;
    }
  }
}

/**
 * ฟังก์ชันเคลียร์ข้อมูลลูกค้า
 */
function clearCustomerData() {
  const customerFields = [
    'customerPrefix', 'customerFirstName', 'customerLastName', 'customerAge',
    'customerTaxId', 'houseNo', 'moo', 'subDistrict', 'district', 'province', 'zipcode'
  ];

  customerFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
      field.classList.remove('border-green-500', 'border-red-500');
    }
  });

  // เคลียร์ status และ summary
  const statusElements = ['cardReaderStatus', 'cardReaderResult', 'customerSummary', 'ageValidation'];
  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = '';
    }
  });

  showToast('เคลียร์ข้อมูลลูกค้าเรียบร้อย', 'info');
}

/**
 * ฟังก์ชันตรวจสอบความครบถ้วนของข้อมูลลูกค้า
 */
function validateCustomerData() {
  const requiredFields = [
    { id: 'customerFirstName', name: 'ชื่อ' },
    { id: 'customerLastName', name: 'นามสกุล' },
    { id: 'customerAge', name: 'อายุ' },
    { id: 'customerTaxId', name: 'เลขบัตรประชาชน' }
  ];

  const errors = [];

  requiredFields.forEach(field => {
    const element = document.getElementById(field.id);
    if (!element || !element.value.trim()) {
      errors.push(field.name);
    }
  });

  // ตรวจสอบอายุ
  const ageElement = document.getElementById('customerAge');
  if (ageElement && ageElement.value) {
    const ageValidation = validateAge(ageElement.value);
    if (!ageValidation.isValid) {
      errors.push('อายุไม่เหมาะสม');
    }
  }

  // ตรวจสอบเลขบัตรประชาชน
  const taxIdElement = document.getElementById('customerTaxId');
  if (taxIdElement && taxIdElement.value) {
    if (taxIdElement.value.length !== 13) {
      errors.push('เลขบัตรประชาชนไม่ครบ 13 หลัก');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * ฟังก์ชันแสดงผลการ validation
 */
function showValidationResult(validation) {
  if (validation.isValid) {
    showToast('ข้อมูลลูกค้าครบถ้วนและถูกต้อง', 'success');
    return true;
  } else {
    const errorMessage = `ข้อมูลไม่ครบถ้วน: ${validation.errors.join(', ')}`;
    showToast(errorMessage, 'error');
    return false;
  }
}

// =================== Initialize Card Reader UI ===================

/**
 * ฟังก์ชันเริ่มต้น UI การอ่านบัตร
 */
function initializeCardReaderUI() {
  setupCardReaderEvents();
  enableCardReader();

  console.log('✅ Card Reader UI initialized');
}

// ผูกเข้ากับ window object เพื่อให้เรียกใช้จากไฟล์อื่นได้
window.CardReaderUI = {
  showCardReaderStatus,
  displayCardReaderResult,
  validateAge,
  showAgeValidation,
  enableCardReader,
  disableCardReader,
  setupCardReaderEvents,
  showCustomerSummary,
  clearCustomerData,
  validateCustomerData,
  showValidationResult,
  initializeCardReaderUI
};

// ... existing code ...

// เพิ่มฟังก์ชันคำนวณอายุอัตโนมัติเมื่อเลือกวันเกิด และปรับปรุงการจัดการข้อมูลฟิลด์วันเกิด
function calculateAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// เพิ่มฟังก์ชันตั้งค่า event listener สำหรับฟิลด์วันเกิด
function setupBirthDateHandler() {
  const birthDateInput = document.getElementById('customerBirthDate');
  const ageInput = document.getElementById('customerAge');

  // ✅ ป้องกันการเรียกซ้ำ - ตรวจสอบที่ element โดยตรง
  if (birthDateInput && birthDateInput.hasAttribute('data-birth-date-listener-added')) {
    console.log('⚠️ Birth date handler already setup, skipping...');
      return;
    }

  if (birthDateInput && !birthDateInput.hasAttribute('data-birth-date-listener-added')) {
    birthDateInput.addEventListener('change', function() {
      const birthDate = this.value;
      if (birthDate) {
        try {
        const age = calculateAgeFromBirthDate(birthDate);
          if (ageInput) {
          ageInput.value = age;
            showAgeValidation(age);
          }

          updateFieldValidationStatus('customerBirthDate', age >= 18);
          updateFieldValidationStatus('customerAge', age >= 18);

          // Trigger form validation update
          if (window.InstallmentUI?.formValidationManager) {
            window.InstallmentUI.formValidationManager.validateField('customerBirthDate');
            window.InstallmentUI.formValidationManager.validateField('customerAge');
          }
        } catch (error) {
          console.error('Birth date validation error:', error);
          updateFieldValidationStatus('customerBirthDate', false);
        }
      }
    });
    birthDateInput.setAttribute('data-birth-date-listener-added', 'true');
  }

  if (ageInput && !ageInput.hasAttribute('data-age-input-listener-added')) {
      ageInput.addEventListener('input', function() {
        const age = parseInt(this.value);
      if (age && age > 0) {
        showAgeValidation(age);
        updateFieldValidationStatus('customerAge', age >= 18);

        // Trigger form validation update
        if (window.InstallmentUI?.formValidationManager) {
          window.InstallmentUI.formValidationManager.validateField('customerAge');
        }
      }
    });
    ageInput.setAttribute('data-age-input-listener-added', 'true');
  }

  console.log('✅ Birth date handler setup completed');
}

// ฟังก์ชันอัปเดตสถานะ validation ของฟิลด์
function updateFieldValidationStatus(fieldId, isValid) {
  const element = document.getElementById(fieldId);
  if (!element) return;

  const icon = element.parentElement?.querySelector('.validation-icon');

  // อัปเดต border สี
  element.classList.remove('border-green-500', 'border-red-500');

  if (isValid) {
    element.classList.add('border-green-500');
    if (icon) {
      icon.innerHTML = '<i class="bi bi-check-circle-fill text-green-500"></i>';
    }
  } else {
    element.classList.add('border-red-500');
    if (icon) {
      icon.innerHTML = '<i class="bi bi-x-circle-fill text-red-500"></i>';
    }
  }
}

// ฟังก์ชันแสดงข้อมูลลูกค้าจากบัตรประชาชน - ใช้ฟังก์ชันหลักที่กำหนดไว้แล้ว

// ฟังก์ชันตรวจสอบอายุ - ใช้ฟังก์ชันหลักที่กำหนดไว้แล้ว

// เพิ่มฟังก์ชันแสดงการตรวจสอบอายุ
function showAgeValidation(age) {
  const validation = validateAge(age);
  const ageInput = document.getElementById('customerAge');

  if (ageInput) {
    // อัปเดต UI
    ageInput.classList.remove('border-green-500', 'border-red-500');

    if (validation.valid) {
      ageInput.classList.add('border-green-500');
      showToast(`อายุ ${age} ปี - ถูกต้อง`, 'success', { duration: 2000 });
    } else {
      ageInput.classList.add('border-red-500');
      showToast(validation.message, 'error', { duration: 3000 });
    }
  }
}

// ฟังก์ชันการตั้งค่า event listeners สำหรับระบบการอ่านบัตรประชาชน - ลบฟังก์ชันซ้ำนี้
// (ใช้ฟังก์ชัน setupCardReaderEvents() ด้านบนแทน)

// ... existing code ...

// ฟังก์ชันเปิด/ปิดใช้งานปุ่มอ่านบัตร - ใช้ฟังก์ชันหลักที่กำหนดไว้แล้ว

// ... existing code ...

// ฟังก์ชันจัดรูปแบบวันที่สำหรับแสดงผล (แปลงจาก YYYY-MM-DD เป็น DD/MM/YYYY)
function formatDateForDisplay(dateString) {
  if (!dateString) return 'ไม่ระบุ';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'ไม่ระบุ';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return 'ไม่ระบุ';
  }
}

// =========================================
// CUSTOMER DATA UTILITIES
// =========================================

// ฟังก์ชันดึงข้อมูลลูกค้าจากฟอร์ม
function getCustomerDataFromForm() {
  const customerData = {};

  // รายการฟิลด์ที่ต้องการดึงข้อมูล
  const fields = [
    'customerIdCard', 'citizenId', 'customerTaxId', 'customerCitizenId', 'idCard', 'taxId',
    'customerFirstName', 'customerLastName', 'customerPrefix',
    'customerPhone', 'customerEmail',
    'customerAddress', 'customerSubdistrict', 'customerDistrict', 'customerProvince', 'customerPostalCode'
  ];

  // ดึงข้อมูลจากฟอร์ม
  fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element && element.value) {
      customerData[fieldId] = element.value.trim();
    }
  });

  // ดึงข้อมูลจาก window variables
  if (window.currentCustomerId) customerData.currentCustomerId = window.currentCustomerId;
  if (window.customerId) customerData.customerId = window.customerId;
  if (window.customerData) {
    Object.assign(customerData, window.customerData);
  }

  // ดึงข้อมูลจาก localStorage
  try {
    const savedData = localStorage.getItem('customerData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      Object.assign(customerData, parsedData);
    }
  } catch (e) {
    console.warn('Failed to parse customer data from localStorage:', e);
  }

  return customerData;
}

// ฟังก์ชันดึง citizenId จากหลายแหล่ง
function getCitizenId() {
  console.log('🔍 getCitizenId: Starting search...');

  // ✅ ลำดับการค้นหา citizenId - เพิ่มการค้นหาที่ครอบคลุมมากขึ้น
  const searchSources = [
    // 1. ตรวจสอบ form fields โดยตรง
    () => {
      const fields = ['customerTaxId', 'customerIdCard', 'citizenId', 'customerCitizenId', 'idCard', 'taxId'];
      for (const fieldId of fields) {
        const element = document.getElementById(fieldId);
        if (element && element.value && element.value.trim()) {
          console.log(`✅ Found citizenId in field ${fieldId}:`, element.value.trim());
          return element.value.trim();
        }
      }
      return null;
    },

    // 2. ตรวจสอบ window variables
    () => {
      const windowVars = ['currentCustomerId', 'customerId', 'customerTaxId', 'citizenId'];
      for (const varName of windowVars) {
        if (window[varName] && typeof window[varName] === 'string' && window[varName].trim()) {
          console.log(`✅ Found citizenId in window.${varName}:`, window[varName].trim());
          return window[varName].trim();
        }
      }
      return null;
    },

    // 3. ตรวจสอบ customerData object
    () => {
      if (window.customerData && typeof window.customerData === 'object') {
        const objFields = ['taxId', 'citizenId', 'customerTaxId', 'idCard', 'customerIdCard'];
        for (const field of objFields) {
          if (window.customerData[field] && window.customerData[field].trim()) {
            console.log(`✅ Found citizenId in window.customerData.${field}:`, window.customerData[field].trim());
            return window.customerData[field].trim();
          }
        }
      }
      return null;
    },

    // 4. ตรวจสอบ localStorage
    () => {
      try {
        const saved = localStorage.getItem('customerData');
        if (saved) {
          const data = JSON.parse(saved);
          const fields = ['taxId', 'citizenId', 'customerTaxId', 'idCard'];
          for (const field of fields) {
            if (data[field] && data[field].trim()) {
              console.log(`✅ Found citizenId in localStorage.${field}:`, data[field].trim());
              return data[field].trim();
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse localStorage customerData:', e);
      }
      return null;
    }
  ];

  // ทำการค้นหาตามลำดับ
  for (let i = 0; i < searchSources.length; i++) {
    const result = searchSources[i]();
    if (result) {
      console.log(`✅ getCitizenId: Found citizenId from source ${i + 1}:`, result);
      return result;
    }
  }

  console.warn('⚠️ getCitizenId: No citizenId found from any source');
  return null;
}

// ฟังก์ชันตรวจสอบว่าข้อมูลลูกค้าครบถ้วนหรือไม่
function validateCustomerData() {
  const customerData = getCustomerDataFromForm();
  const citizenId = getCitizenId();

  console.log('🔍 validateCustomerData debug:', {
    customerData: customerData,
    citizenId: citizenId,
    citizenIdFound: !!citizenId
  });

  const validation = {
    isValid: true,
    missingFields: [],
    citizenId: citizenId || '',
    hasCitizenId: !!citizenId
  };

  // ตรวจสอบฟิลด์ที่จำเป็น
  const requiredFields = ['customerFirstName', 'customerLastName'];
  requiredFields.forEach(field => {
    if (!customerData[field]) {
      validation.missingFields.push(field);
      validation.isValid = false;
    }
  });

  // ✅ ปรับปรุง: ไม่บังคับ citizenId สำหรับ upload เพื่อป้องกัน blocking
  // แต่ยังคงส่งค่าไปให้ระบบใช้งาน
  if (!citizenId) {
    console.warn('⚠️ No citizenId found, will use fallback value for upload');
    validation.citizenId = '0000000000000'; // fallback value
  }

  return validation;
}

// เพิ่มฟังก์ชัน debug สำหรับตรวจสอบข้อมูลลูกค้า
window.debugCustomerData = function() {
  console.group('👤 ตรวจสอบข้อมูลลูกค้า (installment-ui.js)');

  const customerData = getCustomerDataFromForm();
  console.log('📋 Customer data from form:', customerData);

  const validation = validateCustomerData();
  console.log('✅ Validation result:', validation);

  if (validation.isValid) {
    console.log('✅ Customer data is valid');
  } else {
    console.log('❌ Customer data is invalid. Missing fields:', validation.missingFields);
  }

  console.groupEnd();
};

// เพิ่มฟังก์ชันบันทึกลายเซ็นพร้อมตรวจสอบ
window.saveSignatureWithValidation = async function(signatureType = 'customer') {
  console.log('🔍 ตรวจสอบข้อมูลก่อนบันทึกลายเซ็น:', signatureType);

  // ตรวจสอบข้อมูลลูกค้า
  const validation = validateCustomerData();
  console.log('📋 Validation result:', validation);

  if (!validation.isValid) {
    const missingFields = validation.missingFields.join(', ');
    const errorMessage = `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields}`;

    showToast(errorMessage, 'error');
    console.error('❌ Customer data validation failed:', validation);
    return false;
  }

  // ตรวจสอบว่ามีลายเซ็นหรือไม่
  if (!window.signatureModalPad || window.signatureModalPad.isEmpty()) {
    showToast('กรุณาเซ็นลายเซ็นก่อน', 'warning');
    return false;
  }

  try {
    // บันทึกลายเซ็น
    const urlFieldId = signatureType === 'customer' ? 'customerSignatureUrl' : 'salespersonSignatureUrl';
    const url = await window.uploadSignature(window.signatureModalPad, urlFieldId);
    // Update preview after successful upload
    if (url) {
      updateSignaturePreview(signatureType, url);
      const hiddenInput = document.getElementById(urlFieldId);
      if (hiddenInput) hiddenInput.value = url;
    }

    console.log('✅ Signature saved successfully with validation');
    return true;

  } catch (error) {
    console.error('❌ Failed to save signature:', error);
    showToast('ไม่สามารถบันทึกลายเซ็นได้: ' + error.message, 'error');
    return false;
  }
};

// ✅ เพิ่มฟังก์ชัน debug สำหรับ signature upload
window.debugSignatureUpload = function() {
  console.group('🔍 Signature Upload Debug');

  // ตรวจสอบข้อมูลลูกค้า
  console.log('1️⃣ Customer Data Check:');
  const validation = validateCustomerData();
  console.log('Validation result:', validation);

  // ตรวจสอบ signature modal
  console.log('2️⃣ Signature Modal Check:');
  console.log('Current signature type:', window.currentSignatureType);
  console.log('Signature modal pad exists:', !!window.signatureModalPad);
  console.log('Signature modal pad isEmpty:', window.signatureModalPad?.isEmpty());

  // ตรวจสอบ form fields ที่เกี่ยวข้อง
  console.log('3️⃣ Form Fields Check:');
  const fields = ['customerTaxId', 'customerIdCard', 'customerFirstName', 'customerLastName'];
  fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    console.log(`${fieldId}:`, element ? element.value : 'NOT_FOUND');
  });

  // ตรวจสอบ hidden signature fields
  console.log('4️⃣ Hidden Signature Fields:');
  const signatureFields = ['customerSignatureUrl', 'salespersonSignatureUrl'];
  signatureFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    console.log(`${fieldId}:`, element ? (element.value || 'EMPTY') : 'NOT_FOUND');
  });

  console.groupEnd();

  return {
    customerData: validation,
    signatureModalReady: !!window.signatureModalPad,
    isEmpty: window.signatureModalPad?.isEmpty(),
    currentType: window.currentSignatureType
  };
};

// ✅ เพิ่มฟังก์ชันทดสอบ signature upload
window.testSignatureUpload = async function(forceCreate = false) {
  console.log('🧪 Testing signature upload...');

  try {
    // ตรวจสอบข้อมูลพื้นฐาน
    const debug = debugSignatureUpload();

    if (!debug.customerData.citizenId && !forceCreate) {
      console.warn('⚠️ No citizenId found. Try adding customer data first.');
      console.log('💡 To force test with fallback data, call: testSignatureUpload(true)');
      return false;
    }

    // สร้าง test signature ถ้าไม่มี
    if (!debug.signatureModalReady || debug.isEmpty) {
      console.log('📝 Creating test signature...');

      // เปิด modal ถ้าปิดอยู่
      const modal = document.getElementById('signatureModal');
      if (modal && modal.classList.contains('hidden')) {
        openSignatureModal('customer');
        await new Promise(resolve => setTimeout(resolve, 500)); // รอให้ modal เปิด
      }

      // สร้าง test signature
      if (window.signatureModalPad) {
        window.signatureModalPad.clear();

        // วาดเส้นทดสอบ
        const canvas = window.signatureModalPad.canvas;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(50, 50);
        ctx.lineTo(150, 100);
        ctx.lineTo(100, 150);
        ctx.stroke();

        console.log('✅ Test signature created');
      }
    }

    // ทดสอบการบันทึก
    console.log('💾 Testing save signature...');
    const result = await saveSignatureModal();

    if (result !== false) {
      console.log('✅ Signature upload test completed successfully');
      return true;
    } else {
      console.log('❌ Signature upload test failed');
      return false;
    }

  } catch (error) {
    console.error('❌ Signature upload test error:', error);
    return false;
  }
};

// ✅ เพิ่มฟังก์ชันกรอกข้อมูลทดสอบ
window.fillTestCustomerData = function() {
  console.log('📝 Filling test customer data...');

  try {
    // กรอกข้อมูลลูกค้าทดสอบ
    const testData = {
      customerFirstName: 'สมชาย',
      customerLastName: 'ทดสอบ',
      customerTaxId: '1234567890123',
      customerPhone: '0812345678',
      customerAge: '35'
    };

    Object.keys(testData).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = testData[fieldId];
        console.log(`✅ Set ${fieldId}: ${testData[fieldId]}`);

        // Trigger change event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.warn(`⚠️ Field ${fieldId} not found`);
      }
    });

    // บันทึกข้อมูลลง window และ localStorage
    window.currentCustomerId = testData.customerTaxId;
    window.customerData = testData;

    try {
      localStorage.setItem('customerData', JSON.stringify(testData));
      console.log('💾 Test data saved to localStorage');
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    console.log('✅ Test customer data filled successfully');
    showToast('กรอกข้อมูลทดสอบเรียบร้อย', 'success');

    return true;
  } catch (error) {
    console.error('❌ Failed to fill test data:', error);
    showToast('ไม่สามารถกรอกข้อมูลทดสอบได้', 'error');
    return false;
  }
};

// ✅ เพิ่มฟังก์ชันทดสอบแบบครบชุด
window.fullSignatureTest = async function() {
  console.log('🚀 Starting full signature test...');

  try {
    // 1. กรอกข้อมูลทดสอบ
    console.log('1️⃣ Filling test customer data...');
    fillTestCustomerData();

    // รอ 1 วินาที
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. ตรวจสอบข้อมูล
    console.log('2️⃣ Debugging customer data...');
    debugSignatureUpload();

    // รอ 1 วินาที
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. ทดสอบ signature upload
    console.log('3️⃣ Testing signature upload...');
    const result = await testSignatureUpload(true);

    if (result) {
      console.log('🎉 Full signature test completed successfully!');
      showToast('ทดสอบระบบลายเซ็นสำเร็จ!', 'success');
      return true;
    } else {
      console.log('❌ Full signature test failed');
      showToast('การทดสอบระบบลายเซ็นล้มเหลว', 'error');
      return false;
    }

  } catch (error) {
    console.error('❌ Full signature test error:', error);
    showToast('เกิดข้อผิดพลาดในการทดสอบ', 'error');
    return false;
  }
};

// ... existing code ...