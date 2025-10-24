/**
 * Deposits Management JavaScript
 */

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let deposits = [];

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
  // Initialize date range picker
  initDateRangePicker();

  // Fetch deposits data
  fetchDeposits();

  // Add event listeners
  setupEventListeners();
});

/**
 * Initialize date range picker
 */
function initDateRangePicker() {
  // This is a placeholder - you would typically use a library like flatpickr or daterangepicker
  const datePicker = document.getElementById('datePicker');
  if (datePicker) {
    // Initialize your date picker library here
    console.log('Date picker should be initialized');

    // Example with click handler until actual date picker is implemented
    datePicker.addEventListener('click', function() {
      alert('เลือกช่วงวันที่ที่ต้องการ');
    });
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Select all checkbox
  const selectAllCheckbox = document.querySelector('thead input[type="checkbox"]');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const isChecked = this.checked;
      document.querySelectorAll('tbody input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = isChecked;
      });
    });
  }

  // Search input
  const searchInput = document.querySelector('input[placeholder*="ค้นหา"]');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function() {
      fetchDeposits({ search: this.value });
    }, 500));
  }

  // Date filter checkbox
  const dateFilterCheck = document.getElementById('dateFilterCheck');
  if (dateFilterCheck) {
    dateFilterCheck.addEventListener('change', function() {
      const datePicker = document.getElementById('datePicker');
      datePicker.disabled = !this.checked;
      if (this.checked) {
        // Apply date filter
        fetchDeposits({ dateFilter: datePicker.value });
      } else {
        // Remove date filter
        fetchDeposits();
      }
    });
  }

  // Create deposit button
  const btnCreateDeposit = document.getElementById('btnCreateDeposit');
  if (btnCreateDeposit) {
    btnCreateDeposit.addEventListener('click', function() {
      // Navigate to create form or open modal
      window.location.href = '/loan/deposits/new';
    });
  }

  // Pagination controls
  const paginationNext = document.querySelector('.btn-outline i.bi-chevron-right').parentElement;
  const paginationPrev = document.querySelector('.btn-outline i.bi-chevron-left').parentElement;

  if (paginationNext) {
    paginationNext.addEventListener('click', function() {
      if (currentPage * itemsPerPage < totalItems) {
        currentPage++;
        fetchDeposits({ page: currentPage });
      }
    });
  }

  if (paginationPrev) {
    paginationPrev.addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        fetchDeposits({ page: currentPage });
      }
    });
  }

  // Items per page selector
  const itemsPerPageSelect = document.querySelector('.select-bordered');
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', function() {
      itemsPerPage = parseInt(this.value);
      currentPage = 1; // Reset to first page
      fetchDeposits({ limit: itemsPerPage, page: currentPage });
    });
  }
}

/**
 * Fetch deposits from API
 * @param {Object} options - Filter and pagination options
 */
function fetchDeposits(options = {}) {
  // Show loading state
  const tableBody = document.querySelector('tbody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-4">
        <div class="spinner mx-auto"></div>
        <p class="mt-2 text-gray-500">กำลังโหลดข้อมูล...</p>
      </td>
    </tr>
  `;

  // Default options
  const defaultOptions = {
    page: currentPage,
    limit: itemsPerPage,
    search: '',
    dateRange: '',
  };

  // Merge default options with provided options
  const fetchOptions = { ...defaultOptions, ...options };

  // Build query string
  const queryString = Object.entries(fetchOptions)
    .filter(([_, value]) => value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  // Fetch data from API
  // In a real application, replace this with actual API calls
  setTimeout(() => {
    // Simulate API response
    const mockData = {
      deposits: [
        {
          id: 'RD-256806120002',
          status: 'paid',
          date: '12/6/2568',
          customer: 'อาร์ ศิลป์',
          product: 'iPhone 11 256Gb pink',
          totalAmount: '12,000.00',
          netAmount: '12,500.00',
          hasAttachment: false
        },
        {
          id: 'RD-256806120001',
          status: 'problem',
          date: '12/6/2568',
          customer: 'อาร์ ศิลป์',
          product: 'iPhone 11 256Gb pink',
          totalAmount: '12,000.00',
          netAmount: '12,500.00',
          hasAttachment: true
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    };

    // Update global variables
    deposits = mockData.deposits;
    totalItems = mockData.pagination.total;
    currentPage = mockData.pagination.page;

    // Render deposits
    renderDeposits(deposits);

    // Update pagination display
    updatePaginationDisplay(mockData.pagination);

  }, 500); // Simulate network delay
}

/**
 * Render deposits in the table
 * @param {Array} deposits - Array of deposit objects
 */
function renderDeposits(deposits) {
  const tableBody = document.querySelector('tbody');

  if (deposits.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          <p class="text-gray-500">ไม่พบข้อมูลใบรับเงินมัดจำ</p>
        </td>
      </tr>
    `;
    return;
  }

  // Clear previous content
  tableBody.innerHTML = '';

  // Append each deposit row
  deposits.forEach(deposit => {
    const statusText = deposit.status === 'paid' ? 'ชำระแล้ว' : 'มีปัญหาผันชำระงวด';
    const statusClass = deposit.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    row.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">
        <input type="checkbox" class="checkbox" />
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="text-sm font-medium text-gray-900 dark:text-white">${deposit.id}</span>
        ${deposit.hasAttachment ? '<i class="bi bi-exclamation-triangle text-red-500 ml-1" title="มีเอกสารแนบ"></i>' : ''}
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
          ${statusText}
        </span>
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        ${deposit.date}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        ${deposit.customer}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        ${deposit.product}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
        ฿${deposit.totalAmount}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
        ฿${deposit.netAmount}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
        <div class="flex justify-center space-x-2">
          ${deposit.status === 'problem' ?
            '<button class="text-blue-500 hover:text-blue-700" title="ดู" onclick="viewDeposit(\'' + deposit.id + '\')"><i class="bi bi-eye"></i></button>' :
            '<button class="text-blue-500 hover:text-blue-700" title="พิมพ์" onclick="printDeposit(\'' + deposit.id + '\')"><i class="bi bi-file-earmark-text"></i></button>'
          }
          <button class="text-blue-500 hover:text-blue-700" title="ดาวน์โหลด" onclick="downloadDeposit('${deposit.id}')">
            <i class="bi bi-download"></i>
          </button>
          <button class="text-red-500 hover:text-red-700" title="ลบ" onclick="deleteDeposit('${deposit.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

/**
 * Update pagination display
 * @param {Object} pagination - Pagination information
 */
function updatePaginationDisplay(pagination) {
  const pageDisplay = document.querySelector('.px-3.py-1');
  if (pageDisplay) {
    pageDisplay.textContent = `หน้า ${pagination.page}`;
  }

  // Disable/enable pagination buttons
  const nextButton = document.querySelector('.btn-outline i.bi-chevron-right').parentElement;
  const prevButton = document.querySelector('.btn-outline i.bi-chevron-left').parentElement;

  if (nextButton) {
    nextButton.disabled = pagination.page >= pagination.totalPages;
    nextButton.classList.toggle('opacity-50', pagination.page >= pagination.totalPages);
  }

  if (prevButton) {
    prevButton.disabled = pagination.page <= 1;
    prevButton.classList.toggle('opacity-50', pagination.page <= 1);
  }
}

/**
 * View deposit details
 * @param {string} depositId - The ID of the deposit to view
 */
function viewDeposit(depositId) {
  console.log(`Viewing deposit ${depositId}`);
  // In a real application, show modal or navigate to details page
  window.location.href = `/loan/deposits/${depositId}`;
}

/**
 * Print deposit receipt
 * @param {string} depositId - The ID of the deposit to print
 */
function printDeposit(depositId) {
  console.log(`Printing deposit ${depositId}`);
  // In a real application, open print dialog or generate PDF
  window.open(`/loan/deposits/${depositId}/print`, '_blank');
}

/**
 * Download deposit as PDF
 * @param {string} depositId - The ID of the deposit to download
 */
function downloadDeposit(depositId) {
  console.log(`Downloading deposit ${depositId}`);
  // In a real application, trigger file download
  window.location.href = `/loan/deposits/${depositId}/download`;
}

/**
 * Delete deposit
 * @param {string} depositId - The ID of the deposit to delete
 */
function deleteDeposit(depositId) {
  if (confirm(`คุณต้องการลบใบรับเงินมัดจำ ${depositId} ใช่หรือไม่?`)) {
    console.log(`Deleting deposit ${depositId}`);
    // In a real application, send DELETE request to API
    // Then refresh the data
    fetchDeposits();
  }
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
