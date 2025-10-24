/**
 * Payment Form Handler for Professional Payment Interface
 * Version: 1.0.0
 * สำหรับจัดการหน้าชำระค่างวดแบบใหม่ที่ดูเป็นมืออาชีพ
 */

// Switch to payment tab
function switchToPaymentTab() {
  // Remove active from all tabs
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('tab-active'));

  // Add active to payment tab
  document.getElementById('tab-payment-form').classList.add('tab-active');

  // Hide other content sections
  document.querySelectorAll('[class*="bg-white dark:bg-gray-800 rounded-lg shadow-md"]').forEach(section => {
    if (!section.closest('#paymentFormSection')) {
      section.style.display = 'none';
    }
  });
}

// Populate payment form with contract data
function populatePaymentForm(contract) {
  // Update customer info
  document.getElementById('payment-customer-avatar').textContent = getCustomerAvatar(contract.customerName);
  document.getElementById('payment-customer-name').textContent = contract.customerName || 'ไม่ระบุ';
  document.getElementById('payment-contract-no').textContent = contract.contractNumber || currentContractId;
  document.getElementById('payment-customer-phone').textContent = contract.customerPhone || 'ไม่ระบุ';

  // Update contract status
  const statusBadge = getStatusBadge(contract);
  document.getElementById('payment-contract-status').innerHTML = statusBadge;

  // Load installment schedule
  loadInstallmentSchedule(contract);

  // Set current date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('paymentDate').value = today;

  // Reset form
  resetPaymentForm();
}

// Load installment schedule
function loadInstallmentSchedule(contract) {
  const scheduleContainer = document.getElementById('installmentSchedule');

  if (!contract.payments || contract.payments.length === 0) {
    scheduleContainer.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <i class="bi bi-calendar-x text-3xl mb-2"></i>
        <p>ไม่พบตารางการชำระ</p>
      </div>
    `;
    return;
  }

  let html = '';
  contract.payments.forEach((payment, index) => {
    const isOverdue = payment.status === 'เกินกำหนด';
    const isPaid = payment.status === 'ชำระแล้ว' || payment.status === 'ชำระล่าช้า';
    const canPay = !isPaid;

    const cardClass = isPaid ? 'paid' : (isOverdue ? 'overdue' : '');

    html += `
      <div class="installment-card border-2 border-gray-200 dark:border-gray-600 rounded-lg p-3 ${cardClass}" 
           data-installment="${index + 1}" 
           onclick="${canPay ? `selectInstallmentForPayment(${index}, '${contract._id}')` : ''}">
        <div class="flex justify-between items-start mb-2">
          <div class="font-bold text-sm">งวดที่ ${payment.installmentNumber || (index + 1)}</div>
          <div class="badge ${isPaid ? 'badge-success' : (isOverdue ? 'badge-error' : 'badge-warning')} badge-sm">
            ${payment.status || 'รอชำระ'}
          </div>
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
          ครบกำหนด: ${payment.dueDate || '-'}
        </div>
        <div class="font-bold text-lg ${isPaid ? 'text-green-600' : 'text-blue-600'}">
          ฿${(payment.amount || 0).toLocaleString()}
        </div>
        ${payment.paidDate ? `
          <div class="text-xs text-green-600 mt-1">
            ชำระเมื่อ: ${payment.paidDate}
          </div>
        ` : ''}
        ${canPay ? `
          <div class="mt-2">
            <button class="btn btn-xs btn-primary w-full">เลือกชำระ</button>
          </div>
        ` : ''}
      </div>
    `;
  });

  scheduleContainer.innerHTML = html;
}

// Select installment for payment
function selectInstallmentForPayment(index, contractId) {
  const contract = allContracts.find(c => c._id === contractId);
  if (!contract || !contract.payments || !contract.payments[index]) return;

  const payment = contract.payments[index];

  // Update selected installment info
  document.getElementById('selected-installment-number').textContent = payment.installmentNumber || (index + 1);
  document.getElementById('selected-due-date').textContent = payment.dueDate || '-';
  document.getElementById('selected-amount').textContent = `฿${(payment.amount || 0).toLocaleString()}`;
  document.getElementById('selected-status').innerHTML = `<span class="badge badge-warning">${payment.status || 'รอชำระ'}</span>`;

  // Show selected installment info
  document.getElementById('selectedInstallmentInfo').classList.remove('hidden');

  // Set amount in form
  document.getElementById('totalReceivedAmount').value = payment.amount || 0;

  // Update visual selection
  document.querySelectorAll('.installment-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-installment="${index + 1}"]`).classList.add('selected');

  // Enable submit button
  updateSubmitButtonState();

  // Show payment summary
  updatePaymentSummary();
}

// Payment method change handler
function setupPaymentMethodHandlers() {
  const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');

  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      handlePaymentMethodChange(this.value);
    });
  });
}

// Handle payment method change
function handlePaymentMethodChange(method) {
  // Hide all payment sections
  document.getElementById('cashPaymentSection').classList.add('hidden');
  document.getElementById('transferPaymentSection').classList.add('hidden');
  document.getElementById('mixedPaymentSection').classList.add('hidden');

  // Show relevant section with animation
  setTimeout(() => {
    switch (method) {
      case 'cash':
        document.getElementById('cashPaymentSection').classList.remove('hidden');
        setupCashPayment();
        break;
      case 'transfer':
        document.getElementById('transferPaymentSection').classList.remove('hidden');
        setupTransferPayment();
        break;
      case 'mixed':
        document.getElementById('mixedPaymentSection').classList.remove('hidden');
        setupMixedPayment();
        break;
    }

    updatePaymentSummary();
    updateSubmitButtonState();
  }, 100);
}

// Setup cash payment
function setupCashPayment() {
  const totalAmount = parseFloat(document.getElementById('totalReceivedAmount').value) || 0;
  document.getElementById('cashAmount').value = totalAmount;
  calculateChange();

  // Auto-calculate change when cash amount changes
  document.getElementById('cashAmount').addEventListener('input', calculateChange);
}

// Calculate change for cash payment
function calculateChange() {
  const totalAmount = parseFloat(document.getElementById('totalReceivedAmount').value) || 0;
  const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
  const change = Math.max(0, cashAmount - totalAmount);

  document.getElementById('changeAmount').value = change.toFixed(2);
  updatePaymentSummary();
}

// Setup transfer payment
function setupTransferPayment() {
  // Set current datetime for transfer time
  const now = new Date();
  const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  document.getElementById('transferTime').value = localDateTime;
}

// Setup mixed payment
function setupMixedPayment() {
  const totalAmount = parseFloat(document.getElementById('totalReceivedAmount').value) || 0;

  // Auto-distribute 50/50 as default
  const halfAmount = totalAmount / 2;
  document.getElementById('mixedCashAmount').value = halfAmount.toFixed(2);
  document.getElementById('mixedTransferAmount').value = halfAmount.toFixed(2);

  calculateMixedTotal();
}

// Calculate mixed payment total
function calculateMixedTotal() {
  const cashAmount = parseFloat(document.getElementById('mixedCashAmount').value) || 0;
  const transferAmount = parseFloat(document.getElementById('mixedTransferAmount').value) || 0;
  const total = cashAmount + transferAmount;

  // Update displays
  document.getElementById('mixedTotalDisplay').textContent = `฿${total.toLocaleString()}`;
  document.getElementById('mixedCashDisplay').textContent = `฿${cashAmount.toLocaleString()}`;
  document.getElementById('mixedTransferDisplay').textContent = `฿${transferAmount.toLocaleString()}`;

  // Update total received amount
  document.getElementById('totalReceivedAmount').value = total.toFixed(2);

  updatePaymentSummary();
  updateSubmitButtonState();
}

// Update payment summary
function updatePaymentSummary() {
  const installmentAmount = parseFloat(document.getElementById('selected-amount').textContent.replace(/[฿,]/g, '')) || 0;
  const receivedAmount = parseFloat(document.getElementById('totalReceivedAmount').value) || 0;
  const difference = receivedAmount - installmentAmount;

  document.getElementById('summary-installment-amount').textContent = `฿${installmentAmount.toLocaleString()}`;
  document.getElementById('summary-received-amount').textContent = `฿${receivedAmount.toLocaleString()}`;
  document.getElementById('summary-difference').textContent = `฿${difference.toLocaleString()}`;

  // Update status and color
  const summaryDifference = document.getElementById('summary-difference');
  const summaryStatus = document.getElementById('summary-status');

  if (Math.abs(difference) < 0.01) {
    summaryDifference.className = 'text-lg font-bold text-green-600';
    summaryStatus.className = 'badge badge-success';
    summaryStatus.textContent = 'ครบถ้วน';
  } else if (difference > 0) {
    summaryDifference.className = 'text-lg font-bold text-blue-600';
    summaryStatus.className = 'badge badge-info';
    summaryStatus.textContent = 'เกินยอด';
  } else {
    summaryDifference.className = 'text-lg font-bold text-red-600';
    summaryStatus.className = 'badge badge-error';
    summaryStatus.textContent = 'ไม่ครบ';
  }

  // Show summary
  document.getElementById('paymentSummary').classList.remove('hidden');
}

// Update submit button state
function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitPaymentForm');
  const selectedInstallment = document.getElementById('selected-installment-number').textContent;
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
  const receivedAmount = parseFloat(document.getElementById('totalReceivedAmount').value) || 0;

  const isValid = selectedInstallment !== '-' && paymentMethod && receivedAmount > 0;

  submitBtn.disabled = !isValid;
  submitBtn.classList.toggle('btn-disabled', !isValid);
}

// Reset payment form
function resetPaymentForm() {
  // Reset form fields
  document.getElementById('newPaymentForm').reset();

  // Hide sections
  document.getElementById('selectedInstallmentInfo').classList.add('hidden');
  document.getElementById('paymentSummary').classList.add('hidden');
  document.querySelectorAll('.payment-section').forEach(section => {
    section.classList.add('hidden');
  });

  // Reset payment method selection
  document.querySelectorAll('.payment-method-radio').forEach(radio => {
    radio.checked = false;
  });

  // Reset installment selection
  document.querySelectorAll('.installment-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Disable submit button
  updateSubmitButtonState();
}

// Close payment form
function closePaymentForm() {
  // Hide payment form section
  document.getElementById('paymentFormSection').classList.add('hidden');

  // Hide payment tab
  document.getElementById('tab-payment-form').classList.add('hidden');

  // Switch back to previous tab
  document.getElementById('tab-down-payment').classList.add('tab-active');
  switchTab('down-payment');

  // Show other sections
  document.querySelectorAll('[class*="bg-white dark:bg-gray-800 rounded-lg shadow-md"]').forEach(section => {
    if (!section.closest('#paymentFormSection')) {
      section.style.display = 'block';
    }
  });

  // Reset form
  resetPaymentForm();

  // Log activity
  if (currentContractId) {
    logActivityToFirebase('payment_form_closed', {
      contractId: currentContractId
    });
  }

  currentContractId = null;
}

// Initialize new payment form handlers
function initializeNewPaymentForm() {
  // Setup payment method handlers
  setupPaymentMethodHandlers();

  // Setup form submission
  const newPaymentForm = document.getElementById('newPaymentForm');
  if (newPaymentForm) {
    newPaymentForm.addEventListener('submit', handleNewPaymentFormSubmit);
  }

  // Setup close button
  const closeBtn = document.getElementById('closePaymentForm');
  const cancelBtn = document.getElementById('cancelPaymentForm');

  if (closeBtn) {
    closeBtn.addEventListener('click', closePaymentForm);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closePaymentForm);
  }

  // Setup amount change handlers
  const totalReceivedAmount = document.getElementById('totalReceivedAmount');
  if (totalReceivedAmount) {
    totalReceivedAmount.addEventListener('input', () => {
      updatePaymentSummary();
      updateSubmitButtonState();
    });
  }
}

// Handle new payment form submission
async function handleNewPaymentFormSubmit(e) {
  e.preventDefault();

  const loaderId = LoadingSystem.show({
    message: 'กำลังบันทึกการชำระ...',
    showProgress: true,
    autoProgress: true
  });

  try {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
      throw new Error('กรุณาเลือกวิธีการชำระเงิน');
    }

    // Collect payment data
    const paymentData = {
      contractId: currentContractId,
      installmentNumber: document.getElementById('selected-installment-number').textContent,
      paymentDate: document.getElementById('paymentDate').value,
      paymentMethod: paymentMethod,
      totalAmount: parseFloat(document.getElementById('totalReceivedAmount').value),
      notes: document.getElementById('paymentNotes').value
    };

    // Add method-specific data
    switch (paymentMethod) {
      case 'cash':
        paymentData.cashAmount = parseFloat(document.getElementById('cashAmount').value) || paymentData.totalAmount;
        paymentData.changeAmount = parseFloat(document.getElementById('changeAmount').value) || 0;
        break;

      case 'transfer':
        paymentData.transferDetails = {
          bank: document.getElementById('bankSelect').value,
          bankName: document.getElementById('bankSelect').options[document.getElementById('bankSelect').selectedIndex]?.text,
          accountNumber: document.getElementById('accountNumber').value,
          transferTime: document.getElementById('transferTime').value,
          referenceNumber: document.getElementById('referenceNumber').value
        };
        break;

      case 'mixed':
        paymentData.mixedPayment = {
          cashAmount: parseFloat(document.getElementById('mixedCashAmount').value) || 0,
          transferAmount: parseFloat(document.getElementById('mixedTransferAmount').value) || 0
        };
        paymentData.transferDetails = {
          bank: document.getElementById('mixedBankSelect').value,
          bankName: document.getElementById('mixedBankSelect').options[document.getElementById('mixedBankSelect').selectedIndex]?.text,
          referenceNumber: document.getElementById('mixedReferenceNumber').value
        };
        break;
    }

    // Validate data
    if (!paymentData.totalAmount || paymentData.totalAmount <= 0) {
      throw new Error('กรุณาระบุยอดเงินที่ถูกต้อง');
    }

    // Find contract info for logging
    const contract = allContracts.find(c => c._id === currentContractId);

    // Log activity
    logActivityToFirebase('payment_recording', {
      contractId: currentContractId,
      contractNo: contract?.contractNumber,
      installmentNumber: paymentData.installmentNumber,
      amount: paymentData.totalAmount,
      method: paymentData.paymentMethod
    });

    // Save to Firebase
    const firebasePaymentData = {
      ...paymentData,
      contractNo: contract?.contractNumber,
      customerName: contract?.customerName,
      customerPhone: contract?.customerPhone,
      branchCode: window.currentBranchCode || 'PATTANI',
      recordedAt: new Date().toISOString(),
      status: 'completed'
    };

    savePaymentInstallmentToFirebase(firebasePaymentData);

    // Emit Socket.IO event
    emitPaymentInstallmentEvent('payment_recorded', {
      contractId: currentContractId,
      contractNo: contract?.contractNumber,
      customerName: contract?.customerName,
      installmentNumber: paymentData.installmentNumber,
      amount: paymentData.totalAmount,
      method: paymentData.paymentMethod
    });

    // Send to API
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/installment-payment/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'ไม่สามารถบันทึกการชำระได้');
    }

    // Upload slip files if any
    await uploadPaymentSlips(result.data.payment.paymentId, paymentMethod);

    LoadingSystem.hide(loaderId);

    // Show success message
    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ!',
      text: `บันทึกการชำระงวดที่ ${paymentData.installmentNumber} เรียบร้อยแล้ว`,
      timer: 2000,
      showConfirmButton: false
    });

    // Send notification
    sendFirebaseNotification(
      `บันทึกการชำระสำเร็จ: สัญญา ${contract?.contractNumber} งวดที่ ${paymentData.installmentNumber}`,
      'success',
      firebasePaymentData
    );

    // Close form and refresh data
    setTimeout(() => {
      closePaymentForm();
      loadContracts();
      loadDashboardStats();
    }, 2000);

  } catch (error) {
    LoadingSystem.hide(loaderId);
    console.error('Payment recording error:', error);

    // Log error
    logActivityToFirebase('payment_recording_error', {
      contractId: currentContractId,
      error: error.message
    });

    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด!',
      text: error.message || 'ไม่สามารถบันทึกการชำระได้'
    });
  }
}

// Upload payment slips
async function uploadPaymentSlips(paymentId, paymentMethod) {
  try {
    const token = localStorage.getItem('authToken');

    // Upload main slip (for transfer or mixed)
    if (paymentMethod === 'transfer') {
      const slipFile = document.getElementById('paymentSlip').files[0];
      if (slipFile) {
        await uploadSlipFile(paymentId, slipFile, 'transfer');
      }
    } else if (paymentMethod === 'mixed') {
      const mixedSlipFile = document.getElementById('mixedPaymentSlip').files[0];
      if (mixedSlipFile) {
        await uploadSlipFile(paymentId, mixedSlipFile, 'mixed');
      }
    }

  } catch (error) {
    console.warn('Warning: Failed to upload slip, but payment was recorded successfully:', error);
    showToast('บันทึกการชำระสำเร็จ แต่อัปโหลดสลิปไม่สำเร็จ', 'warning');
  }
}

// Upload individual slip file
async function uploadSlipFile(paymentId, file, type) {
  const formData = new FormData();
  formData.append('slip', file);
  formData.append('type', type);

  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/installment-payment/${paymentId}/upload-slip`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload slip');
  }

  return response.json();
}

// Preview slip image (updated function)
function previewSlip() {
  const input = document.getElementById('paymentSlip');
  const preview = document.getElementById('slipPreview');
  const image = document.getElementById('slipImage');

  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('ไฟล์มีขนาดใหญ่เกินไป (เกิน 5MB)', 'error');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      image.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Log activity
    logActivityToFirebase('payment_slip_uploaded', {
      contractId: currentContractId,
      fileName: file.name,
      fileSize: file.size
    });
  }
}

// Preview mixed payment slip
function previewMixedSlip() {
  const input = document.getElementById('mixedPaymentSlip');
  const preview = document.getElementById('mixedSlipPreview');
  const image = document.getElementById('mixedSlipImage');

  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('ไฟล์มีขนาดใหญ่เกินไป (เกิน 5MB)', 'error');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      image.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

console.log('✅ Payment Form Handler loaded successfully');
