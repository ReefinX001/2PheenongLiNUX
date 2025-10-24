$content = Get-Content 'C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account\cash_flow.html' -Raw

Write-Host "Applying fixes to cash_flow.html..." -ForegroundColor Cyan

# Fix escapeSQLString - find and replace the entire broken function
$start = $content.IndexOf('window.escapeSQLString')
if ($start -gt 0) {
    $end = $content.IndexOf('});', $start) + 3
    if ($end -gt $start) {
        $oldFunc = $content.Substring($start, $end - $start)
        $newFunc = 'window.escapeSQLString = function (str) {' + "`n" +
'    if (typeof str !== ''string'') return '''';' + "`n" +
'    return str' + "`n" +
'      .replace(/\\/g, ''\\\\'')' + "`n" +
'      .replace(/\0/g, ''\\0'')' + "`n" +
'      .replace(/\n/g, ''\\n'')' + "`n" +
'      .replace(/\r/g, ''\\r'')' + "`n" +
'      .replace(/\x1a/g, ''\\Z'')' + "`n" +
'      .replace(/''/g, "\\''")' + "`n" +
'      .replace(/"/g, ''\\"'')' + "`n" +
'      .replace(/%/g, ''\\%'')' + "`n" +
'      .replace(/_/g, ''\\\_'');' + "`n" +
'  };'
        $content = $content.Replace($oldFunc, $newFunc)
        Write-Host "Fixed escapeSQLString function" -ForegroundColor Green
    }
}

# Fix sanitizePath regex flags
$content = $content -replace 'replace\(/\\\.\\./gg,', 'replace(/\.\./g,'
Write-Host "Fixed sanitizePath regex flags" -ForegroundColor Green

# Fix validateThaiPhone
$content = $content -replace '\.replace\(/D/g,', '.replace(/\\D/g,'
Write-Host "Fixed validateThaiPhone regex" -ForegroundColor Green

# Fix html2canvas script tag
$pattern = '(<script[^>]*html2canvas[^>]*>)\s*\n\s*\n\s*//\s*Merged'
$replacement = '$1</script>' + "`n<script>`n//"
$content = $content -replace $pattern, $replacement
Write-Host "Fixed html2canvas script block" -ForegroundColor Green

# Fix appendChild if missing closing parenthesis
$content = $content -replace 'appendChild\(([^)]+)\);', 'appendChild($1));'

# Save
$content | Set-Content 'C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account\cash_flow.html' -NoNewline
Write-Host "`nAll fixes applied successfully!" -ForegroundColor Green