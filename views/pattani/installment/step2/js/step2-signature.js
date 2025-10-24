// ======================= STEP 2 SIGNATURE FUNCTIONS =======================

// Global signature variables with proper initialization
let signatureCanvas = null;
let signatureContext = null;
let isDrawing = false;
let enhancedCurrentSignatureType = null;

// Ensure global variables are properly initialized
if (!window.currentSignatureType) {
  window.currentSignatureType = null;
}

if (!window.signaturePad) {
  window.signaturePad = null;
}

// Enhanced initSignature function with null safety
function initSignatureEnhanced(type) {
  enhancedCurrentSignatureType = type;

  // Create modal if it doesn't exist
  let modal = document.getElementById('signatureModal');
  if (!modal) {
    createEnhancedSignatureModal();
    modal = document.getElementById('signatureModal');
  }

  const canvas = document.getElementById('signatureCanvas');
  const title = document.getElementById('signatureModalTitle');

  if (!canvas) {
    console.error('Signature canvas not found');
    showToast('ไม่สามารถเปิดระบบลายเซ็นได้', 'error');
    return;
  }

  if (title) {
    title.textContent = type === 'customer' ? 'ลายเซ็นลูกค้า' : 'ลายเซ็นพนักงานขาย';
  }

  modal.classList.remove('hidden');
  setupSignatureCanvas(canvas);
}

// Create enhanced signature modal
function createEnhancedSignatureModal() {
  const modal = document.createElement('div');
  modal.id = 'signatureModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden';

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 id="signatureModalTitle" class="text-lg font-semibold">ลายเซ็น</h3>
        <button onclick="closeEnhancedSignatureModal()" class="text-gray-500 hover:text-gray-700">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <div class="mb-4">
        <canvas 
          id="signatureCanvas" 
          width="600" 
          height="200" 
          style="border: 1px solid #ccc; border-radius: 8px; background: white; display: block; margin: 0 auto; cursor: crosshair;"
        ></canvas>
      </div>
      
      <div class="text-center text-sm text-gray-600 mb-4">
        กรุณาเซ็นชื่อในกรอบด้านบน (รองรับการใช้เมาส์หรือสัมผัส)
      </div>
      
      <div class="flex gap-3 justify-center">
        <button 
          onclick="clearEnhancedSignature()" 
          class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <i class="bi bi-arrow-clockwise"></i>
          ล้างลายเซ็น
        </button>
        <button 
          onclick="saveEnhancedSignature()" 
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <i class="bi bi-check-circle"></i>
          บันทึกลายเซ็น
        </button>
        <button 
          onclick="closeEnhancedSignatureModal()" 
          class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Setup signature canvas with enhanced touch support
function setupSignatureCanvas(canvas) {
  signatureCanvas = canvas;
  signatureContext = canvas.getContext('2d');

  // Set up drawing styles
  signatureContext.strokeStyle = '#000000';
  signatureContext.lineWidth = 2;
  signatureContext.lineCap = 'round';
  signatureContext.lineJoin = 'round';

  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events for mobile with better support
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', stopDrawing, { passive: false });
}

function startDrawing(e) {
  isDrawing = true;
  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  signatureContext.beginPath();
  signatureContext.moveTo(x, y);
}

function draw(e) {
  if (!isDrawing) return;

  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  signatureContext.lineTo(x, y);
  signatureContext.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = signatureCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  isDrawing = true;
  signatureContext.beginPath();
  signatureContext.moveTo(x, y);
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;

  const touch = e.touches[0];
  const rect = signatureCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  signatureContext.lineTo(x, y);
  signatureContext.stroke();
}

function clearEnhancedSignature() {
  if (signatureContext && signatureCanvas) {
    signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  }
}

function closeEnhancedSignatureModal() {
  const modal = document.getElementById('signatureModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function saveEnhancedSignature() {
  if (!signatureCanvas || !signatureContext) {
    showToast('ไม่พบลายเซ็น', 'error');
    return;
  }

  // Check if signature is empty
  const imageData = signatureContext.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
  const isBlank = imageData.data.every(pixel => pixel === 0 || pixel === 255);

  if (isBlank) {
    showToast('กรุณาเซ็นชื่อก่อนบันทึก', 'warning');
    return;
  }

  try {
    // Convert canvas to data URL
    const dataURL = signatureCanvas.toDataURL('image/png');

    // Save signature based on type
    if (enhancedCurrentSignatureType === 'customer') {
      // Update customer signature elements
      const preview = document.getElementById('customerSignaturePreview');
      const image = document.getElementById('customerSignatureImage');
      const hiddenInput = document.getElementById('customerSignatureUrl');
      const placeholder = document.getElementById('customerSignaturePlaceholder');
      const retakeBtn = document.getElementById('btnRetakeCustomerSignature');

      if (image) image.src = dataURL;
      if (preview) preview.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      if (hiddenInput) hiddenInput.value = dataURL;
      if (retakeBtn) retakeBtn.classList.remove('hidden');

      // Update status badge
      const statusBadge = document.querySelector('#customerSignatureCard .status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'เสร็จสิ้น';
        statusBadge.className = 'status-badge completed';
      }

      // Update customer signature in Global Data Manager
      if (window.globalDataManager) {
        globalDataManager.updateStepData(2, {
          customerSignature: dataURL,
          customerSignatureTimestamp: new Date().toISOString()
        });
      }

      showToast('บันทึกลายเซ็นลูกค้าสำเร็จ', 'success');
    } else if (enhancedCurrentSignatureType === 'salesperson') {
      // Update salesperson signature elements
      const preview = document.getElementById('salespersonSignaturePreview');
      const image = document.getElementById('salespersonSignatureImage');
      const hiddenInput = document.getElementById('salespersonSignatureUrl');
      const placeholder = document.getElementById('salespersonSignaturePlaceholder');
      const retakeBtn = document.getElementById('btnRetakeSalespersonSignature');

      if (image) image.src = dataURL;
      if (preview) preview.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      if (hiddenInput) hiddenInput.value = dataURL;
      if (retakeBtn) retakeBtn.classList.remove('hidden');

      // Update status badge
      const statusBadge = document.querySelector('#salespersonSignatureCard .status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'เสร็จสิ้น';
        statusBadge.className = 'status-badge completed';
      }

      // Update salesperson signature in Global Data Manager
      if (window.globalDataManager) {
        globalDataManager.updateStepData(2, {
          salespersonSignature: dataURL,
          salespersonSignatureTimestamp: new Date().toISOString()
        });
      }

      showToast('บันทึกลายเซ็นพนักงานสำเร็จ', 'success');
    }

    closeEnhancedSignatureModal();

  } catch (error) {
    console.error('Signature save error:', error);
    showToast('เกิดข้อผิดพลาดในการบันทึกลายเซ็น', 'error');
  }
}

// Legacy signature functions for compatibility
function initSignature(type) {
  return initSignatureEnhanced(type);
}

function createSignatureModal() {
  return createEnhancedSignatureModal();
}

function initializeSignaturePad() {
  const canvas = document.getElementById('signatureModalCanvas');
  if (canvas) {
    setupSignatureCanvas(canvas);
  }
}

function saveSignature() {
  return saveEnhancedSignature();
}

// Initialize signature functionality
function initializeSignatureSystem() {
  // Setup signature button event listeners
  const btnOpenCustomerSignature = document.getElementById('btnOpenCustomerSignature');
  const btnRetakeCustomerSignature = document.getElementById('btnRetakeCustomerSignature');
  const btnOpenSalespersonSignature = document.getElementById('btnOpenSalespersonSignature');
  const btnRetakeSalespersonSignature = document.getElementById('btnRetakeSalespersonSignature');

  if (btnOpenCustomerSignature) {
    btnOpenCustomerSignature.addEventListener('click', () => initSignatureEnhanced('customer'));
  }

  if (btnRetakeCustomerSignature) {
    btnRetakeCustomerSignature.addEventListener('click', () => initSignatureEnhanced('customer'));
  }

  if (btnOpenSalespersonSignature) {
    btnOpenSalespersonSignature.addEventListener('click', () => initSignatureEnhanced('salesperson'));
  }

  if (btnRetakeSalespersonSignature) {
    btnRetakeSalespersonSignature.addEventListener('click', () => initSignatureEnhanced('salesperson'));
  }

  // Authentication method handlers
  const authRadios = document.querySelectorAll('input[name="customerAuthMethod"]');
  authRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const signatureSection = document.getElementById('signatureSection');
      const fingerprintSection = document.getElementById('fingerprintSection');

      if (this.value === 'signature') {
        if (signatureSection) signatureSection.style.display = 'block';
        if (fingerprintSection) fingerprintSection.style.display = 'none';
      } else {
        if (signatureSection) signatureSection.style.display = 'none';
        if (fingerprintSection) fingerprintSection.style.display = 'block';
      }
    });
  });

  console.log('✅ Signature system initialized');
}

// Export functions to global scope
window.initSignatureEnhanced = initSignatureEnhanced;
window.createEnhancedSignatureModal = createEnhancedSignatureModal;
window.setupSignatureCanvas = setupSignatureCanvas;
window.clearEnhancedSignature = clearEnhancedSignature;
window.closeEnhancedSignatureModal = closeEnhancedSignatureModal;
window.saveEnhancedSignature = saveEnhancedSignature;
window.initSignature = initSignature;
window.createSignatureModal = createSignatureModal;
window.initializeSignaturePad = initializeSignaturePad;
window.saveSignature = saveSignature;
window.initializeSignatureSystem = initializeSignatureSystem;