#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply the working fetchUserProfile function from purchase_order.html to all HTML files
"""

import os
import re
from pathlib import Path

# The working fetchUserProfile function from purchase_order.html
WORKING_PROFILE_CODE = '''    // API Configuration
    const API_BASE = '/api';
    const token = localStorage.getItem('authToken');
    
    // Helper function to resolve photo URLs
    function resolvePhotoUrl(raw) {
      if (!raw) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxOCIgZmlsbD0iIzljYTNhZiIvPgogIDxlbGxpcHNlIGN4PSI1MCIgY3k9Ijc1IiByeD0iMzAiIHJ5PSIyMCIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4=';
      if (/^https?:\\/\\//.test(raw)) return raw;
      if (raw.startsWith('data:')) return raw;
      if (raw.startsWith('/uploads/employees/')) return raw;
      if (raw.startsWith('/uploads/')) return raw.replace(/^\\/uploads\\//, '/uploads/employees/');
      return '/uploads/employees/' + raw;
    }

    // Fetch user profile from API
    async function fetchUserProfile() {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load profile');

        const userName = json.data.name || json.data.username || 'ผู้ใช้';
        const photoUrl = json.data.photoUrl || json.data.employee?.imageUrl || null;
        
        const nameEl = document.getElementById('employeeName');
        const photoEl = document.getElementById('employeePhoto');
        
        if (nameEl) nameEl.textContent = userName;
        if (photoEl) photoEl.src = resolvePhotoUrl(photoUrl);
        
        localStorage.setItem('userName', userName);
        if (photoUrl) localStorage.setItem('userPhoto', photoUrl);
        
      } catch (err) {
        console.error('fetchUserProfile:', err);
        const fallbackName = localStorage.getItem('userName') || 'ผู้ใช้';
        const fallbackPhoto = localStorage.getItem('userPhoto');
        const nameEl = document.getElementById('employeeName');
        const photoEl = document.getElementById('employeePhoto');
        
        if (nameEl) nameEl.textContent = fallbackName;
        if (photoEl) photoEl.src = resolvePhotoUrl(fallbackPhoto);
        
        if (err.message && (err.message.includes('401') || err.message.includes('unauthorized'))) {
          alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          if (typeof logout === 'function') logout();
        }
      }
    }'''

def has_profile_elements(content):
    """Check if file has profile elements (employeeName or employeePhoto)"""
    return 'employeeName' in content or 'employeePhoto' in content

def remove_old_profile_function(content):
    """Remove existing fetchUserProfile function and related code"""
    
    # Pattern to match the entire fetchUserProfile function
    patterns = [
        # Pattern 1: Full function with async/await
        r'async\s+function\s+fetchUserProfile\s*\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}',
        # Pattern 2: Function declaration
        r'function\s+fetchUserProfile\s*\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}',
        # Pattern 3: Const function
        r'const\s+fetchUserProfile\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.DOTALL)
        for match in matches:
            # Count braces to find the complete function
            func_text = match.group(0)
            brace_count = 0
            in_string = False
            escape_next = False
            quote_char = None
            
            complete_func = ""
            for i, char in enumerate(func_text):
                complete_func += char
                
                if escape_next:
                    escape_next = False
                    continue
                    
                if char == '\\':
                    escape_next = True
                    continue
                
                if not in_string:
                    if char in ['"', "'", '`']:
                        in_string = True
                        quote_char = char
                    elif char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            # Found complete function
                            content = content.replace(complete_func, '')
                            break
                else:
                    if char == quote_char:
                        in_string = False
                        quote_char = None
    
    # Also remove old resolvePhotoUrl function
    resolve_pattern = r'function\s+resolvePhotoUrl\s*\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}'
    content = re.sub(resolve_pattern, '', content, flags=re.DOTALL)
    
    # Remove old API_BASE and token declarations if they exist in isolation
    content = re.sub(r'^\s*const\s+API_BASE\s*=\s*[^;]+;\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*const\s+token\s*=\s*localStorage\.getItem\([^)]+\);\s*$', '', content, flags=re.MULTILINE)
    
    return content

def add_working_profile_function(content):
    """Add the working profile function to the file"""
    
    # Find the first <script> tag after the closing </style> or </head>
    script_pattern = r'(<script>)\s*(?:tailwind\.config|const|let|var|//|$)'
    
    match = re.search(script_pattern, content, re.MULTILINE)
    
    if match:
        # Check if API_BASE and fetchUserProfile already exist
        if 'const API_BASE' in content and 'function fetchUserProfile' in content:
            # Already has the functions, skip
            return content, False
            
        # Insert the working code after the opening <script> tag
        insert_pos = match.end(1)  # After <script>
        
        # Add newline and the working code
        content = content[:insert_pos] + '\n' + WORKING_PROFILE_CODE + '\n' + content[insert_pos:]
        return content, True
    
    return content, False

def ensure_profile_is_called(content):
    """Ensure fetchUserProfile is called in DOMContentLoaded"""
    
    # Check if fetchUserProfile is already being called
    if re.search(r'fetchUserProfile\s*\(\s*\)', content):
        return content, False
    
    # Find DOMContentLoaded event listener
    dom_pattern = r'(document\.addEventListener\s*\(\s*[\'"]DOMContentLoaded[\'"]\s*,\s*(?:async\s+)?(?:function\s*\([^)]*\)|[^{]+)\s*\{)([^}]*(?:\{[^}]*\}[^}]*)*)(}\s*\);?)'
    
    matches = list(re.finditer(dom_pattern, content, re.DOTALL))
    
    if matches:
        # Use the last match (usually the main one)
        match = matches[-1]
        start_part = match.group(1)
        body_part = match.group(2)
        end_part = match.group(3)
        
        # Add fetchUserProfile call if not present
        if 'fetchUserProfile' not in body_part:
            # Add the call at the beginning of the DOMContentLoaded function
            new_body = '\n      // Load user profile\n      if (typeof fetchUserProfile === \'function\') {\n        fetchUserProfile();\n      }\n' + body_part
            
            new_content = content[:match.start()] + start_part + new_body + end_part + content[match.end():]
            return new_content, True
    else:
        # No DOMContentLoaded found, add one
        if '</script>' in content:
            last_script = content.rfind('</script>')
            new_listener = '''
    // Add DOMContentLoaded listener
    document.addEventListener('DOMContentLoaded', function() {
      // Load user profile
      if (typeof fetchUserProfile === 'function') {
        fetchUserProfile();
      }
    });
    '''
            content = content[:last_script] + new_listener + '\n  </script>' + content[last_script + 9:]
            return content, True
    
    return content, False

def process_file(file_path):
    """Process a single HTML file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if no profile elements
        if not has_profile_elements(content):
            return False, ["No profile elements found"]
        
        original_content = content
        changes = []
        
        # Step 1: Remove old profile function if exists
        old_content = content
        content = remove_old_profile_function(content)
        if content != old_content:
            changes.append("Removed old fetchUserProfile function")
        
        # Step 2: Add the working profile function
        content, added = add_working_profile_function(content)
        if added:
            changes.append("Added working fetchUserProfile function from purchase_order.html")
        
        # Step 3: Ensure it's called in DOMContentLoaded
        content, called = ensure_profile_is_called(content)
        if called:
            changes.append("Added fetchUserProfile call to DOMContentLoaded")
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes
        
        return False, ["Already has working profile function"]
        
    except Exception as e:
        return False, [f"Error: {e}"]

def main():
    """Main function to process all HTML files"""
    
    account_dir = Path(r"C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account")
    
    if not account_dir.exists():
        print(f"Error: Directory {account_dir} does not exist")
        return
    
    html_files = list(account_dir.glob("*.html"))
    
    if not html_files:
        print("No HTML files found in views/account")
        return
    
    print(f"Applying working fetchUserProfile function to {len(html_files)} HTML files")
    print("=" * 60)
    
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    for file_path in html_files:
        file_name = file_path.name
        
        # Skip purchase_order.html as it's our source
        if file_name == 'purchase_order.html':
            print(f"[SKIP] {file_name} - Source file")
            skipped_count += 1
            continue
        
        try:
            fixed, changes = process_file(file_path)
            if fixed:
                print(f"[FIXED] {file_name}")
                for change in changes:
                    print(f"   - {change}")
                fixed_count += 1
            else:
                if changes and changes[0].startswith("Error"):
                    print(f"[ERROR] {file_name}: {changes[0]}")
                    error_count += 1
                else:
                    # print(f"[OK] {file_name}: {changes[0] if changes else 'No changes needed'}")
                    skipped_count += 1
                    
        except Exception as e:
            print(f"[ERROR] {file_name}: {e}")
            error_count += 1
    
    print("=" * 60)
    print(f"Summary:")
    print(f"  Fixed: {fixed_count} files")
    print(f"  Skipped: {skipped_count} files (already OK or no profile elements)")
    print(f"  Errors: {error_count} files")
    print(f"  Total: {len(html_files)} files")
    print("\nAll files now use the working fetchUserProfile function from purchase_order.html!")

if __name__ == "__main__":
    main()