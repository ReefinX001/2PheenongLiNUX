#!/usr/bin/env python3
"""Add Page Loading Script to files that don't have it"""
import re

files = [
    "/root/my-accounting-app/views/account/deposit_receipt.html",
    "/root/my-accounting-app/views/account/receipt.html",
    "/root/my-accounting-app/views/account/sales_tax_invoice.html",
    "/root/my-accounting-app/views/account/other_income.html",
    "/root/my-accounting-app/views/account/sales_debit_notee.html",
    "/root/my-accounting-app/views/account/sales_credit_notee.html",
    "/root/my-accounting-app/views/account/customer_details.html",
]

# The complete Page Loading Script
page_loading_script = '''  <!-- Page Loading Script -->
  <script>
    // Initialize Lottie Animation for Loading
    const lottieContainer = document.getElementById('lottieContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    let lottieAnimation;

    // Function to show page loading overlay
    window.showPageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
      }
    };

    // Function to hide page loading overlay
    window.hidePageLoading = function() {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(function() {
          loadingOverlay.style.display = 'none';
          loadingOverlay.style.visibility = 'hidden';
        }, 500);
      }
    };

    if (lottieContainer && typeof lottie !== 'undefined') {
      try {
        // Load Lottie animation
        lottieAnimation = lottie.loadAnimation({
          container: lottieContainer,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/Loading/Loading.json'
        });

        // Ensure loading is visible initially
        showPageLoading();

        // Wait for DOM content to be fully loaded and all resources
        let dataLoaded = false;
        let pageLoaded = false;

        // Function to check if we should hide loading
        function checkAndHideLoading() {
          if (dataLoaded && pageLoaded) {
            setTimeout(function() {
              hidePageLoading();
            }, 500); // Small delay to ensure smooth transition
          }
        }

        // Hide loading after page fully loads
        window.addEventListener('load', function() {
          pageLoaded = true;
          checkAndHideLoading();
        });

        // Fetch user profile and hide loading when done
        if (typeof fetchUserProfile === 'function') {
          fetchUserProfile().then(function() {
            dataLoaded = true;
            checkAndHideLoading();
          }).catch(function(error) {
            console.error('Error fetching user profile:', error);
            dataLoaded = true;
            checkAndHideLoading();
          });
        } else {
          dataLoaded = true;
          checkAndHideLoading();
        }

        // Fallback: ensure loading is hidden after maximum wait time
        setTimeout(function() {
          if (!dataLoaded || !pageLoaded) {
            dataLoaded = true;
            pageLoaded = true;
            hidePageLoading();
          }
        }, 5000); // Maximum 5 seconds wait time

      } catch (error) {
        console.error('Error loading Lottie animation:', error);
        loadingOverlay.style.display = 'none';
      }
    } else {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (typeof fetchUserProfile === 'function') fetchUserProfile();
    }

    // Show loading before page navigation
    window.addEventListener('beforeunload', function() {
      showPageLoading();
    });

    // Intercept internal links to show loading
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href]');
      if (link && !link.hasAttribute('target') && !link.getAttribute('href').startsWith('#')) {
        const href = link.getAttribute('href');
        // Only show loading for internal navigation (not external links)
        if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          showPageLoading();
        }
      }
    });
  </script>

'''

for filepath in files:
    print(f"\nProcessing: {filepath.split('/')[-1]}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if Page Loading Script already exists
        if 'window.showPageLoading' in content or '<!-- Page Loading Script -->' in content:
            print("  ℹ️  Page Loading Script already exists")
            continue

        # Find where to insert - before closing </body> tag or before Account Menu Script
        insert_patterns = [
            (r'(\s*<!-- Account Menu Script -->)', page_loading_script + r'\1'),
            (r'(\s*<script src="/js/account-menu\.js)', page_loading_script + r'\1'),
            (r'(\s*</body>)', page_loading_script + r'\1'),
        ]

        inserted = False
        for pattern, replacement in insert_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content, count=1)
                inserted = True
                print("  ✓ Page Loading Script added")
                break

        if not inserted:
            print("  ❌ Could not find insertion point")
            continue

        # Write updated content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("  ✅ File updated")

    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "="*60)
print("Page Loading Script addition complete!")
print("="*60)
