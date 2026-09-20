import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import {
  User,
  UserRole,
  Store,
  Product,
  CartItem,
  Order,
  DeliveryProfile,
  WithdrawalRequest,
  NotificationItem,
} from './types.ts';
import { Header } from './components/Header.tsx';
import { CustomerView } from './components/CustomerView.tsx';
import { MerchantView } from './components/MerchantView.tsx';
import { DeliveryView } from './components/DeliveryView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { LandingView } from './components/LandingView.tsx';
import { CartModal } from './components/CartModal.tsx';
import { RewardsModal } from './components/RewardsModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { OrdersHistoryModal } from './components/OrdersHistoryModal.tsx';

// Helper for safe JSON parsing from fetch responses
const safeFetchJson = async (res: Response) => {
  const text = await res.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!res.ok) {
      throw new Error(`خطأ من الخادم (${res.status})`);
    }
    throw new Error('استجابة الخادم غير صالحة');
  }
  return parsed;
};

const safeFetch = async (url: string, fallback: any, headers?: Record<string, string>) => {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return fallback;
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
};

export default function App() {
  // Page mode: landing welcome page or authenticated app view
  const [isLanding, setIsLanding] = useState<boolean>(true);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [authDefaultRole, setAuthDefaultRole] = useState<UserRole | undefined>(undefined);
  const [authPromptMessage, setAuthPromptMessage] = useState<string>('');

  // Current active role and session (starts null until user logs in)
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Data collections (only real stores and products in Qena; orders/stats wiped clean)
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<DeliveryProfile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [offerSlides, setOfferSlides] = useState<any[]>([]);
  const [driverProfile, setDriverProfile] = useState<DeliveryProfile>({
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
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Cart & UI State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [activeMerchantStoreId, setActiveMerchantStoreId] = useState<string>('str_cheese_1');

  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [joinRequestsData, setJoinRequestsData] = useState<{
    deliveryRequests: any[];
    merchantRequests: any[];
    pendingCount: number;
  } | null>(null);

  // Design System Theme (Light / Dark mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('souq_qena_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('souq_qena_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('souq_qena_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Modern non-blocking toast notifications (replaces iframe window.alert)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Initial Data Fetch from Server
  const fetchAllData = async () => {
    try {
      const savedUserId = localStorage.getItem('souq_qena_user_id') || '';
      const savedEmail = localStorage.getItem('souq_qena_user_email') || '';

      const activeUserId = currentUser?.id || savedUserId;
      const activeUserEmail = currentUser?.email || savedEmail;
      const activeRole = currentUser?.role || currentRole;
      const activeStoreId = currentUser?.storeId || activeMerchantStoreId;
      const activeDriverId = driverProfile?.id;

      const reqHeaders: Record<string, string> = {};
      if (activeUserId) reqHeaders['x-user-id'] = activeUserId;
      if (activeUserEmail) reqHeaders['x-user-email'] = activeUserEmail;
      if (activeRole) reqHeaders['x-user-role'] = activeRole;
      if (activeStoreId) reqHeaders['x-store-id'] = activeStoreId;
      if (activeDriverId) reqHeaders['x-driver-id'] = activeDriverId;

      const notifParams = new URLSearchParams();
      if (activeUserId) notifParams.set('userId', activeUserId);
      if (activeRole) notifParams.set('role', activeRole);
      if (activeStoreId) notifParams.set('storeId', activeStoreId);
      if (activeDriverId) notifParams.set('driverId', activeDriverId);

      const notifUrl = notifParams.toString()
        ? `/api/notifications?${notifParams.toString()}`
        : '/api/notifications';

      const isUserAdmin = activeRole === 'admin';
      const [resStores, resProducts, resOrders, resUsers, resNotifs, resDelivery, resDrivers, resCategories, resBanners, resJoinReqs] =
        await Promise.all([
          safeFetch(isUserAdmin ? '/api/stores?all=true' : '/api/stores', [], reqHeaders),
          safeFetch('/api/products', [], reqHeaders),
          safeFetch('/api/orders', [], reqHeaders),
          safeFetch('/api/auth/users', [], reqHeaders),
          safeFetch(notifUrl, [], reqHeaders),
          safeFetch(
            activeUserId || activeUserEmail
              ? `/api/delivery/profile?userId=${encodeURIComponent(activeUserId)}&email=${encodeURIComponent(activeUserEmail)}`
              : '/api/delivery/profile',
            null,
            reqHeaders
          ),
          safeFetch(isUserAdmin ? '/api/drivers?all=true' : '/api/drivers', [], reqHeaders),
          safeFetch('/api/categories', []),
          safeFetch('/api/banners', []),
          isUserAdmin ? safeFetch('/api/admin/join-requests', null, reqHeaders) : Promise.resolve(null),
        ]);

      if (Array.isArray(resStores) && resStores.length > 0) {
        setStores(resStores);
      }
      if (Array.isArray(resProducts) && resProducts.length > 0) {
        setProducts(resProducts);
      }
      setOrders(Array.isArray(resOrders) ? resOrders : []);
      if (Array.isArray(resUsers) && resUsers.length > 0) {
        setAvailableUsers(resUsers);
      }
      setNotifications(Array.isArray(resNotifs) ? resNotifs : []);
      if (Array.isArray(resDrivers) && resDrivers.length > 0) {
        setDrivers(resDrivers);
      }
      if (Array.isArray(resCategories) && resCategories.length > 0) {
        setCategories(resCategories);
      }
      if (Array.isArray(resBanners) && resBanners.length > 0) {
        setOfferSlides(resBanners);
      }
      if (resDelivery?.driver) {
        setDriverProfile(resDelivery.driver);
        setWithdrawals(Array.isArray(resDelivery.withdrawals) ? resDelivery.withdrawals : []);
      }
      if (resJoinReqs && (resJoinReqs.deliveryRequests || resJoinReqs.merchantRequests)) {
        setJoinRequestsData(resJoinReqs);
      }
    } catch (err) {
      console.warn('Initial server fetch warning:', err);
    }
  };

  useEffect(() => {
    const checkServerSession = async () => {
      const savedUserId = localStorage.getItem('souq_qena_user_id');
      const savedEmail = localStorage.getItem('souq_qena_user_email');
      if (savedUserId || savedEmail) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              'x-user-id': savedUserId || '',
              'x-user-email': savedEmail || '',
            },
          });
          if (res.ok) {
            const data = await safeFetchJson(res);
            if (data.user) {
              setCurrentUser(data.user);
              setCurrentRole(data.user.role);
              if (data.user.storeId) {
                setActiveMerchantStoreId(data.user.storeId);
              }
              // User is logged in -> Enter application directly!
              setIsLanding(false);
            } else {
              localStorage.removeItem('souq_qena_user_id');
              localStorage.removeItem('souq_qena_user_email');
              setCurrentUser(null);
              setIsLanding(true);
            }
          } else {
            // User does not exist in Supabase! Clear local storage
            localStorage.removeItem('souq_qena_user_id');
            localStorage.removeItem('souq_qena_user_email');
            setCurrentUser(null);
            setIsLanding(true);
          }
        } catch (err) {
          console.warn('Session verification error:', err);
          setIsLanding(true);
        }
      } else {
        // No saved user -> Go to landing welcome page for authentication
        setIsLanding(true);
      }
      await fetchAllData();
      setIsCheckingSession(false);
    };

    checkServerSession();

    // 5-second live polling to auto-update incoming orders for merchants and drivers
    const pollingInterval = setInterval(() => {
      fetchAllData();
    }, 5000);
    return () => clearInterval(pollingInterval);
  }, []);

  const handleOpenAuth = (role?: UserRole, prompt = '') => {
    setAuthDefaultRole(role);
    setAuthPromptMessage(prompt);
    setIsAuthOpen(true);
  };

  // Sync role switch with appropriate user account (strictly enforced)
  const handleSelectRole = (role: UserRole) => {
    if (role === 'customer') {
      setCurrentRole('customer');
      setIsLanding(false);
      return;
    }
    if (!currentUser || currentUser.role !== role) {
      handleOpenAuth(
        role,
        `يرجى تسجيل الدخول بحساب ${
          role === 'merchant' ? 'تاجر' : role === 'delivery' ? 'كابتن توصيل' : 'مدير'
        } للوصول لهذه الصفحة.`
      );
      return;
    }
    setCurrentRole(role);
    setIsLanding(false);
  };

  // Perform server-authenticated login with strict Supabase verification
  const handleLogin = async (email: string, password?: string, role?: UserRole) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'تعذر تسجيل الدخول. يرجى التحقق من بياناتك أو إنشاء حساب جديد.');
    }
    if (data.user) {
      setCurrentUser(data.user);
      setCurrentRole(data.user.role);
      localStorage.setItem('souq_qena_user_id', data.user.id);
      localStorage.setItem('souq_qena_user_email', data.user.email);
      setIsLanding(false);
      if (data.user.storeId) {
        setActiveMerchantStoreId(data.user.storeId);
      }
      await fetchAllData();
    }
  };

  // Perform server-authenticated registration
  const handleRegister = async (userData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: UserRole;
    storeName?: string;
    storeCategory?: string;
    storeAddress?: string;
    plateNumber?: string;
    vehicleType?: string;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'تعذر إنشاء الحساب');
    }
    if (data.user) {
      setCurrentUser(data.user);
      setCurrentRole(data.user.role);
      localStorage.setItem('souq_qena_user_id', data.user.id);
      localStorage.setItem('souq_qena_user_email', data.user.email);
      setIsLanding(false);
      if (data.user.storeId) {
        setActiveMerchantStoreId(data.user.storeId);
      }
      await fetchAllData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('souq_qena_user_id');
    localStorage.removeItem('souq_qena_user_email');
    setCurrentUser(null);
    setIsLanding(true);
    setCartItems([]);
  };

  const handleStartShopping = () => {
    setCurrentRole('customer');
    setIsLanding(false);
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!currentUser) {
      handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد للبدء في إضافة المنتجات للسلة وإتمام الشراء.');
      return;
    }

    // Check if the store is currently closed
    const prodStore = stores.find(
      (s) => s.id === product.storeId || s.name === product.storeName
    );
    if (prodStore && prodStore.isOpen === false) {
      showToast(
        `عذراً، متجر "${prodStore.name}" مغلق حالياً، ولا يمكن طلب منتجاته في الوقت الحالي.`,
        'error'
      );
      return;
    }

    const currentProd = products.find((p) => p.id === product.id) || product;
    if (currentProd.isSoldOut || currentProd.stockQuantity <= 0) {
      showToast(`عذراً، المنتج "${currentProd.name}" نفذت كميته بالكامل من المخزون`, 'error');
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentCartQty = existing ? existing.quantity : 0;
      if (currentCartQty + quantity > currentProd.stockQuantity) {
        showToast(`عذراً، الكمية المتاحة حالياً في المخزون من "${currentProd.name}" هي ${currentProd.stockQuantity} وحدة فقط`, 'error');
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product: currentProd, quantity }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (!currentUser) {
      handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد للمتابعة.');
      return;
    }

    const currentProd = products.find((p) => p.id === productId);
    if (currentProd && quantity > currentProd.stockQuantity) {
      showToast(`عذراً، أقصى كمية متاحة في المخزون من "${currentProd.name}" هي ${currentProd.stockQuantity} وحدة فقط`, 'error');
      return;
    }

    setCartItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Order Placement (Executes Multi-Store Checkout and triggers Average Distance Algorithm)
  const handlePlaceOrder = async (orderDetails: {
    deliveryAddress: string;
    paymentMethod: 'card' | 'apple_pay' | 'cash_on_delivery';
    customerName?: string;
    customerPhone?: string;
  }): Promise<{ order: Order; driverAssignment: any } | null> => {
    try {
      const custId = currentUser?.id || `usr_guest_${Date.now()}`;
      const custName = currentUser?.name || orderDetails.customerName?.trim() || 'عميل بدالك - قنا';
      const custPhone = currentUser?.phone || orderDetails.customerPhone?.trim() || '+20 10 1234 5678';

      const payload = {
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        deliveryAddress: orderDetails.deliveryAddress,
        paymentMethod: orderDetails.paymentMethod,
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          productName: ci.product.name,
          storeId: ci.product.storeId,
          storeName: ci.product.storeName,
          price: ci.product.price,
          quantity: ci.quantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || custId,
          'x-user-role': currentUser?.role || 'customer',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'حدث خطأ أثناء تنفيذ الطلب', 'error');
        return null;
      }

      const data = await res.json();
      if (data && data.order) {
        setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
      }
      setCartItems([]);
      showToast('تم تأكيد طلبك بنجاح وحفظه في قاعدة البيانات، ووصل للمتجر والمندوب فوراً!', 'success');
      await fetchAllData();
      return data;
    } catch (err) {
      console.error(err);
      showToast('تعذر إتمام الطلب، يرجى المحاولة مرة أخرى', 'error');
      return null;
    }
  };

  // Merchant Operations
  const handleAddProduct = async (productData: Partial<Product>) => {
    const res = await fetch('/api/merchant/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'merchant',
        'x-user-id': currentUser?.id || '',
      },
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      const newProd = await res.json();
      setProducts((prev) => [newProd, ...prev]);
      showToast('تم إضافة المنتج الجديد للمتجر بنجاح!', 'success');
    }
  };

  const handleUpdateProduct = async (productId: string, productData: Partial<Product>) => {
    const res = await fetch(`/api/merchant/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'merchant',
        'x-user-id': currentUser?.id || '',
      },
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      showToast('تم تحديث بيانات المنتج بنجاح!', 'success');
    }
  };

  const handleToggleSoldOut = async (productId: string) => {
    const res = await fetch(`/api/merchant/products/${productId}/toggle-sold-out`, {
      method: 'PATCH',
      headers: {
        'x-user-role': 'merchant',
        'x-user-id': currentUser?.id || '',
      },
    });
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? data.product : p))
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من المتجر؟')) return;
    const res = await fetch(`/api/merchant/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': 'merchant',
        'x-user-id': currentUser?.id || '',
      },
    });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const handleUpdateStore = async (storeId: string, storeData: Partial<Store>) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'merchant',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(storeData),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedStore = data.store;
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, ...updatedStore } : s))
        );
        if (storeData.name) {
          setProducts((prev) =>
            prev.map((p) => (p.storeId === storeId ? { ...p, storeName: storeData.name! } : p))
          );
        }
        fetchAllData();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'تعذر حفظ بيانات المتجر');
      }
    } catch (err: any) {
      console.error('Error updating store:', err);
      throw err;
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: any,
    stopIndex?: number
  ) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, stopIndex }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      fetchAllData();
    }
  };

  // Delivery Withdrawal
  const handleWithdrawRequest = async (
    amount: number,
    method: string,
    accountDetails: string
  ) => {
    const res = await fetch('/api/delivery/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'delivery',
        'x-user-id': currentUser?.id || '',
      },
      body: JSON.stringify({
        amount,
        method,
        accountDetails,
        driverId: driverProfile.id,
      }),
    });
    if (res.ok) {
      const newReq = await res.json();
      setWithdrawals((prev) => [newReq, ...prev]);
    }
  };

  // Admin Approvals
  const handleApproveWithdrawal = async (id: string) => {
    const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: {
        'x-user-role': 'admin',
        'x-user-id': currentUser?.id || '',
      },
    });
    if (res.ok) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: 'approved' } : w))
      );
      fetchAllData();
    }
  };

  const handleApproveStore = async (storeId: string, approved: boolean) => {
    try {
      const res = await fetch('/api/admin/approve-store', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ storeId, approved }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'تم تحديث حالة موافقة المتجر بنجاح', 'success');
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, isApproved: approved } : s))
        );
        fetchAllData();
      } else {
        showToast('تعذر تحديث حالة المتجر', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الموافقة على المتجر', 'error');
    }
  };

  const handleApproveDriver = async (driverId: string, approved: boolean) => {
    try {
      const res = await fetch('/api/admin/approve-driver', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ driverId, approved }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'تم تحديث حالة موافقة المندوب بنجاح', 'success');
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId || d.userId === driverId ? { ...d, isApproved: approved } : d))
        );
        fetchAllData();
      } else {
        showToast('تعذر تحديث حالة المندوب', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الموافقة على المندوب', 'error');
    }
  };

  // Join Requests: Approve/Reject and update profiles.role
  const handleApproveJoinRequest = async (
    userId: string,
    requestedRole: 'merchant' | 'delivery',
    approved: boolean
  ) => {
    try {
      const res = await fetch('/api/admin/approve-role-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ userId, requestedRole, approved }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'تم تحديث دور المستخدم في profiles بنجاح', 'success');
        setAvailableUsers((prev) =>
          prev.map((u) => {
            if (u.id === userId) {
              return {
                ...u,
                role: approved ? requestedRole : 'customer',
                approvalStatus: approved ? 'approved' : 'rejected',
                requestedRole: approved ? null : u.requestedRole,
              };
            }
            return u;
          })
        );
        setJoinRequestsData((prev) => {
          if (!prev) return prev;
          const mapReq = (r: any) =>
            r.userId === userId ? { ...r, status: approved ? 'approved' : 'rejected' } : r;
          const updatedDeliv = prev.deliveryRequests.map(mapReq);
          const updatedMerch = prev.merchantRequests.map(mapReq);
          return {
            deliveryRequests: updatedDeliv,
            merchantRequests: updatedMerch,
            pendingCount:
              updatedDeliv.filter((r) => r.status === 'pending').length +
              updatedMerch.filter((r) => r.status === 'pending').length,
          };
        });
        if (currentUser && currentUser.id === userId) {
          const updatedUser: User = {
            ...currentUser,
            role: approved ? requestedRole : 'customer',
            approvalStatus: approved ? 'approved' : 'rejected',
            requestedRole: approved ? null : currentUser.requestedRole,
          };
          setCurrentUser(updatedUser);
          if (approved) {
            setCurrentRole(requestedRole);
          }
        }
        fetchAllData();
      } else {
        showToast(data.error || 'تعذر معالجة طلب الانضمام', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء معالجة طلب الانضمام', 'error');
    }
  };

  // Content Management
  const handleAddCategory = async (name: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        showToast(data.message, 'success');
      } else {
        showToast('تعذر إضافة القسم', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء إضافة القسم', 'error');
    }
  };

  const handleDeleteCategory = async (name: string) => {
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        showToast(data.message, 'success');
      }
    } catch (err) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleAddOfferSlide = async (slide: any) => {
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole || 'admin' },
        body: JSON.stringify(slide)
      });
      if (res.ok) {
        const data = await res.json();
        setOfferSlides(data.offerSlides);
        showToast(data.message, 'success');
      }
    } catch (err) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleUpdateOfferSlide = async (id: string, slide: any) => {
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole || 'admin' },
        body: JSON.stringify(slide)
      });
      if (res.ok) {
        const data = await res.json();
        setOfferSlides(data.offerSlides);
        showToast(data.message, 'success');
      }
    } catch (err) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleDeleteOfferSlide = async (id: string) => {
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': currentRole || 'admin' }
      });
      if (res.ok) {
        const data = await res.json();
        setOfferSlides(data.offerSlides);
        showToast(data.message, 'success');
      }
    } catch (err) {
      showToast('حدث خطأ', 'error');
    }
  };

  // Add Product Review
  const handleAddReview = async (productId: string, rating: number, comment: string) => {
    if (!currentUser) {
      handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب لإضافة تقييمك للمنتج.');
      return;
    }
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        comment,
        userName: currentUser?.name || 'عميل بدالك',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? data.product : p))
      );
      showToast('شكراً لك! تم نشر تقييمك بنجاح.', 'success');
    }
  };

  // Notification Management Handlers
  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.warn(err);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn(err);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  // Filter notifications strictly for the active user context
  const visibleNotifications = useMemo(() => {
    if (!notifications || !Array.isArray(notifications)) return [];
    return notifications.filter((n) => {
      // 1. If notification is specifically for a delivery driver
      if (n.driverId || n.targetRole === 'delivery' || n.type === 'delivery') {
        if (currentUser?.role !== 'delivery' && currentUser?.role !== 'admin') return false;
        if (currentUser?.role === 'delivery') {
          const myDriverId = driverProfile?.id;
          const myUserId = currentUser?.id;
          if (n.driverId && myDriverId && n.driverId !== myDriverId) return false;
          if (n.userId && myUserId && n.userId !== myUserId && !n.driverId) return false;
        }
        return true;
      }

      // 2. If notification is specifically for a merchant / store
      if (n.storeId || n.targetRole === 'merchant') {
        if (currentUser?.role !== 'merchant' && currentUser?.role !== 'admin') return false;
        if (currentUser?.role === 'merchant') {
          if (n.storeId && currentUser.storeId && n.storeId !== currentUser.storeId) return false;
          if (n.userId && currentUser.id && n.userId !== currentUser.id && !n.storeId) return false;
        }
        return true;
      }

      // 3. If notification is specifically for a customer
      if (n.targetRole === 'customer') {
        if (currentUser && currentUser.role !== 'customer' && currentUser.role !== 'admin') return false;
        if (n.userId && currentUser && n.userId !== currentUser.id && currentUser.role !== 'admin') return false;
        return true;
      }

      // 4. If notification has a specific userId attached
      if (n.userId) {
        if (!currentUser) return false;
        if (currentUser.role !== 'admin' && n.userId !== currentUser.id) return false;
        return true;
      }

      // 5. Unauthenticated visitors see 0 notifications (clean state)
      if (!currentUser) return false;

      return currentUser?.role === 'admin';
    });
  }, [notifications, currentUser, driverProfile]);

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          driverId: driverProfile?.id,
        }),
      });
      setNotifications([]);
    } catch (err) {
      console.warn(err);
      setNotifications([]);
    }
  };

  const activeStoreObj = stores.find((s) => s.id === selectedStoreId);
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Compute current user's past and active orders
  const userOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(
      (o) =>
        (o.customerId && o.customerId === currentUser.id) ||
        (currentUser.phone && o.customerPhone === currentUser.phone) ||
        (currentUser.email && o.customerName === currentUser.name)
    );
  }, [orders, currentUser]);

  const activeUserOrdersCount = useMemo(() => {
    return userOrders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status)
    ).length;
  }, [userOrders]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 shadow-xl mb-4 animate-bounce">
          <ShoppingBag className="w-6 h-6 text-slate-950" />
        </div>
        <div className="text-lg font-black text-white">منصة بدالك</div>
        <div className="text-xs text-amber-300 mt-2 flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
          <span>جاري التحقق من الجلسة والدخول للموقع...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-gray-100 dark:from-[#020617] dark:via-[#0b0f19] dark:to-[#020617] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#FF6B00] selection:text-white transition-colors duration-300">
      {/* Main Universal Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        currentUser={currentUser}
        cartCount={totalCartCount}
        onOpenCart={() => {
          if (!currentUser) {
            handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد للوصول لسلة المشتريات وإتمام الطلب.');
            return;
          }
          setIsCartOpen(true);
        }}
        onOpenOrders={() => {
          if (!currentUser) {
            handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد لعرض ومتابعة طلباتك السابقة.');
            return;
          }
          setIsOrdersOpen(true);
        }}
        ordersCount={userOrders.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim().length > 0 && isLanding) {
            setCurrentRole('customer');
            setIsLanding(false);
          }
        }}
        products={products}
        stores={stores}
        onSelectProduct={(prod) => {
          setSearchQuery(prod.name);
          if (isLanding) {
            setCurrentRole('customer');
            setIsLanding(false);
          }
        }}
        activeStoreName={activeStoreObj?.name || null}
        onResetStoreFilter={() => setSelectedStoreId(null)}
        onOpenRewards={() => {
          if (!currentUser) {
            handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد لعرض نقاط الولاء ومكافآت بدالك.');
            return;
          }
          setIsRewardsOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        notifications={visibleNotifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearNotifications={handleClearNotifications}
        onOpenAuth={(role) => {
          handleOpenAuth(role, 'يرجى تسجيل الدخول للتمتع بتجربة تسوق آمنة وسهلة في بدالك.');
        }}
        onGoHome={() => setIsLanding(true)}
        isLandingActive={isLanding}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {isLanding ? (
          <LandingView
            stores={stores}
            products={products}
            availableUsers={availableUsers}
            onStartShopping={handleStartShopping}
            onOpenAuth={(role) => {
              setAuthDefaultRole(role);
              setIsAuthOpen(true);
            }}
            onDirectLogin={handleLogin}
          />
        ) : (
          <>
            {currentRole === 'customer' && (
              <CustomerView
                stores={stores}
                products={products}
                cartItems={cartItems}
                onAddToCart={handleAddToCart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedStoreId={selectedStoreId}
                onSelectStore={setSelectedStoreId}
                onAddReview={handleAddReview}
                categories={categories}
                offerSlides={offerSlides}
                onOpenOrders={() => {
                  if (!currentUser) {
                    handleOpenAuth('customer', 'يرجى تسجيل الدخول أو إنشاء حساب جديد لعرض ومتابعة طلباتك السابقة.');
                    return;
                  }
                  setIsOrdersOpen(true);
                }}
                ordersCount={userOrders.length}
                activeOrdersCount={activeUserOrdersCount}
                userPoints={currentUser?.points ?? 0}
              />
            )}

            {currentRole === 'merchant' && (
              <MerchantView
                stores={stores}
                currentStoreId={currentUser?.storeId || activeMerchantStoreId}
                onSelectStore={(id) => setActiveMerchantStoreId(id)}
                currentUser={currentUser}
                products={products}
                orders={orders}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onToggleSoldOut={handleToggleSoldOut}
                onDeleteProduct={handleDeleteProduct}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateStore={handleUpdateStore}
                drivers={drivers.length > 0 ? drivers : [driverProfile]}
                categories={categories}
                offerSlides={offerSlides}
                onAddOfferSlide={handleAddOfferSlide}
                onUpdateOfferSlide={handleUpdateOfferSlide}
                onDeleteOfferSlide={handleDeleteOfferSlide}
              />
            )}

            {currentRole === 'delivery' && (
              <DeliveryView
                driverProfile={
                  drivers.find(
                    (d) =>
                      d.userId === currentUser?.id ||
                      d.id === currentUser?.id ||
                      (currentUser?.email && d.userId === currentUser.email)
                  ) || driverProfile
                }
                orders={orders}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onWithdrawRequest={handleWithdrawRequest}
                withdrawals={withdrawals}
                onStatusChange={(updatedDriver) => {
                  setDriverProfile(updatedDriver);
                  setDrivers((prev) =>
                    prev.map((d) => (d.id === updatedDriver.id || d.userId === updatedDriver.userId ? updatedDriver : d))
                  );
                }}
              />
            )}

            {currentRole === 'admin' && (
              <AdminView
                users={availableUsers}
                stores={stores}
                products={products}
                orders={orders}
                drivers={drivers.length > 0 ? drivers : [driverProfile]}
                withdrawals={withdrawals}
                onApproveWithdrawal={handleApproveWithdrawal}
                onApproveStore={handleApproveStore}
                onApproveDriver={handleApproveDriver}
                onApproveJoinRequest={handleApproveJoinRequest}
                joinRequests={joinRequestsData || undefined}
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                offerSlides={offerSlides}
                onAddOfferSlide={handleAddOfferSlide}
                onUpdateOfferSlide={handleUpdateOfferSlide}
                onDeleteOfferSlide={handleDeleteOfferSlide}
              />
            )}
          </>
        )}
      </main>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        stores={stores}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthDefaultRole('customer');
          setIsAuthOpen(true);
        }}
        onUpdateQuantity={handleUpdateCartQuantity}
        onClearCart={handleClearCart}
        onPlaceOrder={handlePlaceOrder}
        onOrderPlacedSuccess={(order, driverAssignment) => {
          // Handled inside modal
        }}
        onViewOrderHistory={() => {
          setIsCartOpen(false);
          setIsOrdersOpen(true);
        }}
      />

      {/* Orders History & Live Journey Tracking Modal */}
      <OrdersHistoryModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        orders={userOrders}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthDefaultRole('customer');
          setIsAuthOpen(true);
        }}
        onRefreshOrders={fetchAllData}
      />

      {/* Rewards / Loyalty Points Modal */}
      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        userPoints={currentUser?.points ?? 0}
        currentUser={currentUser}
      />

      {/* Auth / Account Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onRegister={handleRegister}
        defaultRole={authDefaultRole}
        promptMessage={authPromptMessage}
        categories={categories}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={visibleNotifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearNotifications={handleClearNotifications}
      />

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`rounded-2xl p-4 shadow-2xl border flex items-center justify-between gap-3 text-sm font-bold ${
              toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                : 'bg-slate-900 text-slate-100 border-slate-750'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-slate-700">
            منصة بدالك © 2026 • منصة التجارة الموحدة لمدينة ومحافظة قنا بالجنيه المصري (ج.م)
          </div>
          <div className="flex items-center gap-3 font-medium">
            <span>محلات قنا</span> • <span>سلة موحدة</span> • <span>توصيل سريع</span> • <span>دعم محلي</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
