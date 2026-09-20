import React, { useState, useMemo } from 'react';
import {
  Order,
  User,
  Product,
  CartItem,
} from '../types.ts';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Store as StoreIcon,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  Calendar,
  CreditCard,
  Banknote,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { LiveOrderTracker } from './LiveOrderTracker.tsx';

interface OrdersHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  currentUser: User | null;
  onReorder?: (items: CartItem[]) => void;
  onOpenAuth?: () => void;
  onRefreshOrders?: () => Promise<void>;
}

export const OrdersHistoryModal: React.FC<OrdersHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  currentUser,
  onReorder,
  onOpenAuth,
  onRefreshOrders,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter orders relevant to the current user
  const userOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    if (!currentUser) return [];

    return orders.filter((o) => {
      if (currentUser.role === 'admin') return true;
      if (o.customerId && o.customerId === currentUser.id) return true;
      if (currentUser.phone && o.customerPhone && (o.customerPhone === currentUser.phone || o.customerPhone.includes(currentUser.phone))) return true;
      if (currentUser.email && (o as any).customerEmail === currentUser.email) return true;
      if (o.customerName && currentUser.name && o.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    });
  }, [orders, currentUser]);

  const filteredOrders = useMemo(() => {
    switch (filterTab) {
      case 'active':
        return userOrders.filter((o) => ['confirmed', 'picking_up', 'in_transit'].includes(o.status));
      case 'delivered':
        return userOrders.filter((o) => o.status === 'delivered');
      case 'cancelled':
        return userOrders.filter((o) => ['cancelled', 'rejected', 'declined'].includes(o.status));
      default:
        return userOrders;
    }
  }, [userOrders, filterTab]);

  const activeCount = userOrders.filter((o) => ['confirmed', 'picking_up', 'in_transit'].includes(o.status)).length;
  const deliveredCount = userOrders.filter((o) => o.status === 'delivered').length;

  const handleManualRefresh = async () => {
    if (onRefreshOrders) {
      setIsRefreshing(true);
      try {
        await onRefreshOrders();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      id="customer-orders-history-modal"
    >
      <div
        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#131921] px-5 py-4 flex items-center justify-between text-white border-b border-[#232F3E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF9900] to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Package className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  طلباتي وسجل المشتريات
                </h3>
                {activeCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-extrabold animate-pulse">
                    {activeCount} طلب جاري
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                متابعة حركة الطلبات لحظياً • استلام المتاجر • رحلة الكابتن بقنا
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshOrders && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="تحديث قائمة الطلبات"
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF9900]' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Status Bar */}
        {currentUser ? (
          <div className="bg-slate-50 dark:bg-slate-900/60 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400">{currentUser.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-bold border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>رصيد نقاط الولاء: {currentUser.points ?? 0} نقطة</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                (نقطة مضافة مع كل طلب يتم تسليمه بنجاح)
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 border-b border-amber-200 dark:border-amber-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>يرجى تسجيل الدخول لعرض قائمة طلباتك السابقة وتتبع شحنتك الحالية.</span>
            </div>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="amazon-btn-yellow px-4 py-1.5 text-xs font-bold shrink-0 cursor-pointer"
              >
                تسجيل الدخول الآن
              </button>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'جميع الطلبات', count: userOrders.length },
            { id: 'active', label: 'قيد التوصيل الآن', count: activeCount },
            { id: 'delivered', label: 'الطلبات المكتملة', count: deliveredCount },
            { id: 'cancelled', label: 'الملغاة', count: userOrders.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filterTab === tab.id
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Orders List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 opacity-50" />
              </div>
              <h4 className="font-bold text-base text-slate-800 dark:text-white">
                لا توجد طلبات في هذا القسم
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                عند قيامك بطلب منتجات من محلات وأسواق قنا، ستظهر جميع تفاصيل رحلة الطلب وتحديثات الكابتن هنا مباشرة.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const isTracking = activeTrackingOrderId === order.id;
              const isAllPickedUp =
                !order.pickupStops ||
                order.pickupStops.length === 0 ||
                order.pickupStops.every((s) => s.isPickedUp);

              // Status badges & text
              let statusLabel = 'قيد المراجعة والتأكيد';
              let statusColor = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
              let stepNumber = 1;

              if (order.status === 'confirmed') {
                statusLabel = 'تم تأكيد الطلب وجاري إسناده للكابتن';
                statusColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
                stepNumber = 1;
              } else if (order.status === 'picking_up') {
                statusLabel = 'الكابتن متواجد في المتاجر لتجهيز واستلام السلع';
                statusColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
                stepNumber = 2;
              } else if (order.status === 'in_transit') {
                statusLabel = 'تم استلام كافة الأصناف • الكابتن في الطريق لعنوانك';
                statusColor = 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
                stepNumber = 3;
              } else if (order.status === 'delivered') {
                statusLabel = 'تم التسليم بنجاح للعميل';
                statusColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                stepNumber = 4;
              } else if (['cancelled', 'rejected'].includes(order.status)) {
                statusLabel = 'تم إلغاء الطلب';
                statusColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
                stepNumber = 0;
              }

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                >
                  {/* Order Top Bar */}
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        طلب رقم #{order.id ? order.id.slice(-6) : '---'}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : 'اليوم'}</span>
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${statusColor} flex items-center gap-1.5`}>
                        {order.status === 'delivered' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : order.status === 'in_transit' ? (
                          <Truck className="w-3.5 h-3.5 animate-bounce" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>{statusLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Step Tracker for Active & Delivered Orders */}
                  {order.status !== 'cancelled' && order.status !== 'rejected' && (
                    <div className="px-5 py-4 bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800/50">
                      <div className="grid grid-cols-4 gap-2 text-center relative">
                        {/* Connecting Line */}
                        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                        <div
                          className="absolute top-4 right-6 h-0.5 bg-emerald-500 -z-0 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, ((stepNumber - 1) / 3) * 100)}%`,
                          }}
                        />

                        {/* Step 1: Confirmed */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              stepNumber >= 1
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 text-slate-800 dark:text-slate-200">
                            تم التأكيد
                          </span>
                          <span className="text-[9px] text-slate-500 hidden sm:block">استلام الطلب</span>
                        </div>

                        {/* Step 2: Picking Up */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              stepNumber >= 2
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : stepNumber === 1
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <StoreIcon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 text-slate-800 dark:text-slate-200">
                            استلام المتاجر
                          </span>
                          <span className="text-[9px] text-slate-500 hidden sm:block">
                            {isAllPickedUp ? 'تم الاستلام' : 'جاري التجهيز'}
                          </span>
                        </div>

                        {/* Step 3: In Transit */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              stepNumber >= 3
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : stepNumber === 2
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 text-slate-800 dark:text-slate-200">
                            في الطريق
                          </span>
                          <span className="text-[9px] text-slate-500 hidden sm:block">الكابتن متوجه إليك</span>
                        </div>

                        {/* Step 4: Delivered */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              stepNumber >= 4
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 text-slate-800 dark:text-slate-200">
                            تم التسليم
                          </span>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold hidden sm:block">
                            +1 نقطة ولاء 🌟
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pickup Stops status if multi-store order */}
                  {order.pickupStops && order.pickupStops.length > 0 && (
                    <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                        <StoreIcon className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>محطات تجميع المنتجات من متاجر قنا ({order.pickupStops.length} متاجر):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.pickupStops.map((stop, sIdx) => (
                          <div
                            key={sIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              stop.isPickedUp
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-[#FF9900] text-slate-950 font-black text-[10px] flex items-center justify-center font-digits">
                                {sIdx + 1}
                              </span>
                              <div>
                                <div className="font-bold">{stop.storeName}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>{stop.address || 'قنا'}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              {stop.isPickedUp ? (
                                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  تم الاستلام
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  قيد التجهيز
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Live Tracker Card (if opened) */}
                  {isTracking && (
                    <div className="p-4 bg-slate-950 text-white border-b border-slate-800 animate-in slide-in-from-top-3 duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                          <Truck className="w-4 h-4" />
                          <span>الخريطة المباشرة وتتبع مسار الكابتن في قنا</span>
                        </div>
                        <button
                          onClick={() => setActiveTrackingOrderId(null)}
                          className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          إخفاء التتبع
                        </button>
                      </div>
                      <LiveOrderTracker
                        status={order.status}
                        driverName={order.assignedDriverName || 'كابتن قنا المعتمد'}
                        driverPhone={order.assignedDriverPhone || '01012345678'}
                        vehicleType={order.assignedVehicleType || 'موتوسيكل'}
                        etaMinutes={order.status === 'delivered' ? 0 : order.status === 'in_transit' ? 12 : 22}
                        distanceKm={order.status === 'delivered' ? 0 : order.status === 'in_transit' ? 1.4 : 3.2}
                      />
                    </div>
                  )}

                  {/* Order Summary & Actions */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          إجمالي الطلب: <span className="text-[#007600] font-black text-sm">{order.totalAmount} ج.م</span>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          التوصيل: {order.deliveryFee || 20} ج.م
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {order.items?.length || 0} منتجات
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#FF9900]" />
                        <span>العنوان: {order.deliveryAddress || 'مدينة قنا'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => setActiveTrackingOrderId(isTracking ? null : order.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{isTracking ? 'إغلاق الخريطة' : 'تتبع مسار الكابتن'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض السلع'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items List */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        محتويات هذا الطلب ({order.items?.length || 0} أصناف):
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(order.items || []).map((item, itIdx) => (
                          <div
                            key={itIdx}
                            className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs"
                          >
                            <img
                              src={item.productImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                              alt={item.productName}
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {item.productName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.storeName || 'متجر معتمد'}
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[11px]">
                                <span className="text-slate-600 dark:text-slate-400">
                                  الكمية: <b className="font-digits text-slate-900 dark:text-white">{item.quantity}</b>
                                </span>
                                <span className="font-black text-[#007600]">
                                  {item.price * item.quantity} ج.م
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Driver & Delivery Notes */}
                      {order.assignedDriverName && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-emerald-950 dark:text-emerald-200">
                                كابتن التوصيل: {order.assignedDriverName}
                              </div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                {order.assignedVehicleType || 'موتوسيكل'} • رقم اللوحة: {order.assignedPlateNumber || 'قنا'}
                              </div>
                            </div>
                          </div>
                          {order.assignedDriverPhone && (
                            <a
                              href={`tel:${order.assignedDriverPhone}`}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>اتصال</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-[#131921] px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            تحديث مباشر لحالة الطلبات ونقاط المكافآت لجميع عملاء قنا
          </div>
          <button
            onClick={onClose}
            className="amazon-btn-yellow px-5 py-2 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
