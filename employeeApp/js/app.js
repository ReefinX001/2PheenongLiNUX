// Main App JavaScript for Employee App

// Global App State
const App = {
    user: {
        name: 'พนักงาน',
        id: null,
        email: null
    },
    theme: 'light',
    attendance: {
        checkIn: null,
        checkOut: null,
        location: null
    }
};

// Theme Management
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        App.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        localStorage.setItem('theme', theme);
        this.updateThemeIcon();
    },

    toggle() {
        const newTheme = App.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    updateThemeIcon() {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            if (App.theme === 'dark') {
                icon.classList.remove('bi-moon-fill');
                icon.classList.add('bi-sun-fill');
            } else {
                icon.classList.remove('bi-sun-fill');
                icon.classList.add('bi-moon-fill');
            }
        }
    }
};

// Toast Notification System
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            'success': 'check-circle-fill',
            'error': 'x-circle-fill',
            'warning': 'exclamation-triangle-fill',
            'info': 'info-circle-fill'
        };

        const colorMap = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };

        const icon = iconMap[type] || iconMap.info;
        const color = colorMap[type] || colorMap.info;

        toast.innerHTML = `
            <i class="bi bi-${icon}" style="color: ${color}; font-size: 20px;"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// DateTime Utilities
const DateTime = {
    formatDate(date) {
        return new Date(date).toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatTime(date) {
        return new Date(date).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatDateTime(date) {
        return new Date(date).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getCurrentDate() {
        return this.formatDate(new Date());
    },

    getCurrentTime() {
        return this.formatTime(new Date());
    }
};

// Storage Management
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// API Service
const API = {
    baseURL: '/api',

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    },

    // Attendance APIs
    async checkIn(data) {
        return this.request('/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async checkOut(data) {
        return this.request('/attendance/check-out', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async getAttendanceHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/attendance/history?${queryString}`);
    },

    // Leave APIs
    async submitLeaveRequest(data) {
        return this.request('/leave/request', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async getLeaveHistory() {
        return this.request('/leave/history');
    },

    async getLeaveBalance() {
        return this.request('/leave/balance');
    }
};

// Auth Management
const Auth = {
    isLoggedIn() {
        return localStorage.getItem('authToken') !== null;
    },

    getEmployeeData() {
        const data = localStorage.getItem('employeeData');
        return data ? JSON.parse(data) : null;
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('allowedPages');
        localStorage.removeItem('userData');
        localStorage.removeItem('employeeLoggedIn');
        localStorage.removeItem('employeeData');
        localStorage.removeItem('rememberEmployee');
        window.location.href = '/employee/login';
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/employee/login';
            return false;
        }
        return true;
    }
};

// Initialize App
function initApp() {
    console.log('🚀 Employee App Initializing...');

    // Check authentication (skip for login page)
    if (!window.location.pathname.includes('login')) {
        if (!Auth.requireAuth()) {
            return;
        }
    }

    // Initialize Theme
    ThemeManager.init();

    // Load employee data
    const employeeData = Auth.getEmployeeData();
    if (employeeData) {
        App.user = { ...App.user, ...employeeData };
    }

    // Load user data from storage (legacy)
    const userData = Storage.get('userData');
    if (userData) {
        App.user = { ...App.user, ...userData };
    }

    // Update employee name if element exists
    const employeeNameEl = document.getElementById('employeeName');
    if (employeeNameEl) {
        employeeNameEl.textContent = App.user.name || 'พนักงาน';
    }

    console.log('✅ Employee App Initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Global functions for use in HTML
window.toggleTheme = () => ThemeManager.toggle();
window.showToast = (message, type, duration) => Toast.show(message, type, duration);
window.logout = () => Auth.logout();
window.App = App;
window.API = API;
window.Storage = Storage;
window.DateTime = DateTime;
window.Auth = Auth;
