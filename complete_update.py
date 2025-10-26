#!/usr/bin/env python3
"""Complete update script for all remaining files"""
import re
import sys

files_to_update = [
    "/root/my-accounting-app/views/account/deposit_receipt.html",
    "/root/my-accounting-app/views/account/receipt.html",
    "/root/my-accounting-app/views/account/sales_tax_invoice.html",
    "/root/my-accounting-app/views/account/other_income.html",
    "/root/my-accounting-app/views/account/sales_debit_notee.html",
    "/root/my-accounting-app/views/account/sales_credit_notee.html",
    "/root/my-accounting-app/views/account/customer_details.html",
]

def update_file(filepath):
    """Update a single file with all necessary changes"""
    print(f"\nProcessing: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        changes = 0

        # 1. Update HTML (already done, but make sure)
        old_html = r'<div id="loadingOverlay" class="loading-overlay animate__animated animate__fadeIn" style="display: flex;">\s*<div class="text-center">\s*<div id="lottieContainer" style="width: 300px; height: 300px;"></div>\s*</div>\s*</div>'

        new_html = '''<!-- Loading Overlay with Lottie Animation -->
  <div id="loadingOverlay" class="loading-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: rgba(255, 255, 255, 0.98); display: flex; justify-content: center; align-items: center; z-index: 999999; margin: 0; padding: 0;">
    <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
      <div id="lottieContainer" style="width: 300px; height: 300px; margin: 0 auto;"></div>
    </div>
  </div>'''

        if re.search(old_html, content, re.DOTALL):
            content = re.sub(old_html, new_html, content, flags=re.DOTALL)
            changes += 1
            print("  ✓ Updated HTML loading overlay")

        # 2. Update CSS
        # Find and replace CSS block - simpler approach
        css_old_patterns = [
            # Pattern 1: Basic loading-overlay
            (r'\.loading-overlay \{[^}]+\}', False),
        ]

        # Check if CSS needs updating
        if '.loading-overlay {' in content and 'visibility: visible' not in content:
            # Find the entire CSS section and rebuild it
            css_start = content.find('.loading-overlay {')
            if css_start > 0:
                # Find where this style section ends (look for next style or closing tag)
                css_section_end = content.find('</style>', css_start)
                before_css_section = content.find('.loading-overlay {', 0)

                # Build new CSS
                new_css_block = '''/* Loading Overlay Styles - Enhanced with backdrop blur */
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
    }
  </style>'''

                # Find start of .loading-overlay and replace until </style>
                # Look backwards to find if there's a comment before it
                check_before = content[max(0, css_start-200):css_start]
                if '/* Loading Overlay' in check_before:
                    # Comment exists, find its start
                    comment_start = content.rfind('/*', max(0, css_start-200), css_start)
                    content = content[:comment_start] + new_css_block
                else:
                    content = content[:css_start] + new_css_block

                changes += 1
                print("  ✓ Updated CSS styles")

        # 3. Update JavaScript functions
        # showPageLoading
        show_pattern = r"window\.showPageLoading = function\(\) \{[^}]*loadingOverlay\.classList\.add\('animate__fadeIn'\)[^}]*\};"
        show_replacement = """window.showPageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
      }
    };"""

        if re.search(show_pattern, content, re.DOTALL):
            content = re.sub(show_pattern, show_replacement, content, flags=re.DOTALL)
            changes += 1
            print("  ✓ Updated showPageLoading function")

        # hidePageLoading
        hide_pattern = r"window\.hidePageLoading = function\(\) \{[^}]*loadingOverlay\.classList\.add\('animate__fadeOut'\)[^}]*\};"
        hide_replacement = """window.hidePageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(function() {
          loadingOverlay.style.display = 'none';
          loadingOverlay.style.visibility = 'hidden';
        }, 500);
      }
    };"""

        if re.search(hide_pattern, content, re.DOTALL):
            content = re.sub(hide_pattern, hide_replacement, content, flags=re.DOTALL)
            changes += 1
            print("  ✓ Updated hidePageLoading function")

        # showLoadingAndRedirect
        redirect_pattern = r"function showLoadingAndRedirect\(url\) \{[^}]*overlay\.classList\.add\('animate__fadeIn'\)[^}]*\}"
        redirect_replacement = """// Helper to show loading before redirect
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
    }"""

        if re.search(redirect_pattern, content, re.DOTALL):
            content = re.sub(redirect_pattern, redirect_replacement, content, flags=re.DOTALL)
            changes += 1
            print("  ✓ Updated showLoadingAndRedirect function")

        # Write if changed
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ File updated ({changes} changes)")
            return True
        else:
            print("  ℹ️  No changes needed")
            return False

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("="*70)
    print("Starting bulk update of loading states...")
    print("="*70)

    updated = 0
    for filepath in files_to_update:
        if update_file(filepath):
            updated += 1

    print("\n" + "="*70)
    print(f"Summary: {updated}/{len(files_to_update)} files updated")
    print("="*70)

if __name__ == "__main__":
    main()
