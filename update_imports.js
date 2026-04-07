const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach( f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
};

const appDir = path.join(process.cwd(), 'src', 'app');

walk(appDir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(/['"]@\/components\/DashboardLayout['"]/g, '"@/components/layout/DashboardLayout"');
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated: ${filePath}`);
        }
    }
});
