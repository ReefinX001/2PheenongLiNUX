// /js/activity-tracker.js
(function() {
  'use strict';

  // ตรวจสอบว่า login หรือยัง
  if (!localStorage.getItem('authToken')) {
    console.log('Activity Tracker: User not logged in, skipping...');
    return;
  }

  // ตรวจสอบว่าเป็นหน้า login หรือไม่ (ป้องกันการ track หน้า login)
  const currentPage = window.location.pathname.toLowerCase();
  if (currentPage.includes('login') || currentPage.includes('register')) {
    console.log('Activity Tracker: Skipping login/register page');
    return;
  }

  console.log('🔄 Initializing Activity Tracker...');

  // Firebase configuration
  const firebaseConfig = {
    apiKey: 'AIzaSyCv4EBbKN8Kr4IMRqszJGBWTSoMihtYLo',
    authDomain: 'pheenongacc.firebaseapp.com',
    databaseURL: 'https://pheenongacc-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pheenongacc',
    storageBucket: 'pheenongacc.appspot.com',
    messagingSenderId: '158417807357',
    appId: '1:158417807357:web:4a9c78f7aea793dc7d64494',
    measurementId: 'G-F7DPQ7XG9K'
  };

  // Dynamic import Firebase modules
  Promise.all([
    import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js')
  ]).then(([firebaseApp, firebaseDatabase]) => {

    // Initialize Firebase
    const { initializeApp } = firebaseApp;
    const { getDatabase, ref, set, serverTimestamp, onDisconnect } = firebaseDatabase;

    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // Get current file and user info
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    const userName = localStorage.getItem('userName') || 'ไม่ระบุชื่อ';
    // ใช้ userName แทน userId เพื่อหลีกเลี่ยงปัญหา special characters
    const userId = userName.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';

    // Map file names to module IDs based on actual routes
    const fileToModule = {
      // === MAIN PAGES ===
      'home.html': 'home',
      'home': 'home',

      // === ACCOUNTING MODULE ===
      'accounting_dashboard.html': 'accounting',
      'accounting_dashboard': 'accounting',
      'asset_order.html': 'accounting',
      'asset_order': 'accounting',
      'billing_note.html': 'accounting',
      'billing_note': 'accounting',
      'billing.html': 'accounting',
      'billing': 'accounting',
      'credit_note.html': 'accounting',
      'credit_note': 'accounting',
      'debit_note.html': 'accounting',
      'debit_note': 'accounting',
      'deposit_receipt.html': 'accounting',
      'deposit_receipt': 'accounting',
      'expense_record.html': 'accounting',
      'expense_record': 'accounting',
      'invoice.html': 'accounting',
      'invoice': 'accounting',
      'quotation.html': 'accounting',
      'quotation': 'accounting',
      'tax_invoice.html': 'accounting',
      'tax_invoice': 'accounting',
      'trial_balance.html': 'accounting',
      'trial_balance': 'accounting',
      'income_overview.html': 'accounting',
      'income_overview': 'accounting',
      'receipt.html': 'accounting',
      'receipt': 'accounting',
      'journal.html': 'accounting',
      'journal': 'accounting',
      'general_ledger.html': 'accounting',
      'general_ledger': 'accounting',
      'chart_of_accounts.html': 'accounting',
      'chart_of_accounts': 'accounting',
      'chart_of_accountss.html': 'accounting',
      'chart_of_accountss': 'accounting',
      'financial_position.html': 'accounting',
      'financial_position': 'accounting',
      'income_statement.html': 'accounting',
      'income_statement': 'accounting',
      'cash_flow.html': 'accounting',
      'cash_flow': 'accounting',
      'sales_overview.html': 'accounting',
      'sales_overview': 'accounting',
      'expense_overview.html': 'accounting',
      'expense_overview': 'accounting',
      'purchase_order.html': 'accounting',
      'purchase_order': 'accounting',

      // === HR MODULE ===
      'hr_dashboard.html': 'hr',
      'hr_dashboard': 'hr',
      'attendance.html': 'hr',
      'attendance': 'hr',
      'bonus_list.html': 'hr',
      'bonus_list': 'hr',
      'employee_directory.html': 'hr',
      'employee_directory': 'hr',
      'employee.html': 'hr',
      'employee': 'hr',
      'payroll.html': 'hr',
      'payroll': 'hr',
      'performance_reviews.html': 'hr',
      'performance_reviews': 'hr',
      'training.html': 'hr',
      'training': 'hr',
      'leave_requests.html': 'hr',
      'leave_requests': 'hr',
      'notifications.html': 'hr',
      'notifications': 'hr',
      'settings.html': 'hr',
      'settings': 'hr',
      'role_management.html': 'hr',
      'role_management': 'hr',
      'employee_detail.html': 'hr',
      'employee_detail': 'hr',
      'register_user.html': 'hr',
      'register_user': 'hr',
      'calendar.html': 'hr',
      'calendar': 'hr',
      'dashboard.html': 'hr', // HR/App/New
      'categories.html': 'hr',
      'news-management.html': 'hr',

      // === STOCK MODULE ===
      'stockmanagehome.html': 'stock',
      'stockmanagehome': 'stock',
      'inventory_dashboard.html': 'stock',
      'inventory_dashboard': 'stock',
      'po.html': 'stock',
      'po': 'stock',
      'product_image.html': 'stock',
      'product_image': 'stock',
      'product.html': 'stock',
      'product': 'stock',
      'setbranchprice.html': 'stock',
      'setbranchprice': 'stock',
      'transfer.html': 'stock',
      'transfer': 'stock',

      // === MARKETING MODULE ===
      'marketing_dashboard.html': 'marketing',
      'marketing_dashboard': 'marketing',
      'customers_marketing.html': 'marketing',
      'customers_marketing': 'marketing',
      'products_marketing.html': 'marketing',
      'products_marketing': 'marketing',
      'campaigns.html': 'marketing',
      'campaigns': 'marketing',
      'analytics.html': 'marketing',
      'analytics': 'marketing',
      'content_management.html': 'marketing',
      'content_management': 'marketing',
      'social_media.html': 'marketing',
      'social_media': 'marketing',
      'email_marketing.html': 'marketing',
      'email_marketing': 'marketing',
      'seo_tools.html': 'marketing',
      'seo_tools': 'marketing',
      'customer_data.html': 'marketing',
      'customer_data': 'marketing',
      'budget_reports.html': 'marketing',
      'budget_reports': 'marketing',
      'marketing_settings.html': 'marketing',
      'marketing_settings': 'marketing',

      // === LOAN MODULE ===
      'loan_dashboard.html': 'loan',
      'loan_dashboard': 'loan',
      'repayment.html': 'loan',
      'repayment': 'loan',
      'installment_history.html': 'loan',
      'installment_history': 'loan',
      'customer.html': 'loan',
      'customer': 'loan',
      'customerdetail.html': 'loan',
      'customerdetail': 'loan',
      'status.html': 'loan',
      'status': 'loan',

      // === POS MODULE (Frontstore) ===
      'frontstore_index.html': 'pos',
      'frontstore_index': 'pos',
      'frontstore_pattani.html': 'pos',
      'frontstore_pattani': 'pos',
      'frontstore_hatyai.html': 'pos',
      'frontstore_hatyai': 'pos',
      'addproduct_pattani.html': 'pos',
      'addproduct_pattani': 'pos',
      'addproduct_hatyai.html': 'pos',
      'addproduct_hatyai': 'pos',
      'historyreceipt.html': 'pos',
      'historyreceipt': 'pos',
      'installment_pattani.html': 'pos',
      'installment_pattani': 'pos',
      'installment_hatyai.html': 'pos',
      'installment_hatyai': 'pos',
      'history_installment.html': 'pos',
      'history_installment': 'pos',
      'quotationn.html': 'pos',
      'quotationn': 'pos',
      'invoicee.html': 'pos',
      'invoicee': 'pos',
      'depositreceipt.html': 'pos',
      'depositreceipt': 'pos',
      'services.html': 'pos',
      'services': 'pos',
      'receiptvoucher.html': 'pos',
      'receiptvoucher': 'pos',
      'producttransfer.html': 'pos',
      'producttransfer': 'pos',

      // === GIFTS MODULE ===
      'gifts_dashboard.html': 'gifts',
      'gifts_dashboard': 'gifts',
      'gift_inventory.html': 'gifts',
      'gift_inventory': 'gifts',

      // === REPORT MODULE (ใช้ accounting reports) ===
      'report_dashboard.html': 'report',
      'report_dashboard': 'report',
      'bookkeeping_report.html': 'report',
      'bookkeeping_report': 'report',
      'financial_dashboard.html': 'report',
      'financial_dashboard': 'report',
      'inventory_report.html': 'report',
      'inventory_report': 'report',
      'sales_summary_report.html': 'report',
      'sales_summary_report': 'report',
      'purchase_summary_report.html': 'report',
      'purchase_summary_report': 'report',
      'financial_statement_report.html': 'report',
      'financial_statement_report': 'report',
      'customer_report.html': 'report',
      'customer_report': 'report',
      'supplier_report.html': 'report',
      'supplier_report': 'report',
      'installment_on_use.html': 'installmentOnUseTracker',
      'installment_on_use': 'installmentOnUseTracker'
    };

    // Get module ID from current page (try multiple variations)
    let moduleId = fileToModule[currentFile.toLowerCase()] ||
                   fileToModule[currentFile.toLowerCase().replace('.html', '')] ||
                   fileToModule[currentFile.replace('.html', '')];

    // If still not found, try extracting from URL path
    if (!moduleId) {
      const pathSegments = window.location.pathname.split('/').filter(Boolean);

      // Check if it's in a subdirectory that indicates module
      if (pathSegments.includes('account')) moduleId = 'accounting';
      else if (pathSegments.includes('HR')) moduleId = 'hr';
      else if (pathSegments.includes('Stock')) moduleId = 'stock';
      else if (pathSegments.includes('marketing')) moduleId = 'marketing';
      else if (pathSegments.includes('loan')) moduleId = 'loan';
      else if (pathSegments.includes('pattani') || pathSegments.includes('hatyai')) moduleId = 'pos';
      else if (pathSegments.includes('gifts')) moduleId = 'gifts';
    }

    if (!moduleId) {
      console.log(`Activity Tracker: No module mapping for ${currentFile} in path ${window.location.pathname}`);
      return;
    }

    console.log(`✅ Activity Tracker initialized for module: ${moduleId}`);

    // Activity tracking function
    function trackActivity(action = 'ใช้งานระบบ', additionalData = {}) {
      const activityData = {
        lastUpdate: new Date().toISOString(),
        lastUser: userName,
        action: action,
        page: currentFile,
        timestamp: serverTimestamp(),
        ...additionalData
      };

      // Update module activity
      set(ref(db, `moduleActivity/${moduleId}`), activityData)
        .then(() => console.log(`📊 Activity tracked: ${moduleId} - ${action}`))
        .catch(err => console.warn('Activity tracking error:', err));

      // Also log to activity history (optional - for detailed tracking)
      const historyRef = ref(db, `activityHistory/${moduleId}/${Date.now()}`);
      set(historyRef, {
        ...activityData,
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`
      }).catch(() => {}); // Silently fail for history
    }

    // ลบส่วน online/offline status ที่ทำให้เกิด error
    // (Firebase Rules ไม่มี path userStatus)

    // Track initial page load
    trackActivity('เข้าใช้งานระบบ', {
      referrer: document.referrer,
      loadTime: performance.now()
    });

    // Track periodic heartbeat (every 30 seconds)
    let heartbeatInterval = setInterval(() => {
      trackActivity('กำลังใช้งาน', {
        sessionDuration: Math.floor(performance.now() / 1000)
      });
    }, 30000);

    // Track user interactions
    let lastInteraction = Date.now();
    let interactionTimeout;

    function handleInteraction(eventType) {
      const now = Date.now();

      // Clear existing timeout
      clearTimeout(interactionTimeout);

      // Only track if more than 10 seconds since last interaction
      if (now - lastInteraction > 10000) {
        lastInteraction = now;
        trackActivity('มีการใช้งาน', {
          interactionType: eventType,
          idleTime: Math.floor((now - lastInteraction) / 1000)
        });
      }

      // Set timeout for idle detection (5 minutes)
      interactionTimeout = setTimeout(() => {
        trackActivity('ไม่มีการใช้งาน', {
          idleDuration: '5 minutes'
        });
      }, 5 * 60 * 1000);
    }

    // Listen to various user interactions
    ['click', 'keypress', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => handleInteraction(eventType), {
        passive: true
      });
    });

    // Track mouse movement (less frequently)
    let mouseMoveThrottle = false;
    document.addEventListener('mousemove', () => {
      if (!mouseMoveThrottle) {
        mouseMoveThrottle = true;
        setTimeout(() => {
          handleInteraction('mousemove');
          mouseMoveThrottle = false;
        }, 5000); // Only track every 5 seconds
      }
    }, { passive: true });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const formName = e.target.name || e.target.id || 'unnamed-form';
      trackActivity('ส่งแบบฟอร์ม', {
        formName: formName,
        formAction: e.target.action
      });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackActivity('ย่อหน้าต่าง', {
          hiddenAt: new Date().toISOString()
        });
      } else {
        trackActivity('กลับมาใช้งาน', {
          returnedAt: new Date().toISOString()
        });
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      // Clear heartbeat interval
      clearInterval(heartbeatInterval);
      clearTimeout(interactionTimeout);

      // Try to send final activity (may not always work)
      navigator.sendBeacon && navigator.sendBeacon(
        '/api/activity/track',
        JSON.stringify({
          moduleId: moduleId,
          action: 'ออกจากหน้า',
          userName: userName,
          timestamp: new Date().toISOString()
        })
      );

      // Also try Firebase update (may not complete)
      trackActivity('ออกจากหน้า', {
        sessionDuration: Math.floor(performance.now() / 1000)
      });
    });

    // Track errors (optional)
    window.addEventListener('error', (e) => {
      trackActivity('เกิดข้อผิดพลาด', {
        errorMessage: e.message,
        errorFile: e.filename,
        errorLine: e.lineno
      });
    });

    // Expose tracking function globally for manual tracking
    window.trackCustomActivity = function(action, data = {}) {
      trackActivity(action, data);
    };

    console.log('✅ Activity Tracker fully initialized and running');

  }).catch(error => {
    console.error('❌ Failed to initialize Activity Tracker:', error);
  });

})();
