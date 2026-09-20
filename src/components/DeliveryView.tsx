import React, { useState, useEffect } from 'react';
import {
  Order,
  DeliveryProfile,
  WithdrawalRequest,
  DriverDistanceEvaluation,
} from '../types.ts';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  DollarSign,
  Fuel,
  Compass,
  ArrowRight,
  Store as StoreIcon,
  Phone,
  User,
  Wallet,
  Send,
  X,
  AlertCircle,
  TrendingUp,
  Lock,
} from 'lucide-react';

interface DeliveryViewProps {
  driverProfile: DeliveryProfile;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: any, stopIndex?: number) => Promise<void>;
  onWithdrawRequest: (amount: number, method: string, accountDetails: string) => Promise<void>;
  withdrawals: WithdrawalRequest[];
  onStatusChange?: (updatedDriver: DeliveryProfile) => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  driverProfile,
  orders,
  onUpdateOrderStatus,
  onWithdrawRequest,
  withdrawals,
  onStatusChange,
}) => {
  const safeDriverProfile: DeliveryProfile = driverProfile || {
    id: 'drv_1',
    userId: 'usr_delivery_1',
    driverName: 'كابتن التوصيل',
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

  // Local state holding the verified driver record from the database
  const [currentDriver, setCurrentDriver] = useState<DeliveryProfile>(driverProfile || safeDriverProfile);
  // Status check loading state on mount
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);
  // Driver online availability status (متصل / في استراحة)
  const [isDriverOnline, setIsDriverOnline] = useState<boolean>(driverProfile?.isOnline ?? safeDriverProfile.isOnline ?? true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Active driver profile combining local state and props
  const effectiveDriver = currentDriver || driverProfile || safeDriverProfile;

  // On mount and whenever driver ID/user changes: verify status and telemetry directly from database
  useEffect(() => {
    let isMounted = true;

    const checkStatusAndFetchFromDatabase = async () => {
      setIsCheckingStatus(true);
      try {
        const savedUserId = localStorage.getItem('souq_qena_user_id') || '';
        const savedEmail = localStorage.getItem('souq_qena_user_email') || '';
        const targetDriverId = safeDriverProfile.id || savedUserId;
        const targetUserId = safeDriverProfile.userId || savedUserId;

        const params = new URLSearchParams();
        if (targetDriverId) params.append('driverId', targetDriverId);
        if (targetUserId) params.append('userId', targetUserId);
        if (savedEmail) params.append('email', savedEmail);

        const res = await fetch(`/api/delivery/profile?${params.toString()}`, {
          headers: {
            'x-user-id': targetUserId || targetDriverId,
            'x-user-email': savedEmail,
            'x-user-role': 'delivery',
            'x-driver-id': targetDriverId,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.driver && isMounted) {
            const dbDriver: DeliveryProfile = data.driver;
            setCurrentDriver(dbDriver);
            setIsDriverOnline(Boolean(dbDriver.isOnline));
            if (onStatusChange) {
              onStatusChange(dbDriver);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not check driver status from database:', err);
      } finally {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      }
    };

    checkStatusAndFetchFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [safeDriverProfile.id, safeDriverProfile.userId]);

  // Keep isDriverOnline synced when external driverProfile changes
  useEffect(() => {
    if (driverProfile?.isOnline !== undefined) {
      setIsDriverOnline(Boolean(driverProfile.isOnline));
    }
    if (driverProfile) {
      setCurrentDriver(driverProfile);
    }
  }, [driverProfile]);

  // Filter active and completed orders strictly for this driver using his database ID or userId
  const isOrderForDriver = (o: Order) => {
    if (!o) return false;
    const driverId = effectiveDriver.id;
    const driverUserId = effectiveDriver.userId;
    const driverName = effectiveDriver.driverName;

    // Direct ID match strictly
    if (driverId && o.assignedDriverId === driverId) return true;
    if (driverUserId && o.assignedDriverId === driverUserId) return true;

    // Direct Name match if assigned driver name matches this driver
    if (
      driverName &&
      o.assignedDriverName &&
      o.assignedDriverName.trim().toLowerCase() === driverName.trim().toLowerCase()
    ) {
      return true;
    }

    // Default placeholder driver matching ONLY if this driver itself is that placeholder
    if (
      (driverId === 'drv_1' || driverId === 'usr_delivery_1') &&
      (o.assignedDriverId === 'drv_1' || o.assignedDriverId === 'usr_delivery_1')
    ) {
      return true;
    }

    return false;
  };

  const assignedOrders = (orders || []).filter(isOrderForDriver);
  const activeOrders = assignedOrders.filter(
    (o) => o && (o.status === 'picking_up' || o.status === 'in_transit' || o.status === 'confirmed' || o.status === 'assigned')
  );
  const completedOrders = assignedOrders.filter((o) => o && o.status === 'delivered');

  // Real Dynamic Telemetry calculations directly from DB linked profile strictly for THIS driver ID
  const totalCompletedEarnings = completedOrders.reduce((sum, o) => sum + (o.deliveryFee || 20), 0);
  const driverWithdrawals = (withdrawals || []).filter(
    (w) => w && (w.driverId === effectiveDriver.id || w.driverId === effectiveDriver.userId)
  );
  const totalApprovedWithdrawals = driverWithdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // 1. Today Earnings available directly from database profile for this driver ID
  const realTodayEarnings = Math.max(
    0,
    (effectiveDriver.todayEarnings !== undefined && effectiveDriver.todayEarnings !== null
      ? effectiveDriver.todayEarnings
      : totalCompletedEarnings) - totalApprovedWithdrawals
  );

  // 2. Cash on Delivery collected by driver in-hand directly from database profile for this driver ID
  const realCashCollected =
    effectiveDriver.totalCashCollected !== undefined && effectiveDriver.totalCashCollected !== null
      ? effectiveDriver.totalCashCollected
      : completedOrders
          .filter((o) => o.paymentMethod === 'cash_on_delivery')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // 3. Actual km driven directly from database profile for this driver ID
  const realKmDriven =
    effectiveDriver.todayKmDriven !== undefined && effectiveDriver.todayKmDriven !== null
      ? effectiveDriver.todayKmDriven
      : Number((completedOrders.length * 4.2 + (activeOrders.length > 0 ? 1.8 : 0)).toFixed(1));

  // 4. Fuel consumption directly from database profile for this driver ID
  const realFuelConsumed =
    effectiveDriver.fuelConsumedLiters !== undefined && effectiveDriver.fuelConsumedLiters !== null
      ? effectiveDriver.fuelConsumedLiters
      : Number((realKmDriven * 0.035).toFixed(2));

  // Currently inspected order for live map navigation
  const currentActiveOrder = activeOrders[0] || assignedOrders[0] || null;

  // Withdrawal modal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(realTodayEarnings);
  const [withdrawMethod, setWithdrawMethod] = useState<'wallet' | 'iban' | 'cash'>('wallet');
  const [walletNumber, setWalletNumber] = useState('');
  const [ibanNumber, setIbanNumber] = useState('');
  const [cashBranch, setCashBranch] = useState('مقر بدالك - حي الروضة - قنا');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  const handleToggleOnlineStatus = async () => {
    if (isUpdatingStatus || isCheckingStatus) return;
    const nextStatus = !isDriverOnline;
    setIsDriverOnline(nextStatus);
    setIsUpdatingStatus(true);
    try {
      const savedUserId = localStorage.getItem('souq_qena_user_id') || '';
      const savedEmail = localStorage.getItem('souq_qena_user_email') || '';

      const res = await fetch('/api/delivery/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': effectiveDriver.userId || savedUserId,
          'x-user-email': savedEmail,
          'x-user-role': 'delivery',
          'x-driver-id': effectiveDriver.id,
        },
        body: JSON.stringify({
          driverId: effectiveDriver.id,
          isOnline: nextStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.driver) {
          if (data.driver.isOnline !== undefined) {
            setIsDriverOnline(Boolean(data.driver.isOnline));
          }
          setCurrentDriver(data.driver);
          if (onStatusChange) {
            onStatusChange(data.driver);
          }
        }
      }
    } catch (err) {
      console.warn('Could not update driver status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (!isWithdrawModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWithdrawModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWithdrawModalOpen]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'assigned' | 'map' | 'wallet'>('assigned');

  // Interactive Live Map Simulation states
  const [simulatedDriverProgress, setSimulatedDriverProgress] = useState(65); // percentage along route

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > realTodayEarnings) return;

    let accountDetails = '';
    let methodName = '';

    if (withdrawMethod === 'wallet') {
      if (!walletNumber.trim()) return;
      methodName = 'محفظة إلكترونية (فودافون كاش / أورنج كاش / اتصالات كاش)';
      accountDetails = `محفظة إلكترونية: ${walletNumber.trim()}`;
    } else if (withdrawMethod === 'iban') {
      if (!ibanNumber.trim()) return;
      methodName = 'تحويل بنكي فوري (IBAN)';
      accountDetails = `IBAN: ${ibanNumber.trim()}`;
    } else {
      methodName = 'تسليم نقدي في المقر';
      accountDetails = cashBranch.trim() || 'مقر بدالك - حي الروضة - قنا';
    }

    await onWithdrawRequest(withdrawAmount, methodName, accountDetails);
    setWithdrawSuccessMsg(`تم إرسال طلب سحب مبلغ ${withdrawAmount} ج.م بنجاح إلى الإدارة للمراجعة`);
    setTimeout(() => {
      setWithdrawSuccessMsg('');
      setIsWithdrawModalOpen(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Driver Header Profile & Daily Telemetry Dashboard */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00B4D8] to-[#0077B6] text-white flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(0,180,216,0.35)]">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  كابتن توصيل قنا المعتمد
                </span>
                <button
                  id="driver-status-toggle-btn"
                  type="button"
                  onClick={handleToggleOnlineStatus}
                  disabled={isUpdatingStatus || isCheckingStatus}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                    isCheckingStatus
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10 cursor-wait'
                      : isDriverOnline
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600/40 hover:bg-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600/40 hover:bg-amber-100'
                  }`}
                  title="اضغط لتغيير الحالة بين متصل وفي استراحة"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isCheckingStatus
                        ? 'bg-[#00B4D8] animate-ping'
                        : isDriverOnline
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  ></span>
                  <span>
                    {isCheckingStatus
                      ? 'جاري فحص الحالة...'
                      : isDriverOnline
                      ? 'متصل ومستعد'
                      : 'في استراحة'}
                  </span>
                </button>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {effectiveDriver.driverName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نوع المركبة: {effectiveDriver.vehicleType} • اللوحة: <span className="font-digits font-bold">{effectiveDriver.plateNumber}</span>
              </p>
            </div>
          </div>

          <button
            id="driver-withdraw-request-btn"
            onClick={() => {
              setWithdrawAmount(realTodayEarnings);
              setIsWithdrawModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-black shadow-[0_0_15px_rgba(255,107,0,0.35)] transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>طلب سحب الأرباح (<span className="font-digits">{realTodayEarnings}</span> ج.م)</span>
          </button>
        </div>

        {/* 4 Telemetry Metrics: Cyber Glass design tokens */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
          <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold">عمل كام اليوم (الأرباح)</span>
              <DollarSign className="w-4 h-4 text-[#FF6B00]" />
            </div>
            <div className="text-2xl font-black text-[#FF6B00] font-digits">
              {realTodayEarnings} <span className="text-xs font-bold text-slate-500">ج.م</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {completedOrders.length > 0
                ? `عن ${completedOrders.length} طلبات مكتملة`
                : 'جاهزة للسحب الفوري'}
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold">كاش محصّل باليد</span>
              <DollarSign className="w-4 h-4 text-[#00B4D8]" />
            </div>
            <div className="text-2xl font-black text-[#00B4D8] font-digits">
              {realCashCollected} <span className="text-xs font-bold text-slate-500">ج.م</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">من طلبات الدفع عند الاستلام</div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold">مشى كام كيلو اليوم</span>
              <Navigation className="w-4 h-4 text-[#00B4D8]" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">
              {realKmDriven} <span className="text-xs font-bold text-slate-500">كم</span>
            </div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
              مسافات المشاوير الحية
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold">استهلاك البنزين التقديري</span>
              <Fuel className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-500 font-digits">
              {realFuelConsumed} <span className="text-xs font-bold text-slate-500">لتر</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              بمعدل ~3.5 لتر/100كم للمركبة
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'assigned'
              ? 'bg-[#00B4D8] text-white shadow-[0_0_12px_rgba(0,180,216,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>الطلبات المطلوب توصيلها (<span className="font-digits">{activeOrders.length}</span>)</span>
        </button>

        <button
          disabled={true}
          title="الخريطة معطلة حالياً"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs opacity-50 cursor-not-allowed select-none bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700/60 whitespace-nowrap"
        >
          <Compass className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>خريطة التتبع المباشر (معطلة)</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'bg-[#00B4D8] text-white shadow-[0_0_12px_rgba(0,180,216,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>المحفظة وسجل السحوبات (<span className="font-digits">{withdrawals.length}</span>)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Assigned Orders with Multi-Shop Pickup Details */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base">
              المهام المسندة للكابتن (أوردرات التوصيل):
            </h3>
            <span className="text-xs text-slate-500">
              واجهة مبسطة توضح الاستلام من أي محل والتسليم لأي عميل
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-700">لا توجد طلبات جاهزة للاستلام حالياً</h4>
              <p className="text-xs text-slate-400">
                ستظهر هنا الطلبات الجاهزة للاستلام فور انتهاء المتاجر من تجهيزها.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-5 text-right"
                >
                  {/* Order Top Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          طلب مجمع #<span className="font-digits">{order.id.slice(-6)}</span>
                        </span>
                        <span className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25 text-xs font-black px-2.5 py-0.5 rounded-full">
                          <span className="font-digits">{order.pickupStops.length}</span> محطات استلام متاجر
                        </span>
                        <span className="bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/25 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          طريقة الدفع: {order.paymentMethod === 'cash_on_delivery' ? 'كاش عند الاستلام' : 'دفع إلكتروني مسبق'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        إجمالي قيمة الطلب: <span className="font-digits font-bold text-slate-700 dark:text-slate-300">{order.totalAmount}</span> ج.م (أرباح التوصيل لك: <span className="font-digits font-bold text-[#FF6B00]">{order.deliveryFee || 20}</span> ج.م)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">حالة التوصيل:</span>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-xl ${
                          order.status === 'delivered'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : order.status === 'in_transit'
                            ? 'bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30 animate-pulse'
                            : 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30'
                        }`}
                      >
                        {order.status === 'confirmed'
                          ? 'قيد التجهيز في المتاجر'
                          : order.status === 'picking_up'
                          ? 'جاري جمع الأصناف من المتاجر'
                          : order.status === 'in_transit'
                          ? 'في الطريق للعميل'
                          : 'تم التسليم بنجاح'}
                      </span>
                    </div>
                  </div>

                  {/* Step-by-Step Multi-Store Pickup Roadmap */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <StoreIcon className="w-4 h-4 text-[#FF6B00]" />
                      <span>مسار جمع الطلبات (المحلات والموقع):</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {order.pickupStops.map((stop, sIdx) => (
                        <div
                          key={stop.storeId}
                          className={`p-4 rounded-2xl border transition-all ${
                            stop.isPickedUp
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-50/70 dark:bg-slate-800/70 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                              <span className="w-5 h-5 rounded-full bg-[#FF6B00] text-white text-[10px] flex items-center justify-center font-black font-digits">
                                {sIdx + 1}
                              </span>
                              <span>{stop.storeName}</span>
                            </div>

                            {stop.isPickedUp ? (
                              <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                                <CheckCircle2 className="w-3 h-3" />
                                تم الاستلام
                              </span>
                            ) : (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, null, sIdx)}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                              >
                                تأكيد استلام الأصناف
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 text-[#00B4D8]" />
                            <span>{stop.address}</span>
                          </div>

                          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 space-y-1 text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px]">
                              الأصناف المطلوب استلامها من هذا المحل:
                            </span>
                            {(stop.items || []).map((it, iIdx) => (
                              <div
                                key={iIdx}
                                className="text-slate-600 dark:text-slate-400 flex items-center justify-between"
                              >
                                <span>• {it.productName}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 font-digits">
                                  الكمية: {it.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destination (Customer Drop-off) */}
                  <div className="bg-[#00B4D8]/10 border border-[#00B4D8]/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00B4D8] to-[#0077B6] text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,180,216,0.3)]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          وجهة التسليم النهائية (منزل العميل):
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 font-medium">
                          {order.customerName} • {order.deliveryAddress || (order as any).customerAddress || 'قنا - مصر'}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#00B4D8]" />
                          <span className="font-digits">{order.customerPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Status Update Buttons */}
                    <div className="flex items-center gap-2">
                      {order.status !== 'delivered' && (() => {
                        const isAllPickedUp = !order.pickupStops || order.pickupStops.length === 0 || order.pickupStops.every((s) => s.isPickedUp);
                        const remainingStopsCount = order.pickupStops ? order.pickupStops.filter((s) => !s.isPickedUp).length : 0;

                        return (
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            {!isAllPickedUp ? (
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>يجب استلام الأصناف من المتاجر أولاً ({remainingStopsCount} متجر متبقي)</span>
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  title="لا يمكن تأكيد التسليم للعميل قبل تأكيد استلام كافة الأصناف من المتاجر"
                                  className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs border border-slate-300 dark:border-slate-750 cursor-not-allowed flex items-center gap-1.5 opacity-80 select-none"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>تم التسليم للعميل (مغلق حتى الاستلام)</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-400/50 animate-pulse"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>تم التسليم بنجاح للعميل (جاهز الآن)</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Live Map & GPS Tracking (Cyber Glass & Glow Route) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'map' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#00B4D8]" />
                <span>التتبع المباشر وخريطة خط السير (Live GPS Routing)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تتبع موقع المندوب والمحلات المطلوب المرور عليها للجمع ووجهة التسليم للعميل
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl text-xs font-bold border border-slate-200/60 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400">محاكاة تقدم المندوب:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={simulatedDriverProgress}
                onChange={(e) => setSimulatedDriverProgress(Number(e.target.value))}
                className="w-28 accent-[#00B4D8] cursor-pointer"
              />
              <span className="text-[#00B4D8] font-black font-digits">{simulatedDriverProgress}%</span>
            </div>
          </div>

          {/* Map Canvas / Visual Mock */}
          <div className="relative w-full h-96 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-inner">
            {/* Grid Lines to simulate Map Terrain */}
            <svg className="absolute inset-0 w-full h-full opacity-15">
              <pattern
                id="grid-pattern"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#00B4D8"
                  strokeWidth="0.8"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>

            {/* Glowing Route Path (Design System Glow Route) */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <filter id="glow-route" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Outer Glow */}
              <polyline
                points="120,280 250,220 480,180 720,120"
                fill="none"
                stroke="#00B4D8"
                strokeWidth="8"
                strokeOpacity="0.4"
                filter="url(#glow-route)"
              />
              {/* Core Path */}
              <polyline
                points="120,280 250,220 480,180 720,120"
                fill="none"
                stroke="#00B4D8"
                strokeWidth="4"
                strokeDasharray="8 6"
                className="animate-pulse"
              />
            </svg>

            {/* Stop 1: Meat Store Pin */}
            <div
              className="absolute text-center"
              style={{ left: '120px', top: '260px' }}
            >
              <div className="w-9 h-9 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(255,107,0,0.5)] border-2 border-white mx-auto font-digits">
                1
              </div>
              <div className="bg-slate-950/90 text-orange-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow mt-1 whitespace-nowrap border border-orange-500/30">
                ملحمة الريان (استلام اللحم)
              </div>
            </div>

            {/* Stop 2: Cheese Store Pin */}
            <div
              className="absolute text-center"
              style={{ left: '260px', top: '200px' }}
            >
              <div className="w-9 h-9 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(255,107,0,0.5)] border-2 border-white mx-auto font-digits">
                2
              </div>
              <div className="bg-slate-950/90 text-orange-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow mt-1 whitespace-nowrap border border-orange-500/30">
                أجبان المدينة (استلام الجبن)
              </div>
            </div>

            {/* Destination Pin: Customer */}
            <div
              className="absolute text-center"
              style={{ left: '720px', top: '100px' }}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-white mx-auto animate-bounce">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="bg-slate-950/90 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow mt-1 whitespace-nowrap border border-emerald-500/30">
                منزل العميل (حي الروضة)
              </div>
            </div>

            {/* Animated Driver Marker along Route */}
            <div
              className="absolute text-center transition-all duration-300"
              style={{
                left: `${120 + (600 * simulatedDriverProgress) / 100}px`,
                top: `${260 - (160 * simulatedDriverProgress) / 100}px`,
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00B4D8] to-[#0077B6] text-white flex items-center justify-center shadow-[0_0_20px_rgba(0,180,216,0.6)] border-3 border-white mx-auto ring-4 ring-[#00B4D8]/40 animate-pulse">
                <Truck className="w-6 h-6" />
              </div>
              <div className="bg-[#00B4D8] text-slate-950 text-[11px] font-black px-3 py-0.5 rounded-full shadow mt-1 whitespace-nowrap font-digits">
                موقع الكابتن الحي
              </div>
            </div>

            {/* Map overlay controls */}
            <div className="absolute bottom-4 right-4 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 text-white text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#00B4D8]">
                <Navigation className="w-3.5 h-3.5" />
                <span>إحداثيات GPS المباشرة:</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono font-digits">
                Lat: {(safeDriverProfile.currentLat || 26.1551).toFixed(4)}, Lng: {(safeDriverProfile.currentLng || 32.716).toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-400">
                السرعة الحالية: <span className="font-digits">38</span> كم/ساعة • المسافة المتبقية: <span className="font-digits">2.1</span> كم
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Wallet & Withdrawals History */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'wallet' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              سجل طلبات سحب الأرباح والكاش:
            </h3>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,107,0,0.3)] cursor-pointer"
            >
              طلب سحب جديد
            </button>
          </div>

          <div className="space-y-3">
            {driverWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                لا توجد طلبات سحب سابقة لهذا الكابتن.
              </div>
            ) : (
              driverWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl flex items-center justify-between text-xs"
                >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    سحب مبلغ <span className="font-digits text-[#FF6B00] font-black">{w.amount}</span> ج.م
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    الطريقة: {w.method} • الحساب: <span className="font-digits">{w.accountDetails}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    تاريخ الطلب: <span className="font-digits">{w.requestDate}</span>
                  </div>
                </div>

                <div>
                  <span
                    className={`font-black px-3 py-1 rounded-xl text-xs ${
                      w.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : w.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30'
                    }`}
                  >
                    {w.status === 'approved'
                      ? 'تم التحويل لحسابك'
                      : w.status === 'rejected'
                      ? 'مرفوض'
                      : 'قيد مراجعة الإدارة'}
                  </span>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Withdrawal Request Modal */}
      {/* ------------------------------------------------------------- */}
      {isWithdrawModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsWithdrawModalOpen(false)}
        >
          <div
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-right border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#FF6B00] shrink-0" />
                <span>طلب سحب أرباح المندوب</span>
              </h3>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center">
                {withdrawSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">الرصيد المتاح للسحب اليوم:</span>
                  <span className="font-black text-[#FF6B00] text-sm font-digits">
                    {realTodayEarnings} ج.م
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المبلغ المراد سحبه (ج.م):
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    max={realTodayEarnings}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-hidden focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    طريقة التحويل:
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value as 'wallet' | 'iban' | 'cash')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="wallet">محفظة إلكترونية (فودافون كاش / أورنج كاش / اتصالات كاش)</option>
                    <option value="iban">تحويل بنكي فوري (IBAN)</option>
                    <option value="cash">تسليم نقدي في المقر</option>
                  </select>
                </div>

                {withdrawMethod === 'wallet' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="block font-bold text-slate-700">
                      رقم المحفظة الإلكترونية (فودافون كاش / أورنج كاش / اتصالات كاش):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم المحفظة (مثال: 01012345678)"
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      سيتم تحويل الأرباح مباشرة للرقم المكتوب أعلاه على المحفظة الإلكترونية.
                    </span>
                  </div>
                )}

                {withdrawMethod === 'iban' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="block font-bold text-slate-700">
                      رقم الآيبان البنكي (IBAN):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم الـ IBAN (مثال: EG123456789012345678901234)"
                      value={ibanNumber}
                      onChange={(e) => setIbanNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      سيتم إجراء تحويل بنكي فوري لمصرفك بعد موافقة الإدارة.
                    </span>
                  </div>
                )}

                {withdrawMethod === 'cash' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900 animate-in fade-in duration-200">
                    <div className="font-bold text-xs">مكان استلام النقدية:</div>
                    <div className="text-[11px] font-semibold">مقر إدارة بدالك - حي الروضة - مدينة قنا</div>
                    <div className="text-[10px] text-amber-700">يمكنك استلام كاش أرباحك يومياً من 10 صباحاً وحتى 6 مساءً.</div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تأكيد طلب السحب</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
