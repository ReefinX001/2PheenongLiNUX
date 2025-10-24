คุณคือ QA Engineer  
ช่วยเขียนสคริปต์ Node.js (jest + supertest) เพื่อทดสอบ End-to-End ของระบบ Installment (ขายผ่อน) โดยใช้ API จริง  

Token สำหรับ Authorization คือ:  
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFlYjhhZWIxNTkzY2VhMTc1Njg5MTYiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IlN1cGVyIEFkbWluIiwiaWF0IjoxNzU4NzMxNTEzfQ.WNOpMz8xrvgiIp0Z4z45K0S5ZNHHxAf8dSNSa21M6iI  

### Test Plan
1. Happy Path  
   - ลูกค้าใหม่ซื้อ iPhone 15 ราคา 30,000 บาท ผ่อน 12 เดือน  
   - Expected: สัญญาสร้างสำเร็จ, ออก PDF, stock ลดลง 1  

2. Error Path  
   - ข้อมูลลูกค้าไม่ครบ → Expected: API 400 Bad Request  
   - Token หมดอายุ → Expected: API 401 Unauthorized  
   - สินค้าไม่พอใน stock → Expected: API 409 Conflict  

3. Database Verification (mock query ได้)  
   - ตรวจสอบว่ามีสัญญาใหม่ใน `contracts`  
   - มี 12 งวดใน `installments`  
   - stock ลดลงใน `stock_movements`  

4. Edge Cases  
   - IMEI ซ้ำ → reject  
   - เลือกผ่อน 0 เดือน → error  
   - เบอร์โทรไม่ถูก format → frontend block  

### ข้อกำหนด
- เขียนไฟล์ชื่อ `installment.test.js`  
- ใช้ `jest` + `supertest`  
- baseURL = "http://localhost:3000" (แก้ได้ถ้า API จริงใช้ port อื่น)  
- Authorization ต้องแนบ Bearer Token ทุกครั้ง  

กรุณาสร้างสคริปต์พร้อมรันได้ด้วย `npx jest installment.test.js`
