/**
 * Error Handler for HR System
 * จัดการ error ที่เกิดขึ้นในระบบ HR
 */

class HRErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers();
  }

  // ตั้งค่า global error handlers
  setupGlobalErrorHandlers() {
    // จัดการ unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason);
    });

    // จัดการ JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
      this.handleError(event.error);
    });
  }

  // จัดการ error ทั่วไป
  handleError(error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      this.handleNetworkError(error);
    } else if (error.message && error.message.includes('502')) {
      this.handleServerError(error);
    } else if (error.message && error.message.includes('401')) {
      this.handleAuthError(error);
    } else {
      this.handleGenericError(error);
    }
  }

  // จัดการ Network errors
  handleNetworkError(error) {
    console.warn('Network error detected:', error);
    this.showErrorNotification('เกิดปัญหาการเชื่อมต่อเครือข่าย', 'warning');
  }

  // จัดการ Server errors (502, 500, etc.)
  handleServerError(error) {
    console.warn('Server error detected:', error);
    this.showErrorNotification('เซิร์ฟเวอร์ไม่สามารถให้บริการได้ในขณะนี้', 'error');

    // ซ่อน loading states
    this.hideLoadingStates();

    // แสดงข้อมูล fallback
    this.showFallbackData();
  }

  // จัดการ Authentication errors
  handleAuthError(error) {
    console.warn('Authentication error detected:', error);
    this.showErrorNotification('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'error');

    setTimeout(() => {
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
    }, 2000);
  }

  // จัดการ Generic errors
  handleGenericError(error) {
    console.error('Generic error:', error);
    this.showErrorNotification('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
  }

  // แสดง error notification
  showErrorNotification(message, type = 'error') {
    // ลบ notification เก่าถ้ามี
    const existingNotification = document.getElementById('error-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // สร้าง notification ใหม่
    const notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm animate-fadeIn ${this.getNotificationClasses(type)}`;

    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="bi ${this.getNotificationIcon(type)} text-xl"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // ลบ notification อัตโนมัติหลัง 5 วินาที
    setTimeout(() => {
      if (notification && notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // ได้ CSS classes สำหรับ notification
  getNotificationClasses(type) {
    switch (type) {
      case 'error':
        return 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
    }
  }

  // ได้ icon สำหรับ notification
  getNotificationIcon(type) {
    switch (type) {
      case 'error':
        return 'bi-exclamation-triangle';
      case 'warning':
        return 'bi-exclamation-circle';
      case 'success':
        return 'bi-check-circle';
      case 'info':
      default:
        return 'bi-info-circle';
    }
  }

  // ซ่อน loading states
  hideLoadingStates() {
    const loadingElements = document.querySelectorAll('.loading, [class*="loading"]');
    loadingElements.forEach(el => {
      if (el.textContent === 'Loading...' || el.textContent === 'กำลังโหลด...') {
        el.textContent = 'ไม่สามารถโหลดข้อมูลได้';
        el.classList.add('text-red-500');
      }
    });
  }

  // แสดงข้อมูล fallback
  showFallbackData() {
    // แสดงข้อมูล fallback สำหรับสถิติ
    const statsElements = {
      'totalEmployees': 'N/A',
      'activeEmployees': 'N/A',
      'resignedEmployees': 'N/A',
      'onlineEmployees': 'N/A'
    };

    Object.entries(statsElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element && element.textContent === '0') {
        element.textContent = value;
        element.classList.add('text-gray-500');
      }
    });

    // แสดงข้อความ fallback สำหรับตาราง
    const tableElements = [
      'recentEmployeesTableBody',
      'pendingLeaveTableBody'
    ];

    tableElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML = `
          <tr>
            <td colspan="100%" class="text-center py-8 text-gray-500">
              <i class="bi bi-wifi-off text-2xl mb-2 block"></i>
              <p>ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>
              <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                ลองใหม่
              </button>
            </td>
          </tr>
        `;
      }
    });

    // แสดงข้อความ fallback สำหรับ lists
    const listElements = [
      'upcomingHolidayList',
      'announcementsList'
    ];

    listElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML = `
          <div class="text-center py-4 text-gray-500">
            <i class="bi bi-wifi-off text-xl mb-2"></i>
            <p class="text-sm">ไม่สามารถโหลดข้อมูลได้</p>
          </div>
        `;
      }
    });
  }

  // ตรวจสอบสถานะเซิร์ฟเวอร์
  async checkServerStatus() {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        return { status: 'online', message: 'เซิร์ฟเวอร์ทำงานปกติ' };
      } else {
        return { status: 'error', message: `เซิร์ฟเวอร์ตอบกลับด้วย status ${response.status}` };
      }
    } catch (error) {
      return { status: 'offline', message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }

  // แสดงสถานะเซิร์ฟเวอร์
  async showServerStatus() {
    const status = await this.checkServerStatus();

    const statusElement = document.createElement('div');
    statusElement.className = 'fixed bottom-4 left-4 z-50 p-2 rounded text-xs';

    switch (status.status) {
      case 'online':
        statusElement.className += ' bg-green-100 text-green-800 border border-green-200';
        statusElement.innerHTML = '<i class="bi bi-circle-fill text-green-500 mr-1"></i>Online';
        break;
      case 'offline':
        statusElement.className += ' bg-red-100 text-red-800 border border-red-200';
        statusElement.innerHTML = '<i class="bi bi-circle-fill text-red-500 mr-1"></i>Offline';
        break;
      default:
        statusElement.className += ' bg-yellow-100 text-yellow-800 border border-yellow-200';
        statusElement.innerHTML = '<i class="bi bi-circle-fill text-yellow-500 mr-1"></i>Error';
    }

    document.body.appendChild(statusElement);

    // ลบ status หลัง 3 วินาที
    setTimeout(() => {
      if (statusElement && statusElement.parentElement) {
        statusElement.remove();
      }
    }, 3000);
  }
}

// สร้าง instance ของ error handler
const hrErrorHandler = new HRErrorHandler();

// Export สำหรับใช้งานใน module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HRErrorHandler;
}
