# Thai Accounting Stock Management API Documentation

## Overview
This document provides comprehensive documentation for the Stock Management API endpoints in the Thai Accounting System. All endpoints include enhanced error handling, validation, and real-time Socket.IO integration.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Stock Management Endpoints](#stock-management-endpoints)
3. [Branch Stock Endpoints](#branch-stock-endpoints)
4. [Stock Transfer Endpoints](#stock-transfer-endpoints)
5. [Validation & Error Handling](#validation--error-handling)
6. [Socket.IO Events](#socketio-events)
7. [Response Formats](#response-formats)
8. [Thai Language Support](#thai-language-support)

---

## Authentication

All API endpoints require authentication via JWT token.

```http
Authorization: Bearer <jwt_token>
```

---

## Stock Management Endpoints

### 1. Create or Update Stock

Creates new stock entry or updates existing quantity for a product in a branch.

**Endpoint:** `POST /api/stock`

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "product_id": "ObjectId", // Required
  "branch_code": "string", // Required
  "quantity": "number", // Optional, defaults to 0
  "updated_by": "ObjectId" // Optional
}
```

**Validation Rules:**
- `product_id`: Must be valid ObjectId
- `branch_code`: Required, must exist in Branch collection
- `quantity`: Must be integer between 0 and 999,999
- `updated_by`: Must be valid ObjectId if provided

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "product_id": "ObjectId",
    "branch_code": "string",
    "quantity": "number",
    "updated_by": "ObjectId",
    "createdAt": "Date",
    "updatedAt": "Date"
  },
  "message": "อัปเดตข้อมูลสต็อกสำเร็จ",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "warnings": [] // Optional validation warnings
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข",
  "validation_errors": [
    {
      "field": "product_id",
      "message": "กรุณาระบุรหัสสินค้า"
    }
  ]
}
```

**Socket.IO Events Emitted:**
- `stockUpdated` (to branch-{branch_code} room)
- `stock_quantity_changed` (to stock-{branch_code} room)

---

### 2. Get All Stocks

Retrieves stock information with optional branch filtering.

**Endpoint:** `GET /api/stock`

**Query Parameters:**
- `branch_code` (optional): Filter by specific branch

**Example:**
```http
GET /api/stock?branch_code=00001
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "product_id": {
        "name": "iPhone 15 Pro",
        "sku": "IPH15PRO",
        "brand": "Apple",
        "model": "15 Pro",
        "price": 42900
      },
      "branch_code": {
        "name": "สำนักงานใหญ่",
        "branch_code": "00001"
      },
      "quantity": 5,
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Stock by ID

Retrieves specific stock item by ObjectId.

**Endpoint:** `GET /api/stock/:id`

**Path Parameters:**
- `id`: Stock ObjectId

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "product_id": {
      "name": "iPhone 15 Pro"
    },
    "branch_code": {
      "name": "สำนักงานใหญ่"
    },
    "quantity": 5,
    "updated_by": {
      "username": "admin"
    },
    "updatedAt": "2025-01-20T10:30:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "ไม่พบข้อมูลสต็อก"
}
```

---

## Branch Stock Endpoints

### 1. Create Branch Stock

Creates new stock item for a specific branch with comprehensive validation.

**Endpoint:** `POST /api/branch-stock`

**Request Body:**
```json
{
  "branch_code": "string", // Required
  "brand": "string", // Required, 1-100 characters
  "model": "string", // Required, 1-100 characters
  "name": "string", // Required, 1-200 characters
  "price": "number", // Optional, 0-9,999,999
  "cost": "number", // Optional, 0-9,999,999
  "imei": "string", // Optional, 15 digits with checksum validation
  "barcode": "string", // Optional, 8-50 alphanumeric characters
  "updated_by": "ObjectId", // Optional
  "poNumber": "string", // Optional, max 50 characters
  "invoiceNumber": "string", // Optional, max 50 characters
  "supplier": "string", // Optional, max 200 characters
  "taxType": "string", // Optional
  "categoryGroup": "string" // Optional
}
```

**Validation Rules:**
- **Required Fields**: branch_code, brand, model, name
- **String Validation**:
  - brand: 1-100 characters
  - model: 1-100 characters
  - name: 1-200 characters
  - poNumber: max 50 characters
  - invoiceNumber: max 50 characters
  - supplier: max 200 characters
- **Numeric Validation**:
  - price: 0-9,999,999 (can have decimals)
  - cost: 0-9,999,999 (can have decimals)
- **IMEI Validation**:
  - Must be exactly 15 digits
  - Must pass Luhn algorithm checksum
  - Must be unique in system
- **Barcode Validation**:
  - 8-50 alphanumeric characters (A-Z, a-z, 0-9, -, _)
- **Business Logic**:
  - Warning if price < cost
  - Branch must exist in database

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "branch_code": "00001",
    "brand": "Apple",
    "model": "iPhone 15 Pro",
    "name": "iPhone 15 Pro 128GB Natural Titanium",
    "price": 42900,
    "cost": 38000,
    "imei": "123456789012345",
    "barcode": "APL15PRO128NT",
    "verified": false,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  },
  "message": "เพิ่มข้อมูลสต็อกสำเร็จ",
  "warnings": [
    {
      "field": "price",
      "message": "ราคาขายต้องมากกว่าต้นทุน"
    }
  ]
}
```

**Validation Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข",
  "validation_errors": [
    {
      "field": "imei",
      "message": "หมายเลข IMEI ไม่ถูกต้อง (ต้องเป็นตัวเลข 15 หลัก)"
    },
    {
      "field": "price",
      "message": "ราคาไม่สามารถเกิน 9,999,999 บาท"
    }
  ],
  "warnings": []
}
```

---

### 2. Get All Stock for Branch

Retrieves verified stock items for a specific branch.

**Endpoint:** `GET /api/branch-stock/all/:branchCode`

**Path Parameters:**
- `branchCode`: Branch code (e.g., "00001")

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "name": "iPhone 15 Pro 128GB",
      "brand": "Apple",
      "model": "iPhone 15 Pro",
      "price": 42900,
      "downAmount": 5000,
      "downInstallment": 2000,
      "imei": "123456789012345"
    }
  ]
}
```

---

## Stock Transfer Endpoints

### 1. Transfer Stock Between Branches

Transfers stock from one branch to another with validation.

**Endpoint:** `POST /api/stock/transfer`

**Request Body:**
```json
{
  "transfer_from": "string", // Required, source branch code
  "transfer_to": "string", // Required, destination branch code
  "product_id": "ObjectId", // Required
  "quantity": "number", // Required, positive integer
  "reason": "string", // Optional, max 500 characters
  "transferred_by": "ObjectId" // Optional
}
```

**Validation Rules:**
- transfer_from ≠ transfer_to (cannot transfer to same branch)
- quantity must be positive integer (1-999,999)
- Both branches must exist
- Sufficient stock must be available in source branch
- reason max 500 characters if provided

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "transfer_from": "00001",
    "transfer_to": "00002",
    "product_id": "ObjectId",
    "quantity": 3,
    "reason": "เติมสต็อกสาขา",
    "transferred_by": "ObjectId",
    "status": "completed",
    "createdAt": "2025-01-20T10:30:00.000Z"
  },
  "message": "โอนย้ายสต็อกสำเร็จ"
}
```

**Validation Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "ข้อมูลการโอนย้ายไม่ถูกต้อง",
  "validation_errors": [
    {
      "field": "transfer_to",
      "message": "ไม่สามารถโอนย้ายภายในสาขาเดียวกันได้"
    },
    {
      "field": "quantity",
      "message": "จำนวนที่โอนย้ายต้องมากกว่า 0"
    }
  ]
}
```

**Socket.IO Events Emitted:**
- `stock_transferred_out` (to branch-{transfer_from} room)
- `stock_transferred_in` (to branch-{transfer_to} room)

---

## Validation & Error Handling

### Client-Side Validation
The system includes comprehensive client-side validation using `stockFormValidation.js`:

**Features:**
- Real-time field validation with Thai error messages
- Visual feedback (red borders for errors, yellow for warnings, green for success)
- IMEI checksum validation using Luhn algorithm
- Numeric input formatting with Thai thousand separators
- Business logic validation (price vs cost)
- Form submission prevention when validation fails

**Usage Example:**
```html
<form data-stock-form>
  <input name="imei" type="text" onblur="formatIMEI(this)" />
  <input name="price" type="text" onblur="formatThaiNumber(this)" />
  <input name="quantity" type="number" min="0" max="999999" />
</form>
```

### Server-Side Validation
Enhanced validation using `stockValidation.js` middleware:

**Features:**
- Comprehensive data type validation
- Range validation for numbers
- String length validation
- Pattern validation (IMEI, barcode, email)
- XSS protection and input sanitization
- Business logic validation
- Thai language error messages

### Error Response Format
All validation errors follow consistent format:

```json
{
  "success": false,
  "error": "หลักข้อความอธิบายข้อผิดพลาด",
  "validation_errors": [
    {
      "field": "ชื่อฟิลด์ที่ผิด",
      "message": "ข้อความแจ้งข้อผิดพลาดเป็นภาษาไทย"
    }
  ],
  "warnings": [
    {
      "field": "ชื่อฟิลด์ที่มีคำเตือน",
      "message": "ข้อความคำเตือนเป็นภาษาไทย"
    }
  ],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Socket.IO Events

### Connection Events

**Client to Server:**
```javascript
// Subscribe to stock updates for specific branch
socket.emit('stock_subscribe', {
  branchCode: '00001',
  productTypes: ['mobile', 'tablet']
});

// Join branch room for targeted updates
socket.emit('user_join', {
  userID: 'user123',
  branchCode: '00001'
});
```

**Server to Client:**
```javascript
// Stock quantity changed
socket.on('stock_quantity_changed', (data) => {
  console.log('Stock updated:', data);
  // {
  //   product_id: "ObjectId",
  //   branch_code: "00001",
  //   new_quantity: 15,
  //   change: +5,
  //   timestamp: "2025-01-20T10:30:00.000Z"
  // }
});

// Stock transfer notifications
socket.on('stock_transferred_in', (data) => {
  console.log('Stock received:', data);
});

socket.on('stock_transferred_out', (data) => {
  console.log('Stock sent:', data);
});

// Error notifications with Thai messages
socket.on('error_notification', (data) => {
  showErrorMessage(data.message);
  // {
  //   type: 'validation_error',
  //   message: 'ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาลองเข้าใหม่',
  //   timestamp: "2025-01-20T10:30:00.000Z"
  // }
});
```

### Enhanced Error Handling Events

**Connection Status:**
```javascript
// Connection successful
socket.on('connected', (data) => {
  console.log('Connected with features:', data.features);
});

// Reconnection attempts
socket.on('reconnect_attempt', (data) => {
  showReconnectingMessage(data.attempt, data.maxAttempts);
});

// Connection failed - fallback mode activated
socket.on('connection_failed', (data) => {
  enableFallbackMode();
  showOfflineMessage(data.message);
});
```

**Stock-Specific Error Events:**
```javascript
// Stock operation errors with Thai messages
socket.on('stock_error', (data) => {
  showStockError(data.operation, data.message, data.suggestion);
  // {
  //   operation: 'stock_update',
  //   message: 'ไม่สามารถอัปเดตข้อมูลสต็อกได้',
  //   suggestion: 'ตรวจสอบข้อมูลที่กรอกและลองอีกครั้ง',
  //   timestamp: "2025-01-20T10:30:00.000Z",
  //   recoverable: true
  // }
});
```

---

## Response Formats

### Success Response Format
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "ข้อความแจ้งผลสำเร็จเป็นภาษาไทย", // Optional
  "timestamp": "2025-01-20T10:30:00.000Z",
  "warnings": [] // Optional validation warnings
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "ข้อความอธิบายข้อผิดพลาดเป็นภาษาไทย",
  "validation_errors": [], // Optional field-specific errors
  "timestamp": "2025-01-20T10:30:00.000Z",
  "details": "เฉพาะใน development environment" // Optional
}
```

### Pagination Format
For endpoints that return large datasets:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Thai Language Support

### Field Names (Thai)
- `branch_code` → รหัสสาขา
- `product_id` → รหัสสินค้า
- `quantity` → จำนวน
- `price` → ราคา
- `cost` → ต้นทุน
- `brand` → ยี่ห้อ
- `model` → รุ่น
- `name` → ชื่อสินค้า
- `imei` → หมายเลข IMEI
- `barcode` → บาร์โค้ด
- `supplier` → ผู้จำหน่าย

### Common Error Messages (Thai)
- "กรุณากรอก[ฟิลด์]" → Please fill in [field]
- "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข" → Invalid data, please check and correct
- "จำนวนต้องเป็นตัวเลขที่มากกว่า 0" → Quantity must be a number greater than 0
- "หมายเลข IMEI ไม่ถูกต้อง" → IMEI number is invalid
- "ราคาขายต้องมากกว่าต้นทุน" → Selling price must be greater than cost

### Success Messages (Thai)
- "อัปเดตข้อมูลสต็อกสำเร็จ" → Stock data updated successfully
- "เพิ่มข้อมูลสต็อกสำเร็จ" → Stock data added successfully
- "โอนย้ายสต็อกสำเร็จ" → Stock transfer completed successfully

---

## HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful operation |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate data (e.g., IMEI exists) |
| 422 | Unprocessable Entity | Business logic validation failed |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

All API endpoints are subject to rate limiting:

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **File upload endpoints**: 20 requests per 15 minutes per IP

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

---

## Security Features

### Input Sanitization
- All string inputs are sanitized to remove HTML/script tags
- XSS protection using xss-clean middleware
- MongoDB injection protection using express-mongo-sanitize

### Authentication & Authorization
- JWT token validation for all protected endpoints
- Role-based access control (RBAC)
- Branch-specific data access control

### Data Validation
- Comprehensive server-side validation
- Client-side validation with visual feedback
- Business logic validation
- Real-time validation for critical fields (IMEI uniqueness)

---

## Development & Testing

### Local Development
```bash
# Start server in development mode
npm run dev

# Run with debugging
DEBUG=stock:* npm run dev

# Test specific endpoint
curl -X POST http://localhost:3000/api/stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"product_id":"...","branch_code":"00001","quantity":5}'
```

### Testing with Postman
Import the provided Postman collection (`stock-api-tests.postman_collection.json`) which includes:
- Authentication setup
- All stock endpoints with sample data
- Error scenario testing
- Thai language validation testing

---

## Changelog

### Version 1.0.0 (2025-01-20)
- ✅ Enhanced Socket.IO error handling with reconnection logic
- ✅ Comprehensive input validation with Thai error messages
- ✅ Client-side form validation with real-time feedback
- ✅ IMEI checksum validation using Luhn algorithm
- ✅ Business logic validation (price vs cost)
- ✅ XSS protection and input sanitization
- ✅ Real-time stock updates via Socket.IO
- ✅ Thai language support throughout API
- ✅ Detailed API documentation with examples

---

## Support

For technical support or questions about this API:

- **Development Team**: Thai Accounting System Development
- **Documentation**: This file and inline code comments
- **Testing**: Use provided Postman collection
- **Error Reporting**: Check server logs and Socket.IO client logs

---

*Last Updated: January 20, 2025*
*Version: 1.0.0*