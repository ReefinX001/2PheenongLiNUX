/**
 * Zone Maps Integration
 * ตัวอย่างการใช้งาน Google Maps กับระบบ Zone Management
 */

class ZoneMapsIntegration {
    constructor() {
        this.mapsHelper = null;
        this.zones = [];
        this.currentZoneElements = [];
    }

    /**
     * เริ่มต้นการทำงาน
     */
    async init() {
        try {
            // สร้าง GoogleMapsHelper instance
            this.mapsHelper = new GoogleMapsHelper();

            // รอให้ Google Maps API โหลด
            await this.mapsHelper.waitForGoogleMaps();

            console.log('✅ Zone Maps Integration พร้อมใช้งาน');
            return true;

        } catch (error) {
            console.error('❌ ไม่สามารถเริ่มต้น Zone Maps Integration:', error);
            throw error;
        }
    }

    /**
     * สร้างแผนที่สำหรับจัดการ zones
     */
    async createZoneManagementMap(containerId) {
        if (!this.mapsHelper) {
            await this.init();
        }

        try {
            // สร้างแผนที่
            const map = await this.mapsHelper.initMap(containerId, {
                center: { lat: 13.7563, lng: 100.5018 }, // กรุงเทพฯ
                zoom: 13
            });

            // โหลดและแสดง zones ที่มีอยู่
            await this.loadAndShowZones();

            return map;

        } catch (error) {
            console.error('ไม่สามารถสร้างแผนที่ Zone Management:', error);
            this.showMapError(containerId, error.message);
        }
    }

    /**
     * โหลด zones จาก API และแสดงบนแผนที่
     */
    async loadAndShowZones() {
        try {
            const response = await fetch('/api/zone');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                this.zones = result.data;
                this.displayZonesOnMap();
                console.log(`📍 แสดง ${this.zones.length} zones บนแผนที่`);
            } else {
                console.warn('ไม่พบข้อมูล zones');
            }

        } catch (error) {
            console.error('ไม่สามารถโหลด zones ได้:', error);

            // ลองใช้ fallback API
            try {
                const fallbackResponse = await fetch('/api/zone-fallback');
                if (fallbackResponse.ok) {
                    const fallbackResult = await fallbackResponse.json();
                    if (fallbackResult.success && fallbackResult.data) {
                        this.zones = fallbackResult.data;
                        this.displayZonesOnMap();
                        console.log(`📍 แสดง ${this.zones.length} zones จาก fallback API`);
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback API ก็ไม่สามารถใช้ได้:', fallbackError);
            }
        }
    }

    /**
     * แสดง zones บนแผนที่
     */
    displayZonesOnMap() {
        if (!this.mapsHelper || !this.zones.length) {
            return;
        }

        // ล้างข้อมูลเก่า
        this.mapsHelper.clearAll();
        this.currentZoneElements = [];

        // แสดง zones ใหม่
        this.currentZoneElements = this.mapsHelper.showZones(this.zones, true);

        // เพิ่ม event listeners สำหรับการแก้ไข zones
        this.addZoneEventListeners();
    }

    /**
     * เพิ่ม event listeners สำหรับ zones
     */
    addZoneEventListeners() {
        this.currentZoneElements.forEach((element, index) => {
            const zone = this.zones[index];

            // เพิ่มการ์ด contextmenu (right-click) สำหรับแก้ไข
            element.marker.addListener('rightclick', (e) => {
                this.showZoneContextMenu(e, zone, element);
            });

            // เพิ่ม double-click สำหรับแก้ไข
            element.marker.addListener('dblclick', () => {
                this.editZone(zone);
            });
        });
    }

    /**
     * แสดง context menu สำหรับ zone
     */
    showZoneContextMenu(event, zone, element) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'zone-context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1000;
            padding: 8px 0;
            min-width: 150px;
        `;

        contextMenu.innerHTML = `
            <div class="menu-item" style="padding: 8px 16px; cursor: pointer; hover:background-color: #f5f5f5;">
                <i class="bi bi-pencil me-2"></i>แก้ไข Zone
            </div>
            <div class="menu-item" style="padding: 8px 16px; cursor: pointer; hover:background-color: #f5f5f5;">
                <i class="bi bi-eye me-2"></i>ดูรายละเอียด
            </div>
            <div class="menu-item" style="padding: 8px 16px; cursor: pointer; hover:background-color: #f5f5f5; color: #dc3545;">
                <i class="bi bi-trash me-2"></i>ลบ Zone
            </div>
        `;

        // วาง context menu ตำแหน่งเมาส์
        const x = event.domEvent.clientX;
        const y = event.domEvent.clientY;
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';

        document.body.appendChild(contextMenu);

        // เพิ่ม event listeners
        const menuItems = contextMenu.querySelectorAll('.menu-item');
        menuItems[0].onclick = () => this.editZone(zone);
        menuItems[1].onclick = () => this.viewZoneDetails(zone);
        menuItems[2].onclick = () => this.deleteZone(zone);

        // ซ่อน context menu เมื่อคลิกที่อื่น
        const hideMenu = () => {
            document.body.removeChild(contextMenu);
            document.removeEventListener('click', hideMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    /**
     * แก้ไข zone
     */
    editZone(zone) {
        console.log('แก้ไข zone:', zone);
        // เรียกใช้ฟังก์ชันแก้ไข zone ที่มีอยู่ในระบบ
        if (typeof editZone === 'function') {
            editZone(zone._id);
        } else if (typeof window.editZone === 'function') {
            window.editZone(zone._id);
        } else {
            alert(`แก้ไข Zone: ${zone.name}\nID: ${zone._id}`);
        }
    }

    /**
     * ดูรายละเอียด zone
     */
    viewZoneDetails(zone) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">${zone.name}</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="text-sm font-medium text-gray-600">รหัสสาขา:</label>
                        <p class="text-gray-800">${zone.branch_code || 'ไม่ระบุ'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-gray-600">ตำแหน่ง:</label>
                        <p class="text-gray-800">
                            lat: ${zone.center.latitude.toFixed(6)}<br>
                            lng: ${zone.center.longitude.toFixed(6)}
                        </p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-gray-600">รัศมี:</label>
                        <p class="text-gray-800">${zone.radius} เมตร</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-gray-600">สถานะ:</label>
                        <p class="text-gray-800">
                            <span class="badge ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${zone.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                        </p>
                    </div>
                    ${zone.description ? `
                    <div>
                        <label class="text-sm font-medium text-gray-600">คำอธิบาย:</label>
                        <p class="text-gray-800">${zone.description}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="mt-6 flex justify-end">
                    <button class="close-modal btn btn-primary">ปิด</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // เพิ่ม event listener สำหรับปิด modal
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = () => document.body.removeChild(modal);
        });

        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    /**
     * ลบ zone
     */
    async deleteZone(zone) {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ Zone "${zone.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/zone/${zone._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // รีโหลด zones
                await this.loadAndShowZones();

                // แสดงข้อความสำเร็จ
                this.showToast('ลบ Zone สำเร็จ', 'success');
            } else {
                throw new Error('ไม่สามารถลบ Zone ได้');
            }

        } catch (error) {
            console.error('Error deleting zone:', error);
            this.showToast('ไม่สามารถลบ Zone ได้', 'error');
        }
    }

    /**
     * แสดง toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    /**
     * แสดงข้อผิดพลาดของแผนที่
     */
    showMapError(containerId, errorMessage) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <div class="text-center">
                        <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                        <h4 class="text-lg font-semibold text-red-800 mb-2">ไม่สามารถโหลดแผนที่ได้</h4>
                        <p class="text-sm text-red-600">${errorMessage}</p>
                        <button onclick="location.reload()" class="mt-3 btn btn-sm btn-primary">
                            รีเฟรชหน้าเว็บ
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * รีเฟรช zones
     */
    async refreshZones() {
        await this.loadAndShowZones();
    }

    /**
     * ทำความสะอาด
     */
    destroy() {
        if (this.mapsHelper) {
            this.mapsHelper.destroy();
        }
        this.zones = [];
        this.currentZoneElements = [];
    }
}

// สร้าง instance global
window.ZoneMapsIntegration = ZoneMapsIntegration;

// Function สำหรับการใช้งานง่าย ๆ
window.initZoneMap = async function(containerId) {
    const integration = new ZoneMapsIntegration();
    await integration.createZoneManagementMap(containerId);
    return integration;
};

// Export สำหรับ Node.js (ถ้าใช้)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZoneMapsIntegration;
}