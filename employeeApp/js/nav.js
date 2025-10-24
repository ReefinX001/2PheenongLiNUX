// Navigation Component for Employee App

class Navigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('index') || path.endsWith('/employeeApp/') || path.endsWith('/employeeApp') || path === '/') {
            return 'home';
        } else if (path.includes('check')) {
            return 'check';
        } else if (path.includes('leave')) {
            return 'leave';
        } else if (path.includes('settings')) {
            return 'settings';
        }
        return 'home';
    }

    init() {
        this.renderNavbar();
        this.attachEventListeners();
    }

    renderNavbar() {
        // Add CSS styles first
        const style = document.createElement('style');
        style.textContent = `
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                border-top: 1px solid #e5e7eb;
                z-index: 50;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            }

            .dark .bottom-nav {
                background: #1f2937;
                border-top-color: #374151;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
            }

            .bottom-nav .nav-container {
                display: flex;
                justify-content: space-around;
                align-items: center;
                height: 64px;
                max-width: 640px;
                margin: 0 auto;
            }

            .bottom-nav .nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 8px 12px;
                color: #6b7280;
                text-decoration: none;
                transition: all 0.3s;
                flex: 1;
                position: relative;
            }

            .bottom-nav .nav-item i {
                font-size: 24px;
                margin-bottom: 4px;
            }

            .bottom-nav .nav-item span {
                font-size: 12px;
                font-weight: 500;
            }

            .bottom-nav .nav-item:hover {
                color: #667eea;
            }

            .bottom-nav .nav-item.active {
                color: #667eea;
            }

            .bottom-nav .nav-item.active::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 3px;
                background: #667eea;
                border-radius: 0 0 3px 3px;
            }

            .dark .bottom-nav .nav-item {
                color: #9ca3af;
            }

            .dark .bottom-nav .nav-item:hover,
            .dark .bottom-nav .nav-item.active {
                color: #818cf8;
            }

            .dark .bottom-nav .nav-item.active::before {
                background: #818cf8;
            }

            body {
                padding-bottom: 64px;
            }
        `;
        document.head.appendChild(style);

        const navHTML = `
            <nav class="bottom-nav">
                <div class="nav-container">
                    <a href="/index" class="nav-item ${this.currentPage === 'home' ? 'active' : ''}" data-page="home">
                        <i class="bi bi-house-door-fill"></i>
                        <span>หน้าแรก</span>
                    </a>
                    <a href="/check" class="nav-item ${this.currentPage === 'check' ? 'active' : ''}" data-page="check">
                        <i class="bi bi-clock-history"></i>
                        <span>เช็ค</span>
                    </a>
                    <a href="/leave" class="nav-item ${this.currentPage === 'leave' ? 'active' : ''}" data-page="leave">
                        <i class="bi bi-calendar-check"></i>
                        <span>ลา</span>
                    </a>
                    <a href="/settings" class="nav-item ${this.currentPage === 'settings' ? 'active' : ''}" data-page="settings">
                        <i class="bi bi-gear-fill"></i>
                        <span>ตั้งค่า</span>
                    </a>
                </div>
            </nav>
        `;

        // Add navbar to body
        const navContainer = document.createElement('div');
        navContainer.innerHTML = navHTML;
        document.body.appendChild(navContainer.firstElementChild);
    }

    attachEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Let the browser handle the navigation naturally
                // Just add a visual feedback
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navigation = new Navigation();
    });
} else {
    window.navigation = new Navigation();
}
