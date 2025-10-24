/**
 * =================================================================
 * 📢 MODULAR NOTIFICATION SYSTEM JAVASCRIPT
 * ระบบแจ้งเตือนแบบโมดูลาร์สำหรับระบบต่างๆ
 * Version: 1.0.0
 * =================================================================
 */

class ModularNotificationSystem {
  constructor(options = {}) {
    this.config = {
      modules: {
        accounting: { icon: 'bi-journal-text', title: 'งานบัญชี', color: '#3b82f6' },
        hr: { icon: 'bi-people-fill', title: 'ฝ่ายบุคคล', color: '#10b981' },
        stock: { icon: 'bi-box-fill', title: 'คลังสินค้า', color: '#f59e0b' },
        marketing: { icon: 'bi-megaphone-fill', title: 'การตลาด', color: '#8b5cf6' },
        loan: { icon: 'bi-credit-card-fill', title: 'สินเชื่อ', color: '#ef4444' },
        pos: { icon: 'bi-shop-window', title: 'POS', color: '#06b6d4' },
        gifts: { icon: 'bi-gift-fill', title: 'ของแถม', color: '#ec4899' },
        audit: { icon: 'bi-shield-check', title: 'Audit', color: '#64748b' }
      },
      defaultDuration: 4000,
      maxToasts: 5,
      position: 'top-right',
      enableSound: false,
      enablePersistence: true,
      autoHideDropdown: 30000,
      ...options
    };

    this.notifications = [];
    this.activeToasts = [];
    this.isInitialized = false;
    this.currentModule = options.module || 'pos';

    // Event listeners
    this.listeners = new Map();

    this.init();
  }

  // ===== INITIALIZATION ===== //
  init() {
    this.createContainers();
    this.bindEvents();
    this.loadPersistedNotifications();
    this.setupSystemStatusIndicators();
    this.isInitialized = true;

    console.log('🔔 Modular Notification System initialized');
    console.log('📦 Current module:', this.currentModule);
  }

  createContainers() {
    // Create toast container
    if (!document.getElementById('modular-toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'modular-toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    // Create system status indicators
    if (!document.getElementById('system-status')) {
      const statusContainer = document.createElement('div');
      statusContainer.id = 'system-status';
      statusContainer.className = 'system-status';

      Object.keys(this.config.modules).forEach(module => {
        const indicator = document.createElement('div');
        indicator.id = `status-${module}`;
        indicator.className = `system-status-item ${module}`;
        indicator.title = this.config.modules[module].title;
        statusContainer.appendChild(indicator);
      });

      document.body.appendChild(statusContainer);
    }
  }

  bindEvents() {
    // Global click handler for notification button
    document.addEventListener('click', (e) => {
      if (e.target.closest('.notification-button')) {
        this.toggleDropdown();
      } else if (!e.target.closest('.notification-dropdown')) {
        this.hideDropdown();
      }
    });

    // Mark all as read button
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mark-all-read')) {
        this.markAllAsRead();
      }
    });

    // Notification item clicks
    document.addEventListener('click', (e) => {
      const notificationItem = e.target.closest('.notification-item');
      if (notificationItem) {
        const notificationId = notificationItem.dataset.id;
        this.markAsRead(notificationId);
        this.emit('notification-clicked', { id: notificationId });
      }
    });

    // Auto-hide dropdown
    if (this.config.autoHideDropdown) {
      let autoHideTimeout;
      const dropdown = document.getElementById('notificationDropdown');

      if (dropdown) {
        dropdown.addEventListener('mouseenter', () => {
          if (autoHideTimeout) clearTimeout(autoHideTimeout);
        });

        dropdown.addEventListener('mouseleave', () => {
          autoHideTimeout = setTimeout(() => {
            this.hideDropdown();
          }, this.config.autoHideDropdown);
        });
      }
    }
  }

  // ===== TOAST NOTIFICATIONS ===== //
  showToast(message, options = {}) {
    const config = {
      type: 'info',
      module: this.currentModule,
      duration: this.config.defaultDuration,
      closable: true,
      title: null,
      icon: null,
      sound: this.config.enableSound,
      ...options
    };

    // Clean up old toasts if at max limit
    if (this.activeToasts.length >= this.config.maxToasts) {
      this.hideToast(this.activeToasts[0].id);
    }

    const toastId = this.generateId();
    const toast = this.createToastElement(toastId, message, config);

    const container = document.getElementById('modular-toast-container');
    if (!container) {
      console.error('Toast container not found');
      return null;
    }

    container.appendChild(toast);

    // Store active toast reference
    this.activeToasts.push({ id: toastId, element: toast, config });

    // Show animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto hide
    if (config.duration > 0) {
      setTimeout(() => {
        this.hideToast(toastId);
      }, config.duration);
    }

    // Play sound
    if (config.sound && this.config.enableSound) {
      this.playNotificationSound(config.type);
    }

    // Update system status
    this.updateSystemStatus(config.module, true);

    console.log(`🔔 Toast shown: ${message} (${config.type}, ${config.module})`);

    return toastId;
  }

  createToastElement(id, message, config) {
    const toast = document.createElement('div');
    toast.className = `notification-toast toast-${config.type} toast-${config.module}`;
    toast.dataset.id = id;

    const moduleConfig = this.config.modules[config.module] || this.config.modules.pos;
    const icon = config.icon || this.getTypeIcon(config.type);
    const title = config.title || this.getTypeTitle(config.type, config.module);

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="bi ${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${config.closable ? '<button class="toast-close" onclick="window.moduleNotificationSystem?.hideToast(\'' + id + '\')"><i class="bi bi-x"></i></button>' : ''}
      ${config.duration > 0 ? '<div class="toast-progress"><div class="toast-progress-fill" style="animation-duration: ' + config.duration + 'ms;"></div></div>' : ''}
    `;

    return toast;
  }

  hideToast(toastId) {
    const toastIndex = this.activeToasts.findIndex(t => t.id === toastId);
    if (toastIndex === -1) return;

    const toastData = this.activeToasts[toastIndex];
    const toast = toastData.element;

    toast.classList.add('hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToasts.splice(toastIndex, 1);
    }, 400);

    console.log(`🔔 Toast hidden: ${toastId}`);
  }

  // ===== DROPDOWN NOTIFICATIONS ===== //
  addNotification(notification) {
    const notificationData = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      read: false,
      module: this.currentModule,
      type: 'info',
      priority: 'normal',
      ...notification
    };

    this.notifications.unshift(notificationData);

    // Limit stored notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.updateDropdown();
    this.updateBadge();
    this.persistNotifications();

    // Show system status activity
    this.updateSystemStatus(notificationData.module, true);

    console.log(`📬 Notification added:`, notificationData);

    return notificationData.id;
  }

  updateDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const content = dropdown.querySelector('.notification-dropdown-content');
    if (!content) return;

    if (this.notifications.length === 0) {
      content.innerHTML = `
        <div class="notification-loading">
          <i class="bi bi-bell-slash text-2xl mb-2"></i>
          <p>ไม่มีการแจ้งเตือนใหม่</p>
        </div>
      `;
      return;
    }

    const notificationsHtml = this.notifications.slice(0, 50).map(notif => {
      const moduleConfig = this.config.modules[notif.module] || this.config.modules.pos;
      const timeAgo = this.getTimeAgo(notif.timestamp);

      return `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
          <div class="notification-item-icon" style="color: ${moduleConfig.color}">
            <i class="bi ${moduleConfig.icon}"></i>
          </div>
          <div class="notification-item-content">
            <div class="notification-item-title">${notif.title}</div>
            <div class="notification-item-message">${notif.message}</div>
            <div class="notification-item-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = notificationsHtml;
  }

  toggleDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const isVisible = dropdown.classList.contains('show');

    if (isVisible) {
      this.hideDropdown();
    } else {
      this.showDropdown();
    }
  }

  showDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    this.updateDropdown();
    dropdown.classList.add('show');
    this.hideNotificationIndicator();

    console.log('📂 Notification dropdown shown');
  }

  hideDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    dropdown.classList.remove('show');
    console.log('📂 Notification dropdown hidden');
  }

  // ===== BADGE & INDICATORS ===== //
  updateBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;

    const badge = document.getElementById('notificationBadge');
    const dot = document.getElementById('notificationDot');

    if (unreadCount > 0) {
      if (badge) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
      }
      if (dot) {
        dot.classList.remove('hidden');
      }
    } else {
      if (badge) badge.classList.add('hidden');
      if (dot) dot.classList.add('hidden');
    }
  }

  showNotificationIndicator() {
    const dot = document.getElementById('notificationDot');
    const badge = document.getElementById('notificationBadge');

    if (dot) dot.classList.remove('hidden');
    if (badge) badge.classList.remove('hidden');
  }

  hideNotificationIndicator() {
    const dot = document.getElementById('notificationDot');
    if (dot) dot.classList.add('hidden');
  }

  // ===== SYSTEM STATUS ===== //
  updateSystemStatus(module, active = false) {
    const indicator = document.getElementById(`status-${module}`);
    if (!indicator) return;

    if (active) {
      indicator.classList.add('active');
      setTimeout(() => {
        indicator.classList.remove('active');
      }, 3000);
    }
  }

  setupSystemStatusIndicators() {
    const statusContainer = document.getElementById('system-status');
    if (!statusContainer) return;

    Object.keys(this.config.modules).forEach(module => {
      const indicator = document.getElementById(`status-${module}`);
      if (indicator) {
        indicator.addEventListener('click', () => {
          this.filterNotificationsByModule(module);
          this.showDropdown();
        });
      }
    });
  }

  // ===== NOTIFICATION MANAGEMENT ===== //
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateDropdown();
      this.updateBadge();
      this.persistNotifications();

      console.log(`✅ Notification marked as read: ${notificationId}`);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateDropdown();
    this.updateBadge();
    this.persistNotifications();

    console.log('✅ All notifications marked as read');
  }

  removeNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.updateDropdown();
      this.updateBadge();
      this.persistNotifications();

      console.log(`🗑️ Notification removed: ${notificationId}`);
    }
  }

  clearAllNotifications() {
    this.notifications = [];
    this.updateDropdown();
    this.updateBadge();
    this.persistNotifications();

    console.log('🗑️ All notifications cleared');
  }

  filterNotificationsByModule(module) {
    const filteredNotifications = this.notifications.filter(n => n.module === module);

    // Temporarily show only filtered notifications
    const content = document.querySelector('.notification-dropdown-content');
    if (!content) return;

    if (filteredNotifications.length === 0) {
      content.innerHTML = `
        <div class="notification-loading">
          <i class="bi ${this.config.modules[module]?.icon || 'bi-bell-slash'}" style="color: ${this.config.modules[module]?.color || '#6b7280'}"></i>
          <p>ไม่มีการแจ้งเตือนจาก ${this.config.modules[module]?.title || module}</p>
        </div>
      `;
      return;
    }

    const notificationsHtml = filteredNotifications.map(notif => {
      const moduleConfig = this.config.modules[notif.module] || this.config.modules.pos;
      const timeAgo = this.getTimeAgo(notif.timestamp);

      return `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
          <div class="notification-item-icon" style="color: ${moduleConfig.color}">
            <i class="bi ${moduleConfig.icon}"></i>
          </div>
          <div class="notification-item-content">
            <div class="notification-item-title">${notif.title}</div>
            <div class="notification-item-message">${notif.message}</div>
            <div class="notification-item-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = notificationsHtml;
  }

  // ===== PERSISTENCE ===== //
  persistNotifications() {
    if (!this.config.enablePersistence) return;

    try {
      localStorage.setItem('modular_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.warn('Failed to persist notifications:', error);
    }
  }

  loadPersistedNotifications() {
    if (!this.config.enablePersistence) return;

    try {
      const stored = localStorage.getItem('modular_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.updateDropdown();
        this.updateBadge();
      }
    } catch (error) {
      console.warn('Failed to load persisted notifications:', error);
      this.notifications = [];
    }
  }

  // ===== MODULE METHODS ===== //
  setCurrentModule(module) {
    if (this.config.modules[module]) {
      this.currentModule = module;
      console.log(`🎯 Module changed to: ${module}`);
    } else {
      console.warn(`⚠️ Unknown module: ${module}`);
    }
  }

  createModuleNotification(module, message, options = {}) {
    const moduleConfig = this.config.modules[module];
    if (!moduleConfig) {
      console.warn(`⚠️ Unknown module: ${module}`);
      return null;
    }

    return this.addNotification({
      title: `${moduleConfig.title}`,
      message,
      module,
      icon: moduleConfig.icon,
      ...options
    });
  }

  // ===== UTILITY METHODS ===== //
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTypeIcon(type) {
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    return icons[type] || icons.info;
  }

  getTypeTitle(type, module) {
    const moduleConfig = this.config.modules[module];
    const moduleTitle = moduleConfig ? moduleConfig.title : 'ระบบ';

    const titles = {
      success: `✅ ${moduleTitle}`,
      error: `❌ ${moduleTitle}`,
      warning: `⚠️ ${moduleTitle}`,
      info: `ℹ️ ${moduleTitle}`
    };
    return titles[type] || titles.info;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return notifTime.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  }

  playNotificationSound(type = 'info') {
    if (!this.config.enableSound) return;

    try {
      // You can implement custom sound files here
      const audio = new Audio();
      audio.volume = 0.3;

      switch (type) {
        case 'success':
          audio.src = '/sounds/success.mp3';
          break;
        case 'error':
          audio.src = '/sounds/error.mp3';
          break;
        case 'warning':
          audio.src = '/sounds/warning.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }

      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // ===== EVENT SYSTEM ===== //
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  // ===== DEBUG & TESTING ===== //
  debug() {
    return {
      version: '1.0.0',
      currentModule: this.currentModule,
      totalNotifications: this.notifications.length,
      unreadNotifications: this.notifications.filter(n => !n.read).length,
      activeToasts: this.activeToasts.length,
      availableModules: Object.keys(this.config.modules),
      isInitialized: this.isInitialized,
      config: this.config
    };
  }

  test() {
    console.log(`🧪 Testing module: ${this.currentModule}`);

    setTimeout(() => this.showToast('ทดสอบการแจ้งเตือนสำเร็จ', { type: 'success' }), 100);
    setTimeout(() => this.showToast('ทดสอบการแจ้งเตือนข้อมูล', { type: 'info' }), 600);
    setTimeout(() => this.showToast('ทดสอบการแจ้งเตือนคำเตือน', { type: 'warning' }), 1100);
    setTimeout(() => this.showToast('ทดสอบการแจ้งเตือนข้อผิดพลาด', { type: 'error' }), 1600);

    setTimeout(() => {
      this.addNotification({
        title: `ทดสอบ ${this.config.modules[this.currentModule].title}`,
        message: 'ระบบทำงานปกติ',
        type: 'info'
      });
    }, 2100);
  }
}

// ===== GLOBAL SETUP & CONVENIENCE FUNCTIONS ===== //

// Auto-initialize when DOM is ready
function initializeModularNotificationSystem(options = {}) {
  if (window.moduleNotificationSystem) return window.moduleNotificationSystem;

  // Auto-detect module from URL
  const path = window.location.pathname;
  let module = 'pos';

  if (path.includes('accounting')) module = 'accounting';
  else if (path.includes('hr') || path.includes('HR')) module = 'hr';
  else if (path.includes('stock') || path.includes('Stock')) module = 'stock';
  else if (path.includes('marketing')) module = 'marketing';
  else if (path.includes('loan')) module = 'loan';
  else if (path.includes('gift')) module = 'gifts';
  else if (path.includes('audit')) module = 'audit';

  window.moduleNotificationSystem = new ModularNotificationSystem({ module, ...options });
  return window.moduleNotificationSystem;
}

// Global convenience functions
window.showModuleToast = function(message, type = 'info', options = {}) {
  if (!window.moduleNotificationSystem) {
    initializeModularNotificationSystem();
  }
  return window.moduleNotificationSystem.showToast(message, { type, ...options });
};

window.addModuleNotification = function(notification) {
  if (!window.moduleNotificationSystem) {
    initializeModularNotificationSystem();
  }
  return window.moduleNotificationSystem.addNotification(notification);
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModularNotificationSystem);
} else {
  initializeModularNotificationSystem();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularNotificationSystem;
}

console.log('📢 Modular Notification System script loaded');
console.log('🔧 Global functions: showModuleToast(), addModuleNotification()');
console.log('🧪 Test: window.moduleNotificationSystem.test()');