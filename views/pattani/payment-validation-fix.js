// =======================================
// 🔧 Payment Validation Fix Script
// สำหรับแก้ไขปัญหาเงินดาวน์มากกว่ายอดรวม
// =======================================

console.log('🔧 Payment Validation Fix Script Loading...');

// ฟังก์ชันสำหรับรีเซ็ตการคำนวณแผนการผ่อน
window.fixPaymentPlans = function() {
  console.log('🔧 Fixing payment plans...');

  try {
    // ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
    const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
    if (cartItems.length === 0) {
      console.log('⚠️ No cart items found');
      return;
    }

    // คำนวณยอดรวมที่แท้จริง
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || item.qty || 1);
      return sum + (price * quantity);
    }, 0);

    console.log('💰 Total amount calculated:', totalAmount);

    if (totalAmount <= 0) {
      console.error('❌ Invalid total amount');
      return;
    }

    // สร้างแผนการผ่อนใหม่ที่ถูกต้อง
    const newPlans = [
      {
        id: 'plan1',
        name: 'แผนผ่อนยาว (ดาวน์น้อย)',
        down: Math.floor(totalAmount * 0.3), // 30%
        perMonth: Math.floor(totalAmount * 0.07), // 7%
        count: 10
      },
      {
        id: 'plan2',
        name: 'แผนผ่อนปานกลาง',
        down: Math.floor(totalAmount * 0.5), // 50%
        perMonth: Math.floor(totalAmount * 0.08), // 8%
        count: 6
      },
      {
        id: 'plan3',
        name: 'แผนผ่อนสั้น (ดาวน์มาก)',
        down: Math.floor(totalAmount * 0.7), // 70%
        perMonth: Math.floor(totalAmount * 0.1), // 10%
        count: 3
      }
    ];

    // ตรวจสอบความถูกต้อง
    newPlans.forEach(plan => {
      if (plan.down > totalAmount) {
        console.warn(`⚠️ Plan ${plan.id} down payment too high, adjusting...`);
        plan.down = Math.floor(totalAmount * 0.8);
      }
      console.log(`✅ Plan ${plan.id}: Down=${plan.down}, Total=${totalAmount}`);
    });

    // อัปเดต global variables
    window._autoPlan = newPlans[0];

    // อัปเดต UI ถ้ามี container
    const container = document.getElementById('autoPlansContainer');
    if (container) {
      container.innerHTML = newPlans.map(plan => {
        const total = plan.down + (plan.perMonth * plan.count);
        return `
          <div class="border rounded-lg p-4 mb-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="installmentPlan" value='${JSON.stringify(plan)}' 
                     ${plan.id === 'plan1' ? 'checked' : ''} class="radio radio-primary">
              <div class="flex-1">
                <h4 class="font-semibold">${plan.name}</h4>
                <p class="text-sm text-gray-600">
                  ดาวน์: ฿${plan.down.toLocaleString()} | 
                  ค่างวด: ฿${plan.perMonth.toLocaleString()}/เดือน | 
                  ${plan.count} งวด
                </p>
                <p class="text-lg font-bold text-primary">
                  รวม: ฿${total.toLocaleString()}
                </p>
              </div>
            </label>
          </div>
        `;
      }).join('');

      // Bind events
      const radios = container.querySelectorAll('input[name="installmentPlan"]');
      radios.forEach(radio => {
        radio.addEventListener('change', function() {
          if (this.checked) {
            try {
              const planData = JSON.parse(this.value);
              window._autoPlan = planData;
              console.log('✅ Plan selected:', planData);
            } catch (e) {
              console.error('❌ Error parsing plan data:', e);
            }
          }
        });
      });
    }

    console.log('✅ Payment plans fixed successfully');

    if (window.LoadingSystem?.show) {
      window.LoadingSystem.show({
        message: '✅ แก้ไขแผนการผ่อนเรียบร้อยแล้ว',
        type: 'success',
        timeout: 3000
      });
    }

    return newPlans;

  } catch (error) {
    console.error('❌ Error fixing payment plans:', error);
    return null;
  }
};

// ฟังก์ชันสำหรับตรวจสอบความถูกต้องก่อนส่งข้อมูล
window.validateBeforeSubmit = function() {
  console.log('🔍 Validating before submit...');

  const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
  if (cartItems.length === 0) {
    throw new Error('ไม่พบสินค้าในตะกร้า');
  }

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price || 0);
    const quantity = parseInt(item.quantity || item.qty || 1);
    return sum + (price * quantity);
  }, 0);

  const selectedPlan = window._autoPlan || {};
  const downPayment = selectedPlan.down || selectedPlan.downPayment || 0;

  console.log('📊 Validation data:', {
    totalAmount,
    downPayment,
    isValid: downPayment <= totalAmount
  });

  if (downPayment > totalAmount) {
    const errorMsg = `เงินดาวน์ (${downPayment.toLocaleString()}) มากกว่ายอดรวม (${totalAmount.toLocaleString()})`;

    // แก้ไขอัตโนมัติ
    const correctedDown = Math.floor(totalAmount * 0.8);
    console.log('🔧 Auto-correcting down payment to:', correctedDown);

    if (window._autoPlan) {
      window._autoPlan.down = correctedDown;
      window._autoPlan.downPayment = correctedDown;
    }

    // อัปเดตแผนใหม่
    window.fixPaymentPlans();

    if (window.LoadingSystem?.show) {
      window.LoadingSystem.show({
        message: `🔧 แก้ไขเงินดาวน์เป็น ${correctedDown.toLocaleString()} บาทแล้ว`,
        type: 'warning',
        timeout: 4000
      });
    }

    throw new Error(errorMsg);
  }

  return true;
};

// รอให้ระบบพร้อม แล้วแก้ไขอัตโนมัติ
window.addEventListener('installmentSystemReady', () => {
  console.log('🎯 System ready, applying payment fixes...');

  setTimeout(() => {
    try {
      window.fixPaymentPlans();
    } catch (error) {
      console.warn('⚠️ Auto-fix failed:', error);
    }
  }, 1000);
});

// ถ้าระบบพร้อมแล้ว ให้แก้ไขทันที
setTimeout(() => {
  if (window.InstallmentProduct?.cartItems?.length > 0) {
    console.log('🎯 System already ready, applying payment fixes...');
    try {
      window.fixPaymentPlans();
    } catch (error) {
      console.warn('⚠️ Auto-fix failed:', error);
    }
  }
}, 3000);

console.log('✅ Payment Validation Fix Script Loaded');
