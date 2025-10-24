// public/js/cash-flow.js
// Cash Flow Report Management

const CashFlowManager = {
  // Configuration
  config: {
    apiBase: '/api',
    token: localStorage.getItem('authToken'),
    currentPeriods: [],
    currentData: null
  },

  // Initialize the manager
  init() {
    this.setupEventListeners();
    this.loadCashFlowData();
  },

  // Setup event listeners
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshReport');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadCashFlowData());
    }

    // Export buttons
    const downloadPDF = document.getElementById('downloadPDF');
    if (downloadPDF) {
      downloadPDF.addEventListener('click', () => this.exportPDF());
    }

    const downloadExcel = document.getElementById('downloadExcel');
    if (downloadExcel) {
      downloadExcel.addEventListener('click', () => this.exportExcel());
    }

    // Print button
    const printReport = document.getElementById('printReport');
    if (printReport) {
      printReport.addEventListener('click', () => window.print());
    }
  },

  // Load cash flow data from API
  async loadCashFlowData() {
    const button = document.getElementById('refreshReport');
    const originalContent = button ? button.innerHTML : '';

    try {
      // Show loading state
      if (button) {
        button.innerHTML = '<i class="bi bi-arrow-repeat animate-spin"></i> <span class="ml-1">กำลังโหลด...</span>';
        button.disabled = true;
      }

      // Fetch data from API
      const response = await fetch(`${this.config.apiBase}/reports/cash-flow?months=5`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        this.config.currentData = result.data;
        this.config.currentPeriods = result.data.periods || [];
        this.renderCashFlowTable(result.data);
        this.showNotification('อัพเดตรายงานเรียบร้อย', 'success');
      } else {
        throw new Error(result.message || 'Failed to load data');
      }

    } catch (error) {
      console.error('Error loading cash flow data:', error);
      this.showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');

      // Use fallback static data if API fails
      this.renderStaticData();
    } finally {
      // Restore button state
      if (button) {
        button.innerHTML = originalContent;
        button.disabled = false;
      }
    }
  },

  // Render cash flow table with dynamic data
  renderCashFlowTable(data) {
    const tableContainer = document.getElementById('cashFlowReport');
    if (!tableContainer) return;

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.style.display = 'none';
    }

    // Hide static fallback
    const staticFallback = document.getElementById('staticFallback');
    if (staticFallback) {
      staticFallback.classList.add('hidden');
    }

    const periods = data.periods || [];
    if (periods.length === 0) {
      this.renderStaticData();
      return;
    }

    // Build table HTML
    let tableHTML = `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30">
              <th class="border border-gray-300 dark:border-gray-600 p-2 text-left" style="min-width: 300px;">
                งบกระแสเงินสด (วิธีทางอ้อม)
              </th>`;

    // Add period headers
    periods.forEach(period => {
      tableHTML += `
              <th class="border border-gray-300 dark:border-gray-600 p-2 text-right" style="min-width: 150px;">
                ${period.period}
              </th>`;
    });

    tableHTML += `
            </tr>
          </thead>
          <tbody>`;

    // Operating Activities Section
    tableHTML += this.renderOperatingSection(periods);

    // Investing Activities Section
    tableHTML += this.renderInvestingSection(periods);

    // Financing Activities Section
    tableHTML += this.renderFinancingSection(periods);

    // Summary Section
    tableHTML += this.renderSummarySection(periods);

    tableHTML += `
          </tbody>
        </table>
      </div>`;

    tableContainer.innerHTML = tableHTML;
  },

  // Render Operating Activities section
  renderOperatingSection(periods) {
    let html = `
      <!-- Operating Activities -->
      <tr class="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30">
        <td class="border border-gray-300 dark:border-gray-600 p-2 font-medium">
          <div class="flex items-center">
            <i class="bi bi-briefcase mr-2"></i>
            <span>กระแสเงินสดจากกิจกรรมดำเนินงาน</span>
          </div>
        </td>`;

    periods.forEach(() => {
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2"></td>`;
    });
    html += `</tr>`;

    // Net Income
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">กำไร (ขาดทุน) สุทธิ</td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.netIncome || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Adjustments
    html += `<tr class="bg-gray-50 dark:bg-gray-800">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8 font-medium">
        รายการปรับกระทบกำไรสุทธิเป็นเงินสดรับ (จ่าย)
      </td>`;
    periods.forEach(() => {
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2"></td>`;
    });
    html += `</tr>`;

    // Depreciation
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-12">ค่าเสื่อมราคา</td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.adjustments?.depreciation || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Working Capital Changes
    html += `<tr class="bg-gray-50 dark:bg-gray-800">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8 font-medium">
        สินทรัพย์หมุนเวียน (เพิ่มขึ้น) ลดลง
      </td>`;
    periods.forEach(() => {
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2"></td>`;
    });
    html += `</tr>`;

    // Accounts Receivable
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-12">ลูกหนี้การค้า (เพิ่มขึ้น) ลดลง</td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.workingCapitalChanges?.accountsReceivable || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Inventory
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-12">สินค้าคงเหลือ (เพิ่มขึ้น) ลดลง</td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.workingCapitalChanges?.inventory || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Accounts Payable
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-12">เจ้าหนี้การค้าเพิ่มขึ้น (ลดลง)</td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.workingCapitalChanges?.accountsPayable || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Total Operating
    html += `<tr class="bg-blue-100 dark:bg-blue-900/50 font-bold">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-4">
        กระแสเงินสดสุทธิจากกิจกรรมดำเนินงาน
      </td>`;
    periods.forEach(period => {
      const value = period.data?.operating?.totalOperating || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    return html;
  },

  // Render Investing Activities section
  renderInvestingSection(periods) {
    let html = `
      <!-- Investing Activities -->
      <tr class="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/50 dark:to-green-800/30">
        <td class="border border-gray-300 dark:border-gray-600 p-2 font-medium">
          <div class="flex items-center">
            <i class="bi bi-graph-up-arrow mr-2"></i>
            <span>กระแสเงินสดจากกิจกรรมลงทุน</span>
          </div>
        </td>`;

    periods.forEach(() => {
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2"></td>`;
    });
    html += `</tr>`;

    // Purchase of Assets
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">ซื้อที่ดิน อาคารและอุปกรณ์</td>`;
    periods.forEach(period => {
      const value = -(period.data?.investing?.paid?.purchaseOfAssets || 0);
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Sale of Assets
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">ขายที่ดิน อาคารและอุปกรณ์</td>`;
    periods.forEach(period => {
      const value = period.data?.investing?.received?.saleOfAssets || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Total Investing
    html += `<tr class="bg-green-100 dark:bg-green-900/50 font-bold">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-4">
        กระแสเงินสดสุทธิจากกิจกรรมลงทุน
      </td>`;
    periods.forEach(period => {
      const value = period.data?.investing?.totalInvesting || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    return html;
  },

  // Render Financing Activities section
  renderFinancingSection(periods) {
    let html = `
      <!-- Financing Activities -->
      <tr class="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-purple-800/30">
        <td class="border border-gray-300 dark:border-gray-600 p-2 font-medium">
          <div class="flex items-center">
            <i class="bi bi-bank mr-2"></i>
            <span>กระแสเงินสดจากกิจกรรมจัดหาเงิน</span>
          </div>
        </td>`;

    periods.forEach(() => {
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2"></td>`;
    });
    html += `</tr>`;

    // Loans Received
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">เงินกู้ยืม</td>`;
    periods.forEach(period => {
      const value = period.data?.financing?.received?.loans || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Loan Repayments
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">ชำระคืนเงินกู้</td>`;
    periods.forEach(period => {
      const value = -(period.data?.financing?.paid?.loanRepayments || 0);
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Dividends Paid
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-8">เงินปันผลจ่าย</td>`;
    periods.forEach(period => {
      const value = -(period.data?.financing?.paid?.dividends || 0);
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Total Financing
    html += `<tr class="bg-purple-100 dark:bg-purple-900/50 font-bold">
      <td class="border border-gray-300 dark:border-gray-600 p-2 pl-4">
        กระแสเงินสดสุทธิจากกิจกรรมจัดหาเงิน
      </td>`;
    periods.forEach(period => {
      const value = period.data?.financing?.totalFinancing || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    return html;
  },

  // Render Summary section
  renderSummarySection(periods) {
    let html = `
      <!-- Summary -->
      <tr class="bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/50 dark:to-yellow-800/30 font-bold">
        <td class="border border-gray-300 dark:border-gray-600 p-2">
          เงินสดและรายการเทียบเท่าเงินสดเพิ่มขึ้น (ลดลง) สุทธิ
        </td>`;
    periods.forEach(period => {
      const value = period.data?.summary?.netCashFlow || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Beginning Cash
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="border border-gray-300 dark:border-gray-600 p-2">
        เงินสดและรายการเทียบเท่าเงินสดต้นงวด
      </td>`;
    periods.forEach(period => {
      const value = period.data?.summary?.beginningCash || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    // Ending Cash
    html += `<tr class="bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/50 dark:to-yellow-800/30 font-bold">
      <td class="border border-gray-300 dark:border-gray-600 p-2">
        เงินสดและรายการเทียบเท่าเงินสดปลายงวด
      </td>`;
    periods.forEach(period => {
      const value = period.data?.summary?.endingCash || 0;
      html += `<td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-mono">
        ${this.formatCurrency(value)}
      </td>`;
    });
    html += `</tr>`;

    return html;
  },

  // Render static data (fallback)
  renderStaticData() {
    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.style.display = 'none';
    }

    // Show static fallback
    const staticFallback = document.getElementById('staticFallback');
    if (staticFallback) {
      staticFallback.classList.remove('hidden');
    }

    console.log('Using static data as fallback');
  },

  // Format currency
  formatCurrency(value) {
    if (value === 0) return '0.00';
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return isNegative ? `(${formatted})` : formatted;
  },

  // Export to PDF
  async exportPDF() {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        console.error('jsPDF not loaded');
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      // Add title
      doc.setFontSize(18);
      doc.text('งบกระแสเงินสด (วิธีทางอ้อม)', 148, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text('บริษัท 2 พี่น้อง จำกัด', 148, 22, { align: 'center' });

      // Add date range
      if (this.config.currentPeriods.length > 0) {
        const firstPeriod = this.config.currentPeriods[this.config.currentPeriods.length - 1];
        const lastPeriod = this.config.currentPeriods[0];
        doc.text(`ระหว่างวันที่ ${firstPeriod.period} ถึง ${lastPeriod.period}`, 148, 28, { align: 'center' });
      }

      // Convert table to image and add to PDF
      const element = document.getElementById('cashFlowReport');
      if (element && window.html2canvas) {
        const canvas = await window.html2canvas(element);
        const imgData = canvas.toDataURL('image/png');

        const imgWidth = 277; // A4 landscape width - margins
        const pageHeight = 190;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 35;

        // Add image to first page
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - position;

        // Add new pages if content is too long
        while (heightLeft >= 0) {
          position = 10;
          doc.addPage();
          doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      // Save the PDF
      doc.save('งบกระแสเงินสด.pdf');
      this.showNotification('ดาวน์โหลด PDF เรียบร้อย', 'success');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.showNotification('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    }
  },

  // Export to Excel
  async exportExcel() {
    try {
      if (!window.XLSX) {
        console.error('XLSX library not loaded');
        return;
      }

      const data = this.config.currentData;
      if (!data || !data.periods) {
        this.showNotification('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
        return;
      }

      // Prepare data for Excel
      const excelData = [
        ['งบกระแสเงินสด (วิธีทางอ้อม)'],
        ['บริษัท 2 พี่น้อง จำกัด'],
        [''],
        ['รายการ', ...data.periods.map(p => p.period)],
        [''],
        ['กระแสเงินสดจากกิจกรรมดำเนินงาน'],
        ['กำไร (ขาดทุน) สุทธิ', ...data.periods.map(p => p.data.operating.netIncome || 0)],
        ['รายการปรับกระทบ'],
        ['  ค่าเสื่อมราคา', ...data.periods.map(p => p.data.operating.adjustments.depreciation || 0)],
        ['การเปลี่ยนแปลงในสินทรัพย์และหนี้สินดำเนินงาน'],
        ['  ลูกหนี้การค้า (เพิ่มขึ้น) ลดลง', ...data.periods.map(p => p.data.operating.workingCapitalChanges.accountsReceivable || 0)],
        ['  สินค้าคงเหลือ (เพิ่มขึ้น) ลดลง', ...data.periods.map(p => p.data.operating.workingCapitalChanges.inventory || 0)],
        ['  เจ้าหนี้การค้าเพิ่มขึ้น (ลดลง)', ...data.periods.map(p => p.data.operating.workingCapitalChanges.accountsPayable || 0)],
        ['กระแสเงินสดสุทธิจากกิจกรรมดำเนินงาน', ...data.periods.map(p => p.data.operating.totalOperating || 0)],
        [''],
        ['กระแสเงินสดจากกิจกรรมลงทุน'],
        ['  ซื้อที่ดิน อาคารและอุปกรณ์', ...data.periods.map(p => -(p.data.investing.paid.purchaseOfAssets || 0))],
        ['  ขายที่ดิน อาคารและอุปกรณ์', ...data.periods.map(p => p.data.investing.received.saleOfAssets || 0)],
        ['กระแสเงินสดสุทธิจากกิจกรรมลงทุน', ...data.periods.map(p => p.data.investing.totalInvesting || 0)],
        [''],
        ['กระแสเงินสดจากกิจกรรมจัดหาเงิน'],
        ['  เงินกู้ยืม', ...data.periods.map(p => p.data.financing.received.loans || 0)],
        ['  ชำระคืนเงินกู้', ...data.periods.map(p => -(p.data.financing.paid.loanRepayments || 0))],
        ['  เงินปันผลจ่าย', ...data.periods.map(p => -(p.data.financing.paid.dividends || 0))],
        ['กระแสเงินสดสุทธิจากกิจกรรมจัดหาเงิน', ...data.periods.map(p => p.data.financing.totalFinancing || 0)],
        [''],
        ['เงินสดและรายการเทียบเท่าเงินสดเพิ่มขึ้น (ลดลง) สุทธิ', ...data.periods.map(p => p.data.summary.netCashFlow || 0)],
        ['เงินสดและรายการเทียบเท่าเงินสดต้นงวด', ...data.periods.map(p => p.data.summary.beginningCash || 0)],
        ['เงินสดและรายการเทียบเท่าเงินสดปลายงวด', ...data.periods.map(p => p.data.summary.endingCash || 0)]
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'งบกระแสเงินสด');

      // Generate Excel file
      XLSX.writeFile(wb, 'งบกระแสเงินสด.xlsx');
      this.showNotification('ดาวน์โหลด Excel เรียบร้อย', 'success');

    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.showNotification('เกิดข้อผิดพลาดในการสร้าง Excel', 'error');
    }
  },

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' :
                    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

    notification.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CashFlowManager.init();
});