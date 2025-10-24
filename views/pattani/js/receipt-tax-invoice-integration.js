// Receipt and Tax Invoice Integration
console.log('📄 Receipt/Tax Invoice Integration loaded');

const ReceiptTaxInvoiceIntegration = {
  // Initialize the integration
  init: function() {
    console.log('🔧 Initializing Receipt/Tax Invoice Integration');
    this.bindEvents();
  },

  // Bind event handlers
  bindEvents: function() {
    // Add event listeners for receipt/tax invoice related actions
    document.addEventListener('generateReceipt', this.handleReceiptGeneration.bind(this));
    document.addEventListener('generateTaxInvoice', this.handleTaxInvoiceGeneration.bind(this));
  },

  // Handle receipt generation
  handleReceiptGeneration: async function(event) {
    const data = event.detail;
    console.log('📝 Generating receipt:', data);

    try {
      // Call API to generate receipt
      const response = await fetch('/api/receipt/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }

      const result = await response.json();
      console.log('✅ Receipt generated:', result);
      return result;
    } catch (error) {
      console.error('❌ Receipt generation error:', error);
      throw error;
    }
  },

  // Handle tax invoice generation
  handleTaxInvoiceGeneration: async function(event) {
    const data = event.detail;
    console.log('📝 Generating tax invoice:', data);

    try {
      // Call API to generate tax invoice
      const response = await fetch('/api/taxinvoice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to generate tax invoice');
      }

      const result = await response.json();
      console.log('✅ Tax invoice generated:', result);
      return result;
    } catch (error) {
      console.error('❌ Tax invoice generation error:', error);
      throw error;
    }
  },

  // Generate both receipt and tax invoice
  generateBoth: async function(orderData) {
    console.log('📄 Generating both receipt and tax invoice');

    try {
      const [receipt, taxInvoice] = await Promise.all([
        this.generateReceipt(orderData),
        this.generateTaxInvoice(orderData)
      ]);

      return {
        receipt,
        taxInvoice,
        success: true
      };
    } catch (error) {
      console.error('❌ Error generating documents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Generate receipt only
  generateReceipt: async function(orderData) {
    const event = new CustomEvent('generateReceipt', { detail: orderData });
    document.dispatchEvent(event);
    return await this.handleReceiptGeneration(event);
  },

  // Generate tax invoice only
  generateTaxInvoice: async function(orderData) {
    const event = new CustomEvent('generateTaxInvoice', { detail: orderData });
    document.dispatchEvent(event);
    return await this.handleTaxInvoiceGeneration(event);
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ReceiptTaxInvoiceIntegration.init();
  });
} else {
  ReceiptTaxInvoiceIntegration.init();
}

// Export for use in other modules
window.ReceiptTaxInvoiceIntegration = ReceiptTaxInvoiceIntegration;