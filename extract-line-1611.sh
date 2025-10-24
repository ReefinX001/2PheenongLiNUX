#!/bin/bash
# Extract and format line 1611 from purchase_order.html

sed -n '1611p' /root/my-accounting-app/views/account/purchase_order.html | \
  sed 's/btnToggleDark\.addEventListener/\nBTN_TOGGLE_DARK.addEventListener/g' | \
  grep -A2 "BTN_TOGGLE_DARK"
