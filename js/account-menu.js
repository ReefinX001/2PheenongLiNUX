// Account Menu JavaScript
// สร้างและจัดการเมนูระบบบัญชี

(function() {
  'use strict';

  // Template HTML ของเมนูระบบบัญชี
  const menuTemplate = `
    <div class="flex justify-center">
      <ul class="menu menu-horizontal p-0 bg-base-100 rounded-lg shadow-md space-x-2">
        <!-- ซื้อ -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-cart-fill text-green-600 mr-2"></i> ซื้อ
            <i class="bi bi-caret-down-fill text-green-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg space-y-1">
            <li class="submenu-item">
              <a href="purchase_order">
                <i class="bi bi-file-earmark-text text-green-500 mr-2"></i> ใบสั่งซื้อ
              </a>
            </li>
            <li class="submenu-item">
              <a href="purchase_product">
                <i class="bi bi-bag-fill text-green-500 mr-2"></i> ซื้อสินค้า
              </a>
            </li>
            <li class="submenu-item">
              <a href="purchase_asset">
                <i class="bi bi-archive-fill text-green-500 mr-2"></i> ซื้อสินทรัพย์
              </a>
            </li>
            <li class="submenu-item">
              <a href="goods_receipt">
                <i class="bi bi-box-arrow-in-down text-green-500 mr-2"></i> ใบรับสินค้า
              </a>
            </li>
            <li class="submenu-item">
              <a href="supplier_details">
                <i class="bi bi-person-lines-fill text-green-500 mr-2"></i> รายละเอียดผู้จำหน่าย
              </a>
            </li>
            <li class="submenu-item">
              <a href="deposit_payment">
                <i class="bi bi-cash-stack text-green-500 mr-2"></i> ใบจ่ายเงินมัดจำ
              </a>
            </li>
            <li class="submenu-item">
              <a href="purchase_tax_invoice">
                <i class="bi bi-file-earmark-spreadsheet text-green-500 mr-2"></i> ใบกำกับภาษีซื้อ
              </a>
            </li>
            <li class="submenu-item">
              <a href="credit_note">
                <i class="bi bi-file-earmark-minus text-green-500 mr-2"></i> ใบลดหนี้
              </a>
            </li>
            <li class="submenu-item">
              <a href="debit_note">
                <i class="bi bi-file-earmark-plus text-green-500 mr-2"></i> ใบเพิ่มหนี้
              </a>
            </li>
            <li class="submenu-item expense-group">
              <a href="expense_record">
                <i class="bi bi-journal-text text-green-500 mr-2"></i> บันทึกค่าใช้จ่าย
              </a>
            </li>
          </ul>
        </li>

        <!-- ขาย -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-shop text-red-600 mr-2"></i> ขาย
            <i class="bi bi-caret-down-fill text-red-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item">
              <a href="quotation">
                <i class="bi bi-file-earmark-text text-red-500 mr-2"></i> ใบเสนอราคา
              </a>
            </li>
            <li class="submenu-item">
              <a href="invoice">
                <i class="bi bi-receipt text-red-500 mr-2"></i> ใบแจ้งหนี้
              </a>
            </li>
            <li class="submenu-item">
              <a href="deposit_receipt">
                <i class="bi bi-file-earmark-check text-red-500 mr-2"></i> ใบรับเงินมัดจำ
              </a>
            </li>
            <li class="submenu-item">
              <a href="receipt">
                <i class="bi bi-receipt-cutoff text-red-500 mr-2"></i> ใบเสร็จรับเงิน
              </a>
            </li>
            <li class="submenu-item">
              <a href="sales_tax_invoice">
                <i class="bi bi-file-earmark-spreadsheet text-red-500 mr-2"></i> ใบกำกับภาษีขาย
              </a>
            </li>
            <li class="submenu-item">
              <a href="other_income">
                <i class="bi bi-cash-coin text-red-500 mr-2"></i> บันทึกรายได้อื่นๆ
              </a>
            </li>
            <li class="submenu-item">
              <a href="sales_debit_notee">
                <i class="bi bi-file-earmark-plus text-red-500 mr-2"></i> ใบเพิ่มหนี้
              </a>
            </li>
            <li class="submenu-item">
              <a href="sales_credit_notee">
                <i class="bi bi-file-earmark-minus text-red-500 mr-2"></i> ใบลดหนี้
              </a>
            </li>
            <li class="submenu-item">
              <a href="customer_details">
                <i class="bi bi-people text-red-500 mr-2"></i> รายละเอียดลูกหนี้
              </a>
            </li>
          </ul>
        </li>

        <!-- บัญชี -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-bank text-blue-600 mr-2"></i> บัญชี
            <i class="bi bi-caret-down-fill text-blue-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item">
              <a href="chart_of_accounts">
                <i class="bi bi-diagram-3-fill text-blue-500 mr-2"></i> ผังบัญชี
              </a>
            </li>
            <!-- ลงประจำวัน (Nested Dropdown) -->
            <li tabindex="0" class="submenu-item dropdown">
              <a href="javascript:void(0);" class="flex justify-between items-center w-full text-gray-700">
                <i class="bi bi-journal-text text-blue-500 mr-2"></i> ลงประจำวัน
                <i class="bi bi-caret-right-fill text-blue-500 ml-auto"></i>
              </a>
              <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
                <li class="submenu-item">
                  <a href="journal_general">
                    <i class="bi bi-journal-text text-blue-500 mr-2"></i> สมุดรายวันทั่วไป
                  </a>
                </li>
                <li class="submenu-item">
                  <a href="journal_payment">
                    <i class="bi bi-journal-text text-blue-500 mr-2"></i> สมุดรายวันจ่าย
                  </a>
                </li>
                <li class="submenu-item">
                  <a href="journal_receipt">
                    <i class="bi bi-journal-text text-blue-500 mr-2"></i> สมุดรายวันรับ
                  </a>
                </li>
                <li class="submenu-item">
                  <a href="journal_sales">
                    <i class="bi bi-journal-text text-blue-500 mr-2"></i> สมุดรายวันขาย
                  </a>
                </li>
                <li class="submenu-item">
                  <a href="journal_purchase">
                    <i class="bi bi-journal-text text-blue-500 mr-2"></i> สมุดรายวันซื้อ
                  </a>
                </li>
              </ul>
            </li>
            <li class="submenu-item">
              <a href="cash_flow">
                <i class="bi bi-cash text-blue-500 mr-2"></i> งบกระแสเงินสด
              </a>
            </li>
            <li class="submenu-item">
              <a href="social_security">
                <i class="bi bi-shield-check text-blue-500 mr-2"></i> ภาษีและประกันสังคม
              </a>
            </li>
            <li class="submenu-item">
              <a href="assets">
                <i class="bi bi-collection-fill text-blue-500 mr-2"></i> สินทรัพย์
              </a>
            </li>
            <li class="submenu-item">
              <a href="capital">
                <i class="bi bi-piggy-bank text-blue-500 mr-2"></i> ทุน
              </a>
            </li>
          </ul>
        </li>

        <!-- การเงิน -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-currency-exchange text-teal-600 mr-2"></i> การเงิน
            <i class="bi bi-caret-down-fill text-teal-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item">
              <a href="cash_management">
                <i class="bi bi-wallet2 text-teal-500 mr-2"></i> การจัดการเงินสด
              </a>
            </li>
            <li class="submenu-item">
              <a href="bank_reconciliation">
                <i class="bi bi-bank text-teal-500 mr-2"></i> กระทบยอดธนาคาร
              </a>
            </li>
            <li class="submenu-item">
              <a href="loan_management">
                <i class="bi bi-cash-coin text-teal-500 mr-2"></i> การจัดการเงินกู้
              </a>
            </li>
            <li class="submenu-item">
              <a href="investment_management">
                <i class="bi bi-bar-chart text-teal-500 mr-2"></i> การจัดการการลงทุน
              </a>
            </li>
            <li class="submenu-item">
              <a href="cash_flow_planning">
                <i class="bi bi-calendar3-range text-teal-500 mr-2"></i> วางแผนกระแสเงินสด
              </a>
            </li>
            <li class="submenu-item">
              <a href="received_checks">
                <i class="bi bi-receipt text-teal-500 mr-2"></i> เช็ครับ
              </a>
            </li>
            <li class="submenu-item">
              <a href="issued_checks">
                <i class="bi bi-journal-check text-teal-500 mr-2"></i> เช็คจ่าย
              </a>
            </li>
            <li class="submenu-item">
              <a href="withholding_tax_received">
                <i class="bi bi-file-earmark-minus text-teal-500 mr-2"></i> ภาษีถูกหัก ณ ที่จ่าย
              </a>
            </li>
            <li class="submenu-item">
              <a href="withholding_tax_paid">
                <i class="bi bi-file-earmark-plus text-teal-500 mr-2"></i> ภาษีหัก ณ ที่จ่าย
              </a>
            </li>
          </ul>
        </li>

        <!-- สินค้า -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-box-seam text-amber-600 mr-2"></i> สินค้า
            <i class="bi bi-caret-down-fill text-amber-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item">
              <a href="product_details">
                <i class="bi bi-info-circle text-amber-500 mr-2"></i> รายละเอียดสินค้า
              </a>
            </li>
            <li class="submenu-item">
              <a href="service_details">
                <i class="bi bi-briefcase text-amber-500 mr-2"></i> รายละเอียดบริการ
              </a>
            </li>
            <li class="submenu-item">
              <a href="product_movements">
                <i class="bi bi-arrow-left-right text-amber-500 mr-2"></i> รายการเคลื่อนไหวสินค้า
              </a>
            </li>
            <li class="submenu-item">
              <a href="opening_inventory">
                <i class="bi bi-box-arrow-in-left text-amber-500 mr-2"></i> สินค้าคงเหลือต้นงวด
              </a>
            </li>
            <li class="submenu-item">
              <a href="closing_inventory">
                <i class="bi bi-box-arrow-right text-amber-500 mr-2"></i> สินค้าคงเหลือปลายงวด
              </a>
            </li>
          </ul>
        </li>

        <!-- รายงาน -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-folder2 text-cyan-600 mr-2"></i> รายงาน
            <i class="bi bi-caret-down-fill text-cyan-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item">
              <a href="inventory_report">
                <i class="bi bi-box-seam text-cyan-500 mr-2"></i> รายงานสินค้าคงเหลือ
              </a>
            </li>
            <li class="submenu-item">
              <a href="purchase_summary_report"><i class="bi bi-cart-check text-cyan-500 mr-2"></i> รายงานสรุปยอดซื้อ</a>
            </li>
            <li class="submenu-item">
              <a href="sales_summary_report"><i class="bi bi-bar-chart text-cyan-500 mr-2"></i> รายงานสรุปยอดขาย</a>
            </li>
            <li class="submenu-item">
              <a href="financial_statement"><i class="bi bi-graph-up text-cyan-500 mr-2"></i> รายงานงบการเงิน</a>
            </li>
            <li class="submenu-item">
              <a href="product_cost_report"><i class="bi bi-cash-coin text-cyan-500 mr-2"></i> รายงานต้นทุนสินค้า</a>
            </li>
            <li class="submenu-item">
              <a href="customer_report"><i class="bi bi-people text-cyan-500 mr-2"></i> รายงานลูกหนี้</a>
            </li>
            <li class="submenu-item">
              <a href="supplier_report"><i class="bi bi-truck text-cyan-500 mr-2"></i> รายงานเจ้าหนี้</a>
            </li>
            <li class="submenu-item">
              <a href="trial_balance">
                <i class="bi bi-list-ul text-cyan-500 mr-2"></i> รายงานงบทดลอง
              </a>
            </li>
            <li class="submenu-item">
              <a href="financial_position">
                <i class="bi bi-columns-gap text-cyan-500 mr-2"></i> รายงานงบฐานะการเงิน
              </a>
            </li>
            <li class="submenu-item">
              <a href="income_statement">
                <i class="bi bi-cash-stack text-cyan-500 mr-2"></i> รายงานงบกำไรขาดทุน
              </a>
            </li>
            <li class="submenu-item">
              <a href="cash_flow">
                <i class="bi bi-cash text-cyan-500 mr-2"></i> รายงานงบกระแสเงินสด
              </a>
            </li>
            <li class="submenu-item">
              <a href="general_ledger">
                <i class="bi bi-journal-text text-cyan-500 mr-2"></i> รายงานบัญชีแยกประเภท
              </a>
            </li>
            <!-- รายงานภาษี (Nested Dropdown) -->
            <li tabindex="0" class="submenu-item dropdown">
              <a href="javascript:void(0);" class="flex justify-between items-center w-full text-gray-700">
                <i class="bi bi-receipt text-cyan-500 mr-2"></i> รายงานภาษี
                <i class="bi bi-caret-right-fill text-cyan-500 ml-auto"></i>
              </a>
              <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
                <!-- ภาษีมูลค่าเพิ่ม (Deeper Nested Dropdown) -->
                <li tabindex="0" class="submenu-item dropdown">
                  <a href="javascript:void(0);" class="flex justify-between items-center w-full text-gray-700">
                    ภาษีมูลค่าเพิ่ม
                    <i class="bi bi-caret-right-fill text-cyan-500 ml-auto"></i>
                  </a>
                  <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
                    <li class="submenu-item">
                      <a href="vat_purchase_report">
                        <i class="bi bi-arrow-down-circle text-cyan-500 mr-2"></i> ภาษีซื้อ
                      </a>
                    </li>
                    <li class="submenu-item">
                      <a href="vat_sales_report">
                        <i class="bi bi-arrow-up-circle text-cyan-500 mr-2"></i> ภาษีขาย
                      </a>
                    </li>
                  </ul>
                </li>
                <li class="submenu-item">
                  <a href="withholding_tax_report">
                    <i class="bi bi-currency-exchange text-cyan-500 mr-2"></i> ภาษีหัก ณ ที่จ่าย
                  </a>
                </li>
              </ul>
            </li>
            <li class="submenu-item">
              <a href="sales_analysis_report"><i class="bi bi-bar-chart-line text-cyan-500 mr-2"></i> รายงานวิเคราะห์การขาย</a>
            </li>
            <li class="submenu-item">
              <a href="purchase_analysis_report"><i class="bi bi-graph-up-arrow text-cyan-500 mr-2"></i> รายงานวิเคราะห์การซื้อ</a>
            </li>
          </ul>
        </li>

        <!-- ตั้งค่า -->
        <li tabindex="0" class="dropdown">
          <a class="flex justify-between items-center px-4 py-2 text-gray-800">
            <i class="bi bi-gear-fill text-slate-600 mr-2"></i> ตั้งค่า
            <i class="bi bi-caret-down-fill text-slate-600 ml-1"></i>
          </a>
          <ul class="p-2 bg-base-100 shadow-lg rounded-lg">
            <li class="submenu-item"><a href="organization_settings"><i class="bi bi-building text-slate-500 mr-2"></i> ตั้งค่าองค์กร</a></li>
            <li class="submenu-item"><a href="user_settings"><i class="bi bi-person-gear text-slate-500 mr-2"></i> ตั้งค่าผู้ใช้งาน</a></li>
            <li class="submenu-item"><a href="addBranch"><i class="bi bi-person-gear text-slate-500 mr-2"></i> เพิ่มสาขา</a></li>
            <li class="submenu-item"><a href="document_settings"><i class="bi bi-file-earmark-text text-slate-500 mr-2"></i> ตั้งค่าเอกสาร</a></li>
            <li class="submenu-item"><a href="accounting_policy"><i class="bi bi-shield-lock text-slate-500 mr-2"></i> นโยบายบัญชี</a></li>
            <li class="submenu-item"><a href="external_integration"><i class="bi bi-plug-fill text-slate-500 mr-2"></i> เชื่อมต่อภายนอก</a></li>
            <li class="submenu-item"><a href="register_accounting_firm"><i class="bi bi-journal-bookmark-fill text-slate-500 mr-2"></i> ลงทะเบียนสำนักงานบัญชี</a></li>
          </ul>
        </li>
      </ul>
    </div>
  `;

  // ฟังก์ชันสำหรับ inject เมนูเข้าไปใน container
  function injectAccountMenu(containerId) {
    console.log('🔍 Attempting to inject menu into:', containerId);
    const container = document.getElementById(containerId);

    if (!container) {
      console.error('❌ Account Menu: Container not found - ' + containerId);
      console.log('Available elements with IDs:',
        Array.from(document.querySelectorAll('[id]')).map(el => el.id).join(', '));
      return;
    }

    console.log('✅ Container found:', container);
    console.log('📝 Container current innerHTML length:', container.innerHTML.length);

    // ใส่เมนูเข้าไปใน container
    container.innerHTML = menuTemplate;

    console.log('✅ Menu template injected!');
    console.log('📊 New innerHTML length:', container.innerHTML.length);
    console.log('🎯 Menu items found:', container.querySelectorAll('.dropdown').length);
    console.log('Account Menu: Successfully injected into ' + containerId);
  }

  // Auto-inject เมื่อ DOM โหลดเสร็จ
  if (document.readyState === 'loading') {
    console.log('Account Menu: Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Account Menu: DOMContentLoaded fired, injecting menu...');
      injectAccountMenu('mainMenuContainer');
    });
  } else {
    // DOM โหลดเสร็จแล้ว
    console.log('Account Menu: DOM already loaded, injecting menu immediately...');
    injectAccountMenu('mainMenuContainer');
  }

  // Export function สำหรับใช้จากภายนอก
  window.AccountMenu = {
    inject: injectAccountMenu
  };

})();
