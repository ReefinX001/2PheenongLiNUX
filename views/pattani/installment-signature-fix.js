// ================================================
// INSTALLMENT SIGNATURE FIX MODULE
// ================================================
// Version: 1.0.0
// Purpose: Fix signature-related issues in installment system

console.log('🖊️ Installment Signature Fix Module Loading...');

// Fix signature canvas sizing issues
function fixSignatureCanvasSizing() {
  const signatureCanvases = document.querySelectorAll('canvas[id*="signature"]');

  signatureCanvases.forEach(canvas => {
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      console.log(`✅ Fixed canvas sizing for ${canvas.id}`);
    }
  });
}

// Fix signature pad initialization
function fixSignaturePadInit() {
  try {
    // Check if InstallmentUI signature functions are available
    if (window.InstallmentUI && window.InstallmentUI.initializeSignaturePads) {
      window.InstallmentUI.initializeSignaturePads();
      console.log('✅ Signature pads initialized via InstallmentUI');
    } else {
      console.warn('⚠️ InstallmentUI signature functions not available');
    }
  } catch (error) {
    console.error('❌ Signature pad initialization failed:', error);
  }
}

// Export functions
window.FixSignatureIssues = {
  fixCanvasSizing: fixSignatureCanvasSizing,
  fixPadInit: fixSignaturePadInit
};

console.log('✅ Installment Signature Fix Module Loaded');
