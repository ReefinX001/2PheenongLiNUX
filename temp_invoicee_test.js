// Extracted JavaScript from Invoicee.html for testing

// Global variables
let currentPage = 1;
const perPage = 10;

// Mock browser APIs for testing
const document = {
  addEventListener: () => {},
  getElementById: () => ({ textContent: '', innerHTML: '', value: '', style: { display: '' } }),
  querySelector: () => ({ style: { display: '' } }),
  querySelectorAll: () => [],
  createElement: () => ({ href: '', download: '', appendChild: () => {}, click: () => {}, remove: () => {} }),
  title: '',
  body: { appendChild: () => {} }
};

const window = {
  location: { search: '?branch=00000', href: '' },
  localStorage: { getItem: () => '', setItem: () => {} },
  currentBranchCode: '00000',
  LoadingSystem: { show: () => {}, hide: () => {} },
  showNotification: () => {},
  lottie: { loadAnimation: () => ({}) },
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  addEventListener: () => {}
};

const URLSearchParams = class {
  constructor() {}
  get() { return '00000'; }
};

const fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data: [] }),
  blob: () => Promise.resolve(new Blob()),
  text: () => Promise.resolve('')
});

const alert = () => {};
const console = { log: () => {}, error: () => {}, warn: () => {} };
const setTimeout = (fn, delay) => fn();

// Function to load invoices
async function loadInvoices() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('❌ ไม่พบโทเค็นสำหรับยืนยันตัวตน กำลังเปลี่ยนเส้นทางไปยังหน้าล็อกอิน...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    const res = await fetch('/api/invoice', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      console.error('❌ Unauthorized: token invalid or expired');
      alert('ไม่มีสิทธิ์เข้าถึง กรุณาล็อกอินใหม่');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    const body = await res.json();
    if (!body.success) throw new Error(body.error||'Fetch failed');

    const data       = body.data;
    const totalPages = Math.ceil(data.length / perPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1)          currentPage = 1;

    const start    = (currentPage - 1) * perPage;
    const pageData = data.slice(start, start + perPage);

    const tbody = document.getElementById('invoiceList');
    tbody.innerHTML = '';

    // แสดง/ซ่อน empty state
    const emptyState = document.querySelector('.empty-state-container');
    const tableContainer = document.querySelector('.quotation-table-container');

    if (data.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (tableContainer) tableContainer.style.display = 'none';
      console.log('📋 No invoices found - showing empty state');
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (tableContainer) tableContainer.style.display = 'block';
    }

    pageData.forEach(inv => {
      // อ่าน quotationNumber ถ้ามี - with additional null checking
      const qtNo = (inv && inv.quotationRef && inv.quotationRef.quotationNumber) || '-';

      // Debug: ตรวจสอบข้อมูลใบแจ้งหนี้
      console.log('🔍 Invoice data:', {
        invoiceNumber: inv.invoiceNumber,
        quotationRef: inv.quotationRef?.quotationNumber,
        id: inv._id
      });

      // แก้ไข: สร้างเลขใบแจ้งหนี้ที่ถูกต้อง
      let displayInvoiceNumber = inv.invoiceNumber;

      // ถ้า invoiceNumber เป็นเลขใบเสนอราคา (ขึ้นต้นด้วย QT-) ให้สร้างเลขใบแจ้งหนี้ใหม่
      if (displayInvoiceNumber && displayInvoiceNumber.startsWith('QT-')) {
        // สร้างเลขใบแจ้งหนี้จาก quotation number
        displayInvoiceNumber = displayInvoiceNumber.replace('QT-', 'INV-');
        console.log('🔧 Fixed invoice number:', displayInvoiceNumber);
      }

      const dateStr   = new Date(inv.date).toLocaleDateString('th-TH');
      const statusCls = inv.status === 'paid' ? 'badge-success' : 'badge-warning';
      const deliveryStatusHtml = inv.deliveryStatus === 'overdue'
        ? `<span class="badge badge-warning">เกินกำหนด</span>`
        : inv.deliveryStatus === 'delivered'
          ? `<span class="badge badge-success">ส่งของแล้ว</span>`
          : inv.deliveryRef
            ? `<a href="/api/delivery/${inv.deliveryRef}.pdf" target="_blank" class="text-blue-500 hover:underline">${inv.deliveryRef}</a>`
            : '';

      // Handle product names properly, with careful null checking
      const itemsHtml = (inv && Array.isArray(inv.items))
        ? inv.items.map(i => {
            // Ensure i exists before accessing properties
            if (!i) return '-';

            // If product is an object with name property
            if (i.product && typeof i.product === 'object' && i.product.name) {
              return i.product.name;
            }
            // If product doesn't exist or is not properly formatted
            if (i.description) {
              return i.description;
            }
            // Fallback
            return '-';
          }).join('<br>')
        : '-';

      const totalAmount = (inv && inv.summary && (inv.summary.totalAmount || inv.summary.subtotal) || 0).toFixed(2);
      const netTotal    = (inv && inv.summary && inv.summary.netTotal || 0).toFixed(2);

      const tr = document.createElement('tr');
      tr.classList.add('hover:bg-gray-50','dark:hover:bg-gray-600');
      tr.innerHTML = `
        <td><input type="checkbox" class="rounded border-gray-300" /></td>
        <td>
          <span class="text-gray-700">${displayInvoiceNumber}</span>
        </td>
        <td>${qtNo}</td>
        <td><span class="badge ${statusCls}">${inv.status}</span></td>
        <td>${dateStr}</td>
        <td>${inv.customer?.name || '-'}</td>
        <td>${itemsHtml}</td>
        <td class="text-right">฿${totalAmount}</td>
        <td class="text-right">฿${netTotal}</td>
        <td class="text-center">
          <button
            class="text-blue-500 hover:text-blue-700 download-invoice-btn"
            data-id="${inv._id}"
            data-number="${displayInvoiceNumber}"
            title="ดาวน์โหลด PDF"
          >
            <i class="bi bi-download"></i>
          </button>
          <button class="text-red-500 hover:text-red-700 ml-2">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelector('input.w-12').value = currentPage;
    document.querySelector('button[data-action="prev"]').disabled = (currentPage === 1);
    document.querySelector('button[data-action="next"]').disabled = (currentPage === totalPages);
  } catch (err) {
    console.error('โหลดใบแจ้งหนี้ไม่สำเร็จ:', err);

    // แสดง empty state เมื่อเกิดข้อผิดพลาด
    const emptyState = document.querySelector('.empty-state-container');
    const tableContainer = document.querySelector('.quotation-table-container');
    if (emptyState) emptyState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';

    // เปลี่ยนข้อความใน empty state เป็น error message พร้อมปุ่ม retry
    const emptyTitle = emptyState?.querySelector('h3');
    const emptyDesc = emptyState?.querySelector('p');
    if (emptyTitle) emptyTitle.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    if (emptyDesc) {
      emptyDesc.innerHTML = `
        กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง<br>
        <button onclick="loadInvoices()" class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors duration-200">
          <i class="bi bi-arrow-clockwise mr-1"></i>ลองใหม่
        </button>
      `;
    }

    if (err.message.includes('token') || err.message.includes('401')) {
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      alert('ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้: ' + err.message);
    }
  }
}

// ฟังก์ชัน refresh ข้อมูลทั้งหมด
async function refreshData() {
  console.log('🔄 Refreshing all data...');
  window.LoadingSystem?.show('กำลังรีเฟรชข้อมูล...');

  try {
    // โหลดข้อมูลใหม่ทั้งหมด
    await Promise.all([
      loadBranchInfo(),
      loadInvoices()
    ]);
    console.log('✅ Data refreshed successfully');

    // แสดงการแจ้งเตือนสำเร็จ - check if notification system is available
    if (typeof window.showNotification === 'function') {
      window.showNotification('รีเฟรชข้อมูลสำเร็จ', 'success');
    } else {
      console.log('✅ รีเฟรชข้อมูลสำเร็จ');
    }
  } catch (error) {
    console.error('❌ Error refreshing data:', error);
    if (typeof window.showNotification === 'function') {
      window.showNotification('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล: ' + error.message, 'error');
    } else {
      alert('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล: ' + error.message);
    }
  } finally {
    window.LoadingSystem?.hide();
  }
}

// ฟังก์ชันช่วย download Invoice PDF
async function downloadInvoicePdf(invId, invNumber) {
  const token = localStorage.getItem('authToken');
  if (!token) return alert('กรุณาล็อกอินก่อนดาวน์โหลด');
  try {
    const res = await fetch(`/api/invoice/${invId}/pdf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
        'Authorization': 'Bearer ' + token
      }
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${invNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  } catch (e) {
    console.error('PDF download error:', e);
    alert('ดาวน์โหลด PDF ไม่สำเร็จ: ' + e.message);
  }
}

// เพิ่มฟังก์ชัน loadBranchInfo
async function loadBranchInfo() {
  try {
    const branchCode = window.currentBranchCode; // Use the dynamic branch code
    const token = localStorage.getItem('authToken') || '';

    if (!token) {
      console.warn('❌ No auth token for loading branch info');
      document.getElementById('branchInfo').textContent = 'สาขา: (กรุณาเข้าสู่ระบบ)';
      return;
    }

    console.log('🔍 Loading branch info for:', branchCode);

    // เรียก /api/branch เพื่อดึง list สาขา
    const res = await fetch(`/api/branch`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      console.error('❌ Unauthorized access to branch API');
      document.getElementById('branchInfo').textContent = 'สาขา: (ไม่มีสิทธิ์เข้าถึง)';
      return;
    }

    const js = await res.json();
    if (res.ok && js.success) {
      // หา record ที่ตรงกับ branch_code
      const branch = js.data.find(b => b.branch_code === branchCode);
      if (branch) {
        console.log('✅ Found branch:', branch.name);
        document.getElementById('branchInfo').textContent =
          `${branch.name} — ${branch.address}`;
        // อัพเดท title ของหน้าด้วยชื่อสาขาจริง
        document.title = `ใบแจ้งหนี้ - ${branch.name}`;
        document.getElementById('pageTitle').textContent = `ใบแจ้งหนี้ - ${branch.name}`;
        return;
      } else {
        console.warn('⚠️ Branch not found in API response:', branchCode);
      }
    }
    throw new Error('ไม่พบข้อมูลสาขา');
  } catch (err) {
    console.warn('loadBranchInfo error:', err);
    document.getElementById('branchInfo').textContent =
      'สาขา: (ไม่พบข้อมูล)';
  }
}

// Lottie Loading Animation Functions
let lottieAnimation = null;

function showLoading(message = 'กำลังโหลด...') {
  const overlay = document.getElementById('loadingOverlay');
  const container = document.getElementById('lottieContainer');

  if (overlay && container) {
    overlay.style.display = 'flex';
    overlay.classList.remove('animate__fadeOut');
    overlay.classList.add('animate__fadeIn');

    if (!lottieAnimation && window.lottie) {
      lottieAnimation = window.lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        // ✅ Replaced with local CSS animation - no external dependencies needed
      });
    }

    if (message) {
      console.log('Loading:', message);
    }
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('animate__fadeIn');
    overlay.classList.add('animate__fadeOut');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }
}

console.log('✅ All JavaScript functions defined successfully');