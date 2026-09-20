const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace categories GET
code = code.replace(
  /app\.get\('\/api\/categories',[\s\S]*?res\.json\(categories\);\n}\);/m,
  `app.get('/api/categories', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('categories').select('name');
      if (!error && data) {
        categories.length = 0;
        categories.push(...data.map((c: any) => c.name));
        return res.json(categories);
      }
    } catch(err) {}
  }
  res.json(categories);
});`
);

// Replace categories POST
code = code.replace(
  /app\.post\('\/api\/categories',[\s\S]*?res\.json\(\{ categories, message:[^\n]*?\}\);\n}\);/m,
  `app.post('/api/categories', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'اسم القسم مطلوب' });
  }
  const trimmed = name.trim();
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      const { error } = await client.from('categories').insert({ name: trimmed });
      if (error) throw error;
      
      const { data } = await supabase.from('categories').select('name');
      if (data) {
        categories.length = 0;
        categories.push(...data.map((c: any) => c.name));
      }
      return res.json({ categories, message: \`تمت إضافة قسم \${trimmed} بنجاح\` });
    } catch (err: any) { 
      console.warn('Supabase categories insert failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء الحفظ في قاعدة البيانات' });
    }
  }
  
  if (!categories.includes(trimmed)) {
    categories.push(trimmed);
    saveDataStore();
  }
  res.json({ categories, message: \`تمت إضافة قسم \${trimmed} بنجاح\` });
});`
);

// Replace categories DELETE
code = code.replace(
  /app\.delete\('\/api\/categories\/:name',[\s\S]*?res\.json\(\{ categories, message:[^\n]*?\}\);\n}\);/m,
  `app.delete('/api/categories/:name', async (req: Request, res: Response) => {
  const catName = decodeURIComponent(req.params.name);
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      await client.from('categories').delete().eq('name', catName);
      const { data } = await supabase.from('categories').select('name');
      if (data) {
        categories.length = 0;
        categories.push(...data.map((c: any) => c.name));
      }
      return res.json({ categories, message: \`تم حذف قسم \${catName}\` });
    } catch (err) {
      console.warn('Supabase categories delete failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء الحذف من قاعدة البيانات' });
    }
  }

  const idx = categories.indexOf(catName);
  if (idx !== -1) {
    categories.splice(idx, 1);
    saveDataStore();
  }
  res.json({ categories, message: \`تم حذف قسم \${catName}\` });
});`
);

// Replace Banners GET
code = code.replace(
  /app\.get\('\/api\/banners',[\s\S]*?res\.json\(offerSlides\);\n}\);/m,
  `app.get('/api/banners', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('offer_slides').select('*');
      if (!error && data) {
        offerSlides.length = 0;
        offerSlides.push(...data.map((b: any) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          tag: b.tag,
          badge: b.badge,
          gradient: b.gradient,
          image: b.image
        })));
        return res.json(offerSlides);
      }
    } catch(err) {}
  }
  res.json(offerSlides);
});`
);

// Replace Banners POST
code = code.replace(
  /app\.post\('\/api\/banners',[\s\S]*?res\.json\(\{ offerSlides, slide: newSlide, message: 'تمت إضافة العرض بنجاح' \}\);\n}\);/m,
  `app.post('/api/banners', async (req: Request, res: Response) => {
  const { title, subtitle, tag, badge, gradient, image } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان العرض مطلوب' });
  }
  const newSlide = {
    id: \`slide_\${Date.now()}\`,
    title: String(title).trim(),
    subtitle: String(subtitle || '').trim(),
    tag: String(tag || 'عرض خاص').trim(),
    badge: String(badge || 'خصم مميز').trim(),
    gradient: String(gradient || 'from-emerald-700 via-teal-800 to-slate-900').trim(),
    image: String(image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800').trim(),
  };
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      const { error } = await client.from('offer_slides').insert(newSlide);
      if (error) throw error;
      
      const { data } = await supabase.from('offer_slides').select('*');
      if (data) {
        offerSlides.length = 0;
        offerSlides.push(...data.map((b: any) => ({
          id: b.id, title: b.title, subtitle: b.subtitle, tag: b.tag, badge: b.badge, gradient: b.gradient, image: b.image
        })));
      }
      return res.json({ offerSlides, slide: newSlide, message: 'تمت إضافة العرض بنجاح' });
    } catch (err: any) { 
      console.warn('Supabase banners insert failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء الحفظ في قاعدة البيانات' });
    }
  }
  
  offerSlides.push(newSlide);
  saveDataStore();
  res.json({ offerSlides, slide: newSlide, message: 'تمت إضافة العرض بنجاح' });
});`
);

// Replace Banners PUT
code = code.replace(
  /app\.put\('\/api\/banners\/:id',[\s\S]*?res\.json\(\{ offerSlides, slide: offerSlides\[idx\], message: 'تم تحديث العرض بنجاح' \}\);\n}\);/m,
  `app.put('/api/banners/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = offerSlides.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'العرض غير موجود' });
  }
  const { title, subtitle, tag, badge, gradient, image } = req.body;
  
  const updatedSlide = {
    ...offerSlides[idx],
    title: title !== undefined ? String(title).trim() : offerSlides[idx].title,
    subtitle: subtitle !== undefined ? String(subtitle).trim() : offerSlides[idx].subtitle,
    tag: tag !== undefined ? String(tag).trim() : offerSlides[idx].tag,
    badge: badge !== undefined ? String(badge).trim() : offerSlides[idx].badge,
    gradient: gradient !== undefined ? String(gradient).trim() : offerSlides[idx].gradient,
    image: image !== undefined ? String(image).trim() : offerSlides[idx].image,
  };
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      const { error } = await client.from('offer_slides').update({
        title: updatedSlide.title, subtitle: updatedSlide.subtitle, tag: updatedSlide.tag, badge: updatedSlide.badge, gradient: updatedSlide.gradient, image: updatedSlide.image
      }).eq('id', id);
      if (error) throw error;
      
      const { data } = await supabase.from('offer_slides').select('*');
      if (data) {
        offerSlides.length = 0;
        offerSlides.push(...data.map((b: any) => ({
          id: b.id, title: b.title, subtitle: b.subtitle, tag: b.tag, badge: b.badge, gradient: b.gradient, image: b.image
        })));
      }
      return res.json({ offerSlides, slide: updatedSlide, message: 'تم تحديث العرض بنجاح' });
    } catch (err: any) { 
      console.warn('Supabase banners update failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء التحديث في قاعدة البيانات' });
    }
  }
  
  offerSlides[idx] = updatedSlide;
  saveDataStore();
  res.json({ offerSlides, slide: offerSlides[idx], message: 'تم تحديث العرض بنجاح' });
});`
);

// Replace Banners DELETE
code = code.replace(
  /app\.delete\('\/api\/banners\/:id',[\s\S]*?res\.json\(\{ offerSlides, message: 'تم حذف العرض من السلايدر بنجاح' \}\);\n}\);/m,
  `app.delete('/api/banners/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      const { error } = await client.from('offer_slides').delete().eq('id', id);
      if (error) throw error;
      
      const { data } = await supabase.from('offer_slides').select('*');
      if (data) {
        offerSlides.length = 0;
        offerSlides.push(...data.map((b: any) => ({
          id: b.id, title: b.title, subtitle: b.subtitle, tag: b.tag, badge: b.badge, gradient: b.gradient, image: b.image
        })));
      }
      return res.json({ offerSlides, message: 'تم حذف العرض من السلايدر بنجاح' });
    } catch (err: any) { 
      console.warn('Supabase banners delete failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء الحذف من قاعدة البيانات' });
    }
  }

  const idx = offerSlides.findIndex((s) => s.id === id);
  if (idx !== -1) {
    offerSlides.splice(idx, 1);
    saveDataStore();
  }
  res.json({ offerSlides, message: 'تم حذف العرض من السلايدر بنجاح' });
});`
);

fs.writeFileSync('server.ts', code);
