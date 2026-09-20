import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, Order, Store, User } from '../types.ts';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  MapPin,
  Sparkles,
  CheckCircle2,
  Store as StoreIcon,
  Truck,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
  AlertCircle,
  LogIn,
  Clock,
} from 'lucide-react';
import { LiveOrderTracker } from './LiveOrderTracker.tsx';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  stores?: Store[];
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onPlaceOrder: (orderDetails: {
    deliveryAddress: string;
    paymentMethod: 'card' | 'apple_pay' | 'cash_on_delivery';
    customerName?: string;
    customerPhone?: string;
  }) => Promise<{ order: Order; driverAssignment: any } | null>;
  onOrderPlacedSuccess: (order: Order, driverAssignment: any) => void;
  onViewOrderHistory?: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  stores,
  currentUser,
  onOpenAuth,
  onUpdateQuantity,
  onClearCart,
  onPlaceOrder,
  onOrderPlacedSuccess,
  onViewOrderHistory,
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState(
    'حي المصالح، شارع الجمهورية، عمارة 12، شقة 4، مدينة قنا'
  );
  const [customerName, setCustomerName] = useState(currentUser?.name || 'عميل بدالك');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '01012345678');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'cash_on_delivery'>('cash_on_delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastPlacedResult, setLastPlacedResult] = useState<{
    order: Order;
    driverAssignment: any;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setCustomerName(currentUser.name);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    setOrderError(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLastPlacedResult(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Check for any closed stores in cart (Hook placed unconditionally at top)
  const closedStoreNames = useMemo(() => {
    if (!stores || stores.length === 0) return [];
    const closed = new Set<string>();
    cartItems.forEach((item) => {
      const s = stores.find(
        (st) => st.id === item.product.storeId || st.name === item.product.storeName
      );
      if (s && s.isOpen === false) {
        closed.add(s.name);
      }
    });
    return Array.from(closed);
  }, [cartItems, stores]);

  if (!isOpen) return null;

  // Group cart items by store
  const itemsByStore: { [storeName: string]: CartItem[] } = {};
  let subtotal = 0;

  cartItems.forEach((item) => {
    const sName = item.product.storeName || 'متجر معتمد';
    if (!itemsByStore[sName]) {
      itemsByStore[sName] = [];
    }
    itemsByStore[sName].push(item);
    subtotal += item.product.price * item.quantity;
  });

  const storeNames = Object.keys(itemsByStore);

  const hasClosedStoreItems = closedStoreNames.length > 0;

  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  let baseItemFee = 10;
  if (totalItemCount >= 5 && totalItemCount <= 10) {
    baseItemFee = 15;
  } else if (totalItemCount > 10) {
    baseItemFee = 20;
  }
  const multiStoreModifier = storeNames.length > 1 ? (storeNames.length - 1) * 3 : 0;
  const deliveryFee = Math.max(15, baseItemFee + 5 + multiStoreModifier);
  const totalAmount = subtotal + deliveryFee;

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (hasClosedStoreItems) {
      setOrderError(
        `لا يمكن إتمام الطلب لأن المتاجر التالية مغلقة حالياً: (${closedStoreNames.join(
          '، '
        )}). يرجى حذف منتجاتها من السلة أولاً لتأكيد طلب باقي المنتجات.`
      );
      return;
    }

    if (!deliveryAddress.trim()) {
      setOrderError('يرجى إدخال عنوان التوصيل داخل مدينة قنا');
      return;
    }

    setOrderError(null);
    setIsSubmitting(true);
    try {
      const result = await onPlaceOrder({
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        customerName: customerName.trim() || currentUser?.name || 'عميل بدالك',
        customerPhone: customerPhone.trim() || currentUser?.phone || '01012345678',
      });

      if (result) {
        setLastPlacedResult(result);
        onClearCart();
        onOrderPlacedSuccess(result.order, result.driverAssignment);
      } else {
        setOrderError('تعذر إتمام الطلب، يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      setOrderError(err?.message || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => {
        setLastPlacedResult(null);
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs max-w-4xl w-full my-auto flex flex-col shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] text-right animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amazon Squid Ink Header */}
        <div className="bg-[#232F3E] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#FF9900] text-[#0F1111] flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                عربة التسوق في بدالك (طلب مجمع موحد)
              </h3>
              <p className="text-[11px] text-[#CCCCCC]">
                {storeNames.length > 1
                  ? `تجميع مشتريات من ${storeNames.length} متاجر في دليفري واحد لمدينة قنا`
                  : 'تأكيد السلع وإتمام الدفع'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setLastPlacedResult(null);
              onClose();
            }}
            className="p-1 text-white hover:text-[#FF9900] rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* If order just successfully placed */}
          {lastPlacedResult ? (
            <div className="space-y-5 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#007600]/10 text-[#007600] flex items-center justify-center mx-auto border border-[#007600]/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-[#0F1111] dark:text-white">
                  تم تأكيد طلبك بنجاح وجاري تجهيزه!
                </h4>
                <p className="text-xs text-[#565959] dark:text-[#9CA3AF]">
                  رقم الطلب: <span className="font-bold text-[#0F1111] dark:text-white">#{lastPlacedResult.order?.id ? lastPlacedResult.order.id.slice(-6) : '---'}</span> • تم إرسال الإشعار لتجار قنا وتعيين كابتن التوصيل
                </p>
              </div>

              {/* Dynamic Live SVG Route Tracker */}
              <div className="pt-2 text-right">
                <LiveOrderTracker
                  status={lastPlacedResult.order?.status || 'confirmed'}
                  driverName={lastPlacedResult.driverAssignment?.driverName || 'كابتن قنا المعتمد'}
                  etaMinutes={18}
                  distanceKm={2.1}
                />
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                {onViewOrderHistory && (
                  <button
                    onClick={() => {
                      setLastPlacedResult(null);
                      onClearCart();
                      onClose();
                      onViewOrderHistory();
                    }}
                    className="px-5 py-2 rounded-xs bg-[#131921] hover:bg-[#232F3E] text-white text-xs font-bold shadow-xs cursor-pointer border border-[#37475A]"
                  >
                    متابعة الطلب في قائمة طلباتي
                  </button>
                )}
                <button
                  onClick={() => {
                    setLastPlacedResult(null);
                    onClearCart();
                    onClose();
                  }}
                  className="amazon-btn-yellow px-6 py-2 text-xs font-bold shadow-xs cursor-pointer"
                >
                  العودة لمواصلة التسوق في قنا
                </button>
              </div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingCart className="w-14 h-14 text-[#565959] mx-auto opacity-40" />
              <h4 className="font-bold text-base text-[#0F1111] dark:text-white">
                عربة التسوق في بدالك فارغة
              </h4>
              <p className="text-xs text-[#565959] dark:text-[#9CA3AF]">
                تصفح أقسام السوبرماركت والأجبان واللحوم وأضف ما تحتاجه
              </p>
              <button
                onClick={onClose}
                className="amazon-btn-yellow px-5 py-2 text-xs font-bold"
              >
                تصفح منتجات قنا الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cart Items Column (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {hasClosedStoreItems && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xs text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">تنبيه: توجد منتجات من متاجر مغلقة حالياً في السلة</div>
                      <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                        المتاجر التالية مغلقة في الوقت الحالي: <span className="font-bold underline">{closedStoreNames.join('، ')}</span>. لا يمكن إتمام الطلب إلا بعد إزالة منتجات هذه المتاجر من السلة.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7] dark:border-[#37475A]">
                  <h4 className="font-bold text-sm text-[#0F1111] dark:text-white">
                    السلع المحددة للشراء ({totalItemCount} سلع)
                  </h4>
                  <button
                    onClick={onClearCart}
                    className="text-xs text-[#007185] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ السلة كاملة</span>
                  </button>
                </div>

                {storeNames.map((storeName) => {
                  const items = itemsByStore[storeName];
                  const storeObj = stores?.find(
                    (s) => s.name === storeName || s.id === items[0]?.product.storeId
                  );
                  const isCurrentStoreClosed = storeObj ? storeObj.isOpen === false : false;

                  return (
                    <div
                      key={storeName}
                      className={`border rounded-xs p-3.5 bg-white dark:bg-[#1A1F26] space-y-3 transition-colors ${
                        isCurrentStoreClosed
                          ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20'
                          : 'border-[#D5D9D9] dark:border-[#37475A]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F2] dark:border-[#37475A] text-xs">
                        <div className="flex items-center gap-2 font-bold text-[#0F1111] dark:text-white">
                          <StoreIcon className={`w-4 h-4 ${isCurrentStoreClosed ? 'text-rose-500' : 'text-[#FF9900]'}`} />
                          <span>المتجر: {storeName}</span>
                          {isCurrentStoreClosed && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 px-2 py-0.5 rounded-xs font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              مغلق حالياً
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                          {items.length} أصناف
                        </span>
                      </div>

                      <div className="divide-y divide-[#F0F2F2] dark:divide-[#37475A]">
                        {items.map(({ product, quantity }) => (
                          <div
                            key={product.id}
                            className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className={`w-16 h-16 rounded-xs object-cover border border-[#D5D9D9] shrink-0 bg-[#F7F7F7] ${
                                isCurrentStoreClosed ? 'grayscale-40 opacity-75' : ''
                              }`}
                            />

                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs sm:text-sm text-[#0F1111] dark:text-white truncate">
                                {product.name}
                              </h5>
                              {isCurrentStoreClosed ? (
                                <div className="text-rose-600 dark:text-rose-400 font-bold text-[11px] mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>المتجر مغلق - احذف المنتج من السلة للمتابعة</span>
                                </div>
                              ) : (
                                <>
                                  <div className="text-[#007600] font-bold text-[11px] mt-0.5">
                                    متوفر في المخزون
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-[#007185] mt-0.5">
                                    <span className="text-[#00A8E1] italic font-black">prime</span>
                                    <span>مؤهل للشحن السريع الموحد</span>
                                  </div>
                                </>
                              )}

                              {/* Quantity & Delete */}
                              <div className="flex items-center gap-3 mt-2">
                                {!isCurrentStoreClosed && (
                                  <div className="flex items-center border border-[#D5D9D9] rounded-xs bg-[#F0F2F2] dark:bg-[#232F3E]">
                                    <button
                                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                                      className="px-2 py-0.5 hover:bg-[#E3E6E6] text-xs font-bold cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-2.5 text-xs font-bold text-[#0F1111] dark:text-white">
                                      {quantity}
                                    </span>
                                    <button
                                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                                      className="px-2 py-0.5 hover:bg-[#E3E6E6] text-xs font-bold cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                <button
                                  onClick={() => onUpdateQuantity(product.id, 0)}
                                  className={`text-[11px] hover:underline cursor-pointer flex items-center gap-1 ${
                                    isCurrentStoreClosed
                                      ? 'text-rose-600 font-bold bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-xs'
                                      : 'text-[#007185]'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف من السلة</span>
                                </button>
                              </div>
                            </div>

                            <div className="text-left font-bold text-sm text-[#B12704] shrink-0">
                              {product.price * quantity}{' '}
                              <span className="text-[10px] text-[#565959] font-normal">ج.م</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & Checkout Box (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 bg-[#F7F7F7] dark:bg-[#232F3E] space-y-3.5 text-xs">
                  <h4 className="font-bold text-sm text-[#0F1111] dark:text-white pb-2 border-b border-[#D5D9D9] dark:border-[#37475A]">
                    ملخص الطلب (Order Summary)
                  </h4>

                  {/* Summary Breakdown */}
                  <div className="space-y-2 text-[#0F1111] dark:text-[#CCCCCC]">
                    <div className="flex justify-between">
                      <span>السلع ({totalItemCount}):</span>
                      <span className="font-bold">{subtotal} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الشحن والتوصيل الموحد ({storeNames.length} متاجر):</span>
                      <span className="font-bold text-[#007600]">{deliveryFee} ج.م</span>
                    </div>
                    <div className="pt-2 border-t border-[#D5D9D9] dark:border-[#37475A] flex justify-between items-baseline text-sm font-bold text-[#0F1111] dark:text-white">
                      <span>المجموع الكلي:</span>
                      <span className="text-xl font-bold text-[#B12704]">
                        {totalAmount} <span className="text-xs font-normal">ج.م</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-[11px] text-[#0F1111] dark:text-white">
                        اسم المستلم:
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white dark:bg-white text-black dark:text-black border border-[#D5D9D9] rounded-xs p-1.5 text-xs font-medium focus:outline-hidden focus:border-[#FF9900] placeholder:text-gray-500"
                        placeholder="الاسم بالكامل..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[11px] text-[#0F1111] dark:text-white">
                        رقم هاتف التواصل:
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white dark:bg-white text-black dark:text-black border border-[#D5D9D9] rounded-xs p-1.5 text-xs font-mono font-medium focus:outline-hidden focus:border-[#FF9900] placeholder:text-gray-500"
                        placeholder="010XXXXXXXX"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Address input */}
                  <div className="pt-1 space-y-1">
                    <label className="font-bold text-[11px] text-[#0F1111] dark:text-white flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#007185]" />
                      <span>عنوان التوصيل في قنا:</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-white dark:bg-white text-black dark:text-black border border-[#D5D9D9] rounded-xs p-2 text-xs font-medium focus:outline-hidden focus:border-[#FF9900] placeholder:text-gray-500"
                      placeholder="شارع الجمهورية، مدينة قنا..."
                    />
                  </div>

                  {/* Payment Methods */}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[11px] text-[#0F1111] dark:text-white flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>طريقة الدفع:</span>
                      </label>
                      <span className="text-[10px] text-[#007600] font-bold">
                        الدفع عند الاستلام مفعّل حالياً
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {[
                        { id: 'cash_on_delivery' as const, label: 'الدفع عند الاستلام', enabled: true, note: 'متاح ومفعّل' },
                        { id: 'card' as const, label: 'بطاقة بنكية', enabled: false, note: 'غير مفعّل' },
                        { id: 'apple_pay' as const, label: 'فودافون كاش', enabled: false, note: 'غير مفعّل' },
                      ].map((m) => {
                        const isSelected = paymentMethod === m.id;
                        const isDisabled = !m.enabled;

                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (m.enabled) {
                                setPaymentMethod(m.id);
                              }
                            }}
                            title={isDisabled ? 'طريقة الدفع هذه غير مفعّلة حالياً' : undefined}
                            className={`py-2 px-1.5 rounded-xs border text-center font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                              isDisabled
                                ? 'opacity-40 cursor-not-allowed bg-[#F0F2F2] dark:bg-[#1A1F26]/50 border-[#D5D9D9] dark:border-[#37475A] text-[#888888] select-none'
                                : isSelected
                                ? 'border-[#FF9900] bg-[#FFF8E7] text-[#0F1111] ring-1 ring-[#FF9900] cursor-pointer shadow-xs'
                                : 'border-[#D5D9D9] bg-white dark:bg-[#1A1F26] text-[#565959] hover:bg-[#F0F2F2] cursor-pointer'
                            }`}
                          >
                            <span className="leading-tight">{m.label}</span>
                            <span
                              className={`text-[9px] font-medium leading-none ${
                                isDisabled
                                  ? 'text-[#888888]'
                                  : 'text-[#007600] font-bold'
                              }`}
                            >
                              {m.note}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[#565959] dark:text-[#9CA3AF] leading-relaxed">
                      * تماشياً مع سياسة المتجر، يُتاح حالياً الدفع نقداً عند استلام الطلب من مندوب التوصيل في قنا.
                    </p>
                  </div>

                  {/* Error Notification banner if any */}
                  {orderError && (
                    <div className="p-2.5 bg-[#FFF2F2] dark:bg-[#3B1818] border border-[#D00] rounded-xs text-[#C00] dark:text-[#FF8888] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div className="flex-1">{orderError}</div>
                      {!currentUser && onOpenAuth && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAuth();
                          }}
                          className="text-[11px] underline font-bold cursor-pointer text-[#007185] dark:text-[#56D3F5] shrink-0"
                        >
                          دخول الآن
                        </button>
                      )}
                    </div>
                  )}

                  {/* Primary Amazon Yellow CTA - تأكيد الطلب */}
                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting || hasClosedStoreItems}
                    className={`w-full py-2.5 text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 rounded-xs ${
                      hasClosedStoreItems
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 cursor-not-allowed select-none'
                        : 'amazon-btn-yellow cursor-pointer disabled:opacity-50'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-[#0F1111] border-t-transparent rounded-full animate-spin"></span>
                        <span>جاري تأكيد الطلب وإرساله للتجار...</span>
                      </>
                    ) : hasClosedStoreItems ? (
                      <>
                        <Clock className="w-4 h-4 text-rose-600" />
                        <span>يوجد متجر مغلق (احذف منتجاته للمتابعة)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>تأكيد الطلب ({totalAmount} ج.م)</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1 text-[11px] text-[#565959] dark:text-[#9CA3AF] pt-1">
                    <Lock className="w-3 h-3 text-[#007600]" />
                    <span>عملية دفع آمنة ومشفرة 100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
