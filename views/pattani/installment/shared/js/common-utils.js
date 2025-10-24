/**
 * Common Utilities for Installment System
 * Shared functions across all steps (step1-4.html)
 * @version 1.0.0
 */

// ========== GLOBAL VARIABLES ==========
window.INSTALLMENT_COMMON = {
  version: '1.0.0',
  initialized: false
};

// ========== TOAST NOTIFICATION SYSTEM ==========
function showToast(message, type = 'info') {
  // Remove existing toast container if exists
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Determine icon based on type
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  else if (type === 'error') icon = 'x-circle';
  else if (type === 'warning') icon = 'exclamation-triangle';

  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="bi bi-${icon}"></i>
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// ========== BRANCH INFORMATION LOADER ==========
async function loadBranchInfo() {
  let js = null;
  let branchCode = null;
  try {
    branchCode = window.BRANCH_CODE;
    if (!branchCode) {
      throw new Error('ไม่พบรหัสสาขา กรุณาเลือกสาขาจากหน้าหลัก');
    }
    const token = localStorage.getItem('authToken') || '';

    // เรียก /api/branch เพื่อดึง list สาขา
    const res = await fetch(`/api/branch`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    js = await res.json();

    if (res.ok && js.success) {
      // หา record ที่ตรงกับ BRANCH_CODE
      const branch = js.data.find(b => b.branch_code === branchCode);
      if (branch) {
        document.getElementById('branchInfo').textContent =
          `${branch.name} — ${branch.address}`;

        // อัพเดท title ของหน้าด้วยชื่อสาขาจริง
        document.title = `ระบบผ่อน - ${branch.name}`;
        document.getElementById('pageTitle').textContent = `ระบบผ่อน - ${branch.name}`;

        // อัพเดท dropdown branch info ใน Receipt Menu
        const dropdownBranchInfo = document.getElementById('dropdownBranchInfo');
        if (dropdownBranchInfo) {
          dropdownBranchInfo.textContent = `สาขา: ${branch.name}`;
        }
        return;
      }
    }
    throw new Error(`ไม่พบสาขา ${branchCode}`);
  } catch (err) {
    console.error('❌ loadBranchInfo error:', err);
    console.error('🔍 Available branches:', js?.data?.map(b => ({ code: b.branch_code, name: b.name })) || 'No data');
    document.getElementById('branchInfo').textContent =
      `สาขา: ไม่พบข้อมูลสาขา "${branchCode}"`;

    // Show available branches for debugging
    if (js?.data) {
      console.log('📋 Available branch codes:', js.data.map(b => b.branch_code));
      showToast(`ไม่พบสาขา "${branchCode}" กรุณาเลือกสาขาจากหน้าหลัก`, 'error');
    }
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatPrice(num) {
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getBranchCode() {
  return window.BRANCH_CODE || 'PATTANI';
}

function getImageUrl(imagePath) {
  if (!imagePath) return '/uploads/Logo2.png';
  if (imagePath.startsWith('http')) return imagePath;

  // Clean up the path first
  let cleanPath = imagePath;

  // Remove all duplicate /uploads/products/ segments (handle multiple duplications)
  while (cleanPath.includes('uploads/products/uploads/products/')) {
    cleanPath = cleanPath.replace(/uploads\/products\/uploads\/products\//g, 'uploads/products/');
  }

  // Also handle version with leading slashes
  while (cleanPath.includes('/uploads/products/uploads/products/')) {
    cleanPath = cleanPath.replace(/\/uploads\/products\/uploads\/products\//g, '/uploads/products/');
  }

  // Remove leading slash if exists to normalize
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  // If path starts with uploads/products/, just add leading slash
  if (cleanPath.startsWith('uploads/products/')) {
    return '/' + cleanPath;
  }

  // If path starts with uploads/, return with leading slash
  if (cleanPath.startsWith('uploads/')) {
    return '/' + cleanPath;
  }

  // Otherwise, add the full prefix
  return `/uploads/products/${cleanPath}`;
}

// ========== CONNECTION STATUS MANAGEMENT ==========
function updateConnectionStatus() {
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    setTimeout(() => {
      connectionStatus.innerHTML = '🟢 เชื่อมต่อแล้ว';
      connectionStatus.className = 'connection-status online text-xs font-medium';
    }, 2000);
  }
}

// ========== THEME MANAGEMENT ==========
function initializeTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// ========== QUICK ACTIONS DROPDOWN ==========
function setupQuickActions() {
  const quickActionsBtn = document.getElementById('quickActionsBtn');
  const quickActionsDropdown = document.getElementById('quickActionsDropdown');

  if (quickActionsBtn && quickActionsDropdown) {
    quickActionsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      quickActionsDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      quickActionsDropdown.classList.add('hidden');
    });
  }
}

// ========== GLOBAL DATA MANAGER INITIALIZATION ==========
function initializeGlobalDataManager() {
  if (window.globalInstallmentManager) {
    window.globalInstallmentManager.initializeBranchInfo();
  }
}

// ========== INPUT FORMATTERS ==========
function formatIdCard(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits
  if (value.length > 13) {
    value = value.substring(0, 13);
  }

  // Format as X-XXXX-XXXXX-XX-X
  if (value.length >= 1) {
    value = value.replace(/(\d{1})(\d{4})?(\d{5})?(\d{2})?(\d{1})?/, function(match, p1, p2, p3, p4, p5) {
      let result = p1;
      if (p2) result += '-' + p2;
      if (p3) result += '-' + p3;
      if (p4) result += '-' + p4;
      if (p5) result += '-' + p5;
      return result;
    });
  }

  input.value = value;
}

function formatPhoneNumber(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits
  if (value.length > 10) {
    value = value.substring(0, 10);
  }

  // Format as XXX-XXX-XXXX or XX-XXXX-XXXX
  if (value.length >= 10) {
    if (value.startsWith('0')) {
      value = value.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    } else {
      value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
  } else if (value.length >= 7) {
    if (value.startsWith('0')) {
      value = value.replace(/(\d{2})(\d{3})(\d+)/, '$1-$2-$3');
    } else {
      value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
    }
  } else if (value.length >= 4) {
    if (value.startsWith('0')) {
      value = value.replace(/(\d{2})(\d+)/, '$1-$2');
    } else {
      value = value.replace(/(\d{3})(\d+)/, '$1-$2');
    }
  }

  input.value = value;
}

// ========== VALIDATION FUNCTIONS ==========
function validateFacebookUrl(input) {
  const url = input.value.trim();
  if (!url) return true;

  const facebookPattern = /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com)\/[a-zA-Z0-9.]+\/?$/;
  const isValid = facebookPattern.test(url);

  const parentGroup = input.closest('.form-group');
  const errorElement = parentGroup?.querySelector('.form-error');

  if (isValid || !url) {
    input.classList.remove('border-red-500');
    if (errorElement) errorElement.classList.add('hidden');
  } else {
    input.classList.add('border-red-500');
    if (errorElement) {
      errorElement.textContent = 'รูปแบบ URL Facebook ไม่ถูกต้อง';
      errorElement.classList.remove('hidden');
    }
  }

  return isValid;
}

function validateLineId(input) {
  const lineId = input.value.trim();
  if (!lineId) return true;

  const linePattern = /^[a-zA-Z0-9._-]{1,20}$/;
  const isValid = linePattern.test(lineId);

  const parentGroup = input.closest('.form-group');
  const errorElement = parentGroup?.querySelector('.form-error');

  if (isValid || !lineId) {
    input.classList.remove('border-red-500');
    if (errorElement) errorElement.classList.add('hidden');
  } else {
    input.classList.add('border-red-500');
    if (errorElement) {
      errorElement.textContent = 'Line ID ควรมีความยาว 1-20 ตัวอักษร และใช้ได้เฉพาะ a-z, A-Z, 0-9, ., _, -';
      errorElement.classList.remove('hidden');
    }
  }

  return isValid;
}

// ========== COMMON INITIALIZATION ==========
function initializeCommonFeatures() {
  console.log('🚀 Initializing common installment features...');

  // Initialize theme
  initializeTheme();

  // Setup quick actions
  setupQuickActions();

  // Update connection status
  updateConnectionStatus();

  // Initialize global data manager
  initializeGlobalDataManager();

  // Load branch info
  loadBranchInfo();

  // Mark as initialized
  window.INSTALLMENT_COMMON.initialized = true;

  console.log('✅ Common installment features initialized');
}

// ========== EXPORT FUNCTIONS TO GLOBAL SCOPE ==========
window.showToast = showToast;
window.loadBranchInfo = loadBranchInfo;
window.formatPrice = formatPrice;
window.getBranchCode = getBranchCode;
window.getImageUrl = getImageUrl;
window.updateConnectionStatus = updateConnectionStatus;
window.initializeTheme = initializeTheme;
window.setupQuickActions = setupQuickActions;
window.initializeGlobalDataManager = initializeGlobalDataManager;
window.formatIdCard = formatIdCard;
window.formatPhoneNumber = formatPhoneNumber;
window.validateFacebookUrl = validateFacebookUrl;
window.validateLineId = validateLineId;
window.initializeCommonFeatures = initializeCommonFeatures;

// ========== AUTO INITIALIZATION ==========
// Auto-initialize when DOM is ready (if not already called manually)
document.addEventListener('DOMContentLoaded', function() {
  if (!window.INSTALLMENT_COMMON.initialized) {
    // Delay initialization to allow page-specific scripts to load first
    setTimeout(initializeCommonFeatures, 100);
  }
});

console.log('📦 Installment Common Utils loaded - version', window.INSTALLMENT_COMMON.version);