// Document Upload Handler
console.log('📄 Document Upload Handler loaded');

const DocumentUploadHandler = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  uploadedFiles: [],

  // Initialize
  init: function() {
    console.log('🔧 Initializing Document Upload Handler');
    this.bindEvents();
  },

  // Bind events
  bindEvents: function() {
    const uploadInputs = document.querySelectorAll('[data-document-upload]');
    uploadInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleFileSelect(e));
    });

    // Drag and drop
    const dropZones = document.querySelectorAll('[data-drop-zone]');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => this.handleDragOver(e));
      zone.addEventListener('drop', (e) => this.handleDrop(e));
      zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    });
  },

  // Handle file selection
  handleFileSelect: function(event) {
    const files = event.target.files;
    this.processFiles(files, event.target);
  },

  // Handle drag over
  handleDragOver: function(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  },

  // Handle drag leave
  handleDragLeave: function(event) {
    event.currentTarget.classList.remove('drag-over');
  },

  // Handle drop
  handleDrop: function(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    const input = event.currentTarget.querySelector('[data-document-upload]');
    this.processFiles(files, input);
  },

  // Process files
  processFiles: function(files, inputElement) {
    Array.from(files).forEach(file => {
      if (this.validateFile(file)) {
        this.uploadFile(file, inputElement);
      }
    });
  },

  // Validate file
  validateFile: function(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`);
      return false;
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      alert(`ไฟล์ ${file.name} เป็นประเภทที่ไม่รองรับ`);
      return false;
    }

    return true;
  },

  // Upload file
  uploadFile: async function(file, inputElement) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', inputElement.dataset.documentType || 'general');

    // Show progress
    const progressBar = this.createProgressBar(file.name);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          this.updateProgress(progressBar, percentCompleted);
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('✅ File uploaded:', result);

      this.uploadedFiles.push(result);
      this.displayUploadedFile(result, inputElement);
      this.removeProgressBar(progressBar);

      // Trigger custom event
      const event = new CustomEvent('documentUploaded', { detail: result });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`เกิดข้อผิดพลาดในการอัพโหลดไฟล์`);
      this.removeProgressBar(progressBar);
    }
  },

  // Create progress bar
  createProgressBar: function(fileName) {
    const container = document.getElementById('uploadProgress') || this.createProgressContainer();

    const progressDiv = document.createElement('div');
    progressDiv.className = 'upload-progress-item';
    progressDiv.innerHTML = `
      <div class="file-name">${fileName}</div>
      <div class="progress">
        <div class="progress-bar" style="width: 0%"></div>
      </div>
      <div class="progress-text">0%</div>
    `;

    container.appendChild(progressDiv);
    return progressDiv;
  },

  // Create progress container
  createProgressContainer: function() {
    const container = document.createElement('div');
    container.id = 'uploadProgress';
    container.className = 'upload-progress-container';
    document.body.appendChild(container);
    return container;
  },

  // Update progress
  updateProgress: function(progressBar, percentage) {
    const bar = progressBar.querySelector('.progress-bar');
    const text = progressBar.querySelector('.progress-text');

    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}%`;
  },

  // Remove progress bar
  removeProgressBar: function(progressBar) {
    setTimeout(() => {
      progressBar.remove();
    }, 1000);
  },

  // Display uploaded file
  displayUploadedFile: function(fileData, inputElement) {
    const container = inputElement.closest('.form-group').querySelector('.uploaded-files') ||
                     this.createUploadedFilesContainer(inputElement);

    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
      <span class="file-icon">📄</span>
      <span class="file-name">${fileData.filename}</span>
      <button class="remove-file" data-file-id="${fileData.id}">❌</button>
    `;

    // Add remove handler
    fileDiv.querySelector('.remove-file').addEventListener('click', (e) => {
      this.removeFile(fileData.id, fileDiv);
    });

    container.appendChild(fileDiv);
  },

  // Create uploaded files container
  createUploadedFilesContainer: function(inputElement) {
    const container = document.createElement('div');
    container.className = 'uploaded-files';
    inputElement.closest('.form-group').appendChild(container);
    return container;
  },

  // Remove file
  removeFile: function(fileId, fileDiv) {
    if (confirm('ต้องการลบไฟล์นี้หรือไม่?')) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
      fileDiv.remove();

      // Trigger custom event
      const event = new CustomEvent('documentRemoved', { detail: { fileId } });
      document.dispatchEvent(event);
    }
  },

  // Get uploaded files
  getUploadedFiles: function() {
    return this.uploadedFiles;
  },

  // Clear all files
  clearAll: function() {
    this.uploadedFiles = [];
    const containers = document.querySelectorAll('.uploaded-files');
    containers.forEach(c => c.innerHTML = '');
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    DocumentUploadHandler.init();
  });
} else {
  DocumentUploadHandler.init();
}

// Export
window.DocumentUploadHandler = DocumentUploadHandler;