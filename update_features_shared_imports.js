const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach( f => {
        let dirPath = path.join(dir, f);
        if (f === 'node_modules' || f === '.next' || f === '.git') return;
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
};

const srcDir = path.join(process.cwd(), 'src');

walk(srcDir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;
        
        // Update feature imports
        const features = ['admin', 'assessment', 'dashboard', 'kajian', 'laporan', 'penghargaan'];
        features.forEach(f => {
            const regex = new RegExp(`(['"])@/components/${f}/`, 'g');
            newContent = newContent.replace(regex, `$1@/components/features/${f}/`);
        });

        // Update single files moved to features/admin
        newContent = newContent.replace(/(['"])@\/components\/AuditLogViewer(['"])/g, '$1@/components/features/admin/AuditLogViewer$2');
        newContent = newContent.replace(/(['"])@\/components\/SettingsForm(['"])/g, '$1@/components/features/admin/SettingsForm$2');

        // Update shared imports (ui)
        newContent = newContent.replace(/(['"])@\/components\/ui\//g, '$1@/components/shared/ui/');
        
        // Update Providers.tsx
        newContent = newContent.replace(/(['"])@\/components\/Providers(['"])/g, '$1@/components/shared/Providers$2');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated: ${filePath}`);
        }
    }
});
