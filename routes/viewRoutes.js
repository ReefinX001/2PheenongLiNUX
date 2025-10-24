// File: routes/viewRoutes.js
const express = require('express');
const path = require('path');
const router = express.Router();

// helper: ส่ง HTML จากโฟลเดอร์ views
function sendView(res, ...segments) {
  return res.sendFile(path.join(__dirname, '..', 'views', ...segments));
}

router.get('/', (req, res) => sendView(res, 'FrontStore', 'frontStore.html'));
router.get('/Contact', (req, res) => sendView(res, 'FrontStore', 'Contact.html'));
router.get('/JoinUs', (req, res) => sendView(res, 'FrontStore', 'JoinUs.html'));
router.get('/Promotions', (req, res) => sendView(res, 'FrontStore', 'Promotions.html'));
router.get('/Product', (req, res) => sendView(res, 'FrontStore', 'Product.html'));
router.get('/terms', (req, res) => sendView(res, 'FrontStore', 'terms.html'));
router.get('/privacy', (req, res) => sendView(res, 'FrontStore', 'privacy.html'));

// TikTok OAuth Callback
router.get('/callback', (req, res) => {
  // ตรวจสอบว่าเป็น company callback หรือไม่จาก state
  const state = req.query.state || '';
  if (state.startsWith('company_')) {
    // redirect ไปที่ API endpoint สำหรับ company callback
    res.redirect(`/api/tiktok/company/callback?code=${req.query.code}&state=${req.query.state}`);
  } else {
    // ส่งไปหน้า callback handler ปกติ
    res.sendFile(path.join(__dirname, '..', 'views', 'FrontStore', 'tiktok-callback.html'));
  }
});

// TikTok Login Demo
router.get('/tiktok-login-demo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'FrontStore', 'tiktok-login-demo.html'));
});

// TikTok Company Admin
router.get('/tiktok-company-admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'FrontStore', 'tiktok-company-admin.html'));
});


// FrontStore Routes
router.get('/frontstore', (req, res) => sendView(res, 'FrontStore', 'frontStore.html'));
router.get('/frontstore/admin', (req, res) => sendView(res, 'FrontStore', 'frontStoreAdmin.html'));


// ====== หน้า Login / Home ======
router.get('/login', (req, res) => sendView(res, 'login.html')); // ✅ เก็บไว้เพื่อ backward compatibility
router.get('/test-login', (req, res) => res.sendFile(path.join(__dirname, '..', 'test-login.html'))); // ✅ ทดสอบระบบล็อกอิน

// ====== หน้า Root Level Pages ======
router.get('/register_supplier', (req, res) => sendView(res, 'register_supplier.html'));
router.get('/frontstore-pos-example', (req, res) => sendView(res, 'frontstore-pos-example.html'));
router.get('/frontstore-modular-example', (req, res) => sendView(res, 'frontstore-modular-example.html'));
router.get('/POHistery', (req, res) => sendView(res, 'POHistery.html'));
router.get('/cash_flow', (req, res) => sendView(res, 'cash_flow.html'));
router.get('/chart_of_accounts_root', (req, res) => sendView(res, 'chart_of_accounts.html'));
router.get('/customerList', (req, res) => sendView(res, 'customerList.html'));
router.get('/customer_detail_root', (req, res) => sendView(res, 'customer_detail.html'));
router.get('/document_library_root', (req, res) => sendView(res, 'document_library.html'));
router.get('/expense_root', (req, res) => sendView(res, 'expense.html'));
router.get('/financial_position_root', (req, res) => sendView(res, 'financial_position.html'));
router.get('/income_root', (req, res) => sendView(res, 'income.html'));
router.get('/income_statement_root', (req, res) => sendView(res, 'income_statement.html'));
router.get('/installment_payment', (req, res) => sendView(res, 'installment_payment.html'));
router.get('/invoice_all', (req, res) => sendView(res, 'invoice_all.html'));
router.get('/invoice_create_root', (req, res) => sendView(res, 'invoice_create.html'));
router.get('/invoice_paid', (req, res) => sendView(res, 'invoice_paid.html'));
router.get('/invoice_pending', (req, res) => sendView(res, 'invoice_pending.html'));
router.get('/leave_root', (req, res) => sendView(res, 'leave.html'));
router.get('/products_root', (req, res) => sendView(res, 'products.html'));
router.get('/purchase_order_root', (req, res) => sendView(res, 'purchase_order.html'));
router.get('/refund', (req, res) => sendView(res, 'refund.html'));
router.get('/Salaries', (req, res) => sendView(res, 'Salaries.html'));
router.get('/test-branch-system', (req, res) => sendView(res, 'test-branch-system.html'));
router.get('/expense_entry_root', (req, res) => sendView(res, 'expense_entry.htm'));

// ====== หน้า BOSS ======
router.get('/home', (req, res) => sendView(res, 'BOSS', 'home.html'));
router.get('/employee_only', (req, res) => sendView(res, 'employee_only.html'));
router.get('/Bonusdetail', (req, res) => sendView(res, 'Bonusdetail.html'));
router.get('/price_adjustment', (req, res) => sendView(res, 'BOSS', 'price_adjustment.html'));
router.get('/online-blocked-users', (req, res) => sendView(res, 'BOSS', 'online-blocked-users.html'));
router.get('/Login_Management', (req, res) => sendView(res, 'BOSS', 'Login_Management.html'));
router.get('/audit_log', (req, res) => sendView(res, 'BOSS', 'audit_log.html'));
router.get('/audit-logs', (req, res) => sendView(res, 'BOSS', 'audit-logs.html'));
router.get('/audit-log-single', (req, res) => sendView(res, 'BOSS', 'audit-log.html'));
router.get('/sales', (req, res) => sendView(res, 'BOSS', 'sales.html'));
router.get('/customers', (req, res) => sendView(res, 'BOSS', 'customers.html'));
router.get('/stock', (req, res) => sendView(res, 'BOSS', 'stock.html'));
router.get('/orders', (req, res) => sendView(res, 'BOSS', 'orders.html'));
router.get('/profile', (req, res) => sendView(res, 'BOSS', 'profile.html'));
router.get('/password_change', (req, res) => sendView(res, 'BOSS', 'password_change.html'));
router.get('/dashboard', (req, res) => sendView(res, 'BOSS', 'dashboard.html'));
router.get('/home-modular-example', (req, res) => sendView(res, 'BOSS', 'home-modular-example.html'));
router.get('/home-with-modular-notifications', (req, res) => sendView(res, 'BOSS', 'home-with-modular-notifications.html'));
router.get('/boss_settings', (req, res) => sendView(res, 'BOSS', 'settings.html'));

// ====== Mobile Signature ======
router.get('/mobile-signature/:sessionId', (req, res) => sendView(res, 'mobile-signature.html'));
router.get('/qr-signature-demo', (req, res) => sendView(res, 'qr-signature-demo.html'));

// ====== Frontstore Pattani ======
router.get('/pattani_home', (req, res) => sendView(res, 'pattani', 'frontstore_pattani.html'));
router.get('/frontstore_pattani', (req, res) => sendView(res, 'pattani', 'frontstore_pattani.html'));
router.get('/Addproduct_pattani', (req, res) => sendView(res, 'pattani', 'Addproduct_pattani.html'));
router.get('/HistoryReceipt', (req, res) => sendView(res, 'pattani', 'HistoryReceipt.html'));
router.get('/installment_Pattani', (req, res) => sendView(res, 'pattani', 'installment_Pattani.html'));
router.get('/History_installment', (req, res) => sendView(res, 'pattani', 'History_installment.html'));
router.get('/Quotationn', (req, res) => sendView(res, 'pattani', 'Quotationn.html'));
router.get('/Invoicee', (req,res) => sendView(res, 'pattani','Invoicee.html'));
router.get('/step1', (req,res) => sendView(res, 'pattani','installment','step1','step1.html'));
router.get('/step2', (req,res) => sendView(res, 'pattani','installment','step2','step2.html'));
router.get('/step3', (req,res) => sendView(res, 'pattani','installment','step3','step3.html'));
router.get('/step4', (req,res) => sendView(res, 'pattani','installment','step4','step4.html'));

router.get('/payment_vouchers', (req, res) => sendView(res, 'pattani', 'payment_vouchers.html'));

// Legacy redirect for old filename (backward compatibility)
router.get('/DepositReceiptt', (req, res) => res.redirect('/DepositReceipt'));

// Current route
router.get('/DepositReceipt', (req,res) => sendView(res, 'pattani','DepositReceipt.html'));

// Deposit Receipt Invoice/Receipt (ใบเสร็จรับเงิน/ใบกำกับภาษีสำหรับใบรับเงินมัดจำ)
router.get('/DepositReceiptInvoice', (req,res) => sendView(res, 'pattani','DepositReceiptInvoice.html'));

// Deposit Receipt Quotation (ใบเสนอราคาสำหรับใบรับเงินมัดจำ)
router.get('/DepositReceiptQuotation', (req,res) => sendView(res, 'pattani','DepositReceiptQuotation.html'));

// Quotation PDF (ใบเสนอราคา PDF)
router.get('/QuotationnPDF', (req,res) => sendView(res, 'pattani','PDF','QuotationnPDF.html'));

router.get('/services', (req,res) => sendView(res, 'pattani','services.html'));
router.get('/receiptVoucher', (req,res) => sendView(res, 'pattani','receiptVoucher.html'));
router.get('/productTransfer', (req,res) => sendView(res, 'pattani','productTransfer.html'));
router.get('/TransferPDF', (req,res) => sendView(res, 'pattani','PDF','TransferPDF.html'));
router.get('/DepositReceiptPDF', (req,res) => sendView(res, 'pattani','PDF','DepositReceiptPDF.html'));
router.get('/ReceiptTaxInvoicePDF', (req,res) => sendView(res, 'pattani','PDF','ReceiptTaxInvoicePDF.html'));
router.get('/DeliveryNote', (req,res) => sendView(res, 'pattani','PDF','DeliveryNote.html'));
router.get('/DeliveryNotePDF', (req,res) => sendView(res, 'pattani','PDF','DeliveryNotePDF.html'));
router.get('/DeliveryNoteList', (req,res) => sendView(res, 'pattani','DeliveryNoteList.html'));
router.get('/CreditNote', (req,res) => sendView(res, 'pattani','CreditNote.html'));
router.get('/CreditNoteSimple', (req,res) => sendView(res, 'pattani','CreditNoteSimple.html'));
router.get('/DebitNoteSimple', (req,res) => sendView(res, 'pattani','DebitNoteSimple.html'));
router.get('/Installment_on_use', (req,res) => sendView(res, 'pattani','Installment_on_use.html'));
router.get('/Installment_complete_pickup', (req,res) => sendView(res, 'pattani','Installment_complete_pickup.html'));
router.get('/payment_installments_Pattani', (req,res) => sendView(res, 'pattani','payment_installments_Pattani.html'));
router.get('/management', (req,res) => sendView(res, 'pattani','management.html'));
router.get('/addNewProduct_pattani', (req,res) => sendView(res, 'pattani','addNewProduct_pattani.html'));
router.get('/stock_deduction_Pattani', (req,res) => sendView(res, 'pattani','stock_deduction_Pattani.html'));
router.get('/pattani_inventory_dashboard', (req,res) => sendView(res, 'pattani','inventory_dashboard.html'));
router.get('/quick_sale_pattani', (req,res) => sendView(res, 'pattani','quick_sale_pattani.html'));
router.get('/po-creation', (req,res) => sendView(res, 'pattani','po-creation.html'));

router.get('/stock-adjust', (req,res) => sendView(res, 'pattani','stock-adjust.html'));
router.get('/points_system', (req,res) => sendView(res, 'pattani','points_system.html')); // Points System

// เพิ่มเส้นทางสำหรับไฟล์ที่ยังไม่ได้ลงทะเบียน
router.get('/installment', (req,res) => sendView(res, 'pattani','installment.html'));
router.get('/createBoxset_pattani', (req,res) => sendView(res, 'pattani','createBoxset_pattani.html'));
router.get('/points_system_new', (req,res) => sendView(res, 'pattani','points_system_new.html'));
router.get('/payment_page', (req,res) => sendView(res, 'pattani','payment_page.html'));

// Voucher Menu - ใบสำคัญรับ-จ่าย
router.get('/voucher_menu', (req,res) => sendView(res, 'pattani','voucher_menu.html'));

// Points System Test Page
router.get('/test-points-system', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'test-points-system.html'));
});


// ====== หน้า Accounting ======
router.get('/frontstore_index', (req, res) => sendView(res, 'frontstore_index.html'));
router.get('/report_dashboard', (req, res) => sendView(res, 'account', 'report_dashboard.html'));
router.get('/bookkeeping_report', (req, res) => sendView(res, 'account', 'bookkeeping_report.html'));
router.get('/chart_of_accounts', (req, res) => sendView(res, 'account', 'chart_of_accounts.html'));

// ====== หน้า Loan ======
router.get('/loan_dashboard', (req, res) => sendView(res, 'loan', 'loan_dashboard.html'));
router.get('/repayment', (req, res) => sendView(res, 'loan', 'repayment.html'));
router.get('/installment_history', (req, res) => sendView(res, 'loan', 'installment_history.html'));
router.get('/customer', (req, res) => sendView(res, 'loan', 'customer.html'));
router.get('/customerDetail', (req, res) => sendView(res, 'loan', 'customerDetail.html'));
router.get('/status', (req, res) => sendView(res, 'loan', 'status.html'));
router.get('/bad_debt_management', (req, res) => sendView(res, 'loan', 'bad_debt_management.html'));
router.get('/bad_debt_criteria', (req, res) => sendView(res, 'loan', 'bad_debt_criteria.html'));
router.get('/costs_expenses', (req, res) => sendView(res, 'loan', 'costs_expenses.html'));
router.get('/debtors', (req, res) => sendView(res, 'loan', 'debtors.html'));
router.get('/tax', (req, res) => sendView(res, 'loan', 'tax.html'));
router.get('/deposits', (req, res) => sendView(res, 'loan', 'deposits.html'));
router.get('/credit-approved', (req, res) => sendView(res, 'loan', 'credit-approved.html'));
router.get('/claim-items', (req, res) => sendView(res, 'loan', 'claim-items.html'));
router.get('/stock_deduction', (req, res) => sendView(res, 'loan', 'stock_deduction.html'));

// ====== Backward Compatibility Routes ======
// Redirect loans.html to status page for backward compatibility
router.get('/loans.html', (req, res) => res.redirect('/status'));

// ====== Employee App ======

// Login page
router.get('/employee/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'employeeApp', 'login.html'));
});

router.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'employeeApp', 'index.html'));
});

router.get('/check', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'employeeApp', 'check.html'));
});

router.get('/leave', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'employeeApp', 'leave.html'));
});

router.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'employeeApp', 'settings.html'));
});

// ====== หน้า HR ======
router.get('/HR_Dashboard', (req, res) => sendView(res, 'HR', 'HR_Dashboard.html'));
router.get('/attendance', (req, res) => sendView(res, 'HR', 'attendance.html'));
router.get('/bonus_list', (req, res) => sendView(res, 'HR', 'bonus_list.html'));
router.get('/employee_directory', (req, res) => sendView(res, 'HR', 'employee_directory.html'));
router.get('/employee', (req, res) => sendView(res, 'HR', 'employee.html'));
router.get('/payroll', (req, res) => sendView(res, 'HR', 'payroll.html'));
router.get('/performance_reviews', (req, res) => sendView(res, 'HR', 'performance_reviews.html'));
router.get('/training', (req, res) => sendView(res, 'HR', 'training.html'));
router.get('/leave_requests', (req, res) => sendView(res, 'HR', 'leave_requests.html'));
router.get('/notifications', (req, res) => sendView(res, 'HR', 'notifications.html'));
router.get('/announcements', (req, res) => sendView(res, 'HR', 'announcements.html'));
router.get('/settings', (req, res) => sendView(res, 'HR', 'settings.html'));
router.get('/role_management', (req, res) => sendView(res, 'HR', 'role_management.html'));
router.get('/employee_detail', (req, res) => sendView(res, 'HR', 'employee_detail.html'));
router.get('/register_user', (req, res) => sendView(res, 'HR', 'register_user.html'));
router.get('/calendar', (req, res) => sendView(res, 'HR', 'calendar.html'));
router.get('/reports', (req, res) => sendView(res, 'HR', 'reports.html'));

router.get('/gifts_dashboard', (req, res) => sendView(res, 'gifts', 'gifts_dashboard.html'));
router.get('/inventory', (req, res) => sendView(res, 'gifts', 'inventory.html'));
router.get('/order_history', (req, res) => sendView(res, 'gifts', 'order_history.html'));
router.get('/costs', (req, res) => sendView(res, 'gifts', 'costs.html'));


 // prefix เดียวกันกับลิงก์ใน HTML: /HR/App/New
 // prefix เดียวกันกับลิงก์ใน HTML: /HR/App/New
 const appNewPrefix = '/HR/App/New';

 router.get(`${appNewPrefix}/dashboard`,     (req, res) => sendView(res, 'HR', 'App', 'New', 'dashboard.html'));
 router.get(`${appNewPrefix}/categories`,    (req, res) => sendView(res, 'HR', 'App', 'New', 'categories.html'));
 router.get(`${appNewPrefix}/news-management`, (req, res) => sendView(res, 'HR', 'App', 'New', 'news-management.html'));
 router.get(`${appNewPrefix}/settings`,      (req, res) => sendView(res, 'HR', 'App', 'New', 'settings.html'));



// ====== Marketing ======
router.get('/marketing_dashboard', (req, res) => sendView(res, 'marketing', 'marketing_dashboard.html'));
router.get('/Customers_marketing', (req, res) => sendView(res, 'marketing', 'Customers_marketing.html'));
router.get('/Products_marketing.html', (req, res) => sendView(res, 'marketing', 'Products_marketing.html'));
router.get('/campaigns', (req, res) => sendView(res, 'marketing', 'campaigns.html'));
router.get('/analytics', (req, res) => sendView(res, 'marketing', 'analytics.html'));
router.get('/content_management', (req, res) => sendView(res, 'marketing', 'content_management.html'));
router.get('/social_media', (req, res) => sendView(res, 'marketing', 'social_media.html'));
router.get('/email_marketing', (req, res) => sendView(res, 'marketing', 'email_marketing.html'));
router.get('/seo_tools', (req, res) => sendView(res, 'marketing', 'seo_tools.html'));
router.get('/customer_data', (req, res) => sendView(res, 'marketing', 'customer_data.html'));
router.get('/budget_reports', (req, res) => sendView(res, 'marketing', 'budget_reports.html'));
router.get('/marketing_settings', (req, res) => sendView(res, 'marketing', 'marketing_settings.html'));
router.get('/Promotion', (req, res) => sendView(res, 'marketing', 'Promotion.html'));

// ====== Stock ======
router.get('/inventory_dashboard', (req, res) => sendView(res, 'Stock', 'inventory_dashboard.html'));
router.get('/PO', (req, res) => sendView(res, 'Stock', 'PO.html'));
router.get('/product_Image', (req, res) => sendView(res, 'Stock', 'product_Image.html'));
router.get('/product_Image_mock', (req, res) => sendView(res, 'Stock', 'product_Image.mock.html'));
router.get('/Transfer', (req, res) => sendView(res, 'Stock', 'Transfer.html'));
router.get('/StockManagehome', (req, res) => sendView(res, 'Stock', 'StockManagehome.html'));
router.get('/StockAdditional', (req, res) => sendView(res, 'Stock', 'StockAdditional.html'));
router.get('/quotation_Stock', (req, res) => sendView(res, 'Stock', 'quotation_Stock.html'));
router.get('/branch_stock_overview', (req, res) => sendView(res, 'Stock', 'branch_stock_overview.html'));
router.get('/PO_Report', (req, res) => sendView(res, 'Stock', 'PO_Report.html'));
router.get('/backdated_purchase_order', (req, res) => sendView(res, 'Stock', 'backdated_purchase_order.html'));

// ====== Stock Additional Pages ======
router.get('/PurchaseCreditNote', (req, res) => sendView(res, 'Stock', 'PurchaseCreditNote.html'));
router.get('/PurchaseDebitNote', (req, res) => sendView(res, 'Stock', 'PurchaseDebitNote.html'));


// ====== Account Pages (เพิ่มเติม) ======
router.get('/accounting_dashboard', (req, res) => sendView(res, 'account', 'accounting_dashboard.html'));
router.get('/asset_order', (req, res) => sendView(res, 'account', 'asset_order.html'));
router.get('/billing_note', (req, res) => sendView(res, 'account', 'billing_note.html'));
router.get('/billing', (req, res) => sendView(res, 'account', 'billing.html'));
router.get('/credit_note', (req, res) => sendView(res, 'account', 'credit_note.html'));
router.get('/debit_note', (req, res) => sendView(res, 'account', 'debit_note.html'));
router.get('/deposit_receipt', (req, res) => sendView(res, 'account', 'deposit_receipt.html'));
router.get('/expense_record', (req, res) => sendView(res, 'account', 'expense_record.html'));
router.get('/invoice', (req, res) => sendView(res, 'account', 'invoice.html'));
router.get('/quotation', (req, res) => sendView(res, 'account', 'quotation.html'));
router.get('/tax_invoice', (req, res) => sendView(res, 'account', 'tax_invoice.html'));
router.get('/trial_balance', (req, res) => sendView(res, 'account', 'trial_balance.html'));
router.get('/income_overview', (req, res) => sendView(res, 'account', 'income_overview.html'));
router.get('/receipt', (req, res) => sendView(res, 'account', 'receipt.html'));
router.get('/import_documents', (req, res) => sendView(res, 'account', 'import_documents.html'));
router.get('/deposit_payment', (req, res) => sendView(res, 'account', 'deposit_payment.html'));
router.get('/expense_overview', (req, res) => sendView(res, 'account', 'expense_overview.html'));
router.get('/sales_overview', (req, res) => sendView(res, 'account', 'sales_overview.html'));
router.get('/management_overview', (req, res) => sendView(res, 'account', 'management_overview.html'));
router.get('/purchase_order', (req, res) => sendView(res, 'account', 'purchase_order.html'));
router.get('/asset_purchase', (req, res) => sendView(res, 'account', 'asset_purchase.html'));
router.get('/receive_credit_note', (req, res) => sendView(res, 'account', 'receive_credit_note.html'));
router.get('/payment_summary', (req, res) => sendView(res, 'account', 'payment_summary.html'));
router.get('/journal', (req, res) => sendView(res, 'account', 'journal.html'));
router.get('/general_ledger', (req, res) => sendView(res, 'account', 'general_ledger.html'));
router.get('/contacts', (req, res) => sendView(res, 'account', 'contacts.html'));
router.get('/dbd_efiling', (req, res) => sendView(res, 'account', 'dbd_efiling.html'));
router.get('/purchase_tax_invoice', (req, res) => sendView(res, 'account', 'purchase_tax_invoice.html'));
router.get('/receive_debit_note', (req, res) => sendView(res, 'account', 'receive_debit_note.html'));
router.get('/document_library', (req, res) => sendView(res, 'account', 'document_library.html'));
router.get('/products', (req, res) => sendView(res, 'account', 'products.html'));
router.get('/expense_entry', (req, res) => sendView(res, 'account', 'expense_entry.html'));
router.get('/financial_position', (req, res) => sendView(res, 'account', 'financial_position.html'));
router.get('/contacts_new', (req, res) => sendView(res, 'account', 'contacts_new.html'));
router.get('/income_statement', (req, res) => sendView(res, 'account', 'income_statement.html'));
router.get('/cash_flow', (req, res) => sendView(res, 'account', 'cash_flow.html'));
router.get('/units', (req, res) => sendView(res, 'account', 'units.html'));
router.get('/consolidated_payment', (req, res) => sendView(res, 'account', 'consolidated_payment.html'));
router.get('/chart_of_accountss', (req, res) => sendView(res, 'account', 'chart_of_accountss.html'));
router.get('/assets', (req, res) => sendView(res, 'account', 'assets.html'));
router.get('/cash_purchase', (req, res) => sendView(res, 'account', 'cash_purchase.html'));
router.get('/purchase_product', (req, res) => sendView(res, 'account', 'purchase_product.html'));
router.get('/payment_voucher', (req, res) => sendView(res, 'account', 'payment_voucher.html'));
router.get('/sales_tax_invoice', (req, res) => sendView(res, 'account', 'sales_tax_invoice.html'));
router.get('/sales_debit_note', (req, res) => sendView(res, 'account', 'sales_debit_note.html'));
router.get('/other_income', (req, res) => sendView(res, 'account', 'other_income.html'));
router.get('/product_details', (req, res) => sendView(res, 'account', 'product_details.html'));
router.get('/service_details', (req, res) => sendView(res, 'account', 'service_details.html'));
router.get('/opening_inventory', (req, res) => sendView(res, 'account', 'opening_inventory.html'));
router.get('/closing_inventory', (req, res) => sendView(res, 'account', 'closing_inventory.html'));
router.get('/cash_management', (req, res) => sendView(res, 'account', 'cash_management.html'));
router.get('/bank_reconciliation', (req, res) => sendView(res, 'account', 'bank_reconciliation.html'));
router.get('/loan_management', (req, res) => sendView(res, 'account', 'loan_management.html'));
router.get('/investment_management', (req, res) => sendView(res, 'account', 'investment_management.html'));
router.get('/received_checks', (req, res) => sendView(res, 'account', 'received_checks.html'));
router.get('/issued_checks', (req, res) => sendView(res, 'account', 'issued_checks.html'));
router.get('/withholding_tax_received', (req, res) => sendView(res, 'account', 'withholding_tax_received.html'));
router.get('/withholding_tax_paid', (req, res) => sendView(res, 'account', 'withholding_tax_paid.html'));
router.get('/inventory_report', (req, res) => sendView(res, 'account', 'inventory_report.html'));
router.get('/purchase_summary_report', (req, res) => sendView(res, 'account', 'purchase_summary_report.html'));
router.get('/financial_statement_report', (req, res) => sendView(res, 'account', 'financial_statement_report.html'));
router.get('/product_cost_report', (req, res) => sendView(res, 'account', 'product_cost_report.html'));
router.get('/customer_report', (req, res) => sendView(res, 'account', 'customer_report.html'));
router.get('/supplier_report', (req, res) => sendView(res, 'account', 'supplier_report.html'));
router.get('/cost_of_goods_report', (req, res) => sendView(res, 'account', 'cost_of_goods_report.html'));
router.get('/warehouse_inventory_report', (req, res) => sendView(res, 'account', 'warehouse_inventory_report.html'));
router.get('/vat_purchase_report', (req, res) => sendView(res, 'account', 'vat_purchase_report.html'));
router.get('/vat_sales_report', (req, res) => sendView(res, 'account', 'vat_sales_report.html'));
router.get('/sales_analysis_report', (req, res) => sendView(res, 'account', 'sales_analysis_report.html'));
router.get('/purchase_analysis_report', (req, res) => sendView(res, 'account', 'purchase_analysis_report.html'));
router.get('/financial_statement', (req, res) => sendView(res, 'account', 'financial_statement.html'));
router.get('/journal_general', (req, res) => sendView(res, 'account', 'journal_general.html'));
router.get('/journal_payment', (req, res) => sendView(res, 'account', 'journal_payment.html'));
router.get('/journal_receipt', (req, res) => sendView(res, 'account', 'journal_receipt.html'));
router.get('/journal_sales', (req, res) => sendView(res, 'account', 'journal_sales.html'));
router.get('/journal_purchase', (req, res) => sendView(res, 'account', 'journal_purchase.html'));
router.get('/purchase_asset', (req, res) => sendView(res, 'account', 'purchase_asset.html'));
router.get('/supplier_details', (req, res) => sendView(res, 'account', 'supplier_details.html'));
router.get('/goods_receipt', (req, res) => sendView(res, 'account', 'goods_receipt.html'));
router.get('/sales_credit_note', (req, res) => sendView(res, 'account', 'sales_credit_note.html'));
router.get('/social_security', (req, res) => sendView(res, 'account', 'social_security.html'));
router.get('/sales_summary_report', (req, res) => sendView(res, 'account', 'sales_summary_report.html'));
router.get('/stock_movement_report', (req, res) => sendView(res, 'account', 'stock_movement_report.html'));
router.get('/sales_credit_notee', (req, res) => sendView(res, 'account', 'sales_credit_notee.html'));
router.get('/cash_flow_planning', (req, res) => sendView(res, 'account', 'cash_flow_planning.html'));
router.get('/customer_details', (req, res) => sendView(res, 'account', 'customer_details.html'));
router.get('/sales_debit_notee', (req, res) => sendView(res, 'account', 'sales_debit_notee.html'));
router.get('/addBranch', (req, res) => sendView(res, 'account', 'addBranch.html'));

// ====== Delivery Notes Management ======
router.get('/deliveryNotes', (req, res) => sendView(res, 'deliveryNotes.html'));

router.get('/promissory_notes_received', (req, res) => sendView(res, 'account', 'promissory_notes_received.html'));
router.get('/promissory_notes_payable', (req, res) => sendView(res, 'account', 'promissory_notes_payable.html'));
router.get('/product_movements', (req, res) => sendView(res, 'account', 'product_movements.html'));
router.get('/withholding_tax_report', (req, res) => sendView(res, 'account', 'withholding_tax_report.html'));
router.get('/capital', (req, res) => sendView(res, 'account', 'capital.html'));
router.get('/aging_report', (req, res) => sendView(res, 'account', 'aging_report.html'));

module.exports = router;
