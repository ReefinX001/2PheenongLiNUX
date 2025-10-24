// Main Receipt Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  fetchUserProfile();
  loadEmployeeProfile();
  loadInvoices();
  setupSearchAndFilters();
});

function setupSearchAndFilters() {
  const searchInput = document.getElementById('searchInput');
  const paymentMethodFilter = document.getElementById('paymentMethodFilter');

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadInvoices();
      }, 500);
    });
  }

  if (paymentMethodFilter) {
    paymentMethodFilter.addEventListener('change', function() {
      loadInvoices();
    });
  }
}

async function loadInvoices() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('ไม่พบโทเค็นสําหรับยืนยันตัวตน');
    }

    const searchTerm = document.getElementById('searchInput')?.value || '';
    const paymentMethod = document.getElementById('paymentMethodFilter')?.value || 'all';

    // ไม่ใช้ตัวกรองวันที่ - แสดงข้อมูลทั้งหมด
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (paymentMethod && paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);

    const queryString = params.toString();
    const url = `/api/receipt${queryString ? '?' + queryString : ''}`;

    console.log('🔍 Loading receipts from:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      throw new Error('โทเค็นหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    if (!res.ok) {
      throw new Error(`เกิดข้อผิดพลาด: ${res.status} ${res.statusText}`);
    }

    const body = await res.json();
    console.log('📋 Receipt API Response:', body);
    console.log('📊 Receipt count:', body.data?.length || 0);

    if (!body.success) throw new Error(body.error || 'ไม่สามารถโหลดข้อมูลได้');

    const tbody = document.getElementById('invoiceList');
    tbody.innerHTML = '';

    const receipts = body.data || [];

    if (!receipts || receipts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-gray-500 py-8">
            <div class="flex flex-col items-center">
              <i class="bi bi-receipt-cutoff text-4xl text-gray-400 mb-2"></i>
              <p>ไม่พบข้อมูลใบเสร็จรับเงิน</p>
              <p class="text-sm text-gray-400 mt-1">ลองปรับเปลี่ยนตัวกรองหรือสร้างใบเสร็จใหม่</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    console.log(`✅ แสดงใบเสร็จ ${receipts.length} รายการ`);

    receipts.forEach(receipt => {
      const dateStr = new Date(receipt.issueDate || receipt.createdAt).toLocaleDateString('th-TH');
      const statusCls = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      const statusText = 'รับเงินแล้ว';

      const referenceHtml = receipt.contractNo ? receipt.contractNo :
                           receipt.quotationNumber ? receipt.quotationNumber :
                           receipt.invoiceNumber ? receipt.invoiceNumber : '-';

      const paymentDetails = receipt.paymentMethod === 'cash' ? 'เงินสด' :
                            receipt.paymentMethod === 'bank_transfer' ? `${receipt.bankName || 'ธนาคาร'} ${receipt.branchName || ''}` :
                            receipt.paymentMethod === 'credit_card' ? 'บัตรเครดิต' :
                            receipt.paymentDetails || '-';

      const totalAmount = (receipt.totalAmount || 0).toFixed(2);
      const netTotal = (receipt.netTotal || receipt.totalAmount || 0).toFixed(2);

      const tr = document.createElement('tr');
      tr.classList.add('hover:bg-gray-50','dark:hover:bg-gray-600');
      tr.innerHTML = `
        <td><input type="checkbox" class="rounded border-gray-300" data-receipt-id="${receipt._id}" /></td>
        <td>
          <a href="/api/receipt/${receipt.receiptNumber}.pdf" target="_blank" class="text-blue-500 hover:underline">
            ${receipt.receiptNumber}
          </a>
        </td>
        <td><span class="px-2 py-1 text-xs rounded-full ${statusCls}">${statusText}</span></td>
        <td>${dateStr}</td>
        <td>${referenceHtml}</td>
        <td>${receipt.customer?.name || '-'}</td>
        <td>${paymentDetails}</td>
        <td>${receipt.items?.map(item => item.name || item.product).filter(Boolean).join(', ') || '-'}</td>
        <td class="text-right">฿${totalAmount}</td>
        <td class="text-right">฿${netTotal}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('ไม่สามารถโหลดใบเสร็จรับเงินได้:', err);
    const tbody = document.getElementById('invoiceList');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-red-500 py-4">
            โหลดข้อมูลใบเสร็จรับเงินไม่สำเร็จ: ${err.message}
            ${err.message.includes('โทเค็น') ? '<br><button onclick="redirectToLogin()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">เข้าสู่ระบบ</button>' : ''}
          </td>
        </tr>
      `;
    }
  }
}

function redirectToLogin() {
  window.location.href = '/login';
}

function clearAuthData() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('authToken');
}

function setDefaultProfile() {
  const employeeName = document.getElementById('employeeName');
  const employeePhoto = document.getElementById('employeePhoto');
  if (employeeName) employeeName.textContent = 'ผู้ใช้งาน';
  if (employeePhoto) employeePhoto.src = '/static/images/avatar-placeholder.png';
}

async function loadEmployeeProfile() {
  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      setDefaultProfile();
      return;
    }

    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Token expired or invalid');
        clearAuthData();
        setDefaultProfile();
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let userData = data.success && data.data ? data.data : data;

    const employeeName = userData.name || userData.username || 'ผู้ใช้งาน';
    document.getElementById('employeeName').textContent = employeeName;

    let imageUrl = userData.imageUrl || userData.photoUrl || userData.image || userData.profileImage || userData.profile_image || userData.avatar;
    if (imageUrl) {
      if (!imageUrl.startsWith('http')) {
        imageUrl = imageUrl.startsWith('/') ? imageUrl : '/uploads/' + imageUrl;
      }
      const img = document.getElementById('employeePhoto');
      img.onerror = function() {
        this.src = '/static/images/avatar-placeholder.png';
      };
      img.src = imageUrl;
    } else {
      document.getElementById('employeePhoto').src = '/static/images/avatar-placeholder.png';
    }
  } catch (error) {
    console.error('Error loading employee profile:', error);
    setDefaultProfile();
  }
}
