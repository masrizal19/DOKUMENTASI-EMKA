const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const target = `const payload = {`;

const replacement = `      const isValidUUID = (id) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };
      const isEditingExisting = editingActivity && isValidUUID(editingActivity.id);

      const payload = {`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Restored isEditingExisting");
