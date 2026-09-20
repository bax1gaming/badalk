const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
code = code.replace(/defaultRole,\n  promptMessage,/, 'defaultRole,\n  promptMessage,\n  categories = [],');
fs.writeFileSync('src/components/AuthModal.tsx', code);
