const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

// Add to props interface
code = code.replace(
  /storeCategory\?\: string;\n\s+storeAddress\?\: string;/m,
  `storeCategory?: string;\n    storeAddress?: string;\n    plateNumber?: string;\n    vehicleType?: string;`
);

// Add states
code = code.replace(
  /const \[storeAddress, setStoreAddress\] = useState\(''\);/,
  `const [storeAddress, setStoreAddress] = useState('');\n  const [plateNumber, setPlateNumber] = useState('');\n  const [vehicleType, setVehicleType] = useState('موتوسيكل');`
);

// Include in onRegister payload
code = code.replace(
  /storeCategory,\n\s+storeAddress,\n\s+\}\);/,
  `storeCategory,\n          storeAddress,\n          plateNumber,\n          vehicleType,\n        });`
);

// Add UI fields
const UI_ADD = `
              {authRole === 'delivery' && (
                <div className="space-y-3 pt-2 mt-2 border-t border-slate-100 dark:border-white/10">
                  <h4 className="text-[11px] font-black text-[#FF6B00] mb-2 uppercase tracking-wider">
                    بيانات كابتن التوصيل
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        لوحة المركبة:
                      </label>
                      <input
                        type="text"
                        required
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        placeholder="مثال: ق ن ا 1234"
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-[#FF6B00]/30 rounded-xl focus:outline-hidden focus:border-[#FF6B00] font-medium text-slate-800 dark:text-white text-xs placeholder:text-slate-400"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        نوع المركبة:
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-[#FF6B00]/30 rounded-xl focus:outline-hidden focus:border-[#FF6B00] font-medium text-slate-800 dark:text-white text-xs"
                      >
                        <option value="موتوسيكل">موتوسيكل</option>
                        <option value="سيارة">سيارة</option>
                        <option value="عجلة / دراجة">عجلة / دراجة</option>
                        <option value="سيارة نقل">سيارة نقل</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
`;

code = code.replace(
  /\{\/\* Dynamic Fields Based on Role \*\/\}/,
  `{/* Dynamic Fields Based on Role */}${UI_ADD}`
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
