/**
 * Avatar Utilities
 * แก้ไขปัญหา 404 errors จากการเรียกไฟล์ avatar-default.png ที่ไม่มีอยู่
 */

// SVG Avatar Placeholder (40x40)
const AVATAR_PLACEHOLDER_40 = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E5E7EB\'/%3E%3Cpath d=\'M20 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z\' fill=\'%236B7280\'/%3E%3C/svg%3E';

// SVG Avatar Placeholder (48x48)
const AVATAR_PLACEHOLDER_48 = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'48\' height=\'48\' viewBox=\'0 0 48 48\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'24\' cy=\'24\' r=\'24\' fill=\'%23E5E7EB\'/%3E%3Cpath d=\'M24 14c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z\' fill=\'%236B7280\'/%3E%3C/svg%3E';

// SVG Avatar Placeholder (80x80)
const AVATAR_PLACEHOLDER_80 = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'40\' cy=\'40\' r=\'40\' fill=\'%23E5E7EB\'/%3E%3Cpath d=\'M40 24c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 28c-8.84 0-16 3.58-16 8v4h32v-4c0-4.42-7.16-8-16-8z\' fill=\'%236B7280\'/%3E%3C/svg%3E';

/**
 * ฟังก์ชันสำหรับจัดการ URL รูปภาพ
 * @param {string} imagePath - path ของรูปภาพ
 * @param {number} size - ขนาดของ placeholder (40, 48, 80)
 * @returns {string} URL ที่ถูกต้องหรือ placeholder
 */
function getImageUrl(imagePath, size = 48) {
  // ถ้าไม่มี imagePath ให้ใช้ placeholder
  if (!imagePath || imagePath.trim() === '') {
    return getAvatarPlaceholder(size);
  }

  // ถ้าเป็น full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // ถ้าเป็น data URL
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }

  // ถ้าขึ้นต้นด้วย /uploads/ หรือ /static/ แล้ว
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

  // ถ้าไม่มีนามสกุลไฟล์ให้ fallback เป็น placeholder
  if (!fixedPath.includes('.')) {
    console.warn('⚠️ Image path ไม่มีนามสกุล:', imagePath);
    return getAvatarPlaceholder(size);
  }

  return `/uploads/${fixedPath}`;
}

/**
 * ฟังก์ชันสำหรับได้ avatar placeholder ตามขนาด
 * @param {number} size - ขนาดของ placeholder (40, 48, 80)
 * @returns {string} SVG data URL
 */
function getAvatarPlaceholder(size = 48) {
  switch (size) {
    case 40:
      return AVATAR_PLACEHOLDER_40;
    case 48:
      return AVATAR_PLACEHOLDER_48;
    case 80:
      return AVATAR_PLACEHOLDER_80;
    default:
      return AVATAR_PLACEHOLDER_48;
  }
}

/**
 * ฟังก์ชันสำหรับตั้งค่า error handler ให้กับ img element
 * @param {HTMLImageElement} imgElement - element ของรูปภาพ
 * @param {number} size - ขนาดของ placeholder
 */
function setImageErrorHandler(imgElement, size = 48) {
  if (!imgElement) return;

  imgElement.onerror = function() {
    this.onerror = null; // ป้องกัน infinite loop
    this.src = getAvatarPlaceholder(size);
  };
}

/**
 * ฟังก์ชันสำหรับตั้งค่า avatar element อย่างสมบูรณ์
 * @param {string} elementId - ID ของ img element
 * @param {string} imagePath - path ของรูปภาพ
 * @param {number} size - ขนาดของ placeholder
 */
function setupAvatarElement(elementId, imagePath, size = 48) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.src = getImageUrl(imagePath, size);
  setImageErrorHandler(element, size);
}

/**
 * ฟังก์ชันสำหรับ clean up รูปภาพที่อ้างอิงไฟล์ที่ไม่มีอยู่
 */
function cleanupAvatarElements() {
  const problematicPaths = [
    '/static/avatar-default.png',
    '/static/images/avatar-default.png',
    '/uploads/avatar-default.png'
  ];

  document.querySelectorAll('img').forEach(img => {
    if (problematicPaths.includes(img.src)) {
      console.log('🔧 Fixing problematic avatar:', img.src);
      img.src = getAvatarPlaceholder(48);
      setImageErrorHandler(img, 48);
    }
  });
}

// Export functions for global use
if (typeof window !== 'undefined') {
  window.getImageUrl = getImageUrl;
  window.getAvatarPlaceholder = getAvatarPlaceholder;
  window.setImageErrorHandler = setImageErrorHandler;
  window.setupAvatarElement = setupAvatarElement;
  window.cleanupAvatarElements = cleanupAvatarElements;
}

// Auto cleanup เมื่อหน้าโหลด
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', cleanupAvatarElements);
}

// Suppress console log to avoid clutter
// console.log('✅ Avatar Utils loaded - ป้องกัน 404 errors จาก avatar-default.png');