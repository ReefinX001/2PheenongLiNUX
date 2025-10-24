// Fixed loadEmployees function with better authentication handling
async function loadEmployees() {
    // Don't load if no zone selected
    if (!currentZoneId) {
        console.warn('No zone selected, skipping employee loading');
        displayEmployees([]);
        return;
    }

    // Check if token exists and is valid
    if (!token || token === 'null' || token === 'undefined') {
        console.error('No valid token found');
        showAlert('error', 'กรุณาเข้าสู่ระบบใหม่');
        // Redirect to login or refresh token
        window.location.href = '/';
        return;
    }

    try {
        console.log('Loading employees for zone:', currentZoneId);
        console.log('Using token:', token ? 'Token exists' : 'No token');

        const url = `${API_BASE}/users?branch=${encodeURIComponent(currentZoneId)}&limit=100`;
        console.log('API URL:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const result = await response.json();
            console.log('API Response:', result);

            if (result.success) {
                // ตรวจสอบข้อมูลที่ได้รับ
                console.log('Employee data received:', result.data);
                displayEmployees(result.data || []);
            } else {
                console.warn('API returned success:false', result);
                showAlert('warning', result.message || 'ไม่พบข้อมูลพนักงานในสาขานี้');
                displayEmployees([]);
            }
        } else {
            // Handle different HTTP status codes
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);

            if (response.status === 401) {
                showAlert('error', 'กรุณาเข้าสู่ระบบใหม่');
                window.location.href = '/';
                return;
            } else if (response.status === 403) {
                showAlert('error', 'ไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน');
            } else {
                showAlert('error', `ไม่สามารถโหลดข้อมูลพนักงานได้ (HTTP ${response.status})`);
            }
            displayEmployees([]);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        showAlert('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน: ' + error.message);
        displayEmployees([]);
    }
}