// Improved loadEmployeesForBulkSelect function with debugging and fallback
async function loadEmployeesForBulkSelect() {
    const select = document.getElementById('bulkEmployeeSelect');
    select.innerHTML = '<option value="">กำลังโหลด...</option>';

    try {
        if (!currentZoneId) {
            select.innerHTML = '<option value="">กรุณาเลือกสาขาก่อน</option>';
            console.warn('No zone selected for bulk employee loading');
            return;
        }

        // Check token validity
        if (!token || token === 'null' || token === 'undefined') {
            select.innerHTML = '<option value="">กรุณาเข้าสู่ระบบใหม่</option>';
            console.error('Invalid token for bulk employee loading');
            return;
        }

        console.log('Loading employees for bulk select. Zone:', currentZoneId);
        const url = `${API_BASE}/users?branch=${encodeURIComponent(currentZoneId)}&limit=100`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Bulk employee loading response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Bulk employee loading result:', result);

            if (result.success && result.data && result.data.length > 0) {
                select.innerHTML = ''; // Clear loading message

                result.data.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee._id;

                    // Create descriptive text
                    const employeeCode = employee.employee?.code || employee.username;
                    const employeeName = employee.employee?.name || employee.name || employee.username;
                    const department = employee.employee?.department || '';
                    const position = employee.employee?.position || '';

                    // Format: "รหัส - ชื่อ (แผนก - ตำแหน่ง)"
                    let displayText = `${employeeCode} - ${employeeName}`;
                    if (department || position) {
                        const extras = [department, position].filter(Boolean).join(' - ');
                        displayText += ` (${extras})`;
                    }

                    option.textContent = displayText;
                    option.dataset.employeeData = JSON.stringify({
                        id: employee._id,
                        code: employeeCode,
                        name: employeeName,
                        email: employee.email || employee.employee?.email,
                        department: department,
                        position: position,
                        branches: employee.hrZones || employee.allowedBranches || employee.checkinBranches || []
                    });
                    select.appendChild(option);
                });

                console.log(`Loaded ${result.data.length} employees for bulk selection`);

                // Add summary option at the top
                const summaryOption = document.createElement('option');
                summaryOption.value = '';
                summaryOption.textContent = `-- เลือกพนักงาน (มี ${result.data.length} คน) --`;
                summaryOption.disabled = true;
                select.insertBefore(summaryOption, select.firstChild);

            } else if (result.success && (!result.data || result.data.length === 0)) {
                select.innerHTML = '<option value="">ไม่พบพนักงานในสาขานี้</option>';
                console.warn('No employees found for zone:', currentZoneId);
            } else {
                select.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';
                console.error('API returned error:', result);
            }
        } else {
            const errorText = await response.text();
            console.error('HTTP Error loading bulk employees:', response.status, errorText);

            if (response.status === 401) {
                select.innerHTML = '<option value="">กรุณาเข้าสู่ระบบใหม่</option>';
                showAlert('error', 'กรุณาเข้าสู่ระบบใหม่');
                // Optional: redirect to login
                // window.location.href = '/';
            } else if (response.status === 403) {
                select.innerHTML = '<option value="">ไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน</option>';
            } else {
                select.innerHTML = '<option value="">เกิดข้อผิดพลาดในการเชื่อมต่อ</option>';
            }
        }
    } catch (error) {
        console.error('Error loading employees for bulk select:', error);
        select.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';

        // Optional: Show user-friendly error
        if (typeof showAlert === 'function') {
            showAlert('error', 'ไม่สามารถโหลดรายชื่อพนักงานได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
}

// Helper function to refresh employee list when zone changes
function refreshEmployeeListForBulkSelect() {
    const modal = document.getElementById('bulkScheduleModal');
    if (modal && !modal.classList.contains('hidden')) {
        // Modal is open, refresh the employee list
        loadEmployeesForBulkSelect();
    }
}