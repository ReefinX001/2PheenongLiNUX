// Document Manager
console.log('📁 Document Manager loaded');

class DocumentManager {
  constructor() {
    this.documents = [];
    this.init();
  }

  init() {
    console.log('🔧 Initializing Document Manager');
    this.loadDocuments();
  }

  // Load documents from storage
  loadDocuments() {
    const stored = localStorage.getItem('documents');
    if (stored) {
      try {
        this.documents = JSON.parse(stored);
        console.log(`📦 Loaded ${this.documents.length} documents`);
      } catch (error) {
        console.error('❌ Error loading documents:', error);
        this.documents = [];
      }
    }
  }

  // Save documents to storage
  saveDocuments() {
    try {
      localStorage.setItem('documents', JSON.stringify(this.documents));
      console.log('✅ Documents saved');
    } catch (error) {
      console.error('❌ Error saving documents:', error);
    }
  }

  // Add document
  addDocument(document) {
    const doc = {
      id: this.generateId(),
      ...document,
      createdAt: new Date().toISOString()
    };

    this.documents.push(doc);
    this.saveDocuments();

    console.log('➕ Document added:', doc);
    return doc;
  }

  // Get document by ID
  getDocument(id) {
    return this.documents.find(doc => doc.id === id);
  }

  // Update document
  updateDocument(id, updates) {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents[index] = {
        ...this.documents[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveDocuments();
      console.log('✏️ Document updated:', this.documents[index]);
      return this.documents[index];
    }
    return null;
  }

  // Delete document
  deleteDocument(id) {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      const deleted = this.documents.splice(index, 1)[0];
      this.saveDocuments();
      console.log('🗑️ Document deleted:', deleted);
      return true;
    }
    return false;
  }

  // Get all documents
  getAllDocuments() {
    return [...this.documents];
  }

  // Get documents by type
  getDocumentsByType(type) {
    return this.documents.filter(doc => doc.type === type);
  }

  // Search documents
  searchDocuments(query) {
    const searchTerm = query.toLowerCase();
    return this.documents.filter(doc => {
      return (
        doc.name?.toLowerCase().includes(searchTerm) ||
        doc.description?.toLowerCase().includes(searchTerm) ||
        doc.type?.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Generate unique ID
  generateId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear all documents
  clearAll() {
    this.documents = [];
    this.saveDocuments();
    console.log('🗑️ All documents cleared');
  }

  // Export documents
  exportDocuments() {
    return JSON.stringify(this.documents, null, 2);
  }

  // Import documents
  importDocuments(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.documents = imported;
        this.saveDocuments();
        console.log(`📥 Imported ${imported.length} documents`);
        return true;
      }
    } catch (error) {
      console.error('❌ Import error:', error);
    }
    return false;
  }

  // Generate document preview
  generatePreview(document) {
    const preview = document.createElement('div');
    preview.className = 'document-preview';
    preview.innerHTML = `
      <div class="preview-header">
        <span class="doc-icon">📄</span>
        <span class="doc-name">${document.name || 'Untitled'}</span>
      </div>
      <div class="preview-body">
        <p class="doc-type">Type: ${document.type || 'Unknown'}</p>
        <p class="doc-size">Size: ${this.formatFileSize(document.size || 0)}</p>
        <p class="doc-date">Created: ${this.formatDate(document.createdAt)}</p>
      </div>
      <div class="preview-actions">
        <button class="btn-view" data-doc-id="${document.id}">👁️ View</button>
        <button class="btn-download" data-doc-id="${document.id}">⬇️ Download</button>
        <button class="btn-delete" data-doc-id="${document.id}">🗑️ Delete</button>
      </div>
    `;
    return preview;
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format date
  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH') + ' ' + date.toLocaleTimeString('th-TH');
  }
}

// Create and export instance
const documentManager = new DocumentManager();
window.DocumentManager = documentManager;

// Also export the class for creating new instances
window.DocumentManagerClass = DocumentManager;