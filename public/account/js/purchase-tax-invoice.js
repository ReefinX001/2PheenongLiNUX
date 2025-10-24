// Purchase Tax Invoice Data Management
// ระบบจัดการข้อมูลใบกำกับภาษีซื้อ

class PurchaseTaxInvoiceManager {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalItems = 0;
    this.allTaxInvoiceData = [];
    this.filteredData = [];
    this.token = localStorage.getItem('authToken');
  }

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return 'ไม่มีข้อมูล';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatCurrency(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatTaxId(taxId) {
    if (!taxId) return '-';
    return taxId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
  }

  getTypeLabel(type) {
    const labels = {
      'purchase_order': 'ใบสั่งซื้อ',
      'asset': 'สินทรัพย์',
      'expense': 'ค่าใช้จ่าย',
      'tax_invoice': 'ใบกำกับภาษี'
    };
    return labels[type] || type;
  }

  // API functions
  async fetchTaxInvoiceData() {
    try {
      this.showLoading(true);

      // Fetch data from multiple sources with individual error handling
      const results = await Promise.allSettled([
        this.fetchPurchaseOrdersWithTax(),
        this.fetchAssetsWithTax(),
        this.fetchExpenseRecordsWithTax(),
        this.fetchTaxInvoices()
      ]);

      // Extract successful results and log failures
      const [purchaseOrders, assets, expenseRecords, taxInvoices] = results.map((result, index) => {
        const sources = ['Purchase Orders', 'Assets', 'Expense Records', 'Tax Invoices'];
        const endpoints = ['/api/purchase-order', '/api/assets', '/api/expense-records', '/api/tax-invoice'];

        if (result.status === 'fulfilled') {
          console.log(`✅ Successfully fetched ${sources[index]} (${result.value.length} items)`);
          return result.value;
        } else {
          console.warn(`❌ Failed to fetch ${sources[index]} from ${endpoints[index]}:`, result.reason.message);
          return []; // Return empty array for failed requests
        }
      });

      // Combine and format data
      this.allTaxInvoiceData = [
        ...purchaseOrders,
        ...assets,
        ...expenseRecords,
        ...taxInvoices
      ];

      // If no data from any source, show sample data for demonstration
      if (this.allTaxInvoiceData.length === 0) {
        console.log('🎭 No data from APIs, showing sample data for demonstration');
        this.allTaxInvoiceData = this.getSampleData();
        this.showDemoNotice(true);
      } else {
        console.log(`📊 Total data loaded: ${this.allTaxInvoiceData.length} items`);
        this.showDemoNotice(false);
      }

      // Sort by date (newest first)
      this.allTaxInvoiceData.sort((a, b) => new Date(b.date) - new Date(a.date));

      this.filteredData = [...this.allTaxInvoiceData];
      this.totalItems = this.filteredData.length;

      this.renderTable();
      this.updatePagination();

    } catch (error) {
      console.error('Error fetching tax invoice data:', error);
      this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');

      // Show sample data as fallback
      this.allTaxInvoiceData = this.getSampleData();
      this.filteredData = [...this.allTaxInvoiceData];
      this.totalItems = this.filteredData.length;
      this.showDemoNotice(true);
      this.renderTable();
      this.updatePagination();
    } finally {
      this.showLoading(false);
    }
  }

  async fetchPurchaseOrdersWithTax() {
    try {
      console.log('🔄 Fetching Purchase Orders from /api/purchase-order');
      const response = await fetch('/api/purchase-order', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch purchase orders');

      const data = await response.json();

      if (data.success && data.data) {
        return data.data
          .filter(po => po.items && po.items.some(item =>
            item.taxType !== 'ไม่มีภาษี' && (item.taxAmount > 0 || item.taxRate > 0)
          ))
          .map(po => ({
            id: po._id,
            type: 'purchase_order',
            date: po.docDate || po.createdAt,
            taxInvoiceNumber: po.documentNumber || po.poNumber,
            documentNumber: po.poNumber,
            supplierName: po.supplier?.name || 'ไม่ระบุ',
            supplierTaxId: po.supplier?.taxId || '',
            description: po.items?.map(item => item.name).join(', ') || 'รายการสินค้า',
            beforeTaxAmount: po.items?.reduce((sum, item) => sum + (item.netAmount || 0), 0) || 0,
            exemptAmount: 0,
            taxAmount: po.items?.reduce((sum, item) => sum + (item.taxAmount || 0), 0) || 0,
            totalAmount: po.totalAmount || 0,
            status: po.status || 'pending'
          }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  }

  async fetchAssetsWithTax() {
    try {
      console.log('🔄 Fetching Assets from /api/assets');
      const response = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch assets');

      const data = await response.json();

      if (data.success && data.data) {
        return data.data
          .filter(asset => asset.taxType !== 'no_tax' && asset.vatAmount > 0)
          .map(asset => ({
            id: asset._id,
            type: 'asset',
            date: asset.purchaseDate,
            taxInvoiceNumber: asset.documentNumber,
            documentNumber: asset.assetNumber,
            supplierName: asset.supplier?.name || 'ไม่ระบุ',
            supplierTaxId: asset.supplier?.taxId || '',
            description: asset.name || 'สินทรัพย์',
            beforeTaxAmount: asset.totalPrice || 0,
            exemptAmount: 0,
            taxAmount: asset.vatAmount || 0,
            totalAmount: asset.finalTotal || 0,
            status: 'confirmed'
          }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching assets:', error);
      return [];
    }
  }

  async fetchExpenseRecordsWithTax() {
    try {
      console.log('🔄 Fetching Expense Records from /api/expense-records');
      const response = await fetch('/api/expense-records', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch expense records');

      const data = await response.json();

      if (data.success && data.data) {
        return data.data
          .filter(expense => expense.vat > 0)
          .map(expense => ({
            id: expense._id,
            type: 'expense',
            date: expense.recordDate,
            taxInvoiceNumber: expense.recordId,
            documentNumber: expense.referenceNumber || expense.recordId,
            supplierName: expense.payee || 'ไม่ระบุ',
            supplierTaxId: '',
            description: expense.description || expense.expenseType,
            beforeTaxAmount: expense.amount || 0,
            exemptAmount: 0,
            taxAmount: expense.vat || 0,
            totalAmount: expense.netAmount || 0,
            status: expense.status === 'อนุมัติแล้ว' ? 'approved' : 'pending'
          }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching expense records:', error);
      return [];
    }
  }

  async fetchTaxInvoices() {
    try {
      console.log('🔄 Fetching Tax Invoices from /api/tax-invoice');
      const response = await fetch('/api/tax-invoice', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch tax invoices');

      const data = await response.json();

      if (data.success && data.data) {
        return data.data.map(invoice => ({
          id: invoice._id,
          type: 'tax_invoice',
          date: invoice.issueDate || invoice.createdAt,
          taxInvoiceNumber: invoice.taxInvoiceNumber,
          documentNumber: invoice.contractNo || invoice.invoiceNumber,
          supplierName: invoice.customer?.name || 'ไม่ระบุ',
          supplierTaxId: invoice.customer?.taxId || invoice.customer?.tax_id || '',
          description: invoice.items?.map(item => item.name).join(', ') || 'รายการสินค้า',
          beforeTaxAmount: invoice.summary?.beforeTax || invoice.calculation?.beforeTax || 0,
          exemptAmount: 0,
          taxAmount: invoice.summary?.vatAmount || invoice.calculation?.vatAmount || 0,
          totalAmount: invoice.summary?.totalWithTax || invoice.calculation?.totalAmount || 0,
          status: 'confirmed'
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching tax invoices:', error);
      return [];
    }
  }

  // UI functions
  showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const tableContainer = document.getElementById('taxInvoiceTable');
    const emptyState = document.getElementById('emptyState');

    if (show) {
      loadingState?.classList.remove('hidden');
      tableContainer?.classList.add('hidden');
      emptyState?.classList.add('hidden');
    } else {
      loadingState?.classList.add('hidden');
      tableContainer?.classList.remove('hidden');
    }
  }

  showError(message) {
    alert(`❌ ${message}`);
  }

  showDemoNotice(show) {
    const demoNotice = document.getElementById('demoNotice');
    if (demoNotice) {
      if (show) {
        demoNotice.classList.remove('hidden');
      } else {
        demoNotice.classList.add('hidden');
      }
    }
  }

  renderTable() {
    const tbody = document.getElementById('taxInvoiceTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('taxInvoiceTable');

    if (!tbody) return;

    if (this.filteredData.length === 0) {
      tableContainer?.classList.add('hidden');
      emptyState?.classList.remove('hidden');
      this.updateSummary();
      return;
    }

    tableContainer?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageData = this.filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = pageData.map((item, index) => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-600">
        <td>${startIndex + index + 1}</td>
        <td>${this.formatDate(item.date)}</td>
        <td>
          <span class="font-medium text-blue-600 dark:text-blue-400">${item.taxInvoiceNumber}</span>
          <div class="text-xs text-gray-500">${this.getTypeLabel(item.type)}</div>
        </td>
        <td>${item.documentNumber || '-'}</td>
        <td>
          <div class="font-medium">${item.supplierName}</div>
          ${item.supplierTaxId ? `<div class="text-xs text-gray-500">${this.formatTaxId(item.supplierTaxId)}</div>` : ''}
        </td>
        <td>${this.formatTaxId(item.supplierTaxId)}</td>
        <td>
          <div class="max-w-xs truncate" title="${item.description}">
            ${item.description}
          </div>
        </td>
        <td class="text-right">${this.formatCurrency(item.beforeTaxAmount)}</td>
        <td class="text-right">${this.formatCurrency(item.exemptAmount)}</td>
        <td class="text-right font-medium text-green-600">${this.formatCurrency(item.taxAmount)}</td>
        <td class="text-center">
          <button onclick="taxInvoiceManager.viewDetails('${item.id}', '${item.type}')" 
                  class="btn btn-sm btn-outline-primary">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');

    this.updateSummary();
  }

  updatePagination() {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    // Update pagination UI here if needed
    console.log(`Total pages: ${totalPages}, Current page: ${this.currentPage}`);
  }

  updateSummary() {
    // Calculate totals from filtered data
    const totals = this.filteredData.reduce((acc, item) => {
      acc.beforeTax += parseFloat(item.beforeTaxAmount) || 0;
      acc.exempt += parseFloat(item.exemptAmount) || 0;
      acc.tax += parseFloat(item.taxAmount) || 0;
      acc.records += 1;
      return acc;
    }, { beforeTax: 0, exempt: 0, tax: 0, records: 0 });

    // Update summary display
    const totalBeforeTaxEl = document.getElementById('totalBeforeTax');
    const totalExemptEl = document.getElementById('totalExempt');
    const totalTaxEl = document.getElementById('totalTax');
    const totalRecordsEl = document.getElementById('totalRecords');

    if (totalBeforeTaxEl) totalBeforeTaxEl.textContent = this.formatCurrency(totals.beforeTax);
    if (totalExemptEl) totalExemptEl.textContent = this.formatCurrency(totals.exempt);
    if (totalTaxEl) totalTaxEl.textContent = this.formatCurrency(totals.tax);
    if (totalRecordsEl) totalRecordsEl.textContent = totals.records.toLocaleString('th-TH');
  }

  viewDetails(id, type) {
    console.log(`View details for ${type} with id: ${id}`);
    alert(`ดูรายละเอียด ${this.getTypeLabel(type)} ID: ${id}`);
  }

  // Filter functions
  filterDataByDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    this.filteredData = this.allTaxInvoiceData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });

    this.totalItems = this.filteredData.length;
    this.currentPage = 1;
    this.renderTable();
    this.updatePagination();
  }

  // Search functionality
  searchTaxInvoices(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.allTaxInvoiceData];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredData = this.allTaxInvoiceData.filter(item =>
        item.taxInvoiceNumber.toLowerCase().includes(term) ||
        item.supplierName.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        (item.supplierTaxId && item.supplierTaxId.includes(term))
      );
    }

    this.totalItems = this.filteredData.length;
    this.currentPage = 1;
    this.renderTable();
    this.updatePagination();
  }

  // Sample data for demonstration when APIs are not available
  getSampleData() {
    return [
      {
        id: 'sample-1',
        type: 'purchase_order',
        date: new Date('2024-12-15'),
        taxInvoiceNumber: 'PP-680500020',
        documentNumber: 'PO-2024-001',
        supplierName: 'บริษัท แอดวานซ์ ไวร์เลส เน็ทเวอร์ค จำกัด',
        supplierTaxId: '0105548115897',
        description: 'ค่าโทรศัพท์สำนักงาน',
        beforeTaxAmount: 250.00,
        exemptAmount: 0.00,
        taxAmount: 17.50,
        totalAmount: 267.50,
        status: 'confirmed'
      },
      {
        id: 'sample-2',
        type: 'asset',
        date: new Date('2024-12-14'),
        taxInvoiceNumber: 'IX00244-6804-000018',
        documentNumber: 'AS-2024-001',
        supplierName: 'บริษัท เจ.ไอ.บี. คอมพิวเตอร์ กรุ๊ป จำกัด',
        supplierTaxId: '0135544005281',
        description: 'ชุดคอมพิวเตอร์',
        beforeTaxAmount: 156990.65,
        exemptAmount: 0.00,
        taxAmount: 10989.35,
        totalAmount: 167980.00,
        status: 'confirmed'
      },
      {
        id: 'sample-3',
        type: 'expense',
        date: new Date('2024-12-13'),
        taxInvoiceNumber: '0000001974',
        documentNumber: 'EX-2024-001',
        supplierName: 'บริษัท มิตสแอล ดี.ไอ.วาย. (กรุงเทพ) จำกัด',
        supplierTaxId: '0105558162529',
        description: 'อุปกรณ์ทำความสะอาด',
        beforeTaxAmount: 1779.44,
        exemptAmount: 0.00,
        taxAmount: 124.56,
        totalAmount: 1904.00,
        status: 'approved'
      },
      {
        id: 'sample-4',
        type: 'tax_invoice',
        date: new Date('2024-12-12'),
        taxInvoiceNumber: '17758',
        documentNumber: 'TI-2024-001',
        supplierName: 'บริษัท วีพี อินโนเทค จำกัด',
        supplierTaxId: '0105567196937',
        description: 'ค่าธรรมเนียม ต่ออายุ SERVER',
        beforeTaxAmount: 1400.00,
        exemptAmount: 0.00,
        taxAmount: 98.00,
        totalAmount: 1498.00,
        status: 'confirmed'
      },
      {
        id: 'sample-5',
        type: 'purchase_order',
        date: new Date('2024-12-11'),
        taxInvoiceNumber: 'PP-680500025',
        documentNumber: 'PO-2024-002',
        supplierName: 'บริษัท โมบิ โมบิ รีเทล คอร์ปอเรชั่น จำกัด (มหาชน)',
        supplierTaxId: '0107565000387',
        description: 'ซื้อของแถม',
        beforeTaxAmount: 397.20,
        exemptAmount: 0.00,
        taxAmount: 27.80,
        totalAmount: 425.00,
        status: 'pending'
      }
    ];
  }

  // Initialize the manager
  init() {
    this.fetchTaxInvoiceData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('input[placeholder*="ค้นหาใบกำกับภาษีซื้อ"]');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchTaxInvoices(searchInput.value);
        }, 300);
      });
    }

    // Date picker functionality
    const applyDatePicker = document.getElementById('applyDatePicker');
    if (applyDatePicker) {
      applyDatePicker.addEventListener('click', () => {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        if (startDate && endDate) {
          this.filterDataByDateRange(startDate, endDate);
        }
      });
    }
  }
}

// Global instance
let taxInvoiceManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  taxInvoiceManager = new PurchaseTaxInvoiceManager();
  taxInvoiceManager.init();
});
