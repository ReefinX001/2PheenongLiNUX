/**
 * 🧪 Installment System Test Runner
 * สำหรับทดสอบระบบผ่อนชำระหลังการแก้ไข
 *
 * วิธีใช้:
 * 1. เปิดหน้า installment_Pattani.html
 * 2. เปิด Developer Console (F12)
 * 3. Copy และ paste script นี้ลงใน console
 * 4. เรียกใช้ runInstallmentTests()
 */

console.log('🧪 Loading Installment System Test Runner...');

// Mock data สำหรับการทดสอบ
const TEST_DATA = {
    customer: {
        prefix: 'นาย',
        firstName: 'อารีฟีน',
        lastName: 'กาซอ',
        idCard: '1941001330617',
        phone: '0622070097',
        email: 'bisyrunn@gmail.com',
        birthDate: '1994-01-01',
        age: '30',
        houseNo: '103/2',
        moo: '4',
        soi: '',
        road: '',
        subDistrict: 'ระแว้ง',
        district: 'ยะรัง',
        province: 'ปัตตานี',
        zipcode: '94160',
        address: 'เลขที่ 103/2 หมู่ 4 ตำบล ระแว้ง อำเภอ ยะรัง จังหวัด ปัตตานี 94160'
    },
    cartItems: [
        {
            name: 'iPhone 16 Pro 256Gb Pink',
            model: 'iPhone 16 Pro',
            price: 39500,
            quantity: 1,
            total: 39500,
            imei: '236514236985214',
            sku: 'IP16PRO256P',
            brand: 'Apple',
            category: 'Smartphone',
            taxType: 'รวมภาษี',
            taxRate: 0,
            netAmount: 39500,
            taxAmount: 0,
            totalWithTax: 39500,
            taxDisplay: 'รวมภาษี 0%'
        }
    ],
    paymentPlan: {
        type: 'plan1',
        planType: 'plan1',
        planName: 'แผนผ่อนยาว (ดาวน์น้อย)',
        downPayment: 15210,
        installmentAmount: 2450,
        installmentPeriod: 12,
        interestRate: 0,
        totalAmount: 44610
    }
};

// Test Framework
class InstallmentTestFramework {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            total: 0
        };
    }

    // เพิ่ม test case
    addTest(name, testFunction, category = 'general') {
        this.tests.push({
            name,
            testFunction,
            category,
            status: 'pending'
        });
    }

    // รัน test ทั้งหมด
    async runAllTests() {
        console.log('🚀 เริ่มการทดสอบระบบ Installment...');
        console.log('='.repeat(60));

        this.results = { passed: 0, failed: 0, warnings: 0, total: 0 };

        for (const test of this.tests) {
            await this.runSingleTest(test);
        }

        this.printSummary();
    }

    // รัน test เดียว
    async runSingleTest(test) {
        console.log(`\n🧪 Testing: ${test.name}`);

        try {
            const result = await test.testFunction();

            if (result === true || (result && result.passed === true)) {
                test.status = 'passed';
                this.results.passed++;
                console.log(`   ✅ PASSED: ${result.message || 'Test completed successfully'}`);
            } else if (result && result.warning === true) {
                test.status = 'warning';
                this.results.warnings++;
                console.log(`   ⚠️ WARNING: ${result.message || 'Test completed with warnings'}`);
            } else {
                test.status = 'failed';
                this.results.failed++;
                console.log(`   ❌ FAILED: ${result.message || 'Test failed'}`);
            }
        } catch (error) {
            test.status = 'failed';
            this.results.failed++;
            console.log(`   ❌ ERROR: ${error.message}`);
        }

        this.results.total++;
    }

    // แสดงสรุปผลการทดสอบ
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 สรุปผลการทดสอบ');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings}`);
        console.log(`📋 Total: ${this.results.total}`);

        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`📈 Success Rate: ${successRate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 ทุกการทดสอบผ่านหมด! ระบบพร้อมใช้งาน');
        } else {
            console.log(`\n⚠️ มีการทดสอบที่ล้มเหลว ${this.results.failed} รายการ กรุณาตรวจสอบ`);
        }
    }

    // รัน test ตาม category
    async runTestsByCategory(category) {
        const categoryTests = this.tests.filter(test => test.category === category);
        console.log(`🧪 Running ${category} tests (${categoryTests.length} tests)...`);

        for (const test of categoryTests) {
            await this.runSingleTest(test);
        }
    }
}

// สร้าง test framework instance
const testFramework = new InstallmentTestFramework();

// ======== BASIC FUNCTION TESTS ========

testFramework.addTest('เช็คการโหลด InstallmentBusiness module', () => {
    if (typeof window.InstallmentBusiness === 'undefined') {
        return { passed: false, message: 'InstallmentBusiness module ไม่ได้ถูกโหลด' };
    }

    const requiredFunctions = [
        'getCustomerFormData',
        'getSelectedPlan',
        'calculateTotalAmount',
        'saveInstallmentData',
        'validateRequiredDocuments'
    ];

    const missingFunctions = requiredFunctions.filter(fn =>
        typeof window.InstallmentBusiness[fn] !== 'function'
    );

    if (missingFunctions.length > 0) {
        return {
            passed: false,
            message: `ฟังก์ชันที่หายไป: ${missingFunctions.join(', ')}`
        };
    }

    return { passed: true, message: 'ทุกฟังก์ชันที่จำเป็นพร้อมใช้งาน' };
}, 'basic');

testFramework.addTest('เช็คการโหลด test functions ใหม่', () => {
    const testFunctions = [
        'testInstallmentSystemFixes',
        'highlightValidationErrors',
        'getSelectedPlanName'
    ];

    const availableFunctions = testFunctions.filter(fn =>
        typeof window[fn] === 'function' ||
        (window.InstallmentBusiness && typeof window.InstallmentBusiness[fn] === 'function')
    );

    if (availableFunctions.length === 0) {
        return {
            warning: true,
            message: 'ไม่พบฟังก์ชันทดสอบใหม่ อาจยังไม่ได้โหลดหรือ refresh หน้า'
        };
    }

    return {
        passed: true,
        message: `พบฟังก์ชันทดสอบ: ${availableFunctions.join(', ')}`
    };
}, 'basic');

// ======== CUSTOMER DATA TESTS ========

testFramework.addTest('ทดสอบการสร้างและตั้งค่าข้อมูลลูกค้า', () => {
    // สร้างข้อมูลลูกค้าจำลอง
    const customerData = TEST_DATA.customer;

    // ตั้งค่าข้อมูลในฟอร์ม (ถ้าฟิลด์มีอยู่)
    Object.keys(customerData).forEach(key => {
        const element = document.getElementById(`customer${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (element) {
            element.value = customerData[key];
        }
    });

    // ตรวจสอบฟังก์ชัน getCustomerFormData
    if (window.InstallmentBusiness && window.InstallmentBusiness.getCustomerFormData) {
        const retrievedData = window.InstallmentBusiness.getCustomerFormData();

        const requiredFields = ['firstName', 'lastName', 'phone', 'idCard'];
        const missingData = requiredFields.filter(field => !retrievedData[field]);

        if (missingData.length > 0) {
            return {
                passed: false,
                message: `ข้อมูลที่ขาดหายไป: ${missingData.join(', ')}`
            };
        }

        return {
            passed: true,
            message: `ข้อมูลลูกค้าครบถ้วน: ${retrievedData.firstName} ${retrievedData.lastName}`
        };
    }

    return { passed: false, message: 'ฟังก์ชัน getCustomerFormData ไม่พบ' };
}, 'customer');

testFramework.addTest('ทดสอบการบันทึกและดึงข้อมูลจาก localStorage', () => {
    if (!window.InstallmentBusiness) {
        return { passed: false, message: 'InstallmentBusiness module ไม่พบ' };
    }

    const testData = TEST_DATA.customer;

    // ทดสอบการบันทึก
    if (window.InstallmentBusiness.saveCustomerDataToStorage) {
        window.InstallmentBusiness.saveCustomerDataToStorage(testData);
    } else {
        return { passed: false, message: 'ฟังก์ชัน saveCustomerDataToStorage ไม่พบ' };
    }

    // ทดสอบการดึงข้อมูล
    if (window.InstallmentBusiness.getCustomerDataFromStorage) {
        const retrievedData = window.InstallmentBusiness.getCustomerDataFromStorage();

        if (!retrievedData) {
            return { passed: false, message: 'ไม่สามารถดึงข้อมูลจาก localStorage ได้' };
        }

        if (retrievedData.firstName !== testData.firstName) {
            return { passed: false, message: 'ข้อมูลที่ดึงมาไม่ตรงกับที่บันทึก' };
        }

        return { passed: true, message: 'การบันทึกและดึงข้อมูล localStorage ทำงานถูกต้อง' };
    }

    return { passed: false, message: 'ฟังก์ชัน getCustomerDataFromStorage ไม่พบ' };
}, 'customer');

// ======== PAYMENT PLAN TESTS ========

testFramework.addTest('ทดสอบการเลือกและประมวลผล Payment Plan', () => {
    if (!window.InstallmentBusiness) {
        return { passed: false, message: 'InstallmentBusiness module ไม่พบ' };
    }

    // ทดสอบ getSelectedPlan function
    if (window.InstallmentBusiness.getSelectedPlan) {
        const plan = window.InstallmentBusiness.getSelectedPlan();

        if (!plan) {
            return { passed: false, message: 'ไม่สามารถดึงข้อมูล payment plan ได้' };
        }

        const requiredPlanFields = ['downPayment', 'installmentAmount', 'installmentPeriod', 'totalAmount'];
        const missingFields = requiredPlanFields.filter(field =>
            plan[field] === undefined || plan[field] === null || plan[field] <= 0
        );

        if (missingFields.length > 0) {
            return {
                passed: false,
                message: `Payment plan ขาดข้อมูล: ${missingFields.join(', ')}`
            };
        }

        return {
            passed: true,
            message: `Payment plan ถูกต้อง: ${plan.planName || plan.type}, Down: ฿${plan.downPayment.toLocaleString()}`
        };
    }

    return { passed: false, message: 'ฟังก์ชัน getSelectedPlan ไม่พบ' };
}, 'payment');

testFramework.addTest('ทดสอบ JSON serialization ของ Payment Plan', () => {
    const testPlan = TEST_DATA.paymentPlan;

    try {
        const serialized = JSON.stringify({
            id: testPlan.planType || testPlan.type || 'plan1',
            name: testPlan.planName || 'แผนเริ่มต้น',
            down: testPlan.downPayment || 0,
            perMonth: testPlan.installmentAmount || 0,
            count: testPlan.installmentPeriod || 0
        });

        const parsed = JSON.parse(serialized);

        if (!parsed.id || !parsed.name || !parsed.down || !parsed.perMonth || !parsed.count) {
            return { passed: false, message: 'ข้อมูล serialized plan ไม่ครบถ้วน' };
        }

        return { passed: true, message: 'JSON serialization ทำงานถูกต้อง' };
    } catch (error) {
        return { passed: false, message: `เกิดข้อผิดพลาดใน serialization: ${error.message}` };
    }
}, 'payment');

// ======== CART TESTS ========

testFramework.addTest('ทดสอบข้อมูล Cart Items', () => {
    // ตั้งค่า mock cart items
    if (window.InstallmentProduct) {
        window.InstallmentProduct.cartItems = TEST_DATA.cartItems;
    } else {
        window.cartItems = TEST_DATA.cartItems;
    }

    const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];

    if (cartItems.length === 0) {
        return { passed: false, message: 'ไม่พบ cart items' };
    }

    // ตรวจสอบ field ที่จำเป็น
    const requiredFields = ['name', 'price', 'quantity'];
    let errors = [];

    cartItems.forEach((item, index) => {
        requiredFields.forEach(field => {
            if (!item[field] && item[field] !== 0) {
                errors.push(`สินค้าที่ ${index + 1}: ขาด ${field}`);
            }
        });

        // ตรวจสอบ quantity field specifically (not qty)
        if (!item.quantity && item.qty) {
            errors.push(`สินค้าที่ ${index + 1}: ใช้ 'qty' แทน 'quantity' (ควรใช้ 'quantity')`);
        }
    });

    if (errors.length > 0) {
        return { passed: false, message: errors.join(', ') };
    }

    return {
        passed: true,
        message: `Cart items ถูกต้อง: ${cartItems.length} รายการ, รวม ฿${cartItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0).toLocaleString()}`
    };
}, 'cart');

// ======== VALIDATION TESTS ========

testFramework.addTest('ทดสอบ Payload Structure สำหรับ Backend', () => {
    const customerData = TEST_DATA.customer;
    const cartItems = TEST_DATA.cartItems;
    const plan = TEST_DATA.paymentPlan;

    // สร้าง payload ตามรูปแบบใหม่
    const payload = {
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        name: `${customerData.firstName} ${customerData.lastName}`,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
        email: customerData.email,
        idCard: customerData.idCard,

        products: cartItems.map(item => ({
            name: item.name,
            quantity: parseInt(item.quantity || item.qty || 1), // ใช้ 'quantity'
            price: parseFloat(item.price || 0),
            total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1)))
        })),

        paymentPlan: {
            selectedPlan: JSON.stringify({
                id: plan.planType || plan.type || 'plan1',
                name: plan.planName || 'แผนเริ่มต้น',
                down: plan.downPayment || 0,
                perMonth: plan.installmentAmount || 0,
                count: plan.installmentPeriod || 0
            }),
            planType: plan.planType || plan.type,
            downPayment: plan.downPayment,
            monthlyPayment: plan.installmentAmount,
            terms: plan.installmentPeriod,
            totalAmount: plan.totalAmount
        },

        totalAmount: cartItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0),
        branchCode: '00000',
        requestId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // ตรวจสอบ required fields สำหรับ backend
    const requiredFields = [
        'customerName', 'firstName', 'lastName', 'phone', 'idCard',
        'products', 'paymentPlan', 'totalAmount', 'branchCode'
    ];

    const missingFields = requiredFields.filter(field => !payload[field]);

    if (missingFields.length > 0) {
        return { passed: false, message: `Payload ขาดข้อมูล: ${missingFields.join(', ')}` };
    }

    // ตรวจสอบ products ใช้ 'quantity' field
    const hasCorrectQuantityField = payload.products.every(p => p.hasOwnProperty('quantity'));
    if (!hasCorrectQuantityField) {
        return { passed: false, message: 'Products ไม่มี quantity field' };
    }

    return { passed: true, message: 'Payload structure ถูกต้องตามที่ backend คาดหวัง' };
}, 'validation');

testFramework.addTest('ทดสอบ Error Handling Functions', () => {
    // ทดสอบ highlightValidationErrors function
    if (typeof window.highlightValidationErrors !== 'function' &&
        !(window.InstallmentBusiness && typeof window.InstallmentBusiness.highlightValidationErrors === 'function')) {
        return { warning: true, message: 'ฟังก์ชัน highlightValidationErrors ไม่พบ' };
    }

    const testErrors = [
        'กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท',
        'กรุณากรอกเบอร์โทรศัพท์',
        'สินค้าลำดับที่ 1: จำนวนไม่ถูกต้อง'
    ];

    try {
        if (window.highlightValidationErrors) {
            window.highlightValidationErrors(testErrors);
        } else if (window.InstallmentBusiness && window.InstallmentBusiness.highlightValidationErrors) {
            window.InstallmentBusiness.highlightValidationErrors(testErrors);
        }

        return { passed: true, message: 'Error handling functions ทำงานได้' };
    } catch (error) {
        return { passed: false, message: `Error ใน error handling: ${error.message}` };
    }
}, 'validation');

// ======== INTEGRATION TESTS ========

testFramework.addTest('ทดสอบการทำงานร่วมกันของระบบ (Integration Test)', () => {
    if (!window.InstallmentBusiness) {
        return { passed: false, message: 'InstallmentBusiness module ไม่พบ' };
    }

    // ตั้งค่าข้อมูลทดสอบ
    const customerData = TEST_DATA.customer;
    const cartItems = TEST_DATA.cartItems;

    // ตั้งค่า mock data
    if (window.InstallmentProduct) {
        window.InstallmentProduct.cartItems = cartItems;
    } else {
        window.cartItems = cartItems;
    }

    // ทดสอบ flow หลัก
    let testResults = [];

    // 1. Customer data
    try {
        const retrievedCustomer = window.InstallmentBusiness.getCustomerFormData();
        if (retrievedCustomer) {
            testResults.push('✅ Customer data retrieval');
        } else {
            testResults.push('❌ Customer data retrieval');
        }
    } catch (e) {
        testResults.push('❌ Customer data retrieval (error)');
    }

    // 2. Payment plan
    try {
        const plan = window.InstallmentBusiness.getSelectedPlan();
        if (plan && plan.downPayment > 0) {
            testResults.push('✅ Payment plan selection');
        } else {
            testResults.push('❌ Payment plan selection');
        }
    } catch (e) {
        testResults.push('❌ Payment plan selection (error)');
    }

    // 3. Total calculation
    try {
        const total = window.InstallmentBusiness.calculateTotalAmount();
        if (total > 0) {
            testResults.push('✅ Total calculation');
        } else {
            testResults.push('❌ Total calculation');
        }
    } catch (e) {
        testResults.push('❌ Total calculation (error)');
    }

    const passedTests = testResults.filter(r => r.startsWith('✅')).length;
    const totalTests = testResults.length;

    if (passedTests === totalTests) {
        return {
            passed: true,
            message: `ระบบทำงานได้ครบ ${passedTests}/${totalTests} functions`
        };
    } else {
        return {
            passed: false,
            message: `ผ่าน ${passedTests}/${totalTests} functions: ${testResults.join(', ')}`
        };
    }
}, 'integration');

// ======== MAIN TEST RUNNER FUNCTIONS ========

// ฟังก์ชันหลักสำหรับรันการทดสอบ
async function runInstallmentTests() {
    console.clear();
    console.log('🧪 Installment System Comprehensive Tests');
    console.log('========================================');

    await testFramework.runAllTests();

    // รันการทดสอบเพิ่มเติมถ้ามี testInstallmentSystemFixes
    if (typeof window.testInstallmentSystemFixes === 'function') {
        console.log('\n🔧 Running additional system fixes tests...');
        try {
            const additionalResults = window.testInstallmentSystemFixes();
            console.log('✅ Additional tests completed');
        } catch (error) {
            console.log('❌ Additional tests failed:', error.message);
        }
    }

    return testFramework.results;
}

// ฟังก์ชันรันการทดสอบตาม category
async function runTestsByCategory(category) {
    console.clear();
    console.log(`🧪 Running ${category} tests...`);
    await testFramework.runTestsByCategory(category);
}

// ฟังก์ชันแสดงข้อมูลการทดสอบ
function showTestInfo() {
    console.log('🧪 Available Test Categories:');
    console.log('- basic: ทดสอบฟังก์ชันพื้นฐาน');
    console.log('- customer: ทดสอบข้อมูลลูกค้า');
    console.log('- payment: ทดสอบระบบการชำระเงิน');
    console.log('- cart: ทดสอบตะกร้าสินค้า');
    console.log('- validation: ทดสอบการตรวจสอบข้อมูล');
    console.log('- integration: ทดสอบการทำงานร่วมกัน');
    console.log('\nCommands:');
    console.log('- runInstallmentTests() - รันการทดสอบทั้งหมด');
    console.log('- runTestsByCategory("category") - รันการทดสอบตาม category');
    console.log('- showTestInfo() - แสดงข้อมูลนี้');
}

// Export functions to global scope
window.runInstallmentTests = runInstallmentTests;
window.runTestsByCategory = runTestsByCategory;
window.showTestInfo = showTestInfo;
window.InstallmentTestFramework = testFramework;

console.log('✅ Test Runner loaded successfully!');
console.log('📋 Run showTestInfo() to see available commands');
console.log('🚀 Run runInstallmentTests() to start testing');