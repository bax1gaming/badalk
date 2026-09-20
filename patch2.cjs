const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

const UI_ADD = `
            {selectedRole === 'delivery' && (
              <div className="p-3.5 bg-[#00B4D8]/10 border border-[#00B4D8]/20 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                <div className="font-black text-[#00B4D8] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#00B4D8]" />
                  <span>بيانات كابتن التوصيل:</span>
                </div>
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
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-[#00B4D8]/30 rounded-xl focus:outline-hidden focus:border-[#00B4D8] font-medium text-slate-800 dark:text-white text-xs placeholder:text-slate-400"
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
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-[#00B4D8]/30 rounded-xl focus:outline-hidden focus:border-[#00B4D8] font-medium text-slate-800 dark:text-white text-xs"
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
  /\{\/\* Submit Button \*\/\}/,
  `${UI_ADD}\n            {/* Submit Button */}`
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
