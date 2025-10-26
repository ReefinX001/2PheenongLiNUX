#!/bin/bash

# Array of files to update
FILES=(
  "/root/my-accounting-app/views/account/deposit_receipt.html"
  "/root/my-accounting-app/views/account/receipt.html"
  "/root/my-accounting-app/views/account/sales_tax_invoice.html"
  "/root/my-accounting-app/views/account/other_income.html"
  "/root/my-accounting-app/views/account/sales_debit_notee.html"
  "/root/my-accounting-app/views/account/sales_credit_notee.html"
  "/root/my-accounting-app/views/account/customer_details.html"
)

echo "Starting bulk update of loading states..."
echo "==========================================="

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ File not found: $file"
    continue
  fi

  echo ""
  echo "Processing: $(basename "$file")"

  # Create backup
  cp "$file" "${file}.backup"

  # Count changes
  changes=0

  # 1. Update HTML Loading Overlay
  # Replace the old loading overlay HTML with new version
  perl -i -0pe 's|<div id="loadingOverlay" class="loading-overlay animate__animated animate__fadeIn" style="display: flex;">\s*<div class="text-center">\s*<div id="lottieContainer" style="width: 300px; height: 300px;"></div>\s*</div>\s*</div>|<!-- Loading Overlay with Lottie Animation -->\n  <div id="loadingOverlay" class="loading-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: rgba(255, 255, 255, 0.98); display: flex; justify-content: center; align-items: center; z-index: 999999; margin: 0; padding: 0;">\n    <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">\n      <div id="lottieContainer" style="width: 300px; height: 300px; margin: 0 auto;"></div>\n    </div>\n  </div>|g' "$file" && changes=$((changes+1))

  # 2. Update CSS - replace .loading-overlay block
  # This is complex, so we'll do it with a more targeted approach
  python3 << 'PYTHON_SCRIPT'
import re
import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the CSS block
css_pattern = r'(\.loading-overlay \{[^}]+\})\s*(\.loading-overlay\.animate__fadeOut \{[^}]+\})?\s*(\.loading-overlay\.hidden,?\s*\.loading-overlay\[style\*="display: none"\] \{[^}]+\})?(\s*#lottieContainer \{[^}]+\})?'

new_css = '''/* Loading Overlay Styles - Enhanced with backdrop blur */
    .loading-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(255, 255, 255, 0.98) !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      transition: opacity 0.5s ease-out, visibility 0.5s ease-out !important;
      pointer-events: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    .loading-overlay > div {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      flex-direction: column !important;
    }

    .loading-overlay.animate__fadeOut {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    .loading-overlay.hidden,
    .loading-overlay[style*="display: none"] {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }

    #lottieContainer {
      width: 300px !important;
      height: 300px !important;
      margin: 0 auto !important;
      display: block !important;
    }'''

content = re.sub(css_pattern, new_css, content, flags=re.MULTILINE | re.DOTALL)

# 3. Update JavaScript functions
# Update showPageLoading
old_show = r'window\.showPageLoading = function\(\) \{\s*if \(loadingOverlay\) \{\s*loadingOverlay\.style\.display = [\'"]flex[\'"];\s*loadingOverlay\.classList\.remove\([\'"]animate__fadeOut[\'"]\);\s*loadingOverlay\.classList\.add\([\'"]animate__fadeIn[\'"]\);\s*\}\s*\};'

new_show = '''window.showPageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
      }
    };'''

content = re.sub(old_show, new_show, content, flags=re.DOTALL)

# Update hidePageLoading
old_hide = r'window\.hidePageLoading = function\(\) \{\s*if \(loadingOverlay\) \{\s*loadingOverlay\.classList\.remove\([\'"]animate__fadeIn[\'"]\);\s*loadingOverlay\.classList\.add\([\'"]animate__fadeOut[\'"]\);\s*setTimeout\(function\(\) \{\s*loadingOverlay\.style\.display = [\'"]none[\'"];\s*\}, 500\);\s*\}\s*\};'

new_hide = '''window.hidePageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(function() {
          loadingOverlay.style.display = 'none';
          loadingOverlay.style.visibility = 'hidden';
        }, 500);
      }
    };'''

content = re.sub(old_hide, new_hide, content, flags=re.DOTALL)

# Update showLoadingAndRedirect if exists
old_redirect = r'function showLoadingAndRedirect\(url\) \{\s*const overlay = document\.getElementById\([\'"]loadingOverlay[\'"]\);\s*if \(overlay\) \{\s*overlay\.style\.display = [\'"]flex[\'"];\s*overlay\.classList\.remove\([\'"]animate__fadeOut[\'"]\);\s*overlay\.classList\.add\([\'"]animate__fadeIn[\'"]\);\s*\}\s*setTimeout\(\(\) => \{\s*window\.location\.href = url;\s*\}, 300\);\s*\}'

new_redirect = '''// Helper to show loading before redirect
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
    }'''

content = re.sub(old_redirect, new_redirect, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

PYTHON_SCRIPT "$file"

  if [ $? -eq 0 ]; then
    echo "  ✓ Updated successfully"
  else
    echo "  ✗ Error during update"
    mv "${file}.backup" "$file"
  fi
done

echo ""
echo "==========================================="
echo "Update complete!"
echo "Backup files created with .backup extension"
