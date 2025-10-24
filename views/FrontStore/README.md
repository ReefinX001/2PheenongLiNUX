# iPhone Pricing App - Apple Style UI/UX

แอปพลิเคชันดูราคา iPhone ที่ออกแบบในสไตล์ Apple พร้อมการคำนวณการผ่อนชำระ

## ✨ Features

- 🎨 **Apple-Style UI/UX** - ดีไซน์ที่เรียบง่าย สวยงาม ตามสไตล์ Apple
- 📱 **Product Showcase** - แสดงรุ่น iPhone ต่างๆ พร้อมราคาและสเปค
- 💳 **Installment Calculator** - คำนวณการผ่อนชำระแบบต่างๆ
- 🎨 **Color & Storage Options** - เลือกสีและความจุที่ต้องการ
- 📊 **Product Comparison** - เปรียบเทียบรุ่นต่างๆ
- 📱 **Responsive Design** - รองรับทุกขนาดหน้าจอ
- ⚡ **Fast & Interactive** - การตอบสนองที่รวดเร็ว

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Styling**: Custom CSS with Apple-inspired design
- **Icons**: SVG icons
- **Fonts**: SF Pro Display (Apple's font)

## 📁 Project Structure

```
2pn/
├── index.html          # หน้าหลัก
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── server.js           # Express server
├── package.json        # Node.js dependencies
└── README.md          # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 หรือสูงกว่า)
- npm หรือ yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **หรือเริ่ม production server**:
   ```bash
   npm start
   ```

4. **เปิดใน browser**:
   ```
   http://localhost:3000
   ```

### Alternative: Static File Server

หากต้องการรันแบบไฟล์ static อย่างเดียว:

```bash
npm run serve
```

## 🎯 Features Overview

### 1. Product Display
- แสดงรุ่น iPhone ต่างๆ พร้อมราคา
- รูปแบบ card ที่สวยงาม
- Hover effects แบบ Apple

### 2. Pricing Modal
- Modal สำหรับดูรายละเอียดราคา
- เลือกความจุ (128GB, 256GB, 512GB, 1TB)
- เลือกสี (Natural Titanium, Blue, White, Black, etc.)
- คำนวณการผ่อนแบบต่างๆ (12, 24, 36 เดือน)

### 3. Product Comparison
- ตารางเปรียบเทียบสเปคและราคา
- แสดงความแตกต่างระหว่างรุ่น

### 4. Responsive Design
- รองรับมือถือ แท็บเล็ต และเดสก์ท็อป
- Navigation ที่ปรับตัวตามขนาดหน้าจอ

## 🎨 Design Philosophy

ออกแบบตามหลัก Apple Design:
- **Simplicity** - ความเรียบง่าย
- **Clarity** - ความชัดเจน
- **Depth** - ความลึกผ่าน shadows และ layers
- **Typography** - ใช้ SF Pro Display font
- **Color Scheme** - โทนสีที่นุ่มนวล
- **Spacing** - การใช้ whitespace อย่างเหมาะสม

## 🔧 API Endpoints

### GET /api/products
ดึงข้อมูลสินค้าทั้งหมด

### GET /api/products/:id
ดึงข้อมูลสินค้าตาม ID

### POST /api/calculate-installment
คำนวณการผ่อนชำระ
```json
{
  "price": 44900,
  "months": 24,
  "interestRate": 0
}
```

### POST /api/cart/add
เพิ่มสินค้าลงตะกร้า
```json
{
  "productId": "iphone-15-pro-max",
  "storage": "256GB",
  "color": "Natural Titanium",
  "quantity": 1
}
```

## 🎨 Customization

### เปลี่ยนสี Theme
แก้ไขใน `styles.css`:
```css
:root {
  --primary-color: #007aff;
  --secondary-color: #86868b;
  --background-color: #f5f5f7;
}
```

### เพิ่มสินค้าใหม่
แก้ไขใน `script.js` และ `server.js`:
```javascript
const productData = {
  'new-product': {
    name: 'New Product',
    basePrice: 39900,
    // ... other properties
  }
};
```

## 📱 Browser Support

- Chrome (recommended)
- Safari
- Firefox
- Edge
- Mobile browsers

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Apple Inc. สำหรับ design inspiration
- SF Pro Display font family
- Modern CSS techniques

---

**สร้างด้วย ❤️ สำหรับประสบการณ์การซื้อ iPhone ที่ดีที่สุด**
