# 🔧 การแก้ไขปัญหาการไม่แสดงชื่อพนักงานเมื่อเลือกสาขา

## 🐛 **ปัญหาที่พบ:**
เมื่อเลือกสาขาใน attendance.html พนักงานไม่แสดงใน dropdown "เลือกพนักงาน"

## ✅ **การแก้ไขที่ทำ:**

### 1. **แก้ไขฟังก์ชัน `selectBranch()`**
- เพิ่มการตั้งค่า `selectedBranchId` และ `currentCalendarBranchFilter`
- เพิ่มการเรียก `updateEmployeeFilterByBranch()` หลังเลือกสาขา

```javascript
function selectBranch(branchId, branchName, employeeCount) {
  currentSelectedBranch = branchId;
  selectedBranchId = branchId; // Also set global selectedBranchId
  currentCalendarBranchFilter = branchId; // Set calendar branch filter
  
  // ... existing code ...
  
  // Update employee filter when branch is selected
  updateEmployeeFilterByBranch();
  
  updateCalendarDisplay();
  updateCalendarSummary();
}
```

### 2. **ปรับปรุงฟังก์ชัน `loadEmployeeOptions()`**
- เพิ่มการกรองพนักงานตามสาขาที่เลือก
- รองรับหลายแหล่งข้อมูลสาขา (branchId, branch.id, branch._id, allowedBranches, defaultBranches)
- แสดงพนักงานทั้งหมดเมื่อไม่ได้เลือกสาขา

```javascript
function loadEmployeeOptions() {
  // กรองพนักงานตามสาขาที่เลือก
  let filteredEmployees = employees;
  const targetBranchId = currentSelectedBranch || currentCalendarBranchFilter;
  
  if (targetBranchId) {
    filteredEmployees = employees.filter(emp => {
      // ตรวจสอบหลายแหล่งข้อมูลสาขา
      return emp.branchId === targetBranchId || 
             emp.branch?.id === targetBranchId ||
             emp.branch?._id === targetBranchId ||
             emp.allowedBranches?.some(branch => branch.id === targetBranchId || branch._id === targetBranchId) ||
             emp.defaultBranches?.some(branch => branch.id === targetBranchId || branch._id === targetBranchId);
    });
  }
  // ... rest of function
}
```

### 3. **เพิ่มปุ่ม "ทุกสาขา"**
- เพิ่มแท็บ "ทุกสาขา" ที่แสดงพนักงานจากทุกสาขา
- ตั้งเป็นค่าเริ่มต้นแทนการเลือกสาขาแรกอัตโนมัติ

```javascript
// Create "All Branches" tab first
const allTab = document.createElement('button');
// ... setup allTab with event listener to clear branch filters
```

### 4. **เพิ่มการโหลดพนักงานใน Modal**
- เพิ่ม `loadEmployeeOptions()` ใน `openAddModal()` เพื่อให้โหลดพนักงานที่ถูกต้องตามสาขาที่เลือก

```javascript
function openAddModal() {
  // ... existing code ...
  resetTimePeriodsForm();
  loadEmployeeOptions(); // โหลดรายการพนักงานตามสาขาที่เลือก
  ModalManager.open('attendance');
}
```

## 🎯 **ผลลัพธ์:**
- ✅ เมื่อเลือกสาขา จะแสดงเฉพาะพนักงานในสาขานั้น
- ✅ เมื่อเลือก "ทุกสาขา" จะแสดงพนักงานทั้งหมด
- ✅ ระบบจะเริ่มต้นด้วย "ทุกสาขา" แทนการเลือกสาขาแรกอัตโนมัติ
- ✅ การกรองทำงานได้ถูกต้องใน dropdown พนักงาน

## 🧪 **การทดสอบ:**
1. เปิดหน้า attendance.html
2. ตรวจสอบว่าเริ่มต้นด้วย "ทุกสาขา" และแสดงพนักงานทั้งหมด
3. คลิกเลือกสาขาต่างๆ และตรวจสอบว่าแสดงเฉพาะพนักงานในสาขานั้น
4. คลิก "เพิ่มการลงเวลา" และตรวจสอบว่า dropdown แสดงพนักงานที่ถูกต้อง
5. คลิก "ทุกสาขา" และตรวจสอบว่ากลับมาแสดงพนักงานทั้งหมด

## 📝 **หมายเหตุ:**
การแก้ไขนี้ยังคง backward compatibility กับโค้ดเดิม และปรับปรุง UX ให้ดีขึ้นด้วยการเพิ่มตัวเลือก "ทุกสาขา"