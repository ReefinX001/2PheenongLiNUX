/**
 * Comprehensive Test Suite for Frontstore Pattani Functions
 * Performs extensive testing of all JavaScript functions in the frontstore system
 */

const fs = require('fs');
const path = require('path');

class FrontstoreFunctionTester {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.skippedTests = 0;
        this.warningTests = 0;
        this.frontstoreContent = '';
        this.detectedFunctions = [];
        this.securityIssues = [];
        this.performanceIssues = [];
        this.thaiLanguageIssues = [];
    }

    // Load and parse the frontstore file
    async loadFrontstoreFile() {
        try {
            const filePath = path.join(__dirname, 'views', 'pattani', 'frontstore_pattani.html');
            this.frontstoreContent = fs.readFileSync(filePath, 'utf8');
            console.log('✅ Frontstore file loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load frontstore file:', error.message);
            return false;
        }
    }

    // Extract all JavaScript functions from the file
    extractFunctions() {
        const functionPatterns = [
            /function\s+(\w+)\s*\(/g,
            /(\w+)\s*:\s*function\s*\(/g,
            /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
            /async\s+function\s+(\w+)\s*\(/g
        ];

        const functions = new Set();

        functionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(this.frontstoreContent)) !== null) {
                functions.add(match[1]);
            }
        });

        this.detectedFunctions = Array.from(functions);
        this.totalTests = this.detectedFunctions.length;

        console.log(`🔍 Detected ${this.detectedFunctions.length} functions`);
        return this.detectedFunctions;
    }

    // Test individual function
    testFunction(functionName, category) {
        const testResult = {
            functionName,
            category,
            timestamp: new Date().toISOString(),
            status: 'unknown',
            message: '',
            details: {},
            securityIssues: [],
            performanceIssues: [],
            thaiLanguageSupport: false
        };

        try {
            // Check if function exists in the file
            const functionExists = this.checkFunctionExists(functionName);
            if (!functionExists.exists) {
                testResult.status = 'fail';
                testResult.message = 'Function not found in file';
                this.failedTests++;
                return testResult;
            }

            testResult.details = functionExists.details;

            // Perform specific tests based on function type
            this.performSecurityAnalysis(functionName, testResult);
            this.performPerformanceAnalysis(functionName, testResult);
            this.performThaiLanguageAnalysis(functionName, testResult);
            this.performLogicAnalysis(functionName, testResult);

            // Determine overall status
            if (testResult.securityIssues.length > 0) {
                testResult.status = 'warning';
                this.warningTests++;
            } else if (testResult.performanceIssues.length > 0) {
                testResult.status = 'warning';
                this.warningTests++;
            } else {
                testResult.status = 'pass';
                this.passedTests++;
            }

        } catch (error) {
            testResult.status = 'fail';
            testResult.message = `Test execution failed: ${error.message}`;
            this.failedTests++;
        }

        this.testResults.push(testResult);
        return testResult;
    }

    // Check if function exists and extract its details
    checkFunctionExists(functionName) {
        const patterns = [
            new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`, 'g'),
            new RegExp(`${functionName}\\s*:\\s*function\\s*\\([^)]*\\)\\s*{`, 'g'),
            new RegExp(`const\\s+${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>`, 'g'),
            new RegExp(`async\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`, 'g')
        ];

        for (const pattern of patterns) {
            const match = pattern.exec(this.frontstoreContent);
            if (match) {
                return {
                    exists: true,
                    details: {
                        line: this.getLineNumber(match.index),
                        type: this.getFunctionType(match[0]),
                        parameters: this.extractParameters(match[0])
                    }
                };
            }
        }

        return { exists: false };
    }

    // Security analysis for functions
    performSecurityAnalysis(functionName, testResult) {
        const functionCode = this.extractFunctionCode(functionName);
        if (!functionCode) return;

        const securityChecks = [
            {
                name: 'XSS Prevention',
                pattern: /innerHTML|outerHTML|document\.write/g,
                severity: 'high',
                message: 'Potential XSS vulnerability - using innerHTML without sanitization'
            },
            {
                name: 'SQL Injection Prevention',
                pattern: /query.*\+.*\$|SELECT.*\+|INSERT.*\+/gi,
                severity: 'high',
                message: 'Potential SQL injection - string concatenation in queries'
            },
            {
                name: 'Input Sanitization',
                pattern: /sanitizeInput\s*\(/g,
                severity: 'positive',
                message: 'Good: Uses input sanitization'
            },
            {
                name: 'Authentication Check',
                pattern: /validateSession\s*\(/g,
                severity: 'positive',
                message: 'Good: Uses session validation'
            },
            {
                name: 'Rate Limiting',
                pattern: /checkRateLimit\s*\(/g,
                severity: 'positive',
                message: 'Good: Uses rate limiting'
            },
            {
                name: 'Audit Logging',
                pattern: /logAuditEvent\s*\(/g,
                severity: 'positive',
                message: 'Good: Uses audit logging'
            },
            {
                name: 'Eval Usage',
                pattern: /eval\s*\(/g,
                severity: 'critical',
                message: 'Critical: Uses eval() which is dangerous'
            },
            {
                name: 'Direct DOM Manipulation',
                pattern: /\.innerHTML\s*=\s*[^s]/g,
                severity: 'medium',
                message: 'Warning: Direct innerHTML assignment without sanitization'
            }
        ];

        securityChecks.forEach(check => {
            const matches = functionCode.match(check.pattern);
            if (matches) {
                testResult.securityIssues.push({
                    type: check.name,
                    severity: check.severity,
                    message: check.message,
                    occurrences: matches.length
                });

                if (check.severity === 'critical' || check.severity === 'high') {
                    this.securityIssues.push({
                        function: functionName,
                        issue: check.name,
                        severity: check.severity,
                        message: check.message
                    });
                }
            }
        });
    }

    // Performance analysis for functions
    performPerformanceAnalysis(functionName, testResult) {
        const functionCode = this.extractFunctionCode(functionName);
        if (!functionCode) return;

        const performanceChecks = [
            {
                name: 'Synchronous Database Calls',
                pattern: /find\s*\([^)]*\)\s*\.[^a]/g,
                message: 'Warning: Synchronous database operations may block UI'
            },
            {
                name: 'Large DOM Queries',
                pattern: /querySelectorAll\s*\(\s*['"]\*|getElementsBy/g,
                message: 'Warning: Broad DOM queries may impact performance'
            },
            {
                name: 'Async/Await Usage',
                pattern: /async\s+function|await\s+/g,
                message: 'Good: Uses async/await for better performance'
            },
            {
                name: 'Memory Leaks - Event Listeners',
                pattern: /addEventListener.*(?!removeEventListener)/g,
                message: 'Warning: Event listeners added without cleanup'
            },
            {
                name: 'Inefficient Loops',
                pattern: /for\s*\([^)]*;\s*[^;]*\.length\s*;/g,
                message: 'Warning: Loop condition recalculates length each iteration'
            }
        ];

        performanceChecks.forEach(check => {
            const matches = functionCode.match(check.pattern);
            if (matches) {
                testResult.performanceIssues.push({
                    type: check.name,
                    message: check.message,
                    occurrences: matches.length
                });

                this.performanceIssues.push({
                    function: functionName,
                    issue: check.name,
                    message: check.message
                });
            }
        });
    }

    // Thai language support analysis
    performThaiLanguageAnalysis(functionName, testResult) {
        const functionCode = this.extractFunctionCode(functionName);
        if (!functionCode) return;

        const thaiPatterns = [
            /[\u0E00-\u0E7F]/g, // Thai Unicode range
            /th-TH/g, // Thai locale
            /toLocaleString.*th/g, // Thai locale formatting
            /'th'|"th"/g // Thai language codes
        ];

        let hasThaiSupport = false;
        thaiPatterns.forEach(pattern => {
            if (pattern.test(functionCode)) {
                hasThaiSupport = true;
            }
        });

        testResult.thaiLanguageSupport = hasThaiSupport;

        // Check for potential Thai encoding issues
        if (functionCode.includes('encodeURI') && hasThaiSupport) {
            testResult.details.thaiEncodingHandling = 'Good: Uses proper URI encoding';
        }
    }

    // Basic logic analysis
    performLogicAnalysis(functionName, testResult) {
        const functionCode = this.extractFunctionCode(functionName);
        if (!functionCode) return;

        // Check for error handling
        if (functionCode.includes('try') && functionCode.includes('catch')) {
            testResult.details.errorHandling = 'Good: Has try-catch blocks';
        } else if (functionCode.includes('throw')) {
            testResult.details.errorHandling = 'Warning: Throws errors but no try-catch visible';
        } else {
            testResult.details.errorHandling = 'Warning: No error handling detected';
        }

        // Check for input validation
        if (functionCode.includes('validateSession') || functionCode.includes('sanitizeInput')) {
            testResult.details.inputValidation = 'Good: Has input validation';
        } else {
            testResult.details.inputValidation = 'Warning: No input validation detected';
        }

        // Check return statements
        const returnMatches = functionCode.match(/return\s+[^;]+/g);
        if (returnMatches) {
            testResult.details.returnStatements = returnMatches.length;
        }
    }

    // Extract function code
    extractFunctionCode(functionName) {
        const patterns = [
            new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)(?=\\n\\s*function|\\n\\s*const|\\n\\s*var|\\n\\s*let|\\n\\s*async|$)`, 'g'),
            new RegExp(`${functionName}\\s*:\\s*function\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)(?=\\n\\s*\\w+\\s*:|\\n\\s*}|$)`, 'g')
        ];

        for (const pattern of patterns) {
            const match = pattern.exec(this.frontstoreContent);
            if (match) {
                return match[1] || match[0];
            }
        }

        return null;
    }

    // Helper functions
    getLineNumber(index) {
        return this.frontstoreContent.substring(0, index).split('\n').length;
    }

    getFunctionType(functionDeclaration) {
        if (functionDeclaration.includes('async')) return 'async';
        if (functionDeclaration.includes('=>')) return 'arrow';
        if (functionDeclaration.includes('function')) return 'function';
        return 'unknown';
    }

    extractParameters(functionDeclaration) {
        const match = functionDeclaration.match(/\(([^)]*)\)/);
        return match ? match[1].split(',').map(p => p.trim()).filter(p => p) : [];
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting comprehensive function testing...\n');

        if (!await this.loadFrontstoreFile()) {
            return this.generateReport();
        }

        this.extractFunctions();

        // Define function categories
        const categories = {
            'Core Shopping Cart Functions': [
                'addToCart', 'removeFromCart', 'renderCart', 'calcSummary', 'clearCart'
            ],
            'Customer Management Functions': [
                'fillCustomerDataFromCard', 'validateReferralCode', 'calculateAgeFromBirthDate',
                'searchExistingCustomer', 'fillCustomerFormFrontstore', 'autoFillCustomerData'
            ],
            'Product and Stock Functions': [
                'loadApprovedStocks', 'safeReloadStocks', 'loadActivePromotions',
                'checkPromotionForProduct', 'loadStockAndCategories'
            ],
            'Calculation and Payment Functions': [
                'calcSummary', 'doCheckout', 'singleCheckout', 'updateMixedPayment', 'recordPromotionUsage'
            ],
            'Display and Rendering Functions': [
                'renderLevel1', 'renderLevel2', 'renderLevel3', 'renderIMEISearchResult', 'displayCustomerSearchResult'
            ],
            'Security and Validation Functions': [
                'validateSession', 'sanitizeInput', 'generateSessionId', 'logAuditEvent', 'checkRateLimit'
            ],
            'Connection and Socket Functions': [
                'updateConnectionStatus', 'registerSession', 'setupOnDisconnect', 'startHeartbeat', 'stopHeartbeat'
            ],
            'Helper and Utility Functions': [
                'extractBrand', 'extractProductName', 'determineCategory', 'formatPrice', 'sanitizeImagePath'
            ]
        };

        // Test each function
        for (const [category, functions] of Object.entries(categories)) {
            console.log(`\n📋 Testing ${category}:`);

            for (const functionName of functions) {
                const result = this.testFunction(functionName, category);
                const statusIcon = result.status === 'pass' ? '✅' :
                                 result.status === 'warning' ? '⚠️' : '❌';
                console.log(`  ${statusIcon} ${functionName}: ${result.message || result.status}`);
            }
        }

        // Test remaining detected functions
        const testedFunctions = Object.values(categories).flat();
        const untestedFunctions = this.detectedFunctions.filter(f => !testedFunctions.includes(f));

        if (untestedFunctions.length > 0) {
            console.log(`\n🔍 Testing Additional Detected Functions:`);
            for (const functionName of untestedFunctions) {
                const result = this.testFunction(functionName, 'Additional Functions');
                const statusIcon = result.status === 'pass' ? '✅' :
                                 result.status === 'warning' ? '⚠️' : '❌';
                console.log(`  ${statusIcon} ${functionName}: ${result.message || result.status}`);
            }
        }

        return this.generateReport();
    }

    // Generate comprehensive test report
    generateReport() {
        const report = {
            summary: {
                totalFunctions: this.detectedFunctions.length,
                totalTests: this.testResults.length,
                passed: this.passedTests,
                failed: this.failedTests,
                warnings: this.warningTests,
                skipped: this.skippedTests,
                successRate: this.testResults.length > 0 ?
                    Math.round((this.passedTests / this.testResults.length) * 100) : 0
            },
            security: {
                totalIssues: this.securityIssues.length,
                criticalIssues: this.securityIssues.filter(i => i.severity === 'critical').length,
                highIssues: this.securityIssues.filter(i => i.severity === 'high').length,
                mediumIssues: this.securityIssues.filter(i => i.severity === 'medium').length,
                issues: this.securityIssues
            },
            performance: {
                totalIssues: this.performanceIssues.length,
                issues: this.performanceIssues
            },
            thaiLanguage: {
                functionsWithThaiSupport: this.testResults.filter(r => r.thaiLanguageSupport).length,
                totalFunctions: this.testResults.length,
                supportPercentage: this.testResults.length > 0 ?
                    Math.round((this.testResults.filter(r => r.thaiLanguageSupport).length / this.testResults.length) * 100) : 0
            },
            detailedResults: this.testResults,
            recommendations: this.generateRecommendations(),
            timestamp: new Date().toISOString()
        };

        this.saveReport(report);
        this.printSummary(report);

        return report;
    }

    // Generate recommendations
    generateRecommendations() {
        const recommendations = [];

        if (this.securityIssues.length > 0) {
            recommendations.push({
                category: 'Security',
                priority: 'High',
                message: `Found ${this.securityIssues.length} security issues. Review XSS prevention and input sanitization.`,
                actions: [
                    'Implement consistent input sanitization across all functions',
                    'Review innerHTML usage and replace with safer alternatives',
                    'Add rate limiting to all user-facing functions',
                    'Ensure all functions validate user sessions'
                ]
            });
        }

        if (this.performanceIssues.length > 0) {
            recommendations.push({
                category: 'Performance',
                priority: 'Medium',
                message: `Found ${this.performanceIssues.length} performance issues.`,
                actions: [
                    'Optimize database queries to use async operations',
                    'Add debouncing to frequently called functions',
                    'Review DOM query patterns for efficiency',
                    'Implement proper event listener cleanup'
                ]
            });
        }

        const thaiSupportPercentage = this.testResults.length > 0 ?
            (this.testResults.filter(r => r.thaiLanguageSupport).length / this.testResults.length) * 100 : 0;

        if (thaiSupportPercentage < 50) {
            recommendations.push({
                category: 'Thai Language Support',
                priority: 'Medium',
                message: `Only ${Math.round(thaiSupportPercentage)}% of functions have Thai language support.`,
                actions: [
                    'Add Thai language support to display functions',
                    'Implement proper Thai encoding handling',
                    'Add Thai locale formatting for dates and numbers',
                    'Test with Thai characters in all input fields'
                ]
            });
        }

        if (this.failedTests > 0) {
            recommendations.push({
                category: 'Function Reliability',
                priority: 'High',
                message: `${this.failedTests} functions failed testing.`,
                actions: [
                    'Review failed functions for proper error handling',
                    'Add input validation to all functions',
                    'Implement proper return value handling',
                    'Add unit tests for critical functions'
                ]
            });
        }

        return recommendations;
    }

    // Save report to file
    saveReport(report) {
        const reportPath = path.join(__dirname, 'frontstore_test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const htmlReportPath = path.join(__dirname, 'frontstore_test_report.html');
        const htmlReport = this.generateHTMLReport(report);
        fs.writeFileSync(htmlReportPath, htmlReport);

        console.log(`\n📄 Reports saved:`);
        console.log(`   JSON: ${reportPath}`);
        console.log(`   HTML: ${htmlReportPath}`);
    }

    // Generate HTML report
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontstore Function Test Report</title>
    <style>
        body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .summary { background: #e9ecef; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .pass { color: #28a745; } .fail { color: #dc3545; } .warning { color: #ffc107; }
        .critical { background: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 10px 0; }
        .high { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f8f9fa; }
        .progress { width: 100%; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-bar { height: 20px; background: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Frontstore Function Test Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString('th-TH')}</p>

        <div class="summary">
            <h2>📊 Test Summary</h2>
            <div class="progress">
                <div class="progress-bar" style="width: ${report.summary.successRate}%"></div>
            </div>
            <p>Success Rate: ${report.summary.successRate}%</p>
            <ul>
                <li>Total Functions Detected: ${report.summary.totalFunctions}</li>
                <li>Functions Tested: ${report.summary.totalTests}</li>
                <li class="pass">✅ Passed: ${report.summary.passed}</li>
                <li class="warning">⚠️ Warnings: ${report.summary.warnings}</li>
                <li class="fail">❌ Failed: ${report.summary.failed}</li>
                <li>⏭️ Skipped: ${report.summary.skipped}</li>
            </ul>
        </div>

        <div class="section">
            <h2>🔒 Security Analysis</h2>
            <p>Total Security Issues: ${report.security.totalIssues}</p>
            <ul>
                <li class="fail">Critical: ${report.security.criticalIssues}</li>
                <li class="warning">High: ${report.security.highIssues}</li>
                <li>Medium: ${report.security.mediumIssues}</li>
            </ul>
            ${report.security.issues.filter(i => i.severity === 'critical' || i.severity === 'high').map(issue => `
                <div class="${issue.severity}">
                    <strong>${issue.severity.toUpperCase()}: ${issue.issue}</strong> in ${issue.function}<br>
                    ${issue.message}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>⚡ Performance Analysis</h2>
            <p>Total Performance Issues: ${report.performance.totalIssues}</p>
            ${report.performance.issues.map(issue => `
                <div class="high">
                    <strong>${issue.issue}</strong> in ${issue.function}<br>
                    ${issue.message}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🇹🇭 Thai Language Support</h2>
            <p>Functions with Thai Support: ${report.thaiLanguage.functionsWithThaiSupport}/${report.thaiLanguage.totalFunctions} (${report.thaiLanguage.supportPercentage}%)</p>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="section">
                    <h3>${rec.category} (Priority: ${rec.priority})</h3>
                    <p>${rec.message}</p>
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📋 Detailed Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Function</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Thai Support</th>
                        <th>Security Issues</th>
                        <th>Performance Issues</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.detailedResults.map(result => `
                        <tr>
                            <td>${result.functionName}</td>
                            <td>${result.category}</td>
                            <td class="${result.status}">${result.status}</td>
                            <td>${result.thaiLanguageSupport ? '✅' : '❌'}</td>
                            <td>${result.securityIssues.length}</td>
                            <td>${result.performanceIssues.length}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Print summary to console
    printSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FRONTSTORE FUNCTION TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`📋 Total Functions: ${report.summary.totalFunctions}`);
        console.log(`🧪 Functions Tested: ${report.summary.totalTests}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`⚠️  Warnings: ${report.summary.warnings}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}%`);
        console.log('');
        console.log(`🔒 Security Issues: ${report.security.totalIssues} (Critical: ${report.security.criticalIssues}, High: ${report.security.highIssues})`);
        console.log(`⚡ Performance Issues: ${report.performance.totalIssues}`);
        console.log(`🇹🇭 Thai Language Support: ${report.thaiLanguage.supportPercentage}%`);
        console.log('');
        console.log('🏥 OVERALL SYSTEM HEALTH:');

        if (report.security.criticalIssues > 0) {
            console.log('🚨 CRITICAL: Security vulnerabilities detected!');
        } else if (report.security.highIssues > 0) {
            console.log('⚠️  WARNING: High-priority security issues found');
        } else if (report.summary.successRate < 70) {
            console.log('⚠️  WARNING: Low function reliability');
        } else if (report.summary.successRate < 90) {
            console.log('✅ GOOD: System is stable with minor issues');
        } else {
            console.log('🎉 EXCELLENT: System is highly stable and secure');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Export for use
module.exports = FrontstoreFunctionTester;

// Run tests if called directly
if (require.main === module) {
    const tester = new FrontstoreFunctionTester();
    tester.runAllTests().then(() => {
        console.log('✅ Testing completed successfully!');
    }).catch(error => {
        console.error('❌ Testing failed:', error);
        process.exit(1);
    });
}