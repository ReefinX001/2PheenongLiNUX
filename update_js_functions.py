#!/usr/bin/env python3
"""Update JavaScript functions in all files"""
import re

files = [
    "/root/my-accounting-app/views/account/invoice.html",
    "/root/my-accounting-app/views/account/deposit_receipt.html",
    "/root/my-accounting-app/views/account/receipt.html",
    "/root/my-accounting-app/views/account/sales_tax_invoice.html",
    "/root/my-accounting-app/views/account/other_income.html",
    "/root/my-accounting-app/views/account/sales_debit_notee.html",
    "/root/my-accounting-app/views/account/sales_credit_notee.html",
    "/root/my-accounting-app/views/account/customer_details.html",
]

for filepath in files:
    print(f"\nProcessing: {filepath.split('/')[-1]}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = 0

    # 1. Update showPageLoading
    patterns = [
        # Pattern with classList operations
        (r"window\.showPageLoading\s*=\s*function\s*\(\s*\)\s*\{[^}]*loadingOverlay\.classList\.(?:remove|add)\(['\"]animate__[^}]{20,200}\};",
         """window.showPageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
      }
    };"""),

        # Pattern without classList
        (r"window\.showPageLoading\s*=\s*function\s*\(\s*\)\s*\{[^}]*loadingOverlay\.style\.display\s*=\s*['\"]flex['\"];[^}]*\};",
         None),  # Skip if already updated
    ]

    for pattern, replacement in patterns:
        if replacement and re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, replacement, content, flags=re.DOTALL, count=1)
            changes += 1
            print("  ✓ Updated showPageLoading")
            break

    # 2. Update hidePageLoading
    patterns = [
        # Pattern with classList
        (r"window\.hidePageLoading\s*=\s*function\s*\(\s*\)\s*\{[^}]*loadingOverlay\.classList\.(?:remove|add)\(['\"]animate__[^}]{20,300}\};",
         """window.hidePageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(function() {
          loadingOverlay.style.display = 'none';
          loadingOverlay.style.visibility = 'hidden';
        }, 500);
      }
    };"""),

        # Pattern without classList
        (r"window\.hidePageLoading\s*=\s*function\s*\(\s*\)\s*\{[^}]*loadingOverlay\.style\.opacity[^}]*\};",
         None),  # Skip if already updated
    ]

    for pattern, replacement in patterns:
        if replacement and re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, replacement, content, flags=re.DOTALL, count=1)
            changes += 1
            print("  ✓ Updated hidePageLoading")
            break

    # 3. Update showLoadingAndRedirect
    patterns = [
        # Pattern with classList
        (r"function\s+showLoadingAndRedirect\s*\(\s*url\s*\)\s*\{[^}]*overlay\.classList\.(?:remove|add)\(['\"]animate__[^}]{50,300}\}",
         """// Helper to show loading before redirect
    function showLoadingAndRedirect(url) {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
      }
      setTimeout(() => {
        window.location.href = url;
      }, 300);
    }"""),

        # Pattern without classList
        (r"function\s+showLoadingAndRedirect\s*\(\s*url\s*\)\s*\{[^}]*overlay\.style\.opacity[^}]*\}",
         None),  # Skip if already updated
    ]

    for pattern, replacement in patterns:
        if replacement and re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, replacement, content, flags=re.DOTALL, count=1)
            changes += 1
            print("  ✓ Updated showLoadingAndRedirect")
            break

    # Write if changed
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated ({changes} changes)")
    else:
        print("  ℹ️  No changes needed")

print("\n" + "="*60)
print("JavaScript functions update complete!")
print("="*60)
