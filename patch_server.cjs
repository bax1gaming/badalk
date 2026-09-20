const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update endpoint parameters
code = code.replace(
  /const \{ name, email, password, role, phone, storeName, storeCategory, storeAddress \} = req\.body;/,
  `const { name, email, password, role, phone, storeName, storeCategory, storeAddress, plateNumber, vehicleType } = req.body;`
);

// Update delivery creation in memory
code = code.replace(
  /vehicleType: 'موتوسيكل',\n\s+plateNumber: 'ق ن ا 1234',/,
  `vehicleType: String(vehicleType || 'موتوسيكل').trim(),\n      plateNumber: String(plateNumber || 'ق ن ا 1234').trim(),`
);

fs.writeFileSync('server.ts', code);
