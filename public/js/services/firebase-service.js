/**
 * Firebase Service Module - Secure Firebase integration
 * ระบบจัดการ Firebase แบบปลอดภัย
 */

class FirebaseService {
  constructor() {
    this.app = null;
    this.database = null;
    this.initialized = false;
    this.connectionStatus = false;
    this.refs = {};
    this.listeners = new Map();
  }

  // Initialize Firebase with environment variables
  async initialize() {
    try {
      // Check if Firebase config is available (should be loaded from server)
      if (!window.firebaseConfig) {
        throw new Error('Firebase configuration not found. Please contact administrator.');
      }

      // Import Firebase modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js');
      const {
        getDatabase,
        ref,
        set,
        get,
        push,
        onValue,
        off,
        serverTimestamp,
        onDisconnect,
        remove
      } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js');

      // Initialize Firebase
      this.app = initializeApp(window.firebaseConfig);
      this.database = getDatabase(this.app);

      // Store Firebase functions for global access
      this.ref = ref;
      this.set = set;
      this.get = get;
      this.push = push;
      this.onValue = onValue;
      this.off = off;
      this.serverTimestamp = serverTimestamp;
      this.onDisconnect = onDisconnect;
      this.remove = remove;

      this.initialized = true;
      console.log('🔥 Firebase initialized successfully');

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  // Setup connection monitoring
  setupConnectionMonitoring() {
    const connectedRef = this.ref(this.database, '.info/connected');

    this.onValue(connectedRef, (snapshot) => {
      this.connectionStatus = snapshot.val();
      console.log(this.connectionStatus ? '🔥 Firebase connected' : '❌ Firebase disconnected');

      // Emit connection status change event
      this.emit('connectionChanged', this.connectionStatus);
    });
  }

  // Check if Firebase is ready
  isReady() {
    return this.initialized && this.connectionStatus;
  }

  // Setup references for a branch
  setupBranchRefs(branchCode, sessionId) {
    if (!this.isReady()) {
      throw new Error('Firebase not initialized or connected');
    }

    this.refs = {
      connection: this.ref(this.database, '.info/connected'),
      notifications: this.ref(this.database, `pos/${branchCode}/notifications`),
      sessions: this.ref(this.database, `pos/${branchCode}/sessions/${sessionId}`),
      depositReceipts: this.ref(this.database, `pos/${branchCode}/depositReceipts`),
      depositReceiptUpdates: this.ref(this.database, `pos/${branchCode}/depositReceiptUpdates`),
      onlineUsers: this.ref(this.database, `pos/${branchCode}/onlineUsers`),
      activityHistory: this.ref(this.database, `pos/${branchCode}/activityHistory`)
    };

    return this.refs;
  }

  // Register session
  async registerSession(sessionData) {
    if (!this.isReady() || !this.refs.sessions) {
      throw new Error('Firebase not ready or session ref not setup');
    }

    try {
      await this.set(this.refs.sessions, {
        ...sessionData,
        timestamp: this.serverTimestamp(),
        status: 'active'
      });

      // Setup disconnect handlers
      this.onDisconnect(this.refs.sessions).remove();

      console.log('✅ Session registered successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to register session:', error);
      throw error;
    }
  }

  // Add listener with automatic cleanup
  addListener(refName, callback, context = 'default') {
    if (!this.refs[refName]) {
      throw new Error(`Reference ${refName} not found`);
    }

    const listenerKey = `${context}_${refName}`;

    // Remove existing listener if any
    this.removeListener(listenerKey);

    // Add new listener
    this.onValue(this.refs[refName], callback);
    this.listeners.set(listenerKey, { ref: this.refs[refName], callback });

    console.log(`👂 Added listener for ${refName} (${context})`);
  }

  // Remove specific listener
  removeListener(listenerKey) {
    const listener = this.listeners.get(listenerKey);
    if (listener) {
      this.off(listener.ref, listener.callback);
      this.listeners.delete(listenerKey);
      console.log(`🔇 Removed listener ${listenerKey}`);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    for (const [key, listener] of this.listeners) {
      this.off(listener.ref, listener.callback);
    }
    this.listeners.clear();
    console.log('🔇 Removed all Firebase listeners');
  }

  // Send data to Firebase
  async sendData(refName, data, useTimestamp = true) {
    if (!this.isReady()) {
      throw new Error('Firebase not connected');
    }

    try {
      const dataToSend = useTimestamp ? {
        ...data,
        timestamp: this.serverTimestamp()
      } : data;

      if (this.refs[refName]) {
        await this.push(this.refs[refName], dataToSend);
      } else {
        // Create custom ref
        const customRef = this.ref(this.database, refName);
        await this.push(customRef, dataToSend);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to send data to ${refName}:`, error);
      throw error;
    }
  }

  // Update data in Firebase
  async updateData(refName, data, useTimestamp = true) {
    if (!this.isReady()) {
      throw new Error('Firebase not connected');
    }

    try {
      const dataToUpdate = useTimestamp ? {
        ...data,
        updatedAt: this.serverTimestamp()
      } : data;

      if (this.refs[refName]) {
        await this.set(this.refs[refName], dataToUpdate);
      } else {
        const customRef = this.ref(this.database, refName);
        await this.set(customRef, dataToUpdate);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to update data at ${refName}:`, error);
      throw error;
    }
  }

  // Get data from Firebase
  async getData(refName) {
    if (!this.isReady()) {
      throw new Error('Firebase not connected');
    }

    try {
      let targetRef;

      if (this.refs[refName]) {
        targetRef = this.refs[refName];
      } else {
        targetRef = this.ref(this.database, refName);
      }

      const snapshot = await this.get(targetRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`❌ Failed to get data from ${refName}:`, error);
      throw error;
    }
  }

  // Simple event emitter for internal use
  events = {};

  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => callback(data));
    }
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  off(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }
  }

  // Cleanup when page unloads
  cleanup() {
    this.removeAllListeners();

    if (this.refs.sessions) {
      this.remove(this.refs.sessions).catch(console.error);
    }

    console.log('🧹 Firebase service cleaned up');
  }

  // Get connection status
  getStatus() {
    return {
      initialized: this.initialized,
      connected: this.connectionStatus,
      listenersCount: this.listeners.size,
      refsSetup: Object.keys(this.refs).length > 0
    };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseService;
}

// Make available globally for HTML usage
if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
}