/**
 * =========================================
 * Notification System JavaScript
 * ระบบแจ้งเตือนมาตรฐานสำหรับทุกหน้า
 * =========================================
 */

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.socket = null;
    this.toastContainer = null;
    this.notificationDropdown = null;
    this.isDropdownOpen = false;
    this.unreadCount = 0;

    this.init();
  }

  /**
   * เริ่มต้นระบบแจ้งเตือน
   */
  init() {
    // ตรวจสอบว่า DOM พร้อมแล้วหรือยัง
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeComponents();
      });
    } else {
      this.initializeComponents();
    }
  }

  /**
   * เริ่มต้นคอมโพเนนต์ทั้งหมดเมื่อ DOM พร้อม
   */
  initializeComponents() {
    this.createToastContainer();
    this.setupSocketIO();
    this.loadNotifications();
    this.setupNotificationDropdown();
  }

  /**
   * สร้าง Toast Container
   */
  createToastContainer() {
    // ตรวจสอบว่า document.body มีอยู่แล้ว
    if (!document.body) {
      console.warn('⚠️ Document body is not ready, delaying toast container creation');
      // ลองใหม่ทุก 100ms จนกว่า document.body จะพร้อม
      setTimeout(() => {
        if (document.body && !this.toastContainer) {
          console.log('🔄 Retrying toast container creation...');
          this.createToastContainer();
        }
      }, 100);
      return;
    }

    // ตรวจสอบว่าไม่มี container อยู่แล้ว
    if (document.getElementById('toastContainer')) {
      this.toastContainer = document.getElementById('toastContainer');
      console.log('✅ Found existing toast container');
      return;
    }

    try {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
      this.toastContainer = container;
      console.log('✅ Toast container created successfully');
    } catch (error) {
      console.error('❌ Failed to create toast container:', error);
      // ลองใหม่หลังจาก 200ms
      setTimeout(() => {
        if (!this.toastContainer) {
          this.createToastContainer();
        }
      }, 200);
    }
  }

  /**
   * แสดง Toast Notification
   * @param {string} message - ข้อความที่จะแสดง
   * @param {string} type - ประเภทของ toast (success, error, warning, info)
   * @param {number} duration - ระยะเวลาที่แสดง (milliseconds)
   * @param {boolean} closable - สามารถปิดได้หรือไม่
   */
  showToast(message, type = 'info', duration = 4000, closable = true) {
    if (!this.toastContainer) {
      this.createToastContainer();
    }

          // ถ้า toastContainer ยังไม่พร้อม ให้ console.log แทน
      if (!this.toastContainer) {
        console.log(`[Toast: ${type.toUpperCase()}] ${message}`);

        // ลองสร้าง container อีกครั้ง
        if (document.body) {
          this.createToastContainer();
          if (!this.toastContainer) {
            console.warn('⚠️ Still cannot create toast container, falling back to console');
            return null;
          }
        } else {
          console.warn('⚠️ Document body still not ready');
          return null;
        }
      }

    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type} toast-enter`;

    // Icon mapping
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    // Close button HTML
    const closeButtonHTML = closable ?
      `<button class="toast-close" onclick="NotificationSystem.instance.closeToast('${toastId}')">
        <i class="bi bi-x"></i>
      </button>` : '';

    // Progress bar HTML (เฉพาะเมื่อมี duration)
    const progressBarHTML = duration > 0 ?
      `<div class="toast-progress" style="width: 100%; animation: shrink ${duration}ms linear;"></div>` : '';

    toast.innerHTML = `
      <i class="toast-icon bi ${icons[type]}"></i>
      <span class="toast-message">${message}</span>
      ${closeButtonHTML}
      ${progressBarHTML}
    `;

    // เพิ่ม toast ลงใน container
    this.toastContainer.appendChild(toast);

    // Auto remove หลังจากเวลาที่กำหนด
    if (duration > 0) {
      setTimeout(() => {
        this.closeToast(toastId);
      }, duration);
    }

    // เพิ่ม keyframe สำหรับ progress bar
    if (!document.querySelector('style[data-notification-keyframes]')) {
      const style = document.createElement('style');
      style.setAttribute('data-notification-keyframes', 'true');
      style.textContent = `
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `;
      document.head.appendChild(style);
    }

    console.log(`🔔 Toast displayed: [${type.toUpperCase()}] ${message}`);
    return toastId;
  }

  /**
   * ปิด Toast Notification
   * @param {string} toastId - ID ของ toast ที่จะปิด
   */
  closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * ปิด Toast ทั้งหมด
   */
  closeAllToasts() {
    const toasts = this.toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => {
      this.closeToast(toast.id);
    });
  }

  /**
   * Setup Socket.IO สำหรับ real-time notifications
   */
  setupSocketIO() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO ไม่พร้อมใช้งาน - ข้ามการตั้งค่า');
      return;
    }

    try {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('🔗 Notification system connected to Socket.IO');

        // ส่งข้อมูลสาขาไปยังเซิร์ฟเวอร์
        const branchCode = window.BRANCH_CODE || window.currentBranchCode || '00000';
        this.socket.emit('join_notification_room', {
          branchCode: branchCode,
          timestamp: new Date().toISOString()
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Notification system disconnected:', reason);
      });

      // ฟัง notification จากเซิร์ฟเวอร์
      this.socket.on('notification', (data) => {
        this.handleRealtimeNotification(data);
      });

      // ฟัง broadcast notifications
      this.socket.on('broadcast_notification', (data) => {
        this.handleBroadcastNotification(data);
      });

      // ฟัง system notifications
      this.socket.on('system_notification', (data) => {
        this.handleSystemNotification(data);
      });

      // ฟัง force logout
      this.socket.on('forceLogout', (data) => {
        this.showToast(data.reason || 'คุณถูกออกจากระบบโดยผู้ดูแล', 'error', 5000);
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/login.html';
        }, 3000);
      });

    } catch (error) {
      console.error('❌ Socket.IO setup error:', error);
    }
  }

  /**
   * จัดการ real-time notification
   * @param {Object} data - ข้อมูล notification
   */
  handleRealtimeNotification(data) {
    console.log('📨 Received real-time notification:', data);

    // แสดง toast
    this.showToast(data.message, data.type || 'info', data.duration || 4000);

    // เพิ่มลงใน notification list
    this.addNotification({
      id: data.id || Date.now(),
      title: data.title || 'แจ้งเตือน',
      message: data.message,
      type: data.type || 'info',
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      action: data.action || null
    });

    // อัปเดต notification badge
    this.updateNotificationBadge();
  }

  /**
   * จัดการ broadcast notification
   * @param {Object} data - ข้อมูล notification
   */
  handleBroadcastNotification(data) {
    console.log('📢 Received broadcast notification:', data);

    this.showToast(
      `📢 ${data.message}`,
      data.type || 'info',
      data.duration || 6000
    );

    this.addNotification({
      id: data.id || Date.now(),
      title: '📢 ' + (data.title || 'ประกาศทั่วไป'),
      message: data.message,
      type: data.type || 'info',
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    this.updateNotificationBadge();
  }

  /**
   * จัดการ system notification
   * @param {Object} data - ข้อมูล notification
   */
  handleSystemNotification(data) {
    console.log('🔧 Received system notification:', data);

    this.showToast(
      `🔧 ${data.message}`,
      data.type || 'warning',
      data.duration || 8000
    );

    this.addNotification({
      id: data.id || Date.now(),
      title: '🔧 ' + (data.title || 'แจ้งเตือนระบบ'),
      message: data.message,
      type: data.type || 'warning',
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    this.updateNotificationBadge();
  }

  /**
   * Setup Notification Dropdown
   */
  setupNotificationDropdown() {
    const button = document.getElementById('notificationButton');
    const dropdown = document.getElementById('notificationDropdown');

    if (!button || !dropdown) {
      console.warn('Notification dropdown elements ไม่พบ - ข้ามการตั้งค่า');
      return;
    }

    this.notificationDropdown = dropdown;

    // Event listener สำหรับปุ่ม notification
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNotificationDropdown();
    });

    // ปิด dropdown เมื่อคลิกข้างนอก
    document.addEventListener('click', (e) => {
      if (!button.contains(e.target) && !dropdown.contains(e.target)) {
        this.closeNotificationDropdown();
      }
    });

    // Mark all as read button - ใช้ text เป็น selector
    const markAllReadBtn = dropdown.querySelector('button');
    if (markAllReadBtn && markAllReadBtn.textContent.includes('อ่านทั้งหมดแล้ว')) {
      markAllReadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.markAllAsRead();
      });
    }

    console.log('✅ Notification dropdown setup complete');
  }

  /**
   * Toggle notification dropdown
   */
  toggleNotificationDropdown() {
    if (!this.notificationDropdown) return;

    // Simple toggle เหมือน home.html
    this.notificationDropdown.classList.toggle('hidden');

    // ถ้าเปิด dropdown ให้โหลด notifications และซ่อน dot
    if (!this.notificationDropdown.classList.contains('hidden')) {
      this.renderNotifications();
      this.hideNotificationIndicators();
      this.isDropdownOpen = true;
    } else {
      this.isDropdownOpen = false;
    }
  }

  /**
   * เปิด notification dropdown
   */
  openNotificationDropdown() {
    if (!this.notificationDropdown) return;

    this.notificationDropdown.classList.remove('hidden');
    this.isDropdownOpen = true;

    // โหลด notifications
    this.renderNotifications();

    // ซ่อน notification dot
    this.hideNotificationIndicators();
  }

  /**
   * ปิด notification dropdown
   */
  closeNotificationDropdown() {
    if (!this.notificationDropdown) return;

    this.notificationDropdown.classList.add('hidden');
    this.isDropdownOpen = false;
  }

  /**
   * เพิ่ม notification ใหม่
   * @param {Object} notification - ข้อมูล notification
   */
  addNotification(notification) {
    // เพิ่มไว้ด้านบนสุด
    this.notifications.unshift(notification);

    // จำกัดจำนวน notifications (เก็บแค่ 50 รายการล่าสุด)
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // บันทึกลง localStorage
    this.saveNotifications();

    // อัปเดต badge
    this.updateNotificationBadge();
  }

  /**
   * โหลด notifications จาก localStorage
   */
  loadNotifications() {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }

      // โหลด unread count
      const unreadCount = localStorage.getItem('notificationUnreadCount');
      if (unreadCount) {
        this.unreadCount = parseInt(unreadCount, 10) || 0;
      }

      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
      this.unreadCount = 0;
    }
  }

  /**
   * บันทึก notifications ลง localStorage
   */
  saveNotifications() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
      localStorage.setItem('notificationUnreadCount', this.unreadCount.toString());
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  /**
   * แสดง notifications ใน dropdown
   */
  renderNotifications() {
    if (!this.notificationDropdown) return;

    // ค้นหา content container ใน dropdown (ตาม structure ของ home.html)
    const contentContainer = this.notificationDropdown.querySelector('.max-h-96.overflow-y-auto') ||
                            this.notificationDropdown.querySelector('.notification-dropdown-content');

    if (!contentContainer) {
      console.warn('ไม่พบ notification content container');
      return;
    }

    // ถ้าไม่มี notifications
    if (this.notifications.length === 0) {
      contentContainer.innerHTML = `
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
          <i class="bi bi-bell-slash text-2xl mb-2"></i>
          <p>ไม่มีการแจ้งเตือนใหม่</p>
        </div>
      `;
      return;
    }

    // แสดง notifications
    const notificationsHTML = this.notifications.slice(0, 10).map(notification => {
      const timeAgo = this.formatTimeAgo(notification.timestamp);
      const iconClass = this.getNotificationIconClass(notification.type);
      const isUnread = !notification.read;

      return `
        <div class="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''}" 
             onclick="NotificationSystem.instance.markAsRead('${notification.id}')">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full ${iconClass} flex items-center justify-center">
              <i class="bi ${this.getNotificationIcon(notification.type)} text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100 ${isUnread ? 'font-semibold' : ''}">${notification.title}</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 mt-1">${notification.message}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">${timeAgo}</div>
            </div>
            ${isUnread ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>' : ''}
          </div>
        </div>
      `;
    }).join('');

    contentContainer.innerHTML = notificationsHTML;
  }

  /**
   * ได้ icon class สำหรับ notification type
   * @param {string} type - ประเภท notification
   * @returns {string} CSS class
   */
  getNotificationIconClass(type) {
    const classes = {
      success: 'bg-green-100 dark:bg-green-900/30 text-green-500',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-500',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
    };
    return classes[type] || classes.info;
  }

  /**
   * ได้ icon สำหรับ notification type
   * @param {string} type - ประเภท notification
   * @returns {string} Bootstrap icon class
   */
  getNotificationIcon(type) {
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    return icons[type] || icons.info;
  }

  /**
   * แปลง timestamp เป็น "time ago" format
   * @param {string} timestamp - ISO timestamp
   * @returns {string} formatted time
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'เมื่อกี้นี้';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return time.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * อัปเดต notification badge
   */
  updateNotificationBadge() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;

    const badge = document.getElementById('notificationBadge');
    const dot = document.getElementById('notificationDot');

    if (this.unreadCount > 0) {
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
      }
      if (dot) {
        dot.classList.remove('hidden');
      }
    } else {
      if (badge) badge.classList.add('hidden');
      if (dot) dot.classList.add('hidden');
    }

    this.saveNotifications();
  }

  /**
   * ซ่อน notification indicators
   */
  hideNotificationIndicators() {
    const badge = document.getElementById('notificationBadge');
    const dot = document.getElementById('notificationDot');

    if (badge) badge.classList.add('hidden');
    if (dot) dot.classList.add('hidden');
  }

  /**
   * ทำเครื่องหมายว่าอ่านแล้ว
   * @param {string} notificationId - ID ของ notification
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id == notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.updateNotificationBadge();
      this.renderNotifications();

      // ถ้ามี action ให้ทำงาน
      if (notification.action) {
        this.handleNotificationAction(notification.action);
      }
    }
  }

  /**
   * ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
   */
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.updateNotificationBadge();
    this.renderNotifications();
  }

  /**
   * จัดการ notification action
   * @param {Object} action - action object
   */
  handleNotificationAction(action) {
    if (!action || !action.type) return;

    switch (action.type) {
      case 'redirect':
        if (action.url) {
          window.location.href = action.url;
        }
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'function':
        if (action.function && typeof window[action.function] === 'function') {
          window[action.function](action.params);
        }
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  }

  /**
   * ล้าง notifications ทั้งหมด
   */
  clearAllNotifications() {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveNotifications();
    this.updateNotificationBadge();
    this.renderNotifications();
  }

  /**
   * ส่ง notification ไปยังเซิร์ฟเวอร์
   * @param {Object} notification - ข้อมูล notification
   */
  sendNotification(notification) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_notification', notification);
    }
  }
}

// สร้าง instance และเก็บไว้ใน window object
window.NotificationSystem = NotificationSystem;

// สร้าง instance หลักอย่างปลอดภัย
window.createNotificationInstance = function() {
  try {
    // ตรวจสอบความพร้อมของ DOM
    if (!document || !document.documentElement) {
      console.warn('⚠️ Document not ready, delaying NotificationSystem creation...');
      setTimeout(window.createNotificationInstance, 50);
      return;
    }

    if (!document.body) {
      console.warn('⚠️ Document body not ready, delaying NotificationSystem creation...');
      setTimeout(window.createNotificationInstance, 100);
      return;
    }

    // ตรวจสอบว่าไม่มี instance อยู่แล้ว
    if (!NotificationSystem.instance) {
      console.log('🔔 Creating NotificationSystem instance...');
      NotificationSystem.instance = new NotificationSystem();
      console.log('✅ Notification System instance created successfully');
    } else {
      console.log('ℹ️ NotificationSystem instance already exists');
    }
  } catch (error) {
    console.error('❌ Failed to create NotificationSystem instance:', error);
    console.error('Error details:', error.message, error.stack);

    // ลองใหม่หลังจาก 500ms
    setTimeout(() => {
      console.log('🔄 Retrying NotificationSystem instance creation...');
      window.createNotificationInstance();
    }, 500);
  }
};

// สร้าง instance หลักเมื่อ DOM และ body พร้อม
if (document.readyState === 'loading') {
  console.log('📄 Document is loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired');
    // รอ body พร้อมแน่ๆ
    if (document.body) {
      window.createNotificationInstance();
    } else {
      console.warn('⚠️ Body still not ready after DOMContentLoaded, waiting...');
      setTimeout(window.createNotificationInstance, 50);
    }
  });
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('📄 Document ready state:', document.readyState);
  if (document.body) {
    console.log('✅ Document body is ready, creating instance immediately');
    window.createNotificationInstance();
  } else {
    console.warn('⚠️ Document ready but body not found, waiting...');
    let retryCount = 0;
    const checkBody = () => {
      retryCount++;
      if (document.body) {
        console.log('✅ Document body ready after', retryCount, 'attempts');
        window.createNotificationInstance();
      } else if (retryCount < 20) { // ลองสูงสุด 20 ครั้ง (2 วินาที)
        setTimeout(checkBody, 100);
      } else {
        console.error('❌ Document body not ready after 2 seconds, giving up auto-initialization');
      }
    };
    checkBody();
  }
} else {
  console.warn('⚠️ Unknown document ready state:', document.readyState);
  setTimeout(window.createNotificationInstance, 100);
}

// Export functions สำหรับใช้งานทั่วไป
window.showToast = function(message, type = 'info', duration = 4000, closable = true) {
  try {
    if (NotificationSystem.instance) {
      return NotificationSystem.instance.showToast(message, type, duration, closable);
    } else {
      console.log(`[Toast: ${type.toUpperCase()}] ${message}`);

      // ลองสร้าง instance ใหม่ถ้ายังไม่มี
      if (document.body && !NotificationSystem.instance) {
        console.log('🔄 Auto-creating NotificationSystem instance...');
        window.createNotificationInstance();

        // รอสักครู่แล้วลองอีกครั้ง
        setTimeout(() => {
          if (NotificationSystem.instance) {
            console.log('✅ Auto-recovery successful, showing toast...');
            return NotificationSystem.instance.showToast(message, type, duration, closable);
          } else {
            console.warn('❌ Auto-recovery failed, toast will be shown in console only');
          }
        }, 50);
      } else if (!document.body) {
        console.warn('⚠️ Document body not ready, deferring toast...');

        // ลองใหม่เมื่อ DOM พร้อม
        const retryToast = () => {
          if (document.body) {
            window.showToast(message, type, duration, closable);
          } else {
            setTimeout(retryToast, 100);
          }
        };
        setTimeout(retryToast, 100);
      }
      return null;
    }
  } catch (error) {
    console.error('❌ showToast error:', error);
    console.error('Error details:', error.message, error.stack);
    console.log(`[Toast Fallback: ${type.toUpperCase()}] ${message}`);

    // ลองสร้าง instance ใหม่กรณีที่ instance เสียหาย
    if (document.body && (!NotificationSystem.instance || error.message.includes('appendChild'))) {
      console.log('🔧 Attempting to recover NotificationSystem...');
      NotificationSystem.instance = null; // รีเซ็ต instance
      setTimeout(() => {
        window.createNotificationInstance();
      }, 100);
    }

    return null;
  }
};

window.hideNotificationDot = function() {
  try {
    if (NotificationSystem.instance) {
      NotificationSystem.instance.hideNotificationIndicators();
    }
  } catch (error) {
    console.error('❌ hideNotificationDot error:', error);
  }
};

window.showNotificationDot = function() {
  try {
    if (NotificationSystem.instance) {
      NotificationSystem.instance.updateNotificationBadge();
    }
  } catch (error) {
    console.error('❌ showNotificationDot error:', error);
  }
};

// เพิ่มฟังก์ชันสำหรับการทดสอบ
window.addTestNotification = function(type = 'info') {
  if (NotificationSystem.instance) {
    const messages = {
      success: 'บันทึกข้อมูลสำเร็จ',
      error: 'เกิดข้อผิดพลาดในระบบ',
      warning: 'กรุณาตรวจสอบข้อมูล',
      info: 'มีข้อมูลใหม่อัพเดท'
    };

    const titles = {
      success: '✅ สำเร็จ',
      error: '❌ ข้อผิดพลาด',
      warning: '⚠️ แจ้งเตือน',
      info: 'ℹ️ ข้อมูล'
    };

    NotificationSystem.instance.addNotification({
      id: Date.now(),
      title: titles[type] || titles.info,
      message: messages[type] || messages.info,
      type: type,
      timestamp: new Date().toISOString(),
      read: false
    });

    // แสดง toast ด้วย
    NotificationSystem.instance.showToast(messages[type] || messages.info, type);
  }
};

// ทดสอบฟังก์ชัน
window.testNotifications = function() {
  if (NotificationSystem.instance) {
    console.log('🧪 Testing notification system...');

    // เพิ่ม notifications ตัวอย่าง
    setTimeout(() => addTestNotification('success'), 500);
    setTimeout(() => addTestNotification('error'), 1000);
    setTimeout(() => addTestNotification('warning'), 1500);
    setTimeout(() => addTestNotification('info'), 2000);

    console.log('✅ Test notifications added! คลิกที่ notification icon เพื่อดู');
  }
};

// Log การโหลดสำเร็จ
console.log('🔔 Notification System loaded successfully');
console.log('📖 Available functions: showToast(), hideNotificationDot(), showNotificationDot()');
console.log('📖 Test functions: testNotifications(), addTestNotification(type)');
console.log('📖 Available classes: NotificationSystem');
console.log('📖 Global instance: NotificationSystem.instance');
console.log('🔍 Document state:', document.readyState);
console.log('🔍 Document body exists:', !!document.body);
console.log('🔍 Current URL:', window.location.pathname);