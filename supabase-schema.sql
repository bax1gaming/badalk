-- ==============================================================================
-- منصة بدالك الموحدة (Badalak Platform) - SQL Migration & Schema
-- كود إضافة الأعمدة وجدول العروض الترويجية (offer_slides) في Supabase PostgreSQL
-- ==============================================================================

-- 1. إنشاء جدول العروض الترويجية (السلايدر) في حال لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.offer_slides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    tag TEXT DEFAULT 'عرض خاص',
    badge TEXT DEFAULT 'خصم مميز',
    gradient TEXT DEFAULT 'from-emerald-700 via-teal-800 to-slate-900',
    image TEXT DEFAULT 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    store_id TEXT,
    store_name TEXT,
    
    -- الأعمدة الأساسية لعناصر العرض المحددة (العداد التنازلي وكود الخصم وأزرار التحكم):
    show_tag BOOLEAN DEFAULT TRUE,
    show_badge BOOLEAN DEFAULT TRUE,
    
    -- العمود 1 (العداد التنازلي وبياناته):
    show_timer BOOLEAN DEFAULT TRUE,
    timer_duration_hours INTEGER DEFAULT 6,
    timer_label TEXT DEFAULT 'ينتهي خلال:',
    
    -- العمود 2 (كود الخصم وبياناته):
    show_coupon BOOLEAN DEFAULT TRUE,
    coupon_code TEXT DEFAULT 'BADALIK50',
    coupon_label TEXT DEFAULT 'كود الخصم:',
    
    -- التحكم في زر الإجراء
    show_button BOOLEAN DEFAULT TRUE,
    button_text TEXT DEFAULT 'تسوق الآن',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. كود إضافة الأعمدة (ALTER TABLE) في حال كان الجدول موجوداً مسبقاً
-- إضافة أعمدة بيانات العداد التنازلي والتحكم به (العنصر 1)
ALTER TABLE public.offer_slides 
ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS timer_duration_hours INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS timer_label TEXT DEFAULT 'ينتهي خلال:';

-- إضافة أعمدة بيانات كود الخصم والكوبون والتحكم به (العنصر 2)
ALTER TABLE public.offer_slides 
ADD COLUMN IF NOT EXISTS show_coupon BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT 'BADALIK50',
ADD COLUMN IF NOT EXISTS coupon_label TEXT DEFAULT 'كود الخصم:';

-- إضافة أعمدة إضافية للتحكم في التاج والشارة والزر والمتجر
ALTER TABLE public.offer_slides 
ADD COLUMN IF NOT EXISTS show_tag BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_badge BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_button BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'تسوق الآن',
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- 3. تفعيل الحماية وصلاحيات القراءة والكتابة (Row Level Security - RLS)
ALTER TABLE public.offer_slides ENABLE ROW LEVEL SECURITY;

-- السماح للجميع (العملاء والزوار) بقراءة العروض الترويجية والسلايدر
DROP POLICY IF EXISTS "Public can view active offer slides" ON public.offer_slides;
CREATE POLICY "Public can view active offer slides" 
ON public.offer_slides FOR SELECT 
USING (true);

-- السماح للمسؤولين والتجار بإضافة وتعديل وحذف العروض الترويجية
DROP POLICY IF EXISTS "Admins and Merchants can manage offer slides" ON public.offer_slides;
CREATE POLICY "Admins and Merchants can manage offer slides" 
ON public.offer_slides FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. إدراج عروض تجريبية أولية متكاملة البيانات
INSERT INTO public.offer_slides (
    id, title, subtitle, tag, badge, gradient, image, 
    show_tag, show_badge, show_timer, timer_duration_hours, timer_label, 
    show_coupon, coupon_code, coupon_label, show_button, button_text
) VALUES 
(
    'slide_1',
    'طلب واحد مجمع لجميع احتياجاتك',
    'اطلب الجبنة واللحمة والمخبوزات معاً في سلة واحدة، ومندوب واحد يجمعهم لك!',
    'عرض اليوم',
    'توصيل موحد 16 ج.م',
    'from-emerald-700 via-teal-800 to-slate-900',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    true, true, true, 6, 'ينتهي خلال:',
    true, 'BADALIK50', 'كود الخصم:', true, 'تسوق الآن'
),
(
    'slide_2',
    'أجبان بلدي صعيدي طازجة 100%',
    'جبنة رومي قديمة بطارخ وجبنة قريش طبيعية من مزارع قنا مباشرة إلى باب منزلك.',
    'قسم الألبان',
    'طازج يومياً',
    'from-amber-700 via-orange-800 to-neutral-900',
    'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800',
    true, true, true, 12, 'العرض ساري لمدة:',
    true, 'CHEESE20', 'كوبون الجبن:', true, 'اطلب الألبان'
)
ON CONFLICT (id) DO UPDATE SET 
    show_timer = EXCLUDED.show_timer,
    timer_duration_hours = EXCLUDED.timer_duration_hours,
    timer_label = EXCLUDED.timer_label,
    show_coupon = EXCLUDED.show_coupon,
    coupon_code = EXCLUDED.coupon_code,
    coupon_label = EXCLUDED.coupon_label,
    show_button = EXCLUDED.show_button,
    button_text = EXCLUDED.button_text;

-- ==============================================================================
-- 5. إنشاء جدول طلبات الانضمام (join_requests) للتجار والكباتن في Supabase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.join_requests (
    id TEXT PRIMARY KEY,                       -- مُعرّف الطلب الفريد (مثل req_mrc_... أو req_drv_...)
    user_id TEXT NOT NULL,                     -- مُعرّف المستخدم صاحب الطلب (المسجل في profiles أو auth.users)
    user_name TEXT NOT NULL,                   -- اسم مقدم الطلب بالكامل
    user_email TEXT NOT NULL,                  -- البريد الإلكتروني لمقدم الطلب
    user_phone TEXT,                           -- رقم الهاتف للتواصل
    
    -- نوع الطلب وحالته
    requested_role TEXT NOT NULL CHECK (requested_role IN ('merchant', 'delivery')), -- الدور المطلوب: تاجر أو كابتن
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')), -- حالة الطلب
    
    -- بيانات خاصة بطلب انضمام التاجر (المتجر)
    store_id TEXT,                             -- مُعرّف المتجر المرتبط
    store_name TEXT,                           -- اسم المتجر / المحل المقترح
    store_category TEXT,                       -- تصنيف المتجر (سوبرماركت، لحوم، أجبان، صيدلية...)
    store_address TEXT,                        -- عنوان ومقر المتجر في قنا
    
    -- بيانات خاصة بطلب انضمام كابتن التوصيل (الدليفري)
    driver_id TEXT,                            -- مُعرّف السائق
    vehicle_type TEXT DEFAULT 'موتوسيكل',      -- نوع وسيلة التوصيل (موتوسيكل، سيارة، سكوتر كهربائي)
    plate_number TEXT,                         -- رقم اللوحة المعدنية للمركبة
    
    -- ملاحظات وقرارات الإدارة
    notes TEXT,                                -- ملاحظات إضافية من مقدم الطلب
    admin_feedback TEXT,                       -- سبب القبول أو الملاحظات عند الرفض من الإدارة
    reviewed_by TEXT,                          -- مُعرّف الأدمن الذي قام بالمراجعة
    reviewed_at TIMESTAMPTZ,                   -- تاريخ ووقت مراجعة الطلب
    
    -- التوقيتات
    created_at TIMESTAMPTZ DEFAULT NOW(),      -- تاريخ إنشاء وتقديم الطلب
    updated_at TIMESTAMPTZ DEFAULT NOW()       -- تاريخ آخر تحديث لحالة الطلب
);

-- فهارس الاستعلام السريع
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON public.join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_requested_role ON public.join_requests(requested_role);
CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON public.join_requests(created_at DESC);

-- تفعيل حماية مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- السماح بقراءة الطلبات (العملاء والأدمن)
DROP POLICY IF EXISTS "Anyone can view join requests" ON public.join_requests;
CREATE POLICY "Anyone can view join requests" 
ON public.join_requests FOR SELECT 
USING (true);

-- السماح للجميع بتقديم وإدراج طلب انضمام جديد
DROP POLICY IF EXISTS "Anyone can insert join requests" ON public.join_requests;
CREATE POLICY "Anyone can insert join requests" 
ON public.join_requests FOR INSERT 
WITH CHECK (true);

-- السماح بتحديث الطلب (للأدمن عند الموافقة أو الرفض)
DROP POLICY IF EXISTS "Admins can update join requests" ON public.join_requests;
CREATE POLICY "Admins can update join requests" 
ON public.join_requests FOR UPDATE 
USING (true)
WITH CHECK (true);

-- السماح بحذف الطلب
DROP POLICY IF EXISTS "Admins can delete join requests" ON public.join_requests;
CREATE POLICY "Admins can delete join requests" 
ON public.join_requests FOR DELETE 
USING (true);

-- إدراج طلبات انضمام تجريبية أولية (اختياري)
INSERT INTO public.join_requests (
    id, user_id, user_name, user_email, user_phone, 
    requested_role, status, store_name, store_category, store_address, 
    vehicle_type, plate_number, created_at
) VALUES 
(
    'req_mrc_demo_1', 
    'user_mrc_demo_1', 
    'الحاج إبراهيم القنائي', 
    'ibrahim.store@qena-souq.com', 
    '01012345678', 
    'merchant', 
    'pending', 
    'أسواق البركة المركزية', 
    'سوبرماركت', 
    'ميدان الساعة، قنا', 
    NULL, 
    NULL, 
    NOW() - INTERVAL '2 hours'
),
(
    'req_drv_demo_2', 
    'user_drv_demo_2', 
    'محمود فتحي الصعيدي', 
    'mahmoud.delivery@qena-souq.com', 
    '01198765432', 
    'delivery', 
    'pending', 
    NULL, 
    NULL, 
    NULL, 
    'موتوسيكل', 
    'ق ن أ 4321', 
    NOW() - INTERVAL '5 hours'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 6. نظام مكافآت ونقاط العملاء في جدول profiles (Badalak Rewards System)
-- ==============================================================================

-- 1. كود إضافة الأعمدة الثلاثة إلى جدول profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 CHECK (points >= 0),
ADD COLUMN IF NOT EXISTS orders_above_500_count INTEGER DEFAULT 0 CHECK (orders_above_500_count >= 0),
ADD COLUMN IF NOT EXISTS free_deliveries INTEGER DEFAULT 0 CHECK (free_deliveries >= 0);

-- إضافة توثيق توضيحي للأعمدة (Metadata Comments)
COMMENT ON COLUMN public.profiles.points IS 'رصيد نقاط العميل (تزيد نقطة بعد كل طلب، وتخصم 10 نقاط مقابل توصيل مجاني)';
COMMENT ON COLUMN public.profiles.orders_above_500_count IS 'عداد الطلبات التي تجاوزت قيمتها 500 ج.م (يصل إلى 3 ثم يعاد ضبطه لـ 0)';
COMMENT ON COLUMN public.profiles.free_deliveries IS 'رصيد التوصيلات المجانية المكتسبة (تزيد بمقدار 1 عند إكمال 3 طلبات فوق 500 ج.م)';

-- 2. دالة معالجة مكافآت الطلب واحتساب النقاط والتوصيل المجاني تلقائياً
CREATE OR REPLACE FUNCTION public.process_order_rewards(
    p_customer_id TEXT,
    p_order_total NUMERIC,
    p_used_points_for_delivery BOOLEAN DEFAULT FALSE,
    p_used_free_delivery BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INT := 0;
    v_orders_500 INT := 0;
    v_free_deliveries INT := 0;
    v_earned_new_free_delivery BOOLEAN := FALSE;
BEGIN
    -- قراءة القيم الحالية للمستخدم
    SELECT 
        COALESCE(points, 0), 
        COALESCE(orders_above_500_count, 0), 
        COALESCE(free_deliveries, 0)
    INTO 
        v_current_points, 
        v_orders_500, 
        v_free_deliveries
    FROM public.profiles
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'المستخدم غير موجود');
    END IF;

    -- 1. معالجة استهلاك توصيل مجاني سابق (إن اختار استخدامه)
    IF p_used_free_delivery THEN
        IF v_free_deliveries > 0 THEN
            v_free_deliveries := v_free_deliveries - 1;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'لا يوجد رصيد توصيل مجاني كافٍ');
        END IF;
    END IF;

    -- 2. معالجة صرف 10 نقاط مقابل توصيل مجاني
    IF p_used_points_for_delivery THEN
        IF v_current_points >= 10 THEN
            v_current_points := v_current_points - 10;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'رصيد النقاط غير كافٍ (المطلوب 10 نقاط)');
        END IF;
    END IF;

    -- 3. إضافة نقطة واحدة للعميل مقابل إتمام الطلب
    v_current_points := v_current_points + 1;

    -- 4. فحص شرط الطلب فوق 500 جنيه (إجمالي السلة)
    IF p_order_total >= 500 THEN
        v_orders_500 := v_orders_500 + 1;
        
        -- عند الوصول إلى 3 طلبات: إعادة التصفير وإضافة توصيل مجاني واحد
        IF v_orders_500 >= 3 THEN
            v_orders_500 := 0;
            v_free_deliveries := v_free_deliveries + 1;
            v_earned_new_free_delivery := TRUE;
        END IF;
    END IF;

    -- حفظ التحديثات في جدول profiles
    UPDATE public.profiles
    SET 
        points = v_current_points,
        orders_above_500_count = v_orders_500,
        free_deliveries = v_free_deliveries,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'points', v_current_points,
        'orders_above_500_count', v_orders_500,
        'free_deliveries', v_free_deliveries,
        'earned_new_free_delivery', v_earned_new_free_delivery
    );
END;
$$;

