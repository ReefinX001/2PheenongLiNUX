// ======================= STEP 2 MAP COORDINATES FUNCTIONS =======================

// Validate coordinates
function validateCoordinates() {
  const latInput = document.getElementById('customerLatitude');
  const lngInput = document.getElementById('customerLongitude');
  const displayDiv = document.getElementById('coordinatesDisplay');
  const displayLat = document.getElementById('displayLatitude');
  const displayLng = document.getElementById('displayLongitude');

  if (!latInput || !lngInput) return false;

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
  const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180;

  if (isValidLat && isValidLng) {
    if (displayLat) displayLat.textContent = lat.toFixed(7);
    if (displayLng) displayLng.textContent = lng.toFixed(7);
    if (displayDiv) displayDiv.classList.remove('hidden');

    latInput.classList.remove('border-red-500');
    lngInput.classList.remove('border-red-500');
    latInput.classList.add('border-green-500');
    lngInput.classList.add('border-green-500');

    return true;
  } else {
    if (displayDiv) displayDiv.classList.add('hidden');

    if (!isValidLat && latInput.value) {
      latInput.classList.add('border-red-500');
      latInput.classList.remove('border-green-500');
    }

    if (!isValidLng && lngInput.value) {
      lngInput.classList.add('border-red-500');
      lngInput.classList.remove('border-green-500');
    }

    return false;
  }
}

// Open location picker (Google Maps)
function openLocationPicker() {
  const lat = document.getElementById('customerLatitude')?.value || '7.006802';
  const lng = document.getElementById('customerLongitude')?.value || '100.4667971';

  // สร้าง Google Maps URL
  const mapUrl = `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},15z`;

  // เปิดหน้าต่างใหม่
  const mapWindow = window.open(mapUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

  if (mapWindow) {
    showToast('เปิด Google Maps แล้ว กรุณาคัดลอกพิกัดกลับมา', 'info');
  } else {
    showToast('ไม่สามารถเปิด Google Maps ได้', 'error');
  }
}

// Get current location using HTML5 Geolocation
function getCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง', 'error');
    return;
  }

  const loader = LoadingSystem.show({
    message: 'กำลังระบุตำแหน่งปัจจุบัน...'
  });

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const latInput = document.getElementById('customerLatitude');
      const lngInput = document.getElementById('customerLongitude');
      const mapUrlInput = document.getElementById('customerMapUrl');

      if (latInput) latInput.value = lat.toFixed(7);
      if (lngInput) lngInput.value = lng.toFixed(7);

      // สร้าง Google Maps URL
      const mapUrl = `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},15z`;
      if (mapUrlInput) mapUrlInput.value = mapUrl;

      validateCoordinates();
      LoadingSystem.hide(loader);
      showToast('ระบุตำแหน่งปัจจุบันสำเร็จ', 'success');
    },
    function(error) {
      LoadingSystem.hide(loader);
      let errorMessage = 'ไม่สามารถระบุตำแหน่งได้';

      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'ผู้ใช้ไม่อนุญาตให้ใช้ตำแหน่ง';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน';
          break;
        case error.TIMEOUT:
          errorMessage = 'หมดเวลาในการระบุตำแหน่ง';
          break;
      }

      showToast(errorMessage, 'error');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

// Parse coordinates from Google Maps URL
function parseCoordinatesFromUrl(url) {
  if (!url) return null;

  // ลอง extract จาก URL patterns ต่างๆ
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // @lat,lng
    /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // q=lat,lng
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // ll=lat,lng
    /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/  // place/lat,lng
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

// Auto-fill coordinates when map URL is pasted
function handleMapUrlInput() {
  const mapUrlInput = document.getElementById('customerMapUrl');
  const latInput = document.getElementById('customerLatitude');
  const lngInput = document.getElementById('customerLongitude');

  if (!mapUrlInput || !latInput || !lngInput) return;

  mapUrlInput.addEventListener('input', function() {
    const url = this.value;
    const coords = parseCoordinatesFromUrl(url);

    if (coords) {
      latInput.value = coords.lat.toFixed(7);
      lngInput.value = coords.lng.toFixed(7);
      validateCoordinates();
      showToast('พิกัดถูกดึงจาก URL แล้ว', 'success');
    }
  });

  mapUrlInput.addEventListener('paste', function() {
    // รอให้ข้อมูลถูก paste เสร็จก่อน
    setTimeout(() => {
      const url = this.value;
      const coords = parseCoordinatesFromUrl(url);

      if (coords) {
        latInput.value = coords.lat.toFixed(7);
        lngInput.value = coords.lng.toFixed(7);
        validateCoordinates();
        showToast('พิกัดถูกดึงจาก URL แล้ว', 'success');
      }
    }, 100);
  });
}

// Generate Google Maps URL from coordinates
function generateMapUrl() {
  const latInput = document.getElementById('customerLatitude');
  const lngInput = document.getElementById('customerLongitude');
  const mapUrlInput = document.getElementById('customerMapUrl');

  if (!latInput || !lngInput || !mapUrlInput) return;

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (!isNaN(lat) && !isNaN(lng)) {
    const mapUrl = `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},15z`;
    mapUrlInput.value = mapUrl;
    showToast('สร้าง URL แผนที่สำเร็จ', 'success');
  } else {
    showToast('กรุณาป้อนพิกัดให้ถูกต้องก่อน', 'warning');
  }
}

// Initialize map coordinates system
function initializeMapCoordinates() {
  // Setup coordinate validation
  const latInput = document.getElementById('customerLatitude');
  const lngInput = document.getElementById('customerLongitude');

  if (latInput) {
    latInput.addEventListener('input', validateCoordinates);
    latInput.addEventListener('change', validateCoordinates);
  }

  if (lngInput) {
    lngInput.addEventListener('input', validateCoordinates);
    lngInput.addEventListener('change', validateCoordinates);
  }

  // Setup map URL handling
  handleMapUrlInput();

  // Setup button event listeners
  const btnGetLocation = document.getElementById('btnGetCurrentLocation');
  const btnOpenMap = document.getElementById('btnOpenLocationPicker');
  const btnGenerateUrl = document.getElementById('btnGenerateMapUrl');

  if (btnGetLocation) {
    btnGetLocation.addEventListener('click', getCurrentLocation);
  }

  if (btnOpenMap) {
    btnOpenMap.addEventListener('click', openLocationPicker);
  }

  if (btnGenerateUrl) {
    btnGenerateUrl.addEventListener('click', generateMapUrl);
  }

  // Initial validation if coordinates already exist
  validateCoordinates();

  console.log('✅ Map coordinates system initialized');
}

// Export functions to global scope
window.validateCoordinates = validateCoordinates;
window.openLocationPicker = openLocationPicker;
window.getCurrentLocation = getCurrentLocation;
window.parseCoordinatesFromUrl = parseCoordinatesFromUrl;
window.handleMapUrlInput = handleMapUrlInput;
window.generateMapUrl = generateMapUrl;
window.initializeMapCoordinates = initializeMapCoordinates;