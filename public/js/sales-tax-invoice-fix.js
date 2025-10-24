// Sales Tax Invoice Data Loading and Display
let taxInvoiceData = [];

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 Sales Tax Invoice page loaded');
  loadTaxInvoices();
});

async function loadTaxInvoices() {
  try {
    console.log('📋 Loading tax invoices...');

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('ไม่พบโทเค็นสำหรับยืนยันตัวตน');
    }

    const response = await fetch('/api/tax-invoice?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Tax Invoice API Response:', result);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers);

    if (result.success && result.data) {
      taxInvoiceData = result.data;
      console.log(`✅ โหลดข้อมูล Tax Invoice สำเร็จ: ${taxInvoiceData.length} รายการ`);
      console.log('📋 Sample data:', taxInvoiceData[0]);
      renderTable(taxInvoiceData);
    } else {
      console.error('❌ API ไม่ส่งข้อมูลกลับมา:', result);
      console.error('❌ Result structure:', Object.keys(result || {}));
      taxInvoiceData = [];
      renderTable([]);
    }

  } catch (error) {
    console.error('❌ Error loading tax invoices:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Show error message to user
    const tbody = document.getElementById('invoiceTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-red-500 py-8">
            <div class="flex flex-col items-center">
              <i class="bi bi-exclamation-triangle text-4xl text-red-400 mb-2"></i>
              <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
              <p class="text-sm text-gray-500 mt-1">${error.message}</p>
              <button onclick="loadTaxInvoices()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                ลองใหม่
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    taxInvoiceData = [];
  }
}

function renderTable(data) {
  const tbody = document.getElementById('invoiceTableBody');
  const totalAmountEl = document.getElementById('totalAmount');
  const totalTaxEl = document.getElementById('totalTax');

  if (!tbody) {
    console.error('❌ ไม่พบ invoiceTableBody element');
    return;
  }

  // Clear existing rows
  tbody.innerHTML = '';

  let totalAmount = 0;
  let totalTax = 0;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-gray-500 py-8">
          <div class="flex flex-col items-center">
            <i class="bi bi-receipt text-4xl text-gray-400 mb-2"></i>
            <p>ไม่พบข้อมูลใบกำกับภาษีขาย</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    data.forEach(invoice => {
      // Extract data from TaxInvoice structure
      const issueDate = new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('th-TH');
      const taxInvoiceNumber = invoice.taxInvoiceNumber || '-';
      const customerName = invoice.customer?.name || 'ไม่ระบุ';
      const customerTaxId = invoice.customer?.taxId || invoice.customer?.tax_id || '-';

      // Get product details
      const productDetails = invoice.items?.map(item => item.name || item.product).join(', ') || 'ไม่ระบุ';

      // Calculate amounts from summary or calculation
      const beforeTaxAmount = invoice.summary?.beforeTax || invoice.calculation?.beforeTax || 0;
      const vatAmount = invoice.summary?.vatAmount || invoice.calculation?.vatAmount || 0;

      console.log(`📋 Invoice ${taxInvoiceNumber}:`, {
        beforeTax: beforeTaxAmount,
        vatAmount: vatAmount,
        summary: invoice.summary,
        calculation: invoice.calculation
      });

      totalAmount += beforeTaxAmount;
      totalTax += vatAmount;

      const row = document.createElement('tr');
      row.classList.add('hover:bg-gray-50', 'dark:hover:bg-gray-600');

      row.innerHTML = `
        <td class="text-sm">${issueDate}</td>
        <td class="text-sm">
          <a href="/api/tax-invoice/${taxInvoiceNumber}.pdf" target="_blank" class="text-blue-500 hover:underline">
            ${taxInvoiceNumber}
          </a>
        </td>
        <td class="text-sm">${customerName}</td>
        <td class="text-sm">${customerTaxId}</td>
        <td class="text-sm">${productDetails}</td>
        <td class="text-right text-sm">฿${beforeTaxAmount.toFixed(2)}</td>
        <td class="text-right text-sm">฿${vatAmount.toFixed(2)}</td>
      `;

      tbody.appendChild(row);
    });
  }

  // Update totals
  if (totalAmountEl) {
    totalAmountEl.textContent = totalAmount.toFixed(2);
  }
  if (totalTaxEl) {
    totalTaxEl.textContent = totalTax.toFixed(2);
  }

  console.log(`💰 รวมยอดสินค้า: ฿${totalAmount.toFixed(2)}, รวมภาษี: ฿${totalTax.toFixed(2)}`);
}

// Export functions for global access
window.loadTaxInvoices = loadTaxInvoices;
window.renderTable = renderTable;
