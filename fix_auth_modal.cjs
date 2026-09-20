const fs = require('fs');

let authModal = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

authModal = authModal.replace(/interface AuthModalProps \{/, 'interface AuthModalProps {\n  categories?: string[];');
authModal = authModal.replace(/defaultRole = 'customer',[\s\S]*?promptMessage,/, "defaultRole = 'customer',\n  promptMessage,\n  categories = [],");

authModal = authModal.replace(
  /<select\s+value=\{storeCategory\}\s+onChange=\{\(e\) => setStoreCategory\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*<option value="سوبرماركت">سوبرماركت<\/option>\s*<option value="أجبان وألبان">أجبان وألبان<\/option>\s*<option value="جزارة ولحوم">جزارة ولحوم<\/option>\s*<option value="مخابز وحلويات">مخابز وحلويات<\/option>\s*<option value="خضار وفواكه">خضار وفواكه<\/option>\s*<\/select>/m,
  `<select
                      value={storeCategory}
                      onChange={(e) => setStoreCategory(e.target.value)}
                      className="$1"
                    >
                      {categories.length > 0 ? (
                        categories.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))
                      ) : (
                        <>
                          <option value="سوبرماركت">سوبرماركت</option>
                          <option value="أجبان وألبان">أجبان وألبان</option>
                          <option value="جزارة ولحوم">جزارة ولحوم</option>
                          <option value="مخابز وحلويات">مخابز وحلويات</option>
                          <option value="خضار وفواكه">خضار وفواكه</option>
                        </>
                      )}
                    </select>`
);
fs.writeFileSync('src/components/AuthModal.tsx', authModal);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /defaultRole=\{authDefaultRole\}\n\s+promptMessage=\{authPromptMessage\}/,
  'defaultRole={authDefaultRole}\n        promptMessage={authPromptMessage}\n        categories={categories}'
);
fs.writeFileSync('src/App.tsx', app);
