// =========================================
// INSTALLMENT PRODUCT MODULE
// Contains: Product management and cart functions
// =========================================

(function() {
  'use strict';

  // =========================================
  // GLOBAL VARIABLES
  // =========================================

  let branchInstallments = [];
  let cartItems = [];
  let hiddenProductIds = new Set();
  let currentLevel3Items = [];
  let level2Groups = {};

  // =========================================
  // PRODUCT LEVEL FUNCTIONS
  // =========================================

  async function loadLevel1() {
    document.getElementById('level1Container').classList.remove('hidden');
    document.getElementById('level2Container').classList.add('hidden');
    document.getElementById('level3Container').classList.add('hidden');
    document.getElementById('imeiResultContainer').classList.add('hidden');

    // สร้าง brandCounts จาก branchInstallments
    const brandCounts = branchInstallments.reduce((acc, item) => {
      const key = (item.brand || item.name.split(' ')[0]).trim().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const categories = Object.entries(brandCounts)
      .map(([key, stock]) => ({ key, label: key[0].toUpperCase() + key.slice(1), stock }))
      .filter(c => c.stock > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    renderLevel1(categories);
  }

  function renderLevel1(categories) {
    const grid = document.getElementById('level1Items');
    if (!grid) return;

    grid.innerHTML = '';

    categories.forEach(cat => {
      // คำนวณ stock ที่มีอยู่จริง
      const brandItems = branchInstallments.filter(item => {
        const key = (item.brand || item.name.split(' ')[0]).trim().toLowerCase();
        return key === cat.key;
      });

      // จัดกลุ่ม Level3 ตามชื่อสินค้า
      const level3Groups = brandItems.reduce((groups, it) => {
        const key = it.name;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(it);
        return groups;
      }, {});

      // คำนวณสถานะแจ้งเตือน
      let hasEmergencyGroup = false;
      let hasWarningGroup = false;
      let totalAvailableStock = 0;

      Object.values(level3Groups).forEach(group => {
        const availableDevices = group.filter(item => !hiddenProductIds.has(item._id));
        totalAvailableStock += availableDevices.length;

        if (availableDevices.length === 0) {
          hasEmergencyGroup = true;
        } else if (availableDevices.length <= 3) {
          hasWarningGroup = true;
        }
      });

      const hasOutOfStock = hasEmergencyGroup;
      const hasLowStock = hasWarningGroup && !hasEmergencyGroup;
      const hasPromo = checkBrandHasPromotion(cat.key);

      const card = document.createElement('div');
      let cardClasses = `card p-4 flex flex-col items-center cursor-pointer shadow-md hover:shadow-lg relative`;

      if (hasOutOfStock) {
        cardClasses += ' out-of-stock-emergency';
      } else if (hasLowStock) {
        cardClasses += ' low-stock-warning';
      }

      if (hasPromo) {
        cardClasses += ' has-promotion';
        card.style.overflow = 'visible';
      }

      card.className = cardClasses;

      const fireIcon = hasPromo ? '<span class="promo-fire-icon">🔥</span>' : '';
      let statusIcon = '';
      if (hasOutOfStock) {
        statusIcon = '<span class="status-icon emergency-icon">🚨</span>';
      } else if (hasLowStock) {
        statusIcon = '<span class="status-icon warning-icon">⚠️</span>';
      }

      let badgeText, badgeClass;
      if (hasOutOfStock) {
        const emergencyCount = Object.values(level3Groups).filter(group =>
          group.filter(item => !hiddenProductIds.has(item._id)).length === 0
        ).length;
        badgeText = `🚨 มีสินค้าหมดสต๊อก ${emergencyCount} รายการ`;
        badgeClass = 'emergency-badge';
      } else if (hasLowStock) {
        const warningCount = Object.values(level3Groups).filter(group => {
          const available = group.filter(item => !hiddenProductIds.has(item._id)).length;
          return available <= 3 && available > 0;
        }).length;
        badgeText = `⚠️ มีสินค้าเหลือน้อย ${warningCount} รายการ`;
        badgeClass = 'warning-badge';
      } else {
        badgeText = `เหลือ ${totalAvailableStock} เครื่อง`;
        badgeClass = 'badge badge-info';
      }

      card.innerHTML = `
        ${fireIcon}
        ${statusIcon}
        <h6 class="truncate font-semibold ${hasPromo ? 'text-red-600' : hasOutOfStock ? 'emergency-text' : hasLowStock ? 'warning-text' : ''}">${cat.label}</h6>
        <div class="mt-2">
          <span class="${badgeClass} text-xs px-2 py-1 rounded">${badgeText}</span>
        </div>
      `;

      card.addEventListener('click', () => loadLevel2(cat.key, cat.label));
      grid.appendChild(card);
    });
  }

  function loadLevel2(parentKey, parentLabel) {
    document.getElementById('level1Container').classList.add('hidden');
    document.getElementById('level3Container').classList.add('hidden');
    document.getElementById('imeiResultContainer').classList.add('hidden');
    document.getElementById('level2Container').classList.remove('hidden');
    document.getElementById('level2Title').textContent = `รายการของ ${parentLabel}`;

    const filtered = branchInstallments.filter(p => {
      const key = (p.brand || p.name.split(' ')[0]).trim().toLowerCase();
      return key === parentKey;
    });

    level2Groups = filtered.reduce((groups, p) => {
      const baseName = p.name.split(' ').slice(0, 2).join(' ');
      (groups[baseName] ||= []).push(p);
      return groups;
    }, {});

    window.level2Groups = level2Groups;

    if (!Object.keys(level2Groups).length) {
      if (window.InstallmentUI?.showToast) {
        window.InstallmentUI.showToast('ไม่พบสินค้าในแบรนด์นี้', 'warning');
      }
      return document.getElementById('btnBackToLevel1').click();
    }

    renderLevel2(Object.keys(level2Groups));
  }

  function renderLevel2(groupNames) {
    const grid = document.getElementById('level2Items');
    if (!grid) return;

    grid.innerHTML = '';

    groupNames.forEach(baseName => {
      const items = level2Groups[baseName];

      const level3Groups = items.reduce((groups, it) => {
        const key = it.name;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(it);
        return groups;
      }, {});

      let hasEmergencyGroup = false;
      let hasWarningGroup = false;
      let totalAvailableStock = 0;

      Object.values(level3Groups).forEach(group => {
        const availableDevices = group.filter(item => !hiddenProductIds.has(item._id));
        totalAvailableStock += availableDevices.length;

        if (availableDevices.length === 0) {
          hasEmergencyGroup = true;
        } else if (availableDevices.length <= 3) {
          hasWarningGroup = true;
        }
      });

      const hasOutOfStock = hasEmergencyGroup;
      const hasLowStock = hasWarningGroup && !hasEmergencyGroup;
      const hasPromo = checkGroupHasPromotion(items);

      const card = document.createElement('div');
      let cardClasses = `card p-4 flex flex-col items-center cursor-pointer shadow-md hover:shadow-lg relative`;

      if (hasOutOfStock) {
        cardClasses += ' out-of-stock-emergency';
      } else if (hasLowStock) {
        cardClasses += ' low-stock-warning';
      }

      if (hasPromo) {
        cardClasses += ' has-promotion';
        card.style.overflow = 'visible';
      }

      card.className = cardClasses;

      const fireIcon = hasPromo ? '<span class="promo-fire-icon">🔥</span>' : '';
      let statusIcon = '';
      if (hasOutOfStock) {
        statusIcon = '<span class="status-icon emergency-icon">🚨</span>';
      } else if (hasLowStock) {
        statusIcon = '<span class="status-icon warning-icon">⚠️</span>';
      }

      let badgeText, badgeClass;
      if (hasOutOfStock) {
        const emergencyCount = Object.values(level3Groups).filter(group =>
          group.filter(item => !hiddenProductIds.has(item._id)).length === 0
        ).length;
        badgeText = `🚨 มีสินค้าหมดสต๊อก ${emergencyCount} รายการ`;
        badgeClass = 'emergency-badge';
      } else if (hasLowStock) {
        const warningCount = Object.values(level3Groups).filter(group => {
          const available = group.filter(item => !hiddenProductIds.has(item._id)).length;
          return available <= 3 && available > 0;
        }).length;
        badgeText = `⚠️ มีสินค้าเหลือน้อย ${warningCount} รายการ`;
        badgeClass = 'warning-badge';
      } else {
        badgeText = `เหลือ ${totalAvailableStock} เครื่อง`;
        badgeClass = 'badge badge-info';
      }

      const promoText = hasPromo && !hasOutOfStock && !hasLowStock
        ? '<p class="text-xs text-red-500 mt-1 font-semibold animate-pulse">ลดราคาพิเศษ!</p>'
        : '';

      card.innerHTML = `
        ${fireIcon}
        ${statusIcon}
        <h6 class="truncate font-medium ${hasPromo ? 'text-red-600' : hasOutOfStock ? 'emergency-text' : hasLowStock ? 'warning-text' : ''}">${baseName}</h6>
        <div class="mt-2">
          <span class="${badgeClass} text-xs px-2 py-1 rounded">${badgeText}</span>
        </div>
        ${promoText}
      `;

      card.addEventListener('click', () => showLevel3Group(baseName));
      grid.appendChild(card);
    });
  }

  function showLevel3Group(baseName) {
    document.getElementById('level2Container').classList.add('hidden');
    document.getElementById('level3Container').classList.remove('hidden');
    document.getElementById('level3Title').textContent = `รายละเอียดสินค้า: ${baseName}`;
    renderLevel3(window.level2Groups[baseName]);
  }

  function renderLevel3(items) {
    currentLevel3Items = items;
    const grid = document.getElementById('level3Items');
    if (!grid) return;

    grid.innerHTML = '';

    if (!items.length) {
      return grid.innerHTML = `<div class="text-gray-500">ไม่พบสินค้า</div>`;
    }

    const groupedItems = items.reduce((groups, it) => {
      const key = it.name;
      if (!groups[key]) {
        groups[key] = {
          name: it.name,
          items: [],
          image: it.image,
          downAmount: it.downAmount,
          downInstallment: it.downInstallment,
          downInstallmentCount: it.downInstallmentCount
        };
      }
      groups[key].items.push(it);
      return groups;
    }, {});

    Object.values(groupedItems).forEach(group => {
      const hasPromo = group.items.some(item => checkPromotionForProduct(item._id));
      const availableDevices = group.items.filter(item => !hiddenProductIds.has(item._id));
      const totalDevices = group.items.length;

      const isOutOfStock = availableDevices.length === 0;
      const isLowStock = availableDevices.length <= 3 && availableDevices.length > 0;

      const col = document.createElement('div');
      let cardClasses = 'card p-4 flex flex-col relative';

      if (isOutOfStock) {
        cardClasses += ' out-of-stock-emergency';
      } else if (isLowStock) {
        cardClasses += ' low-stock-warning';
      }

      if (hasPromo && !isOutOfStock) {
        cardClasses += ' has-promotion';
        col.style.overflow = 'visible';
      }

      col.className = cardClasses;

      const fireIcon = hasPromo && !isOutOfStock ? '<span class="promo-fire-icon">🔥</span>' : '';
      let statusIcon = '';
      if (isOutOfStock) {
        statusIcon = '<span class="status-icon emergency-icon">🚨</span>';
      } else if (isLowStock) {
        statusIcon = '<span class="status-icon warning-icon">⚠️</span>';
      }

      let badgeText, badgeClass;
      if (isOutOfStock) {
        badgeText = '🚨 หมดสต๊อก! 0 เครื่อง';
        badgeClass = 'emergency-badge';
      } else if (isLowStock) {
        badgeText = `⚠️ เหลือน้อย! ${availableDevices.length} เครื่อง`;
        badgeClass = 'warning-badge';
      } else {
        badgeText = `เหลือ ${availableDevices.length} เครื่อง`;
        badgeClass = 'badge badge-info';
      }

      let imeiDisplay = '';
      if (availableDevices.length > 0) {
        imeiDisplay = availableDevices[0].imei || '-';
      } else {
        imeiDisplay = '🚨 ไม่มีเครื่องเหลือ!';
      }

      // เอาปุ่มเพิ่มลงตะกร้าออก - ใช้ระบบบาร์โค้ดแทน
      // const addButton = isOutOfStock
      //   ? '<button class="btn btn-sm btn-disabled mt-2" disabled>หมดสต๊อก</button>'
      //   : `<button class="btn btn-sm btn-primary mt-2" onclick="window.InstallmentProduct.addToCart(window.InstallmentProduct.currentLevel3Items.find(i => i.name === '${group.name.replace(/'/g, "\\'")}' && !window.InstallmentProduct.hiddenProductIds.has(i._id)))">เพิ่มลงตะกร้า</button>`;

      col.innerHTML = `
        ${fireIcon}
        ${statusIcon}
        <img src="${getImageUrl(group.image)}" class="product-img mb-2 rounded-md" alt="${group.name}" />
        <div class="flex flex-wrap items-center gap-1 mb-1">
          <h6 class="font-medium text-sm ${isOutOfStock ? 'emergency-text' : isLowStock ? 'warning-text' : ''}">${group.name}</h6>
          <span class="badge badge-info badge-sm">IMEI</span>
          <span class="${badgeClass} text-xs px-2 py-1 rounded">${badgeText}</span>
        </div>
        <p class="text-xs mb-1 ${isOutOfStock ? 'emergency-text' : 'text-gray-600'}">IMEI: ${imeiDisplay}</p>
        <div class="text-sm font-semibold text-primary mb-2">
          ดาวน์: ฿${group.downAmount.toLocaleString()}
          <span class="mx-2">|</span>
          ผ่อน: ฿${group.downInstallment.toLocaleString()} (x${group.downInstallmentCount} งวด)
        </div>
        ${hasPromo && !isOutOfStock ? '<p class="promotion-text">🎉 มีโปรโมชั่นพิเศษ!</p>' : ''}
        <div class="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
          <p class="text-xs text-blue-600 text-center">📱 สแกนบาร์โค้ดเพื่อเพิ่มลงตะกร้า</p>
        </div>
      `;

      grid.appendChild(col);
    });
  }

  // =========================================
  // CART FUNCTIONS
  // =========================================

  async function checkStockHistory(imei) {
    try {
      const token = localStorage.getItem('authToken') || '';
      const BRANCH_CODE = window.BRANCH_CODE || 'สาขา1';
      const res = await fetch(`/api/branch-stock-history?branch_code=${BRANCH_CODE}&imei=${imei}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();

      if (data.success && data.data) {
        let inCount = 0;
        let outCount = 0;

        data.data.forEach(record => {
          if (record.change_type === 'IN' && record.items) {
            record.items.forEach(item => {
              if (item.imei === imei && item.remainQty > 0) {
                inCount += item.qty || 0;
              }
            });
          } else if (record.change_type === 'OUT' && record.items) {
            record.items.forEach(item => {
              if (item.imei === imei) {
                outCount += item.qty || 0;
              }
            });
          }
        });

        console.log(`📊 Stock History for IMEI ${imei}: IN=${inCount}, OUT=${outCount}`);
        return { available: inCount > outCount, inCount, outCount };
      }

      return { available: true, inCount: 0, outCount: 0 };
    } catch (err) {
      console.error('Error checking stock history:', err);
      return { available: true, inCount: 0, outCount: 0 };
    }
  }

  async function addToCart(item) {
    if (!item) return;

    let loaderId = null;

    if (item.imei && item.imei !== '000000000000000') {
      // แสดง loading ด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        loaderId = window.LoadingSystem.show({
          message: '🔍 กำลังตรวจสอบสต๊อก...',
          type: 'info',
          showProgress: true,
          autoProgress: true
        });
      }

      const stockCheck = await checkStockHistory(item.imei);

      // ซ่อน loading
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      if (!stockCheck.available) {
        // แสดงข้อผิดพลาดด้วย LoadingSystem v2.0.0
        if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
          window.LoadingSystem.show({
            message: `❌ สินค้า IMEI: ${item.imei} ถูกขายไปแล้ว!`,
            type: 'error',
            timeout: 3000
          });
        }
        console.error(`❌ สินค้าถูกขายไปแล้ว: IN=${stockCheck.inCount}, OUT=${stockCheck.outCount}`);
        return;
      }
    }

    const hasPromo = checkPromotionForProduct(item._id);

    const cartItem = {
      ...item,
      docFee: item.docFee || 0,
      taxRate: item.taxRate ?? 0,
      taxType: item.taxType ?? 'ไม่มี VAT'
    };

    cartItems.push(cartItem);
    hiddenProductIds.add(item._id);

    renderCart();
    renderLevel3(currentLevel3Items);

    const level1Visible = !document.getElementById('level1Container').classList.contains('hidden');
    const level2Visible = !document.getElementById('level2Container').classList.contains('hidden');

    if (level1Visible) {
      loadLevel1();
    }

    if (level2Visible && window.level2Groups) {
      renderLevel2(Object.keys(window.level2Groups));
    }

    const searchVisible = !document.getElementById('imeiResultContainer').classList.contains('hidden');
    if (searchVisible) {
      const searchQuery = document.getElementById('productSearchQuery').value.trim();
      if (searchQuery) {
        searchItems();
      }
    }

    if (window.checkAvailablePromotions) {
      window.checkAvailablePromotions();
    }

    if (hasPromo) {
      const mainContent = document.getElementById('mainContent');
      if (window.createConfettiEffect) {
        window.createConfettiEffect(mainContent);
      }
      // แสดงข้อความโปรโมชั่นด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `🎉 ยินดีด้วย! ${item.name} มีโปรโมชั่นพิเศษ!`,
          type: 'success',
          timeout: 3000
        });
      }
    } else {
      // แสดงข้อความสำเร็จด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `✅ เพิ่ม ${item.name} ลงในตะกร้าแล้ว`,
          type: 'success',
          timeout: 2000
        });
      }
    }

    if (document.getElementById('step3').classList.contains('active')) {
      if (window.initManualTerms) {
        window.initManualTerms();
      }
    }

    setTimeout(() => {
      if (typeof saveCurrentState === 'function') {
        saveCurrentState();
      }
    }, 100);
  }

  function removeFromCart(idx) {
    const removed = cartItems.splice(idx, 1)[0];
    hiddenProductIds.delete(removed._id);

    renderCart();
    renderLevel3(currentLevel3Items);

    const level1Visible = !document.getElementById('level1Container').classList.contains('hidden');
    const level2Visible = !document.getElementById('level2Container').classList.contains('hidden');

    if (level1Visible) {
      loadLevel1();
    }

    if (level2Visible && window.level2Groups) {
      renderLevel2(Object.keys(window.level2Groups));
    }

    const searchVisible = !document.getElementById('imeiResultContainer').classList.contains('hidden');
    if (searchVisible) {
      const searchQuery = document.getElementById('productSearchQuery').value.trim();
      if (searchQuery) {
        searchItems();
      }
    }

    if (document.getElementById('step3').classList.contains('active')) {
      if (window.initManualTerms) {
        window.initManualTerms();
      }
    }

    setTimeout(() => {
      if (typeof saveCurrentState === 'function') {
        saveCurrentState();
      }
    }, 100);
  }

  function renderCart() {
    const summaries = document.querySelectorAll('.cart-summary');
    if (!summaries.length) return;

    const currentStep = document.querySelector('.step-content.active')?.id;
    let html = '';

    if (cartItems.length === 0) {
      html = `<p class="text-gray-500">ยังไม่มีสินค้าในตะกร้า</p>`;
    } else {
      html = cartItems.map((it, idx) => {
        const promo = window.appliedPromotions?.[it._id];

        const down = Number(it.downAmount) || 0;
        const inst = Number(it.downInstallment) || 0;
        const terms = Number(it.downInstallmentCount) || 0;
        const base = down + inst * terms;

        const rate = (it.taxRate || 0) / 100;
        let vatAmount = 0;
        if (it.taxType === 'แยกภาษี') {
          vatAmount = base * rate;
        } else if (it.taxType === 'รวมภาษี') {
          vatAmount = base - (base / (1 + rate));
        }

        let promoHTML = '';
        if (promo) {
          const disc = promo.type === 'percentage'
            ? base * (promo.discount / 100)
            : promo.discount;
          const newPrice = base - disc;

          promoHTML = `
            <div class="mt-1">
              <span class="badge badge-error badge-sm">${promo.name}</span>
              <div class="text-xs mt-1">
                <span class="line-through text-gray-500">฿${base.toLocaleString()}</span>
                <span class="text-red-600 ml-2">฿${newPrice.toLocaleString()}</span>
                <span class="text-green-600 ml-1">(-฿${disc.toLocaleString()})</span>
              </div>
            </div>
          `;
        }

        return `
          <div class="flex items-start gap-2 border-b py-2">
            <img src="${getImageUrl(it.image)}" class="w-12 h-12 rounded" />
            <div class="flex-1">
              <div class="font-semibold">${it.name}</div>
              <div class="text-xs text-gray-500 mb-1">IMEI: ${it.imei}</div>
              <div class="text-xs text-gray-500">
                ภาษี: ${it.taxType || 'ไม่มีภาษี'} 
                ${vatAmount > 0 ? `(฿${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})` : ''}
              </div>
              ${promoHTML}
            </div>
            <button class="btn btn-sm btn-error" onclick="window.InstallmentProduct.removeFromCart(${idx})">ลบ</button>
          </div>
        `;
      }).join('');
    }

    summaries.forEach(el => {
      el.innerHTML = html;
    });

    updateCartCount();
    updateStep1Button();
  }

  function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
      countEl.textContent = cartItems.length;
    }
  }

  function updateStep1Button() {
    const btn = document.getElementById('btnStep1ToStep2');
    if (btn) {
      if (cartItems.length > 0) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-right mr-2"></i> ไปขั้นตอนถัดไป';
        btn.classList.remove('btn-disabled');
        btn.classList.add('btn-primary');
      } else {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-x-circle mr-2"></i> กรุณาเลือกสินค้า';
        btn.classList.add('btn-disabled');
        btn.classList.remove('btn-primary');
      }
    }
  }

  // =========================================
  // SEARCH FUNCTIONS
  // =========================================

  async function searchItems() {
    const query = document.getElementById('productSearchQuery').value.trim();
    if (!query) return;

    const resultContainer = document.getElementById('imeiResultContainer');
    const resultItems = document.getElementById('imeiResultItems');

    // แสดง loading ด้วย LoadingSystem v2.0.0
    let loaderId = null;
    if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
      loaderId = window.LoadingSystem.show({
        message: '🔍 กำลังค้นหาสินค้า...',
        type: 'info',
        showProgress: true,
        autoProgress: true
      });
    }

    resultContainer.classList.remove('hidden');

    try {
      const response = await fetch(`/api/branch-stock?branch_code=${window.BRANCH_CODE || 'สาขา1'}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลสต็อกได้');
      }

      const allStocks = data.data;

      // Search logic (IMEI first, then name)
      let results = [];

      // 1. Search by IMEI (exact match)
      const imeiMatches = allStocks.filter(item =>
        item.imei && item.imei.toLowerCase() === query.toLowerCase()
      );
      results = results.concat(imeiMatches.map(item => ({ ...item, matchType: 'IMEI' })));

      // 2. Search by name if no IMEI matches
      if (results.length === 0) {
        // Exact name match
        const exactNameMatches = allStocks.filter(item =>
          item.name && item.name.toLowerCase() === query.toLowerCase()
        );
        results = results.concat(exactNameMatches.map(item => ({ ...item, matchType: 'Exact Name' })));

        // Partial name match if no exact matches
        if (results.length === 0) {
          const partialMatches = allStocks.filter(item =>
            item.name && item.name.toLowerCase().includes(query.toLowerCase())
          );
          results = results.concat(partialMatches.map(item => ({ ...item, matchType: 'Partial Name' })));
        }
      }

      // Filter out hidden products
      const availableResults = results.filter(item => !hiddenProductIds.has(item._id));

      // ซ่อน loading
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      renderSearchResult(availableResults);

      // แสดงผลลัพธ์การค้นหา
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `พบสินค้า ${availableResults.length} รายการ`,
          type: 'success',
          timeout: 2000
        });
      }

    } catch (error) {
      console.error('Search error:', error);

      // ซ่อน loading
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      // แสดงข้อผิดพลาดด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `❌ ไม่สามารถค้นหาได้: ${error.message}`,
          type: 'error',
          timeout: 3000
        });
      }

      resultItems.innerHTML = `
        <div class="text-center p-4 text-red-600">
          ❌ ไม่สามารถค้นหาได้: ${error.message}
        </div>
      `;
    }
  }

  // ✅ NEW: Enhanced search using new API endpoint
  async function searchItemsEnhanced() {
    const query = document.getElementById('productSearchQuery').value.trim();
    if (!query) return;

    const resultContainer = document.getElementById('imeiResultContainer');
    const resultItems = document.getElementById('imeiResultItems');

    // แสดง loading ด้วย LoadingSystem v2.0.0
    let loaderId = null;
    if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
      loaderId = window.LoadingSystem.show({
        message: '🔍 กำลังค้นหาสินค้า (Enhanced)...',
        type: 'info',
        showProgress: true,
        autoProgress: true
      });
    }

    resultContainer.classList.remove('hidden');

    try {
      const branchCode = window.BRANCH_CODE || 'สาขา1';
      const response = await fetch(`/api/branch-stock/search?branch_code=${branchCode}&q=${encodeURIComponent(query)}&type=all`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'ไม่สามารถค้นหาสินค้าได้');
      }

      // Filter out hidden products
      const availableResults = data.data.filter(item => !hiddenProductIds.has(item._id));

      console.log(`🔍 Search results: ${availableResults.length} items found for "${query}"`);

      // ซ่อน loading
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      renderSearchResult(availableResults);

      // แสดงผลลัพธ์การค้นหา
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `พบสินค้า ${availableResults.length} รายการ (Enhanced)`,
          type: 'success',
          timeout: 2000
        });
      }

    } catch (error) {
      console.error('Enhanced search error:', error);

      // ซ่อน loading
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      // แสดงข้อผิดพลาดด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `❌ ไม่สามารถค้นหาได้: ${error.message}`,
          type: 'error',
          timeout: 3000
        });
      }

      resultItems.innerHTML = `
        <div class="text-center p-4 text-red-600">
          ❌ ไม่สามารถค้นหาได้: ${error.message}
        </div>
      `;
    }
  }

  function renderSearchResult(stockList) {
    const container = document.getElementById('imeiResultContainer');
    const grid = document.getElementById('imeiResultList');

    if (!container || !grid) return;

    document.getElementById('level1Container').classList.add('hidden');
    document.getElementById('level2Container').classList.add('hidden');
    document.getElementById('level3Container').classList.add('hidden');
    container.classList.remove('hidden');

    if (!stockList.length) {
      grid.innerHTML = `<div class="text-gray-500 col-span-full text-center">ไม่พบสินค้าที่ค้นหา</div>`;
      return;
    }

    // ใช้ renderLevel3 เพื่อแสดงผลลัพธ์การค้นหา
    document.getElementById('level3Items').innerHTML = '';
    const tempGrid = document.getElementById('level3Items');
    const originalGrid = grid;

    // Temporarily swap grids
    document.getElementById('level3Items').id = 'imeiResultList';
    originalGrid.id = 'level3Items';

    renderLevel3(stockList);

    // Swap back
    document.getElementById('imeiResultList').id = 'level3Items';
    document.getElementById('level3Items').id = 'imeiResultList';
  }

  function resetSearch() {
    document.getElementById('productSearchQuery').value = '';
    document.getElementById('imeiResultContainer').classList.add('hidden');
    document.getElementById('level1Container').classList.remove('hidden');
    document.getElementById('level2Container').classList.add('hidden');
    document.getElementById('level3Container').classList.add('hidden');
  }

  // =========================================
  // BARCODE FUNCTIONS
  // =========================================

  function findAndAddToCartByBarcode(barcode) {
    console.log(`กำลังค้นหาสินค้าด้วยบาร์โค้ด: ${barcode}`);
    console.log(`จำนวนสต๊อกที่มี: ${branchInstallments ? branchInstallments.length : 0}`);

    if (!branchInstallments || branchInstallments.length === 0) {
      // แสดงข้อความเตือนด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: 'ไม่พบข้อมูลสต๊อกสินค้า กรุณารอสักครู่แล้วลองใหม่',
          type: 'warning',
          timeout: 3000
        });
      }
      return;
    }

    const product = branchInstallments.find(p => p.barcode === barcode || p.sku === barcode || p.imei === barcode);
    console.log(`ผลการค้นหา product:`, product);

    if (product) {
      if (product.imei) {
        const inCart = cartItems.some(item => item.imei === product.imei);
        if (inCart) {
          // แสดงข้อความเตือนด้วย LoadingSystem v2.0.0
          if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
            window.LoadingSystem.show({
              message: `'${product.name}' (IMEI: ${product.imei}) มีอยู่ในตะกร้าแล้ว`,
              type: 'warning',
              timeout: 3000
            });
          }
          return;
        }
      } else {
        const inCart = cartItems.some(item => item.name === product.name && !item.imei);
        if (inCart) {
          // แสดงข้อความเตือนด้วย LoadingSystem v2.0.0
          if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
            window.LoadingSystem.show({
              message: `'${product.name}' มีอยู่ในตะกร้าแล้ว`,
              type: 'warning',
              timeout: 3000
            });
          }
          return;
        }
      }

      // แสดงข้อความพบสินค้าด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `พบสินค้า: ${product.name}`,
          type: 'info',
          timeout: 2000
        });
      }
      addToCart(product);
    } else {
      // แสดงข้อความไม่พบสินค้าด้วย LoadingSystem v2.0.0
      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `ไม่พบสินค้าสำหรับบาร์โค้ดนี้: ${barcode}`,
          type: 'error',
          timeout: 3000
        });
      }
    }
  }

  // =========================================
  // HELPER FUNCTIONS
  // =========================================

  function getImageUrl(imagePath) {
    if (!imagePath) return '/images/no-image.png';
    if (imagePath.startsWith('http')) return imagePath;
    return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  }

  function checkBrandHasPromotion(brandKey) {
    // Placeholder - ควรเชื่อมกับระบบโปรโมชั่นจริง
    return false;
  }

  function checkGroupHasPromotion(items) {
    // Placeholder - ควรเชื่อมกับระบบโปรโมชั่นจริง
    return false;
  }

  function checkPromotionForProduct(productId) {
    // Placeholder - ควรเชื่อมกับระบบโปรโมชั่นจริง
    return false;
  }

  // =========================================
  // INITIALIZATION
  // =========================================

  function setBranchInstallments(data) {
    branchInstallments = data || [];
    console.log('📦 Set branch installments:', branchInstallments.length);
  }

  function getCartItems() {
    return cartItems;
  }

  function clearCart() {
    cartItems = [];
    hiddenProductIds.clear();
    renderCart();
  }

  // =========================================
  // NAVIGATION FUNCTIONS
  // =========================================

  function backToLevel1() {
    document.getElementById('level1Container').classList.remove('hidden');
    document.getElementById('level2Container').classList.add('hidden');
    document.getElementById('level3Container').classList.add('hidden');
    document.getElementById('imeiResultContainer').classList.add('hidden');
    console.log('🔄 กลับไปยัง Level 1');
  }

  function backToLevel2() {
    document.getElementById('level1Container').classList.add('hidden');
    document.getElementById('level2Container').classList.remove('hidden');
    document.getElementById('level3Container').classList.add('hidden');
    document.getElementById('imeiResultContainer').classList.add('hidden');
    console.log('🔄 กลับไปยัง Level 2');
  }

  // =========================================
  // MODULE EXPORT
  // =========================================

  window.InstallmentProduct = {
    // Level functions
    loadLevel1,
    loadLevel2,
    loadLevel3: showLevel3Group,
    renderLevel1,
    renderLevel2,
    renderLevel3,

    // Navigation functions
    backToLevel1,
    backToLevel2,

    // Cart functions
    addToCart,
    removeFromCart,
    renderCart,
    getCartItems,
    clearCart,
    updateCartCount,

    // Search functions
    searchItems,
    searchItemsEnhanced,
    resetSearch,
    findAndAddToCartByBarcode,

    // Data management
    setBranchInstallments,

    // Expose variables for compatibility
    get cartItems() { return cartItems; },
    get branchInstallments() { return branchInstallments; },
    get hiddenProductIds() { return hiddenProductIds; },
    get currentLevel3Items() { return currentLevel3Items; }
  };

  // Make cartItems global for compatibility
  window.cartItems = cartItems;

  console.log('📦 Installment Product Module loaded successfully');

})();