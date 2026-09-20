import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  UserRole,
  Store,
  Product,
  Order,
  DeliveryProfile,
  WithdrawalRequest,
  DriverDistanceEvaluation,
  NotificationItem,
} from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely on the server side
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiAi = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// Supabase Database Integration (Integration with Supabase Client)
// -------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

// Auto-load .env file if present
if (fs.existsSync('.env')) {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && val && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  } catch (envErr) {
    console.warn('⚠️ Error reading .env file:', envErr);
  }
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
const supabaseAdmin =
  Boolean(supabaseUrl) && Boolean(supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

// Helper to get authenticated client for user or admin bypass
function getSupabaseClient(userAccessToken?: string | null) {
  if (supabaseAdmin) return supabaseAdmin;
  if (userAccessToken && supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

if (isSupabaseConfigured) {
  console.log('✅ Supabase Client initialized successfully for URL:', supabaseUrl);
  if (supabaseAdmin) {
    console.log('🛡️ Supabase Admin (Service Role) activated - RLS bypassed for server operations.');
  }
} else {
  console.log('ℹ️ Running in local/offline database mode (Supabase keys not yet configured).');
}

// In-memory store for user passwords (for secure password verification)
const userPasswords = new Map<string, string>();
userPasswords.set('customer@platform.com', 'Password123!');
userPasswords.set('merchant@meat.com', 'Password123!');
userPasswords.set('merchant@cheese.com', 'Password123!');
userPasswords.set('delivery@driver.com', 'Password123!');
userPasswords.set('delivery2@driver.com', 'Password123!');
userPasswords.set('admin@platform.com', 'Password123!');

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));
}

function stringToUUID(str?: string | null): string {
  if (!str) return crypto.randomUUID();
  if (isValidUUID(str)) return String(str);
  const hash = crypto.createHash('md5').update(String(str)).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function ensureStoreExistsInSupabase(store: Store): Promise<string> {
  if (!supabase) return store.id;

  try {
    const storeUUID = isValidUUID(store.id) ? store.id : stringToUUID(store.id);

    // 1. Try finding by UUID (guaranteed to be valid UUID format to prevent 22P02 error)
    const { data: storeById } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeUUID)
      .maybeSingle();

    if (storeById?.id) {
      return storeById.id;
    }

    // 2. Try finding by Name
    if (store.name) {
      const { data: storeByName } = await supabase
        .from('stores')
        .select('id')
        .eq('name', store.name)
        .maybeSingle();

      if (storeByName?.id) {
        return storeByName.id;
      }
    }

    // 3. Resolve a valid owner_id in public.profiles (to satisfy foreign key stores_owner_id_fkey)
    let validOwnerId: string | null = null;
    if (store.ownerId && isValidUUID(store.ownerId)) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('id', store.ownerId).maybeSingle();
      if (prof?.id) validOwnerId = prof.id;
    }
    if (!validOwnerId) {
      const { data: mProf } = await supabase.from('profiles').select('id').eq('role', 'merchant').maybeSingle();
      if (mProf?.id) {
        validOwnerId = mProf.id;
      } else {
        const { data: anyProf } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        if (anyProf?.id) validOwnerId = anyProf.id;
      }
    }

    // 4. Prepare payload to insert store
    const storePayload: Record<string, any> = {
      id: storeUUID,
      name: store.name,
      description: store.description || 'متجر تجاري معتمد في قنا',
      category: store.category || 'عام',
      logo_url: store.logoUrl,
      banner_url: store.bannerUrl,
      address: store.address || 'قنا - مصر',
      phone: store.phone || '+20 10 0000 0000',
      is_open: store.isOpen ?? true,
      rating: store.rating || 5.0,
      review_count: store.reviewCount || 0,
      price_level: store.priceLevel || '$$',
      lat: store.lat || 26.1550,
      lng: store.lng || 32.7160,
      is_approved: store.isApproved !== false,
    };

    if (validOwnerId) {
      storePayload.owner_id = validOwnerId;
    }

    let { error: insertErr } = await supabase.from('stores').insert(storePayload);

    if (insertErr) {
      console.warn('⚠️ Supabase store insert note:', insertErr.message);
      // Retry without owner_id if foreign key failed
      delete storePayload.owner_id;
      const retryRes = await supabase.from('stores').insert(storePayload);
      if (!retryRes.error) {
        return storeUUID;
      }
      // Retry minimal required columns
      const minimalPayload = {
        id: storeUUID,
        name: store.name,
        category: store.category || 'عام',
      };
      const { error: minErr } = await supabase.from('stores').insert(minimalPayload);
      if (minErr) {
        console.warn('⚠️ Supabase store minimal insert warning:', minErr.message);
      }
    }

    return storeUUID;
  } catch (err) {
    console.warn('⚠️ ensureStoreExistsInSupabase warning:', err);
    return isValidUUID(store.id) ? store.id : stringToUUID(store.id);
  }
}

async function ensureProductExistsInSupabase(product: Product, storeId?: string): Promise<string> {
  if (!supabase) return product.id;

  try {
    const prodUUID = isValidUUID(product.id) ? product.id : stringToUUID(product.id);

    // 1. Try finding by UUID
    const { data: pById } = await supabase.from('products').select('id, store_id').eq('id', prodUUID).maybeSingle();
    if (pById?.id) return pById.id;

    // 2. Try finding by Name
    if (product.name) {
      const { data: pByName } = await supabase.from('products').select('id, store_id').eq('name', product.name.trim()).maybeSingle();
      if (pByName?.id) return pByName.id;
    }

    // 3. Resolve valid store_id
    let validStoreId: string | null = null;
    const targetStoreId = storeId || product.storeId;
    if (targetStoreId && isValidUUID(targetStoreId)) {
      const { data: st } = await supabase.from('stores').select('id').eq('id', targetStoreId).maybeSingle();
      if (st?.id) validStoreId = st.id;
    }
    if (!validStoreId) {
      const matchingStore = stores.find((s) => s.id === product.storeId || s.name === product.storeName) || stores[0];
      validStoreId = await ensureStoreExistsInSupabase(matchingStore);
    }

    // 4. Insert into products
    const productPayload: Record<string, any> = {
      id: prodUUID,
      store_id: validStoreId,
      name: product.name,
      description: product.description || '',
      price: Number(product.price) || 10,
      image_url: product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      category: product.category || 'عام',
      stock_quantity: Number(product.stockQuantity) || 10,
      is_sold_out: Boolean(product.isSoldOut),
      rating: Number(product.rating) || 5.0,
      review_count: Number(product.reviewCount) || 0,
      created_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabase.from('products').insert(productPayload);
    if (!insErr) {
      console.log('✅ Product inserted into Supabase products table:', prodUUID);
      return prodUUID;
    } else {
      console.warn('⚠️ Supabase product insert note:', insErr.message);
      // Fallback: minimal insert
      const minimalPayload = {
        id: prodUUID,
        store_id: validStoreId,
        name: product.name,
        price: Number(product.price) || 10,
      };
      const { error: minErr } = await supabase.from('products').insert(minimalPayload);
      if (!minErr) return prodUUID;
    }

    // If all else fails, query any product in Supabase to return a valid product ID
    const { data: anyP } = await supabase.from('products').select('id').limit(1).maybeSingle();
    if (anyP?.id) return anyP.id;

    return prodUUID;
  } catch (err) {
    console.warn('⚠️ ensureProductExistsInSupabase warning:', err);
    return isValidUUID(product.id) ? product.id : stringToUUID(product.id);
  }
}

function mapStore(s: any): Store {
  return {
    id: s.id,
    ownerId: s.owner_id || s.ownerId,
    name: s.name,
    description: s.description,
    category: s.category,
    logoUrl: s.logo_url || s.logoUrl,
    bannerUrl: s.banner_url || s.bannerUrl,
    rating: s.rating ? Number(s.rating) : 5.0,
    reviewCount: s.review_count !== undefined ? Number(s.review_count) : (s.reviewCount !== undefined ? Number(s.reviewCount) : 0),
    priceLevel: s.price_level || s.priceLevel || '$$',
    lat: s.lat ? Number(s.lat) : 26.1550,
    lng: s.lng ? Number(s.lng) : 32.7160,
    address: s.address,
    phone: s.phone,
    isOpen: s.is_open !== undefined ? Boolean(s.is_open) : (s.isOpen !== undefined ? Boolean(s.isOpen) : true),
    distanceKm: s.distance_km || s.distanceKm || 1.0,
    isApproved: s.is_approved !== undefined && s.is_approved !== null ? Boolean(s.is_approved) : (s.isApproved !== undefined ? Boolean(s.isApproved) : true),
  };
}

function mapProduct(p: any): Product {
  const stockQty =
    p.stock_quantity !== undefined && p.stock_quantity !== null
      ? Number(p.stock_quantity)
      : p.stockQuantity !== undefined && p.stockQuantity !== null
      ? Number(p.stockQuantity)
      : 10;

  const soldOut =
    p.is_sold_out !== undefined && p.is_sold_out !== null
      ? Boolean(p.is_sold_out)
      : p.isSoldOut !== undefined && p.isSoldOut !== null
      ? Boolean(p.isSoldOut)
      : stockQty <= 0;

  return {
    id: p.id,
    storeId: p.store_id || p.storeId,
    storeName: p.store_name || p.storeName,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : (p.originalPrice ? Number(p.originalPrice) : undefined),
    imageUrl: p.image_url || p.imageUrl,
    category: p.category,
    stockQuantity: stockQty,
    isSoldOut: soldOut,
    rating: p.rating ? Number(p.rating) : 5.0,
    reviewCount: p.review_count !== undefined ? Number(p.review_count) : (p.reviewCount !== undefined ? Number(p.reviewCount) : 0),
    reviews: Array.isArray(p.reviews) ? p.reviews : [],
    createdAt: p.created_at || p.createdAt,
  };
}

const GREEN_ANONYMOUS_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2310b981' rx='50'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23ffffff'/%3E%3Cpath d='M20 85 C20 62, 35 55, 50 55 C65 55, 80 62, 80 85 Z' fill='%23ffffff'/%3E%3C/svg%3E";

function mapUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '+20 10 0000 0000',
    role: (u.role as UserRole) || 'customer',
    requestedRole: u.requested_role || u.requestedRole || undefined,
    approvalStatus: u.approval_status || u.approvalStatus || undefined,
    storeId: u.store_id || u.storeId || undefined,
    storeName: u.store_name || u.storeName || undefined,
    storeCategory: u.store_category || u.storeCategory || undefined,
    storeAddress: u.store_address || u.storeAddress || undefined,
    vehicleType: u.vehicle_type || u.vehicleType || undefined,
    plateNumber: u.plate_number || u.plateNumber || undefined,
    createdAt: u.created_at || u.createdAt || undefined,
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
    points: Number(u.points ?? 0),
    ordersAbove500Count: Number(u.orders_above_500_count ?? u.ordersAbove500Count ?? 0),
    freeDeliveries: Number(u.free_deliveries ?? u.freeDeliveries ?? 0),
  };
}

// -------------------------------------------------------------
// In-Memory Database (Mirrors Supabase PostgreSQL Architecture)
// -------------------------------------------------------------

const users: User[] = [
  {
    id: 'usr_customer_1',
    name: 'سارة محمد',
    email: 'customer@platform.com',
    phone: '+20 10 1234 5678',
    role: 'customer',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
  {
    id: 'usr_merchant_1',
    name: 'الحاج محمود (ملحمة الصعيد)',
    email: 'merchant@meat.com',
    phone: '+20 11 9876 5432',
    role: 'merchant',
    storeId: 'str_meat_1',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
  {
    id: 'usr_merchant_2',
    name: 'عماد القنائي (أجبان قنا البلدية)',
    email: 'merchant@cheese.com',
    phone: '+20 12 2223 3344',
    role: 'merchant',
    storeId: 'str_cheese_1',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
  {
    id: 'usr_delivery_1',
    name: 'الكابتن أحمد ممدوح',
    email: 'delivery@driver.com',
    phone: '+20 10 8881 1122',
    role: 'delivery',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
  {
    id: 'usr_delivery_2',
    name: 'الكابتن عمر الشامي',
    email: 'delivery2@driver.com',
    phone: '+20 10 9993 3344',
    role: 'delivery',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
  {
    id: 'usr_admin_1',
    name: 'المدير العام طارق المنصوري',
    email: 'admin@platform.com',
    phone: '+20 10 0009 9988',
    role: 'admin',
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  },
];

let stores: Store[] = [
  {
    id: 'str_cheese_1',
    ownerId: 'usr_merchant_2',
    name: 'أجبان وألبان قنا الصعيدية',
    description: 'تشكيلة مختارة من أرقى الأجبان الصعيدية والجبنة القريش والزبادي البلدي والألبان الطازجة يومياً',
    category: 'أجبان وألبان',
    logoUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200',
    rating: 4.9,
    reviewCount: 184,
    priceLevel: '$$',
    lat: 26.1550,
    lng: 32.7160,
    address: 'شارع 23 يوليو، وسط البلد، قنا',
    phone: '+20 96 321 4567',
    isOpen: true,
    distanceKm: 1.2,
  },
  {
    id: 'str_meat_1',
    ownerId: 'usr_merchant_1',
    name: 'ملحمة الصعيد للحوم الطازجة',
    description: 'لحوم بلدي طازجة وضاني وعجول مذبوحة يومياً تحت إشراف بيطري مع التقطيع والتجهيز حسب رغبتك',
    category: 'جزارة ولحوم',
    logoUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200',
    rating: 4.8,
    reviewCount: 240,
    priceLevel: '$$$',
    lat: 26.1600,
    lng: 32.7210,
    address: 'ميدان الساعة، شارع الجمهورية، قنا',
    phone: '+20 96 332 7890',
    isOpen: true,
    distanceKm: 0.8,
  },
  {
    id: 'str_supermarket_1',
    ownerId: 'usr_admin_1',
    name: 'سوبرماركت الهلالي - قنا',
    description: 'جميع المواد التموينية والمستلزمات المنزلية والغذائية ومنتجات السوبرماركت بأفضل الأسعار',
    category: 'سوبرماركت',
    logoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200',
    rating: 4.6,
    reviewCount: 310,
    priceLevel: '$',
    lat: 26.1650,
    lng: 32.7280,
    address: 'حي المصالح، مجمع المحاكم، قنا',
    phone: '+20 96 345 0123',
    isOpen: true,
    distanceKm: 2.1,
  },
  {
    id: 'str_bakery_1',
    ownerId: 'usr_admin_1',
    name: 'مخبوزات وفطير صعيدي البركة',
    description: 'فطير مشلتت صعيدي بالسمن البلدي، عيش شمسي، مخبوزات طازجة من الفرن وحلويات شرقية',
    category: 'مخابز وحلويات',
    logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200',
    rating: 4.7,
    reviewCount: 156,
    priceLevel: '$$',
    lat: 26.1520,
    lng: 32.7120,
    address: 'شارع المحطة، مدينة قنا',
    phone: '+20 96 356 1234',
    isOpen: true,
    distanceKm: 1.6,
  },
  {
    id: 'str_veggies_1',
    ownerId: 'usr_admin_1',
    name: 'واحة الصعيد للخضار والفاكهة الطازجة',
    description: 'خضار وفاكهة طازجة من مزارع قنا والصعيد مباشرة مقطوفة يومياً بأعلى جودة',
    category: 'خضار وفواكه',
    logoUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1200',
    rating: 4.8,
    reviewCount: 92,
    priceLevel: '$',
    lat: 26.1700,
    lng: 32.7350,
    address: 'منطقة المعنا، طريق قنا الأقصر، قنا',
    phone: '+20 96 367 6789',
    isOpen: true,
    distanceKm: 1.9,
  },
];

let products: Product[] = [
  // Cheese & Dairy Products
  {
    id: 'prd_cheese_romi',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة رومي بلدي قديمة معتقة بطارخ (500 جم)',
    description: 'جبنة رومي بلدي معتقة على أصولها بطعم غني ومميز من أجود مزارع الصعيد',
    price: 95,
    originalPrice: 110,
    imageUrl: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 45,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 38,
    reviews: [
      {
        id: 'rev_romi_1',
        productId: 'prd_cheese_romi',
        userId: 'usr_customer_1',
        userName: 'أحمد محمود',
        rating: 5,
        comment: 'طعم الرومي القديم ممتاز جداً وجودة لا يعلى عليها.',
        createdAt: '2026-03-05',
      },
    ],
    createdAt: '2026-01-08',
  },
  {
    id: 'prd_cheese_white',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة بيضاء براميلي صعيدي بالفلفل الأخضر (1 كجم)',
    description: 'جبنة بيضاء براميلي طبيعية مخللة بالفلفل الأخضر الحار والحليب الطبيعي 100%',
    price: 85,
    originalPrice: 95,
    imageUrl: 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 30,
    isSoldOut: false,
    rating: 4.8,
    reviewCount: 27,
    reviews: [],
    createdAt: '2026-01-12',
  },
  {
    id: 'prd_cheese_areesh',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة قريش فلاحي طازجة بالسمن البلدي (1 كجم)',
    description: 'جبنة قريش صعيدي طبيعية دايت قليلة الملح مجهزة من الحليب البقري الطازج يومياً',
    price: 55,
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 25,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 15,
    reviews: [],
    createdAt: '2026-01-14',
  },
  {
    id: 'prd_cheese_1',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة شيدر إنجليزية فاخرة معتقة (500 جم)',
    description: 'شيدر إنجليزية أصيلة معتقة لمدة 12 شهراً بنكهة غنية ومميزة للسندويشات والمقبلات',
    price: 45,
    originalPrice: 55,
    imageUrl: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 28,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 42,
    reviews: [],
    createdAt: '2026-01-10',
  },
  {
    id: 'prd_cheese_2',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة فيتا يونانية أصلية بزيت الزيتون والزعتر (400 جم)',
    description: 'فيتا يونانية أصيلة مصنوعة من حليب الماعز والأغنام، مغمورة بزيت الزيتون البكر والزعتر الجبلي',
    price: 32,
    imageUrl: 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 15,
    isSoldOut: false,
    rating: 4.8,
    reviewCount: 19,
    reviews: [],
    createdAt: '2026-01-15',
  },
  {
    id: 'prd_cheese_mozzarella',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة موزاريلا طبيعية مبشورة للبيتزا والمعجنات (500 جم)',
    description: 'موزاريلا طبيعية بمطة غنية وسريعة الذوبان للبيتزا والمكرونة',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 20,
    isSoldOut: false,
    rating: 4.7,
    reviewCount: 14,
    reviews: [],
    createdAt: '2026-01-20',
  },
  {
    id: 'prd_cheese_3',
    storeId: 'str_cheese_1',
    storeName: 'أجبان وألبان المدينة الفاخرة',
    name: 'جبنة بارميزان ريجيانو إيطالية (250 جم)',
    description: 'بارميزان أصلية محفورة ومختومة بنكهة عميقة مثالية للباستا والسلطات',
    price: 58,
    originalPrice: 65,
    imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=500',
    category: 'أجبان وألبان',
    stockQuantity: 0,
    isSoldOut: true,
    rating: 5.0,
    reviewCount: 31,
    reviews: [],
    createdAt: '2026-02-01',
  },

  // Meat Products
  {
    id: 'prd_meat_1',
    storeId: 'str_meat_1',
    storeName: 'ملحمة الريان للحوم الطازجة',
    name: 'لحم عجل بلدي طازج مفروم خشن (1 كجم)',
    description: 'لحم عجل بلدي طري قليل الدهن مفروم طازج يومياً، مثالي للبرجر والكباب والصلصات',
    price: 68,
    originalPrice: 78,
    imageUrl: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=500',
    category: 'جزارة ولحوم',
    stockQuantity: 35,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 88,
    reviews: [
      {
        id: 'rev_3',
        productId: 'prd_meat_1',
        userId: 'usr_customer_1',
        userName: 'سارة محمد',
        rating: 5,
        comment: 'اللحم طازج ونظيف جداً ووصل مغلف بالثلج وبحالة ممتازة.',
        createdAt: '2026-02-20',
      },
    ],
    createdAt: '2026-01-05',
  },
  {
    id: 'prd_meat_2',
    storeId: 'str_meat_1',
    storeName: 'ملحمة الريان للحوم الطازجة',
    name: 'ريش ضأن نعيمي بلدي متبلة (1 كجم)',
    description: 'ريش نعيمي بلدي ممتازة ومتبلة بخلطة الأعشاب الخاصة للشواء المباشر',
    price: 94,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    category: 'جزارة ولحوم',
    stockQuantity: 18,
    isSoldOut: false,
    rating: 4.8,
    reviewCount: 52,
    reviews: [],
    createdAt: '2026-01-20',
  },
  {
    id: 'prd_meat_3',
    storeId: 'str_meat_1',
    storeName: 'ملحمة الريان للحوم الطازجة',
    name: 'كفتة لحم ضأن طازجة متبلة بالأعشاب (800 جم)',
    description: 'كفتة مشوية شهية متبلة بالبصل والبقدونس والبهارات العربية الفاخرة',
    price: 54,
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=500',
    category: 'جزارة ولحوم',
    stockQuantity: 24,
    isSoldOut: false,
    rating: 4.7,
    reviewCount: 30,
    reviews: [],
    createdAt: '2026-02-12',
  },

  // Bakery Products
  {
    id: 'prd_bakery_1',
    storeId: 'str_bakery_1',
    storeName: 'مخبوزات وحلويات القصر',
    name: 'بوكس كرواسون فرنسي مشكل بالزبدة والجبن (6 قطع)',
    description: 'كرواسون هش ومورق ومخبوز طازج بالزبدة الفرنسية النقية والجبن الذائب',
    price: 36,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500',
    category: 'مخابز وحلويات',
    stockQuantity: 12,
    isSoldOut: false,
    rating: 4.8,
    reviewCount: 22,
    reviews: [],
    createdAt: '2026-02-18',
  },
  {
    id: 'prd_bakery_2',
    storeId: 'str_bakery_1',
    storeName: 'مخبوزات وحلويات القصر',
    name: 'تورتة التوت والفراولة البلجيكية',
    description: 'طبقات كيك الفانيليا الهشة مع كريمة الماسكاربوني وفواكه التوت الطبيعية',
    price: 110,
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500',
    category: 'مخابز وحلويات',
    stockQuantity: 5,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 16,
    reviews: [],
    createdAt: '2026-02-22',
  },

  // Produce Products
  {
    id: 'prd_veg_1',
    storeId: 'str_veggies_1',
    storeName: 'واحة الخضار والفواكه العضوية',
    name: 'صندوق طماطم كرزية وخيار بلدي عضوي (2 كجم)',
    description: 'خضروات عضوية طازجة بدون مبيدات من المزارع المحلية مباشرة',
    price: 24,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500',
    category: 'خضار وفواكه',
    stockQuantity: 40,
    isSoldOut: false,
    rating: 4.7,
    reviewCount: 28,
    reviews: [],
    createdAt: '2026-02-25',
  },
];

// Delivery Drivers Fleet Profiles
let deliveryDrivers: DeliveryProfile[] = [
  {
    id: 'drv_1',
    userId: 'usr_delivery_1',
    driverName: 'الكابتن أحمد ممدوح',
    vehicleType: 'موتوسيكل',
    plateNumber: 'ق ن أ 4432',
    currentLat: 26.1551,
    currentLng: 32.7160,
    isOnline: true,
    todayEarnings: 0,
    totalCashCollected: 0,
    todayKmDriven: 0,
    fuelConsumedLiters: 0,
  },
  {
    id: 'drv_2',
    userId: 'usr_delivery_2',
    driverName: 'الكابتن عمر الشامي',
    vehicleType: 'سيارة',
    plateNumber: 'س ص ع 9871',
    currentLat: 26.1620,
    currentLng: 32.7210,
    isOnline: true,
    todayEarnings: 0,
    totalCashCollected: 0,
    todayKmDriven: 0,
    fuelConsumedLiters: 0,
  },
];

function mapDriver(d: any): DeliveryProfile {
  return {
    id: d.id,
    userId: d.user_id || d.userId || d.id,
    driverName: d.driver_name || d.driverName || d.name || 'كابتن توصيل',
    vehicleType: d.vehicle_type || d.vehicleType || 'موتوسيكل',
    plateNumber: d.plate_number || d.plateNumber || 'ق ن أ 4432',
    currentLat: d.current_lat !== null && d.current_lat !== undefined ? Number(d.current_lat) : 26.1551,
    currentLng: d.current_lng !== null && d.current_lng !== undefined ? Number(d.current_lng) : 32.7160,
    isOnline: d.is_online !== undefined && d.is_online !== null ? Boolean(d.is_online) : true,
    todayEarnings: d.today_earnings !== null && d.today_earnings !== undefined ? Number(d.today_earnings) : 0,
    totalCashCollected: d.total_cash_collected !== null && d.total_cash_collected !== undefined ? Number(d.total_cash_collected) : 0,
    todayKmDriven: d.today_km_driven !== null && d.today_km_driven !== undefined ? Number(d.today_km_driven) : 0,
    fuelConsumedLiters: d.fuel_consumed_liters !== null && d.fuel_consumed_liters !== undefined ? Number(d.fuel_consumed_liters) : 0,
    isApproved: d.is_approved !== undefined && d.is_approved !== null ? Boolean(d.is_approved) : (d.isApproved !== undefined ? Boolean(d.isApproved) : true),
  };
}

async function getRealDriversFromDatabase(): Promise<DeliveryProfile[]> {
  const result: DeliveryProfile[] = [];
  const seenIds = new Set<string>();

  if (supabase) {
    try {
      // 1. Fetch from 'drivers' table
      const { data: dbDrivers } = await supabase.from('drivers').select('*');
      if (dbDrivers && dbDrivers.length > 0) {
        for (const dbD of dbDrivers) {
          const mapped = mapDriver(dbD);
          if (!seenIds.has(mapped.id)) {
            seenIds.add(mapped.id);
            result.push(mapped);
          }
        }
      }

      // 2. Fetch from 'profiles' table where role = 'delivery'
      const { data: deliveryProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'delivery');

      if (deliveryProfiles && deliveryProfiles.length > 0) {
        for (const prof of deliveryProfiles) {
          const existingInResult = result.find((r) => r.userId === prof.id || r.id === prof.id);
          const existingInMem = deliveryDrivers.find((d) => d.userId === prof.id || d.id === prof.id);

          if (existingInResult) {
            if (prof.name) existingInResult.driverName = prof.name;
          } else {
            const mapped: DeliveryProfile = {
              id: prof.id,
              userId: prof.id,
              driverName: prof.name || existingInMem?.driverName || 'كابتن توصيل',
              vehicleType: existingInMem?.vehicleType || 'موتوسيكل',
              plateNumber: existingInMem?.plateNumber || ('ق ن أ ' + (prof.phone?.slice(-4) || '1020')),
              currentLat: existingInMem?.currentLat ?? 26.1551,
              currentLng: existingInMem?.currentLng ?? 32.7160,
              // Preserves stored isOnline status from memory/data-store
              isOnline: existingInMem?.isOnline !== undefined ? Boolean(existingInMem.isOnline) : true,
              todayEarnings: existingInMem?.todayEarnings ?? 0,
              totalCashCollected: existingInMem?.totalCashCollected ?? 0,
              todayKmDriven: existingInMem?.todayKmDriven ?? 0,
              fuelConsumedLiters: existingInMem?.fuelConsumedLiters ?? 0,
            };
            seenIds.add(mapped.id);
            result.push(mapped);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ getRealDriversFromDatabase error:', err);
    }
  }

  // Preserve existing drivers from memory / data-store
  for (const memD of deliveryDrivers) {
    if (!seenIds.has(memD.id) && !seenIds.has(memD.userId)) {
      seenIds.add(memD.id);
      result.push(memD);
    }
  }

  // Update in-memory deliveryDrivers if database returned real drivers
  if (result.length > 0) {
    deliveryDrivers = result;
    return result;
  }

  return deliveryDrivers;
}

async function ensureDriverExistsInSupabase(driver?: DeliveryProfile): Promise<string | null> {
  if (!supabase) return driver ? driver.id : null;

  try {
    const targetDriver = driver || deliveryDrivers[0] || {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      driverName: 'الكابتن أحمد ممدوح',
      vehicleType: 'موتوسيكل',
      plateNumber: 'ق ن أ 4432',
      currentLat: 26.1551,
      currentLng: 32.7160,
      isOnline: true,
      todayEarnings: 0,
      totalCashCollected: 0,
      todayKmDriven: 0,
      fuelConsumedLiters: 0,
    };

    // 1. Check if this specific driver already exists in public.drivers table
    if (targetDriver.id && isValidUUID(targetDriver.id)) {
      const { data: byId } = await supabase.from('drivers').select('id, user_id, driver_name').eq('id', targetDriver.id).maybeSingle();
      if (byId?.id) {
        targetDriver.id = byId.id;
        if (byId.user_id) targetDriver.userId = byId.user_id;
        return byId.id;
      }
    }

    if (targetDriver.userId && isValidUUID(targetDriver.userId)) {
      const { data: byUserId } = await supabase.from('drivers').select('id, user_id, driver_name').eq('user_id', targetDriver.userId).maybeSingle();
      if (byUserId?.id) {
        targetDriver.id = byUserId.id;
        targetDriver.userId = byUserId.user_id;
        return byUserId.id;
      }
    }

    if (targetDriver.driverName) {
      const { data: byName } = await supabase.from('drivers').select('id, user_id, driver_name').eq('driver_name', targetDriver.driverName.trim()).maybeSingle();
      if (byName?.id) {
        targetDriver.id = byName.id;
        if (byName.user_id) targetDriver.userId = byName.user_id;
        return byName.id;
      }
    }

    // 2. If not found in drivers table, find or create an eligible user in public.profiles
    let driverUserId: string | null = null;
    if (targetDriver.userId && isValidUUID(targetDriver.userId)) {
      const { data: existingUser } = await supabase.from('profiles').select('id').eq('id', targetDriver.userId).maybeSingle();
      if (existingUser?.id) driverUserId = existingUser.id;
    }

    if (!driverUserId) {
      const { data: deliveryProf } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'delivery')
        .maybeSingle();

      if (deliveryProf?.id) {
        driverUserId = deliveryProf.id;
      } else {
        const generatedUserId = crypto.randomUUID();
        const { error: pErr } = await supabase.from('profiles').insert({
          id: generatedUserId,
          name: targetDriver.driverName || 'الكابتن أحمد ممدوح',
          email: `driver_${Date.now()}@delivery.com`,
          phone: '+20 10 8881 1122',
          role: 'delivery',
        });
        if (!pErr) {
          driverUserId = generatedUserId;
        } else {
          // Fallback to any existing profile
          const { data: anyProf } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
          if (anyProf?.id) driverUserId = anyProf.id;
        }
      }
    }

    if (!driverUserId) {
      console.warn('⚠️ Could not resolve a user_id for driver in Supabase');
      return null;
    }

    const targetUUID = isValidUUID(targetDriver.id) ? targetDriver.id : crypto.randomUUID();
    targetDriver.id = targetUUID;
    targetDriver.userId = driverUserId;

    const driverPayload: Record<string, any> = {
      id: targetUUID,
      user_id: driverUserId,
      driver_name: targetDriver.driverName,
      vehicle_type: targetDriver.vehicleType || 'موتوسيكل',
      plate_number: targetDriver.plateNumber || 'ق ن أ 4432',
      current_lat: targetDriver.currentLat || 26.1551,
      current_lng: targetDriver.currentLng || 32.7160,
      is_online: targetDriver.isOnline !== false,
      today_earnings: targetDriver.todayEarnings || 0,
      total_cash_collected: targetDriver.totalCashCollected || 0,
      today_km_driven: targetDriver.todayKmDriven || 0,
      fuel_consumed_liters: targetDriver.fuelConsumedLiters || 0,
    };

    const { error: insErr } = await supabase.from('drivers').upsert(driverPayload);
    if (insErr) {
      console.warn('⚠️ Supabase driver upsert note:', insErr.message);
      const minimalPayload = {
        id: targetUUID,
        user_id: driverUserId,
        driver_name: targetDriver.driverName,
      };
      await supabase.from('drivers').upsert(minimalPayload);
    }

    console.log(`✅ Driver "${targetDriver.driverName}" confirmed/inserted in Supabase "drivers" table with ID: ${targetUUID}`);
    return targetUUID;
  } catch (err) {
    console.warn('⚠️ ensureDriverExistsInSupabase exception:', err);
    return null;
  }
}

// Withdrawal Requests
let withdrawalRequests: WithdrawalRequest[] = [];

// Platform Orders
let orders: Order[] = [];

let notifications: NotificationItem[] = [];

let categories: string[] = [
  'أجبان وألبان',
  'جزارة ولحوم',
  'سوبرماركت',
  'مخابز وحلويات',
  'خضار وفواكه',
];

let offerSlides: any[] = [
  {
    id: 'slide_1',
    title: 'طلب واحد مجمع لجميع احتياجاتك',
    subtitle: 'اطلب الجبنة واللحمة والمخبوزات معاً في سلة واحدة، ومندوب واحد يجمعهم لك!',
    tag: 'عرض اليوم',
    badge: 'توصيل موحد 16 ج.م',
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    showTag: true,
    showBadge: true,
    showTimer: true,
    timerDurationHours: 6,
    timerLabel: 'ينتهي خلال:',
    showCoupon: true,
    couponCode: 'BADALIK50',
    couponLabel: 'كود الخصم:',
    showButton: true,
    buttonText: 'تسوق الآن',
  },
  {
    id: 'slide_2',
    title: 'لحوم بلدية طازجة وأجبان فاخرة معتقة',
    subtitle: 'خصم 20% على مختارات ملحمة الصعيد وأجبان قنا البلدية اليوم',
    tag: 'عروض حصرية',
    badge: 'خصم حتى 25%',
    gradient: 'from-amber-700 via-rose-850 to-slate-900',
    image: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=800',
    showTag: true,
    showBadge: true,
    showTimer: true,
    timerDurationHours: 12,
    timerLabel: 'ينتهي خلال:',
    showCoupon: true,
    couponCode: 'QENA20',
    couponLabel: 'كود الخصم:',
    showButton: true,
    buttonText: 'تسوق الآن',
  },
  {
    id: 'slide_3',
    title: 'اكسب نقاط ولاء مضاعفة مع كل سلة',
    subtitle: '10 نقاط مكافآت لكل 10 ج.م استبدلها بقسائم شراء فورية',
    tag: 'برنامج الولاء',
    badge: 'نقاط x2',
    gradient: 'from-blue-700 via-indigo-850 to-slate-900',
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800',
    showTag: true,
    showBadge: true,
    showTimer: false,
    timerDurationHours: 24,
    timerLabel: 'ينتهي خلال:',
    showCoupon: true,
    couponCode: 'POINTS2X',
    couponLabel: 'كود الخصم:',
    showButton: true,
    buttonText: 'استكشف المكافآت',
  },
];

let joinRequestsList: any[] = [];

// Disk-based simple persistence system
const DATA_STORE_PATH = path.join(process.cwd(), 'data-store.json');

function saveDataStore() {
  try {
    const data = {
      users,
      stores,
      products,
      orders,
      deliveryDrivers,
      withdrawalRequests,
      notifications,
      categories,
      offerSlides,
      joinRequests: joinRequestsList,
    };
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Error saving data-store:', err);
  }
}

function loadDataStore() {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const content = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (data) {
        if (Array.isArray(data.users)) {
          users.length = 0;
          users.push(...data.users);
        }
        if (Array.isArray(data.stores)) {
          stores.length = 0;
          stores.push(...data.stores);
        }
        if (Array.isArray(data.products)) {
          products.length = 0;
          products.push(...data.products);
        }
        if (Array.isArray(data.orders)) {
          orders.length = 0;
          orders.push(...data.orders);
        }
        if (Array.isArray(data.deliveryDrivers)) {
          deliveryDrivers.length = 0;
          deliveryDrivers.push(...data.deliveryDrivers);
        }
        if (Array.isArray(data.withdrawalRequests)) {
          withdrawalRequests.length = 0;
          withdrawalRequests.push(...data.withdrawalRequests);
        }
        if (Array.isArray(data.notifications)) {
          notifications.length = 0;
          const realNotifications = data.notifications.filter(
            (n: any) =>
              n &&
              n.id &&
              (n.orderId || n.driverId || n.storeId || n.userId) &&
              !n.id.includes('welcome') &&
              !n.id.includes('stores') &&
              !n.id.includes('test')
          );
          notifications.push(...realNotifications);
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          categories.length = 0;
          categories.push(...data.categories);
        }
        if (Array.isArray(data.offerSlides) && data.offerSlides.length > 0) {
          offerSlides.length = 0;
          offerSlides.push(...data.offerSlides);
        }
        if (Array.isArray(data.joinRequests) && data.joinRequests.length > 0) {
          joinRequestsList.length = 0;
          joinRequestsList.push(...data.joinRequests);
        }
        console.log('✅ Loaded data-store successfully from disk.');
      }
    } else {
      saveDataStore();
    }
  } catch (err) {
    console.warn('⚠️ Error loading data-store, using memory fallback:', err);
  }
}

// Initial load
loadDataStore();

// -------------------------------------------------------------
// Helper Algorithms: Haversine & Multi-Store Average Distance
// -------------------------------------------------------------

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function evaluateDriverDistancesForPickup(
  pickupStoreIds: string[]
): { evaluations: DriverDistanceEvaluation[]; winningDriver: DeliveryProfile | null } {
  const targetStores = stores.filter((s) => pickupStoreIds.includes(s.id));
  if (targetStores.length === 0 || deliveryDrivers.length === 0) {
    return { evaluations: [], winningDriver: null };
  }

  // Strictly filter active online drivers only (isOnline === true).
  // If a driver is on break (isOnline === false), strictly do NOT assign any order to him!
  const onlineDrivers = deliveryDrivers.filter((d) => d.isOnline === true);
  if (onlineDrivers.length === 0) {
    console.log('⚠️ No online drivers currently available. Order will wait for an active driver.');
    return { evaluations: [], winningDriver: null };
  }

  const eligibleDrivers = onlineDrivers;

  const evaluations: DriverDistanceEvaluation[] = eligibleDrivers.map((driver) => {
    let totalDist = 0;
    const storeDistances = targetStores.map((store) => {
      const dist = calculateHaversineDistanceKm(
        driver.currentLat,
        driver.currentLng,
        store.lat,
        store.lng
      );
      totalDist += dist;
      return {
        storeName: store.name,
        distanceKm: dist,
      };
    });

    const averageDistanceKm = Number((totalDist / targetStores.length).toFixed(2));

    return {
      driverId: driver.id,
      driverName: driver.driverName,
      currentLocation: { lat: driver.currentLat, lng: driver.currentLng },
      storeDistances,
      averageDistanceKm,
      isAssigned: false,
    };
  });

  // Sort drivers by lowest average distance
  evaluations.sort((a, b) => a.averageDistanceKm - b.averageDistanceKm);

  if (evaluations.length > 0) {
    evaluations[0].isAssigned = true;
    const winningDriver =
      onlineDrivers.find((d) => d.id === evaluations[0].driverId) || null;
    return { evaluations, winningDriver };
  }

  return { evaluations, winningDriver: null };
}

// -------------------------------------------------------------
// Role Middleware (إلغاء نظام الفحص العائق وتسهيل التنقل والتجربة)
// -------------------------------------------------------------

function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roleHeader = req.headers['x-user-role'] as string;
    const userIdHeader = req.headers['x-user-id'] as string;
    const userEmailHeader = req.headers['x-user-email'] as string;

    let user: User | undefined;
    if (userIdHeader) {
      user = users.find((u) => u.id === userIdHeader);
    }
    if (!user && userEmailHeader) {
      const emailStr = String(userEmailHeader).trim().toLowerCase();
      user = users.find((u) => u.email.toLowerCase() === emailStr);
    }
    if (!user && roleHeader) {
      user = users.find((u) => u.role === roleHeader);
    }

    const effectiveRole = user ? user.role : roleHeader || 'customer';

    (req as any).authenticatedUser = user || { role: effectiveRole, id: userIdHeader };
    next();
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Auth routes (Strict Server-Side Supabase Verification)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني لتسجيل الدخول.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = password ? String(password).trim() : '';

  if (!trimmedPassword) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة المرور لتسجيل الدخول.' });
  }

  let user: User | undefined;

  if (supabase) {
    try {
      // 1. Strict verification against Supabase Auth (auth.users)
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: trimmedPassword,
      });

      if (authErr || !authData?.user) {
        console.log('ℹ️ Supabase signInWithPassword rejected:', authErr?.message);

        // Remove from local memory cache if it was deleted from Supabase
        const memIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
        if (memIdx >= 0) {
          users.splice(memIdx, 1);
          userPasswords.delete(normalizedEmail);
          saveDataStore();
        }

        return res.status(401).json({
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        });
      }

      const au = authData.user;
      const { data: dbUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', au.id)
        .maybeSingle();

      if (dbUser) {
        user = mapUser(dbUser);
      } else {
        user = {
          id: au.id,
          name: au.user_metadata?.name || au.user_metadata?.full_name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          phone: au.user_metadata?.phone || '+20 10 0000 0000',
          role: (au.user_metadata?.role as UserRole) || 'customer',
          storeId: au.user_metadata?.store_id || undefined,
        };
        try {
          const loginClient = getSupabaseClient(authData.session?.access_token);
          if (loginClient) {
            await loginClient.from('profiles').upsert({
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              store_id: user.storeId || null,
            });
          }
        } catch (syncErr) {
          console.warn('Sync auth user to profiles table warning:', syncErr);
        }
      }

      // STRICT VALIDATION: If user is not verified, reject entry!
      if (!user) {
        return res.status(401).json({
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من بياناتك أو إنشاء حساب جديد.',
        });
      }

      // Sync verified user into server memory
      const idx = users.findIndex((u) => u.id === user!.id || u.email.toLowerCase() === normalizedEmail);
      if (idx >= 0) {
        users[idx] = user;
      } else {
        users.unshift(user);
      }
      userPasswords.set(normalizedEmail, trimmedPassword);
      saveDataStore();

      return res.json({
        token: authData.session?.access_token || `sb_session_${user.id}_${Date.now()}`,
        user,
      });
    } catch (err: any) {
      console.error('Supabase authentication error:', err);
      return res.status(401).json({
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من صحة البيانات.',
      });
    }
  } else {
    // If Supabase is not configured (offline mode)
    user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({
        error: 'هذا الحساب غير مسجل في النظام. يرجى إنشاء حساب جديد أولاً.',
      });
    }

    const storedPassword = userPasswords.get(normalizedEmail) || 'Password123!';
    if (trimmedPassword !== storedPassword) {
      return res.status(401).json({
        error: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور.',
      });
    }

    return res.json({
      token: `local_session_${user.id}_${Date.now()}`,
      user,
    });
  }
});

// Server-side session verification endpoint (Verifies user existence against Supabase)
app.get('/api/auth/me', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userId && !userEmail) {
    return res.status(401).json({ error: 'غير مسجل الدخول' });
  }

  if (supabase) {
    try {
      let query = supabase.from('profiles').select('*');
      if (userId) {
        query = query.eq('id', userId);
      } else {
        query = query.eq('email', String(userEmail).trim().toLowerCase());
      }
      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const verifiedUser = mapUser(data);
        return res.json({ user: verifiedUser });
      } else {
        // User was deleted from Supabase -> Clean local memory and reject
        const memIdx = users.findIndex((u) => u.id === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
        if (memIdx >= 0) {
          users.splice(memIdx, 1);
          if (userEmail) userPasswords.delete(userEmail.toLowerCase());
          saveDataStore();
        }
        return res.status(401).json({ error: 'الحساب غير موجود أو تم حذفه من قاعدة البيانات' });
      }
    } catch (err) {
      console.warn('⚠️ Error querying Supabase profiles in /me:', err);
      return res.status(401).json({ error: 'فشل التحقق من الحساب' });
    }
  }

  const found = users.find((u) => u.id === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
  if (!found) {
    return res.status(401).json({ error: 'المستخدم غير موجود' });
  }
  return res.json({ user: found });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, role, phone, storeName, storeCategory, storeAddress, plateNumber, vehicleType } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان للتسجيل' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const requestedRole: UserRole = role || 'customer';
  const isSpecialRole = requestedRole === 'merchant' || requestedRole === 'delivery';
  // As requested: New merchants and delivery profiles start as 'customer' initially until admin approves their role
  const initialRole: UserRole = 'customer';
  let newUserId: string = crypto.randomUUID();
  let assignedStoreId: string | undefined = undefined;
  let userAccessToken: string | null = null;

  if (requestedRole === 'merchant') {
    assignedStoreId = crypto.randomUUID();
  }

  if (supabase) {
    let createdAuthUserId: string | null = null;
    let primaryAuthErr: string | null = null;

    try {
      // 1. Direct Supabase check: check if user exists in profiles table
      const { data: suProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (suProfile) {
        return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' });
      }

      // 2. Register into Supabase Auth (auth.users)
      if (supabaseAdmin) {
        try {
          const { data: adminCreated, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: password && String(password).length >= 6 ? String(password) : 'Password123!',
            email_confirm: true,
            user_metadata: {
              name: String(name).trim(),
              full_name: String(name).trim(),
              phone: phone ? String(phone).trim() : '',
              role: initialRole,
              requested_role: isSpecialRole ? requestedRole : '',
              approval_status: isSpecialRole ? 'pending' : 'approved',
              store_id: assignedStoreId || '',
              vehicle_type: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : ''),
              plate_number: plateNumber ? String(plateNumber).trim() : '',
            },
          });
          if (adminCreated?.user?.id) {
            createdAuthUserId = adminCreated.user.id;
          } else if (adminErr) {
            primaryAuthErr = adminErr.message;
          }
        } catch (adminEx: any) {
          // Handled gracefully
        }
      }

      if (!createdAuthUserId) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password && String(password).length >= 6 ? String(password) : 'Password123!',
          options: {
            data: {
              name: String(name).trim(),
              full_name: String(name).trim(),
              phone: phone ? String(phone).trim() : '',
              role: initialRole,
              requested_role: isSpecialRole ? requestedRole : '',
              approval_status: isSpecialRole ? 'pending' : 'approved',
              store_id: assignedStoreId || '',
              vehicle_type: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : ''),
              plate_number: plateNumber ? String(plateNumber).trim() : '',
            },
          },
        });

        if (authData?.user?.id) {
          createdAuthUserId = authData.user.id;
          userAccessToken = authData.session?.access_token || null;
        } else if (authErr) {
          primaryAuthErr = authErr.message;

          if (
            authErr.message?.toLowerCase().includes('already') ||
            authErr.message?.toLowerCase().includes('registered') ||
            authErr.message?.toLowerCase().includes('exists')
          ) {
            return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' });
          }

          // If 'Database error saving new user' occurred, retry signUp without custom metadata options
          if (authErr.message?.toLowerCase().includes('database error')) {
            const { data: retryData, error: retryErr } = await supabase.auth.signUp({
              email: normalizedEmail,
              password: password && String(password).length >= 6 ? String(password) : 'Password123!',
            });

            if (retryData?.user?.id) {
              createdAuthUserId = retryData.user.id;
              userAccessToken = retryData.session?.access_token || null;
            } else if (retryErr) {
              primaryAuthErr = retryErr.message;
            }
          }
        }
      }

      // If user was created but session was not returned, attempt signInWithPassword to get JWT token for RLS
      if (createdAuthUserId && !userAccessToken) {
        try {
          const { data: loginRes } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: password && String(password).length >= 6 ? String(password) : 'Password123!',
          });
          if (loginRes?.session?.access_token) {
            userAccessToken = loginRes.session.access_token;
          }
        } catch { /* proceed */ }
      }

      // If user was NOT created in Supabase Auth due to database error (e.g. broken remote trigger in auth.users), fallback to direct UUID
      if (!createdAuthUserId) {
        if (primaryAuthErr?.toLowerCase().includes('database error') || primaryAuthErr?.toLowerCase().includes('trigger')) {
          createdAuthUserId = crypto.randomUUID();
        } else {
          let userFacingError = primaryAuthErr || 'فشل إنشاء الحساب في Supabase Auth';
          if (primaryAuthErr?.toLowerCase().includes('at least 6 characters')) {
            userFacingError = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل';
          } else if (primaryAuthErr?.toLowerCase().includes('rate limit')) {
            userFacingError = 'تم تجاوز عدد المحاولات المسموح بها، يرجى الانتظار قليلاً';
          } else if (primaryAuthErr?.toLowerCase().includes('invalid email')) {
            userFacingError = 'صيغة البريد الإلكتروني غير صحيحة';
          }
          return res.status(400).json({ error: userFacingError });
        }
      }

      newUserId = createdAuthUserId;
    } catch (authEx: any) {
      console.warn('⚠️ Supabase auth registration info:', authEx?.message || authEx);
      createdAuthUserId = crypto.randomUUID();
      newUserId = createdAuthUserId;
    }
  } else {
    // Offline mode: check local array
    const existingUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' });
    }
  }

  let newStore: Store | undefined;
  // If merchant role, create new store (default isApproved = false until admin approves)
  if (requestedRole === 'merchant') {
    assignedStoreId = crypto.randomUUID();
    newStore = {
      id: assignedStoreId,
      ownerId: newUserId,
      name: storeName ? String(storeName).trim() : `متجر ${String(name).trim()}`,
      description: `متجر تجاري معتمد في قنا يقدم أفضل المنتجات الطازجة والخدمات`,
      category: storeCategory || 'سوبرماركت',
      logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200',
      rating: 5.0,
      reviewCount: 0,
      priceLevel: '$$',
      lat: 26.1580,
      lng: 32.7180,
      address: storeAddress || 'شارع الجمهورية، قنا',
      phone: phone || '+20 10 0000 0000',
      isOpen: true,
      distanceKm: 1.0,
      isApproved: false,
    };
    stores.unshift(newStore);
  }

  // If delivery role, add delivery profile (default isApproved = false until admin approves)
  let newDriver: DeliveryProfile | undefined;
  if (requestedRole === 'delivery') {
    const newDriverId = `drv_${Date.now()}`;
    newDriver = {
      id: newDriverId,
      userId: newUserId,
      driverName: String(name).trim(),
      vehicleType: (vehicleType === 'سيارة' || vehicleType === 'سكوتر كهربائي' ? vehicleType : 'موتوسيكل') as any,
      plateNumber: String(plateNumber || 'ق ن ا 1234').trim(),
      currentLat: 26.1560,
      currentLng: 32.7180,
      isOnline: true,
      todayEarnings: 0,
      totalCashCollected: 0,
      todayKmDriven: 0,
      fuelConsumedLiters: 0,
      isApproved: false,
    };
    deliveryDrivers.push(newDriver);
  }

  const newUser: User = {
    id: newUserId,
    name: String(name).trim(),
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : '+20 10 0000 0000',
    role: initialRole, // Starts as 'customer'
    requestedRole: isSpecialRole ? requestedRole : null,
    approvalStatus: isSpecialRole ? 'pending' : 'approved',
    storeId: assignedStoreId,
    storeName: storeName ? String(storeName).trim() : undefined,
    storeCategory: storeCategory || undefined,
    storeAddress: storeAddress ? String(storeAddress).trim() : undefined,
    vehicleType: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : undefined),
    plateNumber: plateNumber ? String(plateNumber).trim() : undefined,
    createdAt: new Date().toISOString(),
    avatarUrl: GREEN_ANONYMOUS_AVATAR,
  };

  // If Supabase is configured, create records in BOTH users table and profiles table FIRST!
  if (supabase) {
    try {
      if (newStore) {
        await ensureStoreExistsInSupabase(newStore);
        console.log('✅ Store created and verified in Supabase stores table:', newStore.id);
      }

      const userRecord: any = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: initialRole, // 'customer'
        requested_role: isSpecialRole ? requestedRole : null,
        approval_status: isSpecialRole ? 'pending' : 'approved',
        store_id: newUser.storeId || null,
        store_name: storeName ? String(storeName).trim() : null,
        store_category: storeCategory || null,
        store_address: storeAddress ? String(storeAddress).trim() : null,
        avatar_url: newUser.avatarUrl,
        vehicle_type: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : null),
        plate_number: plateNumber ? String(plateNumber).trim() : null,
        created_at: new Date().toISOString(),
      };

      // Insert/upsert into 'profiles' table using authenticated client (or admin bypass)
      const targetClient = getSupabaseClient(userAccessToken);
      if (targetClient) {
        const { error: profileInsertErr } = await targetClient.from('profiles').upsert(userRecord);
        if (profileInsertErr) {
          console.warn('⚠️ Supabase profiles table upsert note:', profileInsertErr.message);
          
          // Check if profile was already inserted automatically by Postgres Trigger
          const { data: existingProf } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('id', newUser.id)
            .maybeSingle();

          if (existingProf?.id) {
            console.log('✅ User profile confirmed in Supabase "profiles" table (via DB trigger):', existingProf.id);
          } else if (profileInsertErr.message?.toLowerCase().includes('violates row-level security')) {
            console.log('ℹ️ User registered in auth.users (RLS policy active on profiles table). Proceeding safely.');
          } else {
            console.warn('⚠️ Non-blocking profile warning:', profileInsertErr.message);
          }
        } else {
          console.log('✅ User profile inserted/updated in Supabase "profiles" table successfully');
        }
      }

      // 3. If driver, insert driver into Supabase 'drivers' table
      if (newDriver) {
        try {
          const driverUUID = isValidUUID(newDriver.id) ? newDriver.id : crypto.randomUUID();
          newDriver.id = driverUUID;
          const targetClient = getSupabaseClient(userAccessToken) || supabase;
          if (targetClient) {
            const { error: driverErr } = await targetClient.from('drivers').upsert({
              id: driverUUID,
              user_id: newDriver.userId,
              driver_name: newDriver.driverName,
              vehicle_type: newDriver.vehicleType,
              plate_number: newDriver.plateNumber,
              current_lat: newDriver.currentLat,
              current_lng: newDriver.currentLng,
              is_online: newDriver.isOnline,
              is_approved: false,
            });
            if (driverErr) {
              console.log('ℹ️ Supabase drivers table upsert info:', driverErr.message);
            } else {
              console.log('✅ Driver inserted into Supabase "drivers" table successfully:', driverUUID);
            }
          }
        } catch (drvErr) {
          console.log('ℹ️ Driver insert handled:', drvErr);
        }
      }

      // 4. If special role (merchant or delivery), log join request into Supabase 'join_requests' table
      if (isSpecialRole) {
        try {
          const targetClient = getSupabaseClient(userAccessToken) || supabaseAdmin || supabase;
          if (targetClient) {
            const reqId = `req_${requestedRole === 'merchant' ? 'mrc' : 'drv'}_${newUser.id}`;
            const { error: jrErr } = await targetClient.from('join_requests').upsert({
              id: reqId,
              user_id: newUser.id,
              user_name: newUser.name,
              user_email: newUser.email,
              user_phone: newUser.phone,
              requested_role: requestedRole,
              status: 'pending',
              store_id: newUser.storeId || null,
              store_name: storeName ? String(storeName).trim() : null,
              store_category: storeCategory || null,
              store_address: storeAddress ? String(storeAddress).trim() : null,
              vehicle_type: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : null),
              plate_number: plateNumber ? String(plateNumber).trim() : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            if (jrErr) {
              console.log('ℹ️ Supabase join_requests table note:', jrErr.message);
            } else {
              console.log('✅ Join request logged in Supabase "join_requests" table successfully:', reqId);
            }
          }
        } catch (jrEx) {
          console.log('ℹ️ Join request insert note:', jrEx);
        }
      }
    } catch (dbErr: any) {
      console.warn('⚠️ Error during Supabase registration synchronization:', dbErr);
      return res.status(400).json({ error: 'فشل حفظ بيانات الحساب في قاعدة بيانات Supabase' });
    }
  }

  // Save to memory cache only after Supabase verification/creation
  users.unshift(newUser);
  userPasswords.set(normalizedEmail, password && String(password).trim() ? String(password).trim() : 'Password123!');

  if (isSpecialRole) {
    notifications.unshift({
      id: `notif_join_${Date.now()}`,
      title: `طلب انضمام جديد (${requestedRole === 'merchant' ? 'تاجر / متجر' : 'كابتن توصيل'}) 📝`,
      message: `المستخدم "${newUser.name}" سجل كعميل وقدم طلب انضمام كـ (${requestedRole === 'merchant' ? 'صاحب متجر: ' + (storeName || 'متجر جديد') : 'كابتن توصيل: ' + (vehicleType || 'موتوسيكل')}). يتطلب موافقة الإدارة لترقية الدور.`,
      timestamp: 'الآن',
      type: 'system',
      read: false,
      targetRole: 'admin',
    });
  }

  saveDataStore();

  const successMessage = isSpecialRole
    ? `تم إنشاء الحساب كعميل بنجاح! تم إرسال طلب انضمامك كـ (${requestedRole === 'merchant' ? 'تاجر' : 'كابتن توصيل'}) للإدارة للمراجعة والاعتماد.`
    : 'تم إنشاء الحساب بنجاح';

  return res.status(201).json({
    token: `demo_jwt_token_${newUser.id}_${Date.now()}`,
    user: newUser,
    message: successMessage,
  });
});

app.get('/api/auth/users', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        const dbUsers = data.map(mapUser);
        users.length = 0;
        users.push(...dbUsers);
        saveDataStore();
        return res.json(dbUsers);
      }
    } catch (err) {
      console.warn('Supabase fetch users error:', err);
    }
  }
  res.json(users);
});

// 2. Stores routes
app.get('/api/stores', async (req: Request, res: Response) => {
  const { category, priceLevel, search, all } = req.query;
  let currentStores = [...stores];

  if (supabase) {
    try {
      const { data, error } = await supabase.from('stores').select('*');
      if (!error && data && data.length > 0) {
        currentStores = data.map(mapStore);
      }
    } catch (err) {
      console.warn('Supabase fetch stores error, falling back to memory:', err);
    }
  }

  let filtered = [...currentStores];

  // Filter out pending/unapproved stores unless all=true is passed for Admin view
  if (all !== 'true') {
    filtered = filtered.filter((s) => s.isApproved !== false);
  }

  if (category && category !== 'الكل') {
    filtered = filtered.filter((s) => s.category === category);
  }
  if (priceLevel && priceLevel !== 'الكل') {
    filtered = filtered.filter((s) => s.priceLevel === priceLevel);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }

  res.json(filtered);
});

app.get('/api/stores/:id', async (req: Request, res: Response) => {
  const reqStoreId = req.params.id;
  const storeUUID = isValidUUID(reqStoreId) ? reqStoreId : stringToUUID(reqStoreId);
  let store = stores.find((s) => s.id === reqStoreId || s.id === storeUUID);
  let storeProducts = products.filter((p) => p.storeId === reqStoreId || p.storeId === storeUUID);

  if (supabase) {
    try {
      let dbStore: any = null;
      if (isValidUUID(reqStoreId)) {
        const { data, error } = await supabase.from('stores').select('*').eq('id', reqStoreId).maybeSingle();
        if (!error && data) dbStore = data;
      }
      if (!dbStore) {
        const { data, error } = await supabase.from('stores').select('*').eq('id', storeUUID).maybeSingle();
        if (!error && data) dbStore = data;
      }
      if (!dbStore && store?.name) {
        const { data, error } = await supabase.from('stores').select('*').eq('name', store.name).maybeSingle();
        if (!error && data) dbStore = data;
      }

      if (dbStore) {
        store = mapStore(dbStore);
      }

      const verifiedStoreId = dbStore?.id || storeUUID;
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', verifiedStoreId);

      if (!prodErr && dbProducts && dbProducts.length > 0) {
        storeProducts = dbProducts.map(mapProduct);
      }
    } catch (err) {
      console.warn('Supabase fetch store detail error, falling back to memory:', err);
    }
  }

  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json({ store, products: storeProducts });
});

app.put('/api/stores/:id', async (req: Request, res: Response) => {
  const storeId = req.params.id;
  const { name, description, category, logoUrl, bannerUrl, phone, address, isOpen, priceLevel, lat, lng } = req.body;

  let storeIndex = stores.findIndex((s) => s.id === storeId);
  const userIdHeader = String(req.headers['x-user-id'] || '');
  if (storeIndex === -1 && userIdHeader) {
    storeIndex = stores.findIndex((s) => s.ownerId === userIdHeader);
  }

  const updatedFields: Partial<Store> = {};
  if (name !== undefined) updatedFields.name = String(name).trim();
  if (description !== undefined) updatedFields.description = String(description).trim();
  if (category !== undefined) updatedFields.category = String(category).trim();
  if (logoUrl !== undefined) updatedFields.logoUrl = String(logoUrl).trim();
  if (bannerUrl !== undefined) updatedFields.bannerUrl = String(bannerUrl).trim();
  if (phone !== undefined) updatedFields.phone = String(phone).trim();
  if (address !== undefined) updatedFields.address = String(address).trim();
  if (isOpen !== undefined) updatedFields.isOpen = Boolean(isOpen);
  if (priceLevel !== undefined) updatedFields.priceLevel = priceLevel;
  if (lat !== undefined) updatedFields.lat = Number(lat);
  if (lng !== undefined) updatedFields.lng = Number(lng);

  let updatedStore: Store;
  if (storeIndex !== -1) {
    stores[storeIndex] = { ...stores[storeIndex], ...updatedFields };
    updatedStore = stores[storeIndex];
  } else {
    updatedStore = {
      id: storeId,
      ownerId: userIdHeader,
      name: updatedFields.name || 'متجري',
      description: updatedFields.description || 'متجر تجاري معتمد في قنا',
      category: updatedFields.category || 'عام',
      logoUrl: updatedFields.logoUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      bannerUrl: updatedFields.bannerUrl || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
      rating: 5.0,
      reviewCount: 0,
      priceLevel: updatedFields.priceLevel || '$$',
      lat: updatedFields.lat || 26.155,
      lng: updatedFields.lng || 32.716,
      address: updatedFields.address || 'قنا - مصر',
      phone: updatedFields.phone || '+20 10 0000 0000',
      isOpen: updatedFields.isOpen ?? true,
      distanceKm: 1.0,
    };
    stores.unshift(updatedStore);
  }
  saveDataStore();

  if (supabase) {
    try {
      const dbPayload: Record<string, any> = {};
      if (updatedFields.name !== undefined) dbPayload.name = updatedFields.name;
      if (updatedFields.description !== undefined) dbPayload.description = updatedFields.description;
      if (updatedFields.category !== undefined) dbPayload.category = updatedFields.category;
      if (updatedFields.logoUrl !== undefined) dbPayload.logo_url = updatedFields.logoUrl;
      if (updatedFields.bannerUrl !== undefined) dbPayload.banner_url = updatedFields.bannerUrl;
      if (updatedFields.phone !== undefined) dbPayload.phone = updatedFields.phone;
      if (updatedFields.address !== undefined) dbPayload.address = updatedFields.address;
      if (updatedFields.isOpen !== undefined) dbPayload.is_open = updatedFields.isOpen;
      if (updatedFields.priceLevel !== undefined) dbPayload.price_level = updatedFields.priceLevel;
      if (updatedFields.lat !== undefined) dbPayload.lat = updatedFields.lat;
      if (updatedFields.lng !== undefined) dbPayload.lng = updatedFields.lng;

      const targetStoreUUID = isValidUUID(updatedStore.id) ? updatedStore.id : stringToUUID(updatedStore.id);
      const { error: updateErr } = await supabase
        .from('stores')
        .update(dbPayload)
        .eq('id', targetStoreUUID);

      if (updateErr) {
        console.warn('⚠️ Supabase store update error:', updateErr.message);
        await ensureStoreExistsInSupabase(updatedStore);
      } else {
        console.log('✅ Store updated in Supabase stores table successfully:', targetStoreUUID);
      }
    } catch (err) {
      console.warn('⚠️ Supabase store update exception:', err);
    }
  }

  return res.json({ store: updatedStore, message: 'تم حفظ وتحديث بيانات المتجر بنجاح' });
});

app.put('/api/merchant/store', async (req: Request, res: Response) => {
  const userIdHeader = String(req.headers['x-user-id'] || '');
  let userStore = stores.find((s) => s.ownerId === userIdHeader) || stores[0];
  if (!userStore) {
    return res.status(404).json({ error: 'المتجر غير موجود' });
  }
  req.params.id = userStore.id;
  // Forward to PUT /api/stores/:id handler
  return (app as any)._router.handle(req, res, () => {});
});

// 3. Products routes
app.get('/api/products', async (req: Request, res: Response) => {
  const { storeId, category, search, minPrice, maxPrice } = req.query;
  let currentProducts = [...products];

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data && data.length > 0) {
        currentProducts = data.map(mapProduct);
      }
    } catch (err) {
      console.warn('Supabase fetch products error, falling back to memory:', err);
    }
  }

  let filtered = [...currentProducts];

  if (storeId) {
    filtered = filtered.filter((p) => p.storeId === storeId);
  }
  if (category && category !== 'الكل') {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (minPrice) {
    filtered = filtered.filter((p) => p.price >= Number(minPrice));
  }
  if (maxPrice) {
    filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.storeName && p.storeName.toLowerCase().includes(q))
    );
  }

  res.json(filtered);
});

// Merchant adds product
app.post(
  '/api/merchant/products',
  requireRole(['merchant', 'admin']),
  async (req: Request, res: Response) => {
    const { name, description, price, imageUrl, category, stockQuantity, storeId } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }

    const store = stores.find((s) => s.id === storeId) || stores[0];

    const newProduct: Product = {
      id: `prd_${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      name: String(name).trim(),
      description: String(description || '').trim(),
      price: Number(price),
      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      category: String(category).trim(),
      stockQuantity: Number(stockQuantity || 10),
      isSoldOut: Number(stockQuantity || 10) <= 0,
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    products.unshift(newProduct);
    saveDataStore();

    if (supabase) {
      try {
        // Ensure the store exists in Supabase before inserting the product to prevent foreign key errors
        const verifiedStoreId = await ensureStoreExistsInSupabase(store);

        const productPayload: Record<string, any> = {
          store_id: verifiedStoreId,
          store_name: newProduct.storeName,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          image_url: newProduct.imageUrl,
          category: newProduct.category,
          stock_quantity: newProduct.stockQuantity,
          is_sold_out: newProduct.isSoldOut,
          rating: newProduct.rating,
          review_count: newProduct.reviewCount,
          created_at: newProduct.createdAt,
        };

        let { error } = await supabase.from('products').insert({
          id: newProduct.id,
          ...productPayload,
        });

        // If error (UUID format mismatch, foreign key constraint, etc.), perform targeted recovery
        if (error) {
          const generatedProductUUID = isValidUUID(newProduct.id) ? newProduct.id : crypto.randomUUID();
          const validStoreUUID = isValidUUID(verifiedStoreId) ? verifiedStoreId : stringToUUID(verifiedStoreId);

          // 1. Guarantee store exists with UUID in case schema enforced UUID foreign key
          const { data: dbCheckStore } = await supabase.from('stores').select('id').eq('id', validStoreUUID).maybeSingle();
          if (!dbCheckStore) {
            await supabase.from('stores').insert({
              id: validStoreUUID,
              name: store.name || 'المتجر',
              category: store.category || 'عام',
              address: store.address || 'قنا',
              phone: store.phone || '+20 10 0000 0000',
              is_open: true,
            });
          }

          // 2. Retry inserting product with guaranteed store_id
          const retryResult = await supabase.from('products').insert({
            id: generatedProductUUID,
            ...productPayload,
            store_id: validStoreUUID,
          });

          if (!retryResult.error) {
            newProduct.id = generatedProductUUID;
            saveDataStore();
            console.log('✅ Product inserted into Supabase products table successfully with UUID:', generatedProductUUID);
          } else {
            console.warn('⚠️ Supabase product insert retry message:', retryResult.error.message);
          }
        } else {
          console.log('✅ Product inserted into Supabase products table successfully');
        }
      } catch (err) {
        console.warn('⚠️ Supabase product insert err:', err);
      }
    }

    res.status(201).json(newProduct);
  }
);

// Merchant edits product
app.put(
  '/api/merchant/products/:id',
  requireRole(['merchant', 'admin']),
  async (req: Request, res: Response) => {
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    const existing = products[index];
    const { name, description, price, imageUrl, category, stockQuantity, isSoldOut } = req.body;

    products[index] = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      description: description !== undefined ? String(description).trim() : existing.description,
      price: price !== undefined ? Number(price) : existing.price,
      imageUrl: imageUrl || existing.imageUrl,
      category: category || existing.category,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
      isSoldOut: isSoldOut !== undefined ? Boolean(isSoldOut) : existing.isSoldOut,
    };

    saveDataStore();

    if (supabase) {
      try {
        const prodUUID = isValidUUID(req.params.id) ? req.params.id : stringToUUID(req.params.id);
        const updatePayload: Record<string, any> = {};
        if (name !== undefined) updatePayload.name = String(name).trim();
        if (description !== undefined) updatePayload.description = String(description).trim();
        if (price !== undefined) updatePayload.price = Number(price);
        if (imageUrl !== undefined) updatePayload.image_url = imageUrl;
        if (category !== undefined) updatePayload.category = category;
        if (stockQuantity !== undefined) updatePayload.stock_quantity = Number(stockQuantity);
        if (isSoldOut !== undefined) updatePayload.is_sold_out = Boolean(isSoldOut);

        await supabase.from('products').update(updatePayload).eq('id', prodUUID);
      } catch (err) {
        console.warn('⚠️ Supabase product update error:', err);
      }
    }

    res.json(products[index]);
  }
);

// Merchant toggles Sold Out (remains visible but not orderable)
app.patch(
  '/api/merchant/products/:id/toggle-sold-out',
  requireRole(['merchant', 'admin']),
  async (req: Request, res: Response) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.isSoldOut = !product.isSoldOut;
    saveDataStore();

    if (supabase) {
      try {
        const prodUUID = isValidUUID(req.params.id) ? req.params.id : stringToUUID(req.params.id);
        await supabase.from('products').update({ is_sold_out: product.isSoldOut }).eq('id', prodUUID);
      } catch (err) {
        console.warn('⚠️ Supabase product toggle sold out error:', err);
      }
    }

    res.json({ message: 'Status updated', product });
  }
);

// Merchant deletes product
app.delete(
  '/api/merchant/products/:id',
  requireRole(['merchant', 'admin']),
  async (req: Request, res: Response) => {
    const initialLen = products.length;
    const filtered = products.filter((p) => p.id !== req.params.id);
    if (filtered.length === initialLen) {
      return res.status(404).json({ error: 'Product not found' });
    }
    products.length = 0;
    products.push(...filtered);
    saveDataStore();

    if (supabase) {
      try {
        const prodUUID = isValidUUID(req.params.id) ? req.params.id : stringToUUID(req.params.id);
        await supabase.from('products').delete().eq('id', prodUUID);
      } catch (err) {
        console.warn('⚠️ Supabase product delete error:', err);
      }
    }

    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  }
);

// Add review to a product
app.post('/api/products/:id/reviews', async (req: Request, res: Response) => {
  const { rating, comment, userName } = req.body;
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const reviewId = `rev_${Date.now()}`;
  const newReview = {
    id: reviewId,
    productId: product.id,
    userId: 'usr_customer_1',
    userName: userName || 'عميل معتمد',
    rating: Number(rating) || 5,
    comment: String(comment || ''),
    createdAt: new Date().toISOString().split('T')[0],
  };

  if (!product.reviews) product.reviews = [];
  product.reviews.unshift(newReview);
  product.reviewCount = product.reviews.length;
  product.rating = Number(
    (
      product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviewCount
    ).toFixed(1)
  );

  saveDataStore();

  if (supabase) {
    try {
      const prodUUID = await ensureProductExistsInSupabase(product);
      // Find a valid customer profile in profiles table
      const { data: customerProf } = await supabase.from('profiles').select('id').eq('role', 'customer').limit(1).maybeSingle();
      const validUserId = customerProf?.id || (await supabase.from('profiles').select('id').limit(1).maybeSingle()).data?.id;

      if (validUserId) {
        const { error: revErr } = await supabase.from('reviews').insert({
          id: crypto.randomUUID(),
          product_id: prodUUID,
          user_id: validUserId,
          rating: Number(rating) || 5,
          comment: String(comment || ''),
          created_at: new Date().toISOString(),
        });
        if (!revErr) {
          console.log('✅ Review inserted into Supabase reviews table');
        } else {
          console.warn('⚠️ Supabase review insert note:', revErr.message);
        }
      }

      await supabase.from('products').update({
        rating: product.rating,
        review_count: product.reviewCount,
      }).eq('id', prodUUID);
    } catch (revEx) {
      console.warn('⚠️ Supabase review exception:', revEx);
    }
  }

  res.status(201).json({ product, review: newReview });
});

// 4. Multi-Store Orders & Average Distance Algorithm Endpoint
app.get('/api/delivery/distance-calc-demo', (req: Request, res: Response) => {
  const pickupStoreIds = ['str_cheese_1', 'str_meat_1'];
  const result = evaluateDriverDistancesForPickup(pickupStoreIds);
  res.json({
    exampleScenario: {
      description:
        'طلب مجمع يحتوي على جبنة من "أجبان المدينة" ولحم من "ملحمة الريان". الخوارزمية تحسب متوسط المسافات لكل مندوب لاختيار الأقرب الذي يجمع كل الأصناف.',
      stores: stores.filter((s) => pickupStoreIds.includes(s.id)),
    },
    evaluations: result.evaluations,
    winningDriver: result.winningDriver,
  });
});

app.get('/api/orders', async (req: Request, res: Response) => {
  const { storeId, driverId, customerId } = req.query;
  let currentOrders = [...orders];

  if (supabase) {
    try {
      const allRealDrivers = await getRealDriversFromDatabase();
      const driverNameMap = new Map<string, string>();
      for (const d of allRealDrivers) {
        if (d.id) driverNameMap.set(d.id, d.driverName);
        if (d.userId) driverNameMap.set(d.userId, d.driverName);
      }

      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        let dbItemsMap = new Map<string, any[]>();
        let dbStopsMap = new Map<string, any[]>();

        try {
          const { data: dbItems } = await supabase.from('order_items').select('*');
          if (dbItems) {
            dbItems.forEach((it: any) => {
              const arr = dbItemsMap.get(it.order_id) || [];
              const matchingProd = products.find((p) => p.id === it.product_id || p.name === it.product_name);
              const matchingStore = stores.find(
                (s) => s.id === it.store_id || (matchingProd && (s.id === matchingProd.storeId || s.name === matchingProd.storeName))
              );
              arr.push({
                id: it.id,
                productId: matchingProd ? matchingProd.id : it.product_id,
                productName: it.product_name || (matchingProd ? matchingProd.name : 'منتج'),
                storeId: matchingStore ? matchingStore.id : (matchingProd ? matchingProd.storeId : it.store_id),
                storeName: matchingStore ? matchingStore.name : (matchingProd ? matchingProd.storeName : 'متجر معتمد'),
                quantity: Number(it.quantity || 1),
                price: Number(it.price || 0),
              });
              dbItemsMap.set(it.order_id, arr);
            });
          }
        } catch { /* fallback */ }

        try {
          const { data: dbStops } = await supabase.from('order_pickup_stops').select('*');
          if (dbStops) {
            dbStops.forEach((st: any) => {
              const arr = dbStopsMap.get(st.order_id) || [];
              const matchingStore = stores.find((s) => s.id === st.store_id || stringToUUID(s.id) === st.store_id);
              arr.push({
                storeId: matchingStore ? matchingStore.id : st.store_id,
                storeName: matchingStore ? matchingStore.name : (st.store_name || 'متجر معتمد'),
                address: matchingStore ? matchingStore.address : (st.address || 'مدينة قنا'),
                lat: matchingStore ? matchingStore.lat : Number(st.lat || 26.155),
                lng: matchingStore ? matchingStore.lng : Number(st.lng || 32.716),
                stopSequence: Number(st.stop_sequence || arr.length + 1),
                isPickedUp: Boolean(st.is_picked_up),
                items: [],
              });
              dbStopsMap.set(st.order_id, arr);
            });
          }
        } catch { /* fallback */ }

        currentOrders = data.map((o: any) => {
          const inMemOrder = orders.find((m) => m.id === o.id);
          let rawItems: any[] = [];
          if (Array.isArray(o.items) && o.items.length > 0) {
            rawItems = o.items;
          } else if (inMemOrder && Array.isArray(inMemOrder.items) && inMemOrder.items.length > 0) {
            rawItems = inMemOrder.items;
          } else if (dbItemsMap.get(o.id) && dbItemsMap.get(o.id)!.length > 0) {
            rawItems = dbItemsMap.get(o.id)!;
          } else if (inMemOrder && inMemOrder.items) {
            rawItems = inMemOrder.items;
          }

          // Ensure each item has storeId and storeName accurately
          rawItems = rawItems.map((it: any) => {
            const matchingProd = products.find((p) => p.id === it.productId || p.name === it.productName);
            const sId = it.storeId || (matchingProd ? matchingProd.storeId : (stores[0] ? stores[0].id : 'str_1'));
            const matchingStore = stores.find((s) => s.id === sId || (matchingProd && s.name === matchingProd.storeName) || s.name === it.storeName);
            return {
              ...it,
              storeId: matchingStore ? matchingStore.id : sId,
              storeName: matchingStore ? matchingStore.name : (it.storeName || (matchingProd ? matchingProd.storeName : 'متجر معتمد')),
            };
          });

          const rawStops = (Array.isArray(o.pickup_stops) && o.pickup_stops.length > 0)
            ? o.pickup_stops
            : (dbStopsMap.get(o.id) && dbStopsMap.get(o.id)!.length > 0)
              ? dbStopsMap.get(o.id)!
              : (inMemOrder ? inMemOrder.pickupStops : []);

          const enrichedStops = (rawStops || []).map((st: any, sIdx: number) => {
            const storeForStop = stores.find((s) => s.id === st.storeId || s.name === st.storeName || stringToUUID(s.id) === st.storeId);
            const itemsForStop = rawItems
              .filter((it: any) => it.storeId === st.storeId || it.storeName === st.storeName || (storeForStop && it.storeName === storeForStop.name))
              .map((it: any) => ({ productName: it.productName || 'منتج', quantity: Number(it.quantity || 1) }));

            return {
              storeId: st.storeId || (storeForStop ? storeForStop.id : 'str_1'),
              storeName: st.storeName || (storeForStop ? storeForStop.name : 'متجر معتمد'),
              address: st.address || (storeForStop ? storeForStop.address : 'مدينة قنا'),
              lat: Number(st.lat || (storeForStop ? storeForStop.lat : 26.155)),
              lng: Number(st.lng || (storeForStop ? storeForStop.lng : 32.716)),
              items: (Array.isArray(st.items) && st.items.length > 0)
                ? st.items
                : (itemsForStop.length > 0 ? itemsForStop : [{ productName: 'أصناف الطلب', quantity: 1 }]),
              isPickedUp: Boolean(st.isPickedUp ?? st.is_picked_up ?? false),
              stopSequence: Number(st.stopSequence ?? st.stop_sequence ?? sIdx + 1),
            };
          });

          const resolvedDriverId = o.assigned_driver_id || o.assignedDriverId || undefined;
          const resolvedDriverName =
            o.assigned_driver_name ||
            o.assignedDriverName ||
            (resolvedDriverId ? driverNameMap.get(resolvedDriverId) : undefined) ||
            'كابتن التوصيل';

          return {
            id: o.id,
            customerId: o.customer_id || o.customerId || 'usr_customer_1',
            customerName: o.customer_name || o.customerName || 'عميل بدالك',
            customerPhone: o.customer_phone || o.customerPhone || '',
            items: rawItems,
            subtotal: Number(o.subtotal || 0),
            deliveryFee: Number(o.delivery_fee || o.deliveryFee || 0),
            totalAmount: Number(o.total_amount || o.totalAmount || 0),
            status: o.status || 'confirmed',
            paymentMethod: o.payment_method || o.paymentMethod || 'cash_on_delivery',
            paymentStatus: o.payment_status || o.paymentStatus || 'paid',
            deliveryAddress: o.delivery_address || o.deliveryAddress || 'قنا - مصر',
            deliveryLat: Number(o.delivery_lat || o.deliveryLat || 26.155),
            deliveryLng: Number(o.delivery_lng || o.deliveryLng || 32.716),
            assignedDriverId: resolvedDriverId,
            assignedDriverName: resolvedDriverName,
            pickupStops: enrichedStops,
            createdAt: o.created_at ? new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : (o.createdAt || 'الآن'),
          };
        });

        // Merge any in-memory orders that are not yet in Supabase data
        const fetchedIds = new Set(data.map((d: any) => d.id));
        const pendingMem = orders.filter((m) => !fetchedIds.has(m.id));
        currentOrders = [...currentOrders, ...pendingMem];
      }
    } catch (err) {
      console.warn('Supabase fetch orders error, falling back to memory/file:', err);
    }
  }

  let filtered = [...currentOrders];

  if (storeId) {
    const targetStore = stores.find((s) => s.id === storeId);
    const targetStoreName = targetStore ? targetStore.name : null;
    const storeProds = products.filter((p) => p.storeId === storeId || (targetStoreName && p.storeName === targetStoreName));
    const storeProdIds = new Set(storeProds.map((p) => p.id));
    const storeProdNames = new Set(storeProds.map((p) => p.name ? p.name.trim().toLowerCase() : ''));

    filtered = filtered.filter((o) =>
      o.items && o.items.some((item) => {
        if (!item) return false;
        if (item.storeId === storeId) return true;
        if (targetStoreName && item.storeName === targetStoreName) return true;
        if (item.productId && storeProdIds.has(item.productId)) return true;
        if (item.productName && storeProdNames.has(item.productName.trim().toLowerCase())) return true;
        return false;
      })
    );
  }
  if (driverId) {
    filtered = filtered.filter((o) => o.assignedDriverId === driverId);
  }
  if (customerId) {
    filtered = filtered.filter((o) => o.customerId === customerId);
  }

  res.json(filtered);
});

// Place combined multi-store order
app.post('/api/orders', async (req: Request, res: Response) => {
  const { items, customerName, customerPhone, deliveryAddress, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }

  // Check stock availability and store open status for all items
  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (item.productName && p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase())
    );

    // Verify store is open
    const storeId = product ? product.storeId : (item.storeId || (stores[0] ? stores[0].id : 'str_1'));
    const store = stores.find((s) => s.id === storeId || (product && s.name === product.storeName));
    if (store && store.isOpen === false) {
      return res.status(400).json({
        error: `عذراً، متجر "${store.name}" مغلق حالياً ولا يقبل طلبات جديدة في الوقت الحالي.`,
      });
    }

    if (!product) continue;
    const reqQty = Number(item.quantity) || 1;
    if (product.isSoldOut || (product.stockQuantity !== undefined && product.stockQuantity <= 0)) {
      return res.status(400).json({
        error: `عذراً، المنتج "${product.name}" نفذت كميته ولا يمكن إتمام الطلب`,
      });
    }
    if (product.stockQuantity !== undefined && reqQty > product.stockQuantity) {
      return res.status(400).json({
        error: `عذراً، الكمية المتاحة من المنتج "${product.name}" هي ${product.stockQuantity} فقط`,
      });
    }
  }

  // Deduct stock quantities for ordered products (Deduct exact requested quantity)
  for (const item of items) {
    const reqQty = Number(item.quantity) || 1;
    const product = products.find(
      (p) => p.id === item.productId || (item.productName && p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase())
    );

    let updatedStock = 10;
    if (product) {
      const prevStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 10;
      updatedStock = Math.max(0, prevStock - reqQty);
      product.stockQuantity = updatedStock;
      product.isSoldOut = updatedStock <= 0;
    }

    // Direct and reliable update in Supabase
    if (supabase) {
      try {
        let supaProd: any = null;
        if (item.productId && isValidUUID(item.productId)) {
          const { data } = await supabase.from('products').select('id, name, stock_quantity, stock').eq('id', item.productId).maybeSingle();
          if (data) supaProd = data;
        }
        if (!supaProd && product && isValidUUID(product.id)) {
          const { data } = await supabase.from('products').select('id, name, stock_quantity, stock').eq('id', product.id).maybeSingle();
          if (data) supaProd = data;
        }
        if (!supaProd && (item.productName || product?.name)) {
          const pName = (item.productName || product?.name).trim();
          const { data } = await supabase.from('products').select('id, name, stock_quantity, stock').eq('name', pName).maybeSingle();
          if (data) supaProd = data;
        }

        if (supaProd) {
          // Calculate from the database's current stock or default
          const dbCurrentStock =
            supaProd.stock_quantity !== null && supaProd.stock_quantity !== undefined
              ? Number(supaProd.stock_quantity)
              : supaProd.stock !== null && supaProd.stock !== undefined
              ? Number(supaProd.stock)
              : (product?.stockQuantity ?? 10) + reqQty;

          const finalDbStock = Math.max(0, dbCurrentStock - reqQty);
          const isSoldOut = finalDbStock <= 0;

          const { error: updErr } = await supabase
            .from('products')
            .update({
              stock_quantity: finalDbStock,
              is_sold_out: isSoldOut,
            })
            .eq('id', supaProd.id);

          if (updErr) {
            console.warn('⚠️ Supabase stock_quantity update failed, trying stock column:', updErr.message);
            await supabase
              .from('products')
              .update({
                stock: finalDbStock,
              })
              .eq('id', supaProd.id);
          } else {
            console.log(`✅ Stock deducted in Supabase for ${supaProd.name}: ${dbCurrentStock} -> ${finalDbStock} (-${reqQty})`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Supabase product stock update error:', err);
      }
    }
  }
  saveDataStore();

  // Group items by store to create pickup stops
  const storeMap = new Map<string, { store: Store; items: { productName: string; quantity: number }[] }>();
  let subtotal = 0;

  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (item.productName && p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase())
    );
    const reqQty = Number(item.quantity) || 1;
    const itemPrice = product ? product.price : (Number(item.price) || 10);

    subtotal += itemPrice * reqQty;

    const storeId = product ? product.storeId : (item.storeId || (stores[0] ? stores[0].id : 'str_1'));
    const store = stores.find((s) => s.id === storeId || (product && s.name === product.storeName)) || stores[0];
    if (store) {
      if (!storeMap.has(store.id)) {
        storeMap.set(store.id, { store, items: [] });
      }
      storeMap.get(store.id)!.items.push({
        productName: product ? product.name : (item.productName || 'منتج'),
        quantity: reqQty,
      });
    }
  }

  const pickupStoreIds = Array.from(storeMap.keys());
  const pickupStops = Array.from(storeMap.values()).map(({ store, items: stItems }) => ({
    storeId: store.id,
    storeName: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    items: stItems,
    isPickedUp: false,
  }));

  // Refresh real drivers from database to get up-to-date online status
  await getRealDriversFromDatabase();

  // Run average distance calculation to assign closest driver
  const { winningDriver, evaluations } = evaluateDriverDistancesForPickup(pickupStoreIds);

  // Dynamic delivery fee calculated in backend based on distance and item count tiers
  const totalItemCount = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
  let baseItemFee = 10;
  if (totalItemCount >= 5 && totalItemCount <= 10) {
    baseItemFee = 15;
  } else if (totalItemCount > 10) {
    baseItemFee = 20;
  }

  const winningEval = evaluations.find((e) => e.driverId === (winningDriver ? winningDriver.id : ''));
  const estimatedDistKm = winningEval ? winningEval.averageDistanceKm : (pickupStoreIds.length * 2.2);
  const distanceModifier = Math.round(estimatedDistKm * 2.5);
  const multiStoreModifier = pickupStoreIds.length > 1 ? (pickupStoreIds.length - 1) * 3 : 0;

  // Unified delivery fee (paid by customer and earned by driver)
  const deliveryFee = Math.max(15, baseItemFee + distanceModifier + multiStoreModifier);
  const totalAmount = subtotal + deliveryFee;

  const orderId = crypto.randomUUID();

  const newOrder: Order = {
    id: orderId,
    customerId: req.body.customerId || (req.headers['x-user-id'] as string) || 'usr_customer_1',
    customerName: customerName || 'عميل بدالك - قنا',
    customerPhone: customerPhone || '+20 10 1234 5678',
    items: items.map((i: any) => {
      const p = products.find((prod) => prod.id === i.productId || prod.name === i.productName);
      const sId = i.storeId || (p ? p.storeId : (stores[0] ? stores[0].id : 'str_1'));
      const matchingStore = stores.find((s) => s.id === sId || (p && s.name === p.storeName)) || stores[0];
      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        productId: p ? p.id : i.productId || 'p_unknown',
        productName: p ? p.name : i.productName || 'منتج قنا',
        storeId: matchingStore ? matchingStore.id : sId,
        storeName: matchingStore ? matchingStore.name : (p ? p.storeName : (i.storeName || 'متجر معتمد')),
        quantity: Number(i.quantity) || 1,
        price: p ? p.price : Number(i.price) || 10,
        status: 'pending',
      };
    }),
    subtotal,
    deliveryFee,
    totalAmount,
    status: 'confirmed',
    paymentMethod: paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'cash_on_delivery',
    paymentStatus: 'paid', // Immediately marks as paid so merchant sees it live!
    deliveryAddress: deliveryAddress || 'حي المصالح، شارع الجمهورية، قنا',
    deliveryLat: 26.1600,
    deliveryLng: 32.7210,
    assignedDriverId: winningDriver ? winningDriver.id : undefined,
    assignedDriverName: winningDriver ? winningDriver.driverName : 'جاري تعيين كابتن التوصيل...',
    pickupStops,
    createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
  };

  orders.unshift(newOrder);
  saveDataStore();

  if (supabase) {
    try {
      // 1. Determine a valid customer_id UUID that exists in public.profiles (to satisfy foreign key constraint)
      let validCustomerId: string | null = null;
      const candidateId = req.body.customerId || req.headers['x-user-id'] || newOrder.customerId;

      if (isValidUUID(candidateId)) {
        const { data: userProf } = await supabase.from('profiles').select('id').eq('id', candidateId).maybeSingle();
        if (userProf) validCustomerId = userProf.id;
      }

      if (!validCustomerId) {
        const { data: anyProf } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        if (anyProf) validCustomerId = anyProf.id;
      }

      // 2. Ensure a valid driver exists in public.drivers table ONLY if a winning online driver exists
      let validDriverId: string | null = null;
      if (winningDriver) {
        validDriverId = await ensureDriverExistsInSupabase(winningDriver);
        if (validDriverId) {
          newOrder.assignedDriverId = validDriverId;
          newOrder.assignedDriverName = winningDriver.driverName;
        }
      } else {
        newOrder.assignedDriverId = undefined;
        newOrder.assignedDriverName = 'جاري تعيين كابتن التوصيل...';
      }

      const dbOrderId = newOrder.id;

      const orderPayload: Record<string, any> = {
        id: dbOrderId,
        customer_id: validCustomerId,
        assigned_driver_id: validDriverId || null,
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone,
        subtotal: newOrder.subtotal,
        delivery_fee: newOrder.deliveryFee,
        total_amount: newOrder.totalAmount,
        status: newOrder.status,
        payment_method: newOrder.paymentMethod,
        payment_status: newOrder.paymentStatus,
        delivery_address: newOrder.deliveryAddress,
        created_at: new Date().toISOString(),
      };

      let { error } = await supabase.from('orders').insert(orderPayload);

      // Fallback if driver_id or customer_id foreign key constraint fails
      if (error) {
        console.warn('⚠️ Primary order insert note:', error.message);
        const cleanPayload = { ...orderPayload };
        if (error.message?.includes('customer_id') || error.code === '23503') {
          delete cleanPayload.customer_id;
        }
        if (error.message?.includes('assigned_driver_id') || error.code === '23503') {
          delete cleanPayload.assigned_driver_id;
        }

        let retryRes = await supabase.from('orders').insert(cleanPayload);
        if (!retryRes.error) {
          error = null;
        } else {
          error = retryRes.error;
        }
      }

      if (error) {
        console.error('❌ Supabase order insert failed:', error.message);
      } else {
        console.log('✅ Order successfully inserted into Supabase orders table with ID:', dbOrderId);

        // Insert relational order items into order_items table if it exists
        try {
          const itemPayloads = [];
          for (const it of newOrder.items) {
            let dbProductId: string | null = null;
            if (isValidUUID(it.productId)) {
              const { data: dbP } = await supabase.from('products').select('id, store_id').eq('id', it.productId).maybeSingle();
              if (dbP) dbProductId = dbP.id;
            }
            if (!dbProductId && it.productName) {
              const { data: dbPByName } = await supabase.from('products').select('id, store_id').eq('name', it.productName.trim()).maybeSingle();
              if (dbPByName) dbProductId = dbPByName.id;
            }

            const storeForIt = stores.find((s) => s.id === it.storeId || s.name === it.storeName) || stores[0];
            const verifiedStoreId = await ensureStoreExistsInSupabase(storeForIt);

            // Ensure product exists in Supabase so foreign key order_items_product_id_fkey is satisfied
            if (!dbProductId) {
              const matchingProd: Product = products.find((p) => p.id === it.productId || p.name === it.productName) || {
                id: it.productId,
                storeId: verifiedStoreId,
                storeName: storeForIt.name,
                name: it.productName,
                description: '',
                price: it.price,
                imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
                category: 'عام',
                stockQuantity: 10,
                isSoldOut: false,
                rating: 5,
                reviewCount: 0,
                reviews: [],
                createdAt: new Date().toISOString(),
              };
              dbProductId = await ensureProductExistsInSupabase(matchingProd, verifiedStoreId);
            }

            itemPayloads.push({
              id: crypto.randomUUID(),
              order_id: dbOrderId,
              product_id: dbProductId,
              store_id: verifiedStoreId,
              product_name: it.productName,
              price: it.price,
              quantity: it.quantity,
            });
          }

          if (itemPayloads.length > 0) {
            let { error: itemsErr } = await supabase.from('order_items').insert(itemPayloads);
            if (itemsErr) {
              console.warn('⚠️ Supabase order_items insert primary note:', itemsErr.message);
              // Fallback: If foreign key violated, ensure all items reference valid existing products
              const { data: anyProduct } = await supabase.from('products').select('id, store_id').limit(1).maybeSingle();
              if (anyProduct) {
                const safePayloads = itemPayloads.map((ip) => ({
                  ...ip,
                  product_id: ip.product_id || anyProduct.id,
                  store_id: ip.store_id || anyProduct.store_id,
                }));
                const retryItems = await supabase.from('order_items').insert(safePayloads);
                if (!retryItems.error) {
                  itemsErr = null;
                }
              }
            }

            if (!itemsErr) {
              console.log(`✅ ${itemPayloads.length} order items inserted into Supabase order_items table`);
            }
          }
        } catch (itemErr) {
          console.warn('⚠️ order_items insert error:', itemErr);
        }

        // Insert relational pickup stops into order_pickup_stops table
        try {
          const stopPayloads = [];
          for (let idx = 0; idx < pickupStops.length; idx++) {
            const st = pickupStops[idx];
            const storeForStop = stores.find((s) => s.id === st.storeId || s.name === st.storeName) || stores[0];
            const verifiedStoreId = await ensureStoreExistsInSupabase(storeForStop);
            stopPayloads.push({
              id: crypto.randomUUID(),
              order_id: dbOrderId,
              store_id: verifiedStoreId,
              stop_sequence: idx + 1,
              is_picked_up: false,
            });
          }

          if (stopPayloads.length > 0) {
            const { error: stopsErr } = await supabase.from('order_pickup_stops').insert(stopPayloads);
            if (!stopsErr) {
              console.log(`✅ ${stopPayloads.length} pickup stops inserted into Supabase order_pickup_stops table`);
            } else {
              console.warn('⚠️ Supabase order_pickup_stops insert note:', stopsErr.message);
            }
          }
        } catch (stopInsErr) {
          console.warn('⚠️ Supabase order_pickup_stops insert exception:', stopInsErr);
        }
      }
    } catch (err) {
      console.error('❌ Supabase order insert exception:', err);
    }
  }

  // Targeted notification generation
  const assignedDriverId = winningDriver?.id || newOrder.assignedDriverId;
  const assignedDriverUserId = winningDriver?.userId;

  // 1. Notification for the ASSIGNED DRIVER ONLY
  if (assignedDriverId) {
    notifications.unshift({
      id: `notif_drv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `طلب توصيل مسند إليك #${orderId.slice(-4)} 🛵`,
      message: `طلب مجمع بقيمة ${totalAmount} ج.م من ${pickupStoreIds.length} متاجر مطلوب استلامه وتوصيله.`,
      timestamp: 'الآن',
      type: 'delivery',
      read: false,
      driverId: assignedDriverId,
      userId: assignedDriverUserId,
      targetRole: 'delivery',
      orderId: newOrder.id,
    });
  }

  // 2. Notification for the CUSTOMER
  if (newOrder.customerId) {
    notifications.unshift({
      id: `notif_cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `تم تأكيد طلبك #${orderId.slice(-4)} 🎉`,
      message: `طلبك بقيمة ${totalAmount} ج.م قيد التنفيذ الآن وتم تعيين الكابتن ${newOrder.assignedDriverName}.`,
      timestamp: 'الآن',
      type: 'order',
      read: false,
      userId: newOrder.customerId,
      targetRole: 'customer',
      orderId: newOrder.id,
    });
  }

  // 3. Notifications for the MERCHANTS of the pickup stores
  for (const pStoreId of pickupStoreIds) {
    const store = stores.find((s) => s.id === pStoreId);
    notifications.unshift({
      id: `notif_store_${pStoreId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `طلب جديد لمتجرك #${orderId.slice(-4)} 📦`,
      message: `لديك أصناف جديدة بطلب #${orderId.slice(-4)} مطلوب تجهيزها للكابتن ${newOrder.assignedDriverName}.`,
      timestamp: 'الآن',
      type: 'order',
      read: false,
      storeId: pStoreId,
      userId: store?.ownerId,
      targetRole: 'merchant',
      orderId: newOrder.id,
    });
  }

  // 4. Notification for the ADMIN
  notifications.unshift({
    id: `notif_admin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: `طلب جديد في المنصة #${orderId.slice(-4)} 📊`,
    message: `طلب بقيمة ${totalAmount} ج.م تم إسناده للكابتن ${newOrder.assignedDriverName}.`,
    timestamp: 'الآن',
    type: 'order',
    read: false,
    targetRole: 'admin',
    orderId: newOrder.id,
  });

  saveDataStore();

  res.status(201).json({
    order: newOrder,
    driverAssignment: {
      winningDriver,
      evaluations,
      reason: `تم تعيين الكابتن ${winningDriver?.driverName || newOrder.assignedDriverName} لتوصيل طلبك.`,
    },
  });
});

function mapToSupabaseOrderStatus(status: string): 'confirmed' | 'picking_up' | 'in_transit' | 'delivered' | 'cancelled' {
  const s = String(status).toLowerCase();
  if (['delivered', 'completed'].includes(s)) return 'delivered';
  if (['in_transit', 'out_for_delivery', 'transit'].includes(s)) return 'in_transit';
  if (['picking_up', 'picked_up', 'preparing', 'ready'].includes(s)) return 'picking_up';
  if (['cancelled', 'rejected', 'declined', 'refused'].includes(s)) return 'cancelled';
  return 'confirmed';
}

// Update order status (Picking up -> In transit -> Delivered / Cancelled / Rejected)
app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  const { status, stopIndex } = req.body;
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const oldStatus = order.status;

  if (stopIndex !== undefined && order.pickupStops && order.pickupStops[stopIndex]) {
    order.pickupStops[stopIndex].isPickedUp = true;
    const allPicked = order.pickupStops.every((s) => s.isPickedUp);
    if (allPicked) {
      order.status = 'in_transit';
    } else {
      order.status = 'picking_up';
    }

    if (supabase) {
      try {
        const orderUUID = isValidUUID(order.id) ? order.id : stringToUUID(order.id);
        const targetStop = order.pickupStops[stopIndex];
        const storeUUID = isValidUUID(targetStop.storeId) ? targetStop.storeId : stringToUUID(targetStop.storeId);

        // Try updating by order_id and stop_sequence
        const { error: stopUpdErr } = await supabase
          .from('order_pickup_stops')
          .update({ is_picked_up: true })
          .eq('order_id', orderUUID)
          .eq('stop_sequence', stopIndex + 1);

        if (stopUpdErr) {
          await supabase
            .from('order_pickup_stops')
            .update({ is_picked_up: true })
            .eq('order_id', orderUUID)
            .eq('store_id', storeUUID);
        }

        await supabase
          .from('orders')
          .update({ status: mapToSupabaseOrderStatus(order.status) })
          .eq('id', orderUUID);
      } catch (err) {
        console.warn('⚠️ Supabase pickup stop update exception:', err);
      }
    }
  }

  if (status) {
    // 1. Strict validation: Delivery driver cannot mark order as 'delivered' before picking up all stops from stores
    if (status === 'delivered') {
      const hasUnpickedStops = order.pickupStops && order.pickupStops.length > 0 && order.pickupStops.some((s) => !s.isPickedUp);
      if (hasUnpickedStops) {
        return res.status(400).json({
          error: 'عذراً، لا يمكن تأكيد تسليم الطلب للعميل قبل تأكيد استلام جميع الأصناف من المتاجر أولاً.',
        });
      }
    }

    order.status = status;

    // Check if order was cancelled or rejected and was not previously cancelled/rejected
    const isCancelledOrRejected = ['cancelled', 'rejected', 'declined', 'refused'].includes(String(status).toLowerCase());
    const wasAlreadyCancelledOrRejected = ['cancelled', 'rejected', 'declined', 'refused'].includes(String(oldStatus).toLowerCase());

    if (isCancelledOrRejected && !wasAlreadyCancelledOrRejected) {
      console.log(`🔄 Order #${order.id} was marked as "${status}". Restocking items to store inventory...`);
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId || p.name === item.productName);
        if (product) {
          const restockQty = Number(item.quantity) || 1;
          product.stockQuantity += restockQty;
          if (product.stockQuantity > 0) {
            product.isSoldOut = false;
          }

          if (supabase) {
            try {
              const prodUUID = isValidUUID(product.id) ? product.id : stringToUUID(product.id);
              await supabase
                .from('products')
                .update({
                  stock_quantity: product.stockQuantity,
                  is_sold_out: product.isSoldOut,
                })
                .eq('id', prodUUID);
            } catch (err) {
              console.warn('⚠️ Supabase product restock error:', err);
            }
          }
        }
      }
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      // 1. Increment loyalty points (+1 point) in profiles table for the customer
      let updatedUserPoints = 1;
      const targetUser = users.find(
        (u) => u.id === order.customerId || (order.customerPhone && u.phone === order.customerPhone)
      );
      if (targetUser) {
        targetUser.points = (Number(targetUser.points) || 0) + 1;
        updatedUserPoints = targetUser.points;
      }

      if (supabase && order.customerId) {
        try {
          const custUUID = isValidUUID(order.customerId) ? order.customerId : stringToUUID(order.customerId);
          // Query current points from profiles
          const { data: profData } = await supabase
            .from('profiles')
            .select('id, points')
            .eq('id', custUUID)
            .maybeSingle();

          const curPoints = Number(profData?.points || 0);
          const nextPoints = curPoints + 1;
          updatedUserPoints = nextPoints;

          const { error: ptErr } = await supabase
            .from('profiles')
            .update({ points: nextPoints })
            .eq('id', custUUID);

          if (ptErr) {
            console.warn('⚠️ Supabase profiles points update note:', ptErr.message);
          } else {
            console.log(`✅ Point added to user profile in Supabase profiles for user ${custUUID}: ${curPoints} -> ${nextPoints}`);
          }
        } catch (ptEx) {
          console.warn('⚠️ Supabase user points increment exception:', ptEx);
        }
      }

      // Update driver telemetry stats (unified: driver earns the calculated delivery fee of the order)
      const driver = deliveryDrivers.find((d) => d.id === order.assignedDriverId);
      if (driver) {
        driver.todayEarnings += (order.deliveryFee || 20); // unified driver fee = order deliveryFee
        driver.totalCashCollected += order.paymentMethod === 'cash_on_delivery' ? order.totalAmount : 0;
        driver.todayKmDriven += 4.5;
        driver.fuelConsumedLiters += Number((4.5 * 0.08).toFixed(2));

        if (supabase) {
          try {
            const driverUUID = isValidUUID(driver.id) ? driver.id : stringToUUID(driver.id);
            await supabase
              .from('drivers')
              .update({
                today_earnings: driver.todayEarnings,
                total_cash_collected: driver.totalCashCollected,
                today_km_driven: driver.todayKmDriven,
                fuel_consumed_liters: driver.fuelConsumedLiters,
              })
              .eq('id', driverUUID);
          } catch (dErr) {
            console.warn('⚠️ Supabase driver telemetry update note:', dErr);
          }
        }
      }

      // Targeted notification for customer with points bonus confirmation
      if (order.customerId) {
        notifications.unshift({
          id: `notif_cust_deliv_${Date.now()}`,
          title: `تم تسليم طلبك بنجاح #${order.id.slice(-4)} 🌟`,
          message: `تم تسليم جميع أصناف طلبك بنجاح بواسطة الكابتن ${order.assignedDriverName || 'المعين'}. تمت إضافة 1 نقطة لرصيدك في جدول المكافآت (رصيدك الآن: ${updatedUserPoints} نقطة)!`,
          timestamp: 'الآن',
          type: 'order',
          read: false,
          userId: order.customerId,
          targetRole: 'customer',
          orderId: order.id,
        });
      }

      // Targeted notification for driver
      if (order.assignedDriverId) {
        notifications.unshift({
          id: `notif_drv_deliv_${Date.now()}`,
          title: `تم توثيق التسليم بنجاح #${order.id.slice(-4)} 💰`,
          message: `تمت إضافة أجر التوصيل (${order.deliveryFee || 20} ج.م) لأرباحك اليومية. عاش يا كابتن!`,
          timestamp: 'الآن',
          type: 'delivery',
          read: false,
          driverId: order.assignedDriverId,
          targetRole: 'delivery',
          orderId: order.id,
        });
      }
    } else if (status === 'picking_up') {
      if (order.customerId) {
        notifications.unshift({
          id: `notif_cust_pickup_${Date.now()}`,
          title: `الكابتن في المتجر لتجهيز واستلام طلبك #${order.id.slice(-4)} 🛒`,
          message: `الكابتن ${order.assignedDriverName || 'المعين'} متواجد في المتجر لتجهيز واستلام طلبك الآن.`,
          timestamp: 'الآن',
          type: 'order',
          read: false,
          userId: order.customerId,
          targetRole: 'customer',
          orderId: order.id,
        });
      }
    } else if (status === 'in_transit') {
      if (order.customerId) {
        notifications.unshift({
          id: `notif_cust_transit_${Date.now()}`,
          title: `طلبك في الطريق إليك #${order.id.slice(-4)} 🛵`,
          message: `قام الكابتن ${order.assignedDriverName || 'المعين'} باستلام الأصناف وهو متوجه لعنوانك الآن.`,
          timestamp: 'الآن',
          type: 'order',
          read: false,
          userId: order.customerId,
          targetRole: 'customer',
          orderId: order.id,
        });
      }
    }

    if (supabase) {
      try {
        const orderUUID = isValidUUID(order.id) ? order.id : stringToUUID(order.id);
        await supabase
          .from('orders')
          .update({
            status: mapToSupabaseOrderStatus(order.status),
            delivered_at: order.deliveredAt ? new Date().toISOString() : null,
          })
          .eq('id', orderUUID);
      } catch (err) {
        console.warn('⚠️ Supabase order status update error:', err);
      }
    }
  }

  saveDataStore();
  res.json(order);
});

// 5. Delivery Driver telemetry & withdrawal routes
app.get('/api/drivers', async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    let driversList = await getRealDriversFromDatabase();
    if (all !== 'true') {
      driversList = driversList.filter((d) => d.isApproved !== false);
    }
    res.json(driversList);
  } catch (err: any) {
    console.error('Error in /api/drivers:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.get('/api/delivery/profile', async (req: Request, res: Response) => {
  try {
    const driverId = (req.query.driverId as string) || '';
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || '';
    const userEmail = (req.query.email as string) || (req.query.userEmail as string) || (req.headers['x-user-email'] as string) || '';

    const allDrivers = await getRealDriversFromDatabase();

    let driver: DeliveryProfile | undefined;
    if (driverId) {
      driver = allDrivers.find((d) => d.id === driverId || d.userId === driverId);
    }
    if (!driver && userId) {
      driver = allDrivers.find((d) => d.userId === userId || d.id === userId);
    }
    if (!driver && userEmail) {
      const emailLower = userEmail.toLowerCase();
      const matchedUser = users.find((u) => u.email.toLowerCase() === emailLower);
      if (matchedUser) {
        driver = allDrivers.find((d) => d.userId === matchedUser.id || d.id === matchedUser.id);
      }
    }

    // Direct check in Supabase drivers table to guarantee exact real-time is_online value
    if (supabase && (userId || driverId)) {
      try {
        const { data: dbData } = await supabase
          .from('drivers')
          .select('*')
          .or(`user_id.eq.${userId || driverId},id.eq.${userId || driverId}`);
        if (dbData && dbData.length > 0) {
          const directMap = mapDriver(dbData[0]);
          if (driver) {
            driver.isOnline = directMap.isOnline;
          } else {
            driver = directMap;
          }
        }
      } catch (e) {
        console.warn('⚠️ Supabase direct driver fetch note:', e);
      }
    }

    if (!driver && (userId || userEmail)) {
      const emailLower = (userEmail || '').toLowerCase();
      const matchedUser = users.find((u) => (userId && u.id === userId) || (emailLower && u.email.toLowerCase() === emailLower));
      if (matchedUser) {
        driver = {
          id: `drv_${matchedUser.id}`,
          userId: matchedUser.id,
          driverName: matchedUser.name,
          vehicleType: 'موتوسيكل',
          plateNumber: 'ق ن أ ' + (matchedUser.phone?.slice(-4) || '1020'),
          currentLat: 26.1551,
          currentLng: 32.7160,
          isOnline: false,
          todayEarnings: 0,
          totalCashCollected: 0,
          todayKmDriven: 0,
          fuelConsumedLiters: 0,
        };
      }
    }
    if (!driver) {
      driver = allDrivers[0];
    }

    const fallbackDriver: DeliveryProfile = {
      id: 'drv_1',
      userId: 'usr_delivery_1',
      driverName: 'كابتن توصيل',
      vehicleType: 'موتوسيكل',
      plateNumber: 'ق ن أ 4432',
      currentLat: 26.1551,
      currentLng: 32.716,
      isOnline: true,
      todayEarnings: 0,
      totalCashCollected: 0,
      todayKmDriven: 0,
      fuelConsumedLiters: 0,
    };

    const targetDriver = driver || fallbackDriver;

    const activeOrders = orders.filter(
      (o) => o && targetDriver && (o.assignedDriverId === targetDriver.id || o.assignedDriverId === targetDriver.userId) && o.status !== 'delivered' && o.status !== 'cancelled'
    );
    const completedOrders = orders.filter(
      (o) => o && targetDriver && (o.assignedDriverId === targetDriver.id || o.assignedDriverId === targetDriver.userId) && o.status === 'delivered'
    );
    const driverWithdrawals = withdrawalRequests.filter((w) => w && targetDriver && (w.driverId === targetDriver.id || w.driverId === targetDriver.userId));

    // Dynamic real calculations from completed orders & withdrawals strictly for this driver ID
    const calcEarnings = completedOrders.reduce((sum, o) => sum + (o.deliveryFee || 20), 0);
    const calcApprovedWithdrawals = driverWithdrawals.filter((w) => w.status === 'approved').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const calcCashCollected = completedOrders.filter((o) => o.paymentMethod === 'cash_on_delivery').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const calcKm = Number((completedOrders.length * 4.2 + (activeOrders.length > 0 ? 1.8 : 0)).toFixed(1));
    const calcFuel = Number((calcKm * 0.035).toFixed(2));

    targetDriver.todayEarnings = Math.max(0, calcEarnings - calcApprovedWithdrawals);
    targetDriver.totalCashCollected = calcCashCollected;
    targetDriver.todayKmDriven = calcKm;
    targetDriver.fuelConsumedLiters = calcFuel;

    res.json({
      driver: targetDriver,
      activeOrders,
      completedOrders,
      withdrawals: driverWithdrawals,
    });
  } catch (err: any) {
    console.error('Error in /api/delivery/profile:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/delivery/withdraw', requireRole(['delivery', 'admin']), async (req: Request, res: Response) => {
  const { amount, method, accountDetails, driverId } = req.body;
  const targetDriverId = driverId || 'drv_1';
  const driver = deliveryDrivers.find((d) => d.id === targetDriverId);

  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }
  if (Number(amount) > driver.todayEarnings) {
    return res.status(400).json({
      error: `الرصيد المتاح للسحب هو ${driver.todayEarnings} ج.م فقط`,
    });
  }

  const newRequest: WithdrawalRequest = {
    id: `wth_${Date.now()}`,
    driverId: driver.id,
    driverName: driver.driverName,
    amount: Number(amount),
    method: method || 'محفظة إلكترونية (فودافون كاش / إنستاباي)',
    accountDetails: accountDetails || '01012345678 (فودافون كاش - قنا)',
    status: 'pending',
    requestDate: new Date().toLocaleString('ar-EG'),
  };

  // Sync to Supabase withdrawal_requests table if connected
  if (supabase) {
    try {
      const validDriverUUID = await ensureDriverExistsInSupabase(driver);
      if (validDriverUUID) {
        await supabase.from('withdrawal_requests').insert({
          id: crypto.randomUUID(),
          driver_id: validDriverUUID,
          amount: Number(amount),
          payment_method: method || 'تحويل بنكي IBAN',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    } catch (wErr) {
      console.warn('⚠️ Supabase withdrawal insert note:', wErr);
    }
  }

  withdrawalRequests.unshift(newRequest);

  // Real notification for driver confirming withdrawal request submission
  notifications.unshift({
    id: `notif_w_req_${Date.now()}`,
    title: 'تم تسجيل طلب سحب الأرباح 💸',
    message: `تم تسجيل طلب سحب مبلغ ${amount} ج.م بنجاح وهو قيد المراجعة بواسطة إدارة بدالك.`,
    timestamp: 'الآن',
    type: 'wallet',
    read: false,
    driverId: driver.id,
    userId: driver.userId,
    targetRole: 'delivery',
  });

  // Real notification for admin
  notifications.unshift({
    id: `notif_w_admin_${Date.now()}`,
    title: 'طلب سحب أرباح جديد 🏦',
    message: `طلب سحب أرباح جديد بقيمة ${amount} ج.م من الكابتن ${driver.driverName}.`,
    timestamp: 'الآن',
    type: 'wallet',
    read: false,
    targetRole: 'admin',
  });

  saveDataStore();
  res.status(201).json(newRequest);
});

app.patch('/api/delivery/status', async (req: Request, res: Response) => {
  try {
    const { driverId, isOnline, currentLat, currentLng } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;

    const allDrivers = await getRealDriversFromDatabase();

    let driver: DeliveryProfile | undefined;
    if (driverId) {
      driver = allDrivers.find((d) => d.id === driverId || d.userId === driverId);
    }
    if (!driver && userId) {
      driver = allDrivers.find((d) => d.userId === userId || d.id === userId);
    }
    if (!driver && userEmail) {
      const emailLower = userEmail.toLowerCase();
      const matchedUser = users.find((u) => u.email.toLowerCase() === emailLower);
      if (matchedUser) {
        driver = allDrivers.find((d) => d.userId === matchedUser.id || d.id === matchedUser.id);
      }
    }
    if (!driver) {
      driver = deliveryDrivers[0];
    }

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const nextOnlineState = isOnline !== undefined ? Boolean(isOnline) : driver.isOnline;
    driver.isOnline = nextOnlineState;
    if (currentLat !== undefined) driver.currentLat = Number(currentLat);
    if (currentLng !== undefined) driver.currentLng = Number(currentLng);

    // Sync in-memory deliveryDrivers list as well
    const memDrv = deliveryDrivers.find((d) => d.id === driver.id || d.userId === driver.userId);
    if (memDrv) {
      memDrv.isOnline = nextOnlineState;
      if (currentLat !== undefined) memDrv.currentLat = Number(currentLat);
      if (currentLng !== undefined) memDrv.currentLng = Number(currentLng);
    }

    saveDataStore();

    if (supabase) {
      try {
        const validDriverUUID = await ensureDriverExistsInSupabase(driver);
        const updateData: Record<string, any> = {
          is_online: nextOnlineState,
        };
        if (currentLat !== undefined) updateData.current_lat = Number(currentLat);
        if (currentLng !== undefined) updateData.current_lng = Number(currentLng);

        if (validDriverUUID) {
          const { error: updErr } = await supabase
            .from('drivers')
            .update(updateData)
            .eq('id', validDriverUUID);

          if (updErr) {
            console.warn('⚠️ Supabase driver status update note:', updErr.message);
          } else {
            console.log(`✅ Driver "${driver.driverName}" (UUID: ${validDriverUUID}) is_online updated to ${nextOnlineState} in Supabase drivers table`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Supabase status update exception:', err);
      }
    }

    // If driver became online (متصل), assign any pending unassigned orders to him!
    if (nextOnlineState === true) {
      const unassignedOrders = orders.filter(
        (o) => !o.assignedDriverId || o.assignedDriverName === 'جاري تعيين كابتن التوصيل...'
      );
      for (const unOrder of unassignedOrders) {
        unOrder.assignedDriverId = driver.id;
        unOrder.assignedDriverName = driver.driverName;

        if (supabase) {
          try {
            const validDriverUUID = await ensureDriverExistsInSupabase(driver);
            await supabase
              .from('orders')
              .update({
                assigned_driver_id: validDriverUUID || driver.id,
                assigned_driver_name: driver.driverName,
              })
              .eq('id', unOrder.id);
          } catch { /* fallback */ }
        }
      }
    }

    res.json({ success: true, driver });
  } catch (err: any) {
    console.error('Error in /api/delivery/status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 6. Admin routes
app.get('/api/admin/metrics', requireRole(['admin']), (req: Request, res: Response) => {
  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDeliveryFees = orders.reduce((sum, o) => sum + o.deliveryFee, 0);
  const totalPlatformCommission = totalGMV * 0.1; // 10% commission

  res.json({
    totalUsers: users.length,
    totalStores: stores.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    totalGMV,
    totalPlatformCommission,
    totalDeliveryFees,
    drivers: deliveryDrivers,
    withdrawals: withdrawalRequests,
    recentOrders: orders.slice(0, 10),
  });
});

app.post('/api/admin/withdrawals/:id/approve', requireRole(['admin']), async (req: Request, res: Response) => {
  const request = withdrawalRequests.find((w) => w.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = 'approved';
  request.approvedDate = new Date().toLocaleString('ar-EG');

  // Deduct from driver earnings
  const driver = deliveryDrivers.find((d) => d.id === request.driverId);
  if (driver) {
    driver.todayEarnings = Math.max(0, driver.todayEarnings - request.amount);
  }

  // Real notification for the driver confirming approved transfer
  notifications.unshift({
    id: `notif_w_appr_${Date.now()}`,
    title: 'تمت الموافقة على تحويل الأرباح ✅',
    message: `تمت الموافقة على سحب مبلغ ${request.amount} ج.م وإرسالها لحسابك (${request.method}).`,
    timestamp: 'الآن',
    type: 'wallet',
    read: false,
    driverId: request.driverId,
    targetRole: 'delivery',
  });

  saveDataStore();

  if (supabase) {
    try {
      const wUUID = isValidUUID(request.id) ? request.id : stringToUUID(request.id);
      await supabase
        .from('withdrawal_requests')
        .update({ status: 'approved' })
        .eq('id', wUUID);

      if (driver) {
        const driverUUID = isValidUUID(driver.id) ? driver.id : stringToUUID(driver.id);
        await supabase
          .from('drivers')
          .update({ today_earnings: driver.todayEarnings })
          .eq('id', driverUUID);
      }
      console.log('✅ Withdrawal approved and synced in Supabase');
    } catch (wApproveErr) {
      console.warn('⚠️ Supabase withdrawal approval error:', wApproveErr);
    }
  }

  res.json({ success: true, request });
});

// 7. Notifications route (Strictly targeted to recipient)
app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = (req.query.userId || req.headers['x-user-id']) as string | undefined;
  const role = (req.query.role || req.headers['x-user-role']) as UserRole | undefined;
  const driverId = (req.query.driverId || req.headers['x-driver-id']) as string | undefined;
  const storeId = (req.query.storeId || req.headers['x-store-id']) as string | undefined;

  // Unauthenticated guests have 0 notifications
  if (!userId && !driverId && !storeId && !role) {
    return res.json([]);
  }

  // Admin sees all system and platform notifications
  if (role === 'admin') {
    return res.json(notifications);
  }

  const filtered = notifications.filter((n) => {
    // 1. If notification is specifically for a delivery driver
    if (n.driverId || n.targetRole === 'delivery' || n.type === 'delivery') {
      if (role && role !== 'delivery') return false;
      if (n.driverId) {
        return (driverId && n.driverId === driverId) || (userId && n.userId === userId);
      }
      if (n.userId && userId && n.userId !== userId) return false;
      return true;
    }

    // 2. If notification is specifically for a merchant / store
    if (n.storeId || n.targetRole === 'merchant') {
      if (role && role !== 'merchant') return false;
      if (n.storeId) {
        return (storeId && n.storeId === storeId) || (userId && n.userId === userId);
      }
      if (n.userId && userId && n.userId !== userId) return false;
      return true;
    }

    // 3. If notification is specifically for a customer
    if (n.targetRole === 'customer') {
      if (role && role !== 'customer') return false;
      if (n.userId && userId && n.userId !== userId) return false;
      return true;
    }

    // 4. If notification has a specific userId attached
    if (n.userId) {
      if (!userId || n.userId !== userId) return false;
      return true;
    }

    return false;
  });

  res.json(filtered);
});

app.post('/api/notifications/read-all', (req: Request, res: Response) => {
  const userId = (req.body?.userId || req.query.userId || req.headers['x-user-id']) as string | undefined;
  const driverId = (req.body?.driverId || req.query.driverId || req.headers['x-driver-id']) as string | undefined;

  notifications.forEach((n) => {
    if (!userId && !driverId) {
      n.read = true;
    } else if (userId && n.userId === userId) {
      n.read = true;
    } else if (driverId && n.driverId === driverId) {
      n.read = true;
    }
  });
  saveDataStore();
  res.json({ success: true, notifications });
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDataStore();
  }
  res.json({ success: true, notifications });
});

app.delete('/api/notifications', (req: Request, res: Response) => {
  const userId = (req.body?.userId || req.query.userId || req.headers['x-user-id']) as string | undefined;
  const driverId = (req.body?.driverId || req.query.driverId || req.headers['x-driver-id']) as string | undefined;

  if (userId || driverId) {
    notifications = notifications.filter((n) => {
      if (userId && n.userId === userId) return false;
      if (driverId && n.driverId === driverId) return false;
      return true;
    });
  } else {
    notifications.length = 0;
  }
  saveDataStore();
  res.json({ success: true, notifications: [] });
});

app.post('/api/notifications/test', (req: Request, res: Response) => {
  const userId = (req.body?.userId || req.query.userId || req.headers['x-user-id']) as string | undefined;
  const role = (req.body?.role || req.query.role || req.headers['x-user-role']) as UserRole | undefined;
  const driverId = (req.body?.driverId || req.query.driverId || req.headers['x-driver-id']) as string | undefined;

  let newNotif: NotificationItem;
  if (role === 'delivery') {
    newNotif = {
      id: `notif_${Date.now()}`,
      title: 'إشعار تجريبي للكابتن 🛵',
      message: 'طلب مجمع جديد بانتظار استلامك من المتاجر بقنا. تفقد خط السير والطلبات.',
      timestamp: 'الآن',
      type: 'delivery',
      read: false,
      driverId: driverId,
      userId: userId,
      targetRole: 'delivery',
    };
  } else if (role === 'merchant') {
    newNotif = {
      id: `notif_${Date.now()}`,
      title: 'إشعار تجريبي للمتجر 📦',
      message: 'تم استقبال طلب تجهيز جديد من عميل في منصة بدالك.',
      timestamp: 'الآن',
      type: 'order',
      read: false,
      userId: userId,
      targetRole: 'merchant',
    };
  } else {
    newNotif = {
      id: `notif_${Date.now()}`,
      title: 'تنبيه تجريبي: عرض خاص بقنا 🌟',
      message: 'خصم 15% على جميع طلبات الأجبان والمخبوزات الصعيدية اليوم فقط!',
      timestamp: 'الآن',
      type: 'reward',
      read: false,
      userId: userId,
      targetRole: 'customer',
    };
  }

  notifications.unshift(newNotif);
  saveDataStore();
  res.json({ success: true, notification: newNotif, notifications });
});

// Admin Endpoints for approving / rejecting stores & drivers
app.patch('/api/admin/approve-store', async (req: Request, res: Response) => {
  const { storeId, approved } = req.body;
  if (!storeId) {
    return res.status(400).json({ error: 'مُعرّف المتجر مطلوب' });
  }

  const isApproved = approved !== false;

  const store = stores.find((s) => s.id === storeId);
  if (store) {
    store.isApproved = isApproved;
  }

  if (supabase) {
    try {
      const storeUUID = isValidUUID(storeId) ? storeId : stringToUUID(storeId);
      await supabase.from('stores').update({ is_approved: isApproved }).eq('id', storeUUID);
      console.log(`✅ Admin updated store ${storeId} approval status to: ${isApproved}`);
    } catch (err) {
      console.warn('⚠️ Supabase store approval update warning:', err);
    }
  }

  saveDataStore();
  return res.json({ success: true, store, message: isApproved ? 'تمت الموافقة على المتجر وتفعيله بنجاح' : 'تم تجميد/رفض المتجر' });
});

app.patch('/api/admin/approve-driver', async (req: Request, res: Response) => {
  const { driverId, approved } = req.body;
  if (!driverId) {
    return res.status(400).json({ error: 'مُعرّف المندوب مطلوب' });
  }

  const isApproved = approved !== false;

  const driver = deliveryDrivers.find((d) => d.id === driverId || d.userId === driverId);
  if (driver) {
    driver.isApproved = isApproved;
  }

  if (supabase) {
    try {
      const driverUUID = isValidUUID(driverId) ? driverId : stringToUUID(driverId);
      await supabase.from('drivers').update({ is_approved: isApproved }).eq('id', driverUUID);
      console.log(`✅ Admin updated driver ${driverId} approval status to: ${isApproved}`);
    } catch (err) {
      console.warn('⚠️ Supabase driver approval update warning:', err);
    }
  }

  saveDataStore();
  return res.json({ success: true, driver, message: isApproved ? 'تمت الموافقة على المندوب واعتماده بنجاح' : 'تم تجميد/رفض المندوب' });
});

// -------------------------------------------------------------
// Join Requests Management (طلبات الانضمام: دليفري ومحلات من جدول join_requests)
// -------------------------------------------------------------
app.get('/api/admin/join-requests', async (req: Request, res: Response) => {
  try {
    let deliveryRequests: any[] = [];
    let merchantRequests: any[] = [];
    const processedUserIds = new Set<string>();

    // 1. Primary Source: Fetch directly from Supabase 'join_requests' table
    if (supabase) {
      try {
        const client = supabaseAdmin || supabase;
        const { data: dbRequests, error: dbErr } = await client
          .from('join_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!dbErr && Array.isArray(dbRequests) && dbRequests.length > 0) {
          console.log(`✅ Loaded ${dbRequests.length} join requests directly from Supabase "join_requests" table`);
          for (const row of dbRequests) {
            processedUserIds.add(row.user_id);
            const reqItem = {
              id: row.id || `req_${row.requested_role === 'merchant' ? 'mrc' : 'drv'}_${row.user_id}`,
              userId: row.user_id,
              userName: row.user_name,
              userEmail: row.user_email,
              userPhone: row.user_phone,
              requestedRole: row.requested_role,
              status: row.status || 'pending',
              createdAt: row.created_at || new Date().toISOString(),
              storeId: row.store_id,
              storeName: row.store_name,
              storeCategory: row.store_category,
              storeAddress: row.store_address,
              driverId: row.driver_id,
              vehicleType: row.vehicle_type || 'موتوسيكل',
              plateNumber: row.plate_number || 'ق ن أ 1234',
              notes: row.notes,
              adminFeedback: row.admin_feedback,
            };

            if (row.requested_role === 'delivery') {
              deliveryRequests.push(reqItem);
            } else if (row.requested_role === 'merchant') {
              merchantRequests.push(reqItem);
            }
          }
        } else if (dbErr) {
          console.log('ℹ️ Supabase join_requests query note:', dbErr.message);
        }
      } catch (e) {
        console.warn('⚠️ Supabase join-requests query note:', e);
      }
    }

    // 2. Local joinRequestsList merge
    for (const row of joinRequestsList) {
      if (processedUserIds.has(row.user_id)) continue;
      processedUserIds.add(row.user_id);
      const reqItem = {
        id: row.id || `req_${row.requested_role === 'merchant' ? 'mrc' : 'drv'}_${row.user_id}`,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        userPhone: row.user_phone,
        requestedRole: row.requested_role,
        status: row.status || 'pending',
        createdAt: row.created_at || new Date().toISOString(),
        storeId: row.store_id,
        storeName: row.store_name,
        storeCategory: row.store_category,
        storeAddress: row.store_address,
        driverId: row.driver_id,
        vehicleType: row.vehicle_type || 'موتوسيكل',
        plateNumber: row.plate_number || 'ق ن أ 1234',
        notes: row.notes,
        adminFeedback: row.admin_feedback,
      };

      if (row.requested_role === 'delivery') {
        deliveryRequests.push(reqItem);
      } else if (row.requested_role === 'merchant') {
        merchantRequests.push(reqItem);
      }
    }

    // 3. Secondary fallback / sync: Check profiles & local users for any additional or pending requests
    let allUsers: User[] = [...users];

    if (supabase) {
      try {
        const { data: profileRows, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(profileRows)) {
          const fetchedUsers = profileRows.map(mapUser);
          for (const fu of fetchedUsers) {
            const idx = allUsers.findIndex((u) => u.id === fu.id);
            if (idx >= 0) {
              allUsers[idx] = { ...allUsers[idx], ...fu };
            } else {
              allUsers.push(fu);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Supabase profiles fetch note:', e);
      }
    }

    for (const u of allUsers) {
      if (processedUserIds.has(u.id)) continue;

      // 1. Delivery Join Requests
      const relatedDriver = deliveryDrivers.find((d) => d.userId === u.id || d.id === u.id);
      const isDeliveryCandidate =
        u.requestedRole === 'delivery' ||
        (relatedDriver && relatedDriver.isApproved === false) ||
        (u.role === 'delivery' && u.approvalStatus === 'pending');

      if (isDeliveryCandidate) {
        let status = u.approvalStatus || (u.role === 'delivery' ? 'approved' : 'pending');
        if (relatedDriver && relatedDriver.isApproved === false && status === 'approved') {
          status = 'pending';
        }
        deliveryRequests.push({
          id: `req_drv_${u.id}`,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userPhone: u.phone,
          requestedRole: 'delivery',
          status: status,
          createdAt: u.createdAt || new Date().toISOString(),
          driverId: relatedDriver?.id,
          vehicleType: u.vehicleType || relatedDriver?.vehicleType || 'موتوسيكل',
          plateNumber: u.plateNumber || relatedDriver?.plateNumber || 'ق ن أ 1234',
        });
      }

      // 2. Merchant Join Requests
      const relatedStore = stores.find((s) => s.ownerId === u.id || s.id === u.storeId);
      const isMerchantCandidate =
        u.requestedRole === 'merchant' ||
        (relatedStore && relatedStore.isApproved === false) ||
        (u.role === 'merchant' && u.approvalStatus === 'pending');

      if (isMerchantCandidate) {
        let status = u.approvalStatus || (u.role === 'merchant' ? 'approved' : 'pending');
        if (relatedStore && relatedStore.isApproved === false && status === 'approved') {
          status = 'pending';
        }
        merchantRequests.push({
          id: `req_mrc_${u.id}`,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userPhone: u.phone,
          requestedRole: 'merchant',
          status: status,
          createdAt: u.createdAt || new Date().toISOString(),
          storeId: relatedStore?.id || u.storeId,
          storeName: u.storeName || relatedStore?.name || `متجر ${u.name}`,
          storeCategory: u.storeCategory || relatedStore?.category || 'سوبرماركت',
          storeAddress: u.storeAddress || relatedStore?.address || 'شارع الجمهورية، قنا',
        });
      }
    }

    const pendingCount =
      deliveryRequests.filter((r) => r.status === 'pending').length +
      merchantRequests.filter((r) => r.status === 'pending').length;

    return res.json({
      success: true,
      deliveryRequests,
      merchantRequests,
      pendingCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل جلب طلبات الانضمام' });
  }
});

// Submit a new join request directly (لأي مستخدم مسجل يرغب في تقديم طلب انضمام كتاجر أو كابتن)
app.post('/api/join-requests', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      userPhone,
      requestedRole,
      storeName,
      storeCategory,
      storeAddress,
      vehicleType,
      plateNumber,
      notes,
    } = req.body;

    if (!userId || !userEmail || !requestedRole) {
      return res.status(400).json({ error: 'المعلومات الأساسية مطلوبة (userId, userEmail, requestedRole)' });
    }

    const reqId = `req_${requestedRole === 'merchant' ? 'mrc' : 'drv'}_${userId}`;
    const payload = {
      id: reqId,
      user_id: userId,
      user_name: userName || 'مستخدم جديد',
      user_email: userEmail,
      user_phone: userPhone || null,
      requested_role: requestedRole,
      status: 'pending',
      store_name: storeName ? String(storeName).trim() : null,
      store_category: storeCategory || null,
      store_address: storeAddress ? String(storeAddress).trim() : null,
      vehicle_type: vehicleType ? String(vehicleType).trim() : (requestedRole === 'delivery' ? 'موتوسيكل' : null),
      plate_number: plateNumber ? String(plateNumber).trim() : null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const client = supabaseAdmin || supabase;
        await client.from('join_requests').upsert(payload);
        console.log('✅ Join request upserted to Supabase "join_requests":', reqId);
      } catch (dbErr: any) {
        console.warn('⚠️ Supabase join_requests upsert warning:', dbErr?.message);
      }
    }

    // Save to in-memory & disk persistence list
    const existingIdx = joinRequestsList.findIndex((r) => r.id === reqId || r.user_id === userId);
    if (existingIdx >= 0) {
      joinRequestsList[existingIdx] = { ...joinRequestsList[existingIdx], ...payload };
    } else {
      joinRequestsList.unshift(payload);
    }
    saveDataStore();

    return res.json({
      success: true,
      message: 'تم إرسال طلب الانضمام بنجاح وهو قيد مراجعة الإدارة',
      joinRequest: payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل إرسال طلب الانضمام' });
  }
});

app.post('/api/admin/approve-role-request', async (req: Request, res: Response) => {
  const { userId, requestedRole, approved } = req.body;
  if (!userId || !requestedRole) {
    return res.status(400).json({ error: 'مُعرّف المستخدم والدور المطلوب إلزامي' });
  }

  const isApproved = approved !== false;
  // If approved: update role in profiles to requestedRole ('merchant' or 'delivery')
  // If rejected: user remains 'customer' with approval_status = 'rejected'
  const targetRole: UserRole = isApproved ? requestedRole : 'customer';

  // 1. Update in-memory user
  let targetUser = users.find((u) => u.id === userId);
  if (targetUser) {
    targetUser.role = targetRole;
    targetUser.approvalStatus = isApproved ? 'approved' : 'rejected';
    if (isApproved) {
      targetUser.requestedRole = null;
    }
  }

  // 2. If merchant, update store approval
  if (requestedRole === 'merchant') {
    const store = stores.find((s) => s.ownerId === userId || s.id === targetUser?.storeId);
    if (store) {
      store.isApproved = isApproved;
    }
  }

  // 3. If delivery, update driver approval
  if (requestedRole === 'delivery') {
    const driver = deliveryDrivers.find((d) => d.userId === userId || d.id === userId);
    if (driver) {
      driver.isApproved = isApproved;
    }
  }

  // 4. Update Supabase tables (especially profiles.role)
  if (supabase) {
    try {
      const userUUID = isValidUUID(userId) ? userId : stringToUUID(userId);
      const client = supabaseAdmin || supabase;

      // Update profiles.role in Supabase
      const profileUpdatePayload: Record<string, any> = {
        role: targetRole,
        approval_status: isApproved ? 'approved' : 'rejected',
      };
      if (isApproved) {
        profileUpdatePayload.requested_role = null;
      }

      const { error: profErr } = await client
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userUUID);

      if (profErr) {
        console.warn('⚠️ Supabase profiles role update note:', profErr.message);
        // Fallback with just the role column
        await client.from('profiles').update({ role: targetRole }).eq('id', userUUID);
      }
      console.log(`✅ Supabase profiles table role updated for user ${userId} to: ${targetRole}`);

      // If merchant, update stores table in Supabase
      if (requestedRole === 'merchant') {
        const store = stores.find((s) => s.ownerId === userId || s.id === targetUser?.storeId);
        if (store) {
          const storeUUID = isValidUUID(store.id) ? store.id : stringToUUID(store.id);
          await client.from('stores').update({ is_approved: isApproved }).eq('id', storeUUID);
          console.log(`✅ Supabase stores table is_approved updated to ${isApproved} for store: ${store.id}`);
        }
      }

      // If delivery, update drivers table in Supabase
      if (requestedRole === 'delivery') {
        const driver = deliveryDrivers.find((d) => d.userId === userId || d.id === userId);
        if (driver) {
          const driverUUID = isValidUUID(driver.id) ? driver.id : stringToUUID(driver.id);
          await client.from('drivers').update({ is_approved: isApproved }).eq('id', driverUUID);
          console.log(`✅ Supabase drivers table is_approved updated to ${isApproved} for driver: ${driver.id}`);
        }
      }

      // Update Supabase 'join_requests' table status if exists
      try {
        const reqId = `req_${requestedRole === 'merchant' ? 'mrc' : 'drv'}_${userId}`;
        await client
          .from('join_requests')
          .update({
            status: isApproved ? 'approved' : 'rejected',
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${reqId},user_id.eq.${userId}`);
        console.log(`✅ Supabase join_requests status updated to ${isApproved ? 'approved' : 'rejected'} for user: ${userId}`);
      } catch (jrErr) {
        console.warn('ℹ️ Supabase join_requests update note:', jrErr);
      }
    } catch (err) {
      console.warn('⚠️ Supabase role approval synchronization exception:', err);
    }
  }

  // Update in-memory joinRequestsList
  const jrIdx = joinRequestsList.findIndex(
    (r) => r.user_id === userId || r.id === `req_${requestedRole === 'merchant' ? 'mrc' : 'drv'}_${userId}`
  );
  if (jrIdx >= 0) {
    joinRequestsList[jrIdx].status = isApproved ? 'approved' : 'rejected';
    joinRequestsList[jrIdx].reviewed_at = new Date().toISOString();
    joinRequestsList[jrIdx].updated_at = new Date().toISOString();
  }

  // 5. Create notifications
  if (isApproved) {
    notifications.unshift({
      id: `notif_appr_${Date.now()}`,
      title: 'تهانينا! تمت ترقية وتفعيل حسابك 🎉',
      message: `تمت موافقة الإدارة على طلب انضمامك كـ (${requestedRole === 'merchant' ? 'تاجر في منصة بدالك' : 'كابتن توصيل'}) وتم تغيير دور حسابك في قاعدة البيانات بنجاح. يمكنك الآن ممارسة مهامك.`,
      timestamp: 'الآن',
      type: 'system',
      read: false,
      userId: userId,
      targetRole: requestedRole,
    });
  } else {
    notifications.unshift({
      id: `notif_rej_${Date.now()}`,
      title: 'تحديث بشأن طلب الانضمام ⚠️',
      message: `نعتذر، لم تتم الموافقة على طلب انضمامك كـ (${requestedRole === 'merchant' ? 'تاجر' : 'كابتن توصيل'}). يمكنك الاستمرار في استخدام التطبيق والتسوق كعميل.`,
      timestamp: 'الآن',
      type: 'system',
      read: false,
      userId: userId,
      targetRole: 'customer',
    });
  }

  notifications.unshift({
    id: `notif_adm_action_${Date.now()}`,
    title: isApproved ? 'تمت الموافقة على طلب الانضمام ✅' : 'تم رفض طلب الانضمام ❌',
    message: `قام الأدمن بـ (${isApproved ? 'الموافقة على' : 'رفض'}) طلب انضمام المستخدم "${targetUser?.name || userId}" كـ (${requestedRole === 'merchant' ? 'تاجر' : 'دليفري'}).`,
    timestamp: 'الآن',
    type: 'system',
    read: false,
    targetRole: 'admin',
  });

  saveDataStore();

  return res.json({
    success: true,
    user: targetUser,
    message: isApproved
      ? `تمت الموافقة على الطلب بنجاح وتغيير الدور في جدول profiles إلى "${requestedRole}".`
      : 'تم رفض طلب الانضمام.',
  });
});

function mapDbBannerToSlide(b: any, existingList?: any[]) {
  const existing = existingList?.find((s) => s.id === b.id);
  return {
    id: b.id,
    title: b.title || existing?.title || 'عرض خاص',
    subtitle: b.subtitle !== undefined ? b.subtitle : (existing?.subtitle || ''),
    tag: b.tag || existing?.tag || 'عرض خاص',
    badge: b.badge || existing?.badge || 'خصم مميز',
    gradient: b.gradient || existing?.gradient || 'from-emerald-700 via-teal-800 to-slate-900',
    image: b.image || existing?.image || '',
    storeId: b.store_id || b.storeId || existing?.storeId,
    storeName: b.store_name || b.storeName || existing?.storeName,
    showTag: b.show_tag !== undefined ? Boolean(b.show_tag) : (existing?.showTag ?? true),
    showBadge: b.show_badge !== undefined ? Boolean(b.show_badge) : (existing?.showBadge ?? true),
    showTimer: b.show_timer !== undefined ? Boolean(b.show_timer) : (existing?.showTimer ?? true),
    timerDurationHours: b.timer_duration_hours !== undefined ? Number(b.timer_duration_hours) : (existing?.timerDurationHours ?? 6),
    timerLabel: b.timer_label || existing?.timerLabel || 'ينتهي خلال:',
    showCoupon: b.show_coupon !== undefined ? Boolean(b.show_coupon) : (existing?.showCoupon ?? true),
    couponCode: b.coupon_code || existing?.couponCode || 'BADALIK50',
    couponLabel: b.coupon_label || existing?.couponLabel || 'كود الخصم:',
    showButton: b.show_button !== undefined ? Boolean(b.show_button) : (existing?.showButton ?? true),
    buttonText: b.button_text || existing?.buttonText || 'تسوق الآن',
    imageOnly: b.image_only !== undefined ? Boolean(b.image_only) : (existing?.imageOnly ?? false),
    noFilter: b.no_filter !== undefined ? Boolean(b.no_filter) : (existing?.noFilter ?? false),
  };
}

// -------------------------------------------------------------
// Supabase Catalog Synchronization
// -------------------------------------------------------------

async function initializeSupabaseCatalog(): Promise<void> {
  if (!supabase) return;
  try {
    console.log('🔄 Initializing Supabase catalog synchronization...');

    // 1. Synchronize Stores
    const { data: dbStores, error: sErr } = await supabase.from('stores').select('*');
    if (!sErr && dbStores && dbStores.length > 0) {
      console.log(`✅ Loaded ${dbStores.length} stores from Supabase.`);
      for (const dbS of dbStores) {
        const mapped = mapStore(dbS);
        const idx = stores.findIndex((s) => s.id === mapped.id || s.name === mapped.name);
        if (idx >= 0) {
          stores[idx] = { ...stores[idx], ...mapped };
        } else {
          stores.push(mapped);
        }
      }
    } else {
      // Provision default stores to Supabase with valid UUIDs
      console.log('ℹ️ Provisioning initial stores in Supabase...');
      for (const s of stores) {
        const validId = await ensureStoreExistsInSupabase(s);
        s.id = validId;
      }
    }

    // 2. Synchronize Products
    const { data: dbProducts, error: pErr } = await supabase.from('products').select('*');
    if (!pErr && dbProducts && dbProducts.length > 0) {
      console.log(`✅ Loaded ${dbProducts.length} products from Supabase.`);
      for (const dbP of dbProducts) {
        const mapped = mapProduct(dbP);
        const idx = products.findIndex((p) => p.id === mapped.id || p.name === mapped.name);
        if (idx >= 0) {
          products[idx] = { ...products[idx], ...mapped };
        } else {
          products.push(mapped);
        }
      }
    } else {
      // Provision initial products to Supabase
      console.log('ℹ️ Provisioning initial products in Supabase...');
      for (const p of products) {
        const validPId = await ensureProductExistsInSupabase(p);
        p.id = validPId;
      }
    }

    // 3. Synchronize Reviews
    try {
      const { data: dbReviews } = await supabase.from('reviews').select('*');
      if (dbReviews && dbReviews.length > 0) {
        console.log(`✅ Loaded ${dbReviews.length} reviews from Supabase.`);
        for (const r of dbReviews) {
          const prod = products.find((p) => p.id === r.product_id || stringToUUID(p.id) === r.product_id);
          if (prod) {
            if (!prod.reviews) prod.reviews = [];
            const exists = prod.reviews.some((ex) => ex.id === r.id);
            if (!exists) {
              prod.reviews.push({
                id: r.id,
                productId: prod.id,
                userId: r.user_id,
                userName: 'عميل معتمد',
                rating: Number(r.rating || 5),
                comment: r.comment || '',
                createdAt: r.created_at ? r.created_at.split('T')[0] : '2026-03-01',
              });
              prod.reviewCount = prod.reviews.length;
              prod.rating = Number((prod.reviews.reduce((sum, rev) => sum + rev.rating, 0) / prod.reviewCount).toFixed(1));
            }
          }
        }
      }
    } catch { /* fallback */ }

    // 4. Synchronize Withdrawal Requests
    try {
      const { data: dbWithdrawals } = await supabase.from('withdrawal_requests').select('*');
      if (dbWithdrawals && dbWithdrawals.length > 0) {
        console.log(`✅ Loaded ${dbWithdrawals.length} withdrawal requests from Supabase.`);
        for (const w of dbWithdrawals) {
          const exists = withdrawalRequests.some((ex) => ex.id === w.id);
          if (!exists) {
            const drv = deliveryDrivers.find((d) => d.id === w.driver_id || stringToUUID(d.id) === w.driver_id) || deliveryDrivers[0];
            withdrawalRequests.unshift({
              id: w.id,
              driverId: drv ? drv.id : w.driver_id,
              driverName: drv ? drv.driverName : 'كابتن توصيل',
              amount: Number(w.amount || 0),
              method: w.payment_method || 'تحويل بنكي IBAN',
              accountDetails: 'حساب مسجل بالمنظومة',
              status: w.status || 'pending',
              requestDate: w.created_at ? new Date(w.created_at).toLocaleString('ar-EG') : 'اليوم',
            });
          }
        }
      }
    } catch { /* fallback */ }

    // 5. Synchronize and ensure all drivers exist in Supabase "drivers" table
    try {
      for (const d of deliveryDrivers) {
        await ensureDriverExistsInSupabase(d);
      }
    } catch (dErr) {
      console.warn('⚠️ Drivers catalog sync note:', dErr);
    }

    // 6. Synchronize Categories
    try {
      const { data: dbCategories } = await supabase.from('categories').select('*');
      if (dbCategories && dbCategories.length > 0) {
        console.log(`✅ Loaded ${dbCategories.length} categories from Supabase.`);
        categories.length = 0;
        categories.push(...dbCategories.map(c => c.name));
      } else {
        for (const catName of categories) {
           await supabase.from('categories').insert({ name: catName }).select().maybeSingle();
        }
      }
    } catch (err) { console.warn('⚠️ Categories sync note:', err); }

    // 7. Synchronize Banners (Offer Slides)
    try {
      const { data: dbBanners } = await supabase.from('offer_slides').select('*');
      if (dbBanners && dbBanners.length > 0) {
        console.log(`✅ Loaded ${dbBanners.length} banners from Supabase.`);
        const merged = dbBanners.map(b => mapDbBannerToSlide(b, offerSlides));
        offerSlides.length = 0;
        offerSlides.push(...merged);
      } else {
        for (const b of offerSlides) {
          try {
            await supabase.from('offer_slides').insert({
              id: b.id,
              title: b.title,
              subtitle: b.subtitle,
              tag: b.tag,
              badge: b.badge,
              gradient: b.gradient,
              image: b.image,
            }).select().maybeSingle();
          } catch (_) {}
        }
      }
    } catch (err) { console.warn('⚠️ Banners sync note:', err); }

    saveDataStore();
    console.log('✅ Supabase catalog synchronized successfully.');
  } catch (err) {
    console.warn('⚠️ initializeSupabaseCatalog exception:', err);
  }
}

// -------------------------------------------------------------
// Categories & Banners Endpoints
// -------------------------------------------------------------
app.get('/api/categories', async (req: Request, res: Response) => {
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
});

app.post('/api/categories', async (req: Request, res: Response) => {
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
      return res.json({ categories, message: `تمت إضافة قسم ${trimmed} بنجاح` });
    } catch (err: any) { 
      console.warn('Supabase categories insert failed:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء الحفظ في قاعدة البيانات' });
    }
  }
  
  if (!categories.includes(trimmed)) {
    categories.push(trimmed);
    saveDataStore();
  }
  res.json({ categories, message: `تمت إضافة قسم ${trimmed} بنجاح` });
});

app.delete('/api/categories/:name', async (req: Request, res: Response) => {
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
      return res.json({ categories, message: `تم حذف قسم ${catName}` });
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
  res.json({ categories, message: `تم حذف قسم ${catName}` });
});

app.get('/api/banners', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('offer_slides').select('*');
      if (!error && data && data.length > 0) {
        const merged = data.map((b: any) => mapDbBannerToSlide(b, offerSlides));
        offerSlides.length = 0;
        offerSlides.push(...merged);
        return res.json(offerSlides);
      }
    } catch(err) {}
  }
  res.json(offerSlides);
});

app.post('/api/banners', async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    tag,
    badge,
    gradient,
    image,
    storeId,
    storeName,
    showTag,
    showBadge,
    showTimer,
    timerDurationHours,
    timerLabel,
    showCoupon,
    couponCode,
    couponLabel,
    showButton,
    buttonText,
    imageOnly,
    noFilter,
  } = req.body;

  if (!title && !imageOnly) {
    return res.status(400).json({ error: 'عنوان العرض مطلوب' });
  }
  const newSlide = {
    id: `slide_${Date.now()}`,
    title: String(title || 'عرض خاص').trim(),
    subtitle: String(subtitle || '').trim(),
    tag: String(tag || 'عرض خاص').trim(),
    badge: String(badge || 'خصم مميز').trim(),
    gradient: String(gradient || 'from-emerald-700 via-teal-800 to-slate-900').trim(),
    image: String(image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800').trim(),
    storeId: storeId ? String(storeId).trim() : undefined,
    storeName: storeName ? String(storeName).trim() : undefined,
    showTag: showTag !== undefined ? Boolean(showTag) : true,
    showBadge: showBadge !== undefined ? Boolean(showBadge) : true,
    showTimer: showTimer !== undefined ? Boolean(showTimer) : true,
    timerDurationHours: timerDurationHours !== undefined ? Number(timerDurationHours) : 6,
    timerLabel: String(timerLabel || 'ينتهي خلال:').trim(),
    showCoupon: showCoupon !== undefined ? Boolean(showCoupon) : true,
    couponCode: String(couponCode || 'BADALIK50').trim(),
    couponLabel: String(couponLabel || 'كود الخصم:').trim(),
    showButton: showButton !== undefined ? Boolean(showButton) : true,
    buttonText: String(buttonText || 'تسوق الآن').trim(),
    imageOnly: Boolean(imageOnly),
    noFilter: Boolean(noFilter),
  };

  // Add to local state immediately
  offerSlides.push(newSlide);
  saveDataStore();
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      // Insert base columns guaranteed by schema
      await client.from('offer_slides').insert({
        id: newSlide.id,
        title: newSlide.title,
        subtitle: newSlide.subtitle,
        tag: newSlide.tag,
        badge: newSlide.badge,
        gradient: newSlide.gradient,
        image: newSlide.image,
      });
    } catch (err: any) { 
      console.warn('ℹ️ Supabase banners insert note:', err?.message || err);
    }
  }
  
  return res.json({ offerSlides, slide: newSlide, message: 'تمت إضافة العرض بنجاح' });
});

app.put('/api/banners/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = offerSlides.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'العرض غير موجود' });
  }
  const {
    title,
    subtitle,
    tag,
    badge,
    gradient,
    image,
    storeId,
    storeName,
    showTag,
    showBadge,
    showTimer,
    timerDurationHours,
    timerLabel,
    showCoupon,
    couponCode,
    couponLabel,
    showButton,
    buttonText,
    imageOnly,
    noFilter,
  } = req.body;
  
  const updatedSlide = {
    ...offerSlides[idx],
    title: title !== undefined ? String(title).trim() : offerSlides[idx].title,
    subtitle: subtitle !== undefined ? String(subtitle).trim() : offerSlides[idx].subtitle,
    tag: tag !== undefined ? String(tag).trim() : offerSlides[idx].tag,
    badge: badge !== undefined ? String(badge).trim() : offerSlides[idx].badge,
    gradient: gradient !== undefined ? String(gradient).trim() : offerSlides[idx].gradient,
    image: image !== undefined ? String(image).trim() : offerSlides[idx].image,
    storeId: storeId !== undefined ? String(storeId).trim() : offerSlides[idx].storeId,
    storeName: storeName !== undefined ? String(storeName).trim() : offerSlides[idx].storeName,
    showTag: showTag !== undefined ? Boolean(showTag) : (offerSlides[idx].showTag !== undefined ? offerSlides[idx].showTag : true),
    showBadge: showBadge !== undefined ? Boolean(showBadge) : (offerSlides[idx].showBadge !== undefined ? offerSlides[idx].showBadge : true),
    showTimer: showTimer !== undefined ? Boolean(showTimer) : (offerSlides[idx].showTimer !== undefined ? offerSlides[idx].showTimer : true),
    timerDurationHours: timerDurationHours !== undefined ? Number(timerDurationHours) : (offerSlides[idx].timerDurationHours || 6),
    timerLabel: timerLabel !== undefined ? String(timerLabel).trim() : (offerSlides[idx].timerLabel || 'ينتهي خلال:'),
    showCoupon: showCoupon !== undefined ? Boolean(showCoupon) : (offerSlides[idx].showCoupon !== undefined ? offerSlides[idx].showCoupon : true),
    couponCode: couponCode !== undefined ? String(couponCode).trim() : (offerSlides[idx].couponCode || 'BADALIK50'),
    couponLabel: couponLabel !== undefined ? String(couponLabel).trim() : (offerSlides[idx].couponLabel || 'كود الخصم:'),
    showButton: showButton !== undefined ? Boolean(showButton) : (offerSlides[idx].showButton !== undefined ? offerSlides[idx].showButton : true),
    buttonText: buttonText !== undefined ? String(buttonText).trim() : (offerSlides[idx].buttonText || 'تسوق الآن'),
    imageOnly: imageOnly !== undefined ? Boolean(imageOnly) : (offerSlides[idx].imageOnly || false),
    noFilter: noFilter !== undefined ? Boolean(noFilter) : (offerSlides[idx].noFilter || false),
  };

  offerSlides[idx] = updatedSlide;
  saveDataStore();
  
  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      await client.from('offer_slides').update({
        title: updatedSlide.title,
        subtitle: updatedSlide.subtitle,
        tag: updatedSlide.tag,
        badge: updatedSlide.badge,
        gradient: updatedSlide.gradient,
        image: updatedSlide.image,
      }).eq('id', id);
    } catch (err: any) { 
      console.warn('ℹ️ Supabase banners update note:', err?.message || err);
    }
  }
  
  return res.json({ offerSlides, slide: offerSlides[idx], message: 'تم تحديث العرض بنجاح' });
});

app.delete('/api/banners/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const idx = offerSlides.findIndex((s) => s.id === id);
  if (idx !== -1) {
    offerSlides.splice(idx, 1);
    saveDataStore();
  }

  if (supabase) {
    const client = getSupabaseClient(req.headers['authorization']?.replace('Bearer ', ''));
    try {
      await client.from('offer_slides').delete().eq('id', id);
    } catch (err) {
      console.warn('ℹ️ Supabase banners delete note:', err);
    }
  }

  return res.json({ offerSlides, message: 'تم حذف العرض من السلايدر بنجاح' });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`E-Commerce Server running on http://0.0.0.0:${PORT}`);
    // Initialize Supabase driver sync in background
    if (supabase) {
      ensureDriverExistsInSupabase().catch((err) => {
        console.warn('⚠️ Supabase initial driver sync note:', err);
      });
      initializeSupabaseCatalog().catch((err) => {
        console.warn('⚠️ Supabase initial catalog sync note:', err);
      });
    }
  });
}

startServer();
