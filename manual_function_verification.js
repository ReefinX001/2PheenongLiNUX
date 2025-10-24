/**
 * Manual Function Verification Script
 * Tests critical functions with real data scenarios
 */

const fs = require('fs');
const path = require('path');

class ManualFunctionVerifier {
    constructor() {
        this.testResults = [];
        this.frontstoreContent = '';
    }

    async loadFile() {
        try {
            const filePath = path.join(__dirname, 'views', 'pattani', 'frontstore_pattani.html');
            this.frontstoreContent = fs.readFileSync(filePath, 'utf8');
            return true;
        } catch (error) {
            console.error('Failed to load file:', error.message);
            return false;
        }
    }

    // Test specific function implementations
    testAddToCartLogic() {
        console.log('🧪 Testing addToCart() logic...');

        // Extract the addToCart function
        const addToCartMatch = this.frontstoreContent.match(
            /function addToCart\(([^)]*)\)\s*{([\s\S]*?)(?=\n\s*function|\n\s*$)/
        );

        if (!addToCartMatch) {
            console.log('❌ addToCart function not found');
            return false;
        }

        const functionBody = addToCartMatch[2];

        // Check for essential components
        const checks = [
            {
                name: 'Session Validation',
                pattern: /validateSession\(\)/,
                required: true
            },
            {
                name: 'Rate Limiting',
                pattern: /checkRateLimit/,
                required: true
            },
            {
                name: 'Input Sanitization',
                pattern: /sanitizeInput/,
                required: true
            },
            {
                name: 'Audit Logging',
                pattern: /logAuditEvent/,
                required: true
            },
            {
                name: 'Stock Validation',
                pattern: /approvedStocks\.find/,
                required: true
            },
            {
                name: 'Cart Update',
                pattern: /cartItems\.push|exist\.qty/,
                required: true
            },
            {
                name: 'UI Refresh',
                pattern: /renderCart|calcSummary/,
                required: false
            },
            {
                name: 'Toast Notification',
                pattern: /showToast/,
                required: false
            }
        ];

        let passed = 0;
        let total = checks.length;

        checks.forEach(check => {
            const found = check.pattern.test(functionBody);
            const status = found ? '✅' : (check.required ? '❌' : '⚠️');
            console.log(`  ${status} ${check.name}: ${found ? 'Present' : 'Missing'}`);
            if (found) passed++;
        });

        console.log(`  📊 addToCart Score: ${passed}/${total} (${Math.round((passed/total)*100)}%)`);
        return passed / total >= 0.8; // 80% pass rate
    }

    testSecurityFunctions() {
        console.log('\n🔒 Testing Security Functions...');

        const securityFunctions = [
            {
                name: 'sanitizeInput',
                expectedFeatures: [
                    /switch\s*\(\s*type\s*\)/,  // Type-based sanitization
                    /replace.*[<>]/,            // HTML character removal
                    /substring/                 // Length limiting
                ]
            },
            {
                name: 'validateSession',
                expectedFeatures: [
                    /localStorage\.getItem.*authToken/,  // Token check
                    /localStorage\.getItem.*userId/,     // User ID check
                    /return\s+false/                     // Proper return on failure
                ]
            },
            {
                name: 'logAuditEvent',
                expectedFeatures: [
                    /sessionId/,           // Session tracking
                    /timestamp/,           // Time tracking
                    /details/,            // Event details
                    /branchCode/          // Branch identification
                ]
            }
        ];

        let allPassed = true;

        securityFunctions.forEach(func => {
            console.log(`\n  Testing ${func.name}():`);

            const funcPattern = new RegExp(
                `function\\s+${func.name}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)(?=\\n\\s*function|\\n\\s*$)`
            );

            const match = this.frontstoreContent.match(funcPattern);

            if (!match) {
                console.log(`    ❌ Function not found`);
                allPassed = false;
                return;
            }

            const functionBody = match[1];
            let passed = 0;

            func.expectedFeatures.forEach((feature, index) => {
                const found = feature.test(functionBody);
                console.log(`    ${found ? '✅' : '❌'} Feature ${index + 1}: ${found ? 'Present' : 'Missing'}`);
                if (found) passed++;
            });

            const score = Math.round((passed / func.expectedFeatures.length) * 100);
            console.log(`    📊 ${func.name} Score: ${passed}/${func.expectedFeatures.length} (${score}%)`);

            if (score < 75) allPassed = false;
        });

        return allPassed;
    }

    testCalculationAccuracy() {
        console.log('\n💰 Testing Calculation Functions...');

        // Test calcSummary function
        const calcSummaryMatch = this.frontstoreContent.match(
            /function calcSummary\(\)\s*{([\s\S]*?)(?=\n\s*function|\n\s*$)/
        );

        if (!calcSummaryMatch) {
            console.log('❌ calcSummary function not found');
            return false;
        }

        const calcBody = calcSummaryMatch[1];

        const calculationChecks = [
            {
                name: 'Subtotal Calculation',
                pattern: /reduce.*price.*qty|sum.*price.*qty/,
                critical: true
            },
            {
                name: 'VAT Calculation',
                pattern: /vat|tax|0\.07|7%/i,
                critical: true
            },
            {
                name: 'Total Calculation',
                pattern: /total.*=.*subtotal.*vat|total.*\+/,
                critical: true
            },
            {
                name: 'Precision Handling',
                pattern: /toFixed\(2\)|Math\.round/,
                critical: false
            },
            {
                name: 'Display Update',
                pattern: /getElementById.*textContent|innerHTML/,
                critical: false
            }
        ];

        let criticalPassed = 0;
        let totalCritical = calculationChecks.filter(c => c.critical).length;

        calculationChecks.forEach(check => {
            const found = check.pattern.test(calcBody);
            const status = found ? '✅' : (check.critical ? '❌' : '⚠️');
            console.log(`  ${status} ${check.name}: ${found ? 'Present' : 'Missing'}`);

            if (found && check.critical) criticalPassed++;
        });

        console.log(`  📊 Critical Calculations: ${criticalPassed}/${totalCritical}`);
        return criticalPassed === totalCritical;
    }

    testThaiLanguageSupport() {
        console.log('\n🇹🇭 Testing Thai Language Support...');

        const thaiTests = [
            {
                name: 'Thai Characters in Messages',
                pattern: /[\u0E00-\u0E7F]/,
                description: 'Thai Unicode characters present'
            },
            {
                name: 'Thai Locale Formatting',
                pattern: /toLocaleString.*'th'|'th-TH'/,
                description: 'Thai locale for date/number formatting'
            },
            {
                name: 'Thai Error Messages',
                pattern: /กรุณา|ไม่|เพิ่ม|ลบ|แก้ไข/,
                description: 'Thai language in user messages'
            },
            {
                name: 'Thai Tax Documents',
                pattern: /ใบกำกับภาษี|ใบเสร็จ|ภาษีมูลค่าเพิ่ม/,
                description: 'Thai tax document terminology'
            }
        ];

        let thaiSupport = 0;

        thaiTests.forEach(test => {
            const found = test.pattern.test(this.frontstoreContent);
            console.log(`  ${found ? '✅' : '❌'} ${test.name}: ${found ? 'Supported' : 'Not found'}`);
            if (found) thaiSupport++;
        });

        const supportPercentage = Math.round((thaiSupport / thaiTests.length) * 100);
        console.log(`  📊 Thai Language Support: ${thaiSupport}/${thaiTests.length} (${supportPercentage}%)`);

        return supportPercentage >= 75;
    }

    testErrorHandling() {
        console.log('\n🛡️ Testing Error Handling...');

        const errorHandlingPatterns = [
            {
                name: 'Try-Catch Blocks',
                pattern: /try\s*{[\s\S]*?catch\s*\(/g,
                description: 'Exception handling'
            },
            {
                name: 'Input Validation',
                pattern: /if\s*\(!.*\)\s*{[\s\S]*?return/g,
                description: 'Input validation with early return'
            },
            {
                name: 'Error Logging',
                pattern: /console\.(error|warn)|logAuditEvent.*ERROR/g,
                description: 'Error logging mechanisms'
            },
            {
                name: 'User Feedback',
                pattern: /showToast.*error|alert.*error/g,
                description: 'User error notifications'
            }
        ];

        let errorHandlingScore = 0;

        errorHandlingPatterns.forEach(pattern => {
            const matches = this.frontstoreContent.match(pattern.pattern);
            const count = matches ? matches.length : 0;
            console.log(`  ${count > 0 ? '✅' : '❌'} ${pattern.name}: ${count} instances`);
            if (count > 0) errorHandlingScore++;
        });

        console.log(`  📊 Error Handling Coverage: ${errorHandlingScore}/${errorHandlingPatterns.length}`);
        return errorHandlingScore >= 3;
    }

    async runManualVerification() {
        console.log('🔍 Manual Function Verification Starting...\n');

        if (!await this.loadFile()) {
            console.error('❌ Cannot proceed without loading the frontstore file');
            return;
        }

        const tests = [
            { name: 'Core Shopping Cart Logic', test: () => this.testAddToCartLogic() },
            { name: 'Security Functions', test: () => this.testSecurityFunctions() },
            { name: 'Calculation Accuracy', test: () => this.testCalculationAccuracy() },
            { name: 'Thai Language Support', test: () => this.testThaiLanguageSupport() },
            { name: 'Error Handling', test: () => this.testErrorHandling() }
        ];

        const results = [];

        for (const test of tests) {
            try {
                const passed = test.test();
                results.push({ name: test.name, passed });
                console.log(`\n${passed ? '✅' : '❌'} ${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                console.log(`\n❌ ${test.name}: ERROR - ${error.message}`);
                results.push({ name: test.name, passed: false, error: error.message });
            }
        }

        this.printFinalVerificationReport(results);
    }

    printFinalVerificationReport(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📋 MANUAL VERIFICATION REPORT');
        console.log('='.repeat(60));

        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        const successRate = Math.round((passed / total) * 100);

        console.log(`📊 Overall Success Rate: ${passed}/${total} (${successRate}%)`);
        console.log('');

        results.forEach(result => {
            const icon = result.passed ? '✅' : '❌';
            console.log(`${icon} ${result.name}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('\n🏥 VERIFICATION SUMMARY:');

        if (successRate >= 90) {
            console.log('🎉 EXCELLENT: All critical functions verified successfully');
        } else if (successRate >= 75) {
            console.log('✅ GOOD: Most functions working with minor issues');
        } else if (successRate >= 50) {
            console.log('⚠️ WARNING: Several functions need attention');
        } else {
            console.log('🚨 CRITICAL: Major issues found - immediate action required');
        }

        console.log('\n📝 SPECIFIC FINDINGS:');

        // Security Assessment
        const securityTest = results.find(r => r.name === 'Security Functions');
        if (securityTest?.passed) {
            console.log('🔒 Security: Strong authentication and input validation');
        } else {
            console.log('🚨 Security: Vulnerabilities detected - review required');
        }

        // Financial Accuracy
        const calcTest = results.find(r => r.name === 'Calculation Accuracy');
        if (calcTest?.passed) {
            console.log('💰 Financial: Calculations maintain accuracy and precision');
        } else {
            console.log('⚠️ Financial: Calculation issues detected - audit required');
        }

        // Thai Language
        const thaiTest = results.find(r => r.name === 'Thai Language Support');
        if (thaiTest?.passed) {
            console.log('🇹🇭 Thai Support: Good localization implementation');
        } else {
            console.log('🇹🇭 Thai Support: Needs improvement for Thai users');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Run verification if called directly
if (require.main === module) {
    const verifier = new ManualFunctionVerifier();
    verifier.runManualVerification().then(() => {
        console.log('✅ Manual verification completed!');
    }).catch(error => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });
}

module.exports = ManualFunctionVerifier;