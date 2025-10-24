/**
 * 🚀 Quick PDF Button Test
 * สคริปต์ทดสอบปุ่มเอกสาร PDF แบบรวดเร็ว
 *
 * วิธีใช้:
 * 1. เปิดหน้า productTransfer.html
 * 2. เปิด Console (F12)
 * 3. Copy & Paste สคริปต์นี้
 * 4. รันคำสั่ง: quickPDFTest()
 */

function quickPDFTest() {
    console.log('🧪 เริ่มการทดสอบปุ่มเอกสาร PDF...');
    console.log('=' .repeat(50));

    let testsPassed = 0;
    let testsTotal = 0;

    // Helper function
    function test(name, condition, details = '') {
        testsTotal++;
        const status = condition ? '✅' : '❌';
        const result = condition ? 'ผ่าน' : 'ไม่ผ่าน';
        console.log(`${status} ${name}: ${result}${details ? ' - ' + details : ''}`);
        if (condition) testsPassed++;
        return condition;
    }

    console.log('🔍 ทดสอบฟังก์ชันหลัก...');

    // Test 1: ฟังก์ชันหลัก
    test('openTransferDocument', typeof window.openTransferDocument === 'function');
    test('showPDFModal', typeof window.showPDFModal === 'function');
    test('createIframePDFViewer', typeof window.createIframePDFViewer === 'function');

    // Test 2: ตัวแปร Global
    test('ProductTransferApp', typeof window.ProductTransferApp === 'object');
    test('appData', typeof window.appData === 'object');
    test('appConfig', typeof window.appConfig === 'object');

    console.log('\n💾 ทดสอบ localStorage...');

    // Test 3: localStorage
    let localStorageWorks = false;
    try {
        const testKey = 'quickTest_' + Date.now();
        const testData = { test: 'data', timestamp: Date.now() };
        localStorage.setItem(testKey, JSON.stringify(testData));
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        localStorageWorks = !!retrieved;
    } catch (e) {
        localStorageWorks = false;
    }
    test('localStorage operations', localStorageWorks);

    console.log('\n📄 ทดสอบข้อมูลตัวอย่าง...');

    // Test 4: สร้างข้อมูลตัวอย่าง
    let sampleDataCreated = false;
    let sampleDataKey = '';
    try {
        const sampleData = {
            transferNo: `QUICK-TEST-${Date.now()}`,
            transferDate: new Date().toISOString(),
            transferTime: '14:30',
            transferType: 'โอนระหว่างสาขา',
            fromBranch: { name: 'สาขาทดสอบ A', branch_code: 'TEST-A' },
            toBranch: { name: 'สาขาทดสอบ B', branch_code: 'TEST-B' },
            items: [{ sku: 'TEST-001', name: 'สินค้าทดสอบ', quantity: 1 }],
            note: 'ข้อมูลทดสอบด่วน',
            isTest: true
        };

        sampleDataKey = `transferPDF_quickTest_${Date.now()}`;
        localStorage.setItem(sampleDataKey, JSON.stringify(sampleData));
        sampleDataCreated = true;
    } catch (e) {
        sampleDataCreated = false;
    }
    test('สร้างข้อมูลตัวอย่าง', sampleDataCreated, sampleDataKey);

    console.log('\n🔗 ทดสอบ URL Generation...');

    // Test 5: URL Generation
    const baseUrl = '/views/pattani/PDF/TransferPDF.html';
    const pdfUrl = `${baseUrl}?key=${sampleDataKey}&display=inline&type=html&timestamp=${Date.now()}`;
    test('สร้าง PDF URL', pdfUrl.length > 0, `${pdfUrl.length} ตัวอักษร`);

    console.log('\n🖼️ ทดสอบการเปิด PDF...');

    // Test 6: PDF Opening
    if (sampleDataCreated) {
        console.log('🔄 กำลังทดสอบการเปิด PDF...');

        // ทดสอบ Modal (ถ้ามี)
        if (typeof window.showPDFModal === 'function') {
            try {
                console.log('📱 ทดสอบ PDF Modal...');
                window.showPDFModal(pdfUrl);
                test('เปิด PDF Modal', true, 'Modal เปิดแล้ว');
            } catch (e) {
                test('เปิด PDF Modal', false, e.message);
            }
        } else {
            // ทดสอบเปิดหน้าต่างใหม่
            try {
                console.log('🪟 ทดสอบเปิดหน้าต่างใหม่...');
                const newWindow = window.open(pdfUrl, '_blank', 'width=800,height=600');
                const windowOpened = !!newWindow;
                test('เปิดหน้าต่าง PDF', windowOpened, windowOpened ? 'หน้าต่างเปิดแล้ว' : 'อาจถูก popup blocker');

                // ปิดหน้าต่างทดสอบหลังจาก 3 วินาที
                if (newWindow) {
                    setTimeout(() => {
                        try {
                            newWindow.close();
                            console.log('🔒 ปิดหน้าต่างทดสอบแล้ว');
                        } catch (e) {
                            console.log('⚠️ ไม่สามารถปิดหน้าต่างทดสอบได้');
                        }
                    }, 3000);
                }
            } catch (e) {
                test('เปิดหน้าต่าง PDF', false, e.message);
            }
        }
    }

    console.log('\n📊 สรุปผลการทดสอบ');
    console.log('=' .repeat(50));

    const successRate = Math.round((testsPassed / testsTotal) * 100);
    const status = successRate >= 80 ? '🎉' : successRate >= 60 ? '⚠️' : '❌';

    console.log(`${status} ผลการทดสอบ: ${testsPassed}/${testsTotal} (${successRate}%)`);

    if (successRate >= 80) {
        console.log('✅ ระบบพร้อมใช้งาน!');
        console.log('💡 คุณสามารถทดสอบปุ่มเอกสารในหน้าประวัติการย้ายสินค้าได้');
    } else if (successRate >= 60) {
        console.log('⚠️ ระบบใช้งานได้บางส่วน');
        console.log('💡 กรุณาตรวจสอบฟังก์ชันที่ไม่ผ่านการทดสอบ');
    } else {
        console.log('❌ ระบบมีปัญหา');
        console.log('💡 กรุณาตรวจสอบการโหลดหน้าเว็บและ JavaScript errors');
    }

    // ล้างข้อมูลทดสอบ
    if (sampleDataKey) {
        setTimeout(() => {
            localStorage.removeItem(sampleDataKey);
            console.log('🧹 ล้างข้อมูลทดสอบแล้ว');
        }, 5000);
    }

    console.log('\n🔧 คำสั่งเพิ่มเติม:');
    console.log('- testPDFWithRealData() : ทดสอบกับข้อมูลจริง');
    console.log('- testAllPDFButtons() : ทดสอบปุ่มเอกสารทั้งหมด');
    console.log('- showPDFDebugInfo() : แสดงข้อมูลดีบัก');

    return {
        passed: testsPassed,
        total: testsTotal,
        successRate: successRate,
        status: successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error'
    };
}

// ฟังก์ชันทดสอบเพิ่มเติม
function testPDFWithRealData() {
    console.log('🔍 ทดสอบกับข้อมูลจริง...');

    if (typeof window.appData === 'object' && window.appData.transferHistory) {
        const transfers = window.appData.transferHistory;
        console.log(`📋 พบข้อมูล transfer history: ${transfers.length} รายการ`);

        if (transfers.length > 0) {
            const firstTransfer = transfers[0];
            console.log(`🎯 ทดสอบกับ transfer ID: ${firstTransfer._id}`);

            if (typeof window.openTransferDocument === 'function') {
                try {
                    window.openTransferDocument(firstTransfer._id);
                    console.log('✅ เรียกใช้ openTransferDocument สำเร็จ');
                } catch (e) {
                    console.log('❌ เกิดข้อผิดพลาด:', e.message);
                }
            } else {
                console.log('❌ ไม่พบฟังก์ชัน openTransferDocument');
            }
        } else {
            console.log('⚠️ ไม่มีข้อมูล transfer history');
            console.log('💡 กรุณาสร้างรายการโอนย้ายก่อนทดสอบ');
        }
    } else {
        console.log('❌ ไม่พบข้อมูล appData หรือ transferHistory');
    }
}

function testAllPDFButtons() {
    console.log('🔍 ค้นหาปุ่มเอกสารทั้งหมด...');

    const buttons = document.querySelectorAll('button[onclick*="openTransferDocument"]');
    console.log(`📋 พบปุ่มเอกสาร: ${buttons.length} ปุ่ม`);

    if (buttons.length > 0) {
        console.log('🧪 ทดสอบปุ่มแรก...');
        try {
            buttons[0].click();
            console.log('✅ คลิกปุ่มเอกสารสำเร็จ');
        } catch (e) {
            console.log('❌ เกิดข้อผิดพลาดในการคลิกปุ่ม:', e.message);
        }
    } else {
        console.log('⚠️ ไม่พบปุ่มเอกสาร');
        console.log('💡 กรุณาไปที่แท็บ "ประวัติการย้ายสินค้า" ก่อน');
    }
}

function showPDFDebugInfo() {
    console.log('🔧 ข้อมูลดีบัก PDF System');
    console.log('=' .repeat(40));

    // ข้อมูลพื้นฐาน
    console.log('🌐 URL ปัจจุบัน:', window.location.href);
    console.log('🔧 User Agent:', navigator.userAgent);

    // localStorage
    const allKeys = Object.keys(localStorage);
    const transferKeys = allKeys.filter(key => key.startsWith('transferPDF_'));
    console.log(`💾 localStorage keys ทั้งหมด: ${allKeys.length}`);
    console.log(`📄 Transfer PDF keys: ${transferKeys.length}`);
    if (transferKeys.length > 0) {
        console.log('🔑 Transfer keys:', transferKeys);
    }

    // ฟังก์ชัน
    const functions = [
        'openTransferDocument',
        'showPDFModal',
        'createIframePDFViewer',
        'testPDFURL',
        'quickPDFTest'
    ];

    console.log('🔧 สถานะฟังก์ชัน:');
    functions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        console.log(`  ${exists ? '✅' : '❌'} ${funcName}`);
    });

    // ตัวแปร
    const variables = ['ProductTransferApp', 'appData', 'appConfig', 'socket'];
    console.log('📊 สถานะตัวแปร:');
    variables.forEach(varName => {
        const exists = typeof window[varName] !== 'undefined';
        const type = typeof window[varName];
        console.log(`  ${exists ? '✅' : '❌'} ${varName} (${type})`);
    });

    // DOM Elements
    const elements = [
        'historyTableBody',
        'transferFormContent',
        'transferHistoryContent'
    ];

    console.log('🏗️ สถานะ DOM Elements:');
    elements.forEach(elementId => {
        const exists = !!document.getElementById(elementId);
        console.log(`  ${exists ? '✅' : '❌'} #${elementId}`);
    });

    // ปุ่มเอกสาร
    const docButtons = document.querySelectorAll('button[onclick*="openTransferDocument"]');
    console.log(`🔘 ปุ่มเอกสารที่พบ: ${docButtons.length} ปุ่ม`);
}

// เรียกใช้ทันทีเมื่อโหลดสคริปต์
console.log('🚀 Quick PDF Test Script โหลดแล้ว!');
console.log('📝 พิมพ์ quickPDFTest() เพื่อเริ่มทดสอบ');
console.log('🔧 พิมพ์ showPDFDebugInfo() เพื่อดูข้อมูลดีบัก');

// Auto-run ถ้าต้องการ
// quickPDFTest();
