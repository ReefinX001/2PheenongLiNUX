
// ===== Script Block 1 =====

    tailwind.config = {
      darkMode: 'class',
      theme: { 
        extend: { 
          fontFamily: { sans: ['Prompt','sans-serif'] } 
        } 
      },
      daisyui: { themes: ['light','dark','corporate'] },
    }
  
// ===== End Script Block 1 =====

// ===== Script Block 2 =====

    // Browser environment compatibility
    const isDebugMode = () => {
      try {
        return (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true') ||
               (typeof window !== 'undefined' && window.location?.hostname === 'localhost') ||
               (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
      } catch (e) {
        return false;
      }
    };

    // Debug utility functions
    const debugLog = (...args) => {
      if (isDebugMode()) {
        console.log(...args);
      
        }
    const debugWarn = (...args) => {
      if (isDebugMode()) {
        console.warn(...args);
      
        }
    const debugError = (...args) => {
      if (isDebugMode()) {
        console.error(...args);
      
        }
    }

    // โหลดข้อมูลโปรไฟล์พนักงานจาก API
    async function loadEmployeeProfile() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'ไม่สามารถดึงข้อมูลผู้ใช้');
        }
        const user = result.data;
        document.getElementById('employeeName').textContent = user.name || '(ไม่พบชื่อ)';
        let photoUrl = user.photoUrl || '';
        if (!photoUrl.startsWith('/') && !/^https?:\/\//.test(photoUrl)) {
          photoUrl = '/' + photoUrl;
        }
        document.getElementById('employeePhoto').src = photoUrl;
      } catch (err) {
        debugError('Load Employee Profile Error:', err);
      }
    }
  
// ===== End Script Block 2 =====

// ===== Script Block 3 =====

    // ===== Helper: Dark Mode =====
    function setDarkMode(isDark) {
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
      const label = document.getElementById('darkModeLabel');
      if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
    function checkDarkMode() {
      const stored = localStorage.getItem('darkMode');
      const isDark = stored === 'enabled' ||
        (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setDarkMode(isDark);
    
        }
    // ===== Helper: Sidebar =====
    function checkSidebarState() {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      const sidebar = document.getElementById('sidebar');
      const mainContent = document.getElementById('mainContent');
      const icon    = document.getElementById('toggleIcon');
      if (collapsed && sidebar && icon) {
        sidebar.classList.add('-translate-x-64');
        if (mainContent) {
          mainContent.classList.remove('ml-64');
          mainContent.classList.add('ml-0');
        
        }
        icon.classList.replace('bi-chevron-left','bi-chevron-right');
      }
    }

    function resolvePhotoUrl(raw) {
      if (!raw) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' fill='%23e5e7eb'/%3E%3Ctext x='18' y='22' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='12'%3E👤%3C/text%3E%3C/svg%3E";
      if (/^https?:\/\//.test(raw)) return raw;
      if (raw.startsWith('/')) {
        return raw.replace(/^\/uploads\//, '/uploads/employees/');
      
        return '/uploads/employees/' + raw;
    }

    function getCurrentUserIdFromToken() {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const base64Url = token.split('.')[1];
      const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const data = JSON.parse(jsonPayload);
      return data.userId || data.id || data.sub || null;
    }

    // Debug utility functions (already declared in head section)

    // Page loading utility functions
    const LoadingManager = {
      pageLoader: null,
      
      init() {
        // Create page loading indicator if not exists
        if (!this.pageLoader) {
          this.pageLoader = document.createElement('div');
          this.pageLoader.id = 'pageLoadingOverlay';
          this.pageLoader.className = 'fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center';
          this.pageLoader.innerHTML = `
            <div class="text-center">
              <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
            </div>
          `;
          document.body.appendChild(this.pageLoader);
        
        }
      },
      
      show() {
        this.init();
        this.pageLoader.classList.remove('hidden');
      },
      
      hide() {
        if (this.pageLoader) {
          this.pageLoader.classList.add('hidden');
        
        }
      }
    };

    function showPageLoadingIndicator() {
      LoadingManager.show();
    }

    function hidePageLoadingIndicator() {
      LoadingManager.hide();
    }

    // Performance utility for smooth UI updates
    const PerformanceUtils = {
      rafQueue: [],
      isProcessing: false,
      
      // Queue function to run in next animation frame
      scheduleUpdate(fn) {
        this.rafQueue.push(fn);
        if (!this.isProcessing) {
          this.processQueue();
        
        }
      },
      
      processQueue() {
        if (this.rafQueue.length === 0) {
          this.isProcessing = false;
          return;
        
        }
        this.isProcessing = true;
        requestAnimationFrame(() => {
          const batch = this.rafQueue.splice(0, 5); // Process up to 5 updates per frame
          batch.forEach(fn => {
            try {
              fn();
            } catch (error) {
              debugError('Error in RAF update:', error);
            }
          });
          
          if (this.rafQueue.length > 0) {
            this.processQueue();
          } else {
            this.isProcessing = false;
          }
        });
      },
      
      // Smooth scroll to element
      smoothScrollTo(element, offset = 0) {
        if (!element) return;
        
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const targetY = absoluteElementTop - offset;
        
        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      }
    };

    // Data caching utility to prevent redundant API calls
    const DataCache = {
      cache: new Map(),
      lastUpdate: new Map(),
      defaultTtl: 30000, // 30 seconds
      
      set(key, data, ttl = this.defaultTtl) {
        this.cache.set(key, data);
        this.lastUpdate.set(key, Date.now() + ttl);
      },
      
      get(key) {
        const data = this.cache.get(key);
        const expiry = this.lastUpdate.get(key);
        
        if (!data || !expiry || Date.now() > expiry) {
          this.cache.delete(key);
          this.lastUpdate.delete(key);
          return null;
        }
        return data;
      },
      
      invalidate(pattern = null) {
        if (pattern) {
          // Invalidate keys matching pattern
          for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
              this.cache.delete(key);
              this.lastUpdate.delete(key);
            
        }
          }
        } else {
          // Clear all cache
          this.cache.clear();
          this.lastUpdate.clear();
        }
      },
      
      has(key) {
        return this.get(key) !== null;
      }
    };

    // Timezone utility functions
    const DateUtils = {
      // Create date from string parts without timezone issues
      createDateFromParts(year, month, day) {
        return new Date(year, month - 1, day);
      },
      
      // Parse date string safely (YYYY-MM-DD format)
      parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return this.createDateFromParts(year, month, day);
      },
      
      // Format date to YYYY-MM-DD without timezone issues
      formatDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      },
      
      // Get today's date string
      getTodayString() {
        return this.formatDate(new Date());
      },
      
      // Check if two date strings are the same
      isSameDate(dateString1, dateString2) {
        return dateString1 === dateString2;
      },
      
      // Add days to a date string
      addDays(dateString, days) {
        const date = this.parseDate(dateString);
        date.setDate(date.getDate() + days);
        return this.formatDate(date);
      },
      
      // Get day name from date string
      getDayName(dateString) {
        const date = this.parseDate(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      },
      
      // Check if date is within range
      isDateInRange(dateString, fromDate, toDate) {
        return dateString >= fromDate && (!toDate || dateString <= toDate);
      }
    };

    const currentUserId = getCurrentUserIdFromToken();
    const USER_API      = '/api/users';  // API นี้มีข้อมูลสาขาอยู่แล้ว
    const ATTENDANCE_EMP_API = '/api/attendance/employees';
    const BRANCH_API    = '/api/branches';
    let employees       = [];
    let branches        = [];

    async function loadEmployees() {
      try {
        Performance.start('loadEmployees');
        debugLog('Loading employees from API:', USER_API);
        const res = await fetch(USER_API + '?limit=100&populate=employee.branch,allowedBranches,defaultBranches', { headers: getHeaders() });
        if (res.status === 401) {
          showAlert('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'error');
          setTimeout(() => window.location.href = '/login', 1000);
          return;
        
        }
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        debugLog('Users API Response:', json);
        
        // ตรวจสอบโครงสร้างข้อมูลที่ได้รับจาก /api/users
        let userData = [];
        if (json.data && Array.isArray(json.data)) {
          userData = json.data;
        } else if (json.users && Array.isArray(json.users)) {
          userData = json.users;
        } else if (Array.isArray(json)) {
          userData = json;
        }
        employees = userData.map(user => {
          // หาข้อมูลสาขาจากแหล่งต่างๆ
          let branchData = null;
          let branchId = null;
          
          // ลำดับความสำคัญ: allowedBranches[0] > employee.branch > defaultBranches[0]
          if (user.allowedBranches && user.allowedBranches.length > 0) {
            branchData = user.allowedBranches[0];
            branchId = branchData._id || branchData.id || branchData.name;
          } else if (user.employee?.branch) {
            branchData = user.employee.branch;
            branchId = branchData._id || branchData.id || branchData.name;
          } else if (user.defaultBranches && user.defaultBranches.length > 0) {
            branchData = user.defaultBranches[0];
            branchId = branchData._id || branchData.id || branchData.name;
          
        }
          debugLog('Processing user:', user.name || user.username, 'Branch data:', {
            employeeBranch: user.employee?.branch,
            allowedBranches: user.allowedBranches,
            defaultBranches: user.defaultBranches,
            selectedBranch: branchData,
            finalBranchId: branchId
          });
          
          return {
            id: user._id || user.id,
            name: user.employee?.name || user.name || user.username,
            email: user.employee?.email || user.email,
            position: user.employee?.position,
            department: user.employee?.department,
            branchId: branchId,
            branch: branchData,
            photoUrl: user.photoUrl || user.employee?.imageUrl,
            isActive: user.isBlocked !== true,
            // ข้อมูลสาขาทั้งหมดที่ผู้ใช้มีสิทธิ์เข้าถึง
            allowedBranches: user.allowedBranches || [],
            checkinBranches: user.checkinBranches || [],
            defaultBranches: user.defaultBranches || []
          };
        });
        
        debugLog('Processed employees:', employees.length, employees);
        debugLog('Sample employee with branch:', employees.find(emp => emp.branchId));
        
        // โหลด options หลังจากได้ข้อมูลแล้ว
        loadEmployeeOptions();
        Performance.end('loadEmployees');
        
      } catch (err) {
        Performance.end('loadEmployees');
        debugError('Failed to load employees:', err);
        if (!err.message.startsWith('Status 401')) {
          showAlert('ไม่สามารถโหลดรายชื่อพนักงานได้', 'error');
        
        }
        employees = [];
        // โหลด options แม้ไม่มีข้อมูล เพื่อแสดงข้อความว่าไม่พบข้อมูล
        loadEmployeeOptions();
      }
    }

    // Load employees with schedule information
    async function loadEmployeesWithSchedules(filters = {}) {
      try {
        let url = `${ATTENDANCE_EMP_API}?`;
        if (filters.branchId) url += `branchId=${filters.branchId}&`;
        if (filters.hasSchedule !== undefined) url += `hasSchedule=${filters.hasSchedule}&`;
        if (filters.scheduleType) url += `scheduleType=${filters.scheduleType}&`;
        if (filters.date) url += `date=${filters.date}&`;
        
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        return json.data || [];
      } catch (err) {
        debugError('Failed to load employees with schedules:', err);
        showAlert('ไม่สามารถโหลดข้อมูลพนักงานและตารางงานได้', 'error');
        return [];
      }
    }

    // Load specific employee's schedules
    async function loadEmployeeSchedules(employeeId, filters = {}) {
      try {
        let url = `${ATTENDANCE_EMP_API}/${employeeId}/schedules?`;
        if (filters.from) url += `from=${filters.from}&`;
        if (filters.to) url += `to=${filters.to}&`;
        if (filters.status) url += `status=${filters.status}&`;
        if (filters.type) url += `type=${filters.type}&`;
        
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        return json.data || [];
      } catch (err) {
        debugError('Failed to load employee schedules:', err);
        showAlert('ไม่สามารถโหลดตารางงานของพนักงานได้', 'error');
        return [];
      }
    }

    // Create bulk schedules for an employee
    async function createBulkEmployeeSchedules(employeeId, schedules) {
      try {
        const res = await fetch(`${ATTENDANCE_EMP_API}/${employeeId}/schedules/bulk`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ schedules })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Status ${res.status}`);
        }
        const result = await res.json();
        return result;
      } catch (err) {
        debugError('Failed to create bulk schedules:', err);
        showAlert(`ไม่สามารถสร้างตารางงานได้: ${err.message}`, 'error');
        return null;
      }
    }

    // Get schedule summary for all employees
    async function getEmployeeScheduleSummary(filters = {}) {
      try {
        let url = `${ATTENDANCE_EMP_API}/schedule-summary?`;
        if (filters.date) url += `date=${filters.date}&`;
        if (filters.month) url += `month=${filters.month}&`;
        if (filters.year) url += `year=${filters.year}&`;
        if (filters.branchId) url += `branchId=${filters.branchId}&`;
        
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        return json.data || null;
      } catch (err) {
        debugError('Failed to get schedule summary:', err);
        showAlert('ไม่สามารถโหลดสรุปตารางงานได้', 'error');
        return null;
      }
    }

    async function loadBranches() {
      try {
        debugLog('Loading branches from API:', BRANCH_API);
        const res = await fetch(BRANCH_API, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        debugLog('Branches API Response:', json);
        
        branches = json.branches || json.data?.branches || json.data || [];
        debugLog('Processed branches:', branches.length, branches);
        
        // ปรับปรุงข้อมูลพนักงานที่ไม่มีสาขาโดยใช้ข้อมูลจาก branches API
        if (branches.length > 0) {
          employees.forEach(employee => {
            if (!employee.branchId && employee.allowedBranches && employee.allowedBranches.length > 0) {
              // หาสาขาจาก allowedBranches
              const allowedBranchId = employee.allowedBranches[0]._id || employee.allowedBranches[0].id || employee.allowedBranches[0];
              const matchedBranch = branches.find(b => (b._id || b.id) === allowedBranchId);
              if (matchedBranch) {
                employee.branchId = matchedBranch._id || matchedBranch.id;
                employee.branch = matchedBranch;
                debugLog('Updated employee branch:', employee.name, 'to', matchedBranch.name);
              
        }
            }
          });
        }
      } catch (err) {
        debugError('Failed to load branches:', err);
        // ลองใช้ API อื่น
        try {
          debugLog('Trying alternative branches API...');
          const altRes = await fetch('/api/attendance/branches/my-accessible', { headers: getHeaders() });
          if (altRes.ok) {
            const altJson = await altRes.json();
            branches = altJson.data || [];
            debugLog('Alternative branches loaded:', branches.length);
          
        }
        } catch (altErr) {
          if (isDebugMode()) {
            console.error('Alternative branches API also failed:', altErr);
          
        }
          showAlert('ไม่สามารถโหลดรายชื่อสาขาได้', 'error');
          branches = [];
        }
      }
    }

    function getHeaders() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return {};
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }

    // Initialize Socket.IO connection with error handling
    let socket;
    try {
      socket = io({
        timeout: 5000,
        transports: ['websocket', 'polling']
      });
      
      socket.on('connect', () => {
        debugLog('Socket.IO connected successfully');
      });
      
      socket.on('connect_error', (error) => {
        debugWarn('Socket.IO connection failed:', error.message);
      });
      
      socket.on('attendanceCheckedIn', data => {
        // Handle real-time attendance updates
        debugLog('Attendance check-in received:', data);
      });
    } catch (error) {
      debugWarn('Socket.IO initialization failed:', error.message);
    let currentDeleteId = null;

    document.addEventListener('DOMContentLoaded', async () => {
      checkDarkMode();
      checkSidebarState();

      initializePage();
      setupEventListeners();
      
      // Update current time display every second
      updateCurrentTimeDisplay();
      setInterval(updateCurrentTimeDisplay, 1000);

      // Show loading indicator
      showPageLoadingIndicator();

      try {
        // Phase 1: Critical data that must load first
        await initializeScheduleTypes();
        
        // Phase 2: Load branches and profile in parallel 
        const [branchesResult, profileResult] = await Promise.allSettled([
          loadBranches(),
          loadEmployeeProfile()
        ]);
        
        // Phase 3: Load employees after branches are loaded
        await loadEmployees();
        loadBranchOptions();
        
        // Phase 4: Load main content data in parallel
        const [attendanceResult, scheduleResult] = await Promise.allSettled([
          loadAttendanceData(),
          loadScheduleData()
        ]);
        
        debugLog('Page initialization completed:', {
          branches: branchesResult.status,
          profile: profileResult.status,
          attendance: attendanceResult.status,
          schedule: scheduleResult.status
        });
        
      } catch (error) {
        debugError('Page initialization failed:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ', 'error');
      } finally {
        hidePageLoadingIndicator();
      }
    });

    const elements = {
      sidebar:            document.getElementById('sidebar'),
      btnToggleMenu:      document.getElementById('btnToggleMenu'),
      toggleIcon:         document.getElementById('toggleIcon'),
      menuToggle:         document.getElementById('menuToggle'),
      btnToggleDark:      document.getElementById('btnToggleDark'),
      darkModeLabel:      document.getElementById('darkModeLabel'),
      btnLogoutSidebar:   document.getElementById('btnLogoutSidebar'),

      // Date filters
      filterDateFrom:     document.getElementById('filterDateFrom'),
      filterDateTo:       document.getElementById('filterDateTo'),
      btnToday:           document.getElementById('btnToday'),
      btnThisWeek:        document.getElementById('btnThisWeek'),
      btnThisMonth:       document.getElementById('btnThisMonth'),
      dateRangeDisplay:   document.getElementById('dateRangeDisplay'),
      
      searchEmployee:     document.getElementById('searchEmployee'),
      
      // Statistics
      totalRecords:       document.getElementById('totalRecords'),
      normalAttendance:   document.getElementById('normalAttendance'),
      pendingApproval:    document.getElementById('pendingApproval'),
      totalOvertimeHours: document.getElementById('totalOvertimeHours'),
      
      // View toggle
      btnTableView:       document.getElementById('btnTableView'),
      btnCalendarView:    document.getElementById('btnCalendarView'),
      calendarView:       document.getElementById('calendarView'),
      
      // Calendar
      btnPrevMonth:       document.getElementById('btnPrevMonth'),
      btnNextMonth:       document.getElementById('btnNextMonth'),
      currentMonthYear:   document.getElementById('currentMonthYear'),
      calendarGrid:       document.getElementById('calendarGrid'),
      
      // Calendar Schedule Management
      calendarBranchFilter: document.getElementById('calendarBranchFilter'),
      calendarEmployeeFilter: document.getElementById('calendarEmployeeFilter'),
      btnTodayCalendar:   document.getElementById('btnTodayCalendar'),
      btnAddScheduleFromCalendar: document.getElementById('btnAddScheduleFromCalendar'),
      calendarSummary:    document.getElementById('calendarSummary'),
      
      // Branch View Elements
      btnBranchView:      document.getElementById('btnBranchView'),
      btnAllView:         document.getElementById('btnAllView'),
      branchTabs:         document.getElementById('branchTabs'),
      allViewFilters:     document.getElementById('allViewFilters'),
      branchSummary:      document.getElementById('branchSummary'),
      overallSummary:     document.getElementById('overallSummary'),
      currentBranchName:  document.getElementById('currentBranchName'),
      currentBranchEmployeeCount: document.getElementById('currentBranchEmployeeCount'),
      totalEmployeeCount: document.getElementById('totalEmployeeCount'),
      
      // Branch Summary Elements
      branchScheduledDays: document.getElementById('branchScheduledDays'),
      branchAttendanceDays: document.getElementById('branchAttendanceDays'),
      branchPendingApprovals: document.getElementById('branchPendingApprovals'),
      branchTotalOTHours: document.getElementById('branchTotalOTHours'),
      
      // Overall Summary Elements
      summaryScheduledDays: document.getElementById('summaryScheduledDays'),
      summaryAttendanceDays: document.getElementById('summaryAttendanceDays'),
      summaryPendingApprovals: document.getElementById('summaryPendingApprovals'),
      summaryTotalOTHours: document.getElementById('summaryTotalOTHours'),
      
      // Calendar Schedule Modal
      calendarScheduleModal: document.getElementById('calendarScheduleModal'),
      btnCloseCalendarScheduleModal: document.getElementById('btnCloseCalendarScheduleModal'),
      calendarScheduleForm: document.getElementById('calendarScheduleForm'),
      calendarScheduleDate: document.getElementById('calendarScheduleDate'),
      calendarScheduleId: document.getElementById('calendarScheduleId'),
      selectedDateDisplay: document.getElementById('selectedDateDisplay'),
      calendarScheduleEmployee: document.getElementById('calendarScheduleEmployee'),
      calendarScheduleType: document.getElementById('calendarScheduleType'),
      customTimeSettings: document.getElementById('customTimeSettings'),
      customStartTime:    document.getElementById('customStartTime'),
      customEndTime:      document.getElementById('customEndTime'),
      breakDuration:      document.getElementById('breakDuration'),
      allowOT:            document.getElementById('allowOT'),
      isHoliday:          document.getElementById('isHoliday'),
      requireApproval:    document.getElementById('requireApproval'),
      calendarScheduleNotes: document.getElementById('calendarScheduleNotes'),
      applyToMultipleDays: document.getElementById('applyToMultipleDays'),
      multipleDaysSettings: document.getElementById('multipleDaysSettings'),
      multiStartDate:     document.getElementById('multiStartDate'),
      multiEndDate:       document.getElementById('multiEndDate'),
      btnDeleteCalendarSchedule: document.getElementById('btnDeleteCalendarSchedule'),
      btnCancelCalendarSchedule: document.getElementById('btnCancelCalendarSchedule'),
      btnSaveCalendarSchedule: document.getElementById('btnSaveCalendarSchedule'),
      scheduleTooltip:    document.getElementById('scheduleTooltip'),
      
      attendanceTableBody:document.getElementById('attendanceTableBody'),
      emptyState:         document.getElementById('emptyState'),
      loadingIndicator:   document.getElementById('loadingIndicator'),
      recordCount:        document.getElementById('recordCount'),
      currentPage:        document.getElementById('currentPage'),
      btnPrevPage:        document.getElementById('btnPrevPage'),
      btnNextPage:        document.getElementById('btnNextPage'),

      btnAddRecord:       document.getElementById('btnAddRecord'),
      btnEmptyAdd:        document.getElementById('btnEmptyAdd'),
      btnExportData:      document.getElementById('btnExportData'),
      attendanceModal:    document.getElementById('attendanceModal'),
      modalTitle:         document.getElementById('modalTitle'),
      attendanceForm:     document.getElementById('attendanceForm'),
      recordId:           document.getElementById('recordId'),
      employeeSelect:     document.getElementById('employeeSelect'),
      attendanceDate:     document.getElementById('attendanceDate'),
      totalRegularHours:  document.getElementById('totalRegularHours'),
      totalOvertimeHours: document.getElementById('totalOvertimeHours'),
      btnAddTimePeriod:   document.getElementById('btnAddTimePeriod'),
      timePeriodsContainer:document.getElementById('timePeriodsContainer'),
      note:               document.getElementById('note'),
      btnCloseModal:      document.getElementById('btnCloseModal'),
      btnCancelModal:     document.getElementById('btnCancelModal'),
      btnSaveRecord:      document.getElementById('btnSaveRecord'),

      alertMessage:       document.getElementById('alertMessage'),

      confirmModal:       document.getElementById('confirmModal'),
      btnCancelDelete:    document.getElementById('btnCancelDelete'),
      btnConfirmDelete:   document.getElementById('btnConfirmDelete'),

      // เพิ่ม elements สำหรับ approval
      tabAllRecords:      document.getElementById('tabAllRecords'),
      tabPendingApprovals: document.getElementById('tabPendingApprovals'),
      pendingCount:       document.getElementById('pendingCount'),
      approvalModal:      document.getElementById('approvalModal'),
      btnCloseApprovalModal: document.getElementById('btnCloseApprovalModal'),
      approvalDetails:    document.getElementById('approvalDetails'),
      approvalForm:       document.getElementById('approvalForm'),
      approvalNote:       document.getElementById('approvalNote'),
      btnApproveApproval: document.getElementById('btnApproveApproval'),
      btnRejectApproval:  document.getElementById('btnRejectApproval')
    };

    let currentFilterDateFrom = '';
    let currentFilterDateTo = '';
    let currentSearchTerm = '';
    let currentPage       = 1;
    const recordsPerPage  = 10;
    let currentTab        = 'all'; // 'all' หรือ 'pending'
    let currentApprovalId = null;
    let currentView       = 'table'; // 'table' หรือ 'calendar'
    let currentCalendarDate = new Date();
    
    // Calendar Schedule Management Variables
    let currentCalendarBranchFilter = '';
    let currentCalendarEmployeeFilter = '';
    let scheduleData = [];
    let currentSelectedDate = null;
    let currentEditingSchedule = null;
    let scheduleTypes = [];
    let currentEditingScheduleType = null;
    
    // Branch Management Variables
    let currentCalendarView = 'branch'; // 'branch' หรือ 'all'
    let currentSelectedBranch = null;
    let selectedBranchId = null; // Global branch ID for filtering
    let branchScheduleData = {}; // เก็บข้อมูลตารางงานแยกตามสาขา

    function initializePage() {
      const now     = new Date();
      const yyyy    = now.getFullYear();
      const mm      = String(now.getMonth() + 1).padStart(2, '0');
      const dd      = String(now.getDate()).padStart(2, '0');
      const localToday = `${yyyy}-${mm}-${dd}`;

      // Set default date range to today
      elements.filterDateFrom.value = localToday;
      elements.filterDateTo.value   = localToday;
      elements.attendanceDate.value = localToday;
      currentFilterDateFrom         = localToday;
      currentFilterDateTo           = localToday;
      
      updateDateRangeDisplay();

      if (localStorage.getItem('darkMode') === 'enabled') {
        document.documentElement.classList.add('dark');
        elements.darkModeLabel.textContent = 'Light Mode';
      } else {
        elements.darkModeLabel.textContent = 'Dark Mode';
      }

      resetTimePeriodsForm();
      updateCurrentTimeDisplay();
      updateCalendarDisplay();
    }

    // ===== Date Range Functions =====
    function updateDateRangeDisplay() {
      const fromDate = new Date(currentFilterDateFrom);
      const toDate = new Date(currentFilterDateTo);
      
      if (currentFilterDateFrom === currentFilterDateTo) {
        if (currentFilterDateFrom === new Date().toISOString().split('T')[0]) {
          elements.dateRangeDisplay.textContent = 'วันนี้';
        } else {
          elements.dateRangeDisplay.textContent = fromDate.toLocaleDateString('th-TH');
        }
      } else {
        elements.dateRangeDisplay.textContent = `${fromDate.toLocaleDateString('th-TH')} - ${toDate.toLocaleDateString('th-TH')}`;
      }
    }

    function setDateRange(fromDate, toDate) {
      currentFilterDateFrom = fromDate;
      currentFilterDateTo = toDate;
      elements.filterDateFrom.value = fromDate;
      elements.filterDateTo.value = toDate;
      updateDateRangeDisplay();
      currentPage = 1;
      filterAndDisplayRecords();
      updateStatistics();
    }

    function setTodayRange() {
      const today = new Date().toISOString().split('T')[0];
      setDateRange(today, today);
    }

    function setThisWeekRange() {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      setDateRange(
        startOfWeek.toISOString().split('T')[0],
        endOfWeek.toISOString().split('T')[0]
      );
    }

    function setThisMonthRange() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setDateRange(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      );
    }

    // ===== Calendar Functions =====
    function updateCalendarDisplay() {
      const year = currentCalendarDate.getFullYear();
      const month = currentCalendarDate.getMonth();
      
      // Update month/year display
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      if (elements.currentMonthYear) {
        elements.currentMonthYear.textContent = `${monthNames[month]} ${year + 543}`;
      }
      
      // Generate branch tabs if in branch view
      if (currentCalendarView === 'branch') {
        generateBranchTabs();
      
        }
      // Generate calendar grid
      generateCalendarGrid(year, month);
    }
    
    // ===== Branch Management Functions =====
    function switchCalendarView(view) {
      currentCalendarView = view;
      
      // Update button states
      if (elements.btnBranchView && elements.btnAllView) {
        if (view === 'branch') {
          elements.btnBranchView.className = 'px-3 py-1 text-sm font-medium rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm';
          elements.btnAllView.className = 'px-3 py-1 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100';
          
              
        }
          // Show branch tabs and branch summary
          if (elements.branchTabs) elements.branchTabs.classList.remove('hidden');
          if (elements.allViewFilters) elements.allViewFilters.classList.add('hidden');
          if (elements.branchSummary) elements.branchSummary.classList.remove('hidden');
          if (elements.overallSummary) elements.overallSummary.classList.add('hidden');
        } else {
          elements.btnAllView.className = 'px-3 py-1 text-sm font-medium rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm';
          elements.btnBranchView.className = 'px-3 py-1 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100';
          
          // Show all view filters and overall summary
          if (elements.branchTabs) elements.branchTabs.classList.add('hidden');
          if (elements.allViewFilters) elements.allViewFilters.classList.remove('hidden');
          if (elements.branchSummary) elements.branchSummary.classList.add('hidden');
          if (elements.overallSummary) elements.overallSummary.classList.remove('hidden');
      }
      
      updateCalendarDisplay();
      updateCalendarSummary();
    }
    
    function generateBranchTabs() {
      if (!elements.branchTabs) return;
      
      Performance.start('generateBranchTabs');
      elements.branchTabs.innerHTML = '';
      
      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      
      debugLog('Generating branch tabs for employees:', employees.length);
      
      // Group employees by branch
      const employeesByBranch = {};
      employees.forEach(employee => {
        // ใช้ branch name เป็น key แทน branch ID
        let branchKey = 'no-branch';
        let branchName = 'ไม่ระบุสาขา';
        let branchId = employee.branchId || null;
        
        // ลำดับความสำคัญ: allowedBranches[0] > employee.branch > defaultBranches[0] > branchId
        if (employee.allowedBranches && employee.allowedBranches.length > 0) {
          const firstAllowedBranch = employee.allowedBranches[0];
          branchKey = firstAllowedBranch.name || firstAllowedBranch.branch_code || firstAllowedBranch._id || firstAllowedBranch.id;
          branchName = firstAllowedBranch.name || firstAllowedBranch.branch_code || 'สาขา';
          branchId = firstAllowedBranch._id || firstAllowedBranch.id || branchKey;
        } else if (employee.branch && employee.branch.name) {
          branchKey = employee.branch.name;
          branchName = employee.branch.name;
          branchId = employee.branch._id || employee.branch.id || branchKey;
        } else if (employee.branch && employee.branch.branch_code) {
          branchKey = employee.branch.branch_code;
          branchName = employee.branch.branch_code;
          branchId = employee.branch._id || employee.branch.id || branchKey;
        } else if (employee.defaultBranches && employee.defaultBranches.length > 0) {
          const firstDefaultBranch = employee.defaultBranches[0];
          branchKey = firstDefaultBranch.name || firstDefaultBranch.branch_code || firstDefaultBranch._id || firstDefaultBranch.id;
          branchName = firstDefaultBranch.name || firstDefaultBranch.branch_code || 'สาขา';
          branchId = firstDefaultBranch._id || firstDefaultBranch.id || branchKey;
        } else if (employee.branchId) {
          branchKey = employee.branchId;
          branchId = employee.branchId;
          branchName = 'สาขา ' + employee.branchId;
        }
        debugLog('Employee:', employee.name, 'Branch Key:', branchKey, 'Branch Name:', branchName);
        
        if (!employeesByBranch[branchKey]) {
          employeesByBranch[branchKey] = {
            id: branchId,
            key: branchKey, // เพิ่ม key สำหรับการอ้างอิง
            name: branchName,
            employees: []
          };
        }
        employeesByBranch[branchKey].employees.push(employee);
      });
      
      debugLog('Employees grouped by branch:', employeesByBranch);
      
      // Sort branches: put "no-branch" last
      const sortedBranches = Object.values(employeesByBranch).sort((a, b) => {
        if (a.key === 'no-branch') return 1;
        if (b.key === 'no-branch') return -1;
        return a.name.localeCompare(b.name);
      });
      
      // Create "All Branches" tab first
      const allTab = document.createElement('button');
      allTab.className = `px-4 py-2 text-sm font-medium rounded-lg transition ${
        !currentSelectedBranch 
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`;
      
      const totalEmployees = Object.values(employeesByBranch).reduce((sum, branch) => sum + branch.employees.length, 0);
      allTab.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="bi bi-buildings"></i>
          <span>ทุกสาขา</span>
          <span class="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
            ${totalEmployees}
          </span>
        </div>
      `;
      
      allTab.addEventListener('click', () => {
        currentSelectedBranch = null;
        selectedBranchId = null;
        currentCalendarBranchFilter = null;
        updateBranchInfo('ทุกสาขา', totalEmployees);
        
        // Update tab states
        const tabs = elements.branchTabs.querySelectorAll('button');
        tabs.forEach(tab => {
          tab.className = tab.className.replace(
            'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500',
            'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          );
        });
        
        allTab.className = allTab.className.replace(
          'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
        );
        
        updateEmployeeFilterByBranch();
        updateCalendarDisplay();
        updateCalendarSummary();
      });
      fragment.appendChild(allTab);

      // Set default to "All Branches" if no branch is selected
      if (!currentSelectedBranch) {
        updateBranchInfo('ทุกสาขา', totalEmployees);
      
        }
      // Create tabs for each branch
      sortedBranches.forEach((branch, index) => {
        const tab = document.createElement('button');
        tab.className = `px-4 py-2 text-sm font-medium rounded-lg transition ${
          currentSelectedBranch === branch.key
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`;
        
        const iconClass = branch.key === 'no-branch' ? 'bi-question-circle' : 'bi-building';
        const badgeColor = branch.key === 'no-branch' ? 'bg-orange-200 dark:bg-orange-600 text-orange-700 dark:text-orange-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300';
        
        tab.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="bi ${iconClass}"></i>
            <span>${branch.name}</span>
            <span class="${badgeColor} px-2 py-0.5 rounded-full text-xs">
              ${branch.employees.length}
            </span>
          </div>
        `;
        
        tab.addEventListener('click', () => selectBranch(branch.id, branch.name, branch.employees.length));
        fragment.appendChild(tab);
        
        // Don't auto-select first branch anymore, since we have "All Branches" as default
      });
      
      // Append all tabs at once
      elements.branchTabs.appendChild(fragment);
      
      debugLog('Generated', sortedBranches.length, 'branch tabs');
      Performance.end('generateBranchTabs');
    }
    
    function selectBranch(branchId, branchName, employeeCount) {
      currentSelectedBranch = branchId;
      selectedBranchId = branchId; // Also set global selectedBranchId
      currentCalendarBranchFilter = branchId; // Set calendar branch filter
      
      updateBranchInfo(branchName, employeeCount);
      
      // Update tab states
      const tabs = elements.branchTabs.querySelectorAll('button');
      tabs.forEach(tab => {
        tab.className = tab.className.replace(
          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500',
          'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        );
      });
      
      // Highlight selected tab
      const selectedTab = Array.from(tabs).find(tab => 
        tab.textContent.includes(branchName)
      );
      if (selectedTab) {
        selectedTab.className = selectedTab.className.replace(
          'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
        );
      
        }
      // Update employee filter when branch is selected
      updateEmployeeFilterByBranch();
      
      updateCalendarDisplay();
      updateCalendarSummary();
    }
    
    function updateBranchInfo(branchName, employeeCount) {
      if (elements.currentBranchName) {
        elements.currentBranchName.textContent = branchName;
      
        }
      if (elements.currentBranchEmployeeCount) {
        elements.currentBranchEmployeeCount.textContent = employeeCount;
      
        }
    }

    // Helper function to check if work schedule is valid for specific date
    function isWorkScheduleValidForDate(workSchedule, dateString) {
      if (!workSchedule) return false;
      
      const effectiveFromStr = DateUtils.formatDate(new Date(workSchedule.effectiveFrom));
      const effectiveToStr = workSchedule.effectiveTo ? DateUtils.formatDate(new Date(workSchedule.effectiveTo)) : null;
      
      // Check if date is within effective range
      if (!DateUtils.isDateInRange(dateString, effectiveFromStr, effectiveToStr)) {
        return false;
      
        }
      // Check work type
      if (workSchedule.workType === 'regular') {
        const dayName = DateUtils.getDayName(dateString);
        return workSchedule.regularSchedule?.workDays?.includes(dayName);
      } else if (workSchedule.workType === 'shift') {
       
        return workSchedule.shiftSchedule?.assignedShifts?.some(shift => {
          const shiftDate = DateUtils.formatDate(new Date(shift.date));
          return DateUtils.isSameDate(shiftDate, dateString) && shift.status !== 'cancelled';
        });
      return false;
    }

    // Helper function to get day schedules for a specific date
    function getDaySchedules(dateString) {
      if (!scheduleData || scheduleData.length === 0) return [];
      return scheduleData.filter(workSchedule => isWorkScheduleValidForDate(workSchedule, dateString));
    }

    // Helper function to create calendar day element
    function createCalendarDayElement(currentDate, year, month) {
      const dayElement = document.createElement('div');
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = DateUtils.isSameDate(DateUtils.formatDate(currentDate), DateUtils.getTodayString());
      const dateString = DateUtils.formatDate(currentDate);
      
      // Set base classes
      dayElement.className = `calendar-cell ${isToday ? 'calendar-today' : ''} ${!isCurrentMonth ? 'calendar-other-month' : ''}`;
      
      // Date number
      const dateDiv = document.createElement('div');
      dateDiv.className = 'calendar-date text-gray-900 dark:text-gray-100';
      dateDiv.textContent = currentDate.getDate();
      dayElement.appendChild(dateDiv);
      
      return { dayElement, dateString };
    }

    function generateCalendarGrid(year, month) {
      if (!elements.calendarGrid) return;
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      elements.calendarGrid.innerHTML = '';
      
      for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const { dayElement, dateString } = createCalendarDayElement(currentDate, year, month);
        
        // Get work schedules for this date using helper function
        let daySchedules = getDaySchedules(dateString);
        
        // Debug log for today's schedules
        debugLog(`Found ${daySchedules.length} schedules for ${dateString}`);
        
        // Filter by employee if selected
        let filteredSchedules = daySchedules;
        if (currentCalendarEmployeeFilter) {
          filteredSchedules = daySchedules.filter(schedule => 
            schedule.user?.toString() === currentCalendarEmployeeFilter || 
            schedule.user?._id?.toString() === currentCalendarEmployeeFilter
          );
        }
        // Add work schedule items
        filteredSchedules.forEach(workSchedule => {
          const scheduleItem = document.createElement('div');
          
          // ดึงข้อมูลพนักงานและสาขา
          const user = workSchedule.user;
          let employeeName = 'N/A';
          
          // ลองหาชื่อพนักงานจากหลายแหล่ง
          if (user?.employee?.name) {
            employeeName = user.employee.name;
          } else if (user?.username) {
            employeeName = user.username;
          } else if (user?.name) {
            employeeName = user.name;
          }
          const branchName = workSchedule.branch?.name || workSchedule.branch?.branch_code || '';
          
          // ดึงข้อมูลเวลาทำงาน
          let timeDisplay = '';
          let scheduleType = workSchedule.workType;
          
          if (workSchedule.workType === 'regular') {
            // สำหรับพนักงานประจำ - แสดงช่วงเวลาทำงาน
            const periods = workSchedule.regularSchedule?.periods || [];
            if (periods.length > 0) {
              const firstPeriod = periods[0];
              const lastPeriod = periods[periods.length - 1];
              timeDisplay = `${firstPeriod.startTime}-${lastPeriod.endTime}`;
            }
          } else if (workSchedule.workType === 'shift') {
            // สำหรับพนักงานกะ - หาข้อมูลกะในวันนี้
            const todayShift = workSchedule.shiftSchedule?.assignedShifts?.find(shift => {
              const shiftDate = new Date(shift.date).toISOString().split('T')[0];
              return shiftDate === dateString;
            });
            
            if (todayShift) {
              timeDisplay = `${todayShift.startTime || '00:00'}-${todayShift.endTime || '00:00'}`;
              scheduleType = todayShift.shiftType || 'shift';
            } else {
              timeDisplay = 'ไม่มีกะงาน';
            }
          }
          
          // กำหนดสีและ class
          const colorClass = `schedule-${workSchedule.workType}`;
          const statusClass = workSchedule.status === 'pending' ? 'schedule-pending' : '';
          scheduleItem.className = `schedule-item ${colorClass} ${statusClass} text-xs p-1 m-1 rounded bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700`;
          
          // แสดงข้อมูล
          const displayText = [
            employeeName,
            branchName ? `(${branchName})` : '',
            timeDisplay,
            scheduleType !== 'regular' ? `[${scheduleType}]` : ''
          ].filter(Boolean).join(' ');
          
          scheduleItem.textContent = displayText;
          
          // Add event listeners
          scheduleItem.addEventListener('click', (e) => {
            e.stopPropagation();
            openCalendarScheduleModal(dateString, workSchedule);
          });
          
          scheduleItem.addEventListener('mouseenter', (e) => {
            showWorkScheduleTooltip(e, workSchedule);
          });
          
          scheduleItem.addEventListener('mouseleave', hideScheduleTooltip);
          
          dayElement.appendChild(scheduleItem);
        });
        
        // Add schedule button (only for current month)
        if (isCurrentMonth) {
          const addBtn = document.createElement('div');
          addBtn.className = 'add-schedule-btn';
          addBtn.innerHTML = '<i class="bi bi-plus"></i>';
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCalendarScheduleModal(dateString);
          });
          dayElement.appendChild(addBtn);
        }
        
        // Day click event - เปิด modal สร้างตารางงาน
        dayElement.addEventListener('click', () => {
          if (isCurrentMonth) {
            openCalendarScheduleModal(dateString);
          }
        });

        // Right-click to show 24-hour schedule detail
        dayElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (isCurrentMonth) {
            openScheduleDetailModal(dateString);
          
        }
        });
        
        dayElement.addEventListener('dblclick', (e) => {
  e.preventDefault();
  if (isCurrentMonth) {
    setDateRange(dateString, dateString);
    switchToTableView();
  
        }
}); // ← เพิ่มวงเล็บปิดที่ถูกต้อง
        
        if (elements.calendarGrid) {
        elements.calendarGrid.appendChild(dayElement);
      
        }
    }

    function showScheduleTooltip(event, schedule) {
      const tooltip = elements.scheduleTooltip;
      if (!tooltip) return;
      
      const employee = employees.find(e => e.id == schedule.employeeId);
      const scheduleTypeText = {
        'regular': 'ปกติ',
        'morning': 'กะเช้า',
        'afternoon': 'กะบ่าย',
        'night': 'กะดึก',
        'flexible': 'ยืดหยุ่น',
        'custom': 'กำหนดเอง',
        'holiday': 'วันหยุด'
      };
      
      const branchInfo = employee?.branch ? `<div>สาขา: ${employee.branch.name}</div>` : '';
      
      tooltip.innerHTML = `
        <div class="font-medium">${employee ? employee.name : 'N/A'}</div>
        ${branchInfo}
        <div>เวลา: ${getScheduleTimeDisplay(schedule)}</div>
        <div>ประเภท: ${scheduleTypeText[schedule.type] || schedule.type}</div>
        <div>สถานะ: ${schedule.status === 'pending' ? 'รออนุมัติ' : 'อนุมัติแล้ว'}</div>
        ${schedule.allowOT ? '<div>อนุญาต OT: ใช่</div>' : ''}
        ${schedule.notes ? `<div>หมายเหตุ: ${schedule.notes}</div>` : ''}
        <div class="text-xs mt-1 opacity-75">คลิกเพื่อแก้ไข</div>
      `;
      
      tooltip.style.left = event.pageX + 10 + 'px';
      tooltip.style.top = event.pageY + 10 + 'px';
      tooltip.classList.remove('hidden');
    }

    function hideScheduleTooltip() {
      if (elements.scheduleTooltip) {
        elements.scheduleTooltip.classList.add('hidden');
      
        }
    }

    // ===== Work Schedule Functions =====
    function showWorkScheduleTooltip(event, workSchedule) {
      const tooltip = elements.scheduleTooltip;
      if (!tooltip) return;
      
      const user = workSchedule.user;
      const employeeName = user?.username || user?.employee?.name || 'N/A';
      const branchName = workSchedule.branch?.name || workSchedule.branch?.branch_code || '';
      
      // สร้างข้อมูลแสดงใน tooltip
      let scheduleInfo = '';
      
      if (workSchedule.workType === 'regular') {
        scheduleInfo = 'พนักงานประจำ<br>';
        const periods = workSchedule.regularSchedule?.periods || [];
        periods.forEach(period => {
          scheduleInfo += `${period.name}: ${period.startTime}-${period.endTime}<br>`;
        });
        
        const workDays = workSchedule.regularSchedule?.workDays || [];
        const dayNames = {
          'monday': 'จันทร์', 'tuesday': 'อังคาร', 'wednesday': 'พุธ',
          'thursday': 'พฤหัสบดี', 'friday': 'ศุกร์', 'saturday': 'เสาร์', 'sunday': 'อาทิตย์'
        };
        const workDayNames = workDays.map(day => dayNames[day]).join(', ');
        scheduleInfo += `วันทำงาน: ${workDayNames}`;
      } else if (workSchedule.workType === 'shift') {
        scheduleInfo = 'พนักงานกะ<br>';
        const shifts = workSchedule.shiftSchedule?.assignedShifts || [];
        scheduleInfo += `จำนวนกะที่กำหนด: ${shifts.length} กะ`;
      } else {
        scheduleInfo = 'พนักงานยืดหยุ่น';
      }
      
      tooltip.innerHTML = `
        <div class="font-semibold">${employeeName}</div>
        <div class="text-sm text-gray-600">${branchName}</div>
        <div class="text-sm mt-2">${scheduleInfo}</div>
        <div class="text-xs text-gray-500 mt-1">สถานะ: ${workSchedule.status}</div>
      `;
      
      // Position tooltip
      const rect = event.target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - 10}px`;
      tooltip.classList.remove('hidden');
    }

    function openWorkScheduleModal(dateString, workSchedule) {
      debugLog('Opening work schedule modal for:', workSchedule);
      
      // สำหรับตอนนี้ ให้แสดง alert พร้อมข้อมูล
      const user = workSchedule.user;
      const employeeName = user?.username || user?.employee?.name || 'N/A';
      const branchName = workSchedule.branch?.name || '';
      
      let modalContent = `พนักงาน: ${employeeName}\n`;
      modalContent += `สาขา: ${branchName}\n`;
      modalContent += `ประเภท: ${workSchedule.workType}\n`;
      modalContent += `สถานะ: ${workSchedule.status}\n`;
      
      if (workSchedule.workType === 'regular') {
        const periods = workSchedule.regularSchedule?.periods || [];
        modalContent += `ช่วงเวลาทำงาน:\n`;
        periods.forEach(period => {
          modalContent += `- ${period.name}: ${period.startTime}-${period.endTime}\n`;
        });
      }
      
      alert(modalContent);
    }

    // ===== Work Schedule Validation Functions =====
    
    /**
     * ตรวจสอบว่าพนักงานสามารถ check-in ได้ในเวลานี้ตามตารางงาน
     */
    async function validateCheckInSchedule(userId, branchId, checkInTime = new Date()) {
      try {
        debugLog('Validating check-in schedule for user:', userId, 'branch:', branchId, 'time:', checkInTime);
        
        // โหลดตารางงานปัจจุบันของพนักงาน
        const currentSchedule = await DataLoader.loadCurrentUserSchedule(branchId);
        
        if (!currentSchedule) {
          return {
            allowed: false,
            reason: 'ไม่พบตารางงานสำหรับสาขานี้',
            requiresApproval: false
          };
        const schedule = currentSchedule.schedule;
        const isWorkDay = currentSchedule.isWorkDay;
        const workType = currentSchedule.workType;
        const specialSettings = currentSchedule.specialSettings || {};
        
        debugLog('Current schedule:', { schedule, isWorkDay, workType, specialSettings });
        
        // ตรวจสอบว่าวันนี้เป็นวันทำงานหรือไม่
        if (!isWorkDay) {
          return {
            allowed: false,
            reason: 'วันนี้ไม่ใช่วันทำงานตามตารางที่กำหนด',
            requiresApproval: true
          };
        const currentTime = checkInTime.toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5); // HH:mm format
        
        // สำหรับพนักงานประจำ
        if (workType === 'regular' && schedule && schedule.periods) {
          const periods = schedule.periods;
          let earliestStart = null;
          
          // หาเวลาเริ่มงานเร็วสุด
          periods.forEach(period => {
            if (period.isActive && (!earliestStart || period.startTime < earliestStart)) {
              earliestStart = period.startTime;
            
        }
          });
          
          if (earliestStart) {
            const earlyBuffer = specialSettings.earlyCheckInBuffer || 15; // default 15 minutes
            const lateBuffer = specialSettings.lateCheckInBuffer || 30; // default 30 minutes
            
            const scheduleTime = TimeUtils.parseTime(earliestStart);
            const checkTime = TimeUtils.parseTime(currentTime);
            
            const timeDiffMinutes = (checkTime - scheduleTime) / (1000 * 60);
            
            debugLog('Schedule check:', { earliestStart, currentTime, timeDiffMinutes, earlyBuffer, lateBuffer });
            
            // เช็คอินก่อนเวลา
            if (timeDiffMinutes < -earlyBuffer) {
              return {
                allowed: false,
                reason: `ยังไม่ถึงเวลาเช็คอิน (เวลาทำงาน: ${earliestStart}, สามารถเช็คอินก่อนได้ ${earlyBuffer} นาที)`,
                requiresApproval: true,
                scheduleTime: earliestStart,
                actualTime: currentTime
              };
            }
            
            // เช็คอินหลังเวลา
            if (timeDiffMinutes > lateBuffer) {
              return {
                allowed: specialSettings.requireApprovalForLate !== false,
                reason: `เช็คอินสายเกินกำหนด (เวลาทำงาน: ${earliestStart}, สายไป ${Math.round(timeDiffMinutes)} นาที)`,
                requiresApproval: true,
                scheduleTime: earliestStart,
                actualTime: currentTime,
                isLate: true
              };
            }
            
            // เช็คอินได้ปกติ
            return {
              allowed: true,
              reason: 'เช็คอินตามเวลาปกติ',
              requiresApproval: false,
              scheduleTime: earliestStart,
              actualTime: currentTime
            };
          }
        }
        
        // สำหรับพนักงานกะ
        if (workType === 'shift' && schedule) {
          const today = checkInTime.toISOString().split('T')[0];
          const todayShifts = schedule.assignedShifts?.filter(shift => 
            shift.date?.toISOString?.()?.split('T')[0] === today && 
            shift.status !== 'cancelled'
          ) || [];
          
          if (todayShifts.length === 0) {
            return {
              allowed: false,
              reason: 'ไม่มีกะงานที่กำหนดไว้สำหรับวันนี้',
              requiresApproval: true
            };
          }
          
          // ตรวจสอบแต่ละกะ
          for (const shift of todayShifts) {
            const shiftStart = shift.startTime;
            const earlyBuffer = specialSettings.earlyCheckInBuffer || 15;
            const lateBuffer = specialSettings.lateCheckInBuffer || 30;
            
            const scheduleTime = TimeUtils.parseTime(shiftStart);
            const checkTime = TimeUtils.parseTime(currentTime);
            
            const timeDiffMinutes = (checkTime - scheduleTime) / (1000 * 60);
            
            // ถ้าอยู่ในช่วงเวลาที่อนุญาต
            if (timeDiffMinutes >= -earlyBuffer && timeDiffMinutes <= lateBuffer) {
              return {
                allowed: true,
                reason: timeDiffMinutes > 0 ? 'เช็คอินกะงาน (สาย)' : 'เช็คอินกะงานตามเวลา',
                requiresApproval: timeDiffMinutes > 0 && specialSettings.requireApprovalForLate,
                scheduleTime: shiftStart,
                actualTime: currentTime,
                shiftType: shift.shiftType,
                isLate: timeDiffMinutes > 0
              };
            }
          return {
            allowed: false,
            reason: 'ไม่อยู่ในช่วงเวลาที่อนุญาตให้เช็คอินสำหรับกะงานใดๆ',
            requiresApproval: true
          };
        }
        
        // กรณีอื่นๆ หรือไม่มีข้อมูลตารางงาน
        return {
          allowed: true,
          reason: 'ไม่มีข้อจำกัดเวลาเช็คอิน',
          requiresApproval: false
        };
        
      } catch (error) {
        debugError('Error validating check-in schedule:', error);
        return {
          allowed: true,
          reason: 'ไม่สามารถตรวจสอบตารางงานได้ อนุญาตให้เช็คอิน',
          requiresApproval: false,
          error: error.message
        };
      }
    }

    /**
     * ตรวจสอบ Zone สำหรับการ check-in
     */
    async function validateCheckInZone(branchId, userLocation) {
      try {
        debugLog('Validating check-in zone for branch:', branchId, 'location:', userLocation);
        
        // โหลดข้อมูล zones สำหรับสาขา
        const response = await fetch('/api/zones', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load zones');
        
        const data = await response.json();
        const zones = data.data || [];
        
        // กรองเฉพาะ zone ที่เป็น active
        const activeZones = zones.filter(zone => zone.isActive);
        
        if (activeZones.length === 0) {
          // ถ้าไม่มี zone ให้อนุญาตเช็คอินได้ทุกที่
          return {
            allowed: true,
            reason: 'ไม่มีข้อจำกัดพื้นที่สำหรับการเช็คอิน',
            requiresApproval: false
          };
        }
        
        // ตรวจสอบว่าอยู่ในพื้นที่ที่อนุญาตหรือไม่
        for (const zone of activeZones) {
          const distance = TimeUtils.calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            zone.center.latitude, 
            zone.center.longitude
          );
          
          debugLog(`Distance to zone "${zone.name}":`, distance, 'meters, radius:', zone.radius);
          
          if (distance <= zone.radius) {
            return {
              allowed: true,
              reason: `อยู่ในพื้นที่ "${zone.name}"`,
              requiresApproval: false,
              zone: zone,
              distance: distance
            };
          }
        }
        
        // ไม่อยู่ในพื้นที่ใดๆ
        const nearestZone = activeZones.reduce((nearest, zone) => {
          const distance = TimeUtils.calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            zone.center.latitude, 
            zone.center.longitude
          );
          
          return (!nearest || distance < nearest.distance) 
            ? { zone, distance } 
            : nearest;
        }, null);
        
        return {
          allowed: false,
          reason: `อยู่นอกพื้นที่ที่อนุญาต (ใกล้ที่สุดคือ "${nearestZone.zone.name}" ห่าง ${Math.round(nearestZone.distance)} เมตร)`,
          requiresApproval: true,
          nearestZone: nearestZone.zone,
          distance: nearestZone.distance
        };
        
      } catch (error) {
        debugError('Error validating check-in zone:', error);
        return {
          allowed: true,
          reason: 'ไม่สามารถตรวจสอบพื้นที่ได้ อนุญาตให้เช็คอิน',
          requiresApproval: false,
          error: error.message
        };
      }
    }

    function switchToTableView() {
      ViewManager.switchToTableView();
    }

    function switchToCalendarView() {
      ViewManager.switchToCalendarView();
    }

    // ===== Statistics Functions =====
    function updateStatistics() {
      const filteredData = getFilteredData();
      
      elements.totalRecords.textContent = filteredData.length;
      
      const normalCount = filteredData.filter(record => 
        !record.approvalStatus || record.approvalStatus === 'approved' || record.approvalStatus === 'not_required'
      ).length;
      elements.normalAttendance.textContent = normalCount;
      
      const pendingCount = filteredData.filter(record => 
        record.approvalStatus === 'pending'
      ).length;
      elements.pendingApproval.textContent = pendingCount;
      
      const totalOT = filteredData.reduce((sum, record) => 
        sum + parseFloat(record.totalOvertimeHours || 0), 0
      );
      elements.totalOvertimeHours.textContent = totalOT.toFixed(1);
    }

    function updateCurrentTimeDisplay() {
      const currentTimeElement = document.getElementById('currentTime');
      if (currentTimeElement) {
        const now = new Date();
        const formattedTime = now.toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        currentTimeElement.innerHTML = formattedTime;
      }
    }

    function setupEventListeners() {
      elements.btnToggleMenu.addEventListener('click', toggleSidebar);
      if (elements.menuToggle) {
        elements.menuToggle.addEventListener('click', toggleSidebar);
      
        }
      elements.btnToggleDark.addEventListener('click', toggleDarkMode);

      if (elements.btnLogoutSidebar) {
        elements.btnLogoutSidebar.addEventListener('click', () => {
          showAlert('ออกจากระบบเรียบร้อยแล้ว', 'success');
        });
      }

      // Date range filters
      elements.filterDateFrom.addEventListener('change', () => {
        currentFilterDateFrom = elements.filterDateFrom.value;
        if (currentFilterDateFrom > currentFilterDateTo) {
          currentFilterDateTo = currentFilterDateFrom;
          elements.filterDateTo.value = currentFilterDateTo;
        
        }
        updateDateRangeDisplay();
        currentPage = 1;
        filterAndDisplayRecords();
        updateStatistics();
      });

      elements.filterDateTo.addEventListener('change', () => {
        currentFilterDateTo = elements.filterDateTo.value;
        if (currentFilterDateTo < currentFilterDateFrom) {
          currentFilterDateFrom = currentFilterDateTo;
          elements.filterDateFrom.value = currentFilterDateFrom;
        
        }
        updateDateRangeDisplay();
        currentPage = 1;
        filterAndDisplayRecords();
        updateStatistics();
      });

      // Quick date filters
      elements.btnToday.addEventListener('click', setTodayRange);
      elements.btnThisWeek.addEventListener('click', setThisWeekRange);
      elements.btnThisMonth.addEventListener('click', setThisMonthRange);

      // View toggle
      if (elements.btnTableView) {
        elements.btnTableView.addEventListener('click', switchToTableView);
      
        }
      if (elements.btnCalendarView) {
        elements.btnCalendarView.addEventListener('click', switchToCalendarView);
      
        }
      // Calendar navigation
      if (elements.btnPrevMonth) {
        elements.btnPrevMonth.addEventListener('click', async () => {
          currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
          await loadScheduleData(true); // Force reload data
        });
      }

      if (elements.btnNextMonth) {
        elements.btnNextMonth.addEventListener('click', async () => {
          currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
          await loadScheduleData(true); // Force reload data
        });
      }

      // Branch View Toggle
      if (elements.btnBranchView) {
        elements.btnBranchView.addEventListener('click', () => switchCalendarView('branch'));
      
        }
      if (elements.btnAllView) {
        elements.btnAllView.addEventListener('click', () => switchCalendarView('all'));
      
        }
      // Calendar Schedule Management
      if (elements.calendarBranchFilter) {
        elements.calendarBranchFilter.addEventListener('change', (e) => {
          currentCalendarBranchFilter = e.target.value;
          // Update employee filter based on branch selection
          updateEmployeeFilterByBranch();
          updateCalendarDisplay();
          updateCalendarSummary();
        });
      }

      if (elements.calendarEmployeeFilter) {
        elements.calendarEmployeeFilter.addEventListener('change', (e) => {
          currentCalendarEmployeeFilter = e.target.value;
          updateCalendarDisplay();
          updateCalendarSummary();
        });
      }

      if (elements.btnTodayCalendar) {
        elements.btnTodayCalendar.addEventListener('click', async () => {
          currentCalendarDate = new Date();
          await loadScheduleData(true); // Force reload data
        });
      }

      if (elements.btnAddScheduleFromCalendar) {
        elements.btnAddScheduleFromCalendar.addEventListener('click', () => {
          const today = new Date().toISOString().split('T')[0];
          openCalendarScheduleModal(today);
        });
      }

      // Calendar Schedule Modal
      if (elements.btnCloseCalendarScheduleModal) {
        elements.btnCloseCalendarScheduleModal.addEventListener('click', closeCalendarScheduleModal);
      
        }
      if (elements.btnCancelCalendarSchedule) {
        elements.btnCancelCalendarSchedule.addEventListener('click', closeCalendarScheduleModal);
      
        }
      if (elements.calendarScheduleForm) {
        debugLog('Setting up calendar schedule form event listener');
        elements.calendarScheduleForm.addEventListener('submit', handleCalendarScheduleSubmit);
      } else {
        console.error('calendarScheduleForm element not found!');
      }
      
      // เพิ่มการตรวจสอบปุ่มบันทึก
      if (elements.btnSaveCalendarSchedule) {
        debugLog('Save button found:', elements.btnSaveCalendarSchedule);
        elements.btnSaveCalendarSchedule.addEventListener('click', function(e) {
          debugLog('Save button clicked!');
          // ตรวจสอบว่าปุ่มอยู่ในฟอร์มหรือไม่
          const form = elements.btnSaveCalendarSchedule.closest('form');
          debugLog('Button is in form:', form);
        });
      } else {
        console.error('btnSaveCalendarSchedule element not found!');
      }

      if (elements.calendarScheduleType) {
        elements.calendarScheduleType.addEventListener('change', handleScheduleTypeChange);
      
        }
      if (elements.applyToMultipleDays) {
        elements.applyToMultipleDays.addEventListener('change', toggleMultipleDaysSettings);
      
        }
      if (elements.btnDeleteCalendarSchedule) {
        elements.btnDeleteCalendarSchedule.addEventListener('click', handleDeleteCalendarSchedule);
      
        }
      // Schedule Types Management
      const btnManageScheduleTypes = document.getElementById('btnManageScheduleTypes');
      if (btnManageScheduleTypes) {
        btnManageScheduleTypes.addEventListener('click', openScheduleTypesModal);
      
        const btnCloseScheduleTypesModal = document.getElementById('btnCloseScheduleTypesModal');
      if (btnCloseScheduleTypesModal) {
        btnCloseScheduleTypesModal.addEventListener('click', closeScheduleTypesModal);
      
        const addScheduleTypeForm = document.getElementById('addScheduleTypeForm');
      if (addScheduleTypeForm) {
        addScheduleTypeForm.addEventListener('submit', handleAddScheduleTypeSubmit);
      
        const btnCloseEditScheduleTypeModal = document.getElementById('btnCloseEditScheduleTypeModal');
      if (btnCloseEditScheduleTypeModal) {
        btnCloseEditScheduleTypeModal.addEventListener('click', closeEditScheduleTypeModal);
      
        const btnCancelEditScheduleType = document.getElementById('btnCancelEditScheduleType');
      if (btnCancelEditScheduleType) {
        btnCancelEditScheduleType.addEventListener('click', closeEditScheduleTypeModal);
      
        const editScheduleTypeForm = document.getElementById('editScheduleTypeForm');
      if (editScheduleTypeForm) {
        editScheduleTypeForm.addEventListener('submit', handleEditScheduleTypeSubmit);
      
        }
      if (elements.searchEmployee) {
        elements.searchEmployee.addEventListener('input', () => {
          currentSearchTerm = elements.searchEmployee.value.toLowerCase();
          currentPage = 1;
          filterAndDisplayRecords();
        });
      }

      elements.btnPrevPage.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          filterAndDisplayRecords();
        
        }
      });

      elements.btnNextPage.addEventListener('click', () => {
        const filteredData = getFilteredData();
        const totalPages   = Math.ceil(filteredData.length / recordsPerPage);
        if (currentPage < totalPages) {
          currentPage++;
          filterAndDisplayRecords();
        
        }
      });

      elements.btnAddRecord.addEventListener('click', openAddModal);
      elements.btnEmptyAdd.addEventListener('click', openAddModal);
      elements.btnExportData.addEventListener('click', exportAttendanceData);
      

      elements.btnCloseModal.addEventListener('click', closeAttendanceModal);
      elements.btnCancelModal.addEventListener('click', closeAttendanceModal);

      elements.attendanceForm.addEventListener('submit', handleFormSubmit);

      elements.btnCancelDelete.addEventListener('click', closeConfirmModal);
      elements.btnConfirmDelete.addEventListener('click', confirmDelete);

      if (elements.btnAddTimePeriod) {
        elements.btnAddTimePeriod.addEventListener('click', addTimePeriod);
      
        }
      // เพิ่ม event listeners สำหรับ approval
      if (elements.tabAllRecords) {
        elements.tabAllRecords.addEventListener('click', () => switchTab('all'));
      
        }
      if (elements.tabPendingApprovals) {
        elements.tabPendingApprovals.addEventListener('click', () => switchTab('pending'));
      
        }
      if (elements.btnCloseApprovalModal) {
        elements.btnCloseApprovalModal.addEventListener('click', closeApprovalModal);
      
        }
      if (elements.btnApproveApproval) {
        elements.btnApproveApproval.addEventListener('click', () => handleApproval('approved'));
      
        }
      if (elements.btnRejectApproval) {
        elements.btnRejectApproval.addEventListener('click', () => handleApproval('rejected'));
      
        }
    }

    function toggleSidebar() {
      elements.sidebar.classList.toggle('-translate-x-64');
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.classList.toggle('ml-64');
        mainContent.classList.toggle('ml-0');
      
        const isHidden = elements.sidebar.classList.contains('-translate-x-64');
      elements.toggleIcon.classList.toggle('bi-chevron-right', isHidden);
      elements.toggleIcon.classList.toggle('bi-chevron-left', !isHidden);
    }

    function toggleDarkMode() {
      document.documentElement.classList.toggle('dark');
      const isDarkMode = document.documentElement.classList.contains('dark');
      elements.darkModeLabel.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
      localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    }

    function loadEmployeeOptions() {
      Performance.start('loadEmployeeOptions');
      debugLog('Loading employee options, employees count:', employees.length);
      debugLog('Current selected branch:', currentSelectedBranch);
      debugLog('Calendar branch filter:', currentCalendarBranchFilter);
      
      // กรองพนักงานตามสาขาที่เลือก
      let filteredEmployees = employees;
      const targetBranchId = currentSelectedBranch || currentCalendarBranchFilter;
      
      if (targetBranchId) {
        filteredEmployees = employees.filter(emp => {
          // ตรวจสอบหลายแหล่งข้อมูลสาขา รวมถึง branch name
          return emp.branchId === targetBranchId || 
                 emp.branch?.id === targetBranchId ||
                 emp.branch?._id === targetBranchId ||
                 emp.branch?.name === targetBranchId ||
                 emp.allowedBranches?.some(branch => 
                   branch.id === targetBranchId || 
                   branch._id === targetBranchId || 
                   branch.name === targetBranchId
                 ) ||
                 emp.defaultBranches?.some(branch => 
                   branch.id === targetBranchId || 
                   branch._id === targetBranchId || 
                   branch.name === targetBranchId
                 );
        });
      }
      // ถ้าไม่ได้เลือกสาขา จะแสดงพนักงานทั้งหมด
      
      debugLog('Filtered employees count:', filteredEmployees.length);
      
      // โหลดลงใน attendance modal
      elements.employeeSelect.innerHTML = '<option value="">เลือกพนักงาน</option>';
      filteredEmployees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        
        // สร้างข้อความแสดงชื่อและสาขา
        let displayText = employee.name || 'ไม่ระบุชื่อ';
        if (employee.branch && employee.branch.name) {
          displayText += ` (${employee.branch.name})`;
        else if (employee.branch && employee.branch.branch_code) {
         
        } displayText += ` (${employee.branch.branch_code})`;
        } else if (employee.allowedBranches && employee.allowedBranches.length > 0) {
         
        const branchName = employee.allowedBranches[0].name  || employee.allowedBranches[0].branch_code;
         
        } displayText += ` (${branchName})`;
        }
        
        option.textContent = displayText;
        elements.employeeSelect.appendChild(option);
      });

      // โหลดลงใน calendar schedule modal
      if (elements.calendarScheduleEmployee) {
        debugLog('Loading calendar schedule employee options');
        elements.calendarScheduleEmployee.innerHTML = '<option value="">เลือกพนักงาน</option>';
        
        if (employees.length === 0) {
          console.warn('No employees data available for calendar schedule modal');
          const noDataOption = document.createElement('option');
          noDataOption.value = '';
          noDataOption.textContent = 'ไม่พบข้อมูลพนักงาน';
          noDataOption.disabled = true;
          elements.calendarScheduleEmployee.appendChild(noDataOption);
        } else {
          employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            
            // สร้างข้อความแสดงชื่อและสาขา
            let displayText = employee.name || 'ไม่ระบุชื่อ';
            if (employee.branch && employee.branch.name) {
              displayText += ` (${employee.branch.name})`;
            else if (employee.branch && employee.branch.branch_code) {
             
        } displayText += ` (${employee.branch.branch_code})`;
            } else if (employee.allowedBranches && employee.allowedBranches.length > 0) {
             
        const branchName = employee.allowedBranches[0].name  || employee.allowedBranches[0].branch_code;
             
        } displayText += ` (${branchName})`;
            }
            
            option.textContent = displayText;
            elements.calendarScheduleEmployee.appendChild(option);
          });
          debugLog('Added', employees.length, 'employees to calendar schedule dropdown');
        }
      } else {
        console.error('calendarScheduleEmployee element not found');
      }
      
      if (elements.calendarEmployeeFilter) {
        elements.calendarEmployeeFilter.innerHTML = '<option value="">ทุกคน</option>';
        
        // Group by branch
        const employeesByBranch = {};
        employees.forEach(employee => {
          const branchName = employee.branch?.name || 'ไม่ระบุสาขา';
          if (!employeesByBranch[branchName]) {
            employeesByBranch[branchName] = [];
          
        }
          employeesByBranch[branchName].push(employee);
        });
        
        // Add options grouped by branch
        Object.keys(employeesByBranch).sort().forEach(branchName => {
          const optgroup = document.createElement('optgroup');
          optgroup.label = branchName;
          
          employeesByBranch[branchName].forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            optgroup.appendChild(option);
          });
          
          elements.calendarEmployeeFilter.appendChild(optgroup);
        });
      }
      
      Performance.end('loadEmployeeOptions');
    }
    
    // Filter employees by branch
    function filterEmployeesByBranch(branchId) {
      if (!branchId) return employees;
      return employees.filter(emp => emp.branchId === branchId);
    }
    
    // Get employee branch information
    function getEmployeeBranch(employeeId) {
      const employee = employees.find(emp => emp.id === employeeId);
      return employee?.branch || null;
    
        }
    function loadBranchOptions() {
      // Load branch options for calendar filter
      if (elements.calendarBranchFilter && branches.length > 0) {
        elements.calendarBranchFilter.innerHTML = '<option value="">ทุกสาขา</option>';
        branches.forEach(branch => {
          const option = document.createElement('option');
          option.value = branch._id || branch.id;
          option.textContent = branch.name;
          elements.calendarBranchFilter.appendChild(option);
        });
      }
    }
    
    // Update employee filter based on selected branch
    function updateEmployeeFilterByBranch() {
      if (!elements.calendarEmployeeFilter) return;
      
      // Reset employee filter
      currentCalendarEmployeeFilter = '';
      elements.calendarEmployeeFilter.innerHTML = '<option value="">ทุกคน</option>';
      
      // Get employees for selected branch
      const filteredEmployees = currentCalendarBranchFilter ? 
        filterEmployeesByBranch(currentCalendarBranchFilter) : 
        employees;
      
      if (currentCalendarBranchFilter) {
        // Show employees from selected branch only
        filteredEmployees.forEach(employee => {
          const option = document.createElement('option');
          option.value = employee.id;
          option.textContent = employee.name;
          elements.calendarEmployeeFilter.appendChild(option);
        });
      } else {
        // Show all employees grouped by branch
        const employeesByBranch = {};
        employees.forEach(employee => {
          const branchName = employee.branch?.name || 'ไม่ระบุสาขา';
          if (!employeesByBranch[branchName]) {
            employeesByBranch[branchName] = [];
          
        }
          employeesByBranch[branchName].push(employee);
        });
        
        Object.keys(employeesByBranch).sort().forEach(branchName => {
          const optgroup = document.createElement('optgroup');
          optgroup.label = branchName;
          
          employeesByBranch[branchName].forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            optgroup.appendChild(option);
          });
          
          elements.calendarEmployeeFilter.appendChild(optgroup);
        });
      }
    }

    function resetTimePeriodsForm() {
      elements.timePeriodsContainer.innerHTML = `
        <div class="time-period-group mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-gray-700 dark:text-gray-300">ช่วงเช้า</h4>
            <div>
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" class="period-enabled form-checkbox h-4 w-4 text-blue-600" checked>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">เปิดใช้งาน</span>
              </label>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาเข้า</label>
              <input type="time" class="time-in w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="08:00">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาออก</label>
              <input type="time" class="time-out w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="12:00">
            </div>
          </div>
        </div>

        <div class="time-period-group mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-gray-700 dark:text-gray-300">ช่วงบ่าย</h4>
            <div>
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" class="period-enabled form-checkbox h-4 w-4 text-blue-600" checked>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">เปิดใช้งาน</span>
              </label>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาเข้า</label>
              <input type="time" class="time-in w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="13:00">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาออก</label>
              <input type="time" class="time-out w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="17:00">
            </div>
          </div>
        </div>

        <div class="time-period-group overtime-period mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-gray-700 dark:text-gray-300">ชั่วโมงล่วงเวลา (OT)</h4>
            <div>
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" class="period-enabled form-checkbox h-4 w-4 text-blue-600">
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">เปิดใช้งาน</span>
              </label>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาเข้า OT</label>
              <input type="time" class="time-in w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="17:30" disabled>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาออก OT</label>
              <input type="time" class="time-out w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  focus:outline-none focus:ring focus:border-blue-300" value="19:30" disabled>
            </div>
          </div>
        </div>
      `;

      setupTimePeriodListeners();
      calculateTotalHours();
    }

    function setupTimePeriodListeners() {
      document.querySelectorAll('.period-enabled').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const inputs = this.closest('.time-period-group').querySelectorAll('input[type="time"]');
          inputs.forEach(input => {
            input.disabled = !this.checked;
          });
          calculateTotalHours();
        });
      });

      document.querySelectorAll('.time-in, .time-out').forEach(input => {
        input.addEventListener('change', calculateTotalHours);
      });

      document.querySelectorAll('.btn-remove-period').forEach(button => {
        button.addEventListener('click', function() {
          this.closest('.time-period-group').remove();
          calculateTotalHours();
        });
      });
    }

    function calculateTotalHours() {
      let totalRegularHours  = 0;
      let totalOvertimeHours = 0;

      const timePeriodGroups = document.querySelectorAll('.time-period-group');
      timePeriodGroups.forEach((group) => {
        const isEnabled = group.querySelector('.period-enabled').checked;
        if (!isEnabled) return;

        const timeIn  = group.querySelector('.time-in').value;
        const timeOut = group.querySelector('.time-out').value;

        if (timeIn && timeOut) {
          const totalMinutes = TimeUtils.calculateMinuteDifference(timeIn, timeOut);
          const hours = totalMinutes / 60;

          if (group.classList.contains('overtime-period')) {
            totalOvertimeHours += hours;
          } else {
            totalRegularHours += hours;
          }
        }
      });

      if (totalRegularHours > 8) {
        totalOvertimeHours += (totalRegularHours - 8);
        totalRegularHours = 8;
      
        }
      elements.totalRegularHours.value  = totalRegularHours.toFixed(1);
      elements.totalOvertimeHours.value = totalOvertimeHours.toFixed(1);
    }

    function addTimePeriod() {
      const container = elements.timePeriodsContainer;
      const index = container.querySelectorAll('.time-period-group').length;

      const timePeriodHTML = `
        <div class="time-period-group mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-gray-700 dark:text-gray-300">ช่วงเวลาเพิ่มเติม</h4>
            <div class="flex gap-2">
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" class="period-enabled form-checkbox h-4 w-4 text-blue-600" checked>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">เปิดใช้งาน</span>
              </label>
              <button type="button" class="text-red-500 btn-remove-period">
                <i class="bi bi-x-circle"></i>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาเข้า</label>
              <input type="time" class="time-in w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                     focus:outline-none focus:ring focus:border-blue-300">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาออก</label>
              <input type="time" class="time-out w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                     focus:outline-none focus:ring focus:border-blue-300">
            </div>
          </div>
        </div>
      `;

      const tempDiv        = document.createElement('div');
      tempDiv.innerHTML    = timePeriodHTML;
      const newTimePeriod  = tempDiv.firstElementChild;

      newTimePeriod.querySelector('.btn-remove-period').addEventListener('click', function() {
        this.closest('.time-period-group').remove();
        calculateTotalHours();
      });

      newTimePeriod.querySelector('.period-enabled').addEventListener('change', function() {
        const inputs = this.closest('.time-period-group').querySelectorAll('input[type="time"]');
        inputs.forEach(input => {
          input.disabled = !this.checked;
        });
        calculateTotalHours();
      });

      const timeInputs = newTimePeriod.querySelectorAll('input[type="time"]');
      timeInputs.forEach(input => {
        input.addEventListener('change', calculateTotalHours);
      });

      container.appendChild(newTimePeriod);
    }

    // ===== Approval Functions =====
    function switchTab(tab) {
      currentTab = tab;
      currentPage = 1;
      
      // Update tab appearance
      elements.tabAllRecords.classList.toggle('border-blue-500', tab === 'all');
      elements.tabAllRecords.classList.toggle('text-blue-600', tab === 'all');
      elements.tabAllRecords.classList.toggle('border-transparent', tab !== 'all');
      elements.tabAllRecords.classList.toggle('text-gray-500', tab !== 'all');
      
      elements.tabPendingApprovals.classList.toggle('border-blue-500', tab === 'pending');
      elements.tabPendingApprovals.classList.toggle('text-blue-600', tab === 'pending');
      elements.tabPendingApprovals.classList.toggle('border-transparent', tab !== 'pending');
      elements.tabPendingApprovals.classList.toggle('text-gray-500', tab !== 'pending');
      
      loadAttendanceData();
    }

    async function loadPendingApprovals() {
      try {
        const response = await fetch('/api/attendance/pending-approvals', {
          headers: getHeaders()
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        
        if (elements.pendingCount) {
          elements.pendingCount.textContent = data.data?.length || 0;
        
        return data.data || [];
      } catch (err) {
        console.error('Error loading pending approvals:', err);
        return [];
      }
    }

    function openApprovalModal(attendanceId) {
      const attendance = attendanceData.find(a => a._id === attendanceId);
      if (!attendance) return;
      
      currentApprovalId = attendanceId;
      
      const checkInTypeText = {
        'normal': 'ปกติ',
        'outside_area': 'นอกพื้นที่',
        'other_branch': 'ต่างสาขา'
      };
      
      elements.approvalDetails.innerHTML = `
        <div class="space-y-2">
          <div><strong>พนักงาน:</strong> ${attendance.user?.username || 'N/A'}</div>
          <div><strong>ประเภท:</strong> ${checkInTypeText[attendance.checkInType] || attendance.checkInType}</div>
          <div><strong>เวลาเช็คอิน:</strong> ${new Date(attendance.checkIn).toLocaleString('th-TH')}</div>
          <div><strong>สาขา:</strong> ${attendance.branch?.name || 'N/A'}</div>
          ${attendance.isOT ? '<div><strong>OT:</strong> ใช่</div>' : ''}
          ${attendance.note ? `<div><strong>หมายเหตุ:</strong> ${attendance.note}</div>` : ''}
        </div>
      `;
      
      elements.approvalNote.value = '';
      elements.approvalModal.classList.remove('hidden');
    }

    function closeApprovalModal() {
      elements.approvalModal.classList.add('hidden');
      currentApprovalId = null;
    }

    async function handleApproval(action) {
      if (!currentApprovalId) return;
      
      try {
        const response = await fetch(`/api/attendance/${currentApprovalId}/${action === 'approved' ? 'approve' : 'reject'}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            approvalNote: elements.approvalNote.value
          })
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const approvedRecord = attendanceData.find(a => a._id === currentApprovalId);
        if (approvedRecord) {
          trackAttendanceHistory(action === 'approved' ? 'approve' : 'reject', approvedRecord);
        
        }
        showAlert(`${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}การเช็คอินเรียบร้อยแล้ว`, 'success');
        closeApprovalModal();
        DataCache.invalidate('attendanceData');
        await loadAttendanceData(true);
        await loadPendingApprovals();
        
      } catch (err) {
        console.error('Error handling approval:', err);
        showAlert('เกิดข้อผิดพลาดในการอนุมัติ', 'error');
      }
    }

    function collectFormData() {
      const recordIdValue = elements.recordId.value;
      const employeeId    = parseInt(elements.employeeSelect.value);
      const employeeName  = elements.employeeSelect.options[elements.employeeSelect.selectedIndex].text;
      const date          = elements.attendanceDate.value;
      const note          = elements.note.value;

      const timePeriods   = [];
      const timeGroups    = document.querySelectorAll('.time-period-group');

      timeGroups.forEach((group, index) => {
        const isEnabled = group.querySelector('.period-enabled').checked;
        if (!isEnabled) return;

        const timeIn  = group.querySelector('.time-in').value;
        const timeOut = group.querySelector('.time-out').value;

        if (timeIn && timeOut) {
          let periodType;
          if (group.classList.contains('overtime-period')) {
            periodType = 'overtime';
          } else if (periodType) {
            $2 = 'morning';
          } else if (periodType) {
            $2 = 'afternoon';
          } else {
            periodType = 'additional';
          const [inHour,  inMinute ] = timeIn.split(':').map(Number);
          const [outHour, outMinute] = timeOut.split(':').map(Number);

          let totalMinutes = (outHour * 60 + outMinute) - (inHour * 60 + inMinute);
          if (totalMinutes < 0) totalMinutes += 24 * 60;

          const hours = (totalMinutes / 60).toFixed(1);

          timePeriods.push({
            type: periodType,
            timeIn,
            timeOut,
            hours
          });
        }
      });

      const totalRegularHours  = elements.totalRegularHours.value;
      const totalOvertimeHours = elements.totalOvertimeHours.value;

      return {
        id: recordIdValue || null,
        date,
        employeeId,
        employeeName,
        timePeriods,
        totalRegularHours,
        totalOvertimeHours,
        note
      };
    }

    function getFilteredData() {
      return (window.attendanceData || []).filter(record => {
        // Date range filter
        let matchDate = true;
        if (currentFilterDateFrom && currentFilterDateTo) {
          matchDate = record.date >= currentFilterDateFrom && record.date <= currentFilterDateTo;
        
        }
        // Search filter
        const matchSearch = !currentSearchTerm ||
                            record.employeeName.toLowerCase().includes(currentSearchTerm);
        
        // Tab filter
        let matchTab = true;
        if (currentTab === 'pending') {
          matchTab = record.approvalStatus === 'pending';
        
        return matchDate && matchSearch && matchTab;
      });
    }

    function renderAttendanceTable(data) {
      elements.attendanceTableBody.innerHTML = '';
      data.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-800';

        let periodsHTML = '';
        record.timePeriods.forEach(p => {
          const label = p.type === 'main' ? 'เช็คอิน/เอาท์' : 'อื่นๆ';
          const bg = p.type === 'main'
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'bg-gray-50 dark:bg-gray-700';

          periodsHTML += `
            <div class="mb-1 p-1 rounded ${bg}">
              <span class="font-medium">${label}:</span>
              ${p.timeIn}${p.timeOut ? ` - ${p.timeOut}` : ''}${p.hours ? ` (${p.hours} ชม.)` : ''}
            </div>`;
        });

        // สร้าง status badge สำหรับการอนุมัติ
        let statusBadge = '';
        if (record.approvalStatus === 'pending') {
          statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">รออนุมัติ</span>';
        } else if (statusBadge) {
            $2 = '<span
        } class="inline-flex
        } items-center
        } px-2.5
        } py-0.5
        } rounded-full
        } text-xs
        } font-medium
        } bg-green-100
        } text-green-800">อนุมัติแล้ว</span>';
        } else if (statusBadge) {
            $2 = '<span
        } class="inline-flex
        } items-center
        } px-2.5
        } py-0.5
        } rounded-full
        } text-xs
        } font-medium
        } bg-red-100
        } text-red-800">ปฏิเสธ</span>';
        } else {
          statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">ปกติ</span>';
        }

        // สร้างปุ่มสำหรับการจัดการ
        let actionButtons = '';
        if (record.approvalStatus === 'pending') {
          actionButtons = `
            <button class="btn-approve px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 mr-1" 
                    data-id="${record._id}" title="อนุมัติ">
              <i class="bi bi-check-circle"></i>
            </button>
          `;
        } else {
          actionButtons = `
            <button class="btn-edit px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-1" 
                    data-id="${record.id}" title="แก้ไข">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn-delete px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600" 
                    data-id="${record.id}" title="ลบ">
              <i class="bi bi-trash"></i>
            </button>
          `;
        }

        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(record.date)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">${record.employeeName}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex flex-col space-y-1">
              <span>${record.checkInTypeText || 'ปกติ'}</span>
              ${record.isOT ? '<span class="text-orange-600 text-xs">OT</span>' : ''}
            </div>
          </td>
          <td class="px-6 py-4 text-sm">${periodsHTML}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">${record.note || '-'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            ${actionButtons}
          </td>
        `;

        // Event listeners
        const editBtn = row.querySelector('.btn-edit');
        if (editBtn) {
          editBtn.onclick = () => openEditModal(record.id);
        
        const deleteBtn = row.querySelector('.btn-delete');
        if (deleteBtn) {
          deleteBtn.onclick = () => openDeleteConfirmation(record.id);
        
        const approveBtn = row.querySelector('.btn-approve');
        if (approveBtn) {
          approveBtn.onclick = () => openApprovalModal(record._id);
        
        }
        elements.attendanceTableBody.appendChild(row);
      });
    }

    function filterAndDisplayRecords() {
      elements.loadingIndicator.classList.remove('hidden');
      elements.attendanceTableBody.parentElement.parentElement.classList.add('hidden');
      elements.emptyState.classList.add('hidden');

      setTimeout(() => {
        const filteredData  = getFilteredData();
        const totalRecords  = filteredData.length;
        const totalPages    = Math.ceil(totalRecords / recordsPerPage);

        elements.recordCount.textContent       = totalRecords;
        elements.currentPage.textContent       = currentPage;
        elements.btnPrevPage.disabled          = currentPage <= 1;
        elements.btnNextPage.disabled          = currentPage >= totalPages;

        elements.loadingIndicator.classList.add('hidden');

        if (totalRecords === 0) {
          elements.attendanceTableBody.parentElement.parentElement.classList.add('hidden');
          elements.emptyState.classList.remove('hidden');
          return;
        
        }
        elements.attendanceTableBody.parentElement.parentElement.classList.remove('hidden');
        elements.emptyState.classList.add('hidden');

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex   = Math.min(startIndex + recordsPerPage, totalRecords);
        const pagedData  = filteredData.slice(startIndex, endIndex);

        renderAttendanceTable(pagedData);
        updateStatistics();
      }, 500);
    }

    function formatDate(dateString) {
      if (!dateString) return '-';

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', options);
    }

    function openAddModal() {
      elements.modalTitle.textContent    = 'เพิ่มการลงเวลา';
      elements.recordId.value            = '';
      elements.employeeSelect.value      = '';
      elements.attendanceDate.value      = currentFilterDateFrom || new Date().toISOString().split('T')[0];
      elements.note.value                = '';

      resetTimePeriodsForm();
      loadEmployeeOptions(); // โหลดรายการพนักงานตามสาขาที่เลือก
      ModalManager.open('attendance');
    }

    function openEditModal(id) {
      const record = window.attendanceData.find(rec => rec.id === id);
      if (!record) return;

      elements.modalTitle.textContent   = 'แก้ไขการลงเวลา';
      elements.recordId.value           = record.id;
      elements.employeeSelect.value     = record.employeeId;
      elements.attendanceDate.value     = record.date;
      elements.timePeriodsContainer.innerHTML = '';

      if (record.timePeriods && record.timePeriods.length > 0) {
        record.timePeriods.forEach(period => {
          let periodTitle, bgClass = '';
          let isOvertime = false;

          switch(period.type) {
            case 'morning':
              periodTitle = 'ช่วงเช้า';
              break;
            case 'afternoon':
              periodTitle = 'ช่วงบ่าย';
              break;
            case 'overtime':
              periodTitle = 'ชั่วโมงล่วงเวลา (OT)';
              bgClass     = 'bg-yellow-50 dark:bg-yellow-900/20';
              isOvertime  = true;
              break;
            case 'main':
              periodTitle = 'ทำงาน';
              break;
            default:
              periodTitle = 'ช่วงเวลาเพิ่มเติม';
          
        const periodHTML = `
            <div class="time-period-group ${isOvertime ? 'overtime-period' : ''} mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg ${bgClass}">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-700 dark:text-gray-300">${periodTitle}</h4>
                <div class="flex gap-2">
                  <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="period-enabled form-checkbox h-4 w-4 text-blue-600" checked>
                    <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">เปิดใช้งาน</span>
                  </label>
                  ${period.type !== 'morning' && period.type !== 'afternoon' && period.type !== 'overtime'
                    ? `<button type="button" class="text-red-500 btn-remove-period"><i class="bi bi-x-circle"></i></button>`
                    : ''}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาเข้า</label>
                  <input type="time" class="time-in w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         focus:outline-none focus:ring focus:border-blue-300" value="${period.timeIn}">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เวลาออก</label>
                  <input type="time" class="time-out w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         focus:outline-none focus:ring focus:border-blue-300" value="${period.timeOut}">
                </div>
              </div>
            </div>
          `;
          elements.timePeriodsContainer.insertAdjacentHTML('beforeend', periodHTML);
        });
      } else {
        resetTimePeriodsForm();
      }

      setupTimePeriodListeners();
      calculateTotalHours();

      elements.note.value = record.note || '';
      elements.attendanceModal.classList.remove('hidden');
    }

    function closeAttendanceModal() {
      ModalManager.close('attendance');
    }

    function openDeleteConfirmation(id) {
      currentDeleteId = id;
      elements.confirmModal.classList.remove('hidden');
    }

    function closeConfirmModal() {
      elements.confirmModal.classList.add('hidden');
      currentDeleteId = null;
    }

    async function confirmDelete() {
      if (!currentDeleteId) return;
      try {
        const res = await fetch(`${API_BASE}/${currentDeleteId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to delete with status ' + res.status }));
          throw new Error(errorData.error || 'Delete operation failed');
        const json = await res.json();
        if (json.success) {
          const deletedRecord = window.attendanceData.find(rec => rec.id === currentDeleteId);
          if (deletedRecord) {
            trackAttendanceHistory('delete', deletedRecord);
          
        }
          showAlert('ลบข้อมูลการลงเวลาเรียบร้อยแล้ว', 'success');
          closeConfirmModal();
          DataCache.invalidate('attendanceData');
          await loadAttendanceData(true);
        } else {
          throw new Error(json.error || 'Failed to delete record');
        }
      } catch (err) {
        console.error('Error deleting record:', err);
        showAlert(`เกิดข้อผิดพลาดในการลบ: ${err.message}`, 'error');
      }
    }

    async function handleFormSubmit(event) {
      event.preventDefault();
      const formData = collectFormData();

      let apiCheckInTime  = null;
      let apiCheckOutTime = null;

      for (const period of formData.timePeriods) {
        if (period.type !== 'overtime') {
          if (period.timeIn && (!apiCheckInTime || period.timeIn < apiCheckInTime)) {
            apiCheckInTime = period.timeIn;
          
        }
          if (period.timeOut && (!apiCheckOutTime || period.timeOut > apiCheckOutTime)) {
            apiCheckOutTime = period.timeOut;
          
        }
        }
      }

      if (!formData.date || !formData.employeeId) {
        showAlert('กรุณากรอกข้อมูลพนักงานและวันที่ให้ครบถ้วน', 'error');
        return;
      
        }
      if (!apiCheckInTime || !apiCheckOutTime) {
        const hasRegularPeriod = formData.timePeriods.some(
          p => p.type !== 'overtime' && p.timeIn && p.timeOut
        );
        if (!hasRegularPeriod) {
          showAlert('กรุณาระบุเวลาเข้าและออกงานปกติอย่างน้อยหนึ่งช่วง', 'error');
          return;
        
        }
      const payload = { note: formData.note || '' };
      if (apiCheckInTime) {
        payload.checkIn = `${formData.date}T${apiCheckInTime}:00`;
      }
      if (apiCheckOutTime) {
        payload.checkOut = `${formData.date}T${apiCheckOutTime}:00`;
      let method, url;
      if (formData.id) {
        method = 'PUT';
        url    = `${API_BASE}/${formData.id}`;
      } else {
        method = 'POST';
        url    = API_BASE;
        payload.user = formData.employeeId;
      }

      if (!payload.checkIn || !payload.checkOut) {
        showAlert('ไม่สามารถบันทึกได้: ข้อมูลเวลาเข้าหรือออกไม่สมบูรณ์', 'error');
        return;
      
        }
      try {
        const res = await fetch(url, {
          method,
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
          throw new Error(errorData.error || `${method} operation failed`);
        const json = await res.json();

        if (json.success) {
          const action = formData.id ? 'update' : 'create';
          trackAttendanceHistory(action, formData);
          showAlert(formData.id ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลใหม่สำเร็จ', 'success');
          closeAttendanceModal();
          DataCache.invalidate('attendanceData');
          await loadAttendanceData(true);
        } else {
          throw new Error(json.error || 'Operation failed with no specific error message');
        }
      } catch (err) {
        console.error(`Error ${method} record:`, err);
        showAlert(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
      }
    }

    async function loadAttendanceData(forceReload = false) {
      const cacheKey = `attendanceData_${currentTab}_${currentFilterDateFrom}_${currentFilterDateTo}`;
      
      // Check cache first unless forced reload
      if (!forceReload) {
        const cachedData = DataCache.get(cacheKey);
        if (cachedData) {
          attendanceData = cachedData;
          renderAttendanceTable();
          updateStatistics();
          debugLog('Using cached attendance data:', cachedData.length);
          return;
        
        }
      }

      if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.remove('hidden');
      
        }
      try {
        let url;
        if (currentTab === 'pending') {
          url = '/api/attendance/pending-approvals';
        } else {
          // Add date range parameters for better history tracking
          const params = new URLSearchParams();
          if (currentFilterDateFrom) params.append('from', currentFilterDateFrom);
          if (currentFilterDateTo) params.append('to', currentFilterDateTo);
          params.append('includeHistory', 'true'); // Request historical data
          
          url = `/api/attendance?${params.toString()}`;
        const response = await fetch(url, {
          headers: getHeaders()
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const json = await response.json();
        
        if (!json.success) throw new Error(json.error || 'API returned success:false');
        
        const list = Array.isArray(json.data || json.attendance) ? (json.data || json.attendance) : [];
        
        window.attendanceData = list.map(att => {
          const cin = new Date(att.checkIn);
          const cout = att.checkOut ? new Date(att.checkOut) : null;
          const checkInTime = cin.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
          const checkOutTime = cout
            ? cout.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})
            : '';

          const hours = cout ? (cout - cin)/3600000 : 0;
          const regular = Math.min(hours, 8).toFixed(1);
          const overtime = hours > 8 ? (hours - 8).toFixed(1) : '0.0';

          const emp = employees.find(e => e._id === att.user || e.id === att.user);
          
          // เพิ่มข้อมูลสำหรับระบบอนุมัติ
          const checkInTypeText = {
            'normal': 'ปกติ',
            'outside_area': 'นอกพื้นที่',
            'other_branch': 'ต่างสาขา'
          };
          
          const approvalStatusText = {
            'pending': 'รออนุมัติ',
            'approved': 'อนุมัติแล้ว',
            'rejected': 'ปฏิเสธ',
            'not_required': 'ไม่ต้องอนุมัติ'
          };
          
          return {
            _id: att._id,
            id: att._id,
            date: att.checkIn.slice(0, 10),
            employeeId: att.user?._id || att.user,
            employeeName: att.user?.username || emp?.name || 'Unknown',
            checkInType: att.checkInType || 'normal',
            checkInTypeText: checkInTypeText[att.checkInType] || att.checkInType,
            approvalStatus: att.approvalStatus || 'not_required',
            approvalStatusText: approvalStatusText[att.approvalStatus] || att.approvalStatus,
            isOT: att.isOT || false,
            timePeriods: [{
              type: 'main',
              timeIn: checkInTime,
              timeOut: checkOutTime,
              hours: hours.toFixed(1)
            }],
            totalRegularHours: regular,
            totalOvertimeHours: overtime,
            note: att.note || '',
            user: att.user,
            branch: att.branch,
            checkIn: att.checkIn,
            checkOut: att.checkOut
          };
        });
        
        // Cache the loaded data
        DataCache.set(cacheKey, window.attendanceData, 30000); // Cache for 30 seconds
        
        // Update pending count if viewing all records
        if (currentTab === 'all') {
          await loadPendingApprovals();
        
        }
      } catch (err) {
        debugError('Error loading attendance data:', err);
        window.attendanceData = [];
        showAlert(`ไม่สามารถโหลดข้อมูลได้: ${err.message}`, 'error');
      } finally {
        if (elements.loadingIndicator) {
          elements.loadingIndicator.classList.add('hidden');
        // Use performance queue for UI updates
        PerformanceUtils.scheduleUpdate(() => filterAndDisplayRecords());
      
        }
    }

    function showAlert(message, type = 'info') {
      let bgColor, textColor, icon;

      switch(type) {
        case 'success':
          bgColor   = 'bg-green-100 dark:bg-green-800';
          textColor = 'text-green-700 dark:text-green-200';
          icon      = '<i class="bi bi-check-circle mr-2"></i>';
          break;
        case 'error':
          bgColor   = 'bg-red-100 dark:bg-red-800';
          textColor = 'text-red-700 dark:text-red-200';
          icon      = '<i class="bi bi-exclamation-triangle mr-2"></i>';
          break;
        case 'warning':
          bgColor   = 'bg-yellow-100 dark:bg-yellow-800';
          textColor = 'text-yellow-700 dark:text-yellow-200';
          icon      = '<i class="bi bi-exclamation-circle mr-2"></i>';
          break;
        default:
          bgColor   = 'bg-blue-100 dark:bg-blue-800';
          textColor = 'text-blue-700 dark:text-blue-200';
          icon      = '<i class="bi bi-info-circle mr-2"></i>';
      }

      elements.alertMessage.className = `mb-4 p-4 rounded flex items-center ${bgColor} ${textColor}`;
      elements.alertMessage.innerHTML = `${icon}${message}`;
      elements.alertMessage.classList.remove('hidden');

      setTimeout(() => {
        elements.alertMessage.classList.add('hidden');
      }, 3000);
    }

    // ===== Schedule Types Management Functions =====
    async function initializeScheduleTypes() {
      try {
        const response = await fetch('/api/hr/schedule-types', {
          headers: getHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          scheduleTypes = data.data || data.scheduleTypes || [];
        } else {
          console.error('Failed to load schedule types from API');
          scheduleTypes = [];
          showAlert('ไม่สามารถโหลดประเภทตารางงานได้', 'error');
        }
      } catch (error) {
        console.error('Error loading schedule types:', error);
        scheduleTypes = [];
        showAlert('เกิดข้อผิดพลาดในการโหลดประเภทตารางงาน', 'error');
      }
      
      loadScheduleTypeOptions();
    }

    function loadScheduleTypeOptions() {
      const select = document.getElementById('calendarScheduleType');
      if (!select) return;
      
      select.innerHTML = '';
      scheduleTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        
        let timeText = '';
        if (type.workPeriods) {
          const p1 = type.workPeriods.period1;
          const p2 = type.workPeriods.period2;
          timeText = ` (${p1.start}-${p1.end} + ${p2.start}-${p2.end})`;
        } else if (timeText) {
            $2 = ` (${type.startTime}-${type.endTime})`;
        }
        
        option.textContent = `${type.name}${timeText}`;
        select.appendChild(option);
      });
    }

    function openScheduleTypesModal() {
      document.getElementById('scheduleTypesModal').classList.remove('hidden');
      renderScheduleTypesTable();
    }

    function closeScheduleTypesModal() {
      document.getElementById('scheduleTypesModal').classList.add('hidden');
    }

    function renderScheduleTypesTable() {
      const tbody = document.getElementById('scheduleTypesTableBody');
      if (!tbody) return;

      tbody.innerHTML = '';
      
      scheduleTypes.forEach(type => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-800';

        let timeDisplay = 'ไม่กำหนด';
        if (type.workPeriods) {
          const p1 = type.workPeriods.period1;
          const br = type.workPeriods.breakTime;
          const p2 = type.workPeriods.period2;
          timeDisplay = `${p1.start}-${p1.end}, พัก ${br.start}-${br.end}, ${p2.start}-${p2.end}`;
        } else if (timeDisplay) {
            $2 = `${type.startTime} - ${type.endTime}`;
        }
        
        // Calculate total hours
        let totalHours = 0;
        if (type.workPeriods) {
          const p1Hours = calculateTimeDifference(type.workPeriods.period1?.start, type.workPeriods.period1?.end);
          const p2Hours = calculateTimeDifference(type.workPeriods.period2?.start, type.workPeriods.period2?.end);
          totalHours = p1Hours + p2Hours;
        } else if (type.startTime && type.endTime) {
         
        totalHours = calculateTimeDifference(type.startTime,
        } type.endTime);
        
        const typeText = type.type === 'system' ? 'ระบบ' : 'กำหนดเอง';

        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${type.name}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${type.id}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${timeDisplay}</td>
          <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
            <span class="font-medium ${totalHours === 8 ? 'text-green-600 dark:text-green-400' : totalHours > 8 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}">${totalHours.toFixed(1)} ชม</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex items-center">
              <div class="color-indicator color-${type.color}"></div>
              <span class="capitalize">${type.color}</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="px-2 py-1 text-xs rounded-full ${type.type === 'system' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">${typeText}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
            ${type.type === 'custom' ? `
              <button class="btn-edit-schedule-type px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-1" data-id="${type.id}" title="แก้ไข">
              <i class="bi bi-pencil-square"></i>
            </button>
              <button class="btn-delete-schedule-type px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600" data-id="${type.id}" title="ลบ">
              <i class="bi bi-trash"></i>
            </button>
            ` : `
              <span class="text-gray-400 text-xs">ไม่สามารถแก้ไข</span>
            `}
          </td>
        `;

        tbody.appendChild(row);
      });

      // Add event listeners
      document.querySelectorAll('.btn-edit-schedule-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const typeId = e.currentTarget.dataset.id;
          openEditScheduleTypeModal(typeId);
        });
      });

      document.querySelectorAll('.btn-delete-schedule-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const typeId = e.currentTarget.dataset.id;
          deleteScheduleType(typeId);
        });
      });
    }

    async function handleAddScheduleTypeSubmit(event) {
      event.preventDefault();
      
      const formData = {
        id: document.getElementById('newScheduleTypeCode').value.toLowerCase().replace(/\s+/g, '_'),
        name: document.getElementById('newScheduleTypeName').value,
        workPeriods: {
          period1: {
            start: document.getElementById('newScheduleTypePeriod1Start').value,
            end: document.getElementById('newScheduleTypePeriod1End').value
          },
          breakTime: {
            start: document.getElementById('newScheduleTypeBreakStart').value,
            end: document.getElementById('newScheduleTypeBreakEnd').value
          },
          period2: {
            start: document.getElementById('newScheduleTypePeriod2Start').value,
            end: document.getElementById('newScheduleTypePeriod2End').value
          }
        },
        // Calculate overall start and end times
        startTime: document.getElementById('newScheduleTypePeriod1Start').value,
        endTime: document.getElementById('newScheduleTypePeriod2End').value,
        color: document.getElementById('newScheduleTypeColor').value,
        type: 'custom',
        isDefault: false
      };
      
      // Check if ID already exists
      if (scheduleTypes.some(type => type.id === formData.id)) {
        showAlert('รหัสประเภทตารางนี้มีอยู่แล้ว', 'error');
        return;
      
        }
      // Send to API
      try {
        const response = await fetch('/api/hr/schedule-types', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        // Reload schedule types from API
        await initializeScheduleTypes();
        renderScheduleTypesTable();
        
        // Reset form
        document.getElementById('addScheduleTypeForm').reset();
        
        showAlert('เพิ่มประเภทตารางใหม่เรียบร้อย', 'success');
      } catch (error) {
        console.error('Error adding schedule type:', error);
        showAlert('ไม่สามารถเพิ่มประเภทตารางได้', 'error');
      }
    }

    function openEditScheduleTypeModal(typeId) {
      const type = scheduleTypes.find(t => t.id === typeId);
      if (!type) return;
      
      currentEditingScheduleType = type;
      
      document.getElementById('editScheduleTypeId').value = type.id;
      document.getElementById('editScheduleTypeName').value = type.name;
      document.getElementById('editScheduleTypeCode').value = type.id;
      document.getElementById('editScheduleTypeColor').value = type.color;
      
      // Populate work periods if available
      if (type.workPeriods) {
        document.getElementById('editScheduleTypePeriod1Start').value = type.workPeriods.period1?.start || '';
        document.getElementById('editScheduleTypePeriod1End').value = type.workPeriods.period1?.end || '';
        document.getElementById('editScheduleTypeBreakStart').value = type.workPeriods.breakTime?.start || '';
        document.getElementById('editScheduleTypeBreakEnd').value = type.workPeriods.breakTime?.end || '';
        document.getElementById('editScheduleTypePeriod2Start').value = type.workPeriods.period2?.start || '';
        document.getElementById('editScheduleTypePeriod2End').value = type.workPeriods.period2?.end || '';
      } else {
        // Fallback for old format - split the day into periods
        const startTime = type.startTime || '08:00';
        const endTime = type.endTime || '17:00';
        
        // Auto-calculate periods (4h + 1h break + 4h)
        const start = new Date(`2000-01-01 ${startTime}`);
        const period1End = new Date(start.getTime() + 4 * 60 * 60 * 1000); // +4 hours
        const breakEnd = new Date(period1End.getTime() + 1 * 60 * 60 * 1000); // +1 hour
        const period2End = new Date(breakEnd.getTime() + 4 * 60 * 60 * 1000); // +4 hours
        
        document.getElementById('editScheduleTypePeriod1Start').value = startTime;
        document.getElementById('editScheduleTypePeriod1End').value = period1End.toTimeString().slice(0, 5);
        document.getElementById('editScheduleTypeBreakStart').value = period1End.toTimeString().slice(0, 5);
        document.getElementById('editScheduleTypeBreakEnd').value = breakEnd.toTimeString().slice(0, 5);
        document.getElementById('editScheduleTypePeriod2Start').value = breakEnd.toTimeString().slice(0, 5);
        document.getElementById('editScheduleTypePeriod2End').value = endTime;
      }
      
      document.getElementById('editScheduleTypeModal').classList.remove('hidden');
      
      // Calculate work hours after populating fields
      setTimeout(() => calculateWorkHours('edit'), 100);
    }

    function closeEditScheduleTypeModal() {
      document.getElementById('editScheduleTypeModal').classList.add('hidden');
      currentEditingScheduleType = null;
    }

    async function handleEditScheduleTypeSubmit(event) {
      event.preventDefault();
      
      if (!currentEditingScheduleType) return;
      
      const newId = document.getElementById('editScheduleTypeCode').value.toLowerCase().replace(/\s+/g, '_');
      
      // Check if new ID conflicts with existing (except current)
      if (newId !== currentEditingScheduleType.id && scheduleTypes.some(type => type.id === newId)) {
        showAlert('รหัสประเภทตารางนี้มีอยู่แล้ว', 'error');
        return;
      
        }
      // Update the schedule type
      const oldId = currentEditingScheduleType.id;
      currentEditingScheduleType.id = newId;
      currentEditingScheduleType.name = document.getElementById('editScheduleTypeName').value;
      currentEditingScheduleType.startTime = document.getElementById('editScheduleTypeStartTime').value;
      currentEditingScheduleType.endTime = document.getElementById('editScheduleTypeEndTime').value;
      currentEditingScheduleType.color = document.getElementById('editScheduleTypeColor').value;
      
      // Send update to API
      try {
        const updateData = {
          id: newId,
          name: document.getElementById('editScheduleTypeName').value,
          workPeriods: {
            period1: {
              start: document.getElementById('editScheduleTypePeriod1Start').value,
              end: document.getElementById('editScheduleTypePeriod1End').value
            },
            breakTime: {
              start: document.getElementById('editScheduleTypeBreakStart').value,
              end: document.getElementById('editScheduleTypeBreakEnd').value
            },
            period2: {
              start: document.getElementById('editScheduleTypePeriod2Start').value,
              end: document.getElementById('editScheduleTypePeriod2End').value
            }
          },
          // Calculate overall start and end times
          startTime: document.getElementById('editScheduleTypePeriod1Start').value,
          endTime: document.getElementById('editScheduleTypePeriod2End').value,
          color: document.getElementById('editScheduleTypeColor').value
        };
        
        const response = await fetch(`/api/hr/schedule-types/${oldId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        // Reload schedule types from API
        await initializeScheduleTypes();
        renderScheduleTypesTable();
        updateCalendarDisplay();
        
        closeEditScheduleTypeModal();
        showAlert('แก้ไขประเภทตารางเรียบร้อย', 'success');
      } catch (error) {
        console.error('Error updating schedule type:', error);
        showAlert('ไม่สามารถแก้ไขประเภทตารางได้', 'error');
      }
    }

    async function deleteScheduleType(typeId) {
      const type = scheduleTypes.find(t => t.id === typeId);
      if (!type || type.type === 'system') return;
      
      if (!confirm(`คุณต้องการลบประเภทตาราง "${type.name}" ใช่หรือไม่?`)) return;
      
      try {
        const response = await fetch(`/api/hr/schedule-types/${typeId}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        // Reload schedule types from API
        await initializeScheduleTypes();
        renderScheduleTypesTable();
        updateCalendarDisplay();
        
        showAlert('ลบประเภทตารางเรียบร้อย', 'success');
      } catch (error) {
        console.error('Error deleting schedule type:', error);
        showAlert('ไม่สามารถลบประเภทตารางได้', 'error');
      }
    }

    function getScheduleTypeById(typeId) {
      return scheduleTypes.find(type => type.id === typeId) || scheduleTypes[0]; // fallback to first type
    }

    function calculateWorkHours(mode) {
      const prefix = mode === 'new' ? 'new' : 'edit';
      
      // Get time inputs
      const period1Start = document.getElementById(`${prefix}ScheduleTypePeriod1Start`).value;
      const period1End = document.getElementById(`${prefix}ScheduleTypePeriod1End`).value;
      const breakStart = document.getElementById(`${prefix}ScheduleTypeBreakStart`).value;
      const breakEnd = document.getElementById(`${prefix}ScheduleTypeBreakEnd`).value;
      const period2Start = document.getElementById(`${prefix}ScheduleTypePeriod2Start`).value;
      const period2End = document.getElementById(`${prefix}ScheduleTypePeriod2End`).value;
      
      // Calculate hours for each period
      let period1Hours = 0;
      let period2Hours = 0;
      let breakHours = 0;
      
      if (period1Start && period1End) {
        period1Hours = calculateTimeDifference(period1Start, period1End);
      
        }
      if (period2Start && period2End) {
        period2Hours = calculateTimeDifference(period2Start, period2End);
      
        }
      if (breakStart && breakEnd) {
        breakHours = calculateTimeDifference(breakStart, breakEnd);
      
        const totalHours = period1Hours + period2Hours;
      
      // Update display
      const period1Display = document.getElementById(`${prefix}Period1Hours`);
      const period2Display = document.getElementById(`${prefix}Period2Hours`);
      const breakDisplay = document.getElementById(`${prefix}BreakHours`);
      const totalDisplay = document.getElementById(`${prefix}TotalHours`);
      
      if (period1Display) period1Display.textContent = `${period1Hours.toFixed(1)} ชม`;
      if (period2Display) period2Display.textContent = `${period2Hours.toFixed(1)} ชม`;
      if (breakDisplay) breakDisplay.textContent = `${breakHours.toFixed(1)} ชม`;
      if (totalDisplay) totalDisplay.textContent = `${totalHours.toFixed(1)} ชม`;
      
      // Add validation warnings
      validateWorkHours(mode, period1Hours, period2Hours, breakHours, totalHours);
    }
    
    // ===== PERFORMANCE OPTIMIZATION =====
    // Browser environment compatibility (using isDebugMode from head section)
    
    // Fix process object for browser environment
    if (typeof process === 'undefined') {
      window.process = { env: { NODE_ENV: isDebugMode() ? 'development' : 'production' } };
    }

    // Performance monitoring
    const Performance = {
      timers: new Map(),
      
      start(label) {
        if (isDebugMode()) this.timers.set(label, performance.now());
      },
      
      end(label) {
        if (isDebugMode() && this.timers.has(label)) {
          const time = performance.now() - this.timers.get(label);
          debugLog(`⏱️ ${label}: ${time.toFixed(2)}ms`);
          this.timers.delete(label);
        }
      },

      measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
      },

      async measureAsync(label, fn) {
        this.start(label);
        const result = await fn();
        this.end(label);
        return result;
      }
    };

    // Debounce function for performance
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Throttle function for performance
    function throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
      };
    }

    // ===== UTILITY FUNCTIONS =====
    const TimeUtils = {
      // Calculate time difference between two time strings (HH:MM format)
      calculateTimeDifference(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const start = new Date(`2000-01-01 ${startTime}`);
        let end = new Date(`2000-01-01 ${endTime}`);
        
        // Handle overnight shifts
        if (end <= start) {
          end = new Date(`2000-01-02 ${endTime}`);
        const diffMs = end - start;
        return diffMs / (1000 * 60 * 60); // Convert to hours
      },

      // Calculate total minutes from time string
      timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hour, minute] = timeStr.split(':').map(Number);
        return (hour * 60) + minute;
      },

      // Calculate time difference using minutes (handles overnight)
      calculateMinuteDifference(timeIn, timeOut) {
        if (!timeIn || !timeOut) return 0;
        
        const inMinutes = this.timeToMinutes(timeIn);
        const outMinutes = this.timeToMinutes(timeOut);
        
        let totalMinutes = outMinutes - inMinutes;
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
        
        return totalMinutes;
      
        }},

      // Format hours to display string
      formatHours(hours, unit = 'ชม') {
        return `${hours.toFixed(1)} ${unit}`;
      },

      // Calculate work hours with break time
      calculateWorkHoursWithBreak(startTime, endTime, breakStart, breakEnd) {
        const totalHours = this.calculateTimeDifference(startTime, endTime);
        const breakHours = breakStart && breakEnd ? this.calculateTimeDifference(breakStart, breakEnd) : 0;
        return Math.max(0, totalHours - breakHours);
      },

      // Parse time string to Date object
      parseTime(timeStr) {
        if (!timeStr) return null;
        const [hour, minute] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
      },

      // Calculate distance between two GPS coordinates (Haversine formula)
      calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180; // φ, λ in radians
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distance = R * c; // in metres
        return distance;
      
        }
    }

    // Legacy function for backward compatibility
    function calculateTimeDifference(startTime, endTime) {
      return TimeUtils.calculateTimeDifference(startTime, endTime);
    }

    // ===== MODAL MANAGER =====
    const ModalManager = {
      modals: {
        attendance: 'attendanceModal',
        approval: 'approvalModal', 
        confirm: 'confirmModal',
        calendarSchedule: 'calendarScheduleModal',
        scheduleTypes: 'scheduleTypesModal',
        editScheduleType: 'editScheduleTypeModal'
      },

      open(modalName, data = null) {
        const modalId = this.modals[modalName];
        if (!modalId) {
          console.error(`Modal ${modalName} not found`);
          return;
        const modal = document.getElementById(modalId);
        if (!modal) {
          console.error(`Modal element ${modalId} not found`);
          return;
        }

        // Call specific setup function if exists
        const setupFunction = `setup${this.capitalize(modalName)}Modal`;
        if (typeof window[setupFunction] === 'function') {
          window[setupFunction](data);
        
        }
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
      },

      close(modalName) {
        const modalId = this.modals[modalName];
        if (!modalId) {
          console.error(`Modal ${modalName} not found`);
          return;
        const modal = document.getElementById(modalId);
        if (!modal) {
          console.error(`Modal element ${modalId} not found`);
          return;
        }

        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling

        // Call cleanup function if exists
        const cleanupFunction = `cleanup${this.capitalize(modalName)}Modal`;
        if (typeof window[cleanupFunction] === 'function') {
          window[cleanupFunction]();
        
        }
      },

      toggle(modalName, data = null) {
        const modalId = this.modals[modalName];
        const modal = document.getElementById(modalId);
        
        if (modal && modal.classList.contains('hidden')) {
          this.open(modalName, data);
        } else {
          this.close(modalName);
        }
      },

      closeAll() {
        Object.keys(this.modals).forEach(modalName => {
          const modal = document.getElementById(this.modals[modalName]);
          if (modal && !modal.classList.contains('hidden')) {
            this.close(modalName);
          
        }
        });
      },

      capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
    };

    // Setup event listeners for all modal close buttons
    document.addEventListener('DOMContentLoaded', function() {
      // Generic close button handler
      document.addEventListener('click', function(e) {
        if (e.target.matches('[data-modal-close]')) {
          const modalName = e.target.getAttribute('data-modal-close');
          ModalManager.close(modalName);
        
        }
      });

      // Close modal when clicking outside
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
          const modal = e.target;
          const modalName = Object.keys(ModalManager.modals).find(name => 
            ModalManager.modals[name] === modal.id
          );
          if (modalName) {
            ModalManager.close(modalName);
          
        }
        }
      });
    });

    // ===== API CLIENT =====
    const APIClient = {
      baseURL: '/api',
      
      async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
          headers: {
            'Content-Type': 'application/json',
            ...getHeaders(),
            ...options.headers
          },
          ...options
        };

        try {
          const response = await fetch(url, config);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          const data = await response.json();
          return data;
        } catch (error) {
          console.error(`API Error [${config.method || 'GET'} ${url}]:`, error);
          showAlert(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
          throw error;
        }
      },

      // HTTP Methods
      async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
      },

      async post(endpoint, data = {}) {
        return this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },

      async put(endpoint, data = {}) {
        return this.request(endpoint, {
          method: 'PUT', 
          body: JSON.stringify(data)
        });
      },

      async patch(endpoint, data = {}) {
        return this.request(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      },

      async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
      },

      // Specific API endpoints
      attendance: {
        getAll: (params = {}) => APIClient.get('/attendance', params),
        getById: (id) => APIClient.get(`/attendance/${id}`),
        create: (data) => APIClient.post('/attendance', data),
        update: (id, data) => APIClient.put(`/attendance/${id}`, data),
        delete: (id) => APIClient.delete(`/attendance/${id}`),
        approve: (id) => APIClient.patch(`/attendance/${id}/approve`),
        reject: (id) => APIClient.patch(`/attendance/${id}/reject`),
        getPendingApprovals: () => APIClient.get('/attendance/pending-approvals'),
        getBranches: () => APIClient.get('/attendance/branches/my-accessible'),
        getHistory: (data) => APIClient.post('/attendance/history', data)
      },

      users: {
        getMe: () => APIClient.get('/users/me'),
        getAll: () => APIClient.get('/users')
      },

      hr: {
        getScheduleTypes: () => APIClient.get('/hr/schedule-types'),
        createScheduleType: (data) => APIClient.post('/hr/schedule-types', data),
        updateScheduleType: (id, data) => APIClient.put(`/hr/schedule-types/${id}`, data),
        deleteScheduleType: (id) => APIClient.delete(`/hr/schedule-types/${id}`)
      },

      workSchedules: {
        getAll: (params = {}) => APIClient.get('/attendance/work-schedules', params),
        create: (data) => APIClient.post('/attendance/work-schedules', data),
        update: (id, data) => APIClient.put(`/attendance/work-schedules/${id}`, data),
        delete: (id) => APIClient.delete(`/attendance/work-schedules/${id}`),
        checkConflicts: (data) => APIClient.post('/attendance/work-schedules/check-conflicts', data)
      }
    };

    // ===== DATA LOADER =====
    const DataLoader = {
      cache: new Map(),
      
      async loadWithCache(key, loaderFunction, ttl = 300000) { // 5 minutes default TTL
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < ttl) {
          return cached.data;
        
        }
        try {
          const data = await loaderFunction();
          this.cache.set(key, {
            data,
            timestamp: Date.now()
          });
          return data;
        } catch (error) {
          console.error(`Error loading ${key}:`, error);
          throw error;
        }
      },

      clearCache(key = null) {
        if (key) {
          this.cache.delete(key);
        } else {
          this.cache.clear();
        }
      },

      async loadEmployees() {
        return this.loadWithCache('employees', async () => {
          const data = await APIClient.users.getAll();
          return data.users || data;
        });
      },

      async loadBranches() {
        return this.loadWithCache('branches', async () => {
          const data = await APIClient.attendance.getBranches();
          return data.branches || data;
        });
      },

      async loadAttendanceData(params = {}) {
        const cacheKey = `attendance_${JSON.stringify(params)}`;
        return this.loadWithCache(cacheKey, async () => {
          return await APIClient.attendance.getAll(params);
        }, 60000); // 1 minute TTL for attendance data
      },

      async loadScheduleTypes() {
        return this.loadWithCache('scheduleTypes', async () => {
          const data = await APIClient.hr.getScheduleTypes();
          return data.scheduleTypes || data;
        });
      },

      async loadWorkSchedules(params = {}) {
        const cacheKey = `workSchedules_${JSON.stringify(params)}`;
        return this.loadWithCache(cacheKey, async () => {
          console.log('Loading all work schedules with params:', params);
          const response = await fetch(`/api/hr/work-schedules?${new URLSearchParams(params)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to load work schedules: ${response.statusText}`);
          const data = await response.json();
          console.log('All work schedules loaded:', data);
          return data.data || [];
        }, 60000);
      },

      // โหลดตารางงานตามสาขาของพนักงาน
      async loadWorkSchedulesByBranch(branchId, userId = null) {
        const params = { branchId };
        if (userId) params.userId = userId;
        
        const cacheKey = `workSchedules_branch_${branchId}_${userId || 'all'}`;
        return this.loadWithCache(cacheKey, async () => {
          debugLog('Loading work schedules for branch:', branchId, 'user:', userId);
          console.log('API URL:', `/api/hr/work-schedules?${new URLSearchParams(params)}`);
          const response = await fetch(`/api/hr/work-schedules?${new URLSearchParams(params)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('API Response status:', response.status);
          
          if (!response.ok) {
            console.error('API Response error:', response.statusText);
            throw new Error(`Failed to load work schedules: ${response.statusText}`);
          const data = await response.json();
          console.log('API Response data:', data);
          debugLog('Work schedules loaded:', data);
          return data.data || [];
        }, 60000);
      },

      // โหลดตารางงานปัจจุบันของพนักงาน
      async loadCurrentUserSchedule(branchId = null) {
        const params = {};
        if (branchId) params.branchId = branchId;
        
        const cacheKey = `currentSchedule_${branchId || 'default'}`;
        return this.loadWithCache(cacheKey, async () => {
          debugLog('Loading current user schedule for branch:', branchId);
          const response = await fetch(`/api/hr/work-schedules/my/current?${new URLSearchParams(params)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to load current schedule: ${response.statusText}`);
          const data = await response.json();
          debugLog('Current schedule loaded:', data);
          return data.data;
        }, 300000); // 5 minutes TTL
      },

      async loadPendingApprovals() {
        return this.loadWithCache('pendingApprovals', async () => {
          const data = await APIClient.attendance.getPendingApprovals();
          return data.pendingApprovals || data;
        }, 30000); // 30 seconds TTL for approvals
      },

      async loadAll() {
        const [employees, branches, scheduleTypes] = await Promise.all([
          this.loadEmployees().catch(e => { console.warn('Failed to load employees:', e); return []; }),
          this.loadBranches().catch(e => { console.warn('Failed to load branches:', e); return []; }),
          this.loadScheduleTypes().catch(e => { console.warn('Failed to load schedule types:', e); return []; })
        ]);

        return { employees, branches, scheduleTypes };
      },

      // Event-driven cache invalidation
      invalidateRelated(type) {
        switch(type) {
          case 'attendance':
            this.clearCache('attendance');
            this.cache.forEach((value, key) => {
              if (key.startsWith('attendance_')) {
                this.clearCache(key);
            });
            break;
          case 'schedule':
            this.clearCache('workSchedules');
            this.cache.forEach((value, key) => {
              if (key.startsWith('workSchedules_')) {
                this.clearCache(key);
            });
            break;
          case 'employee':
            this.clearCache('employees');
            break;
          case 'branch':
            this.clearCache('branches');
            break;
        }
      }
    };

    // ===== VIEW MANAGER =====
    const ViewManager = {
      currentView: 'calendar',
      
      async refreshCalendarView() {
        try {
          updateCalendarDisplay();
          await this.refreshCalendarSummary();
        } catch (error) {
          console.error('Error refreshing calendar view:', error);
      },

      async refreshCalendarSummary() {
        try {
          const year = parseInt(document.getElementById('currentYear')?.textContent) || new Date().getFullYear();
          const month = parseInt(document.getElementById('currentMonth')?.getAttribute('data-month')) || new Date().getMonth();
          
          if (selectedBranchId) {
            await updateBranchSummary(year, month);
          } else {
            await updateOverallSummary(year, month);
        } catch (error) {
          console.error('Error refreshing calendar summary:', error);
      },

      async refreshTableView() {
        try {
          DataCache.invalidate('attendanceData');
          await loadAttendanceData(true);
          filterAndDisplayRecords();
        } catch (error) {
          console.error('Error refreshing table view:', error);
      },

      async refreshCurrentView() {
        if (this.currentView === 'calendar') {
          await this.refreshCalendarView();
        } else {
          await this.refreshTableView();
      },

      async switchToCalendarView() {
        this.currentView = 'calendar';
        const tableView = document.getElementById('tableView');
        const calendarView = document.getElementById('calendarView');
        
        if (tableView) tableView.style.display = 'none';
        if (calendarView) calendarView.style.display = 'block';
        
        // Update tab states
        const calendarTab = document.getElementById('calendarTab');
        const tableTab = document.getElementById('tableTab');
        if (calendarTab) calendarTab.classList.add('border-blue-500', 'text-blue-600');
        if (tableTab) tableTab.classList.remove('border-blue-500', 'text-blue-600');
        
        await this.refreshCalendarView();
      },

      async switchToTableView() {
        this.currentView = 'table';
        const tableView = document.getElementById('tableView');
        const calendarView = document.getElementById('calendarView');
        
        if (tableView) tableView.style.display = 'block';
        if (calendarView) calendarView.style.display = 'none';
        
        // Update tab states
        const calendarTab = document.getElementById('calendarTab');
        const tableTab = document.getElementById('tableTab');
        if (tableTab) tableTab.classList.add('border-blue-500', 'text-blue-600');
        if (calendarTab) calendarTab.classList.remove('border-blue-500', 'text-blue-600');
        
        await this.refreshTableView();
      
        }},

      updateDateDisplay(fromDate, toDate) {
        const dateRangeDisplay = document.getElementById('dateRangeDisplay');
        if (dateRangeDisplay) {
          if (fromDate === toDate) {
            dateRangeDisplay.textContent = formatDate(fromDate);
          } else {
            dateRangeDisplay.textContent = `${formatDate(fromDate)} - ${formatDate(toDate)}`;
          }
        }
      },

      updateStatistics(data = {}) {
        const stats = {
          totalEmployees: data.totalEmployees || 0,
          presentToday: data.presentToday || 0,
          lateToday: data.lateToday || 0,
          absentToday: data.absentToday || 0
        };

        Object.keys(stats).forEach(key => {
          const element = document.getElementById(key);
          if (element) {
            element.textContent = stats[key];
          
        }
        });
      }
    };
    
    function validateWorkHours(mode, period1Hours, period2Hours, breakHours, totalHours) {
      const prefix = mode === 'new' ? 'new' : 'edit';
      
      // Remove existing warnings
      const existingWarnings = document.querySelectorAll(`.${prefix}-work-hours-warning`);
      existingWarnings.forEach(warning => warning.remove());
      
      const summaryDiv = document.getElementById(`${prefix}Period1Hours`).closest('.bg-blue-50, .bg-blue-900\\/20');
      
      let warnings = [];
      
      // Check if periods are approximately 4 hours each
      if (period1Hours > 0 && Math.abs(period1Hours - 4) > 0.5) {
        warnings.push(`ช่วงที่ 1 ควรเป็น 4 ชั่วโมง (ปัจจุบัน ${period1Hours.toFixed(1)} ชม)`);
      }
      
      if (period2Hours > 0 && Math.abs(period2Hours - 4) > 0.5) {
        warnings.push(`ช่วงที่ 2 ควรเป็น 4 ชั่วโมง (ปัจจุบัน ${period2Hours.toFixed(1)} ชม)`);
      }
      
      // Check if break is approximately 1 hour
      if (breakHours > 0 && Math.abs(breakHours - 1) > 0.25) {
        warnings.push(`เวลาพักควรเป็น 1 ชั่วโมง (ปัจจุบัน ${breakHours.toFixed(1)} ชม)`);
      }
      
      // Check total hours
      if (totalHours > 12) {
        warnings.push(`ชั่วโมงทำงานรวมสูงเกินไป (${totalHours.toFixed(1)} ชม)`);
      } else if (totalHours > 0 && totalHours < 6) {
       
        } warnings.push(`ชั่วโมงทำงานรวมน้อยเกินไป (${totalHours.toFixed(1)} ชม)`);
      }
      
      // Display warnings
      if (warnings.length > 0 && summaryDiv) {
        const warningDiv = document.createElement('div');
        warningDiv.className = `mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs ${prefix}-work-hours-warning`;
        warningDiv.innerHTML = `
          <div class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⚠️ คำแนะนำ:</div>
          ${warnings.map(warning => `<div class="text-yellow-700 dark:text-yellow-300">• ${warning}</div>`).join('')}
        `;
        summaryDiv.appendChild(warningDiv);
      }
    }

    // ===== Calendar Schedule Management Functions =====
    
    // Load all work schedules for a specific date range
    async function loadWorkSchedules(fromDate, toDate, userId = null) {
      try {
        let url = `/api/attendance/work-schedules?`;
        if (fromDate) url += `from=${fromDate}&`;
        if (toDate) url += `to=${toDate}&`;
        if (userId) url += `userId=${userId}&`;
        
        const response = await fetch(url, {
          headers: getHeaders()
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error loading work schedules:', error);
        showAlert('ไม่สามารถโหลดข้อมูลตารางงานได้', 'error');
        return [];
      }
    }
    
    async function loadScheduleData(forceReload = false) {
      try {
        const cacheKey = `scheduleData_${selectedBranchId || 'all'}_${currentCalendarEmployeeFilter || 'all'}`;
        
        // Check cache first unless forced reload
        if (!forceReload) {
          const cachedData = DataCache.get(cacheKey);
          if (cachedData) {
            scheduleData = cachedData;
            debugLog('Using cached schedule data:', cachedData.length);
            return;
          
        }
        }
        
        debugLog('Loading schedule data for branch:', selectedBranchId);
        
        // ถ้าไม่มีการเลือกสาขา ให้โหลดตารางงานปัจจุบันของ user
        if (!selectedBranchId) {
          console.log('No branch selected, loading current user schedule...');
          try {
            const currentSchedule = await DataLoader.loadCurrentUserSchedule();
            console.log('Current user schedule result:', currentSchedule);
            if (currentSchedule && currentSchedule.branch) {
              selectedBranchId = currentSchedule.branch._id;
              console.log('Auto-selected branch from current schedule:', selectedBranchId);
              debugLog('Auto-selected branch from current schedule:', selectedBranchId);
            } else {
              console.log('No current schedule or branch found, will load all schedules...');
          } catch (error) {
            console.error('Error loading current user schedule:', error);
            console.log('Will proceed to load all schedules as fallback...');
        }
        
        // โหลดตารางงานตามสาขาที่เลือก หรือโหลดทั้งหมดถ้าไม่มีสาขา
        if (selectedBranchId) {
                
        }
          // ถ้าเลือกพนักงานเฉพาะคน ให้กรองตามพนักงาน
          const userId = currentCalendarEmployeeFilter || null;
          console.log('Loading schedules with params:', { selectedBranchId, userId });
          scheduleData = await DataLoader.loadWorkSchedulesByBranch(selectedBranchId, userId);
          console.log('Raw scheduleData from API (by branch):', scheduleData);
          debugLog('Loaded schedules for branch:', scheduleData);
          debugLog('Schedule data sample:', scheduleData?.slice(0, 2));
        } else {
          // Fallback: โหลดตารางงานทั้งหมดถ้าไม่มีสาขา
          console.log('Loading all work schedules as fallback...');
          try {
            scheduleData = await DataLoader.loadWorkSchedules();
            console.log('Raw scheduleData from API (all):', scheduleData);
            console.log('Schedule count:', scheduleData?.length);
            debugLog('Loaded all schedules as fallback:', scheduleData);
          } catch (error) {
            console.error('Error loading all schedules:', error);
            scheduleData = [];
          }
        }
          
          // Additional debug for specific dates
          if (scheduleData && scheduleData.length > 0) {
            scheduleData.forEach((schedule, index) => {
              if (schedule.shiftSchedule?.assignedShifts) {
                schedule.shiftSchedule.assignedShifts.forEach(shift => {
                  const shiftDate = new Date(shift.date).toISOString().split('T')[0];
                  if (shiftDate === '2025-09-12' || shiftDate === '2025-09-13') {
                    console.log(`Found shift for ${shiftDate}:`, {
                      scheduleIndex: index,
                      employee: schedule.user?.username,
                      shift: shift
                    });
                  }
                });
              }
            });
          }
        
        // Cache the loaded data
        DataCache.set(cacheKey, scheduleData, 60000); // Cache for 1 minute
        
        // Update UI using performance queue
        PerformanceUtils.scheduleUpdate(() => updateCalendarDisplay());
        PerformanceUtils.scheduleUpdate(() => updateCalendarSummary());
      } catch (error) {
        debugError('Error loading schedule data:', error);
        scheduleData = [];
        showAlert('ไม่สามารถโหลดข้อมูลตารางงานได้', 'error');
        PerformanceUtils.scheduleUpdate(() => updateCalendarDisplay());
        PerformanceUtils.scheduleUpdate(() => updateCalendarSummary());
      }
    }


    function getScheduleStartTime(type) {
      const scheduleType = getScheduleTypeById(type);
      return scheduleType ? scheduleType.startTime : '08:00';
    }

    function getScheduleEndTime(type) {
      const scheduleType = getScheduleTypeById(type);
      return scheduleType ? scheduleType.endTime : '17:00';
    }

    function isDateInSchedule(dateString, schedule) {
      return schedule.date === dateString;
    }

    function getScheduleTimeDisplay(schedule) {
      if (schedule.type === 'holiday') return 'วันหยุด';
      
      const scheduleType = getScheduleTypeById(schedule.type);
      if (scheduleType && scheduleType.workPeriods) {
        const p1 = scheduleType.workPeriods.period1;
        const p2 = scheduleType.workPeriods.period2;
        return `${p1.start}-${p1.end}+${p2.start}-${p2.end}`;
      }
      
      if (!schedule.startTime || !schedule.endTime) return '';
      return `${schedule.startTime}-${schedule.endTime}`;
    }

    function openCalendarScheduleModal(dateString, schedule = null) {
      debugLog('Opening calendar schedule modal for date:', dateString);
      debugLog('Available employees:', employees.length);
      debugLog('Modal element:', elements.calendarScheduleModal);
      debugLog('Form element:', elements.calendarScheduleForm);
      
      // Check if date is more than 1 month in advance
      const selectedDate = new Date(dateString);
      const today = new Date();
      const oneMonthFromNow = new Date(today);
      oneMonthFromNow.setMonth(today.getMonth() + 1);
      
      if (selectedDate > oneMonthFromNow) {
        showAlert('ไม่สามารถจัดการตารางงานล่วงหน้าเกิน 1 เดือนได้', 'warning');
        return;
      
        }
      // ตรวจสอบว่ามีข้อมูลพนักงานหรือไม่
      if (employees.length === 0) {
        console.warn('No employees available, reloading...');
        loadEmployees().then(() => {
          if (employees.length === 0) {
            showAlert('ไม่พบข้อมูลพนักงาน กรุณาลองใหม่อีกครั้ง', 'error');
            return;
          
        }
          // เรียกฟังก์ชันนี้อีกครั้งหลังจากโหลดข้อมูลเสร็จ
          openCalendarScheduleModal(dateString, schedule);
        });
        return;
      }
      
      currentSelectedDate = dateString;
      currentEditingSchedule = schedule;
      
      // Set date display
      const displayDate = new Date(dateString).toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      elements.selectedDateDisplay.textContent = displayDate;
      elements.calendarScheduleDate.value = dateString;
      
      if (schedule) {
        // Edit mode
        elements.calendarScheduleId.value = schedule.id;
        elements.calendarScheduleEmployee.value = schedule.employeeId;
        elements.calendarScheduleType.value = schedule.type;
        elements.customStartTime.value = schedule.startTime || '';
        elements.customEndTime.value = schedule.endTime || '';
        elements.breakDuration.value = schedule.breakDuration || 60;
        elements.allowOT.checked = schedule.allowOT || false;
        elements.isHoliday.checked = schedule.isHoliday || false;
        elements.requireApproval.checked = schedule.requireApproval || false;
        elements.calendarScheduleNotes.value = schedule.notes || '';
        elements.btnDeleteCalendarSchedule.classList.remove('hidden');
        
        if (schedule.type === 'custom') {
          elements.customTimeSettings.classList.remove('hidden');
        
        }
      } else {
        // Add mode
        resetScheduleForm();
        elements.btnDeleteCalendarSchedule.classList.add('hidden');
      }
      
      elements.calendarScheduleModal.classList.remove('hidden');
    }

    function closeCalendarScheduleModal() {
      elements.calendarScheduleModal.classList.add('hidden');
      currentSelectedDate = null;
      currentEditingSchedule = null;
    }

    function resetScheduleForm() {
      elements.calendarScheduleForm.reset();
      elements.calendarScheduleId.value = '';
      elements.customTimeSettings.classList.add('hidden');
      elements.multipleDaysSettings.classList.add('hidden');
      elements.applyToMultipleDays.checked = false;
      elements.breakDuration.value = 60;
    }

    function handleScheduleTypeChange() {
      const scheduleTypeId = elements.calendarScheduleType.value;
      const scheduleType = getScheduleTypeById(scheduleTypeId);
      
      if (!scheduleType) return;
      
      // Always show custom time settings for user modification
      elements.customTimeSettings.classList.remove('hidden');
      
      // Set default times from schedule type
      elements.customStartTime.value = scheduleType.startTime || '';
      elements.customEndTime.value = scheduleType.endTime || '';
    }

    function toggleMultipleDaysSettings() {
      if (elements.applyToMultipleDays.checked) {
        elements.multipleDaysSettings.classList.remove('hidden');
        // Set default date range
        const selectedDate = new Date(currentSelectedDate);
        elements.multiStartDate.value = currentSelectedDate;
        const endDate = new Date(selectedDate);
        endDate.setDate(selectedDate.getDate() + 6); // Default to 1 week
        elements.multiEndDate.value = endDate.toISOString().split('T')[0];
      } else {
        elements.multipleDaysSettings.classList.add('hidden');
      }
    }

    async function handleCalendarScheduleSubmit(event) {
      event.preventDefault();
      
      debugLog('Submitting calendar schedule...');
      debugLog('Employee value:', elements.calendarScheduleEmployee.value);
      debugLog('Date value:', elements.calendarScheduleDate.value);
      debugLog('Type value:', elements.calendarScheduleType.value);
          
      const formData = {
        employeeId: elements.calendarScheduleEmployee.value,
        date: elements.calendarScheduleDate.value,
        type: elements.calendarScheduleType.value,
        startTime: elements.customStartTime.value || getScheduleStartTime(elements.calendarScheduleType.value),
        endTime: elements.customEndTime.value || getScheduleEndTime(elements.calendarScheduleType.value),
        breakDuration: parseInt(elements.breakDuration.value) || 60,
        allowOT: elements.allowOT.checked,
        isHoliday: elements.isHoliday.checked,
        requireApproval: elements.requireApproval.checked,
        notes: elements.calendarScheduleNotes.value,
        status: 'approved'
      };
      
      // เพิ่ม branchId จากข้อมูลพนักงาน
      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
      if (selectedEmployee && selectedEmployee.branchId) {
        formData.branchId = selectedEmployee.branchId;
      
        }
      // createdBy จะถูกจัดการโดย API จาก JWT token อัตโนมัติ
      
      debugLog('Form data to submit:', formData);
      debugLog('Current user ID:', currentUserId);
      debugLog('Auth token exists:', !!localStorage.getItem('authToken'));
      
      // Validation
      if (!formData.employeeId) {
        showAlert('กรุณาเลือกพนักงาน', 'error');
        return;
      
        }
      if (!formData.date) {
        showAlert('กรุณาระบุวันที่', 'error');
        return;
      
        }
      if (!formData.type) {
        showAlert('กรุณาเลือกประเภทตาราง', 'error');
        return;
      
        }
      if (!formData.branchId) {
        showAlert('ไม่พบข้อมูลสาขาของพนักงาน', 'error');
        return;
      
        }
      // Check for conflicts
      const hasConflict = await checkScheduleConflicts(formData);
      if (hasConflict) {
        if (!confirm('พบตารางงานที่ซ้อนทับกัน ต้องการดำเนินการต่อหรือไม่?')) {
          return;
        
        }
      }
      
      // Handle multiple days
      debugLog('applyToMultipleDays element:', elements.applyToMultipleDays);
      debugLog('Apply to multiple days checked:', elements.applyToMultipleDays?.checked);
      if (elements.applyToMultipleDays && elements.applyToMultipleDays.checked) {
        const startDate = new Date(elements.multiStartDate.value);
        const endDate = new Date(elements.multiEndDate.value);
        const selectedDays = Array.from(document.querySelectorAll('.multi-day-checkbox:checked')).map(cb => parseInt(cb.value));
        
        const schedules = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          if (selectedDays.includes(d.getDay())) {
            schedules.push({
              date: d.toISOString().split('T')[0],
              type: formData.type,
              startTime: formData.startTime,
              endTime: formData.endTime,
              branchId: formData.branchId,
              notes: formData.notes,
              breakDuration: formData.breakDuration,
              requireApproval: formData.requireApproval
            });
        }
        
        // Use bulk API for better performance
        const result = await createBulkEmployeeSchedules(formData.employeeId, schedules);
        if (result) {
          showAlert(`สร้างตารางงาน ${result.summary.success} วัน สำเร็จ${result.summary.failed > 0 ? `, ล้มเหลว ${result.summary.failed} วัน` : ''}`, 
                   result.summary.failed > 0 ? 'warning' : 'success');
          
          // ล้าง cache ข้อมูลตารางงานเพื่อให้ข้อมูลใหม่แสดงทันที
          DataLoader.invalidateRelated('schedule');
        }
      } else {
        debugLog('Creating single schedule...');
        await createOrUpdateSchedule(formData);
      }
      
      closeCalendarScheduleModal();
      await loadScheduleData(true);
    }
    
    // Batch create schedules for multiple employees or dates
    async function createBatchSchedules(schedules) {
      try {
        const results = [];
        for (const schedule of schedules) {
          const response = await fetch('/api/attendance/work-schedules', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(schedule)
          });
          
          if (response.ok) {
            const result = await response.json();
            results.push({ success: true, data: result });
          } else {
            const errorData = await response.json().catch(() => ({}));
            results.push({ success: false, error: errorData.error || `Status ${response.status}` });
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          showAlert(`สร้างตารางงานสำเร็จ ${successCount} รายการ${failCount > 0 ? `, ล้มเหลว ${failCount} รายการ` : ''}`, 
                   failCount > 0 ? 'warning' : 'success');
          
          // ล้าง cache ข้อมูลตารางงานเพื่อให้ข้อมูลใหม่แสดงทันที
          DataLoader.invalidateRelated('schedule');
        } else {
          showAlert('ไม่สามารถสร้างตารางงานได้', 'error');
        }
        
        await loadScheduleData(true);
        return results;
      } catch (error) {
        console.error('Error creating batch schedules:', error);
        showAlert('เกิดข้อผิดพลาดในการสร้างตารางงาน', 'error');
        return [];
      }
    }
    
    // Get schedule summary for reporting
    async function getScheduleSummary(fromDate, toDate, userId = null) {
      try {
        const schedules = await loadWorkSchedules(fromDate, toDate, userId);
        
        const summary = {
          totalSchedules: schedules.length,
          byType: {},
          byEmployee: {},
          totalHours: 0,
          overtimeHours: 0
        };
        
        schedules.forEach(schedule => {
          // Count by type
          if (!summary.byType[schedule.type]) {
            summary.byType[schedule.type] = 0;
          
        }
          summary.byType[schedule.type]++;
          
          // Count by employee
          if (!summary.byEmployee[schedule.employeeName]) {
            summary.byEmployee[schedule.employeeName] = 0;
          
        }
          summary.byEmployee[schedule.employeeName]++;
          
          // Calculate hours
          if (schedule.scheduleType && schedule.scheduleType.totalHours) {
            summary.totalHours += schedule.scheduleType.totalHours;
            if (schedule.scheduleType.totalHours > 8) {
              summary.overtimeHours += (schedule.scheduleType.totalHours - 8);
            
        }
          }
        });
        
        return summary;
      } catch (error) {
        console.error('Error getting schedule summary:', error);
        return null;
      }
    }

    async function checkScheduleConflicts(newSchedule) {
      try {
        const response = await fetch('/api/attendance/work-schedules/check-conflicts', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            employeeId: newSchedule.employeeId,
            date: newSchedule.date,
            excludeId: currentEditingSchedule ? currentEditingSchedule.id : null
          })
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        return data.hasConflict || false;
      } catch (error) {
        console.error('Error checking conflicts:', error);
        showAlert('ไม่สามารถตรวจสอบความขัดแย้งได้', 'error');
        return false; // Allow to proceed if API fails
      }
    }

    async function createOrUpdateSchedule(formData) {
      try {
        debugLog('=== Starting createOrUpdateSchedule ===');
        const method = currentEditingSchedule ? 'PUT' : 'POST';
        const url = currentEditingSchedule ? 
                   `/api/attendance/work-schedules/${currentEditingSchedule.id}` : 
                   '/api/attendance/work-schedules';
        
        // Get current user ID for createdBy field
        const currentUserId = getCurrentUserIdFromToken();
        
        // Prepare data for WorkSchedule API - ตรวจสอบให้แน่ใจว่าข้อมูลครบถ้วน
        const scheduleData = {
          employeeId: formData.employeeId,  // Will be mapped to userId in backend
          date: formData.date,
          type: formData.type
          // createdBy will be set automatically from req.user.userId in backend
        };
        
        // เพิ่มข้อมูลบังคับ
        if (formData.branchId) {
          scheduleData.branchId = formData.branchId;  // API ใช้ 'branchId'
        
        }
        // เพิ่มข้อมูลเสริมที่ไม่บังคับ
        if (formData.startTime) scheduleData.startTime = formData.startTime;
        if (formData.endTime) scheduleData.endTime = formData.endTime;
        if (formData.notes) scheduleData.notes = formData.notes;
        if (formData.breakDuration) scheduleData.breakDuration = formData.breakDuration;
        if (formData.allowOT !== undefined) scheduleData.allowOT = formData.allowOT;
        if (formData.requireApproval !== undefined) scheduleData.requireApproval = formData.requireApproval;
        
        debugLog('Sending schedule data:', scheduleData);
        debugLog('To URL:', url);
        debugLog('Method:', method);
        const headers = getHeaders();
        debugLog('Headers:', headers);
        debugLog('Auth token:', localStorage.getItem('authToken'));
        
        debugLog('=== Making fetch request ===');
        const response = await fetch(url, {
          method,
          headers: getHeaders(),
          body: JSON.stringify(scheduleData)
        }).catch(error => {
          console.error('Network error:', error);
          throw new Error(`Network error: ${error.message}`);
        });
        
        debugLog('=== Response received ===');
        debugLog('Response received:', response);
        debugLog('Response status:', response.status);
        debugLog('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error Response:', errorData);
          
          // แสดง error ที่ละเอียดขึ้น
          let errorMessage = `Status ${response.status}`;
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map(err => err.msg || err.message).join(', ');
          } else if (errorData.error) {
           
        errorMessage = errorData.error;
          } else if (errorData.message) {
           
        errorMessage = errorData.message;
          
        }
          throw new Error(errorMessage);
        const result = await response.json();
        debugLog('Success response:', result);
        showAlert(currentEditingSchedule ? 'อัปเดตตารางงานเรียบร้อย' : 'เพิ่มตารางงานเรียบร้อย', 'success');
        
        // ล้าง cache ข้อมูลตารางงานเพื่อให้ข้อมูลใหม่แสดงทันที
        DataLoader.invalidateRelated('schedule');
        
        await loadScheduleData(true); // Force reload from API
      } catch (error) {
        console.error('Error saving schedule:', error);
        showAlert(`ไม่สามารถบันทึกตารางงานได้: ${error.message}`, 'error');
      }
    }

    async function handleDeleteCalendarSchedule() {
      if (!currentEditingSchedule) return;
      
      if (!confirm('คุณต้องการลบตารางงานนี้ใช่หรือไม่?')) return;
      
      try {
        const response = await fetch(`/api/attendance/work-schedules/${currentEditingSchedule.id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Status ${response.status}`);
        }
        
        showAlert('ลบตารางงานเรียบร้อย', 'success');
        closeCalendarScheduleModal();
        
        // ล้าง cache ข้อมูลตารางงานเพื่อให้ข้อมูลใหม่แสดงทันที
        DataLoader.invalidateRelated('schedule');
        
        await loadScheduleData(true); // Force reload from API
      } catch (error) {
        console.error('Error deleting schedule:', error);
        showAlert(`ไม่สามารถลบตารางงานได้: ${error.message}`, 'error');
      }
    }

    async function updateCalendarSummary() {
      const year = currentCalendarDate.getFullYear();
      const month = currentCalendarDate.getMonth() + 1;
      
      try {
        // Update total employee count
        if (elements.totalEmployeeCount) {
          elements.totalEmployeeCount.textContent = employees.length;
        
        }
        if (currentCalendarView === 'branch' && currentSelectedBranch) {
          // Branch view - show summary for selected branch
          await updateBranchSummary(year, month);
        } else {
          // All view - show overall summary
          await updateOverallSummary(year, month);
        }
      } catch (error) {
        console.error('Error updating calendar summary:', error);
        // Fallback to local calculation
        updateLocalSummary(year, month);
      }
    }
    
    async function updateBranchSummary(year, month) {
      // Get employees for selected branch
      const branchEmployees = employees.filter(emp => emp.branchId === currentSelectedBranch);
      
      // Calculate summary for branch
      const monthSchedules = scheduleData.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        const employee = employees.find(e => e.id == schedule.employeeId);
        return scheduleDate.getFullYear() === year && 
               scheduleDate.getMonth() === (month - 1) &&
               employee?.branchId === currentSelectedBranch;
      });
      
      const scheduledDays = new Set(monthSchedules.map(s => s.date)).size;
      const pendingApprovals = monthSchedules.filter(s => s.status === 'pending').length;
      
      // Get attendance data for branch employees
      const branchAttendance = (window.attendanceData || []).filter(att => {
        const attDate = new Date(att.date);
        const employee = employees.find(e => e.id == att.employeeId);
        return attDate.getFullYear() === year && 
               attDate.getMonth() === (month - 1) &&
               employee?.branchId === currentSelectedBranch;
      });
      
      const attendanceDays = branchAttendance.length;
      
      // Calculate OT hours
      const totalOTHours = monthSchedules.reduce((total, s) => {
        const scheduleType = getScheduleTypeById(s.type);
        if (scheduleType && scheduleType.workPeriods) {
          const p1Hours = calculateTimeDifference(scheduleType.workPeriods.period1?.start, scheduleType.workPeriods.period1?.end);
          const p2Hours = calculateTimeDifference(scheduleType.workPeriods.period2?.start, scheduleType.workPeriods.period2?.end);
          const totalHours = p1Hours + p2Hours;
          if (totalHours > 8) {
            return total + (totalHours - 8);
          
        }
        return total;
      }, 0);
      
      // Update branch summary display
      if (elements.branchScheduledDays) elements.branchScheduledDays.textContent = scheduledDays;
      if (elements.branchAttendanceDays) elements.branchAttendanceDays.textContent = attendanceDays;
      if (elements.branchPendingApprovals) elements.branchPendingApprovals.textContent = pendingApprovals;
      if (elements.branchTotalOTHours) elements.branchTotalOTHours.textContent = totalOTHours.toFixed(1);
    }
    
    async function updateOverallSummary(year, month) {
      try {
        // Get schedule summary from API
        const filters = { year, month };
        if (currentCalendarEmployeeFilter) {
          // If specific employee is selected, get their schedules
          const employeeSchedules = await loadEmployeeSchedules(currentCalendarEmployeeFilter, {
            from: `${year}-${month.toString().padStart(2, '0')}-01`,
            to: `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
          });
          
          const scheduledDays = new Set(employeeSchedules.map(s => s.date)).size;
          const pendingApprovals = employeeSchedules.filter(s => s.status === 'pending').length;
          const totalOTHours = employeeSchedules.reduce((total, s) => {
            if (s.scheduleType && s.scheduleType.totalHours > 8) {
              return total + (s.scheduleType.totalHours - 8);
            
        return total;
          }, 0);
          
          // Get attendance data for this employee
          const attendanceDays = (window.attendanceData || []).filter(att => {
            const attDate = new Date(att.date);
            return attDate.getFullYear() === year && 
                   attDate.getMonth() === (month - 1) &&
                   att.employeeId.toString() === currentCalendarEmployeeFilter;
          }).length;
          
          // Update display
          if (elements.summaryScheduledDays) elements.summaryScheduledDays.textContent = scheduledDays;
          if (elements.summaryAttendanceDays) elements.summaryAttendanceDays.textContent = attendanceDays;
          if (elements.summaryPendingApprovals) elements.summaryPendingApprovals.textContent = pendingApprovals;
          if (elements.summaryTotalOTHours) elements.summaryTotalOTHours.textContent = totalOTHours.toFixed(1);
        } else {
          // Get summary for all employees
          const summary = await getEmployeeScheduleSummary(filters);
          
          if (summary) {
            const scheduledDays = new Set();
            summary.employees.forEach(emp => {
              // This is an approximation - we'd need more detailed data for exact scheduled days
              if (emp.schedules > 0) {
                for (let i = 0; i < emp.schedules; i++) {
                  scheduledDays.add(`${emp.id}-day-${i}`);
                }
              }
            });
            
            const attendanceDays = (window.attendanceData || []).filter(att => {
              const attDate = new Date(att.date);
              return attDate.getFullYear() === year && attDate.getMonth() === (month - 1);
            }).length;
            
            const pendingApprovals = summary.byStatus?.pending || 0;
            const totalOTHours = Math.max(0, summary.totalHours - (summary.totalSchedules * 8));
            
            // Update display
            if (elements.summaryScheduledDays) elements.summaryScheduledDays.textContent = scheduledDays.size;
            if (elements.summaryAttendanceDays) elements.summaryAttendanceDays.textContent = attendanceDays;
            if (elements.summaryPendingApprovals) elements.summaryPendingApprovals.textContent = pendingApprovals;
            if (elements.summaryTotalOTHours) elements.summaryTotalOTHours.textContent = totalOTHours.toFixed(1);
          }
        }
      } catch (error) {
        console.error('Error updating calendar summary:', error);
        
        // Fallback to local calculation
        const monthSchedules = scheduleData.filter(schedule => {
          const scheduleDate = new Date(schedule.date);
          return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === (month - 1);
        });
        
        const filteredSchedules = currentCalendarEmployeeFilter ? 
          monthSchedules.filter(s => s.employeeId.toString() === currentCalendarEmployeeFilter) : 
          monthSchedules;
        
        const scheduledDays = new Set(filteredSchedules.map(s => s.date)).size;
        const attendanceDays = (window.attendanceData || []).filter(att => {
          const attDate = new Date(att.date);
          return attDate.getFullYear() === year && attDate.getMonth() === (month - 1);
        }).length;
        const pendingApprovals = filteredSchedules.filter(s => s.status === 'pending').length;
        const totalOTHours = filteredSchedules.reduce((total, s) => {
          if (s.scheduleType && s.scheduleType.totalHours > 8) {
            return total + (s.scheduleType.totalHours - 8);
          
        return total;
        }, 0);
        
        // Update display
        if (elements.summaryScheduledDays) elements.summaryScheduledDays.textContent = scheduledDays;
        if (elements.summaryAttendanceDays) elements.summaryAttendanceDays.textContent = attendanceDays;
        if (elements.summaryPendingApprovals) elements.summaryPendingApprovals.textContent = pendingApprovals;
        if (elements.summaryTotalOTHours) elements.summaryTotalOTHours.textContent = totalOTHours.toFixed(1);
      }
    }

    function updateLocalSummary(year, month) {
      // Fallback local calculation when API fails
      const monthSchedules = scheduleData.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === (month - 1);
      });
      
      let filteredSchedules = monthSchedules;
      let filteredAttendance = (window.attendanceData || []).filter(att => {
        const attDate = new Date(att.date);
        return attDate.getFullYear() === year && attDate.getMonth() === (month - 1);
      });
      
      if (currentCalendarView === 'branch' && currentSelectedBranch) {
        // Filter by selected branch
        filteredSchedules = monthSchedules.filter(s => {
          const employee = employees.find(e => e.id == s.employeeId);
          return employee?.branchId === currentSelectedBranch;
        });
        
        filteredAttendance = filteredAttendance.filter(att => {
          const employee = employees.find(e => e.id == att.employeeId);
          return employee?.branchId === currentSelectedBranch;
        });
      } else if (currentCalendarView === 'all' && currentCalendarEmployeeFilter) {
        //
        } Filter
        } by
        } selected
        } employee
       
        filteredSchedules = monthSchedules.filter(s =>
        s.employeeId.toString()  === currentCalendarEmployeeFilter);
       
        filteredAttendance = filteredAttendance.filter(att =>
        att.employeeId.toString()  === currentCalendarEmployeeFilter);
      
        const scheduledDays = new Set(filteredSchedules.map(s => s.date)).size;
      const attendanceDays = filteredAttendance.length;
      const pendingApprovals = filteredSchedules.filter(s => s.status === 'pending').length;
      const totalOTHours = filteredSchedules.reduce((total, s) => {
        const scheduleType = getScheduleTypeById(s.type);
        if (scheduleType && scheduleType.workPeriods) {
          const p1Hours = calculateTimeDifference(scheduleType.workPeriods.period1?.start, scheduleType.workPeriods.period1?.end);
          const p2Hours = calculateTimeDifference(scheduleType.workPeriods.period2?.start, scheduleType.workPeriods.period2?.end);
          const totalHours = p1Hours + p2Hours;
          if (totalHours > 8) {
            return total + (totalHours - 8);
          
        }
        return total;
      }, 0);
      
      // Update appropriate summary display
      if (currentCalendarView === 'branch') {
        if (elements.branchScheduledDays) elements.branchScheduledDays.textContent = scheduledDays;
        if (elements.branchAttendanceDays) elements.branchAttendanceDays.textContent = attendanceDays;
        if (elements.branchPendingApprovals) elements.branchPendingApprovals.textContent = pendingApprovals;
        if (elements.branchTotalOTHours) elements.branchTotalOTHours.textContent = totalOTHours.toFixed(1);
      } else {
        if (elements.summaryScheduledDays) elements.summaryScheduledDays.textContent = scheduledDays;
        if (elements.summaryAttendanceDays) elements.summaryAttendanceDays.textContent = attendanceDays;
        if (elements.summaryPendingApprovals) elements.summaryPendingApprovals.textContent = pendingApprovals;
        if (elements.summaryTotalOTHours) elements.summaryTotalOTHours.textContent = totalOTHours.toFixed(1);
      }
    }

    // ===== Debug Functions =====
    window.debugScheduleData = function() {
      console.log('=== SCHEDULE isDebugMode() INFO ===');
      console.log('scheduleData:', scheduleData);
      console.log('scheduleData length:', scheduleData?.length);
      console.log('selectedBranchId:', selectedBranchId);
      console.log('currentCalendarEmployeeFilter:', currentCalendarEmployeeFilter);
      
      if (scheduleData && scheduleData.length > 0) {
        console.log('First schedule:', scheduleData[0]);
        
        scheduleData.forEach((schedule, index) => {
          if (schedule.shiftSchedule?.assignedShifts) {
            console.log(`Schedule ${index} (${schedule.user?.username}):`, 
              schedule.shiftSchedule.assignedShifts.map(shift => ({
                date: shift.date,
                dateString: new Date(shift.date).toISOString().split('T')[0],
                startTime: shift.startTime,
                endTime: shift.endTime,
                status: shift.status
              }))
            );
        });
      }
    };
    
    window.testCalendarForDate = function(dateString) {
      console.log(`=== TESTING CALENDAR FOR ${dateString} ===`);
      
      if (!scheduleData || scheduleData.length === 0) {
        console.log('No scheduleData available');
        return;
      
        const daySchedules = scheduleData.filter(workSchedule => {
        if (!workSchedule) return false;
        
        // แก้ไข timezone issue โดยการ parse วันที่โดยตรง (เหมือนใน generateCalendarGrid)
        const [year, month, day] = dateString.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        
        const effectiveFrom = new Date(workSchedule.effectiveFrom);
        const effectiveTo = workSchedule.effectiveTo ? new Date(workSchedule.effectiveTo) : null;
        
        // เปรียบเทียบเฉพาะวันที่ ไม่รวมเวลา โดยใช้ string comparison
        const targetDateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const effectiveFromStr = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), effectiveFrom.getDate()).toISOString().split('T')[0];
        const effectiveToStr = effectiveTo ? new Date(effectiveTo.getFullYear(), effectiveTo.getMonth(), effectiveTo.getDate()).toISOString().split('T')[0] : null;
        
        console.log(`Testing schedule for ${workSchedule.user?.username}:`, {
          targetDateStr: targetDateStr,
          effectiveFromStr: effectiveFromStr,
          isBeforeEffective: targetDateStr < effectiveFromStr,
          workType: workSchedule.workType
        });
        
        if (workSchedule.workType === 'shift') {
                
        }
          // สำหรับ shift schedules ให้ดูจากวันที่ของ shift โดยตรง
          const hasShiftForDate = workSchedule.shiftSchedule?.assignedShifts?.some(shift => {
            const shiftDate = new Date(shift.date).toISOString().split('T')[0];
            const isMatchingDate = shiftDate === dateString;
            const isNotCancelled = shift.status !== 'cancelled';
            console.log(`  Shift check:`, { shiftDate, dateString, isMatchingDate, isNotCancelled });
            return isMatchingDate && isNotCancelled;
          });
          
          if (hasShiftForDate) {
            console.log(`  ✅ Found valid shift for ${dateString}`);
            return true;
        } else if (workSchedule.workType === 'regular') {
                
        }
          // สำหรับ regular schedules ให้เช็ค effectiveFrom
          if (targetDateStr < effectiveFromStr) return false;
          if (effectiveToStr && targetDateStr > effectiveToStr) return false;
          
          const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
          return workSchedule.regularSchedule?.workDays?.includes(dayName);
        
        return false;
      });
      
      console.log(`Found ${daySchedules.length} schedules for ${dateString}:`, daySchedules);
      return daySchedules;
    };
    
    window.testAPICall = async function(branchId) {
      console.log('=== TESTING API CALL ===');
      console.log('branchId:', branchId);
      
      try {
        const params = { branchId };
        const url = `/api/hr/work-schedules?${new URLSearchParams(params)}`;
        console.log('API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          return data;
        } else {
          console.error('Response error:', response.statusText);
          return null;
        }
      } catch (error) {
        console.error('API call error:', error);
        return null;
      }
    };
    
    window.reloadScheduleData = async function() {
      console.log('=== RELOADING SCHEDULE DATA ===');
      await loadScheduleData(true);
      console.log('Schedule data reloaded. New count:', scheduleData?.length);
    };
    
    window.testLoadAllSchedules = async function() {
      console.log('=== TESTING LOAD ALL SCHEDULES ===');
      try {
        const allSchedules = await DataLoader.loadWorkSchedules();
        console.log('All schedules loaded:', allSchedules);
        console.log('Count:', allSchedules?.length);
        return allSchedules;
      } catch (error) {
        console.error('Error loading all schedules:', error);
        return null;
      }
    };
    
    window.forceLoadAllSchedules = async function() {
      console.log('=== FORCE LOADING ALL SCHEDULES ===');
      try {
        // Clear cache first
        DataLoader.clearCache();
        
        // Force load all schedules
        scheduleData = await DataLoader.loadWorkSchedules();
        console.log('Force loaded scheduleData:', scheduleData);
        console.log('Count:', scheduleData?.length);
        
        // Update calendar
        updateCalendarDisplay();
        
        return scheduleData;
      } catch (error) {
        console.error('Error force loading schedules:', error);
        return null;
      }
    };
    
    window.checkCacheStatus = function() {
      console.log('=== CACHE STATUS ===');
      console.log('Cache size:', DataLoader.cache.size);
      console.log('Cache keys:', Array.from(DataLoader.cache.keys()));
      console.log('scheduleData variable:', scheduleData);
      console.log('selectedBranchId:', selectedBranchId);
    };
    
    window.refreshCalendar = function() {
      console.log('=== REFRESHING CALENDAR ===');
      console.log('Current scheduleData count:', scheduleData?.length);
      updateCalendarDisplay();
      console.log('Calendar refreshed');
    };
    
    window.testDateParsing = function(dateString) {
      console.log(`=== TESTING DATE PARSING FOR ${dateString} ===`);
      
      // Method 1: Original (problematic)
      const date1 = new Date(dateString);
      console.log('Method 1 (new Date(dateString)):', {
        original: date1.toString(),
        iso: date1.toISOString().split('T')[0],
        getDate: date1.getDate(),
        getMonth: date1.getMonth(),
        getFullYear: date1.getFullYear()
      });
      
      // Method 2: Fixed (should work)
      const [year, month, day] = dateString.split('-').map(Number);
      const date2 = new Date(year, month - 1, day);
      console.log('Method 2 (parsed components):', {
        components: { year, month, day },
        created: date2.toString(),
        iso: date2.toISOString().split('T')[0],
        formatted: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      });
      
      return { date1, date2, year, month, day };
    };

    // ===== Export Functions =====
    function exportAttendanceData() {
      const filteredData = getFilteredData();
      
      if (filteredData.length === 0) {
        showAlert('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
        return;
      
        }
      // Create CSV content
      const headers = ['วันที่', 'พนักงาน', 'ประเภท', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมงปกติ', 'ชั่วโมง OT', 'สถานะ', 'หมายเหตุ'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(record => [
          record.date,
          `"${record.employeeName}"`,
          record.checkInTypeText || 'ปกติ',
          record.timePeriods[0]?.timeIn || '',
          record.timePeriods[0]?.timeOut || '',
          record.totalRegularHours || '0',
          record.totalOvertimeHours || '0',
          record.approvalStatusText || 'ปกติ',
          `"${record.note || ''}"`
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const fromDate = new Date(currentFilterDateFrom).toLocaleDateString('th-TH');
      const toDate = new Date(currentFilterDateTo).toLocaleDateString('th-TH');
      const filename = `attendance_${currentFilterDateFrom}_to_${currentFilterDateTo}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert(`ส่งออกข้อมูล ${filteredData.length} รายการเรียบร้อยแล้ว`, 'success');
    }

    // ===== History Tracking Enhancement =====
    function trackAttendanceHistory(action, recordData) {
      // Send history tracking data to server
      const historyData = {
        action: action, // 'create', 'update', 'delete', 'approve', 'reject'
        recordId: recordData.id || recordData._id,
        employeeId: recordData.employeeId,
        employeeName: recordData.employeeName,
        date: recordData.date,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
        details: recordData
      };
      
      fetch('/api/attendance/history', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(historyData)
      }).catch(err => {
        console.error('Failed to track history:', err);
      });
    }

    // ===== Schedule Detail Modal Functions =====
    function openScheduleDetailModal(dateString) {
      debugLog('Opening schedule detail modal for date:', dateString);
      console.log('=== MODAL isDebugMode() ===');
      console.log('dateString:', dateString);
      console.log('scheduleData available:', scheduleData?.length);
      console.log('scheduleData:', scheduleData);
      
      // Set date in modal title - แก้ไข timezone issue
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // สร้าง date โดยไม่มี timezone issue
      
      const formattedDate = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      
      console.log('Date formatting:', {
        originalDateString: dateString,
        parsedYear: year,
        parsedMonth: month,
        parsedDay: day,
        createdDate: date.toString(),
        formattedDate: formattedDate
      });
      
      document.getElementById('scheduleDetailDate').textContent = formattedDate;
      
      // Show modal
      document.getElementById('scheduleDetailModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      // Load schedule data for the date
      loadScheduleDetailData(dateString);
    }

    // เพิ่ม event listener สำหรับปุ่มปิด modal
    document.addEventListener('DOMContentLoaded', function() {
      // ปุ่มปิด modal (X)
      const btnCloseScheduleDetailModal = document.getElementById('btnCloseScheduleDetailModal');
      if (btnCloseScheduleDetailModal) {
        btnCloseScheduleDetailModal.addEventListener('click', closeScheduleDetailModal);
      
        }
      // ปุ่มปิด modal (ปิด)
      const btnCloseScheduleDetail = document.getElementById('btnCloseScheduleDetail');
      if (btnCloseScheduleDetail) {
        btnCloseScheduleDetail.addEventListener('click', closeScheduleDetailModal);
      
        }
      // คลิกนอก modal เพื่อปิด
      const scheduleDetailModal = document.getElementById('scheduleDetailModal');
      if (scheduleDetailModal) {
        scheduleDetailModal.addEventListener('click', function(e) {
          if (e.target === scheduleDetailModal) {
            closeScheduleDetailModal();
          
        }
        });
      }
    });

    function closeScheduleDetailModal() {
      document.getElementById('scheduleDetailModal').classList.add('hidden');
      document.body.style.overflow = 'auto';
    }

    async function loadScheduleDetailData(dateString) {
      try {
        debugLog('Loading schedule detail data for:', dateString);
        
        // Load work schedules for the date
        const workSchedules = await loadSchedulesForDate(dateString);
        
        // Load actual attendance data for the date
        const attendanceData = await loadAttendanceForDate(dateString);
        
        // Process and display data
        displayScheduleDetailData(dateString, workSchedules, attendanceData);
        
      } catch (error) {
        console.error('Error loading schedule detail data:', error);
        showAlert('ไม่สามารถโหลดรายละเอียดตารางงานได้', 'error');
      }
    }

    async function loadSchedulesForDate(dateString) {
      // แก้ไข timezone issue โดยการ parse วันที่โดยตรง
      const [year, month, day] = dateString.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const daySchedules = [];
      
      console.log(`=== loadSchedulesForDate isDebugMode() FOR ${dateString} ===`);
      console.log('scheduleData available:', scheduleData?.length);
      console.log('targetDate:', targetDate);
      
      if (scheduleData && scheduleData.length > 0) {
        scheduleData.forEach(workSchedule => {
          if (!workSchedule) return;
          
          const effectiveFrom = new Date(workSchedule.effectiveFrom);
          const effectiveTo = workSchedule.effectiveTo ? new Date(workSchedule.effectiveTo) : null;
          
          // Check if schedule is effective on target date
          // เปรียบเทียบเฉพาะวันที่ ไม่รวมเวลา (ใช้ targetDate ที่แก้ไข timezone แล้ว)
          const targetDateOnly = targetDate;
          const effectiveFromOnly = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), effectiveFrom.getDate());
          const effectiveToOnly = effectiveTo ? new Date(effectiveTo.getFullYear(), effectiveTo.getMonth(), effectiveTo.getDate()) : null;
          
          if (workSchedule.workType === 'shift') {
            // สำหรับ shift schedules ให้ดูจากวันที่ของ shift โดยตรง
            // ไม่ต้องเช็ค effectiveFrom เพราะ shift อาจถูกสร้างล่วงหน้า
            workSchedule.shiftSchedule?.assignedShifts?.forEach(shift => {
              const shiftDate = new Date(shift.date).toISOString().split('T')[0];
              if (shiftDate === dateString && shift.status !== 'cancelled') {
                daySchedules.push({
                  ...workSchedule,
                  currentShift: shift
                });
              }
            });
          } else if (workSchedule.workType === 'regular') {
            // สำหรับ
        } regular
        } schedules ให้เช็ค
        } effectiveFrom
           
        } if (targetDateOnly <
        } effectiveFromOnly)
        } return;
           
        } if (effectiveToOnly &&
        } targetDateOnly >
        } effectiveToOnly)
        } return;
           
        const dayName = targetDate.toLocaleDateString('en-US', {
        } weekday: 'lowercase' });
            if (workSchedule.regularSchedule?.workDays?.includes(dayName)) {
              daySchedules.push(workSchedule);
            
        }
          }
        });
      }
      
      console.log(`Found ${daySchedules.length} schedules for ${dateString}:`, daySchedules);
      return daySchedules;
    }

    async function loadAttendanceForDate(dateString) {
      try {
        // ใช้ endpoint ที่มีอยู่และเพิ่ม date filter
        const response = await fetch(`/api/attendance?from=${dateString}&to=${dateString}`, {
          headers: getHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        const data = await response.json();
        const attendanceRecords = data.records || data.data || data;
        
        // ตรวจสอบให้แน่ใจว่าเป็น array
        if (Array.isArray(attendanceRecords)) {
          return attendanceRecords;
        } else if (attendanceRecords && typeof attendanceRecords === 'object') {
                
        }
          // ถ้าเป็น object ที่มี array ภายใน
          return Object.values(attendanceRecords).flat().filter(item => 
            item && typeof item === 'object' && (item.date || item.checkInTime)
          );
        
        debugWarn('Attendance data is not in expected format:', attendanceRecords);
        return [];
      } catch (error) {
        debugWarn('Failed to load attendance data:', error);
        return [];
      }
    }

    function displayScheduleDetailData(dateString, workSchedules, attendanceData) {
      // Update summary cards
      updateDetailSummaryCards(workSchedules, attendanceData);
      
      // Generate timeline
      generateScheduleTimeline(workSchedules);
      
      // Populate employee table
      populateDetailEmployeeTable(workSchedules, attendanceData);
    }

    function updateDetailSummaryCards(workSchedules, attendanceData) {
      // ตรวจสอบให้แน่ใจว่าเป็น array
      const safeWorkSchedules = Array.isArray(workSchedules) ? workSchedules : [];
      const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
      
      debugLog('updateDetailSummaryCards data:', {
        workSchedules: safeWorkSchedules.length,
        attendanceData: safeAttendanceData.length,
        attendanceDataType: typeof attendanceData,
        attendanceDataSample: safeAttendanceData.slice(0, 2)
      });
      
      const workingEmployees = safeWorkSchedules.length;
      const checkedInEmployees = safeAttendanceData.filter(record => record && record.checkInTime).length;
      const pendingEmployees = workingEmployees - checkedInEmployees;
      
      // Calculate overtime hours
      let overtimeHours = 0;
      safeAttendanceData.forEach(record => {
        if (record && record.overtimeHours) {
          overtimeHours += parseFloat(record.overtimeHours) || 0;
        
        }
      });
      
      document.getElementById('detailWorkingEmployees').textContent = workingEmployees;
      document.getElementById('detailCheckedInEmployees').textContent = checkedInEmployees;
      document.getElementById('detailPendingEmployees').textContent = pendingEmployees;
      document.getElementById('detailOvertimeHours').textContent = `${overtimeHours.toFixed(1)} ชม`;
    }

    function generateScheduleTimeline(workSchedules) {
      const timelineContainer = document.getElementById('timelineContainer');
      timelineContainer.innerHTML = '';
      
      // Calculate container height based on number of schedules
      const barHeight = 28; // Height of each bar (increased from 24px)
      const barSpacing = 32; // Space between bars (increased from 8px)
      const containerHeight = Math.max(80, workSchedules.length * barSpacing + 20);
      timelineContainer.style.height = containerHeight + 'px';
      
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
      let colorIndex = 0;
      
      workSchedules.forEach((schedule, index) => {
        let startHour = 8; // Default
        let endHour = 17; // Default
        
        if (schedule.currentShift) {
          const shift = schedule.currentShift;
          if (shift.startTime) {
            const [hour, minute] = shift.startTime.split(':');
            startHour = parseInt(hour) + parseInt(minute) / 60;
          
        }
          if (shift.endTime) {
            const [hour, minute] = shift.endTime.split(':');
            endHour = parseInt(hour) + parseInt(minute) / 60;
          
        }
        } else if (schedule.workType === 'regular' && schedule.regularSchedule) {
         
        const periods = schedule.regularSchedule.workPeriods;
         
        } if (periods &&
        } periods.length > 0) {
           
        const [startH,
        } startM] =
        } periods[0].startTime.split(':');
           
        startHour = parseInt(startH) +
        } parseInt(startM) / 60;
            
           
        const lastPeriod = periods[periods.length - 1];
           
        const [endH,
        } endM] =
        } lastPeriod.endTime.split(':');
           
        endHour = parseInt(endH) +
        } parseInt(endM) / 60;
          
        }
        }
        
        // Calculate position and width
        const left = (startHour / 24) * 100;
        const width = ((endHour - startHour) / 24) * 100;
        
        const timelineBar = document.createElement('div');
        timelineBar.className = `absolute ${colors[colorIndex % colors.length]} rounded opacity-80 flex items-center justify-center text-white text-xs font-medium`;
        timelineBar.style.left = left + '%';
        timelineBar.style.width = width + '%';
        timelineBar.style.height = barHeight + 'px';
        timelineBar.style.top = (index * barSpacing + 10) + 'px';
        
        // Add employee name or count
        const employeeName = schedule.user?.employee?.name || schedule.user?.username || 'N/A';
        timelineBar.textContent = employeeName.length > 10 ? employeeName.substring(0, 8) + '...' : employeeName;
        
        // Add tooltip
        timelineBar.title = `${employeeName}: ${Math.floor(startHour).toString().padStart(2, '0')}:${Math.floor((startHour % 1) * 60).toString().padStart(2, '0')} - ${Math.floor(endHour).toString().padStart(2, '0')}:${Math.floor((endHour % 1) * 60).toString().padStart(2, '0')}`;
        
        timelineContainer.appendChild(timelineBar);
        colorIndex++;
      });
    }

    function populateDetailEmployeeTable(workSchedules, attendanceData) {
      const tableBody = document.getElementById('detailEmployeeTableBody');
      tableBody.innerHTML = '';
      
      // ตรวจสอบให้แน่ใจว่าเป็น array
      const safeWorkSchedules = Array.isArray(workSchedules) ? workSchedules : [];
      const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
      
      safeWorkSchedules.forEach(schedule => {
        const employee = schedule.user?.employee || schedule.user;
        const employeeName = employee?.name || schedule.user?.username || 'N/A';
        const employeeId = schedule.user?._id || schedule.user?.id;
        
        // Find corresponding attendance record
        const attendance = safeAttendanceData.find(record => 
          record && (record.employeeId === employeeId || record.userId === employeeId)
        );
        
        // Get work schedule info
        let workTimeText = 'N/A';
        let scheduleTypeText = 'N/A';
        
        if (schedule.currentShift) {
          const shift = schedule.currentShift;
          workTimeText = `${shift.startTime || 'N/A'} - ${shift.endTime || 'N/A'}`;
          scheduleTypeText = shift.type || 'กะงาน';
        } else if (scheduleTypeText) {
            $2 = 'งานประจำ';
         
        } if (schedule.regularSchedule?.workPeriods?.length > 0) {
           
        const periods = schedule.regularSchedule.workPeriods;
           
        const startTime = periods[0].startTime;
           
        const endTime = periods[periods.length - 1].endTime;
           
        } workTimeText = `${startTime} - ${endTime}`;
          }
        }
        
        // Status and check-in/out info
        let statusText = 'รอเข้างาน';
        let statusClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        let checkInOutText = 'ยังไม่เข้างาน';
        let workHoursText = '0.0 ชม';
        
        if (attendance) {
          if (attendance.checkInTime) {
            statusText = attendance.checkOutTime ? 'เสร็จงานแล้ว' : 'กำลังทำงาน';
            statusClass = attendance.checkOutTime 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            
            const checkIn = attendance.checkInTime;
            const checkOut = attendance.checkOutTime || '-';
            checkInOutText = `${checkIn} / ${checkOut}`;
            
            if (attendance.workHours) {
              workHoursText = `${attendance.workHours.toFixed(1)} ชม`;
            }
          }
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${employeeName}</div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-gray-900 dark:text-gray-100">${scheduleTypeText}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-gray-900 dark:text-gray-100">${workTimeText}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
              ${statusText}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
            ${checkInOutText}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
            ${workHoursText}
          </td>
        `;
        
        tableBody.appendChild(row);
      });
      
      if (safeWorkSchedules.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            ไม่มีตารางงานในวันนี้
          </td>
        `;
        tableBody.appendChild(row);
      
        }
    }
  
// ===== End Script Block 3 =====
