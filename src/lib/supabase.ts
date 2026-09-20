import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * =====================================================================
 * 🔑 إعدادات مفاتيح قاعدة بيانات سوبابيز (Supabase Database Keys)
 * =====================================================================
 * يمكنك إضافة مفاتيح قاعدة البيانات بإحدى طريقتين:
 * 1) إما بوضعها في ملف البيئة `.env` بالأسماء:
 *    VITE_SUPABASE_URL=رابط_المشروع_هنا
 *    VITE_SUPABASE_ANON_KEY=مفتاح_anon_هنا
 * 
 * 2) أو استبدال النصوص المؤقتة أدناه مباشرة بمفاتيحك الخاصة:
 * =====================================================================
 */

// ضع رابط مشروع Supabase الخاص بك هنا:
// مثال: https://xxxxxxxxxxxxxxxxxxxx.supabase.co
export const SUPABASE_URL: string =
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ||
  'https://YOUR_PROJECT_ID.supabase.co';

// ضع المفتاح العام (anon public key) الخاص بك هنا:
// مثال: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export const SUPABASE_ANON_KEY: string =
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ||
  'YOUR_SUPABASE_ANON_KEY';

/**
 * التحقق مما إذا كان المستخدم قد قام بإدخال مفاتيحه الحقيقية
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
  );
};

/**
 * إنشاء عميل Supabase الآمن
 */
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (error) {
      console.warn('⚠️ خطأ في تهيئة عميل Supabase:', error);
      return null;
    }
  }

  return supabaseInstance;
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
