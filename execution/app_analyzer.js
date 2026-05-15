const fs = require('fs');
const path = require('path');

const analyzeCodebase = (rootDir) => {
    const report = {
        ui_issues: [],
        logic_risks: [],
        summary: {
            files_scanned: 0,
            total_issues: 0
        }
    };

    const scanDir = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (file !== 'node_modules' && !file.startsWith('.')) {
                    scanDir(fullPath);
                }
            } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
                const relPath = path.relative(rootDir, fullPath);
                report.summary.files_scanned++;
                
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');

                // Check for raw Text usage
                if (!content.includes('import Text from') && content.includes('import { Text } from')) {
                    report.ui_issues.push({
                        file: relPath,
                        type: "Raw Text Usage",
                        message: "Uses standard RN Text instead of ThemeText. Might break custom font rendering."
                    });
                }

                lines.forEach((line, i) => {
                    // Check for low padding (only in screens)
                    if (relPath.includes('screens') && line.includes('paddingBottom:')) {
                        const match = line.match(/paddingBottom:\s*(\d+)/);
                        if (match && parseInt(match[1]) < 150) {
                            report.ui_issues.push({
                                file: relPath,
                                line: i + 1,
                                type: "Low Padding",
                                message: `paddingBottom (${match[1]}) is less than 150. May be obscured by Navbar.`
                            });
                        }
                    }

                    // Check for money formatting
                    if (line.includes('Rp') && line.includes('{') && !line.includes('formatMoney')) {
                        report.logic_risks.push({
                            file: relPath,
                            line: i + 1,
                            type: "Unformatted Money",
                            message: "Potential raw number display without formatMoney()."
                        });
                    }

                    // Check for hardcoded colors
                    if (line.match(/color:\s*'(#[0-9a-fA-F]{3,6}|red|blue|green|white|black)'/) && content.includes('ThemeContext')) {
                        report.ui_issues.push({
                            file: relPath,
                            line: i + 1,
                            type: "Hardcoded Color",
                            message: "Uses hardcoded hex/color name instead of theme object."
                        });
                    }
                });
            }
        }
    };

    const srcPath = path.join(rootDir, 'src');
    if (fs.existsSync(srcPath)) {
        scanDir(srcPath);
    }

    report.summary.total_issues = report.ui_issues.length + report.logic_risks.length;
    return report;
};

const result = analyzeCodebase(process.cwd());
console.log(JSON.stringify(result, null, 2));
