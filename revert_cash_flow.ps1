# Read file
$filePath = "C:\Users\Administrator\Desktop\Project 3\my-accounting-app\views\account\cash_flow.html"
$lines = Get-Content $filePath

# Find start and end lines
$startLine = -1
$endLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "// SQL injection prevention") {
        $startLine = $i
    }
    if ($startLine -ne -1 -and $lines[$i] -match "^\s*\};\s*$") {
        $endLine = $i
        break
    }
}

if ($startLine -ne -1 -and $endLine -ne -1) {
    # Create new lines array
    $newLines = @()
    
    # Add lines before the function
    for ($i = 0; $i -lt $startLine; $i++) {
        $newLines += $lines[$i]
    }
    
    # Add the original function (with the syntax error as it was)
    $newLines += "  // SQL injection prevention"
    $newLines += "  window.escapeSQLString = function(str) {"
    $newLines += "    if (typeof str !== 'string') return '';"
    $newLines += "    return str.replace(/[\0\x08\x09\x1a\n\r`"'\\%]/g, `tfunction(char) {"
    $newLines += "      switch (char) {"
    $newLines += "        case `" `": return `"\0`";"
    $newLines += "        case `"`": return `"\b`";"
    $newLines += "        case `"`t`": return `"\t`";"
    $newLines += "        case `"`": return `"\z`";"
    $newLines += "        case `"`n"
    $newLines += "`": return `"\n`";"
    $newLines += "        case `"`": return `"\r`";"
    $newLines += "        case `"`"`":"
    $newLines += "        case `"'`":"
    $newLines += "        case `"\`":"
    $newLines += "        case `"%`": return `"\`" + char;"
    $newLines += "        default: return char;"
    $newLines += "      }"
    $newLines += "    });"
    $newLines += "  };"
    
    # Add lines after the function
    for ($i = $endLine + 1; $i -lt $lines.Count; $i++) {
        $newLines += $lines[$i]
    }
    
    # Write back
    $newLines | Set-Content $filePath -Encoding UTF8
    Write-Host "Reverted cash_flow.html to original"
} else {
    Write-Host "Could not find the function to revert"
}