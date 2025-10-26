#!/usr/bin/env python3
import re

files_to_update = [
    "/root/my-accounting-app/views/account/deposit_receipt.html",
    "/root/my-accounting-app/views/account/receipt.html",
    "/root/my-accounting-app/views/account/sales_tax_invoice.html",
    "/root/my-accounting-app/views/account/other_income.html",
    "/root/my-accounting-app/views/account/sales_debit_notee.html",
    "/root/my-accounting-app/views/account/sales_credit_notee.html",
    "/root/my-accounting-app/views/account/customer_details.html",
]

for filepath in files_to_update:
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove duplicate comments first
        content = re.sub(r'(<!-- Loading Overlay with Lottie Animation -->\s*){2,}', '<!-- Loading Overlay with Lottie Animation -->\n  ', content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Cleaned {filepath}")
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\nDone!")
