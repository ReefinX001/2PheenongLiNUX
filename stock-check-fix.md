# Stock Check Issue Fix Report

## 🔍 Problem Identified
The installment stock check was failing with "สต๊อกไม่เพียงพอ (มีอยู่ 0 หน่วย)" despite having stock_value: 1 in the database.

## 🎯 Root Cause Analysis

### Issue 1: Wrong Collection Being Checked
- **Problem**: System was checking `Stock` collection instead of `BranchStock`
- **Impact**: Stock checks always returned 0 because products weren't in Stock collection

### Issue 2: Missing product_id in API Response
- **Problem**: `/api/branch-stock/taxType` and `/search` endpoints didn't include `product_id` field
- **Impact**: Frontend couldn't properly map product IDs for stock checking

### Issue 3: Incorrect Stock Check Endpoint
- **Problem**: Using `/api/stock/check-after-sale` which checks Stock collection
- **Impact**: BranchStock items weren't being found

## ✅ Solutions Implemented

### 1. Created New Endpoint for BranchStock
**File**: `routes/branchStockRoutes.js`
**Endpoint**: `POST /api/branch-stock/check-installment-stock`

```javascript
router.post('/check-installment-stock', async (req, res) => {
  // Checks BranchStock collection using:
  // - _id for products without IMEI
  // - imei for products with IMEI
  // - Verifies stock_value field
  // - Updates stock_value on successful deduction
});
```

### 2. Updated Frontend to Use New Endpoint
**File**: `views/pattani/installment/step4/js/step4-integration.js`
**Changes**:
- `checkStockAvailability()` now calls `/api/branch-stock/check-installment-stock`
- `updateStock()` now calls `/api/branch-stock/check-installment-stock`

### 3. Added product_id to API Responses
**File**: `routes/branchStockRoutes.js`
**Changes**:
- Added `product_id` to select statements in `/taxType` endpoint
- Added `product_id` to all select statements in `/search` endpoint

### 4. Enhanced Product ID Mapping
**File**: `views/pattani/installment/step4/js/step4-integration.js`
**Changes**:
```javascript
// Map productId with multiple fallbacks
const productId = item.productId || item.product_id || item.product || item.id;
```

## 📊 Data Flow

### Before Fix:
```
Step1 → cartItems with productId: null
      → Step4 uses BranchStock._id as product_id
      → Stock API checks Stock collection
      → No match found → 0 stock
```

### After Fix:
```
Step1 → cartItems with productId from BranchStock.product_id
      → Step4 uses correct ID mapping
      → BranchStock API checks BranchStock collection
      → Finds item by _id or imei
      → Returns actual stock_value
```

## 🔄 Required Actions

### ⚠️ IMPORTANT: Server Restart Required
The server must be restarted for the new routes to take effect:
```bash
# Stop the current server
# Then restart with:
npm start
# or
node server.js
```

## 🧪 Testing Verification

### Test Data:
- **BranchStock ID**: 68721e7837da42f5e3682ac3
- **Product**: IPAD GEN10 256GB PINK
- **IMEI**: SL6H3FK3Q7T
- **Stock Value**: 1
- **Branch Code**: 00000

### Expected Behavior After Fix:
1. Stock check should find the item
2. Should show "มีอยู่ 1 หน่วย" instead of "มีอยู่ 0 หน่วย"
3. Stock deduction should succeed if quantity requested ≤ 1

## 📝 Files Modified

1. **routes/branchStockRoutes.js**
   - Added new endpoint `/check-installment-stock`
   - Added `product_id` to select statements
   - Added mongoose import

2. **views/pattani/installment/step4/js/step4-integration.js**
   - Updated API endpoints for stock checking
   - Enhanced product ID mapping logic

## 🚀 Status
**Fix Implemented**: ✅ COMPLETED
**Server Restart**: ⏳ PENDING
**Testing**: ⏳ PENDING

Once the server is restarted, the stock checking should work correctly for installment sales.