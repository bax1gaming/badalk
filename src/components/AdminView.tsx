import React, { useState } from 'react';
import {
  User,
  Store,
  Product,
  Order,
  DeliveryProfile,
  WithdrawalRequest,
  JoinRequest,
} from '../types.ts';
import {
  ShieldCheck,
  Users,
  Store as StoreIcon,
  Truck,
  ShoppingBag,
  DollarSign,
  Fuel,
  Navigation,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  Eye,
  EyeOff,
  Ticket,
  SlidersHorizontal,
  Sparkles,
  Check,
  UserPlus,
  UserCheck,
  Building2,
  Bike,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface AdminViewProps {
  users: User[];
  stores: Store[];
  products: Product[];
  orders: Order[];
  drivers: DeliveryProfile[];
  withdrawals: WithdrawalRequest[];
  onApproveWithdrawal: (id: string) => Promise<void>;
  onApproveStore?: (storeId: string, approved: boolean) => Promise<void>;
  onApproveDriver?: (driverId: string, approved: boolean) => Promise<void>;
  onApproveJoinRequest?: (userId: string, requestedRole: 'merchant' | 'delivery', approved: boolean) => Promise<void>;
  joinRequests?: { deliveryRequests: any[]; merchantRequests: any[]; pendingCount: number };
  categories?: string[];
  onAddCategory?: (name: string) => Promise<void>;
  onDeleteCategory?: (name: string) => Promise<void>;
  offerSlides?: any[];
  onAddOfferSlide?: (slide: any) => Promise<void>;
  onUpdateOfferSlide?: (id: string, slide: any) => Promise<void>;
  onDeleteOfferSlide?: (id: string) => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  users,
  stores,
  products,
  orders,
  drivers,
  withdrawals,
  onApproveWithdrawal,
  onApproveStore,
  onApproveDriver,
  onApproveJoinRequest,
  joinRequests,
  categories = [],
  onAddCategory,
  onDeleteCategory,
  offerSlides = [],
  onAddOfferSlide,
  onUpdateOfferSlide,
  onDeleteOfferSlide,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'join-requests' | 'users' | 'drivers' | 'merchants' | 'orders' | 'content'>('overview');
  const [userSearch, setUserSearch] = useState('');

  // Join Requests States
  const [joinSubTab, setJoinSubTab] = useState<'delivery' | 'merchants'>('delivery');
  const [joinStatusFilter, setJoinStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [joinSearch, setJoinSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Content Management States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    tag: 'عرض اليوم',
    badge: 'توصيل موحد 16 ج.م',
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
    image: '',
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
  });

  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const pendingStores = stores.filter((s) => s.isApproved === false);
  const pendingDrivers = drivers.filter((d) => d.isApproved === false);

  // -------------------------------------------------------------
  // Join Requests Calculation (كباتن ومحلات من جدول join_requests في Supabase)
  // -------------------------------------------------------------
  const deliveryJoinRequests =
    joinRequests?.deliveryRequests && joinRequests.deliveryRequests.length > 0
      ? joinRequests.deliveryRequests
      : users
          .filter((u) => {
            const drv = drivers.find((d) => d.userId === u.id || d.id === u.id);
            return (
              u.requestedRole === 'delivery' ||
              (drv && drv.isApproved === false) ||
              (u.role === 'delivery' && u.approvalStatus === 'pending')
            );
          })
          .map((u) => {
            const drv = drivers.find((d) => d.userId === u.id || d.id === u.id);
            let status: 'pending' | 'approved' | 'rejected' =
              u.approvalStatus || (u.role === 'delivery' && drv?.isApproved !== false ? 'approved' : 'pending');
            if (drv && drv.isApproved === false && status === 'approved') status = 'pending';
            return {
              id: `req_drv_${u.id}`,
              userId: u.id,
              userName: u.name,
              userEmail: u.email,
              userPhone: u.phone,
              requestedRole: 'delivery' as const,
              status: status,
              currentRole: u.role,
              createdAt: u.createdAt || 'اليوم',
              driverId: drv?.id,
              vehicleType: u.vehicleType || drv?.vehicleType || 'موتوسيكل',
              plateNumber: u.plateNumber || drv?.plateNumber || 'ق ن أ 1234',
            };
          });

  const merchantJoinRequests =
    joinRequests?.merchantRequests && joinRequests.merchantRequests.length > 0
      ? joinRequests.merchantRequests
      : users
          .filter((u) => {
            const st = stores.find((s) => s.ownerId === u.id || s.id === u.storeId);
            return (
              u.requestedRole === 'merchant' ||
              (st && st.isApproved === false) ||
              (u.role === 'merchant' && u.approvalStatus === 'pending')
            );
          })
          .map((u) => {
            const st = stores.find((s) => s.ownerId === u.id || s.id === u.storeId);
            let status: 'pending' | 'approved' | 'rejected' =
              u.approvalStatus || (u.role === 'merchant' && st?.isApproved !== false ? 'approved' : 'pending');
            if (st && st.isApproved === false && status === 'approved') status = 'pending';
            return {
              id: `req_mrc_${u.id}`,
              userId: u.id,
              userName: u.name,
              userEmail: u.email,
              userPhone: u.phone,
              requestedRole: 'merchant' as const,
              status: status,
              currentRole: u.role,
              createdAt: u.createdAt || 'اليوم',
              storeId: st?.id || u.storeId,
              storeName: u.storeName || st?.name || `متجر ${u.name}`,
              storeCategory: u.storeCategory || st?.category || 'سوبرماركت',
              storeAddress: u.storeAddress || st?.address || 'شارع الجمهورية، قنا',
            };
          });

  const pendingJoinCount =
    deliveryJoinRequests.filter((r) => r.status === 'pending').length +
    merchantJoinRequests.filter((r) => r.status === 'pending').length;

  const handleApproveAction = async (userId: string, requestedRole: 'merchant' | 'delivery', approved: boolean) => {
    setActionLoadingId(userId);
    try {
      if (onApproveJoinRequest) {
        await onApproveJoinRequest(userId, requestedRole, approved);
      }
    } catch (err) {
      console.error('Error during role approval:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Global platform metrics
  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPlatformCommission = Math.round(totalGMV * 0.1); // 10%
  const totalCompletedOrders = orders.filter((o) => o.status === 'delivered').length;

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Top Header - Cyber Glass Banner */}
      <div className="bg-slate-950/95 dark:bg-slate-950/95 text-white rounded-3xl p-6 sm:p-7 shadow-[0_0_25px_rgba(0,0,0,0.25)] border border-slate-800/80 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FF6B00]/15 to-[#00B4D8]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8533] flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(255,107,0,0.4)] text-white">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-orange-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                لوحة التحكم الإدارية المركزية
              </span>
              <span className="text-xs text-slate-400">تحكم كامل ومراقبة حية</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1 text-white">
              إدارة المنصة والعمليات متعددة التجار
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 relative z-10 bg-slate-900/80 px-3.5 py-2 rounded-2xl border border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
          <span>حالة السيرفر وقاعدة البيانات: متصل وآمن</span>
        </div>
      </div>

      {/* High-level KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-400">
            <span className="text-xs font-bold">إجمالي مبيعات المنصة (GMV)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">
            {totalGMV} <span className="text-sm font-sans font-bold text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            عمولة المنصة المقدرة: <span className="font-digits font-black">{totalPlatformCommission}</span> ج.م
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-400">
            <span className="text-xs font-bold">إجمالي الطلبات المنفذة</span>
            <div className="w-8 h-8 rounded-xl bg-[#00B4D8]/10 text-[#00B4D8] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">{orders.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            منها <span className="font-digits font-bold text-emerald-600 dark:text-emerald-400">{totalCompletedOrders}</span> تم تسليمها بنجاح
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-400">
            <span className="text-xs font-bold">المتاجر النشطة</span>
            <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
              <StoreIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">{stores.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            تحتوي على <span className="font-digits font-bold text-slate-700 dark:text-slate-300">{products.length}</span> منتج نشط
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-400">
            <span className="text-xs font-bold">أسطول الدليفري النشط</span>
            <div className="w-8 h-8 rounded-xl bg-[#00B4D8]/10 text-[#00B4D8] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">{drivers.length}</div>
          <div className="text-[11px] font-bold flex items-center gap-1.5 mt-1">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-digits">{drivers.filter((d) => d.isOnline).length}</span> متصل
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span className="font-digits">{drivers.filter((d) => !d.isOnline).length}</span> غير متصل
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>نظرة عامة والطلبات المعلقة</span>
        </button>

        <button
          onClick={() => setActiveTab('join-requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'join-requests'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>طلبات الانضمام (دليفري ومحلات)</span>
          {pendingJoinCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full font-digits animate-pulse">
              {pendingJoinCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>كل المستخدمين وأدوارهم (<span className="font-digits">{users.length}</span>)</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'drivers'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>أداء الدليفري (الكاش، الكيلومترات، والبنزين)</span>
        </button>

        <button
          onClick={() => setActiveTab('merchants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'merchants'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>أداء المتاجر والمبيعات والعملاء</span>
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'content'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>إدارة المحتوى والأقسام</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Overview & Pending Approvals */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Quick Notice: Pending Join Requests */}
          {pendingJoinCount > 0 && (
            <div className="bg-gradient-to-r from-amber-500/15 via-[#FF6B00]/15 to-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">
                    يوجد <span className="font-digits text-[#FF6B00]">{pendingJoinCount}</span> طلب انضمام جديد (دليفري ومحلات) بانتظار موافقتك!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    الحسابات مسجلة كعملاء وتنتظر اعتمادك لترقية الدور في جدول profiles.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('join-requests')}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>مراجعة طلبات الانضمام الآن</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Stores Approval */}
          {pendingStores.length > 0 && (
            <div className="bg-[#FF6B00]/5 border-2 border-[#FF6B00]/30 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <StoreIcon className="w-5 h-5 text-[#FF6B00]" />
                  <span>طلبات تسجيل المتاجر الجديدة المعلقة للموافقة (<span className="font-digits">{pendingStores.length}</span>):</span>
                </h3>
                <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 font-bold text-[11px] px-3 py-1 rounded-full animate-pulse">
                  يتطلب قرار الأدمن لتظهر في الموقع
                </span>
              </div>

              <div className="space-y-3">
                {pendingStores.map((store) => (
                  <div
                    key={store.id}
                    className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                      />
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm">{store.name}</div>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                          التصنيف: <span className="font-bold text-[#FF6B00]">{store.category}</span> • العنوان: {store.address}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          الهاتف: <span className="font-mono font-digits">{store.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveStore?.(store.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>موافقة واعتماد المتجر</span>
                      </button>
                      <button
                        onClick={() => onApproveStore?.(store.id, false)}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all cursor-pointer"
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Drivers Approval */}
          {pendingDrivers.length > 0 && (
            <div className="bg-[#00B4D8]/5 border-2 border-[#00B4D8]/30 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#00B4D8]" />
                  <span>طلبات تسجيل مندوبي التوصيل المعلقة للموافقة (<span className="font-digits">{pendingDrivers.length}</span>):</span>
                </h3>
                <span className="bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30 font-bold text-[11px] px-3 py-1 rounded-full animate-pulse">
                  يتطلب قرار الأدمن لاستلام الطلبات
                </span>
              </div>

              <div className="space-y-3">
                {pendingDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-black text-slate-900 dark:text-white text-sm">{driver.driverName}</div>
                      <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                        مركبة التوصيل: <span className="font-bold text-[#00B4D8]">{driver.vehicleType}</span> • رقم اللوحة: <span className="font-mono font-bold font-digits">{driver.plateNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveDriver?.(driver.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>موافقة واعتماد المندوب</span>
                      </button>
                      <button
                        onClick={() => onApproveDriver?.(driver.id, false)}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all cursor-pointer"
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Withdrawals to approve */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>طلبات سحب أموال المناديب المعلقة للموافقة:</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                مراجعة وتأكيد التحويل لحساب المندوب
              </span>
            </div>

            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      طلب سحب من: {w.driverName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      المبلغ: <span className="font-black text-[#FF6B00] font-digits">{w.amount}</span> ج.م •
                      الطريقة: {w.method} • الآيبان / الحساب: <span className="font-mono font-digits">{w.accountDetails}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      تاريخ التقديم: <span className="font-digits">{w.requestDate}</span>
                    </div>
                  </div>

                  <div>
                    {w.status === 'pending' ? (
                      <button
                        onClick={() => onApproveWithdrawal(w.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        الموافقة والتحويل الفوري
                      </button>
                    ) : (
                      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1 rounded-xl text-xs">
                        تمت الموافقة والتحويل
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: Join Requests (طلبات الانضمام: دليفري ومحلات) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'join-requests' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#FF6B00]/10 via-[#00B4D8]/10 to-transparent border border-slate-200/80 dark:border-white/10 p-6 rounded-3xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-[#FF6B00] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    نظام اعتماد الحسابات المركزي
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    جدول profiles • عمود role
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  طلبات الانضمام (قسم الدليفري وقسم المحلات)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  يسجل المستخدم أولاً كعميل عادي. عند موافقة الأدمن، يتم فوراً تغيير الدور في قاعدة البيانات في جدول <span className="font-mono font-bold text-[#FF6B00]">profiles</span> عمود <span className="font-mono font-bold text-[#FF6B00]">role</span> إلى <span className="font-mono font-bold text-[#00B4D8]">merchant</span> أو <span className="font-mono font-bold text-[#00B4D8]">delivery</span> وتفعيل حسابه.
                </p>
              </div>

              {/* Stat Counters */}
              <div className="flex items-center gap-3">
                <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl text-center min-w-[105px] shadow-xs">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">بانتظار القرار</div>
                  <div className="text-2xl font-black text-[#FF6B00] font-digits">{pendingJoinCount}</div>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl text-center min-w-[105px] shadow-xs">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">كباتن دليفري</div>
                  <div className="text-2xl font-black text-[#00B4D8] font-digits">{deliveryJoinRequests.length}</div>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl text-center min-w-[105px] shadow-xs">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">محلات وتجار</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-digits">{merchantJoinRequests.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Delivery vs Merchant + Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            {/* Split Subsections Buttons */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => setJoinSubTab('delivery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  joinSubTab === 'delivery'
                    ? 'bg-[#00B4D8] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>جزء كباتن الدليفري</span>
                <span className="bg-white/20 text-white font-digits text-[10px] px-1.5 py-0.5 rounded-full">
                  {deliveryJoinRequests.length}
                </span>
                {deliveryJoinRequests.some((r) => r.status === 'pending') && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => setJoinSubTab('merchants')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  joinSubTab === 'merchants'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <StoreIcon className="w-4 h-4" />
                <span>جزء أصحاب المحلات</span>
                <span className="bg-white/20 text-white font-digits text-[10px] px-1.5 py-0.5 rounded-full">
                  {merchantJoinRequests.length}
                </span>
                {merchantJoinRequests.some((r) => r.status === 'pending') && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف..."
                  value={joinSearch}
                  onChange={(e) => setJoinSearch(e.target.value)}
                  className="pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setJoinStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      joinStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'all' && 'الكل'}
                    {st === 'pending' && 'قيد الانتظار'}
                    {st === 'approved' && 'معتمد'}
                    {st === 'rejected' && 'مرفوض'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* SECTION 1: DELIVERY JOIN REQUESTS (جزء الدليفري) */}
          {/* --------------------------------------------------------- */}
          {joinSubTab === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00B4D8]/10 text-[#00B4D8] flex items-center justify-center font-black">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                      طلبات انضمام كباتن الدليفري
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      مراجعة بيانات المركبة ورقم اللوحة والموافقة على الترقية لدور كابتن
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  عدد الطلبات: <span className="font-digits font-black text-slate-900 dark:text-white">{deliveryJoinRequests.length}</span>
                </span>
              </div>

              {deliveryJoinRequests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 space-y-2">
                  <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    لا توجد طلبات انضمام كباتن دليفري حالياً
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliveryJoinRequests
                    .filter((req) => {
                      if (joinStatusFilter !== 'all' && req.status !== joinStatusFilter) return false;
                      if (!joinSearch) return true;
                      const q = joinSearch.toLowerCase();
                      return (
                        req.userName.toLowerCase().includes(q) ||
                        req.userPhone.includes(q) ||
                        req.userEmail.toLowerCase().includes(q) ||
                        req.plateNumber.toLowerCase().includes(q)
                      );
                    })
                    .map((req) => {
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      const isLoading = actionLoadingId === req.userId;

                      return (
                        <div
                          key={req.id}
                          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all space-y-4 shadow-xs ${
                            isPending
                              ? 'border-amber-400/50 dark:border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/5 ring-1 ring-amber-400/20'
                              : isApproved
                              ? 'border-emerald-500/30 dark:border-emerald-500/20'
                              : 'border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00B4D8] to-cyan-400 flex items-center justify-center text-white font-black text-base shadow-sm">
                                <Bike className="w-6 h-6" />
                              </div>
                              <div>
                                <h5 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                  <span>{req.userName}</span>
                                </h5>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>تاريخ التسجيل: <span className="font-digits">{req.createdAt.split('T')[0] || req.createdAt}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>قيد انتظار الموافقة (عميل حالياً)</span>
                                </span>
                              ) : isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>معتمد ككابتن (profiles.role = delivery)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3 h-3" />
                                  <span>تم رفض الطلب (مستمر كعميل)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Contact & Vehicle Info Box */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">الهاتف:</span>
                              <a
                                href={`tel:${req.userPhone}`}
                                className="font-digits font-bold text-slate-800 dark:text-white flex items-center gap-1 hover:text-[#00B4D8]"
                                dir="ltr"
                              >
                                <Phone className="w-3 h-3 text-[#00B4D8]" />
                                <span>{req.userPhone}</span>
                              </a>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">البريد الإلكتروني:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300 truncate block text-[11px]">
                                {req.userEmail}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">نوع المركبة:</span>
                              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                <Truck className="w-3 h-3 text-[#FF6B00]" />
                                <span>{req.vehicleType}</span>
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">رقم اللوحة:</span>
                              <span className="font-digits font-black text-[#00B4D8] bg-[#00B4D8]/10 px-2 py-0.5 rounded-md inline-block">
                                {req.plateNumber}
                              </span>
                            </div>
                          </div>

                          {/* State Info */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                            <span>الدور الحالي في النظام: <strong className="text-slate-700 dark:text-slate-200">{req.currentRole}</strong></span>
                            <span>المطلوب: <strong className="text-[#00B4D8]">delivery</strong></span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleApproveAction(req.userId, 'delivery', true)}
                                  disabled={isLoading}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>موافقة وترقية الدور لـ delivery</span>
                                </button>

                                <button
                                  onClick={() => handleApproveAction(req.userId, 'delivery', false)}
                                  disabled={isLoading}
                                  className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>رفض الطلب</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-slate-500">
                                  {isApproved ? 'تم تفعيل حساب الكابتن بنجاح' : 'الطلب مرفوض ويمكن إعادة مراجعته'}
                                </span>
                                <button
                                  onClick={() => handleApproveAction(req.userId, 'delivery', !isApproved)}
                                  disabled={isLoading}
                                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#FF6B00] underline cursor-pointer"
                                >
                                  {isApproved ? 'تجميد الدور والعودة لعميل' : 'إعادة الموافقة والترقية'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* SECTION 2: MERCHANT JOIN REQUESTS (جزء المحلات) */}
          {/* --------------------------------------------------------- */}
          {joinSubTab === 'merchants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center font-black">
                    <StoreIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                      طلبات انضمام أصحاب المحلات والمتاجر
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      مراجعة بيانات المتجر والتصنيف وعنوانه في قنا والموافقة على ترقية الحساب لتاجر
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  عدد المحلات: <span className="font-digits font-black text-slate-900 dark:text-white">{merchantJoinRequests.length}</span>
                </span>
              </div>

              {merchantJoinRequests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 space-y-2">
                  <StoreIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    لا توجد طلبات انضمام محلات حالياً
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {merchantJoinRequests
                    .filter((req) => {
                      if (joinStatusFilter !== 'all' && req.status !== joinStatusFilter) return false;
                      if (!joinSearch) return true;
                      const q = joinSearch.toLowerCase();
                      return (
                        req.userName.toLowerCase().includes(q) ||
                        req.userPhone.includes(q) ||
                        req.userEmail.toLowerCase().includes(q) ||
                        req.storeName.toLowerCase().includes(q) ||
                        req.storeCategory.toLowerCase().includes(q)
                      );
                    })
                    .map((req) => {
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      const isLoading = actionLoadingId === req.userId;

                      return (
                        <div
                          key={req.id}
                          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all space-y-4 shadow-xs ${
                            isPending
                              ? 'border-amber-400/50 dark:border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/5 ring-1 ring-amber-400/20'
                              : isApproved
                              ? 'border-emerald-500/30 dark:border-emerald-500/20'
                              : 'border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 flex items-center justify-center text-white font-black text-base shadow-sm">
                                <Building2 className="w-6 h-6" />
                              </div>
                              <div>
                                <h5 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                  <span>{req.storeName}</span>
                                </h5>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <span>مالك المتجر: <strong className="text-slate-700 dark:text-slate-200">{req.userName}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>قيد انتظار الموافقة (عميل حالياً)</span>
                                </span>
                              ) : isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>معتمد كتاجر (profiles.role = merchant)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3 h-3" />
                                  <span>تم رفض الطلب (مستمر كعميل)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Store Details Box */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">تصنيف المتجر:</span>
                              <span className="font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-md inline-block">
                                {req.storeCategory}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">الهاتف:</span>
                              <a
                                href={`tel:${req.userPhone}`}
                                className="font-digits font-bold text-slate-800 dark:text-white flex items-center gap-1 hover:text-[#FF6B00]"
                                dir="ltr"
                              >
                                <Phone className="w-3 h-3 text-[#FF6B00]" />
                                <span>{req.userPhone}</span>
                              </a>
                            </div>

                            <div className="col-span-2 space-y-0.5">
                              <span className="text-[10px] text-slate-400 block font-bold">عنوان المتجر في قنا:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {req.storeAddress}
                              </span>
                            </div>

                            <div className="col-span-2 space-y-0.5 border-t border-slate-200/40 dark:border-white/5 pt-1.5">
                              <span className="text-[10px] text-slate-400 block font-bold">البريد الإلكتروني للمالك:</span>
                              <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                {req.userEmail}
                              </span>
                            </div>
                          </div>

                          {/* State Info */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                            <span>الدور الحالي في النظام: <strong className="text-slate-700 dark:text-slate-200">{req.currentRole}</strong></span>
                            <span>المطلوب: <strong className="text-[#FF6B00]">merchant</strong></span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleApproveAction(req.userId, 'merchant', true)}
                                  disabled={isLoading}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>موافقة وترقية الدور لـ merchant</span>
                                </button>

                                <button
                                  onClick={() => handleApproveAction(req.userId, 'merchant', false)}
                                  disabled={isLoading}
                                  className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>رفض الطلب</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-slate-500">
                                  {isApproved ? 'تم تفعيل المتجر وترقية الحساب بنجاح' : 'الطلب مرفوض ويمكن إعادة مراجعته'}
                                </span>
                                <button
                                  onClick={() => handleApproveAction(req.userId, 'merchant', !isApproved)}
                                  disabled={isLoading}
                                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#FF6B00] underline cursor-pointer"
                                >
                                  {isApproved ? 'تجميد المتجر والعودة لعميل' : 'إعادة الموافقة والترقية'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Users & Roles */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                سجل المستخدمين وأدوارهم المحمية سيرفرياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التحقق من الرتب يتم بالكامل عبر السيرفر لمنع أي تلاعب
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="بحث بالاسم أو البريد..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-3 font-bold">المستخدم</th>
                  <th className="p-3 font-bold">البريد الإلكتروني</th>
                  <th className="p-3 font-bold">رقم الجوال</th>
                  <th className="p-3 font-bold">الدور في النظام (Role)</th>
                  <th className="p-3 font-bold">التحقق السيرفري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <img
                        src={u.avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2310b981' rx='50'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23ffffff'/%3E%3Cpath d='M20 85 C20 62, 35 55, 50 55 C65 55, 80 62, 80 85 Z' fill='%23ffffff'/%3E%3C/svg%3E"}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
                      />
                      <span>{u.name}</span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{u.email}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono font-digits">{u.phone}</td>
                    <td className="p-3">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-lg text-[11px] ${
                          u.role === 'admin'
                            ? 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30'
                            : u.role === 'merchant'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : u.role === 'delivery'
                            ? 'bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.role === 'admin'
                          ? 'مدير النظام (Admin)'
                          : u.role === 'merchant'
                          ? 'صاحب متجر (Merchant)'
                          : u.role === 'delivery'
                          ? 'مندوب توصيل (Delivery)'
                          : 'عميل المنصة (Customer)'}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>محقق وآمن</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Delivery Fleet Telemetry */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'drivers' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              بيانات ومقاييس مناديب الدليفري التفصيلية:
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              الديلفري عمل كام، حصل كام كاش، مشي كام كيلو، واستهلك قد ايه بنزين
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {drivers.map((drv) => (
              <div
                key={drv.id}
                className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00B4D8] to-[#0077B6] text-white flex items-center justify-center font-black shadow-[0_0_12px_rgba(0,180,216,0.3)]">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">
                        {drv.driverName}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {drv.vehicleType} • اللوحة: <span className="font-digits font-bold">{drv.plateNumber}</span>
                      </span>
                    </div>
                  </div>

                  {drv.isOnline ? (
                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      متصل الآن (Online)
                    </span>
                  ) : (
                    <span className="bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-300 dark:border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      غير متصل (Offline)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="text-slate-400 text-[11px]">عمل كام (الأرباح):</div>
                    <div className="font-black text-[#FF6B00] text-base mt-0.5 font-digits">
                      {drv.todayEarnings} <span className="text-xs font-sans">ج.م</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="text-slate-400 text-[11px]">حصل كام كاش:</div>
                    <div className="font-black text-[#00B4D8] text-base mt-0.5 font-digits">
                      {drv.totalCashCollected} <span className="text-xs font-sans">ج.م</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="text-slate-400 text-[11px]">مشي كام كيلو:</div>
                    <div className="font-black text-slate-900 dark:text-white text-base mt-0.5 font-digits">
                      {drv.todayKmDriven} <span className="text-xs font-sans">كم</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="text-slate-400 text-[11px]">استهلك بنزين قد ايه:</div>
                    <div className="font-black text-rose-600 dark:text-rose-400 text-base mt-0.5 font-digits">
                      {drv.fuelConsumedLiters} <span className="text-xs font-sans">لتر</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: Merchants Performance & Customer Orders */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'merchants' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              بيانات المتاجر والمبيعات وتفاصيل العملاء:
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يقدر يشوف باع ايه و بكام و قد ايه الكميه و تفاصيل العملاء اللي طلبو و طلباتهم و وصلت بعد قد ايه
            </p>
          </div>

          <div className="space-y-5">
            {stores.map((store) => {
              if (!store) return null;
              const storeOrders = (orders || []).filter((o) =>
                o && o.items && Array.isArray(o.items) && o.items.some((i) => i && i.storeId === store.id)
              );
              const storeProducts = (products || []).filter((p) => p && p.storeId === store.id);
              const totalRevenue = storeOrders.reduce((sum, order) => {
                const storeItems = (order.items || []).filter((i) => i && i.storeId === store.id);
                return sum + storeItems.reduce((iSum, it) => iSum + (it.price || 0) * (it.quantity || 1), 0);
              }, 0);

              return (
                <div
                  key={store.id}
                  className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                      />
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base">
                          {store.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {store.category} • {store.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hidden sm:block">
                        <span className="text-slate-400">إجمالي المبيعات: </span>
                        <span className="font-black text-[#FF6B00] font-digits">{totalRevenue} ج.م</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hidden sm:block">
                        <span className="text-slate-400">الطلبات: </span>
                        <span className="font-black text-slate-900 dark:text-white font-digits">{storeOrders.length}</span>
                      </div>
                      <button
                        onClick={() => setExpandedStoreId(expandedStoreId === store.id ? null : store.id)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {expandedStoreId === store.id ? (
                          <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Customer Orders Breakdown for this Store */}
                  {expandedStoreId === store.id && (
                    <div className="space-y-2 text-xs pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                        <span>تفاصيل طلبات العملاء من هذا المتجر وزمن الوصول:</span>
                        <div className="sm:hidden flex items-center gap-2">
                            <span className="font-black text-[#FF6B00] font-digits bg-white dark:bg-slate-900 px-2 py-1 rounded-md">{totalRevenue} ج.م</span>
                        </div>
                      </div>

                      {storeOrders.length === 0 ? (
                        <div className="text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 p-3 rounded-xl">
                          لا توجد طلبات مسجلة لهذا المتجر بعد
                        </div>
                      ) : (
                        storeOrders.map((ord) => {
                          if (!ord) return null;
                          const items = (ord.items || []).filter((i) => i && i.storeId === store.id);
                          return (
                            <div
                              key={ord.id}
                              className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  العميل: {ord.customerName} (<span className="font-digits">{ord.customerPhone}</span>)
                                </span>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                  الأصناف المشتراة:{' '}
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {items
                                      .map((it) => `${it.quantity}x ${it.productName}`)
                                      .join('، ')}
                                  </span>
                                </div>
                              </div>

                              <div className="text-left text-[11px]">
                                <div className="font-bold text-[#FF6B00] font-digits">
                                  القيمة: {items.reduce((acc, it) => acc + it.price * it.quantity, 0)} ج.م
                                </div>
                                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-[#00B4D8]" />
                                  <span>
                                    {ord.status === 'delivered'
                                      ? `وصلت بعد ~25 دقيقة (بتوقيت ${ord.deliveredAt})`
                                      : 'جاري التوصيل الآن'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: Content Management */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Categories Management */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#FF6B00]" />
              إدارة الأقسام
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="اسم القسم الجديد (مثال: أجبان، لحوم)"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
              />
              <button
                onClick={() => {
                  if (newCategoryName && onAddCategory) {
                    onAddCategory(newCategoryName);
                    setNewCategoryName('');
                  }
                }}
                className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#e66000] transition-colors"
              >
                إضافة
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => (
                <div key={idx} className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm border border-slate-200 dark:border-white/5">
                  <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                  <button 
                    onClick={() => onDeleteCategory && onDeleteCategory(cat)}
                    className="text-rose-500 hover:text-rose-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Slider Management */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#00B4D8]" />
                  <span>عروض السلايدر وإدارة المحتوى الترويجي (الصفحة الرئيسية)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تحكم كامل في ظهور أو إخفاء التاج، الشارة، العداد التنازلي، كود الخصم، وزر التسوق مع تخصيص نصوصها.
                </p>
              </div>
            </div>

            {/* Slide Creation & Editing Panel */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 mb-8">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-3">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#FF6B00]" />
                  <span>{isEditingSlide ? 'تعديل بيانات وإعدادات العرض' : 'إضافة عرض وسلايدر جديد'}</span>
                </h4>
                {isEditingSlide && (
                  <span className="text-[11px] bg-[#00B4D8]/10 text-[#00B4D8] font-bold px-2.5 py-1 rounded-full">
                    وضع التعديل النشط
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* 1. Basic Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      العنوان الرئيسي للعرض *
                    </label>
                    <input
                      type="text"
                      value={slideForm.title}
                      onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                      placeholder="مثال: طلب واحد مجمع لجميع احتياجاتك"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      العنوان الفرعي / الوصف *
                    </label>
                    <input
                      type="text"
                      value={slideForm.subtitle}
                      onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                      placeholder="مثال: اطلب الجبنة واللحمة والمخبوزات معاً في سلة واحدة"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رابط صورة الغلاف (URL)
                    </label>
                    <input
                      type="text"
                      value={slideForm.image}
                      onChange={(e) => setSlideForm({ ...slideForm, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      خلفية التدرج اللوني (Gradient)
                    </label>
                    <select
                      value={slideForm.gradient}
                      onChange={(e) => setSlideForm({ ...slideForm, gradient: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="none">بدون (بدون خلفية وتدرج لوني)</option>
                      <option value="from-emerald-700 via-teal-800 to-slate-900">أخضر زمردي متدرج (زمردي / بترولي)</option>
                      <option value="from-amber-700 via-rose-850 to-slate-900">عسلي ووردي متدرج (دافئ)</option>
                      <option value="from-blue-700 via-indigo-850 to-slate-900">أزرق نيي متدرج (فاخر)</option>
                      <option value="from-orange-700 via-amber-800 to-slate-900">برتقالي صعيدي متوهج</option>
                      <option value="from-purple-700 via-slate-800 to-slate-900">أرجواني ملكي داكن</option>
                    </select>
                  </div>
                </div>

                {/* 2. Interactive Controls & Visibility Blocks */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>التحكم في ظهور العناصر التفاعلية والبيانات المعروضة:</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Control 1: Tag */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#FF6B00]" />
                          التاج العلوي (Tag)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slideForm.showTag}
                            onChange={(e) => setSlideForm({ ...slideForm, showTag: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!slideForm.showTag}
                        value={slideForm.tag}
                        onChange={(e) => setSlideForm({ ...slideForm, tag: e.target.value })}
                        placeholder="نص التاج (مثال: عرض اليوم)"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    {/* Control 2: Badge */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#00B4D8]" />
                          الشارة الترويجية (Badge)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slideForm.showBadge}
                            onChange={(e) => setSlideForm({ ...slideForm, showBadge: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00B4D8]"></div>
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!slideForm.showBadge}
                        value={slideForm.badge}
                        onChange={(e) => setSlideForm({ ...slideForm, badge: e.target.value })}
                        placeholder="نص الشارة (مثال: توصيل موحد 16 ج.م)"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    {/* Control 3: Live Countdown Timer */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#FFD700]" />
                          العداد التنازلي المباشر (Timer)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slideForm.showTimer}
                            onChange={(e) => setSlideForm({ ...slideForm, showTimer: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFD700]"></div>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          disabled={!slideForm.showTimer}
                          value={slideForm.timerLabel}
                          onChange={(e) => setSlideForm({ ...slideForm, timerLabel: e.target.value })}
                          placeholder="التسمية (ينتهي خلال:)"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          min="1"
                          max="72"
                          disabled={!slideForm.showTimer}
                          value={slideForm.timerDurationHours}
                          onChange={(e) => setSlideForm({ ...slideForm, timerDurationHours: Number(e.target.value) || 6 })}
                          placeholder="المدة بالساعات (6)"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-digits"
                        />
                      </div>
                    </div>

                    {/* Control 4: Coupon Button */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-[#00B4D8]" />
                          زر نسخ كود الخصم (Coupon)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slideForm.showCoupon}
                            onChange={(e) => setSlideForm({ ...slideForm, showCoupon: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00B4D8]"></div>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          disabled={!slideForm.showCoupon}
                          value={slideForm.couponLabel}
                          onChange={(e) => setSlideForm({ ...slideForm, couponLabel: e.target.value })}
                          placeholder="التسمية (كود الخصم:)"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          disabled={!slideForm.showCoupon}
                          value={slideForm.couponCode}
                          onChange={(e) => setSlideForm({ ...slideForm, couponCode: e.target.value.toUpperCase() })}
                          placeholder="الكود (BADALIK50)"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-digits uppercase font-bold"
                        />
                      </div>
                    </div>

                    {/* Control 5: Action CTA Button */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs space-y-2.5 md:col-span-2 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#FF6B00]" />
                          زر الإجراء والطلب (Action Button)
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slideForm.showButton}
                            onChange={(e) => setSlideForm({ ...slideForm, showButton: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!slideForm.showButton}
                        value={slideForm.buttonText}
                        onChange={(e) => setSlideForm({ ...slideForm, buttonText: e.target.value })}
                        placeholder="نص الزر (مثال: تسوق الآن / استكشف العروض)"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 disabled:opacity-50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-200 dark:border-white/10">
                {isEditingSlide && (
                  <button
                    onClick={() => {
                      setIsEditingSlide(false);
                      setEditingSlideId(null);
                      setSlideForm({
                        title: '',
                        subtitle: '',
                        tag: 'عرض اليوم',
                        badge: 'توصيل موحد 16 ج.م',
                        gradient: 'from-emerald-700 via-teal-800 to-slate-900',
                        image: '',
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
                      });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    إلغاء التعديل
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!slideForm.title) {
                      alert('يرجى إدخال عنوان العرض');
                      return;
                    }
                    if (isEditingSlide && editingSlideId && onUpdateOfferSlide) {
                      onUpdateOfferSlide(editingSlideId, slideForm);
                    } else if (onAddOfferSlide) {
                      onAddOfferSlide(slideForm);
                    }
                    setIsEditingSlide(false);
                    setEditingSlideId(null);
                    setSlideForm({
                      title: '',
                      subtitle: '',
                      tag: 'عرض اليوم',
                      badge: 'توصيل موحد 16 ج.م',
                      gradient: 'from-emerald-700 via-teal-800 to-slate-900',
                      image: '',
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
                    });
                  }}
                  className="bg-[#00B4D8] hover:bg-[#0096b4] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isEditingSlide ? 'حفظ تعديلات العرض والظهور' : 'إضافة وحفظ العرض الجديد'}</span>
                </button>
              </div>
            </div>

            {/* Slides Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {offerSlides.map((slide) => {
                const isTagVisible = slide.showTag !== false;
                const isBadgeVisible = slide.showBadge !== false;
                const isTimerVisible = slide.showTimer !== false;
                const isCouponVisible = slide.showCoupon !== false;
                const isButtonVisible = slide.showButton !== false;

                return (
                  <div
                    key={slide.id}
                    className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 flex flex-col justify-between shadow-md group transition-all hover:shadow-xl"
                  >
                    {/* Visual Background and Banner Preview */}
                    <div className="relative p-5 text-white min-h-[220px] flex flex-col justify-between overflow-hidden">
                      <div className={`absolute inset-0 z-0 ${
                        slide.gradient === 'none'
                          ? 'bg-slate-950/80'
                          : `bg-gradient-to-r ${slide.gradient} opacity-95`
                      }`}></div>
                      {slide.image && (
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className={`absolute inset-0 w-full h-full object-cover z-10 ${
                            slide.gradient === 'none' ? 'opacity-55' : 'mix-blend-overlay opacity-30'
                          }`}
                        />
                      )}

                      {/* Header badges preview */}
                      <div className="relative z-20 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isTagVisible && slide.tag && (
                            <span className="px-2.5 py-0.5 bg-[#FF6B00] rounded-full text-[10px] font-black text-white shadow-xs">
                              {slide.tag}
                            </span>
                          )}
                          {isBadgeVisible && slide.badge && (
                            <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/20">
                              {slide.badge}
                            </span>
                          )}
                          {isTimerVisible && (
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-bold text-[#FFD700] border border-white/10 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{slide.timerLabel || 'العداد'}</span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-white text-base leading-snug drop-shadow-sm">
                          {slide.title}
                        </h4>
                        <p className="text-white/80 text-xs line-clamp-2 leading-relaxed font-medium">
                          {slide.subtitle}
                        </p>
                      </div>

                      {/* Bottom action controls preview */}
                      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-3 border-t border-white/15 mt-2">
                        {isButtonVisible && (
                          <span className="bg-[#FF6B00] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                            {slide.buttonText || 'تسوق الآن'}
                          </span>
                        )}
                        {isCouponVisible && (
                          <span className="bg-white/20 text-[#FFD700] font-digits font-black text-[10px] px-2.5 py-1 rounded-lg border border-white/20">
                            {slide.couponLabel || 'كود'}: {slide.couponCode || 'BADALIK50'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin Controls Toolbar on Bottom */}
                    <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                      {/* Status indicators */}
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span
                          title={isTimerVisible ? 'العداد ظاهر' : 'العداد مخفي'}
                          className={`px-1.5 py-0.5 rounded ${isTimerVisible ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                        >
                          عداد {isTimerVisible ? '✓' : '✗'}
                        </span>
                        <span
                          title={isCouponVisible ? 'كود الخصم ظاهر' : 'كود الخصم مخفي'}
                          className={`px-1.5 py-0.5 rounded ${isCouponVisible ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                        >
                          كوبون {isCouponVisible ? '✓' : '✗'}
                        </span>
                        <span
                          title={isButtonVisible ? 'الزر ظاهر' : 'الزر مخفي'}
                          className={`px-1.5 py-0.5 rounded ${isButtonVisible ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                        >
                          زر {isButtonVisible ? '✓' : '✗'}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setIsEditingSlide(true);
                            setEditingSlideId(slide.id);
                            setSlideForm({
                              title: slide.title || '',
                              subtitle: slide.subtitle || '',
                              tag: slide.tag || '',
                              badge: slide.badge || '',
                              gradient: slide.gradient || 'from-emerald-700 via-teal-800 to-slate-900',
                              image: slide.image || '',
                              showTag: slide.showTag !== false,
                              showBadge: slide.showBadge !== false,
                              showTimer: slide.showTimer !== false,
                              timerDurationHours: slide.timerDurationHours || 6,
                              timerLabel: slide.timerLabel || 'ينتهي خلال:',
                              showCoupon: slide.showCoupon !== false,
                              couponCode: slide.couponCode || 'BADALIK50',
                              couponLabel: slide.couponLabel || 'كود الخصم:',
                              showButton: slide.showButton !== false,
                              buttonText: slide.buttonText || 'تسوق الآن',
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 bg-[#00B4D8]/10 hover:bg-[#00B4D8]/20 text-[#00B4D8] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => onDeleteOfferSlide && onDeleteOfferSlide(slide.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                          title="حذف العرض"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
