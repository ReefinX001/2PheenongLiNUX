/**
 * Cookie Consent Manager for 2 Pheenong Mobile
 * ระบบจัดการการยินยอมใช้คุกกี้ตาม PDPA
 */

class CookieConsent {
    constructor() {
        this.consentKey = '2pheenong_cookie_consent';
        this.consentExpiry = 365; // days
        this.init();
    }

    init() {
        // ตรวจสอบว่าผู้ใช้เคยให้ความยินยอมแล้วหรือไม่
        const consent = this.getConsent();

        if (!consent) {
            // แสดง banner ถ้ายังไม่เคยให้ความยินยอม
            this.showBanner();
        } else {
            // ถ้าเคยให้ความยินยอมแล้ว ให้โหลด scripts ตามการตั้งค่า
            this.loadConsentedScripts(consent);
        }
    }

    getConsent() {
        const consent = localStorage.getItem(this.consentKey);
        if (!consent) return null;

        try {
            const parsed = JSON.parse(consent);
            // ตรวจสอบว่า consent ยังไม่หมดอายุ
            if (new Date(parsed.expiry) > new Date()) {
                return parsed;
            }
            // ถ้าหมดอายุแล้ว ให้ลบออก
            localStorage.removeItem(this.consentKey);
            return null;
        } catch (e) {
            return null;
        }
    }

    setConsent(preferences) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + this.consentExpiry);

        const consent = {
            preferences: preferences,
            timestamp: new Date().toISOString(),
            expiry: expiry.toISOString()
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        this.loadConsentedScripts(consent);
    }

    showBanner() {
        // สร้าง overlay
        const overlay = document.createElement('div');
        overlay.id = 'cookie-consent-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99998;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease-in-out;
        `;

        // สร้าง banner
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.style.cssText = `
            background: white;
            border-radius: 24px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            width: 100%;
            padding: 32px;
            position: relative;
            z-index: 99999;
            animation: slideUp 0.4s ease-out;
            font-family: 'SF Pro Display', system-ui, sans-serif;
        `;

        banner.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                #cookie-consent-banner h3 {
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0 0 16px;
                    color: #1a1a1a;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                #cookie-consent-banner p {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #4b5563;
                    margin: 0 0 24px;
                }
                #cookie-consent-banner .cookie-details {
                    background: #f3f4f6;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 0 0 24px;
                }
                #cookie-consent-banner .cookie-item {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }
                #cookie-consent-banner .cookie-item:last-child {
                    margin-bottom: 0;
                }
                #cookie-consent-banner .cookie-toggle {
                    margin-right: 12px;
                    margin-top: 2px;
                }
                #cookie-consent-banner .cookie-info h4 {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0 0 4px;
                    color: #1a1a1a;
                }
                #cookie-consent-banner .cookie-info p {
                    font-size: 14px;
                    margin: 0;
                    color: #6b7280;
                }
                #cookie-consent-banner .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }
                #cookie-consent-banner .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                #cookie-consent-banner .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .3s;
                    border-radius: 24px;
                }
                #cookie-consent-banner .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                #cookie-consent-banner input:checked + .toggle-slider {
                    background-color: #3b82f6;
                }
                #cookie-consent-banner input:disabled + .toggle-slider {
                    background-color: #e5e7eb;
                    cursor: not-allowed;
                }
                #cookie-consent-banner input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
                #cookie-consent-banner .button-group {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                #cookie-consent-banner button {
                    padding: 12px 24px;
                    border-radius: 30px;
                    font-size: 16px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                    flex: 1;
                    min-width: 140px;
                }
                #cookie-consent-banner .btn-accept-all {
                    background: #3b82f6;
                    color: white;
                }
                #cookie-consent-banner .btn-accept-all:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                #cookie-consent-banner .btn-accept-selected {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #e5e7eb;
                }
                #cookie-consent-banner .btn-accept-selected:hover {
                    background: #e5e7eb;
                }
                #cookie-consent-banner .btn-reject-all {
                    background: transparent;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                }
                #cookie-consent-banner .btn-reject-all:hover {
                    background: #f9fafb;
                }
                #cookie-consent-banner .privacy-link {
                    display: inline-block;
                    margin-top: 12px;
                    font-size: 14px;
                    color: #3b82f6;
                    text-decoration: none;
                }
                #cookie-consent-banner .privacy-link:hover {
                    text-decoration: underline;
                }
                @media (max-width: 640px) {
                    #cookie-consent-banner {
                        padding: 24px 20px;
                    }
                    #cookie-consent-banner h3 {
                        font-size: 20px;
                    }
                    #cookie-consent-banner .button-group {
                        flex-direction: column;
                    }
                    #cookie-consent-banner button {
                        width: 100%;
                    }
                }
            </style>
            
            <h3>
                🍪 การใช้งานคุกกี้
            </h3>
            
            <p>
                เว็บไซต์ 2 พี่น้อง โมบาย ใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งานของคุณ 
                และช่วยให้เราเข้าใจวิธีการใช้งานเว็บไซต์เพื่อปรับปรุงบริการของเรา
            </p>
            
            <div class="cookie-details">
                <div class="cookie-item">
                    <label class="cookie-toggle">
                        <div class="toggle-switch">
                            <input type="checkbox" id="cookie-necessary" checked disabled>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                    <div class="cookie-info">
                        <h4>คุกกี้ที่จำเป็น</h4>
                        <p>จำเป็นสำหรับการทำงานพื้นฐานของเว็บไซต์ เช่น การรักษาความปลอดภัยและการจดจำการตั้งค่า</p>
                    </div>
                </div>
                
                <div class="cookie-item">
                    <label class="cookie-toggle">
                        <div class="toggle-switch">
                            <input type="checkbox" id="cookie-analytics" checked>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                    <div class="cookie-info">
                        <h4>คุกกี้เพื่อการวิเคราะห์</h4>
                        <p>ช่วยให้เราเข้าใจว่าผู้ใช้มีปฏิสัมพันธ์กับเว็บไซต์อย่างไร เพื่อปรับปรุงประสบการณ์การใช้งาน</p>
                    </div>
                </div>
                
                <div class="cookie-item">
                    <label class="cookie-toggle">
                        <div class="toggle-switch">
                            <input type="checkbox" id="cookie-marketing">
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                    <div class="cookie-info">
                        <h4>คุกกี้เพื่อการตลาด</h4>
                        <p>ใช้เพื่อแสดงโฆษณาและเนื้อหาที่เกี่ยวข้องกับความสนใจของคุณ</p>
                    </div>
                </div>
            </div>
            
            <div class="button-group">
                <button class="btn-accept-all" onclick="cookieConsent.acceptAll()">
                    ยอมรับทั้งหมด
                </button>
                <button class="btn-accept-selected" onclick="cookieConsent.acceptSelected()">
                    ยอมรับที่เลือก
                </button>
                <button class="btn-reject-all" onclick="cookieConsent.rejectAll()">
                    ปฏิเสธที่ไม่จำเป็น
                </button>
            </div>
            
            <a href="/privacy" class="privacy-link" target="_blank">
                อ่านนโยบายความเป็นส่วนตัว →
            </a>
        `;

        overlay.appendChild(banner);
        document.body.appendChild(overlay);
    }

    hideBanner() {
        const overlay = document.getElementById('cookie-consent-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    acceptAll() {
        this.setConsent({
            necessary: true,
            analytics: true,
            marketing: true
        });
        this.hideBanner();
    }

    acceptSelected() {
        const analytics = document.getElementById('cookie-analytics').checked;
        const marketing = document.getElementById('cookie-marketing').checked;

        this.setConsent({
            necessary: true,
            analytics: analytics,
            marketing: marketing
        });
        this.hideBanner();
    }

    rejectAll() {
        this.setConsent({
            necessary: true,
            analytics: false,
            marketing: false
        });
        this.hideBanner();
    }

    loadConsentedScripts(consent) {
        if (!consent || !consent.preferences) return;

        // โหลด script ตามการยินยอม
        if (consent.preferences.analytics) {
            // Google Analytics example
            this.loadGoogleAnalytics();
        }

        if (consent.preferences.marketing) {
            // Facebook Pixel, Google Ads, etc.
            this.loadMarketingScripts();
        }
    }

    loadGoogleAnalytics() {
        // ตัวอย่างการโหลด Google Analytics
        // ใส่ GA tracking ID ของคุณที่นี่
        /*
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
        document.head.appendChild(script);
        */

        console.log('Analytics cookies enabled');
    }

    loadMarketingScripts() {
        // ตัวอย่างการโหลด Marketing scripts
        // Facebook Pixel, Google Ads, etc.
        console.log('Marketing cookies enabled');
    }

    // Method สำหรับตรวจสอบสถานะ consent
    hasConsent(type) {
        const consent = this.getConsent();
        return consent && consent.preferences && consent.preferences[type];
    }

    // Method สำหรับเปิด banner อีกครั้ง (สำหรับลิงก์ "จัดการคุกกี้")
    showSettings() {
        this.showBanner();
    }
}

// สร้าง instance และ init เมื่อ DOM โหลดเสร็จ
let cookieConsent;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cookieConsent = new CookieConsent();
    });
} else {
    cookieConsent = new CookieConsent();
}

// เพิ่ม style สำหรับ fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
