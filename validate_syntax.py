import re
from pathlib import Path

def validate_javascript_syntax(filename='purchase_order.html'):
    """Validate JavaScript syntax by checking bracket balance"""
    
    views_path = Path(r"C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account")
    file_path = views_path / filename
    
    if not file_path.exists():
        print(f"File not found: {filename}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all script blocks
    script_blocks = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    
    print(f"Validating JavaScript syntax in {filename}...")
    print("=" * 60)
    
    all_valid = True
    
    for i, script in enumerate(script_blocks, 1):
        # Count brackets
        open_parens = script.count('(')
        close_parens = script.count(')')
        open_braces = script.count('{')
        close_braces = script.count('}')
        open_brackets = script.count('[')
        close_brackets = script.count(']')
        
        issues = []
        
        if open_parens != close_parens:
            issues.append(f"Unmatched parentheses: {open_parens} opening, {close_parens} closing")
            all_valid = False
        
        if open_braces != close_braces:
            issues.append(f"Unmatched braces: {open_braces} opening, {close_braces} closing")
            all_valid = False
        
        if open_brackets != close_brackets:
            issues.append(f"Unmatched brackets: {open_brackets} opening, {close_brackets} closing")
            all_valid = False
        
        if issues:
            print(f"Script block {i}:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print(f"Script block {i}: OK")
    
    # Check for specific error patterns
    lines = content.split('\n')
    error_patterns = []
    
    for i, line in enumerate(lines, 1):
        # Check for }); after if statement
        if line.strip() == '});':
            if i > 2:
                prev_lines = '\n'.join(lines[max(0, i-3):i])
                if 'if (' in prev_lines and 'addEventListener' not in prev_lines and '.then' not in prev_lines:
                    error_patterns.append(f"Line {i}: Suspicious closing pattern after if statement")
        
        # Check for })(); in wrong place
        if '})();' in line and 'function()' not in line:
            if i > 1 and ('textContent' in lines[i-2] or 'innerHTML' in lines[i-2]):
                error_patterns.append(f"Line {i}: Suspicious IIFE closing placement")
        
        # Check for || ) or && )
        if '|| )' in line or '&& )' in line:
            error_patterns.append(f"Line {i}: Empty condition")
    
    if error_patterns:
        print("\nPotential syntax issues:")
        for pattern in error_patterns[:10]:  # Show first 10
            print(f"  - {pattern}")
        all_valid = False
    
    print("\n" + "=" * 60)
    if all_valid:
        print(f"OK: {filename} appears to have valid JavaScript syntax!")
        return True
    else:
        print(f"ERROR: {filename} has syntax issues that need fixing.")
        return False

if __name__ == "__main__":
    # Validate purchase_order.html
    is_valid = validate_javascript_syntax('purchase_order.html')
    
    if not is_valid:
        print("\nPlease review and fix the syntax issues above.")
    else:
        print("\nNo syntax errors detected!")