const fs = require('fs');

let content = fs.readFileSync('src/components/AdminLogin.tsx', 'utf8');

// We will change the handleSubmit to use Supabase Auth
// And remove the 4-char limit on the PIN input
const targetInput = `if (/^\\d*$/.test(val) && val.length <= 4) {`;
const replacementInput = `if (true) {`; // Allow any password

content = content.replace(targetInput, replacementInput);

const targetMaxLen = `maxLength={4}`;
const replacementMaxLen = ``;

content = content.replace(targetMaxLen, replacementMaxLen);

fs.writeFileSync('src/components/AdminLogin.tsx', content);
console.log("Updated input limits");
