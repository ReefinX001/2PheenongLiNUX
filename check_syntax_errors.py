import os
import re
from pathlib import Path

def check_html_files_for_syntax_errors():
    """Check all HTML files for common JavaScript syntax errors"""
    
    views_path = Path(r"C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account")
    
    # Patterns to check for syntax errors (more focused)
    error_patterns = [
        (r'\|\|\s*\)', 'Empty OR condition (|| ))'),
        (r'&&\s*\)', 'Empty AND condition (&& ))'),
        (r'if\s*\(\s*\)', 'Empty if condition'),
        (r'else\s+if\s*\(\s*\)', 'Empty else if condition'),
        (r'function\s+\w+\s*\(\s*,', 'Leading comma in function parameters'),
        (r',\s*,', 'Double comma'),
        (r';\s*;', 'Double semicolon'),
        (r'=\s*=\s*=\s*=', 'Quadruple equals'),
        (r'const\s+const\b', 'Double const'),
        (r'let\s+let\b', 'Double let'),
        (r'var\s+var\b', 'Double var'),
        (r'return\s+return\b', 'Double return'),
        (r'catch\s*\{', 'catch without parentheses'),
    ]
    
    files_with_errors = []
    total_errors = 0
    
    # Get all HTML files
    html_files = list(views_path.glob("*.html"))
    print(f"Checking {len(html_files)} HTML files for syntax errors...\n")
    
    for html_file in html_files:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            file_errors = []
            
            # Check each pattern
            for pattern, description in error_patterns:
                for i, line in enumerate(lines, 1):
                    # Skip comments
                    if '//' in line:
                        comment_start = line.index('//')
                        line_to_check = line[:comment_start]
                    else:
                        line_to_check = line
                    
                    # Skip lines that are in HTML comments
                    if '<!--' in line_to_check or '-->' in line_to_check:
                        continue
                    
                    if re.search(pattern, line_to_check):
                        file_errors.append({
                            'line': i,
                            'error': description,
                            'content': line.strip()[:100]  # First 100 chars
                        })
            
            # Check for unmatched brackets/parentheses in script blocks
            script_blocks = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
            for block in script_blocks:
                # Count brackets
                open_parens = block.count('(')
                close_parens = block.count(')')
                open_braces = block.count('{')
                close_braces = block.count('}')
                open_brackets = block.count('[')
                close_brackets = block.count(']')
                
                if open_parens != close_parens:
                    file_errors.append({
                        'line': 0,
                        'error': f'Unmatched parentheses: {open_parens} opening, {close_parens} closing',
                        'content': 'In script block'
                    })
                
                if open_braces != close_braces:
                    file_errors.append({
                        'line': 0,
                        'error': f'Unmatched braces: {open_braces} opening, {close_braces} closing',
                        'content': 'In script block'
                    })
                
                if open_brackets != close_brackets:
                    file_errors.append({
                        'line': 0,
                        'error': f'Unmatched brackets: {open_brackets} opening, {close_brackets} closing',
                        'content': 'In script block'
                    })
            
            if file_errors:
                files_with_errors.append({
                    'file': html_file.name,
                    'errors': file_errors
                })
                total_errors += len(file_errors)
                
        except Exception as e:
            print(f"Error reading {html_file.name}: {e}")
    
    # Save detailed results to file
    output_file = Path("syntax_errors_report.txt")
    with open(output_file, 'w', encoding='utf-8') as f:
        if files_with_errors:
            f.write(f"Found {total_errors} potential syntax errors in {len(files_with_errors)} files:\n\n")
            f.write("=" * 80 + "\n")
            
            for file_info in files_with_errors:
                f.write(f"\nFile: {file_info['file']}:\n")
                f.write("-" * 40 + "\n")
                for error in file_info['errors']:
                    if error['line'] > 0:
                        f.write(f"  Line {error['line']}: {error['error']}\n")
                        f.write(f"    > {error['content']}\n")
                    else:
                        f.write(f"  {error['error']}: {error['content']}\n")
                f.write("\n")
        else:
            f.write("No syntax errors found in any HTML files!\n")
        
        f.write("\n" + "=" * 80 + "\n")
        f.write(f"Summary: Checked {len(html_files)} files\n")
        f.write(f"Files with errors: {len(files_with_errors)}\n")
        f.write(f"Total errors found: {total_errors}\n")
    
    # Print summary only
    print(f"Syntax Error Check Complete!")
    print("=" * 80)
    print(f"Summary: Checked {len(html_files)} files")
    print(f"Files with errors: {len(files_with_errors)}")
    print(f"Total errors found: {total_errors}")
    print(f"\nDetailed report saved to: {output_file.absolute()}")
    
    # Show first few errors as examples
    if files_with_errors and total_errors > 0:
        print("\nFirst few errors found:")
        print("-" * 40)
        shown = 0
        for file_info in files_with_errors[:5]:  # Show max 5 files
            print(f"\n{file_info['file']}:")
            for error in file_info['errors'][:2]:  # Show max 2 errors per file
                if error['line'] > 0:
                    print(f"  Line {error['line']}: {error['error']}")
                else:
                    print(f"  {error['error']}")
                shown += 1
                if shown >= 10:
                    break
            if shown >= 10:
                break
    
    return files_with_errors

if __name__ == "__main__":
    check_html_files_for_syntax_errors()