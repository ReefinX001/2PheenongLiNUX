// Update button UI based on current action
function updateActionButton() {
    const btn = document.getElementById('actionBtn');
    const btnText = document.getElementById('actionBtnText');
    const hint = document.getElementById('nextActionHint');

    const actionConfig = {
        'checkin': {
            text: 'เข้างาน',
            icon: 'bi-box-arrow-in-right',
            color: 'btn-success',
            hint: 'กดเพื่อบันทึกเวลาเข้างาน'
        },
        'break_out': {
            text: 'ออกพัก',
            icon: 'bi-cup-hot',
            color: 'btn-warning',
            hint: 'กดเพื่อบันทึกเวลาออกพัก'
        },
        'break_in': {
            text: 'เข้างาน (หลังพัก)',
            icon: 'bi-box-arrow-in-right',
            color: 'btn-info',
            hint: 'กดเพื่อบันทึกเวลากลับเข้างานหลังพัก'
        },
        'checkout': {
            text: 'เลิกงาน',
            icon: 'bi-box-arrow-right',
            color: 'btn-danger',
            hint: 'กดเพื่อบันทึกเวลาเลิกงาน'
        }
    };

    const config = actionConfig[currentAction];
    btnText.textContent = config.text;
    hint.textContent = config.hint;

    // Update button color
    btn.className = `btn-custom ${config.color} w-full`;
    btn.querySelector('i').className = `${config.icon} text-2xl`;
}

// Handle Action
async function handleAction() {
    const btn = document.getElementById('actionBtn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner"></div><span>กำลังบันทึก...</span>';

    try {
        if (!currentPosition) {
            showToast('กรุณารอสักครู่ เพื่อระบุตำแหน่งของคุณ', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
            showToast('กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        const branchId = await getUserBranch();

        if (!branchId) {
            showToast('ไม่พบข้อมูลสาขา กรุณาติดต่อฝ่ายบุคคล', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        const response = await fetch('/api/attendance/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                branch: branchId,
                actionType: currentAction,
                location: {
                    latitude: currentPosition.lat,
                    longitude: currentPosition.lng
                },
                checkInType: 'normal'
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || 'บันทึกไม่สำเร็จ');
        }

        // Update next action
        if (result.nextAction) {
            currentAction = result.nextAction;
        } else {
            // เลิกงานแล้ว
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-check-circle text-2xl"></i><span>เลิกงานแล้ว</span>';
            document.getElementById('nextActionHint').textContent = 'คุณได้บันทึกการเลิกงานวันนี้แล้ว';
        }

        const actionLabels = {
            'checkin': 'เข้างาน',
            'break_out': 'ออกพัก',
            'break_in': 'เข้างาน (หลังพัก)',
            'checkout': 'เลิกงาน'
        };

        showToast(`บันทึก ${actionLabels[result.attendance.actionType]} สำเร็จ!`, 'success');

        // Update button for next action
        if (result.nextAction) {
            updateActionButton();
            btn.disabled = false;
        }

        loadAttendanceHistory('today');

    } catch (err) {
        console.error('Action error:', err);
        showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}
