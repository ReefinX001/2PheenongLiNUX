/**
 * Enhanced Socket.IO Client with Error Handling for Thai Accounting System
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Fallback to polling when real-time fails
 * - Thai language error messages
 * - Connection health monitoring
 * - Graceful degradation
 *
 * @version 1.0.0
 * @author Thai Accounting System
 */

class EnhancedSocketClient {
  constructor(options = {}) {
    this.options = {
      url: options.url || window.location.origin,
      transports: ['websocket', 'polling'],
      autoConnect: options.autoConnect !== false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      maxReconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false,
      ...options
    };

    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.fallbackMode = false;
    this.eventListeners = new Map();
    this.pendingEvents = [];
    this.healthCheckInterval = null;
    this.connectionStartTime = null;
    this.lastPingTime = null;

    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);

    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect();
    }

    this.initializeUIElements();
  }

  /**
   * Initialize UI elements for connection status
   */
  initializeUIElements() {
    // Create connection status indicator
    this.createConnectionStatusElement();

    // Create error notification container
    this.createErrorNotificationContainer();
  }

  /**
   * Create connection status indicator in the UI
   */
  createConnectionStatusElement() {
    // Remove existing status element if any
    const existingStatus = document.getElementById('socket-connection-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const statusElement = document.createElement('div');
    statusElement.id = 'socket-connection-status';
    statusElement.className = 'socket-status-indicator';
    statusElement.innerHTML = `
      <div class="status-dot offline"></div>
      <span class="status-text">กำลังเชื่อมต่อ...</span>
    `;

    // Add CSS if not already present
    if (!document.getElementById('socket-status-styles')) {
      const styles = document.createElement('style');
      styles.id = 'socket-status-styles';
      styles.textContent = `
        .socket-status-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-family: 'Sarabun', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 9999;
          transition: all 0.3s ease;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        .status-dot.online {
          background-color: #10b981;
          box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
        }
        .status-dot.offline {
          background-color: #ef4444;
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }
        .status-dot.connecting {
          background-color: #f59e0b;
          box-shadow: 0 0 4px rgba(245, 158, 11, 0.5);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .status-text {
          color: #374151;
          font-weight: 500;
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(statusElement);
    this.statusElement = statusElement;
  }

  /**
   * Create error notification container
   */
  createErrorNotificationContainer() {
    if (document.getElementById('socket-notifications')) return;

    const container = document.createElement('div');
    container.id = 'socket-notifications';
    container.className = 'socket-notifications-container';

    const styles = document.createElement('style');
    styles.textContent = `
      .socket-notifications-container {
        position: fixed;
        top: 60px;
        right: 10px;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 10000;
        pointer-events: none;
      }
      .socket-notification {
        background: white;
        border-left: 4px solid;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-family: 'Sarabun', sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
      }
      .socket-notification.show {
        opacity: 1;
        transform: translateX(0);
      }
      .socket-notification.error {
        border-left-color: #ef4444;
        background: #fef2f2;
      }
      .socket-notification.warning {
        border-left-color: #f59e0b;
        background: #fffbeb;
      }
      .socket-notification.success {
        border-left-color: #10b981;
        background: #f0fdf4;
      }
      .socket-notification.info {
        border-left-color: #3b82f6;
        background: #eff6ff;
      }
      .notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #374151;
      }
      .notification-message {
        color: #6b7280;
        line-height: 1.4;
      }
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
      }
      .notification-close:hover {
        color: #374151;
      }
    `;
    document.head.appendChild(styles);
    document.body.appendChild(container);
    this.notificationContainer = container;
  }

  /**
   * Connect to Socket.IO server with enhanced error handling
   */
  connect() {
    try {
      this.connectionStartTime = new Date();
      this.updateConnectionStatus('connecting', 'กำลังเชื่อมต่อ...');

      // Initialize socket connection
      this.socket = io(this.options.url, {
        transports: this.options.transports,
        autoConnect: false,
        reconnection: this.options.reconnection,
        reconnectionAttempts: this.options.reconnectionAttempts,
        reconnectionDelay: this.options.reconnectionDelay,
        reconnectionDelayMax: this.options.reconnectionDelayMax,
        timeout: this.options.timeout,
        forceNew: this.options.forceNew
      });

      this.setupEventHandlers();
      this.socket.connect();

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          this.showNotification('warning', 'การเชื่อมต่อช้า', 'กำลังพยายามเชื่อมต่อ กรุณารอสักครู่...');
        }
      }, 10000);

    } catch (error) {
      console.error('Socket connection error:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    // Connection successful
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.fallbackMode = false;

      const connectionTime = new Date() - this.connectionStartTime;
      this.updateConnectionStatus('online', 'เชื่อมต่อแล้ว');

      this.showNotification('success', 'เชื่อมต่อสำเร็จ',
        `เชื่อมต่อระบบสำเร็จแล้ว (${connectionTime}ms)`);

      // Process pending events
      this.processPendingEvents();

      // Start health monitoring
      this.startHealthMonitoring();

      console.log('✅ Socket connected:', this.socket.id);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      this.handleConnectionError(error);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.updateConnectionStatus('offline', 'การเชื่อมต่อขาดหาย');
      this.stopHealthMonitoring();

      console.warn('❌ Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server disconnected the client, need manual reconnection
        this.showNotification('warning', 'เซิร์ฟเวอร์ตัดการเชื่อมต่อ',
          'กำลังพยายามเชื่อมต่อใหม่...');
        this.socket.connect();
      } else {
        // Client disconnected, automatic reconnection
        this.showNotification('info', 'การเชื่อมต่อขาดหาย',
          'กำลังพยายามเชื่อมต่อใหม่อัตโนมัติ...');
      }
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      this.updateConnectionStatus('connecting', `กำลังเชื่อมต่อใหม่... (${attemptNumber}/${this.options.maxReconnectionAttempts})`);

      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      this.showNotification('success', 'เชื่อมต่อใหม่สำเร็จ',
        `เชื่อมต่อระบบใหม่สำเร็จหลังจากพยายาม ${attemptNumber} ครั้ง`);

      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      this.updateConnectionStatus('offline', 'ไม่สามารถเชื่อมต่อได้');
      this.activateFallbackMode();

      this.showNotification('error', 'การเชื่อมต่อล้มเหลว',
        'ไม่สามารถเชื่อมต่อได้ เปลี่ยนเป็นโหมดออฟไลน์');

      console.error('❌ Reconnection failed');
    });

    // Server-sent error notifications
    this.socket.on('error_notification', (data) => {
      this.showNotification('error', 'ข้อผิดพลาด', data.message);
    });

    // Server-sent connection warnings
    this.socket.on('connection_warning', (data) => {
      this.showNotification('warning', 'คำเตือน', data.message);
    });

    // Connection health responses
    this.socket.on('ping', (data) => {
      this.socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Stock-specific events
    this.setupStockEventHandlers();
  }

  /**
   * Setup stock-specific event handlers
   */
  setupStockEventHandlers() {
    this.socket.on('stock_error', (data) => {
      this.showNotification('error', `ข้อผิดพลาด: ${data.operation}`,
        `${data.message}\n${data.suggestion}`);
    });

    this.socket.on('stock_update_success', (data) => {
      this.showNotification('success', 'อัปเดตสต็อกสำเร็จ', data.message);
    });

    this.socket.on('stock_updated', (data) => {
      // Handle real-time stock updates from other users
      this.triggerEvent('stock_updated', data);
    });
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    this.reconnectAttempts++;

    console.error('Socket connection error:', error);

    const errorMessages = {
      'xhr poll error': 'ปัญหาการเชื่อมต่อเครือข่าย',
      'websocket error': 'ปัญหา WebSocket',
      'timeout': 'การเชื่อมต่อหมดเวลา',
      'transport close': 'การขนส่งข้อมูลหยุดทำงาน',
      'transport error': 'ข้อผิดพลาดการขนส่งข้อมูล'
    };

    const message = errorMessages[error.type] || 'ข้อผิดพลาดการเชื่อมต่อ';

    this.updateConnectionStatus('offline', `${message} (${this.reconnectAttempts}/${this.options.maxReconnectionAttempts})`);

    if (this.reconnectAttempts >= this.options.maxReconnectionAttempts) {
      this.activateFallbackMode();
      this.showNotification('error', 'การเชื่อมต่อล้มเหลว',
        'เปลี่ยนเป็นโหมดออฟไลน์ ฟีเจอร์แบบเรียลไทม์จะไม่ทำงาน');
    } else {
      this.showNotification('warning', 'ปัญหาการเชื่อมต่อ',
        `${message} กำลังพยายามเชื่อมต่อใหม่...`);
    }
  }

  /**
   * Activate fallback mode when real-time connection fails
   */
  activateFallbackMode() {
    this.fallbackMode = true;
    this.updateConnectionStatus('offline', 'โหมดออฟไลน์');

    // Start polling for critical updates
    this.startPollingFallback();

    console.warn('⚠️ Activating fallback mode - real-time features disabled');
  }

  /**
   * Start polling fallback for critical updates
   */
  startPollingFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        // Poll for critical stock updates
        await this.pollStockUpdates();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  /**
   * Poll for stock updates when in fallback mode
   */
  async pollStockUpdates() {
    try {
      const response = await fetch('/api/stock/updates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('authToken') || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updates && data.updates.length > 0) {
          this.showNotification('info', 'อัปเดตข้อมูล',
            `พบการเปลี่ยนแปลงข้อมูลสต็อก ${data.updates.length} รายการ`);

          // Trigger events for updates
          data.updates.forEach(update => {
            this.triggerEvent('stock_updated', update);
          });
        }
      }
    } catch (error) {
      console.error('Failed to poll stock updates:', error);
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected) {
        const now = new Date();
        this.lastPingTime = now;
        this.socket.emit('ping', { timestamp: now.toISOString() });
      }
    }, 30000); // Health check every 30 seconds
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Emit event with fallback handling
   */
  emit(event, data, callback) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data, callback);
    } else {
      // Queue event for later processing
      this.pendingEvents.push({ event, data, callback, timestamp: new Date() });

      if (this.fallbackMode) {
        this.showNotification('warning', 'โหมดออฟไลน์',
          'คำสั่งจะถูกส่งเมื่อกลับมาออนไลน์');
      }
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Trigger event to registered listeners
   */
  triggerEvent(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Process pending events after reconnection
   */
  processPendingEvents() {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    this.pendingEvents = this.pendingEvents.filter(item => {
      const age = now - item.timestamp;

      if (age > maxAge) {
        // Event too old, discard
        return false;
      }

      // Resend event
      this.socket.emit(item.event, item.data, item.callback);
      return false;
    });

    if (this.pendingEvents.length > 0) {
      this.showNotification('info', 'ส่งคำสั่งที่ค้าง',
        `ส่งคำสั่งที่ค้างไว้ ${this.pendingEvents.length} รายการ`);
    }

    this.pendingEvents = [];
  }

  /**
   * Update connection status in UI
   */
  updateConnectionStatus(status, message) {
    if (!this.statusElement) return;

    const dot = this.statusElement.querySelector('.status-dot');
    const text = this.statusElement.querySelector('.status-text');

    dot.className = `status-dot ${status}`;
    text.textContent = message;
  }

  /**
   * Show notification to user
   */
  showNotification(type, title, message, duration = 5000) {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = `socket-notification ${type}`;
    notification.innerHTML = `
      <button class="notification-close">&times;</button>
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    `;

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    this.notificationContainer.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto remove
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
  }

  /**
   * Remove notification from UI
   */
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    this.stopHealthMonitoring();

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.updateConnectionStatus('offline', 'ตัดการเชื่อมต่อ');
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket ? this.socket.id : null,
      fallbackMode: this.fallbackMode,
      reconnectAttempts: this.reconnectAttempts,
      connectionTime: this.connectionStartTime,
      lastPing: this.lastPingTime,
      pendingEvents: this.pendingEvents.length
    };
  }
}

// Export for use in modules or create global instance
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedSocketClient;
} else {
  // Create global instance for browser use
  window.enhancedSocket = new EnhancedSocketClient({
    autoConnect: true
  });
}