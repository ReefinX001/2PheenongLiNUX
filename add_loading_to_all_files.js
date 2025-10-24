const fs = require('fs');
const path = require('path');

// รายการไฟล์ที่ต้องการเพิ่ม Loading State
const accountDir = 'views/account';
const filesToUpdate = [
  'vat_sales_report.html',
  'warehouse_inventory_report.html',
  'units.html',
  'tax_invoice.html',
  'supplier_details.html',
  'supplier_form.html',
  'social_security.html',
  'stock_movement_report.html',
  'service_details.html',
  'sales_overview.html',
  'sales_tax_invoice.html',
  'sales_debit_note.html',
  'sales_credit_note.html',
  'sales_credit_notee.html',
  'receive_credit_note.html',
  'receive_debit_note.html',
  'report_dashboard.html',
  'receipt.html',
  'received_checks.html',
  'purchase_tax_invoice.html',
  'purchase_summary_report.html',
  'purchase_order.html',
  'purchase_asset.html',
  'purchase_asset_fixed.html',
  'promissory_notes_received.html',
  'promissory_notes_payable.html',
  'product_movements.html',
  'product_cost_report_fixed.html',
  'products.html',
  'product_cost_report.html',
  'product_cost_report_api.html',
  'payment_voucher.html',
  'other_income.html',
  'payment_summary.html',
  'management_overview.html',
  'opening_inventory.html',
  'loan_management.html',
  'journal_receipt.html',
  'journal_sales.html',
  'journal_purchase.html',
  'journal_general.html',
  'journal_payment.html',
  'journal.html',
  'invoice.html',
  'issued_checks.html',
  'investment_management.html',
  'inventory_report.html',
  'import_documents.html',
  'income_overview.html',
  'goods_receipt.html',
  'goods_receipt_temp.html',
  'financial_statement_report.html',
  'financial_statement.html',
  'expense_record.html',
  'expense_entry.html',
  'expense_overview.html',
  'deposit_receipt.html',
  'document_library.html',
  'debit_note_fixed.html',
  'deposit_payment.html',
  'dbd_efiling.html',
  'customer_details.html',
  'customer_report.html',
  'cost_of_goods_report.html',
  'contacts.html',
  'contacts_new.html',
  'closing_inventory.html',
  'consolidated_payment.html',
  'cash_purchase.html',
  'chart_of_accountss.html',
  'cash_management.html',
  'cash_flow_planning.html',
  'capital.html',
  'billing_note.html',
  'bookkeeping_report.html',
  'billing.html',
  'bank_reconciliation.html',
  'asset_purchase.html',
  'asset_order.html',
  'addBranch.html',
  'aging_report.html'
];

// CDN links ที่ต้องเพิ่ม
const lottieScript = `
  <!-- Lottie Animation -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

  <!-- Animate.css -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />`;

// CSS สำหรับ Loading Overlay
const loadingCSS = `
  /* Loading overlay styles */
  .loading-overlay {
    position: fixed !important;
    top: 0 !important; 
    left: 0 !important;
    width: 100vw !important; 
    height: 100vh !important;
    background: rgba(255, 255, 255, 0.9) !important;
    display: flex !important; 
    justify-content: center !important; 
    align-items: center !important;
    z-index: 9999 !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    pointer-events: auto !important;
  }

  .w-96 { width: 24rem !important; }
  .h-96 { height: 24rem !important; }
  .mx-auto { margin-left: auto !important; margin-right: auto !important; }
  .flex { display: flex !important; }
  .items-center { align-items: center !important; }
  .justify-center { justify-content: center !important; }`;

// HTML สำหรับ Loading Overlay
const loadingHTML = `
  <!-- Loading Overlay -->
  <div id="loadingOverlay" class="loading-overlay animate__animated animate__fadeOut" style="display: none;">
    <div class="text-center">
      <div id="lottieContainer" class="w-96 h-96 mx-auto flex items-center justify-center"></div>
    </div>
  </div>`;

// JavaScript สำหรับ showLoading function
const loadingJS = `
<script>
let lottieAnimation = null;

function showLoading(show) {
  const loader = document.getElementById('loadingOverlay');
  if (show) {
    loader.style.display = 'flex';
    loader.classList.remove('animate__fadeOut');
    loader.classList.add('animate__fadeIn');
    
    if (!lottieAnimation) {
      console.log('🔄 Loading Lottie animation from /Loading/Loading.json');
      fetch('/Loading/Loading.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          return response.json();
        })
        .then(animationData => {
          lottieAnimation = lottie.loadAnimation({
            container: document.getElementById('lottieContainer'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: animationData
          });
          console.log('✅ Lottie animation loaded successfully');
        })
        .catch(error => {
          console.error('❌ Error loading Lottie animation:', error);
          document.getElementById('lottieContainer').innerHTML = '<div class="loading loading-spinner loading-lg"></div>';
        });
    } else {
      lottieAnimation.play();
    }
  } else {
    if (lottieAnimation) {
      lottieAnimation.pause();
    }
    loader.classList.remove('animate__fadeIn');
    loader.classList.add('animate__fadeOut');
    setTimeout(() => { loader.style.display = 'none'; }, 600);
  }
}

// Clean up Lottie animation on page unload
window.addEventListener('beforeunload', () => {
  if (lottieAnimation) {
    lottieAnimation.destroy();
    lottieAnimation = null;
  }
});
</script>`;

function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. เพิ่ม Lottie และ Animate.css CDN
    if (!content.includes('lottie-web') && content.includes('Bootstrap Icons')) {
      content = content.replace(
        /<!-- Bootstrap Icons -->\s*<link rel="stylesheet" href="[^"]*bootstrap-icons[^"]*" crossorigin \/>/,
        `<!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" crossorigin />${lottieScript}`
      );
      modified = true;
    }

    // 2. เพิ่ม CSS และ Loading HTML
    if (!content.includes('loading-overlay') && content.includes('</head>')) {
      content = content.replace(
        /(.*)<\/head>\s*<body[^>]*>/s,
        `$1${loadingCSS}
  </style>
</head>

<body class="bg-white dark:bg-gray-900 dark:text-white w-full h-screen">${loadingHTML}`
      );
      modified = true;
    }

    // 3. เพิ่ม JavaScript ก่อน </body>
    if (!content.includes('let lottieAnimation') && content.includes('</body>')) {
      content = content.replace('</body>\n</html>', `${loadingJS}

</body>
</html>`);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ Already updated: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// อัปเดตไฟล์ทั้งหมด
let updatedCount = 0;
let totalFiles = filesToUpdate.length;

console.log(`🚀 Starting to update ${totalFiles} files...`);

filesToUpdate.forEach((fileName, index) => {
  const filePath = path.join(accountDir, fileName);
  console.log(`\n📄 [${index + 1}/${totalFiles}] Processing: ${fileName}`);

  if (updateFile(filePath)) {
    updatedCount++;
  }
});

console.log(`\n🎉 Completed! Updated ${updatedCount}/${totalFiles} files.`);
