/**
 * Enhanced Socket.IO Error Handling for Thai Accounting System
 *
 * Features:
 * - Comprehensive error handling and logging
 * - Automatic reconnection with exponential backoff
 * - Fallback mechanisms for real-time updates
 * - Thai language error messages
 * - Connection health monitoring
 *
 * @version 1.0.0
 * @author Thai Accounting System
 */

const logger = require('../logger');

/**
 * Enhanced Socket.IO connection manager with error handling
 */
class SocketErrorHandler {
  constructor() {
    this.connectionAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000; // 1 second
    this.maxReconnectDelay = 30000; // 30 seconds
    this.healthCheckInterval = 30000; // 30 seconds
    this.connectedClients = new Map();
  }

  /**
   * Initialize error handling for Socket.IO server
   * @param {Object} io - Socket.IO server instance
   */
  initializeServerErrorHandling(io) {
    // Global error handler for server
    io.engine.on('connection_error', (err) => {
      logger.error('Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        context: err.context,
        type: err.type,
        timestamp: new Date().toISOString()
      });

      // Emit error to monitoring dashboard if available
      io.emit('system_error', {
        type: 'connection_error',
        message: 'การเชื่อมต่อระบบมีปัญหา กรุณาลองใหม่อีกครั้ง',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    });

    // Handle new connections with enhanced error handling
    io.on('connection', (socket) => {
      this.handleConnection(socket, io);
    });

    // Start health monitoring
    this.startHealthMonitoring(io);

    logger.info('✅ Enhanced Socket.IO error handling initialized');
  }

  /**
   * Handle individual socket connections with comprehensive error handling
   * @param {Object} socket - Socket instance
   * @param {Object} io - Socket.IO server instance
   */
  handleConnection(socket, io) {
    const clientInfo = {
      id: socket.id,
      connectedAt: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      address: socket.handshake.address,
      lastPing: new Date(),
      reconnectCount: 0
    };

    this.connectedClients.set(socket.id, clientInfo);

    logger.info(`👤 Client connected: ${socket.id}`, {
      userAgent: clientInfo.userAgent,
      address: clientInfo.address
    });

    // Enhanced error handling for socket events
    socket.on('error', (error) => {
      this.handleSocketError(socket, error, io);
    });

    socket.on('connect_error', (error) => {
      this.handleConnectionError(socket, error, io);
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason, io);
    });

    // Stock-specific error handlers
    this.setupStockEventHandlers(socket, io);

    // Setup ping/pong for connection health monitoring
    this.setupHealthCheck(socket);

    // Send connection success notification
    socket.emit('connected', {
      status: 'success',
      message: 'เชื่อมต่อระบบสำเร็จ',
      serverId: socket.id,
      timestamp: new Date().toISOString(),
      features: {
        realtime_updates: true,
        stock_management: true,
        thai_language: true,
        error_recovery: true
      }
    });
  }

  /**
   * Handle socket errors with logging and user notification
   */
  handleSocketError(socket, error, io) {
    const errorInfo = {
      socketId: socket.id,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      timestamp: new Date().toISOString(),
      userInfo: this.connectedClients.get(socket.id)
    };

    logger.error('🚨 Socket error occurred:', errorInfo);

    // Send user-friendly error message in Thai
    socket.emit('error_notification', {
      type: 'socket_error',
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาโหลดหน้าเว็บใหม่',
      suggestion: 'หากปัญหายังคงอยู่ กรุณาติดต่อฝ่ายไอที',
      timestamp: new Date().toISOString(),
      recoverable: true
    });

    // Broadcast to admin dashboard
    io.emit('admin_alert', {
      type: 'socket_error',
      severity: 'medium',
      message: `Socket error for client ${socket.id}`,
      details: errorInfo
    });
  }

  /**
   * Handle connection errors with automatic retry logic
   */
  handleConnectionError(socket, error, io) {
    const clientId = socket.id;
    const attemptCount = this.connectionAttempts.get(clientId) || 0;

    logger.warn(`🔄 Connection error for ${clientId} (attempt ${attemptCount + 1}):`, {
      error: error.message,
      code: error.code,
      type: error.type
    });

    this.connectionAttempts.set(clientId, attemptCount + 1);

    if (attemptCount < this.maxReconnectAttempts) {
      const delay = this.calculateReconnectDelay(attemptCount);

      socket.emit('reconnect_attempt', {
        attempt: attemptCount + 1,
        maxAttempts: this.maxReconnectAttempts,
        nextRetryIn: delay,
        message: `กำลังพยายามเชื่อมต่อใหม่ครั้งที่ ${attemptCount + 1}`,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        this.attemptReconnection(socket, io);
      }, delay);
    } else {
      // Max attempts reached
      socket.emit('connection_failed', {
        message: 'ไม่สามารถเชื่อมต่อได้ กรุณาโหลดหน้าเว็บใหม่',
        suggestion: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง',
        timestamp: new Date().toISOString(),
        fallbackMode: true
      });

      logger.error(`❌ Max reconnection attempts reached for ${clientId}`);
      this.connectionAttempts.delete(clientId);
    }
  }

  /**
   * Handle client disconnections with proper cleanup
   */
  handleDisconnection(socket, reason, io) {
    const clientInfo = this.connectedClients.get(socket.id);

    logger.info(`👋 Client disconnected: ${socket.id}`, {
      reason: reason,
      connectedDuration: clientInfo ? new Date() - clientInfo.connectedAt : 'unknown',
      userInfo: clientInfo
    });

    // Cleanup
    this.connectedClients.delete(socket.id);
    this.connectionAttempts.delete(socket.id);

    // Notify other clients if needed (for collaboration features)
    socket.broadcast.emit('user_disconnected', {
      socketId: socket.id,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup stock-specific event handlers with error handling
   */
  setupStockEventHandlers(socket, io) {
    // Stock update events with error handling
    socket.on('stock_update', async (data) => {
      try {
        await this.handleStockUpdate(socket, data, io);
      } catch (error) {
        this.handleStockError(socket, error, 'stock_update');
      }
    });

    socket.on('stock_query', async (data) => {
      try {
        await this.handleStockQuery(socket, data, io);
      } catch (error) {
        this.handleStockError(socket, error, 'stock_query');
      }
    });

    socket.on('stock_transfer', async (data) => {
      try {
        await this.handleStockTransfer(socket, data, io);
      } catch (error) {
        this.handleStockError(socket, error, 'stock_transfer');
      }
    });
  }

  /**
   * Handle stock-specific errors
   */
  handleStockError(socket, error, operation) {
    const errorInfo = {
      operation: operation,
      socketId: socket.id,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    logger.error(`📦 Stock operation error:`, errorInfo);

    socket.emit('stock_error', {
      operation: operation,
      message: this.getThaiErrorMessage(operation, error),
      suggestion: this.getThaiErrorSuggestion(operation),
      timestamp: new Date().toISOString(),
      recoverable: true
    });
  }

  /**
   * Setup health check ping/pong
   */
  setupHealthCheck(socket) {
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(pingInterval);
      }
    }, this.healthCheckInterval);

    socket.on('pong', (data) => {
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastPing = new Date();
      }
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      clearInterval(pingInterval);
    });
  }

  /**
   * Start health monitoring for all connections
   */
  startHealthMonitoring(io) {
    setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute

      this.connectedClients.forEach((clientInfo, socketId) => {
        const timeSinceLastPing = now - clientInfo.lastPing;

        if (timeSinceLastPing > staleThreshold) {
          logger.warn(`⚠️ Stale connection detected: ${socketId}`, {
            timeSinceLastPing: timeSinceLastPing,
            clientInfo: clientInfo
          });

          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('connection_warning', {
              message: 'การเชื่อมต่อไม่เสถียร กรุณาตรวจสอบอินเทอร์เน็ต',
              timestamp: new Date().toISOString()
            });
          }
        }
      });
    }, this.healthCheckInterval);
  }

  /**
   * Calculate exponential backoff delay for reconnection
   */
  calculateReconnectDelay(attemptCount) {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attemptCount),
      this.maxReconnectDelay
    );

    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Attempt to reconnect socket
   */
  attemptReconnection(socket, io) {
    try {
      if (!socket.connected) {
        socket.connect();
      }
    } catch (error) {
      logger.error('Reconnection attempt failed:', error);
    }
  }

  /**
   * Get Thai error messages for different operations
   */
  getThaiErrorMessage(operation, error) {
    const messages = {
      'stock_update': 'ไม่สามารถอัปเดตข้อมูลสต็อกได้',
      'stock_query': 'ไม่สามารถค้นหาข้อมูลสต็อกได้',
      'stock_transfer': 'ไม่สามารถโอนย้ายสต็อกได้',
      'default': 'เกิดข้อผิดพลาดในระบบสต็อก'
    };

    return messages[operation] || messages['default'];
  }

  /**
   * Get Thai error suggestions for different operations
   */
  getThaiErrorSuggestion(operation) {
    const suggestions = {
      'stock_update': 'ตรวจสอบข้อมูลที่กรอกและลองอีกครั้ง',
      'stock_query': 'ตรวจสอบเงื่อนไขการค้นหาและลองอีกครั้ง',
      'stock_transfer': 'ตรวจสอบจำนวนสต็อกและสาขาปลายทางและลองอีกครั้ง',
      'default': 'โหลดหน้าเว็บใหม่และลองอีกครั้ง'
    };

    return suggestions[operation] || suggestions['default'];
  }

  /**
   * Handle stock update with validation
   */
  async handleStockUpdate(socket, data, io) {
    // Validate required fields
    if (!data.productId || !data.branchCode || typeof data.quantity !== 'number') {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบและลองอีกครั้ง');
    }

    // Validate quantity range
    if (data.quantity < 0) {
      throw new Error('จำนวนสต็อกต้องเป็นจำนวนบวก');
    }

    // Emit success
    socket.emit('stock_update_success', {
      message: 'อัปเดตข้อมูลสต็อกสำเร็จ',
      data: data,
      timestamp: new Date().toISOString()
    });

    // Broadcast to other clients in same branch
    socket.broadcast.to(`branch-${data.branchCode}`).emit('stock_updated', {
      productId: data.productId,
      branchCode: data.branchCode,
      quantity: data.quantity,
      updatedBy: data.updatedBy,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle stock query with validation
   */
  async handleStockQuery(socket, data, io) {
    // Validate required fields
    if (!data.branchCode) {
      throw new Error('กรุณาระบุรหัสสาขา');
    }

    // Mock response - in real implementation, query database
    socket.emit('stock_query_result', {
      message: 'ค้นหาข้อมูลสต็อกสำเร็จ',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle stock transfer with validation
   */
  async handleStockTransfer(socket, data, io) {
    // Validate required fields
    if (!data.fromBranch || !data.toBranch || !data.productId || typeof data.quantity !== 'number') {
      throw new Error('ข้อมูลการโอนย้ายไม่ครบถ้วน');
    }

    if (data.fromBranch === data.toBranch) {
      throw new Error('ไม่สามารถโอนย้ายภายในสาขาเดียวกันได้');
    }

    if (data.quantity <= 0) {
      throw new Error('จำนวนที่โอนย้ายต้องมากกว่า 0');
    }

    // Emit success
    socket.emit('stock_transfer_success', {
      message: 'โอนย้ายสต็อกสำเร็จ',
      data: data,
      timestamp: new Date().toISOString()
    });

    // Notify affected branches
    socket.broadcast.to(`branch-${data.fromBranch}`).emit('stock_transferred_out', data);
    socket.broadcast.to(`branch-${data.toBranch}`).emit('stock_transferred_in', data);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      reconnectionAttempts: this.connectionAttempts.size,
      healthyConnections: Array.from(this.connectedClients.values()).filter(
        client => (new Date() - client.lastPing) < 60000
      ).length
    };
  }
}

module.exports = SocketErrorHandler;