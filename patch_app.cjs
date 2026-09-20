const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update handleRegister signature
code = code.replace(
  /storeCategory\?\: string;\n\s+storeAddress\?\: string;\n\s+\}\) => \{/m,
  `storeCategory?: string;\n    storeAddress?: string;\n    plateNumber?: string;\n    vehicleType?: string;\n  }) => {`
);

fs.writeFileSync('src/App.tsx', code);
