// Witness Photo Modal Fix
(function initializeWitnessPhotoFix() {
  console.log('🔧 Initializing witness photo modal fix...');

  // Wait for DOM to be ready
  function waitForDOM(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  // Check if modal exists and ensure it's in proper state
  function checkAndFixWitnessModal() {
    console.log('🔍 Checking witness modals...');

    const witnessPhotoModal = document.getElementById('witnessPhotoCameraModal');
    const witnessIdCardModal = document.getElementById('witnessIdCardCameraModal');

    console.log('📊 Modal check results:', {
      witnessPhotoModal: !!witnessPhotoModal,
      witnessIdCardModal: !!witnessIdCardModal,
      documentReady: document.readyState,
      bodyExists: !!document.body
    });

    if (!witnessPhotoModal) {
      console.warn('⚠️ witnessPhotoCameraModal not found - creating it dynamically');
      createWitnessPhotoModal();
    } else {
      console.log('✅ witnessPhotoCameraModal found:', {
        id: witnessPhotoModal.id,
        classes: witnessPhotoModal.className,
        display: witnessPhotoModal.style.display,
        hidden: witnessPhotoModal.classList.contains('hidden'),
        parent: witnessPhotoModal.parentElement?.tagName
      });

      // Ensure modal has proper classes
      if (!witnessPhotoModal.classList.contains('flex')) {
        witnessPhotoModal.classList.add('flex');
      }
    }

    if (!witnessIdCardModal) {
      console.warn('⚠️ witnessIdCardCameraModal not found - creating it dynamically');
      createWitnessIdCardModal();
    } else {
      console.log('✅ witnessIdCardCameraModal found:', {
        id: witnessIdCardModal.id,
        classes: witnessIdCardModal.className,
        display: witnessIdCardModal.style.display,
        hidden: witnessIdCardModal.classList.contains('hidden'),
        parent: witnessIdCardModal.parentElement?.tagName
      });

      // Ensure modal has proper classes
      if (!witnessIdCardModal.classList.contains('flex')) {
        witnessIdCardModal.classList.add('flex');
      }
    }
  }

  function createWitnessPhotoModal() {
    // Check if modal already exists to prevent duplicates
    if (document.getElementById('witnessPhotoCameraModal')) {
      console.log('✅ witnessPhotoCameraModal already exists, skipping creation');
      return;
    }

    const modalHTML = `
      <div id="witnessPhotoCameraModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">ถ่ายรูปพยาน</h3>
            <button id="closeWitnessPhotoModal" class="text-gray-500 hover:text-gray-700" type="button">
              <i class="bi bi-x-lg text-xl"></i>
            </button>
          </div>

          <div class="relative mb-4">
            <video id="witnessPhotoVideo" class="w-full h-64 bg-black rounded-lg object-cover" autoplay muted playsinline></video>
            <canvas id="witnessPhotoCanvas" class="hidden" style="display: none;"></canvas>
          </div>

          <div class="flex gap-3 justify-center">
            <button id="captureWitnessPhoto" class="btn btn-primary" type="button">
              <i class="bi bi-camera"></i> ถ่ายรูป
            </button>
            <button id="retakeWitnessPhoto" class="btn btn-outline hidden" type="button">
              <i class="bi bi-arrow-clockwise"></i> ถ่ายใหม่
            </button>
            <button id="confirmWitnessPhoto" class="btn btn-success hidden" type="button">
              <i class="bi bi-check"></i> ใช้รูปนี้
            </button>
          </div>

          <div id="witnessPhotoCapturedPreview" class="mt-4 hidden">
            <img id="witnessPhotoPreviewImage" class="w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Created witnessPhotoCameraModal dynamically');

    // Setup event listeners for the newly created modal
    setupWitnessModalEventListeners();
  }

  function createWitnessIdCardModal() {
    // Check if modal already exists to prevent duplicates
    if (document.getElementById('witnessIdCardCameraModal')) {
      console.log('✅ witnessIdCardCameraModal already exists, skipping creation');
      return;
    }

    const modalHTML = `
      <div id="witnessIdCardCameraModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">ถ่ายบัตรประชาชนพยาน</h3>
            <button id="closeWitnessIdCardModal" class="text-gray-500 hover:text-gray-700" type="button">
              <i class="bi bi-x-lg text-xl"></i>
            </button>
          </div>

          <div class="relative mb-4">
            <video id="witnessIdCardVideo" class="w-full h-64 bg-black rounded-lg object-cover" autoplay muted playsinline></video>
            <canvas id="witnessIdCardCanvas" class="hidden" style="display: none;"></canvas>
          </div>

          <div class="flex gap-3 justify-center">
            <button id="captureWitnessIdCard" class="btn btn-primary" type="button">
              <i class="bi bi-camera"></i> ถ่ายรูป
            </button>
            <button id="retakeWitnessIdCard" class="btn btn-outline hidden" type="button">
              <i class="bi bi-arrow-clockwise"></i> ถ่ายใหม่
            </button>
            <button id="confirmWitnessIdCard" class="btn btn-success hidden" type="button">
              <i class="bi bi-check"></i> ใช้รูปนี้
            </button>
          </div>

          <div id="witnessIdCardCapturedPreview" class="mt-4 hidden">
            <img id="witnessIdCardPreviewImage" class="w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Created witnessIdCardCameraModal dynamically');

    // Setup event listeners for the newly created modal
    setupWitnessIdCardModalEventListeners();
  }

  function setupWitnessModalEventListeners() {
    console.log('🔧 Setting up witness modal event listeners...');

    // Close button event listener
    const closeBtn = document.getElementById('closeWitnessPhotoModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        const modal = document.getElementById('witnessPhotoCameraModal');
        const video = document.getElementById('witnessPhotoVideo');

        if (modal) modal.classList.add('hidden');
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
    }

    // Capture button event listener
    const captureBtn = document.getElementById('captureWitnessPhoto');
    if (captureBtn) {
      captureBtn.addEventListener('click', function() {
        window.captureWitnessPhoto('witnessPhoto');
      });
    }
  }

  function setupWitnessIdCardModalEventListeners() {
    console.log('🔧 Setting up witness ID card modal event listeners...');

    // Close button event listener
    const closeBtn = document.getElementById('closeWitnessIdCardModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        const modal = document.getElementById('witnessIdCardCameraModal');
        const video = document.getElementById('witnessIdCardVideo');

        if (modal) modal.classList.add('hidden');
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
    }

    // Capture button event listener
    const captureBtn = document.getElementById('captureWitnessIdCard');
    if (captureBtn) {
      captureBtn.addEventListener('click', function() {
        window.captureWitnessPhoto('witnessIdCard');
      });
    }
  }

  // Override the original showWitnessCameraModal function with fixed version
  window.showWitnessCameraModalFixed = function(stream, type) {
    console.log('🎬 showWitnessCameraModalFixed called with type:', type);

    // Ensure modal exists before proceeding
    window.ensureWitnessModalExists(type);

    // Select modal and elements based on type
    let modalId, videoId, captureBtnId, closeBtnId;

    if (type === 'witnessPhoto') {
      modalId = 'witnessPhotoCameraModal';
      videoId = 'witnessPhotoVideo';
      captureBtnId = 'captureWitnessPhoto';
      closeBtnId = 'closeWitnessPhotoModal';
    } else if (type === 'witnessIdCard') {
      modalId = 'witnessIdCardCameraModal';
      videoId = 'witnessIdCardVideo';
      captureBtnId = 'captureWitnessIdCard';
      closeBtnId = 'closeWitnessIdCardModal';
    } else {
      console.error('❌ Unknown witness type:', type);
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    const modal = document.getElementById(modalId);
    const video = document.getElementById(videoId);
    const captureBtn = document.getElementById(captureBtnId);
    const cancelBtn = document.getElementById(closeBtnId);

    if (!modal) {
      console.error(`❌ ${modalId} still not found after fix attempt`);
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    if (!video) {
      console.error('❌ Video element not found');
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    // Setup video stream
    video.srcObject = stream;

    // Show modal by removing 'hidden' class
    modal.classList.remove('hidden');
    console.log('✅ Modal shown successfully');

    // Setup event handlers
    if (captureBtn) {
      captureBtn.onclick = async function() {
        console.log('📸 Capture button clicked for type:', type);

        // Create canvas for capturing
        const canvas = document.getElementById(type === 'witnessPhoto' ? 'witnessPhotoCanvas' : 'witnessIdCardCanvas');

        if (!canvas) {
          console.error('❌ Canvas not found');
          return;
        }

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        console.log('✅ Image captured, size:', Math.round(base64Image.length / 1024), 'KB');

        // Stop camera
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }

        // Hide modal
        modal.classList.add('hidden');

        // Display preview and save
        if (window.displayWitnessImagePreview) {
          window.displayWitnessImagePreview(type, base64Image);
        }

        // Save to server
        if (window.saveWitnessImageData) {
          try {
            await window.saveWitnessImageData(type, base64Image);
            if (window.showToast) {
              window.showToast(`บันทึก${type === 'witnessPhoto' ? 'รูปถ่ายพยาน' : 'บัตรประชาชนพยาน'}สำเร็จ`, 'success');
            }
          } catch (error) {
            console.error('❌ Failed to save image:', error);
            if (window.showToast) {
              window.showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ', 'error');
            }
          }
        }

        // Update witness data in global manager
        if (window.updateWitnessDataInGlobalManager) {
          window.updateWitnessDataInGlobalManager();
        }
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = function() {
        console.log('❌ Close button clicked');
        modal.classList.add('hidden');
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      };
    }
  };

  // Replace the original function if it exists
  if (window.showWitnessCameraModal) {
    window.showWitnessCameraModalOriginal = window.showWitnessCameraModal;
    window.showWitnessCameraModal = window.showWitnessCameraModalFixed;
    console.log('✅ Replaced showWitnessCameraModal with fixed version');
  }

  // Also make sure these functions are available globally
  window.captureWitnessPhoto = async function(type) {
    console.log('📸 captureWitnessPhoto called for type:', type);

    const modalId = type === 'witnessPhoto' ? 'witnessPhotoCameraModal' : 'witnessIdCardCameraModal';
    const videoId = type === 'witnessPhoto' ? 'witnessPhotoVideo' : 'witnessIdCardVideo';
    const canvasId = type === 'witnessPhoto' ? 'witnessPhotoCanvas' : 'witnessIdCardCanvas';

    const modal = document.getElementById(modalId);
    const video = document.getElementById(videoId);
    const canvas = document.getElementById(canvasId);

    if (!video || !canvas) {
      console.error('❌ Video or canvas not found');
      return;
    }

    try {
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      console.log('✅ Image captured, size:', Math.round(base64Image.length / 1024), 'KB');

      // Stop camera
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }

      // Hide modal
      if (modal) {
        modal.classList.add('hidden');
      }

      // Display preview and save
      if (window.displayWitnessImagePreview) {
        window.displayWitnessImagePreview(type, base64Image);
      }

      // Save to server
      if (window.saveWitnessImageData) {
        try {
          await window.saveWitnessImageData(type, base64Image);
          if (window.showToast) {
            window.showToast(`บันทึก${type === 'witnessPhoto' ? 'รูปถ่ายพยาน' : 'บัตรประชาชนพยาน'}สำเร็จ`, 'success');
          }
        } catch (error) {
          console.error('❌ Failed to save image:', error);
          if (window.showToast) {
            window.showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ', 'error');
          }
        }
      }

      // Update witness data in global manager
      if (window.updateWitnessDataInGlobalManager) {
        window.updateWitnessDataInGlobalManager();
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      if (window.showToast) {
        window.showToast('เกิดข้อผิดพลาดในการถ่ายรูป', 'error');
      }
    }
  };

  // Global utility function to ensure witness modal exists
  window.ensureWitnessModalExists = function(type) {
    type = type || 'witnessPhoto';
    console.log(`🔍 Ensuring ${type} modal exists...`);

    const modalId = type === 'witnessPhoto' ? 'witnessPhotoCameraModal' : 'witnessIdCardCameraModal';
    const existingModal = document.getElementById(modalId);

    console.log(`📊 Modal ${modalId} status:`, {
      exists: !!existingModal,
      type: type,
      documentReady: document.readyState
    });

    if (!existingModal) {
      console.log(`📱 Creating ${modalId} on demand...`);

      if (type === 'witnessPhoto') {
        createWitnessPhotoModal();
      } else if (type === 'witnessIdCard') {
        createWitnessIdCardModal();
      }

      // Verify creation was successful
      const newModal = document.getElementById(modalId);
      if (newModal) {
        console.log(`✅ Successfully created ${modalId}`);
      } else {
        console.error(`❌ Failed to create ${modalId}`);
      }

      return true; // Modal was created
    } else {
      console.log(`✅ Modal ${modalId} already exists`);
    }

    return false; // Modal already existed
  };

  // Initialize when DOM is ready
  waitForDOM(function() {
    console.log('📋 DOM ready, checking witness modals...');
    checkAndFixWitnessModal();

    // Check again after a short delay to handle dynamic content
    setTimeout(checkAndFixWitnessModal, 500);
  });

  // Also check immediately in case DOM is already loaded
  if (document.readyState !== 'loading') {
    checkAndFixWitnessModal();
  }

  console.log('✅ Witness photo modal fix initialized');
})();