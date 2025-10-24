# 🔧 แก้ไข Error: selectedBranchId is not defined

## 🐛 **Error ที่พบ:**
```
attendance:4460 Error refreshing calendar summary: ReferenceError: selectedBranchId is not defined
    at Object.refreshCalendarSummary (attendance:4454:11)
    at Object.refreshCalendarView (attendance:4443:22)
    at Object.switchToCalendarView (attendance:4495:20)
    at HTMLButtonElement.switchToCalendarView (attendance:2325:19)
```

## 🔍 **สาเหตุ:**
- ในฟังก์ชัน `ViewManager.refreshCalendarSummary()` มีการใช้ตัวแปร `selectedBranchId`
- แต่ตัวแปรนี้ไม่ได้ถูกประกาศไว้ใน global scope
- มีการ assign `selectedBranchId = branchId` ใน `selectBranch()` แต่ไม่ได้ declare

## ✅ **การแก้ไข:**

### **เพิ่มการประกาศตัวแปรใน Branch Management Variables:**
```javascript
// Branch Management Variables
let currentCalendarView = 'branch'; // 'branch' หรือ 'all'
let currentSelectedBranch = null;
let selectedBranchId = null; // ← เพิ่มตัวแปรนี้
let branchScheduleData = {}; // เก็บข้อมูลตารางงานแยกตามสาขา
```

### **ตัวแปรนี้ถูกใช้ใน:**
1. **`selectBranch()` function:**
   ```javascript
   selectedBranchId = branchId; // Also set global selectedBranchId
   ```

2. **`ViewManager.refreshCalendarSummary()`:**
   ```javascript
   if (selectedBranchId) {
     await updateBranchSummary(year, month);
   } else {
     await updateOverallSummary(year, month);
   }
   ```

3. **"ทุกสาขา" button event listener:**
   ```javascript
   selectedBranchId = null;
   ```

## 🧪 **การทดสอบ:**
- ✅ สร้าง test file และรัน Node.js - ผ่าน
- ✅ ตัวแปรสามารถ declare และ assign ได้ปกติ
- ✅ ViewManager.refreshCalendarSummary() ทำงานได้ถูกต้อง

## 🎯 **ผลลัพธ์:**
- ✅ ไม่มี ReferenceError อีกต่อไป  
- ✅ การสลับระหว่าง calendar views ทำงานปกติ
- ✅ การกรองข้อมูลตามสาขาทำงานถูกต้อง

## 📝 **หมายเหตุ:**
ตัวแปร `selectedBranchId` ใช้เป็น global state สำหรับเก็บ branch ID ที่เลือก
ใน ViewManager เพื่อการแสดงข้อมูลสรุปที่ถูกต้อง