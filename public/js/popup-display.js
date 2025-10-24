/**
 * Popup Display System for Frontend
 * This script handles displaying promotional popups to customers
 */

class PopupManager {
    constructor() {
        this.popups = [];
        this.displayedPopups = new Set();
        this.userType = 'all'; // Can be 'new_visitors', 'returning_visitors', etc.
        this.currentPage = window.location.pathname;
        this.initialized = false;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            // Detect user type
            this.detectUserType();

            // Load active popups
            await this.loadActivePopups();

            // Start displaying popups
            this.startDisplaying();

        } catch (error) {
            console.error('Error initializing popup manager:', error);
        }
    }

    detectUserType() {
        // Check if user has visited before
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            this.userType = 'new_visitors';
            localStorage.setItem('hasVisited', 'true');
        } else {
            this.userType = 'returning_visitors';
        }

        // Detect device type
        if (window.innerWidth <= 768) {
            this.userType = 'mobile_users';
        } else {
            this.userType = 'desktop_users';
        }
    }

    async loadActivePopups() {
        try {
            const response = await fetch(`/api/popups/active?targetAudience=${this.userType}&currentPage=${encodeURIComponent(this.currentPage)}`);
            const data = await response.json();

            if (data.success) {
                this.popups = data.data;
                console.log(`Loaded ${this.popups.length} active popups`);
            }
        } catch (error) {
            console.error('Error loading active popups:', error);
        }
    }

    startDisplaying() {
        this.popups.forEach((popup, index) => {
            // Calculate delay (stagger multiple popups)
            const delay = (popup.showDelay + (index * 5)) * 1000;

            setTimeout(() => {
                this.displayPopup(popup);
            }, delay);
        });
    }

    async displayPopup(popup) {
        // Check if already displayed
        if (this.displayedPopups.has(popup._id)) return;

        // Check display limits
        if (!this.canShowPopup(popup)) return;

        // Track view
        await this.trackView(popup._id);

        // Create and show popup
        const popupElement = this.createPopupElement(popup);
        document.body.appendChild(popupElement);

        // Animate in
        this.animateIn(popupElement, popup.displaySettings?.animation || 'scale');

        // Mark as displayed
        this.displayedPopups.add(popup._id);
        this.recordPopupDisplay(popup._id);
    }

    canShowPopup(popup) {
        const today = new Date().toDateString();
        const storageKey = `popup_${popup._id}`;
        const displayData = JSON.parse(localStorage.getItem(storageKey) || '{}');

        // Check max displays per user
        if (popup.maxDisplaysPerUser && displayData.totalDisplays >= popup.maxDisplaysPerUser) {
            return false;
        }

        // Check max displays per day
        if (popup.maxDisplaysPerDay && displayData.todayDisplays >= popup.maxDisplaysPerDay && displayData.lastDisplayDate === today) {
            return false;
        }

        return true;
    }

    recordPopupDisplay(popupId) {
        const today = new Date().toDateString();
        const storageKey = `popup_${popupId}`;
        const displayData = JSON.parse(localStorage.getItem(storageKey) || '{}');

        displayData.totalDisplays = (displayData.totalDisplays || 0) + 1;

        if (displayData.lastDisplayDate === today) {
            displayData.todayDisplays = (displayData.todayDisplays || 0) + 1;
        } else {
            displayData.todayDisplays = 1;
            displayData.lastDisplayDate = today;
        }

        localStorage.setItem(storageKey, JSON.stringify(displayData));
    }

    createPopupElement(popup) {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${popup.displaySettings?.backgroundColor || 'rgba(0, 0, 0, 0.5)'};
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const popupContainer = document.createElement('div');
        popupContainer.className = 'popup-container';
        popupContainer.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: ${popup.displaySettings?.borderRadius || 20}px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            position: relative;
            transform: scale(0.5);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
        closeBtn.onclick = () => this.closePopup(overlay);

        // Image
        let imageHTML = '';
        if (popup.image) {
            imageHTML = `<img src="${popup.image}" alt="Promotion" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; margin-bottom: 1rem;">`;
        } else {
            imageHTML = `<div style="font-size: 4rem; margin-bottom: 1rem;">🎁</div>`;
        }

        // Content
        popupContainer.innerHTML = `
            ${imageHTML}
            <h2 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 0.5rem;">${popup.title}</h2>
            <h3 style="font-size: 1.3rem; color: #ffd700; margin-bottom: 1rem;">${popup.subtitle}</h3>
            <p style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; opacity: 0.9;">${popup.description.replace(/\n/g, '<br>')}</p>
            
            <div style="background: white; color: #333; padding: 0.8rem; border-radius: 8px; margin-bottom: 1.5rem; border: 2px dashed #ccc;">
                <span style="font-family: monospace; font-weight: bold; font-size: 1.1rem;">${popup.couponCode}</span>
            </div>
            
            <button id="popup-action-btn-${popup._id}" style="
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                border: none;
                padding: 0.8rem 2rem;
                border-radius: 25px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1rem;
            ">${popup.buttonText}</button>
        `;

        popupContainer.appendChild(closeBtn);
        overlay.appendChild(popupContainer);

        // Add event listeners
        this.setupPopupEvents(overlay, popup);

        return overlay;
    }

    setupPopupEvents(overlay, popup) {
        const actionBtn = overlay.querySelector(`#popup-action-btn-${popup._id}`);

        // Action button click
        actionBtn.addEventListener('click', async () => {
            await this.trackClick(popup._id);

            // Copy coupon code to clipboard
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(popup.couponCode);
                    this.showToast('คัดลอกรหัสคูปองแล้ว!');
                } catch (error) {
                    console.error('Failed to copy coupon code:', error);
                }
            }

            // Close popup
            this.closePopup(overlay);

            // Optional: redirect to shop or specific page
            // window.location.href = '/shop';
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePopup(overlay);
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup(overlay);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Hover effects
        actionBtn.addEventListener('mouseover', () => {
            actionBtn.style.transform = 'scale(1.05)';
            actionBtn.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });

        actionBtn.addEventListener('mouseout', () => {
            actionBtn.style.transform = 'scale(1)';
            actionBtn.style.boxShadow = 'none';
        });
    }

    animateIn(popupElement, animation = 'scale') {
        const container = popupElement.querySelector('.popup-container');

        // Show overlay
        setTimeout(() => {
            popupElement.style.opacity = '1';
        }, 10);

        // Animate container
        setTimeout(() => {
            switch (animation) {
                case 'fade':
                    container.style.opacity = '1';
                    break;
                case 'slide':
                    container.style.transform = 'translateY(0)';
                    break;
                case 'bounce':
                    container.style.animation = 'popupBounce 0.6s ease-out forwards';
                    break;
                case 'scale':
                default:
                    container.style.transform = 'scale(1)';
                    break;
            }
        }, 100);
    }

    closePopup(popupElement) {
        const container = popupElement.querySelector('.popup-container');

        // Animate out
        popupElement.style.opacity = '0';
        container.style.transform = 'scale(0.8)';

        // Remove from DOM
        setTimeout(() => {
            if (popupElement.parentNode) {
                popupElement.parentNode.removeChild(popupElement);
            }
        }, 300);
    }

    async trackView(popupId) {
        try {
            await fetch(`/api/popups/${popupId}/view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error tracking popup view:', error);
        }
    }

    async trackClick(popupId) {
        try {
            await fetch(`/api/popups/${popupId}/click`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error tracking popup click:', error);
        }
    }

    async trackConversion(popupId) {
        try {
            await fetch(`/api/popups/${popupId}/conversion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error tracking popup conversion:', error);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transform: translateY(100px);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes popupBounce {
        0% { transform: scale(0.3) rotate(-10deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        100% { transform: scale(1) rotate(0deg); }
    }
    
    .popup-overlay * {
        box-sizing: border-box;
    }
`;
document.head.appendChild(style);

// Initialize popup manager
window.popupManager = new PopupManager();

// Expose methods for manual tracking
window.trackPopupConversion = (popupId) => {
    if (window.popupManager) {
        window.popupManager.trackConversion(popupId);
    }
};
