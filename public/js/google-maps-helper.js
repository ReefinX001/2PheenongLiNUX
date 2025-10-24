/**
 * Google Maps Helper สำหรับระบบ Zone Management
 * ใช้สำหรับจัดการแผนที่และการวาดพื้นที่ในระบบ HR
 */

class GoogleMapsHelper {
    constructor() {
        this.map = null;
        this.markers = [];
        this.circles = [];
        this.isInitialized = false;
        this.apiKey = null;
    }

    /**
     * ตรวจสอบว่า Google Maps API โหลดแล้วหรือยัง
     */
    isGoogleMapsLoaded() {
        return typeof google !== 'undefined' && typeof google.maps !== 'undefined';
    }

    /**
     * รอให้ Google Maps API โหลดเสร็จ
     */
    async waitForGoogleMaps(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.isGoogleMapsLoaded()) {
                resolve(true);
                return;
            }

            const checkInterval = setInterval(() => {
                if (this.isGoogleMapsLoaded()) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutHandle);
                    resolve(true);
                }
            }, 100);

            const timeoutHandle = setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Google Maps API ไม่สามารถโหลดได้ภายในเวลาที่กำหนด'));
            }, timeout);
        });
    }

    /**
     * สร้างแผนที่ใหม่
     */
    async initMap(containerId, options = {}) {
        try {
            await this.waitForGoogleMaps();

            const defaultOptions = {
                center: { lat: 13.7563, lng: 100.5018 }, // กรุงเทพฯ
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false,
                fullscreenControl: true,
                mapTypeControl: true,
                zoomControl: true
            };

            const mapOptions = { ...defaultOptions, ...options };
            const container = document.getElementById(containerId);

            if (!container) {
                throw new Error(`ไม่พบ element ที่มี ID: ${containerId}`);
            }

            this.map = new google.maps.Map(container, mapOptions);
            this.isInitialized = true;

            console.log('🗺️ Google Maps เริ่มต้นเสร็จแล้ว');
            return this.map;

        } catch (error) {
            console.error('❌ ไม่สามารถสร้างแผนที่ได้:', error);
            throw error;
        }
    }

    /**
     * เพิ่ม marker ลงแผนที่
     */
    addMarker(position, options = {}) {
        if (!this.map) {
            throw new Error('กรุณาเริ่มต้นแผนที่ก่อน');
        }

        const defaultOptions = {
            position: position,
            map: this.map,
            draggable: false,
            title: 'พื้นที่ทำงาน'
        };

        const markerOptions = { ...defaultOptions, ...options };
        const marker = new google.maps.Marker(markerOptions);

        this.markers.push(marker);
        return marker;
    }

    /**
     * เพิ่มวงกลมแสดงพื้นที่
     */
    addCircle(center, radius, options = {}) {
        if (!this.map) {
            throw new Error('กรุณาเริ่มต้นแผนที่ก่อน');
        }

        const defaultOptions = {
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: this.map,
            center: center,
            radius: radius, // เมตร
            editable: false,
            draggable: false
        };

        const circleOptions = { ...defaultOptions, ...options };
        const circle = new google.maps.Circle(circleOptions);

        this.circles.push(circle);
        return circle;
    }

    /**
     * เพิ่ม zone ลงแผนที่
     */
    addZone(zone, options = {}) {
        const position = {
            lat: zone.center.latitude,
            lng: zone.center.longitude
        };

        // สร้าง marker
        const markerOptions = {
            title: zone.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: options.markerColor || '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            ...options.marker
        };

        const marker = this.addMarker(position, markerOptions);

        // สร้างวงกลมแสดงพื้นที่
        const circleOptions = {
            strokeColor: options.strokeColor || '#4285F4',
            fillColor: options.fillColor || '#4285F4',
            ...options.circle
        };

        const circle = this.addCircle(position, zone.radius, circleOptions);

        // สร้าง info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="p-2">
                    <h6 class="font-semibold text-gray-800">${zone.name}</h6>
                    <p class="text-sm text-gray-600">รัศมี: ${zone.radius} เมตร</p>
                    <p class="text-xs text-gray-500">lat: ${zone.center.latitude.toFixed(6)}, lng: ${zone.center.longitude.toFixed(6)}</p>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });

        return { marker, circle, infoWindow };
    }

    /**
     * แสดง zones หลายๆ อันบนแผนที่
     */
    showZones(zones, autoFit = true) {
        const bounds = new google.maps.LatLngBounds();
        const zoneElements = [];

        zones.forEach((zone, index) => {
            const colors = this.getZoneColor(index);
            const elements = this.addZone(zone, {
                markerColor: colors.marker,
                strokeColor: colors.stroke,
                fillColor: colors.fill
            });

            zoneElements.push(elements);

            if (autoFit) {
                bounds.extend(new google.maps.LatLng(
                    zone.center.latitude,
                    zone.center.longitude
                ));
            }
        });

        if (autoFit && zones.length > 0) {
            this.map.fitBounds(bounds);

            // ปรับ zoom ถ้ามี zone เดียว
            if (zones.length === 1) {
                this.map.setZoom(15);
            }
        }

        return zoneElements;
    }

    /**
     * ได้สีสำหรับ zone ตาม index
     */
    getZoneColor(index) {
        const colors = [
            { marker: '#4285F4', stroke: '#4285F4', fill: '#4285F4' },
            { marker: '#34A853', stroke: '#34A853', fill: '#34A853' },
            { marker: '#FBBC04', stroke: '#FBBC04', fill: '#FBBC04' },
            { marker: '#EA4335', stroke: '#EA4335', fill: '#EA4335' },
            { marker: '#9C27B0', stroke: '#9C27B0', fill: '#9C27B0' },
            { marker: '#FF9800', stroke: '#FF9800', fill: '#FF9800' }
        ];

        return colors[index % colors.length];
    }

    /**
     * ล้างข้อมูลทั้งหมดออกจากแผนที่
     */
    clearAll() {
        // ล้าง markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        // ล้าง circles
        this.circles.forEach(circle => circle.setMap(null));
        this.circles = [];
    }

    /**
     * ล้าง markers
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    /**
     * ล้าง circles
     */
    clearCircles() {
        this.circles.forEach(circle => circle.setMap(null));
        this.circles = [];
    }

    /**
     * คำนวณระยะทางระหว่างจุด 2 จุด (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2 - lat1) * Math.PI/180;
        const Δλ = (lng2 - lng1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    /**
     * ตรวจสอบว่าจุดอยู่ในพื้นที่หรือไม่
     */
    isPointInZone(lat, lng, zone) {
        const distance = this.calculateDistance(
            lat, lng,
            zone.center.latitude, zone.center.longitude
        );
        return distance <= zone.radius;
    }

    /**
     * ขอตำแหน่งปัจจุบันของผู้ใช้
     */
    async getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('เบราว์เซอร์ไม่รองรับ Geolocation'));
                return;
            }

            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };

            const geoOptions = { ...defaultOptions, ...options };

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                error => {
                    let message = 'ไม่สามารถระบุตำแหน่งได้';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'ผู้ใช้ปฏิเสธการขอตำแหน่ง';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน';
                            break;
                        case error.TIMEOUT:
                            message = 'หมดเวลาในการขอตำแหน่ง';
                            break;
                    }
                    reject(new Error(message));
                },
                geoOptions
            );
        });
    }

    /**
     * เพิ่ม marker แสดงตำแหน่งปัจจุบัน
     */
    async addCurrentLocationMarker() {
        try {
            const position = await this.getCurrentPosition();

            const marker = this.addMarker(position, {
                title: 'ตำแหน่งปัจจุบัน',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                }
            });

            // เพิ่มวงกลมแสดงความแม่นยำ
            const accuracyCircle = this.addCircle(position, position.accuracy, {
                strokeColor: '#4285F4',
                strokeOpacity: 0.2,
                fillColor: '#4285F4',
                fillOpacity: 0.1
            });

            this.map.setCenter(position);
            this.map.setZoom(16);

            return { marker, accuracyCircle, position };

        } catch (error) {
            console.error('ไม่สามารถได้ตำแหน่งปัจจุบัน:', error);
            throw error;
        }
    }

    /**
     * Destructor - ทำความสะอาดเมื่อไม่ใช้แล้ว
     */
    destroy() {
        this.clearAll();
        this.map = null;
        this.isInitialized = false;
    }
}

// สร้าง instance global
window.GoogleMapsHelper = GoogleMapsHelper;

// Export สำหรับ Node.js (ถ้าใช้)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleMapsHelper;
}