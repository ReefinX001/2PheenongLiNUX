// notifications.js - ระบบแจ้งเตือน
class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.socket = null;
    this.audioEnabled = true;
    this.notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarlo5VHFxRTsObntmEUBDiS2vLVgjMNF2Wy6ebSbjEQIYDN8OeVOgsWZLiw5pJuKBVGsdL/0G0bEySHzv7XizAIMGy38OibUgwQVaDc2bicFQUlhNDn1qk3CRxpuay1mHkWDzqu5Ofjg0kjBlKv5ue1jDwNH3TI/8NwGAUjgsD7xYIzBRVps/zkp00GFVKv5OemowsJPqnd1LNmGAUp');
    this.init();
  }

  init() {
    this.createNotificationUI();
    this.bindEvents();
    this.connectSocket();
    this.loadStoredNotifications();
  }

  createNotificationUI() {
    // เพิ่ม notification bell ใน navbar
    const navbarActions = document.querySelector('.navbar-lux .flex.items-center.space-x-2');
    if (navbarActions) {
      const notificationBtn = document.createElement('div');
      notificationBtn.className = 'relative mr-4';
      notificationBtn.innerHTML = `
        <button id="notificationBell" class="btn btn-ghost btn-sm relative">
          <i class="bi bi-bell text-xl"></i>
          <span id="notificationBadge" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hidden">0</span>
        </button>
      `;
      navbarActions.insertBefore(notificationBtn, navbarActions.firstChild);

      // สร้าง dropdown menu
      const dropdown = document.createElement('div');
      dropdown.id = 'notificationDropdown';
      dropdown.className = 'absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 hidden z-50';
      dropdown.style.top = '100%';
      dropdown.innerHTML = `
        <div class="p-4 border-b dark:border-gray-700">
          <div class="flex justify-between items-center">
            <h3 class="font-semibold text-lg">การแจ้งเตือน</h3>
            <div class="flex gap-2">
              <button id="markAllRead" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                อ่านทั้งหมด
              </button>
              <button id="clearAll" class="text-sm text-red-600 hover:text-red-800 dark:text-red-400">
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
        <div id="notificationList" class="max-h-96 overflow-y-auto">
          <div class="p-8 text-center text-gray-500">
            <i class="bi bi-bell-slash text-4xl mb-2"></i>
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        </div>
        <div class="p-3 border-t dark:border-gray-700 text-center">
          <a href="/notifications" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
            ดูการแจ้งเตือนทั้งหมด
          </a>
        </div>
      `;
      notificationBtn.appendChild(dropdown);
    }

    // สร้าง toast container
    if (!document.getElementById('toastContainer')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'fixed top-20 right-4 z-50 space-y-2';
      document.body.appendChild(toastContainer);
    }
  }

  bindEvents() {
    // Toggle dropdown
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationDropdown');

    if (bell && dropdown) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
          this.markNotificationsAsSeen();
        }
      });

      // ปิด dropdown เมื่อคลิกข้างนอก
      document.addEventListener('click', (e) => {
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }

    // Mark all as read
    const markAllBtn = document.getElementById('markAllRead');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllAsRead());
    }

    // Clear all
    const clearAllBtn = document.getElementById('clearAll');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAll());
    }
  }

  connectSocket() {
    // เชื่อมต่อ Socket.IO
    if (typeof io !== 'undefined') {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('Notification system connected');
      });

      // รับการแจ้งเตือนแบบ real-time
      this.socket.on('notification', (data) => {
        this.addNotification(data);
      });

      // การแจ้งเตือนเฉพาะเจาะจง
      this.socket.on('purchaseOrderCreated', (data) => {
        this.addNotification({
          type: 'purchase_order',
          title: 'ใบสั่งซื้อใหม่',
          message: `มีใบสั่งซื้อ ${data.poNumber} รอการอนุมัติ`,
          icon: 'bi-file-earmark-text',
          color: 'blue',
          link: `/purchase_order?id=${data.id}`,
          data: data
        });
      });

      this.socket.on('invoiceCreated', (data) => {
        this.addNotification({
          type: 'invoice',
          title: 'ใบแจ้งหนี้ใหม่',
          message: `ใบแจ้งหนี้ ${data.invoiceNumber} ถูกสร้างแล้ว`,
          icon: 'bi-receipt',
          color: 'green',
          link: `/invoice?id=${data.id}`,
          data: data
        });
      });

      this.socket.on('paymentReceived', (data) => {
        this.addNotification({
          type: 'payment',
          title: 'รับชำระเงินแล้ว',
          message: `ได้รับชำระเงิน ${this.formatCurrency(data.amount)} จาก ${data.customerName}`,
          icon: 'bi-cash-coin',
          color: 'green',
          link: `/payment?id=${data.id}`,
          data: data
        });
      });

      this.socket.on('expenseApprovalRequired', (data) => {
        this.addNotification({
          type: 'expense',
          title: 'ค่าใช้จ่ายรออนุมัติ',
          message: `ค่าใช้จ่าย ${this.formatCurrency(data.amount)} รอการอนุมัติ`,
          icon: 'bi-wallet2',
          color: 'orange',
          link: `/expense?id=${data.id}`,
          data: data
        });
      });
    }
  }

  addNotification(notification) {
    // เพิ่ม metadata
    notification.id = this.generateId();
    notification.timestamp = new Date();
    notification.read = false;
    notification.seen = false;

    // เพิ่มลงในรายการ
    this.notifications.unshift(notification);
    this.unreadCount++;

    // อัพเดท UI
    this.updateBadge();
    this.updateNotificationList();

    // แสดง toast
    this.showToast(notification);

    // เล่นเสียง
    if (this.audioEnabled) {
      this.playSound();
    }

    // บันทึกลง localStorage
    this.saveNotifications();
  }

  showToast(notification) {
    const toast = document.createElement('div');
    toast.className = `notification-toast bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[320px] max-w-md border dark:border-gray-700 transform transition-all duration-300 translate-x-full`;

    const iconColors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600'
    };

    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="bi ${notification.icon} text-2xl ${iconColors[notification.color] || 'text-gray-600'}"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="font-semibold text-gray-900 dark:text-white">${notification.title}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${notification.message}</p>
          <div class="mt-2 flex gap-2">
            <button class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400" onclick="notificationSystem.openNotification('${notification.id}')">
              ดูรายละเอียด
            </button>
            <button class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" onclick="notificationSystem.dismissToast(this)">
              ปิด
            </button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('toastContainer');
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
      toast.classList.add('translate-x-0');
    }, 100);

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      this.dismissToast(toast);
    }, 8000);
  }

  dismissToast(element) {
    const toast = element.closest('.notification-toast');
    if (toast) {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }
  }

  updateBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  updateNotificationList() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bi bi-bell-slash text-4xl mb-2"></i>
          <p>ไม่มีการแจ้งเตือน</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.notifications.map(notification => `
      <div class="notification-item ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 p-4 border-b dark:border-gray-700 cursor-pointer transition-colors"
           onclick="notificationSystem.openNotification('${notification.id}')">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <i class="bi ${notification.icon} text-xl ${this.getIconColor(notification.color)}"></i>
          </div>
          <div class="ml-3 flex-1">
            <p class="font-medium text-gray-900 dark:text-white ${!notification.read ? 'font-semibold' : ''}">
              ${notification.title}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${notification.message}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ${this.formatTime(notification.timestamp)}
            </p>
          </div>
          ${!notification.read ? '<div class="w-2 h-2 bg-blue-600 rounded-full"></div>' : ''}
        </div>
      </div>
    `).join('');
  }

  openNotification(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      // Mark as read
      notification.read = true;
      this.unreadCount = this.notifications.filter(n => !n.read).length;
      this.updateBadge();
      this.updateNotificationList();
      this.saveNotifications();

      // Navigate to link if exists
      if (notification.link) {
        window.location.href = notification.link;
      }
    }
  }

  markNotificationsAsSeen() {
    this.notifications.forEach(n => n.seen = true);
    this.saveNotifications();
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.updateBadge();
    this.updateNotificationList();
    this.saveNotifications();
  }

  clearAll() {
    if (confirm('ต้องการลบการแจ้งเตือนทั้งหมดหรือไม่?')) {
      this.notifications = [];
      this.unreadCount = 0;
      this.updateBadge();
      this.updateNotificationList();
      this.saveNotifications();
    }
  }

  playSound() {
    this.notificationSound.play().catch(e => console.log('Could not play notification sound'));
  }

  // Utility functions
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }

  formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;

    if (diff < 60000) return 'เมื่อสักครู่';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH');
  }

  getIconColor(color) {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
      gray: 'text-gray-600'
    };
    return colors[color] || 'text-gray-600';
  }

  // Storage
  saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  loadStoredNotifications() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
        this.updateNotificationList();
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  }

  // Public methods for manual notification creation
  notify(options) {
    this.addNotification({
      type: options.type || 'general',
      title: options.title,
      message: options.message,
      icon: options.icon || 'bi-info-circle',
      color: options.color || 'blue',
      link: options.link,
      data: options.data
    });
  }
}

// Initialize notification system when DOM is ready
let notificationSystem;
document.addEventListener('DOMContentLoaded', () => {
  notificationSystem = new NotificationSystem();

  // Export globally for easy access
  window.notificationSystem = notificationSystem;
});

// Example usage:
// notificationSystem.notify({
//   title: 'ใบสั่งซื้อใหม่',
//   message: 'มีใบสั่งซื้อ PO-2025-001 รอการอนุมัติ',
//   icon: 'bi-file-earmark-text',
//   color: 'blue',
//   link: '/purchase_order?id=123'
// });
