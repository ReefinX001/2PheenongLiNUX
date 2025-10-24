    const isDebugMode = () => {
      try {
        return (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true') ||
               (typeof window !== 'undefined' && window.location?.hostname === 'localhost') ||
               (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
      } catch (e) {
        return false;
      }
    };

    // Debug utility functions
    const debugLog = (...args) => {
      if (isDebugMode()) {
        console.log(...args);
      }
    };

    const debugWarn = (...args) => {
      if (isDebugMode()) {
        console.warn(...args);
      }
    };

    const debugError = (...args) => {
      if (isDebugMode()) {
        console.error(...args);
      }
    };

    // โหลดข้อมูลโปรไฟล์พนักงานจาก API
    async function loadEmployeeProfile() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'ไม่สามารถดึงข้อมูลผู้ใช้');
        }

        const user = result.data;
        document.getElementById('employeeName').textContent = user.name || '(ไม่พบชื่อ)';
        let photoUrl = user.photoUrl || '';
        if (!photoUrl.startsWith('/') && !/^https?:\/\//.test(photoUrl)) {
          photoUrl = '/' + photoUrl;
        }

        document.getElementById('employeePhoto').src = photoUrl;
      } catch (err) {
        debugError('Load Employee Profile Error:', err);
      }
    }
