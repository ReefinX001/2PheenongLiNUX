# 📋 ESLint Setup Guide

ESLint ได้ถูกติดตั้งและตั้งค่าเรียบร้อยแล้วสำหรับโปรเจค Accounting System

## ✅ สิ่งที่ได้ติดตั้ง

- **ESLint v9.38.0** - JavaScript linter
- **eslint-plugin-html** - รองรับการเช็ค JavaScript ใน HTML files

## 🎯 คำสั่งที่ใช้งาน

### 1. เช็คทั้งโปรเจค
```bash
npm run lint
```

### 2. เช็คเฉพาะ HTML files ใน views/account
```bash
npm run lint:html
```

### 3. เช็คและแก้ไขอัตโนมัติ
```bash
npm run lint:fix
```

### 4. เช็คแบบ quiet (แสดงแค่ errors)
```bash
npm run lint:account
```

### 5. เช็คไฟล์เดียว
```bash
npx eslint views/account/goods_receipt.html
```

### 6. แก้ไขไฟล์เดียวอัตโนมัติ
```bash
npx eslint views/account/goods_receipt.html --fix
```

## 📊 ผลการทดสอบ

### ✅ goods_receipt.html
- **Before**: 1 error, 65 warnings
- **After --fix**: 0 errors, 4 warnings
- **Fixed**: Missing semicolons, trailing spaces (61 issues)
- **Remaining**: 4 unused variables (safe to ignore)

### ✅ purchase_tax_invoice.html
- **Before**: 1 error, 20 warnings
- **After --fix**: 0 errors, 4 warnings
- **Fixed**: Missing semicolons, trailing spaces (17 issues)
- **Remaining**: 4 unused variables (safe to ignore)

## 🔧 Rules ที่เปิดใช้งาน

| Rule | Level | Description |
|------|-------|-------------|
| `quotes` | error | ใช้ single quotes |
| `semi` | error | ต้องมี semicolon |
| `no-trailing-spaces` | warn | ห้ามมี trailing spaces |
| `no-unused-vars` | warn | ตัวแปรที่ไม่ได้ใช้ |
| `no-undef` | warn | ตัวแปรที่ไม่ได้ประกาศ |
| `no-console` | off | อนุญาตให้ใช้ console.log |

## 🌐 Globals ที่กำหนดไว้

ESLint รู้จักตัวแปร global เหล่านี้:

### Browser APIs
- `window`, `document`, `console`
- `fetch`, `localStorage`, `sessionStorage`
- `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`
- `alert`, `confirm`, `prompt`
- `location`, `navigator`, `screen`
- `XMLHttpRequest`, `MutationObserver`
- `Element`, `Document`, `Image`, `URL`

### Browser Crypto & Encoding
- `crypto` - Web Crypto API
- `btoa` - Base64 encoding
- `atob` - Base64 decoding

### Node.js Globals
- `require`, `module`, `exports`
- `process`, `__dirname`, `__filename`
- `Buffer`

### Libraries
- `tailwind` - Tailwind CSS
- `LoadingSystem` - Custom loading system
- `lottie` - Lottie animations
- `Chart` - Chart.js
- `dayjs` - Day.js date library
- `XLSX` - Excel export
- `html2pdf` - PDF generation
- `CryptoAES` - CryptoJS library
- `io` - Socket.IO

### Security Utilities
- `SecurityScanner`
- `SecurityLogger`
- `SecurityUtils`
- `SecureAuth`

### Application Functions
- `fetchUserProfile`
- `resolvePhotoUrl`
- `logout`
- `showLoading`
- `API_BASE`
- `token`

## 📝 ตัวอย่างการใช้งาน

### แก้ไขปัญหาทั้งหมดใน account folder
```bash
npx eslint views/account/*.html --fix
```

### เช็คเฉพาะ errors (ไม่แสดง warnings)
```bash
npx eslint views/account/*.html --quiet
```

### เช็คและบันทึกผลลงไฟล์
```bash
npx eslint views/account/*.html > eslint-report.txt
```

## ⚠️ ข้อควรระวัง

1. **Unused Variables**: ESLint จะเตือนเมื่อมีตัวแปรที่ไม่ได้ใช้ แต่บางครั้งตัวแปรเหล่านั้นอาจถูกใช้ใน HTML templates ซึ่งเป็น warning ที่ปลอดภัย

2. **Global Variables**: ถ้ามีการเพิ่ม library ใหม่ ต้องเพิ่มใน `eslint.config.js` ที่ส่วน `globals`

3. **Auto-fix**: คำสั่ง `--fix` จะแก้ไขไฟล์โดยอัตโนมัติ แนะนำให้ commit code ก่อนรัน

## 🔄 Integration กับ Workflow

### Pre-commit Hook (แนะนำ)
เพิ่มใน `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run lint:account
```

### VS Code Integration
ติดตั้ง extension: **ESLint** (dbaeumer.vscode-eslint)

Settings:
```json
{
  "eslint.validate": ["javascript", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 📖 เพิ่มเติม

- ESLint Docs: https://eslint.org/docs/latest/
- Migration Guide: https://eslint.org/docs/latest/use/configure/migration-guide
- HTML Plugin: https://github.com/BenoitZugmeyer/eslint-plugin-html

---

**สร้างเมื่อ**: 2025-10-24
**Version**: ESLint 9.38.0 + eslint-plugin-html
