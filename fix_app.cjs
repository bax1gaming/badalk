const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /promptMessage=\{authPromptMessage\}\n\s+\/>/,
  'promptMessage={authPromptMessage}\n        categories={categories}\n      />'
);
fs.writeFileSync('src/App.tsx', app);
