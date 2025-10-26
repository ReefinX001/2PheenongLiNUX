#!/usr/bin/env python3
"""
Script to update loading state in HTML files to match quotation.html pattern
"""

import re
import sys

def update_loading_html(content):
    """Update loading overlay HTML to use inline styles"""
    # Pattern 1: Old style with animate classes
    old_pattern1 = r'<div id="loadingOverlay" class="loading-overlay animate__animated animate__fadeIn" style="display: flex;">\s*<div class="text-center">\s*<div id="lottieContainer" style="width: 300px; height: 300px;"></div>\s*</div>\s*</div>'

    # Pattern 2: Any variation
    old_pattern2 = r'<div id="loadingOverlay"[^>]*>.*?<div id="lottieContainer"[^>]*></div>.*?</div>\s*</div>'

    new_html = '''<!-- Loading Overlay with Lottie Animation -->
  <div id="loadingOverlay" class="loading-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: rgba(255, 255, 255, 0.98); display: flex; justify-content: center; align-items: center; z-index: 999999; margin: 0; padding: 0;">
    <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
      <div id="lottieContainer" style="width: 300px; height: 300px; margin: 0 auto;"></div>
    </div>
  </div>'''

    # Try pattern 1 first
    content = re.sub(old_pattern1, new_html, content, flags=re.DOTALL)

    # If not found, try finding by id and replacing the whole block
    if 'animate__animated' in content or 'text-center' in content:
        # Find start and end of loading overlay div
        match = re.search(r'(<div id="loadingOverlay"[^>]*>)(.*?)(</div>\s*</div>)(?=\s*(?:<!--|\n|<))', content, re.DOTALL)
        if match:
            # Find the position and replace
            start = match.start()
            end = match.end()
            content = content[:start] + new_html + '\n' + content[end:]

    return content

def update_loading_css(content):
    """Update loading overlay CSS to include new properties"""

    # Find the .loading-overlay { block
    pattern = r'(\.loading-overlay \{)(.*?)(^\s*\})'

    new_css = '''.loading-overlay {
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

    # Find and replace the CSS block including related selectors
    # Match from .loading-overlay to the end of #lottieContainer or next major selector
    css_pattern = r'\.loading-overlay \{[^}]+\}(?:\s*\.loading-overlay\.animate__fadeOut \{[^}]+\})?(?:\s*\.loading-overlay\.hidden[^}]*\{[^}]+\})?(?:\s*\.loading-overlay\[style\*="display: none"\] \{[^}]+\})?(?:\s*#lottieContainer \{[^}]+\})?'

    match = re.search(css_pattern, content, re.DOTALL | re.MULTILINE)
    if match:
        content = content[:match.start()] + '/* Loading Overlay Styles - Enhanced with backdrop blur */\n    ' + new_css + content[match.end():]

    return content

def update_js_functions(content):
    """Update JavaScript showPageLoading and hidePageLoading functions"""

    # Update showPageLoading
    old_show = r'window\.showPageLoading = function\(\) \{\s*if \(loadingOverlay\) \{\s*loadingOverlay\.style\.display = \'flex\';\s*loadingOverlay\.classList\.remove\(\'animate__fadeOut\'\);\s*loadingOverlay\.classList\.add\(\'animate__fadeIn\'\);\s*\}\s*\};'

    new_show = '''window.showPageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
      }
    };'''

    content = re.sub(old_show, new_show, content, flags=re.DOTALL)

    # Update hidePageLoading
    old_hide = r'window\.hidePageLoading = function\(\) \{\s*if \(loadingOverlay\) \{\s*loadingOverlay\.classList\.remove\(\'animate__fadeIn\'\);\s*loadingOverlay\.classList\.add\(\'animate__fadeOut\'\);\s*setTimeout\(function\(\) \{\s*loadingOverlay\.style\.display = \'none\';\s*\}, 500\);\s*\}\s*\};'

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
    old_redirect = r'function showLoadingAndRedirect\(url\) \{\s*const overlay = document\.getElementById\(\'loadingOverlay\'\);\s*if \(overlay\) \{\s*overlay\.style\.display = \'flex\';\s*overlay\.classList\.remove\(\'animate__fadeOut\'\);\s*overlay\.classList\.add\(\'animate__fadeIn\'\);\s*\}\s*setTimeout\(\(\) => \{\s*window\.location\.href = url;\s*\}, 300\);\s*\}'

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

    return content

def process_file(filepath):
    """Process a single HTML file"""
    print(f"Processing {filepath}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply updates
        content = update_loading_html(content)
        content = update_loading_css(content)
        content = update_js_functions(content)

        # Check if anything changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ Updated {filepath}")
            return True
        else:
            print(f"  - No changes needed for {filepath}")
            return False

    except Exception as e:
        print(f"  ✗ Error processing {filepath}: {e}")
        return False

def main():
    files = [
        "/root/my-accounting-app/views/account/deposit_receipt.html",
        "/root/my-accounting-app/views/account/receipt.html",
        "/root/my-accounting-app/views/account/sales_tax_invoice.html",
        "/root/my-accounting-app/views/account/other_income.html",
        "/root/my-accounting-app/views/account/sales_debit_notee.html",
        "/root/my-accounting-app/views/account/sales_credit_notee.html",
        "/root/my-accounting-app/views/account/customer_details.html",
    ]

    updated_count = 0
    for filepath in files:
        if process_file(filepath):
            updated_count += 1

    print(f"\n{'='*60}")
    print(f"Summary: {updated_count}/{len(files)} files updated")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
