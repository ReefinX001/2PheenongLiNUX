// Zone API Debug Script
// Use this in browser console to debug the 403 Forbidden issue

(function() {
    console.log('🔧 Zone API Debug Tool');
    console.log('======================\n');

    const token = localStorage.getItem('authToken');
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : '/api';

    console.log('🌐 API Base:', API_BASE);
    console.log('🎫 Token exists:', !!token);

    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('👤 Token User:', payload.username);
                console.log('🔑 Permissions:', payload.permissions);
                console.log('⏰ Expires:', new Date(payload.exp * 1000));
                console.log('📅 Is Expired:', Date.now() > payload.exp * 1000);
            }
        } catch (e) {
            console.error('❌ Token decode failed:', e);
        }
    }

    // Test function for main zone API
    window.testZoneAPI = async function() {
        console.log('\n🧪 Testing Main Zone API...');
        try {
            const response = await fetch(`${API_BASE}/zone`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📊 Status:', response.status);
            console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));

            const result = await response.json();
            console.log('📝 Response:', result);

            if (response.ok) {
                console.log('✅ Main Zone API works!');
            } else {
                console.log('❌ Main Zone API failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('💥 Request failed:', error);
            return null;
        }
    };

    // Test function for fallback zone API
    window.testFallbackZoneAPI = async function() {
        console.log('\n🧪 Testing Fallback Zone API...');
        try {
            const response = await fetch(`${API_BASE}/zone-fallback`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📊 Status:', response.status);
            const result = await response.json();
            console.log('📝 Response:', result);

            if (response.ok) {
                console.log('✅ Fallback Zone API works!');
            } else {
                console.log('❌ Fallback Zone API failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('💥 Request failed:', error);
            return null;
        }
    };

    // Test function for health check
    window.testZoneHealth = async function() {
        console.log('\n🧪 Testing Zone Health...');
        try {
            const response = await fetch(`${API_BASE}/zone-fallback/health`);
            const result = await response.json();
            console.log('🏥 Health:', result);
            return result;
        } catch (error) {
            console.error('💥 Health check failed:', error);
            return null;
        }
    };

    // Auto-fix function
    window.fixZoneAPI = async function() {
        console.log('\n🔧 Auto-fixing Zone API...');

        // Try fallback first
        const fallbackResult = await testFallbackZoneAPI();
        if (fallbackResult?.success) {
            console.log('✅ Fallback API works - switching to fallback endpoint');

            // Update the frontend to use fallback endpoint
            if (window.loadZones) {
                // Replace the API call in loadZones function
                const originalAPIBase = window.API_BASE || API_BASE;
                console.log('🔄 Switching to fallback endpoint...');

                // Monkey patch the API call
                window.FALLBACK_MODE = true;
                window.FALLBACK_API_BASE = API_BASE + '/zone-fallback';

                alert('กำลังเปลี่ยนไปใช้ API ทางเลือก กรุณาโหลดข้อมูลใหม่');
                return true;
            }
        }

        // If fallback doesn't work, suggest login refresh
        console.log('❌ Both APIs failed - suggesting login refresh');
        if (confirm('API ไม่ทำงาน ต้องการล้างข้อมูลและเข้าสู่ระบบใหม่หรือไม่?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }

        return false;
    };

    console.log('\n🛠️ Available Commands:');
    console.log('testZoneAPI() - Test main zone API');
    console.log('testFallbackZoneAPI() - Test fallback zone API');
    console.log('testZoneHealth() - Test health endpoint');
    console.log('fixZoneAPI() - Auto-fix zone API issues');

    // Auto-run basic test
    console.log('\n🚀 Running auto-test...');
    setTimeout(() => {
        testZoneHealth().then(() => {
            console.log('\n💡 Run fixZoneAPI() if you see 403 errors');
        });
    }, 1000);

})();