import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Product,
  Order,
  ProductReview,
  User,
  DeliveryProfile,
  OfferSlide,
} from '../types.ts';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Star,
  Eye,
  EyeOff,
  Clock,
  UserCheck,
  Save,
  X,
  Volume2,
  VolumeX,
  Store as StoreIcon,
  ShieldCheck,
  Settings,
  Image as ImageIcon,
  MapPin,
  Phone,
  Tag,
  ToggleLeft,
  ToggleRight,
  Check,
  RefreshCw,
  Truck,
  Sparkles,
  Timer,
  Ticket,
  SlidersHorizontal,
  Layers,
  Palette,
} from 'lucide-react';

interface MerchantViewProps {
  stores: Store[];
  currentStoreId?: string;
  currentUser?: User | null;
  onSelectStore?: (storeId: string) => void;
  onSelectStoreId?: (storeId: string) => void;
  products: Product[];
  orders: Order[];
  drivers?: DeliveryProfile[];
  onAddProduct: (productData: Partial<Product>) => Promise<void>;
  onUpdateProduct: (productId: string, productData: Partial<Product>) => Promise<void>;
  onToggleSoldOut: (productId: string) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: any) => Promise<void>;
  onUpdateStore?: (storeId: string, storeData: Partial<Store>) => Promise<void>;
  categories?: string[];
  offerSlides?: OfferSlide[];
  onAddOfferSlide?: (slide: any) => Promise<void>;
  onUpdateOfferSlide?: (id: string, slide: any) => Promise<void>;
  onDeleteOfferSlide?: (id: string) => Promise<void>;
}

export const MerchantView: React.FC<MerchantViewProps> = ({
  stores,
  currentStoreId,
  currentUser,
  onSelectStore,
  onSelectStoreId,
  products,
  orders,
  drivers,
  onAddProduct,
  onUpdateProduct,
  onToggleSoldOut,
  onDeleteProduct,
  onUpdateOrderStatus,
  onUpdateStore,
  categories = [],
  offerSlides = [],
  onAddOfferSlide,
  onUpdateOfferSlide,
  onDeleteOfferSlide,
}) => {
  // Bind directly and exclusively to the registered store belonging to this store owner (currentUser ID)
  const currentStore =
    stores.find(
      (s) =>
        (currentUser?.id && s.ownerId === currentUser.id) ||
        (currentUser?.storeId && s.id === currentUser.storeId)
    ) || {
      id: currentUser?.storeId || (currentUser?.id ? `str_${currentUser.id}` : 'str_merchant_default'),
      ownerId: currentUser?.id || '',
      name: currentUser?.name ? `متجر ${currentUser.name}` : 'متجري المعين',
      description: 'المتجر المسجل المعتمد المربوط بحسابك',
      category: 'عام',
      logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
      rating: 5.0,
      reviewCount: 0,
      priceLevel: '$$',
      lat: 26.155,
      lng: 32.716,
      address: 'قنا - مصر',
      phone: currentUser?.phone || '+20 10 0000 0000',
      isOpen: true,
      distanceKm: 1.0,
    };

  // Active tab in merchant portal
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'reviews' | 'offers'>('orders');
  // Sub-category filter for orders: all | new | prepared | picked_up
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<'all' | 'new' | 'prepared' | 'picked_up'>('all');

  // Sound notification toggle & persistent seen orders to prevent re-pop on refresh
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);
  const [seenOrderIds, setSeenOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`seen_orders_${currentStore.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isInitialLoadRef = useRef(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [selectedPreviewOrder, setSelectedPreviewOrder] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Store Settings Form state
  const [storeFormName, setStoreFormName] = useState(currentStore.name);
  const [storeFormDesc, setStoreFormDesc] = useState(currentStore.description || '');
  const [storeFormCategory, setStoreFormCategory] = useState(currentStore.category || 'سوبرماركت');
  const [storeFormLogo, setStoreFormLogo] = useState(currentStore.logoUrl || '');
  const [storeFormBanner, setStoreFormBanner] = useState(currentStore.bannerUrl || '');
  const [storeFormPhone, setStoreFormPhone] = useState(currentStore.phone || '');
  const [storeFormAddress, setStoreFormAddress] = useState(currentStore.address || '');
  const [storeFormIsOpen, setStoreFormIsOpen] = useState(currentStore.isOpen ?? true);
  const [storeFormPriceLevel, setStoreFormPriceLevel] = useState<'compact' | '$' | '$$' | '$$$'>(
    (currentStore.priceLevel as any) || '$$'
  );
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeSaveSuccess, setStoreSaveSuccess] = useState(false);
  const [storeSaveError, setStoreSaveError] = useState('');

  // Sync store settings form when currentStore changes
  useEffect(() => {
    setStoreFormName(currentStore.name);
    setStoreFormDesc(currentStore.description || '');
    setStoreFormCategory(currentStore.category || 'سوبرماركت');
    setStoreFormLogo(currentStore.logoUrl || '');
    setStoreFormBanner(currentStore.bannerUrl || '');
    setStoreFormPhone(currentStore.phone || '');
    setStoreFormAddress(currentStore.address || '');
    setStoreFormIsOpen(currentStore.isOpen ?? true);
    setStoreFormPriceLevel((currentStore.priceLevel as any) || '$$');
  }, [currentStore.id, currentStore.name, currentStore.logoUrl, currentStore.bannerUrl, currentStore.isOpen]);

  useEffect(() => {
    if (!isAddModalOpen && !isStoreSettingsOpen && !selectedPreviewOrder) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsStoreSettingsOpen(false);
        setSelectedPreviewOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddModalOpen, isStoreSettingsOpen, selectedPreviewOrder]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('أجبان وألبان');
  const [formPrice, setFormPrice] = useState<number>(30);
  const [formStock, setFormStock] = useState<number>(20);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  // Filter products for this store
  const storeProducts = products.filter((p) => p && (p.storeId === currentStore.id || p.storeName === currentStore.name));
  const storeProdIds = new Set(storeProducts.map((p) => p.id));
  const storeProdNames = new Set(storeProducts.map((p) => p.name ? p.name.trim().toLowerCase() : ''));

  // Offers related to this store
  const merchantOfferSlides = (offerSlides || []).filter(
    (s) => s && (s.storeId === currentStore.id || s.storeName === currentStore.name)
  );

  // Offer Slide Modal & Form State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<OfferSlide | null>(null);
  const [isSavingSlide, setIsSavingSlide] = useState(false);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideTag, setSlideTag] = useState('عرض خاص');
  const [slideBadge, setSlideBadge] = useState('خصم 25%');
  const [slideGradient, setSlideGradient] = useState('from-emerald-700 via-teal-800 to-slate-900');
  const [slideImage, setSlideImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?w=800');
  const [slideShowTag, setSlideShowTag] = useState(true);
  const [slideShowBadge, setSlideShowBadge] = useState(true);
  const [slideShowTimer, setSlideShowTimer] = useState(true);
  const [slideTimerDuration, setSlideTimerDuration] = useState(6);
  const [slideTimerLabel, setSlideTimerLabel] = useState('ينتهي خلال:');
  const [slideShowCoupon, setSlideShowCoupon] = useState(true);
  const [slideCouponCode, setSlideCouponCode] = useState('STORE25');
  const [slideCouponLabel, setSlideCouponLabel] = useState('كود الخصم:');
  const [slideShowButton, setSlideShowButton] = useState(true);
  const [slideButtonText, setSlideButtonText] = useState('تسوق العرض الآن');
  const [slideDisplayMode, setSlideDisplayMode] = useState<'standard' | 'noFilter' | 'imageOnly'>('standard');

  const gradientPresets = [
    { label: 'بدون (بدون خلفية وتدرج)', value: 'none' },
    { label: 'رمادي داكن ناعم', value: 'from-slate-900 via-slate-800 to-slate-950' },
    { label: 'زمردي وأخضر', value: 'from-emerald-700 via-teal-800 to-slate-900' },
    { label: 'برتقالي وناري', value: 'from-amber-600 via-orange-700 to-slate-950' },
    { label: 'أرجواني ملكي', value: 'from-purple-700 via-indigo-800 to-slate-900' },
    { label: 'أزرق سماوي', value: 'from-blue-700 via-cyan-800 to-slate-900' },
    { label: 'عنابي وذهبي', value: 'from-rose-800 via-red-900 to-stone-950' },
  ];

  const handleOpenAddOffer = () => {
    setEditingSlide(null);
    setSlideTitle(`عرض خاص من ${currentStore.name}`);
    setSlideSubtitle('خصومات حصرية لفترة محدودة على تشكيلة مميزة من المنتجات');
    setSlideTag('عرض مميز');
    setSlideBadge('خصم 20%');
    setSlideGradient('from-emerald-700 via-teal-800 to-slate-900');
    setSlideImage(currentStore.bannerUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800');
    setSlideShowTag(true);
    setSlideShowBadge(true);
    setSlideShowTimer(true);
    setSlideTimerDuration(6);
    setSlideTimerLabel('ينتهي خلال:');
    setSlideShowCoupon(true);
    setSlideCouponCode(`${currentStore.name.slice(0, 4).toUpperCase()}20`);
    setSlideCouponLabel('كود الخصم:');
    setSlideShowButton(true);
    setSlideButtonText('تسوق العرض الآن');
    setSlideDisplayMode('standard');
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (slide: OfferSlide) => {
    setEditingSlide(slide);
    setSlideTitle(slide.title);
    setSlideSubtitle(slide.subtitle || '');
    setSlideTag(slide.tag || 'عرض خاص');
    setSlideBadge(slide.badge || 'خصم خاص');
    setSlideGradient(slide.gradient || 'from-emerald-700 via-teal-800 to-slate-900');
    setSlideImage(slide.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800');
    setSlideShowTag(slide.showTag !== undefined ? slide.showTag : true);
    setSlideShowBadge(slide.showBadge !== undefined ? slide.showBadge : true);
    setSlideShowTimer(slide.showTimer !== undefined ? slide.showTimer : true);
    setSlideTimerDuration(slide.timerDurationHours || 6);
    setSlideTimerLabel(slide.timerLabel || 'ينتهي خلال:');
    setSlideShowCoupon(slide.showCoupon !== undefined ? slide.showCoupon : true);
    setSlideCouponCode(slide.couponCode || 'PROMO20');
    setSlideCouponLabel(slide.couponLabel || 'كود الخصم:');
    setSlideShowButton(slide.showButton !== undefined ? slide.showButton : true);
    setSlideButtonText(slide.buttonText || 'تسوق العرض الآن');
    if (slide.imageOnly) {
      setSlideDisplayMode('imageOnly');
    } else if (slide.noFilter) {
      setSlideDisplayMode('noFilter');
    } else {
      setSlideDisplayMode('standard');
    }
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim() && slideDisplayMode !== 'imageOnly') return;
    setIsSavingSlide(true);
    try {
      const payload = {
        title: slideTitle.trim() || `عرض ${currentStore.name}`,
        subtitle: slideSubtitle.trim(),
        tag: slideTag.trim(),
        badge: slideBadge.trim(),
        gradient: slideGradient,
        image: slideImage.trim(),
        storeId: currentStore.id,
        storeName: currentStore.name,
        showTag: slideShowTag,
        showBadge: slideShowBadge,
        showTimer: slideShowTimer,
        timerDurationHours: Number(slideTimerDuration) || 6,
        timerLabel: slideTimerLabel.trim(),
        showCoupon: slideShowCoupon,
        couponCode: slideCouponCode.trim(),
        couponLabel: slideCouponLabel.trim(),
        showButton: slideShowButton,
        buttonText: slideButtonText.trim(),
        imageOnly: slideDisplayMode === 'imageOnly',
        noFilter: slideDisplayMode === 'noFilter',
      };

      if (editingSlide && onUpdateOfferSlide) {
        await onUpdateOfferSlide(editingSlide.id, payload);
      } else if (onAddOfferSlide) {
        await onAddOfferSlide(payload);
      }
      setIsOfferModalOpen(false);
    } catch (err) {
      console.error('Error saving offer slide:', err);
    } finally {
      setIsSavingSlide(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العرض من السلايدر الرئيسي؟')) {
      if (onDeleteOfferSlide) {
        await onDeleteOfferSlide(id);
      }
    }
  };

  // Filter orders that have items from this store
  const storeOrders = (orders || []).filter((o) => {
    if (!o) return false;
    const hasStop = o.pickupStops && Array.isArray(o.pickupStops) && o.pickupStops.some(
      (st) => st.storeId === currentStore.id || (st.storeName && currentStore.name && st.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase())
    );
    if (hasStop) return true;

    return o.items && Array.isArray(o.items) && o.items.some(
      (item) => {
        if (!item) return false;
        if (item.storeId === currentStore.id) return true;
        if (item.storeName && currentStore.name && item.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
        if (item.productId && storeProdIds.has(item.productId)) return true;
        if (item.productName && storeProdNames.has(item.productName.trim().toLowerCase())) return true;
        return false;
      }
    );
  });

  // Order Sub-Categories
  const newOrders = storeOrders.filter((o) => o.status === 'confirmed' || o.status === 'pending');
  const preparedOrders = storeOrders.filter((o) => o.status === 'picking_up');
  const pickedUpOrders = storeOrders.filter((o) => o.status === 'in_transit' || o.status === 'delivered');

  const displayedOrders = storeOrders.filter((o) => {
    if (orderCategoryFilter === 'new') return o.status === 'confirmed' || o.status === 'pending';
    if (orderCategoryFilter === 'prepared') return o.status === 'picking_up';
    if (orderCategoryFilter === 'picked_up') return o.status === 'in_transit' || o.status === 'delivered';
    return true;
  });

  // Mark existing orders on initial load so page refresh doesn't trigger alerts for old orders
  useEffect(() => {
    if (storeOrders.length === 0) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      setSeenOrderIds((prev) => {
        const existingIds = storeOrders.map((o) => o.id);
        const combined = Array.from(new Set([...prev, ...existingIds]));
        try {
          localStorage.setItem(`seen_orders_${currentStore.id}`, JSON.stringify(combined));
        } catch {}
        return combined;
      });
    }
  }, [storeOrders, currentStore.id]);

  // Helper to dynamically look up real driver name from DB / drivers list
  const getDriverNameForOrder = (ord: Order) => {
    if (ord.assignedDriverId && drivers && drivers.length > 0) {
      const matched = drivers.find((d) => d.id === ord.assignedDriverId || d.userId === ord.assignedDriverId);
      if (matched && matched.driverName) return matched.driverName;
    }
    if (
      ord.assignedDriverName &&
      ord.assignedDriverName !== 'كابتن التوصيل' &&
      ord.assignedDriverName !== 'جاري تعيين كابتن التوصيل...' &&
      ord.assignedDriverName !== 'جاري تعيين الكابتن'
    ) {
      return ord.assignedDriverName;
    }
    if (drivers && drivers.length > 0) {
      const activeDriver = drivers.find((d) => d.isApproved !== false && d.isOnline) || drivers.find((d) => d.isApproved !== false) || drivers[0];
      if (activeDriver && activeDriver.driverName) return activeDriver.driverName;
    }
    return ord.assignedDriverName || 'جاري تعيين الكابتن';
  };

  // Financial calculations
  const totalStoreSales = storeOrders.reduce((sum, order) => {
    const storeItems = (order.items || []).filter((i) => {
      if (!i) return false;
      if (i.storeId === currentStore.id) return true;
      if (i.storeName && currentStore.name && i.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
      if (i.productId && storeProdIds.has(i.productId)) return true;
      if (i.productName && storeProdNames.has(i.productName.trim().toLowerCase())) return true;
      return false;
    });
    return sum + storeItems.reduce((iSum, it) => iSum + (it.price || 0) * (it.quantity || 1), 0);
  }, 0);

  const estimatedProfit = Math.round(totalStoreSales * 0.35); // 35% margin

  // Collect all reviews for products of this store
  const storeReviews: { product: Product; review: ProductReview }[] = [];
  storeProducts.forEach((prod) => {
    if (prod.reviews) {
      prod.reviews.forEach((r) => storeReviews.push({ product: prod, review: r }));
    }
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(currentStore.category);
    setFormPrice(35);
    setFormStock(25);
    setFormDescription('');
    setFormImageUrl(
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    );
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormStock(product.stockQuantity);
    setFormDescription(product.description);
    setFormImageUrl(product.imageUrl);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        name: formName,
        category: formCategory,
        price: Number(formPrice),
        stockQuantity: Number(formStock),
        description: formDescription,
        imageUrl: formImageUrl,
      });
    } else {
      await onAddProduct({
        storeId: currentStore.id,
        name: formName,
        category: formCategory,
        price: Number(formPrice),
        stockQuantity: Number(formStock),
        description: formDescription,
        imageUrl: formImageUrl,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleSaveStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    setStoreSaveSuccess(false);

    try {
      if (onUpdateStore) {
        await onUpdateStore(currentStore.id, {
          name: storeFormName.trim(),
          description: storeFormDesc.trim(),
          category: storeFormCategory,
          logoUrl: storeFormLogo.trim(),
          bannerUrl: storeFormBanner.trim(),
          phone: storeFormPhone.trim(),
          address: storeFormAddress.trim(),
          isOpen: storeFormIsOpen,
          priceLevel: storeFormPriceLevel as any,
        });
      } else {
        const res = await fetch(`/api/stores/${currentStore.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'merchant',
            'x-user-id': currentUser?.id || '',
          },
          body: JSON.stringify({
            name: storeFormName.trim(),
            description: storeFormDesc.trim(),
            category: storeFormCategory,
            logoUrl: storeFormLogo.trim(),
            bannerUrl: storeFormBanner.trim(),
            phone: storeFormPhone.trim(),
            address: storeFormAddress.trim(),
            isOpen: storeFormIsOpen,
            priceLevel: storeFormPriceLevel,
          }),
        });
        if (!res.ok) throw new Error('تعذر حفظ بيانات المتجر');
      }

      setStoreSaveSuccess(true);
      setStoreSaveError('');
      setTimeout(() => setStoreSaveSuccess(false), 3000);
    } catch (err: any) {
      setStoreSaveError(err.message || 'حدث خطأ أثناء حفظ التعديلات');
      setTimeout(() => setStoreSaveError(''), 4000);
    } finally {
      setIsSavingStore(false);
    }
  };

  // Sample quick logo choices
  const presetLogos = [
    { label: 'سوبرماركت', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300' },
    { label: 'بقالة وألبان', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300' },
    { label: 'مطاعم وأكلات', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300' },
    { label: 'حلويات ومخابز', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
    { label: 'لحوم وجزارة', url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300' },
    { label: 'خضار وفواكه', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300' },
  ];

  const presetBanners = [
    { label: 'متجر طازج', url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200' },
    { label: 'سوبرماركت حديث', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200' },
    { label: 'مطعم ومأكولات', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200' },
    { label: 'مخبز راقي', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200' },
  ];

  const handleDismissNotification = (orderId: string) => {
    setDismissedOrderIds((prev) => [...prev, orderId]);
    setSeenOrderIds((prev) => {
      const updated = Array.from(new Set([...prev, orderId]));
      try {
        localStorage.setItem(`seen_orders_${currentStore.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const activeNotificationOrder = storeOrders.find(
    (o) =>
      o &&
      o.id &&
      (o.status === 'confirmed' || o.status === 'pending') &&
      !seenOrderIds.includes(o.id) &&
      !dismissedOrderIds.includes(o.id)
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Pending Approval Notice */}
      {currentStore.isApproved === false && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-amber-900 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-sm md:text-base text-amber-950">
              متجرك قيد المراجعة والموافقة حالياً من قِبل إدارة المنصة ⏳
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              تم استلام طلب تسجيل متجرك بنجاح. بمجرد موافقة الأدمن، سيتفعل المتجر ويظهر لجميع العملاء في منصة بدالك تلقائياً.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentStore.logoUrl}
            alt={currentStore.name}
            className="w-16 h-16 rounded-2xl object-cover border border-[#FF6B00]/30 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00]" />
                المتجر المسجل المعتمد
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${currentStore.isOpen !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {currentStore.isOpen !== false ? 'مستعد لتلقي الطلبات فوراً' : 'المتجر مغلق مؤقتاً'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">
              لوحة تحكم: {currentStore.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{currentStore.address}</span>
              <span>•</span>
              <span className="font-bold text-[#FF6B00]">{currentStore.category}</span>
              <span>•</span>
              <span className="font-digits text-slate-400">{currentStore.phone}</span>
            </div>
          </div>
        </div>

        {/* Store Control Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsStoreSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,107,0,0.3)] cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>تعديل بيانات المتجر</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30 text-[#FF6B00] dark:text-[#FF8533] hover:bg-[#FF6B00]/20'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="تنبيهات صوتية فورية فور وصول طلب جديد"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF6B00]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'صوت التنبيهات مفعّل' : 'صوت التنبيهات مكتوم'}</span>
          </button>
        </div>
      </div>

      {/* Real-time New Order Notification Banner */}
      {activeNotificationOrder && (
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white p-4 rounded-3xl shadow-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm">
                نظام التنبيهات الفوري: تم تأكيد عملية الدفع لطلب جديد!
              </div>
              <div className="text-xs text-orange-100">
                أحدث طلب #<span className="font-digits">{activeNotificationOrder.id.slice(-6)}</span> من العميل "{activeNotificationOrder.customerName}"
                بحالة دفع مؤكدة وجاهز للتجهيز.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPreviewOrder(activeNotificationOrder);
                handleDismissNotification(activeNotificationOrder.id);
              }}
              className="px-4 py-2 rounded-2xl bg-white text-slate-950 text-xs font-bold shadow-xs hover:bg-orange-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-[#FF6B00]" />
              <span>معاينة الطلب</span>
            </button>
            <button
              onClick={() => handleDismissNotification(activeNotificationOrder.id)}
              className="p-2 rounded-2xl bg-black/20 hover:bg-black/40 text-white text-xs transition-all cursor-pointer"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Analytics KPI Row (Cyber Glass cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold">مبيعات اليوم المحققة</span>
            <DollarSign className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div className="text-2xl font-black text-[#FF6B00] font-digits">{totalStoreSales} <span className="text-xs font-bold text-slate-500">ج.م</span></div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18% عن مبيعات الأمس</span>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold">صافي الأرباح الدورية</span>
            <TrendingUp className="w-4 h-4 text-[#00B4D8]" />
          </div>
          <div className="text-2xl font-black text-[#00B4D8] font-digits">{estimatedProfit} <span className="text-xs font-bold text-slate-500">ج.م</span></div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">هامش ربح تقديري 35%</div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold">إجمالي الطلبات الواردة</span>
            <ShoppingBag className="w-4 h-4 text-[#FFD700]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-digits">{storeOrders.length}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">كلها مدفوعة ومؤكدة</div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold">حالة المتجر والجاهزية</span>
            <StoreIcon className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div className={`text-xl font-black ${currentStore.isOpen !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {currentStore.isOpen !== false ? 'مفتوح للطلبات' : 'مغلق مؤقتاً'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">تحكم كامل من نافذة الإعدادات</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>متابعة الطلبات المباشرة (<span className="font-digits">{storeOrders.length}</span>)</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>إدارة المنتجات والمخزون (<span className="font-digits">{storeProducts.length}</span>)</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>تقييمات العملاء (<span className="font-digits">{storeReviews.length}</span>)</span>
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'offers'
              ? 'bg-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,107,0,0.35)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>عروض السلايدر الترويجية (<span className="font-digits">{merchantOfferSlides.length}</span>)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Live Orders Tracking */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                متابعة الطلبات وتصنيف المراحل:
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع الطلبات الجديدة، المجهزة للاستلام، والمستلمة من قبل كابتن التوصيل
              </p>
            </div>
          </div>

          {/* Sub-categories Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 dark:bg-[#0b0f19] p-2 rounded-2xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setOrderCategoryFilter('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                orderCategoryFilter === 'all'
                  ? 'bg-slate-900 dark:bg-[#FF6B00] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-[#020617] hover:bg-slate-200/70 hover:dark:bg-slate-800 border border-slate-200 dark:border-white/10'
              }`}
            >
              <span>جميع الطلبات</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  orderCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                {storeOrders.length}
              </span>
            </button>

            <button
              onClick={() => setOrderCategoryFilter('new')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                orderCategoryFilter === 'new'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-950 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 hover:dark:bg-amber-950/70 border border-amber-300 dark:border-amber-500/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>الطلبات الجديدة (المطلوب تجهيزها)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  orderCategoryFilter === 'new' ? 'bg-amber-950 text-white' : 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
                }`}
              >
                {newOrders.length}
              </span>
            </button>

            <button
              onClick={() => setOrderCategoryFilter('prepared')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                orderCategoryFilter === 'prepared'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 hover:dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>الطلبات التي اتجهزت (جاهزة للاستلام)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  orderCategoryFilter === 'prepared' ? 'bg-emerald-950 text-white' : 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200'
                }`}
              >
                {preparedOrders.length}
              </span>
            </button>

            <button
              onClick={() => setOrderCategoryFilter('picked_up')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                orderCategoryFilter === 'picked_up'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-950 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 hover:dark:bg-blue-950/70 border border-blue-300 dark:border-blue-500/30'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>استلمها المندوب (جاري التوصيل / مكتملة)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  orderCategoryFilter === 'picked_up' ? 'bg-blue-950 text-white' : 'bg-blue-200 dark:bg-blue-900/60 text-blue-950 dark:text-blue-200'
                }`}
              >
                {pickedUpOrders.length}
              </span>
            </button>
          </div>

          {displayedOrders.length === 0 ? (
            <div className="bg-white/95 dark:bg-[#0b0f19] rounded-3xl p-12 text-center border border-slate-200 dark:border-white/10 space-y-3 shadow-xs hover:dark:bg-slate-900/40 hover:dark:border-white/20 transition-all">
              <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200">
                {orderCategoryFilter === 'new'
                  ? 'لا توجد طلبات جديدة مطلوب تجهيزها حالياً'
                  : orderCategoryFilter === 'prepared'
                  ? 'لا توجد طلبات اتجهزت وفي انتظار استلام المندوب'
                  : orderCategoryFilter === 'picked_up'
                  ? 'لا توجد طلبات استلمها المندوب حالياً'
                  : 'لا توجد طلبات واردة حالياً'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                عند تحديث حالة الطلبات أو ورود طلبات جديدة ستظهر التفاصيل هنا تلقائياً
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedOrders.map((order) => {
                const storeSpecificItems = (order.items || []).filter((i) => {
                  if (!i) return false;
                  if (i.storeId === currentStore.id) return true;
                  if (i.storeName && currentStore.name && i.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
                  if (i.productId && storeProdIds.has(i.productId)) return true;
                  if (i.productName && storeProdNames.has(i.productName.trim().toLowerCase())) return true;
                  return false;
                });
                const orderStoreSubtotal = storeSpecificItems.reduce(
                  (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
                  0
                );

                return (
                  <div
                    key={order.id}
                    className="bg-white/95 dark:bg-[#0b0f19] rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4 flex flex-col justify-between hover:dark:bg-slate-900/50 hover:dark:border-white/20 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white text-sm">
                              طلب #{order.id.slice(-6)}
                            </span>
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-300/40">
                              <CheckCircle2 className="w-3 h-3" />
                              تم تأكيد الدفع
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            بتوقيت: {order.createdAt}
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                            {orderStoreSubtotal} ج.م
                          </span>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">حصة هذا المتجر</div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="bg-slate-50/80 dark:bg-[#020617]/70 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">العميل:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {order.customerName} ({order.customerPhone})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">عنوان التسليم:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {order.deliveryAddress}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">المندوب المعين:</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400">
                            {getDriverNameForOrder(order)}
                          </span>
                        </div>
                      </div>

                      {/* Highlighted Driver Notice after order is prepared/ready for pickup */}
                      {(order.status === 'picking_up' || order.status === 'in_transit' || order.status === 'delivered') && (
                        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-3.5 space-y-1 text-xs shadow-2xs animate-in fade-in duration-300">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-black text-emerald-950 dark:text-emerald-200">
                                {order.status === 'picking_up' ? 'الطلب جاهز وفي انتظار وصول المندوب' : order.status === 'in_transit' ? 'استلم المندوب الطلب وهو في الطريق' : 'تم التسليم بنجاح'}
                              </span>
                            </div>
                            <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                              {order.status === 'picking_up' ? 'جاهز للاستلام' : order.status === 'in_transit' ? 'جاري التوصيل' : 'مكتمل'}
                            </span>
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 text-xs font-bold pt-1 border-t border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between">
                            <span>اسم مندوب التوصيل المعتمد:</span>
                            <span className="text-blue-800 dark:text-blue-300 font-black text-xs md:text-sm bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 shadow-2xs">
                              {getDriverNameForOrder(order)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Store Specific Items */}
                      <div className="space-y-2">
                        <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                          الأصناف المطلوب تجهيزها من متجرك:
                        </div>
                        <div className="space-y-1.5">
                          {storeSpecificItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between bg-slate-50/70 dark:bg-[#020617]/50 border border-slate-100 dark:border-white/5 p-2 rounded-xl text-xs"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.price * item.quantity} ج.م
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Order Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        حالة الطلب:
                        <span className="mr-1 text-slate-900 dark:text-white">
                          {order.status === 'confirmed'
                            ? 'قيد التجهيز في المتجر'
                            : order.status === 'picking_up'
                            ? 'جاهز للاستلام وتحديد المندوب'
                            : order.status === 'in_transit'
                            ? 'استلمه المندوب وهو في الطريق'
                            : order.status === 'delivered'
                            ? 'تم التسليم للعميل'
                            : order.status}
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPreviewOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>معاينة الطلب</span>
                        </button>

                        {order.status === 'confirmed' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'picking_up')}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              جاهز للتسليم
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('هل أنت تأكد من رفض هذا الطلب؟ سيتم إعادة الكميات المحددة فوراً إلى مخزون المنتجات.')) {
                                  await onUpdateOrderStatus(order.id, 'rejected');
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 hover:dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1"
                              title="رفض الطلب وإعادة الأصناف للمخزون"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>رفض الطلب</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Inventory & Products Management */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                إدارة المخزون والمنتجات
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إضافة أصناف، تعديل الأسعار، التحكم في الكميات وتفعيل "نفذت الكمية"
              </p>
            </div>

            <button
              id="merchant-add-product-btn"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج جديد</span>
            </button>
          </div>

          {/* Products Table / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-white/95 dark:bg-[#0b0f19] rounded-3xl border p-4.5 shadow-xs space-y-3 flex flex-col justify-between hover:dark:bg-slate-900/50 hover:dark:border-white/20 transition-all ${
                  product.isSoldOut
                    ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-bold">
                          {product.category}
                        </span>
                        {product.isSoldOut ? (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-lg border border-rose-300/40">
                            نفذت الكمية
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300/40">
                            متاح للطلب
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate mt-1">
                        {product.name}
                      </h4>
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {product.price} ج.م
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="bg-slate-50/80 dark:bg-[#020617]/70 p-2.5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">الكمية المتوفرة بالمخزون:</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {product.stockQuantity} وحدة
                    </span>
                  </div>
                </div>

                {/* Actions: Sold Out toggle, Edit, Delete */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onToggleSoldOut(product.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      product.isSoldOut
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-300'
                    }`}
                    title="المنتج يظل معروضاً في المتجر ولكنه غير قابل للطلب من العميل"
                  >
                    {product.isSoldOut ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إعادة الإتاحة</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>تعيين كسولد أوت</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(product)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      title="تعديل تفاصيل المنتج"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 hover:dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 transition-colors cursor-pointer"
                      title="حذف المنتج نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Customer Reviews on Store Products & Side Offers Section */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column 1: Customer Reviews (7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/95 dark:bg-[#0b0f19] p-4.5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span>تقييمات وآراء العملاء على منتجات المتجر</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تعزيز الثقة والتفاعل المباشر مع المشترين ({storeReviews.length} تقييم مسجل)
                </p>
              </div>

              {storeReviews.length > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-500/20 px-3 py-1.5 rounded-2xl text-amber-900 dark:text-amber-300 text-xs font-black">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>متوسط التقييم: {(storeReviews.reduce((sum, r) => sum + r.review.rating, 0) / storeReviews.length).toFixed(1)} / 5</span>
                </div>
              )}
            </div>

            {storeReviews.length === 0 ? (
              <div className="bg-white/95 dark:bg-[#0b0f19] rounded-3xl p-10 text-center border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs hover:dark:bg-slate-900/40 hover:dark:border-white/20 transition-all">
                <Star className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-black text-slate-800 dark:text-white text-sm">لا توجد تقييمات حتى الآن</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  ستظهر هنا تعليقات وتقييمات العملاء فور كتابتها في واجهة العميل عند تجربة منتجاتك
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {storeReviews.map(({ product, review }) => (
                  <div
                    key={review.id}
                    className="bg-white/95 dark:bg-[#0b0f19] rounded-3xl border border-slate-200/80 dark:border-white/10 p-4.5 shadow-xs space-y-2.5 text-xs hover:dark:bg-slate-900/50 hover:dark:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-xs">
                          {review.userName ? review.userName.slice(0, 1) : 'ع'}
                        </div>
                        <span className="font-black text-slate-900 dark:text-white">{review.userName}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-500/20 px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>المنتج: {product.name}</span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-slate-50/60 dark:bg-[#020617]/50 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                      "{review.comment}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                      <span>بتاريخ: {review.createdAt}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">مشتري مؤكد ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Column 2: Offers & Promotions Section beside Reviews (5 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/95 dark:bg-[#0b0f19] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4 hover:dark:bg-slate-900/40 hover:dark:border-white/20 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-[#FF6B00]/10 dark:bg-orange-950/40 text-[#FF6B00] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                      عروض المتجر والسلايدر
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      إنشاء عروض وكوبونات تظهر في أعلى التطبيق
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#FF6B00]/10 text-[#FF6B00]">
                  <span className="font-digits">{merchantOfferSlides.length}</span> عروض
                </span>
              </div>

              {/* Action Button: Create New Offer */}
              <button
                onClick={handleOpenAddOffer}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:from-[#FF8533] hover:to-[#FF6B00] text-white font-black text-xs shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء عرض ترويجي جديد للسلايدر</span>
              </button>

              {/* Active Offers Mini List */}
              {merchantOfferSlides.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50/70 dark:bg-[#020617]/60 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                  <Sparkles className="w-7 h-7 text-[#FF6B00] mx-auto opacity-70" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    لم تنشئ أي عروض ترويجية بعد
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    أنشئ بانر ترويجي بخصومات وعداد وقت تنازلي وكوبون خصم لزيادة مبيعاتك فوراً!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>العروض النشطة الحالية:</span>
                    <button
                      onClick={() => setActiveTab('offers')}
                      className="text-[11px] text-[#FF6B00] hover:underline font-bold"
                    >
                      عرض السلايدر بالكامل ←
                    </button>
                  </div>

                  {merchantOfferSlides.map((slide) => (
                    <div
                      key={slide.id}
                      className="bg-slate-50/80 dark:bg-[#020617]/70 rounded-2xl border border-slate-200/70 dark:border-white/10 p-3.5 space-y-2.5 hover:dark:bg-slate-900/60 hover:dark:border-white/20 transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {slide.tag && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                                {slide.tag}
                              </span>
                            )}
                            {slide.badge && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                {slide.badge}
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-900 dark:text-white text-xs mt-1.5 truncate">
                            {slide.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditOffer(slide)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#FF6B00] hover:text-white text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
                            title="تعديل العرض"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(slide.id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-500 transition-colors shadow-2xs cursor-pointer"
                            title="حذف العرض"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info Badges (Timer & Coupon) */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-white/5 flex-wrap text-[10px]">
                        {slide.showTimer !== false && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                            <Timer className="w-3 h-3" />
                            <span>عداد {slide.timerDurationHours || 6}س</span>
                          </span>
                        )}

                        {slide.showCoupon !== false && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <Ticket className="w-3 h-3" />
                            <span className="font-mono">{slide.couponCode || 'PROMO'}</span>
                          </span>
                        )}

                        <span className="text-slate-400 mr-auto">معروض بالسلايدر</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: Promotional Offer Slides / Slider Management */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF6B00]" />
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  عروض متجرك في السلايدر الرئيسي
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                أنشئ عروضك الترويجية المخصصة، تحكّم في عداد الوقت التنازلي، وكود الخصم، لتظهر فوراً لجميع العملاء في الصفحة الرئيسية
              </p>
            </div>

            <button
              onClick={handleOpenAddOffer}
              className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عرض جديد للسلايدر</span>
            </button>
          </div>

          {/* Offer Slides List */}
          {merchantOfferSlides.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/40 text-[#FF6B00] flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">لا توجد عروض مضافة لمتجرك حالياً</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  قم بإنشاء أول بانر ترويجي لمتجرك ليظهر في أعلى تطبيق بدلِك مع عداد وقت تنازلي وكوبون خصم لجذب آلاف العملاء!
                </p>
              </div>
              <button
                onClick={handleOpenAddOffer}
                className="px-6 py-2.5 rounded-2xl bg-[#FF6B00] text-white font-black text-xs shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أول عرض لمتجري</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {merchantOfferSlides.map((slide) => (
                <div
                  key={slide.id}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  {/* Visual Mini Banner Preview */}
                  <div className="relative rounded-2xl overflow-hidden min-h-[170px] flex flex-col justify-between p-4 shadow-inner border border-white/10">
                    {slide.imageOnly ? (
                      /* Pure Image Mode in Merchant card list */
                      <>
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={slide.title || 'صورة العرض'}
                            className="absolute inset-0 w-full h-full object-cover z-10"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-400 z-10">
                            لا توجد صورة
                          </div>
                        )}
                        <div className="relative z-20 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-black text-amber-300 border border-white/10 flex items-center gap-1 shadow-md">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>صورة فقط (بدون فلتر)</span>
                          </span>
                          <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-md font-bold text-white/90">
                            {slide.storeName || currentStore.name}
                          </span>
                        </div>
                        <div className="relative z-20 mt-auto bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[11px] font-bold inline-block self-start border border-white/10">
                          {slide.title || 'بانر صورة كاملة بدون نصوص'}
                        </div>
                      </>
                    ) : (
                      /* Standard, Crisp or None Mode */
                      <>
                        <div className={`absolute inset-0 z-0 ${
                          slide.gradient === 'none'
                            ? 'bg-slate-950/80 border-dashed border-slate-700'
                            : slide.noFilter
                            ? 'bg-slate-900/90'
                            : `bg-gradient-to-l ${slide.gradient || 'from-emerald-700 to-slate-900'}`
                        }`}></div>
                        {slide.image && (
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className={`absolute inset-0 w-full h-full object-cover z-10 ${
                              slide.gradient === 'none'
                                ? 'opacity-65'
                                : slide.noFilter
                                ? 'opacity-45'
                                : 'opacity-25 mix-blend-overlay'
                            }`}
                          />
                        )}
                        <div className="relative z-20 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {slide.gradient === 'none' && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600 text-[10px] font-bold">
                                  بدون خلفية وتدرج
                                </span>
                              )}
                              {slide.noFilter && slide.gradient !== 'none' && (
                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold">
                                  بدون فلتر داكن
                                </span>
                              )}
                              {slide.showTag !== false && slide.tag && (
                                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black">
                                  {slide.tag}
                                </span>
                              )}
                              {slide.showBadge !== false && slide.badge && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black shadow-xs">
                                  {slide.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-md font-bold text-white/80">
                              {slide.storeName || currentStore.name}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-black text-lg text-white leading-tight">{slide.title}</h4>
                            {slide.subtitle && (
                              <p className="text-xs text-white/80 mt-1 line-clamp-2">{slide.subtitle}</p>
                            )}
                          </div>

                          {/* Interactive Controls Preview */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                            {slide.showTimer !== false && (
                              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-300">
                                <Timer className="w-3.5 h-3.5" />
                                <span>{slide.timerLabel || 'ينتهي خلال:'} <span className="font-digits font-black">{slide.timerDurationHours || 6}س</span></span>
                              </div>
                            )}

                            {slide.showCoupon !== false && (
                              <div className="flex items-center gap-1.5 bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-200">
                                <Ticket className="w-3.5 h-3.5" />
                                <span>{slide.couponLabel || 'كود الخصم:'} <span className="font-mono font-black text-white">{slide.couponCode || 'PROMO'}</span></span>
                              </div>
                            )}

                            {slide.showButton !== false && (
                              <div className="mr-auto px-3 py-1 rounded-xl bg-white text-slate-900 font-black text-[11px] shadow-xs">
                                {slide.buttonText || 'تسوق الآن'}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Controls Info & Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className={`inline-flex items-center gap-1 font-bold ${slide.showTimer !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        <Timer className="w-3 h-3" />
                        <span>العداد {slide.showTimer !== false ? 'مفعل' : 'معطل'}</span>
                      </span>
                      <span>•</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${slide.showCoupon !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        <Ticket className="w-3 h-3" />
                        <span>الكوبون {slide.showCoupon !== false ? 'مفعل' : 'معطل'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditOffer(slide)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00] hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(slide.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 text-rose-600 hover:text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Offer Slide Create / Edit Modal with Live Preview */}
      {/* ------------------------------------------------------------- */}
      {isOfferModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsOfferModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto text-right border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF6B00]" />
                  <span>{editingSlide ? 'تعديل بيانات العرض الترويجي' : 'إنشاء عرض ترويجي جديد للسلايدر'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تحكم في محتوى العرض، عداد التنازل، والكوبون، وشاهد المعاينة المباشرة فوراً
                </p>
              </div>

              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Interactive Banner Preview Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-xs text-slate-500 dark:text-slate-400">
                  معاينة مباشرة لشكل البانر في السلايدر:
                </label>
                {slideDisplayMode === 'imageOnly' && (
                  <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>وضع الصورة الكاملة بدون فلاتر</span>
                  </span>
                )}
              </div>

              {slideDisplayMode === 'imageOnly' ? (
                /* Pure Image Preview */
                <div className="relative rounded-2xl overflow-hidden min-h-[190px] shadow-lg border border-slate-200 dark:border-white/10 flex items-center justify-center bg-slate-950 z-10">
                  {slideImage ? (
                    <img
                      src={slideImage}
                      alt="Banner Preview"
                      className="w-full h-48 sm:h-56 object-cover relative z-10"
                    />
                  ) : (
                    <div className="py-12 text-slate-400 flex flex-col items-center gap-2 z-10">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-xs">يرجى إدخال رابط الصورة لعرض البانر النقي</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-black border border-white/10 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>صورة صافية بدون فلتر أو نصوص</span>
                  </div>
                  <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white/90 text-[10px] font-bold">
                    {currentStore.name}
                  </div>
                </div>
              ) : (
                /* Standard, Crisp No-Filter or None Banner Preview */
                <div className={`relative rounded-2xl overflow-hidden ${
                  slideGradient === 'none'
                    ? 'bg-slate-950/80 border-dashed border-slate-700'
                    : slideDisplayMode === 'noFilter'
                    ? 'bg-slate-900/90'
                    : `bg-gradient-to-l ${slideGradient}`
                } text-white p-5 shadow-lg border border-white/10`}>
                  {slideImage && (
                    <img
                      src={slideImage}
                      alt="Preview"
                      className={`absolute inset-0 w-full h-full object-cover z-10 ${
                        slideGradient === 'none'
                          ? 'opacity-65'
                          : slideDisplayMode === 'noFilter'
                          ? 'opacity-45'
                          : 'opacity-25 mix-blend-overlay'
                      }`}
                    />
                  )}
                  <div className="relative z-20 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {slideGradient === 'none' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600 text-[10px] font-bold">
                            بدون خلفية وتدرج
                          </span>
                        )}
                        {slideDisplayMode === 'noFilter' && slideGradient !== 'none' && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold">
                            صورة واضحة بدون فلتر داكن
                          </span>
                        )}
                        {slideShowTag && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black animate-in fade-in">
                            {slideTag || 'عرض خاص'}
                          </span>
                        )}
                        {slideShowBadge && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black shadow-xs animate-in fade-in">
                            {slideBadge || 'خصم مميز'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] bg-black/40 px-2.5 py-0.5 rounded-md font-bold text-white/90">
                        {currentStore.name}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-lg sm:text-xl text-white leading-tight">
                        {slideTitle || 'عنوان العرض الترويجي'}
                      </h4>
                      {slideSubtitle && (
                        <p className="text-xs text-white/80 mt-1">{slideSubtitle}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                      {slideShowTimer && (
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-300 animate-in fade-in">
                          <Timer className="w-3.5 h-3.5" />
                          <span>{slideTimerLabel || 'ينتهي خلال:'} <span className="font-digits font-black">{slideTimerDuration}س</span> 00د</span>
                        </div>
                      )}

                      {slideShowCoupon && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-200 animate-in fade-in">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{slideCouponLabel || 'كود الخصم:'} <span className="font-mono font-black text-white">{slideCouponCode || 'PROMO'}</span></span>
                        </div>
                      )}

                      {slideShowButton && (
                        <div className="mr-auto px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-black text-xs shadow-xs animate-in fade-in">
                          {slideButtonText || 'تسوق الآن'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4 text-xs">
              {/* Mode Selection Tabs */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
                <label className="block font-bold text-[11px] text-slate-600 dark:text-slate-300 mb-1.5 px-2">
                  طريقة عرض البانر في السلايدر:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSlideDisplayMode('standard')}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      slideDisplayMode === 'standard'
                        ? 'bg-white dark:bg-slate-700 text-[#FF6B00] shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>تدرج وتصميم نصوص</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlideDisplayMode('noFilter')}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      slideDisplayMode === 'noFilter'
                        ? 'bg-white dark:bg-slate-700 text-[#FF6B00] shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>صورة واضحة + نصوص</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlideDisplayMode('imageOnly')}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      slideDisplayMode === 'imageOnly'
                        ? 'bg-[#FF6B00] text-white shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>صورة فقط (بدون فلتر)</span>
                  </button>
                </div>
              </div>

              {/* Notice when pure image mode is selected */}
              {slideDisplayMode === 'imageOnly' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 p-3 rounded-2xl text-amber-900 dark:text-amber-200 space-y-1 animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>ملاحظة وضع الصورة النقية:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    سيتم عرض صورتك مباشرة في السلايدر الرئيسي بكامل دقتها ونقائها دون أي تدرج لوني أو نصوص فوقها. يمكنك وضع تفاصيل العرض والتخفيضات داخل تصميم الصورة نفسها.
                  </p>
                </div>
              )}

              {/* Image Input - Prominent */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10">
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#FF6B00]" />
                  <span>رابط صورة البانر (Image URL):</span>
                </label>
                <input
                  type="url"
                  required
                  value={slideImage}
                  onChange={(e) => setSlideImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-mono text-xs focus:outline-hidden focus:border-[#FF6B00]"
                />
              </div>

              {/* Title & Subtitle */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${slideDisplayMode === 'imageOnly' ? 'opacity-60' : ''}`}>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {slideDisplayMode === 'imageOnly' ? 'اسم/مسمى العرض (للإدارة فقط):' : 'عنوان العرض الرئيسي:'}
                  </label>
                  <input
                    type="text"
                    required={slideDisplayMode !== 'imageOnly'}
                    value={slideTitle}
                    onChange={(e) => setSlideTitle(e.target.value)}
                    placeholder="مثال: خصم 30% على جميع طلبات المشويات"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    الوصف التوضيحي للعرض:
                  </label>
                  <input
                    type="text"
                    disabled={slideDisplayMode === 'imageOnly'}
                    value={slideSubtitle}
                    onChange={(e) => setSlideSubtitle(e.target.value)}
                    placeholder={slideDisplayMode === 'imageOnly' ? 'غير مستخدم في وضع الصورة فقط' : 'مثال: يسري العرض لفترة محدودة على جميع الأصناف'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-[#FF6B00] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* 2. Color Gradient & Image (Only if standard or noFilter) */}
              {slideDisplayMode !== 'imageOnly' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#FF6B00]" />
                      <span>خلفية وتدرج البانر:</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {gradientPresets.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSlideGradient(g.value)}
                        className={`p-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          g.value === 'none'
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : `text-white bg-gradient-to-l ${g.value}`
                        } ${
                          slideGradient === g.value ? 'ring-2 ring-[#FF6B00] scale-102 shadow-md' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Countdown Timer Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-black text-slate-800 dark:text-slate-200">عداد الوقت التنازلي (Countdown Timer)</div>
                      <div className="text-[10px] text-slate-500">عرض مؤقت ينتهي خلال ساعات محددة لتحفيز الشراء</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSlideShowTimer(!slideShowTimer)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      slideShowTimer ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {slideShowTimer ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{slideShowTimer ? 'مفعل' : 'معطل'}</span>
                  </button>
                </div>

                {slideShowTimer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-white/5 animate-in fade-in">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        مدة العداد بالساعات:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={72}
                        value={slideTimerDuration}
                        onChange={(e) => setSlideTimerDuration(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-digits font-bold focus:outline-hidden focus:border-[#FF6B00]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نص عنوان العداد:
                      </label>
                      <input
                        type="text"
                        value={slideTimerLabel}
                        onChange={(e) => setSlideTimerLabel(e.target.value)}
                        placeholder="ينتهي خلال:"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Coupon Code Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-black text-slate-800 dark:text-slate-200">كود الخصم والكوبون (Coupon Promo)</div>
                      <div className="text-[10px] text-slate-500">إظهار كود كوبون مميز قابل للنسخ بنقرة واحدة</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSlideShowCoupon(!slideShowCoupon)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      slideShowCoupon ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {slideShowCoupon ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{slideShowCoupon ? 'مفعل' : 'معطل'}</span>
                  </button>
                </div>

                {slideShowCoupon && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-white/5 animate-in fade-in">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        رمز كود الخصم (Coupon Code):
                      </label>
                      <input
                        type="text"
                        value={slideCouponCode}
                        onChange={(e) => setSlideCouponCode(e.target.value.toUpperCase())}
                        placeholder="STORE20"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-mono font-black focus:outline-hidden focus:border-[#FF6B00]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نص عنوان الكوبون:
                      </label>
                      <input
                        type="text"
                        value={slideCouponLabel}
                        onChange={(e) => setSlideCouponLabel(e.target.value)}
                        placeholder="كود الخصم:"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Tag, Badge, & Action Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">التاج والشارة:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSlideShowTag(!slideShowTag)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${slideShowTag ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}
                      >
                        التاج: {slideShowTag ? 'ظاهر' : 'مخفي'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideShowBadge(!slideShowBadge)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${slideShowBadge ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'}`}
                      >
                        الشارة: {slideShowBadge ? 'ظاهرة' : 'مخفية'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={slideTag}
                      onChange={(e) => setSlideTag(e.target.value)}
                      placeholder="عرض مميز"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    />
                    <input
                      type="text"
                      value={slideBadge}
                      onChange={(e) => setSlideBadge(e.target.value)}
                      placeholder="خصم 20%"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">زر الشراء والتوجيه:</label>
                    <button
                      type="button"
                      onClick={() => setSlideShowButton(!slideShowButton)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${slideShowButton ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}
                    >
                      الزر: {slideShowButton ? 'ظاهر' : 'مخفي'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={slideButtonText}
                    onChange={(e) => setSlideButtonText(e.target.value)}
                    placeholder="تسوق العرض الآن"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Submit / Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlide}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-orange-600 text-white font-black shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSlide ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ العرض...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingSlide ? 'حفظ تعديلات العرض' : 'إضافة ونشر العرض في السلايدر'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Store Settings Popup Modal (المطلوب في البرومبت: إعدادات المتجر في بوب اب) */}
      {/* ------------------------------------------------------------- */}
      {isStoreSettingsOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsStoreSettingsOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#0b0f19] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto text-right border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>تعديل وإعدادات بيانات المتجر</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  قم بتعديل بيانات متجرك وحفظ التغييرات فوراً في قاعدة البيانات
                </p>
              </div>

              <button
                onClick={() => setIsStoreSettingsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {storeSaveSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تم حفظ تعديلات المتجر في قاعدة البيانات بنجاح!</span>
              </div>
            )}

            {storeSaveError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/30 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{storeSaveError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                await handleSaveStoreProfile(e);
                setIsStoreSettingsOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              {/* 1. Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    اسم المتجر التجاري:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={storeFormName}
                      onChange={(e) => setStoreFormName(e.target.value)}
                      placeholder="مثال: هايبر ماركت البركة"
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                    <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    تصنيف وقسم المتجر:
                  </label>
                  <div className="relative">
                    <select
                      value={storeFormCategory}
                      onChange={(e) => setStoreFormCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    >
                      {categories.length > 0 ? (
                        categories.map((cat, i) => (
                          <option key={i} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{cat}</option>
                        ))
                      ) : (
                        <>
                          <option value="سوبرماركت" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">سوبرماركت وبقالة</option>
                          <option value="مطاعم" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">مطاعم ومأكولات سريعة</option>
                          <option value="مخابز وحلويات" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">مخابز وحلويات شرقية وغربية</option>
                          <option value="جزارة ولحوم" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">جزارة ولحوم طازجة</option>
                          <option value="خضار وفواكه" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">خضار وفواكه طازجة</option>
                          <option value="أجبان وألبان" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">أجبان ومنتجات ألبان</option>
                          <option value="عطارة وتوابل" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">عطارة وتوابل وأعشاب</option>
                          <option value="صيدلية" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">صيدلية وعناية شخصية</option>
                          <option value="كافيهات ومشروبات" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">كافيهات وعصائر</option>
                          <option value="عام" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">متجر تجاري عام</option>
                        </>
                      )}
                    </select>
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 2. Description */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  نبذة ووصف المتجر (يظهر للمشترين):
                </label>
                <textarea
                  rows={2}
                  value={storeFormDesc}
                  onChange={(e) => setStoreFormDesc(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن متجرك وأفضل ما يميز منتجاتك..."
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>

              {/* 3. Phone & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    رقم هاتف المتجر (11 رقم):
                  </label>
                  <div className="relative">
                    <input
                      id="merchant-store-phone-modal"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      required
                      value={storeFormPhone}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setStoreFormPhone(cleanValue);
                      }}
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-bold text-right focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    عنوان وموقع المتجر في قنا:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={storeFormAddress}
                      onChange={(e) => setStoreFormAddress(e.target.value)}
                      placeholder="مثال: شارع الجمهورية، بجوار المحطة، قنا"
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* 4. Logo URL & Quick Presets */}
              <div className="space-y-2 bg-slate-50 dark:bg-[#020617] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  شعار المتجر (Logo Image):
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={storeFormLogo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                    alt="Store Logo Preview"
                    className="w-12 h-12 rounded-2xl object-cover border border-amber-300 dark:border-amber-500/40 shadow-xs shrink-0"
                  />
                  <input
                    type="url"
                    required
                    value={storeFormLogo}
                    onChange={(e) => setStoreFormLogo(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium text-xs focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">شعارات جاهزة:</span>
                  {presetLogos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStoreFormLogo(p.url)}
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-900 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Banner URL & Quick Presets */}
              <div className="space-y-2 bg-slate-50 dark:bg-[#020617] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  صورة غلاف وبانر المتجر (Banner Image):
                </label>
                <div className="space-y-2">
                  <div className="h-20 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative">
                    <img
                      src={storeFormBanner || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200'}
                      alt="Store Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-2">
                      <span className="text-white text-xs font-bold">{storeFormName}</span>
                    </div>
                  </div>
                  <input
                    type="url"
                    required
                    value={storeFormBanner}
                    onChange={(e) => setStoreFormBanner(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium text-xs focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">أغلفة جاهزة:</span>
                  {presetBanners.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStoreFormBanner(p.url)}
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-900 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Open / Closed switch & Price level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#020617] p-3.5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between p-1">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      حالة فتح المتجر للطلبات:
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {storeFormIsOpen ? 'متاح لاستقبال الطلبات الفورية' : 'مغلق ومُعطّل مؤقتاً'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStoreFormIsOpen(!storeFormIsOpen)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      storeFormIsOpen
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                    }`}
                  >
                    {storeFormIsOpen ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>مفتوح</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>مغلق</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    مستوى الأسعار:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['$', '$$', '$$$'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setStoreFormPriceLevel(level as any)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          storeFormPriceLevel === level
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 hover:dark:bg-slate-700'
                        }`}
                      >
                        {level === '$' ? '$ اقتصادي' : level === '$$' ? '$$ متوسط' : '$$$ فاخر'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsStoreSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 hover:dark:bg-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Order Details Preview Popup Modal (المطلوب في البرومبت: معاينة الطلب بوب اب) */}
      {/* ------------------------------------------------------------- */}
      {selectedPreviewOrder && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedPreviewOrder(null)}
        >
          <div
            className="bg-white dark:bg-[#0b0f19] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto text-right border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                    تفاصيل الطلب #{selectedPreviewOrder.id.slice(-6)}
                  </h3>
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-300/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    تم تأكيد الدفع
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  بتوقيت: {selectedPreviewOrder.createdAt}
                </p>
              </div>

              <button
                onClick={() => setSelectedPreviewOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Delivery Box */}
            <div className="bg-slate-50/80 dark:bg-[#020617] p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center justify-between">
                <span>معلومات العميل والتسليم:</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  وسيلة الدفع: {selectedPreviewOrder.paymentMethod === 'card' ? 'فيزا / بطاقة بانكية' : 'كاش عند الاستلام'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">اسم العميل:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPreviewOrder.customerName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">رقم الهاتف:</span>
                <a
                  href={`tel:${selectedPreviewOrder.customerPhone}`}
                  className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedPreviewOrder.customerPhone}</span>
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">عنوان التسليم:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{selectedPreviewOrder.deliveryAddress}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">الكابتن المندوب:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {selectedPreviewOrder.assignedDriverName || 'جاري تعيين الكابتن'}
                </span>
              </div>
            </div>

            {/* Highlighted Driver Notice in Modal */}
            {(selectedPreviewOrder.status === 'picking_up' || selectedPreviewOrder.status === 'in_transit' || selectedPreviewOrder.status === 'delivered') && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-black text-emerald-950 dark:text-emerald-200">
                      {selectedPreviewOrder.status === 'picking_up' ? 'الطلب جاهز وفي انتظار وصول المندوب' : selectedPreviewOrder.status === 'in_transit' ? 'استلم المندوب الطلب وهو في الطريق' : 'تم التسليم بنجاح'}
                    </span>
                  </div>
                  <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shrink-0">
                    {selectedPreviewOrder.status === 'picking_up' ? 'جاهز للاستلام' : selectedPreviewOrder.status === 'in_transit' ? 'جاري التوصيل' : 'مكتمل'}
                  </span>
                </div>
                <div className="text-slate-800 dark:text-slate-200 text-xs font-bold pt-1.5 border-t border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between">
                  <span>اسم المندوب المسؤول عن الاستلام:</span>
                  <span className="text-blue-800 dark:text-blue-300 font-black text-sm bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 shadow-2xs">
                    {getDriverNameForOrder(selectedPreviewOrder)}
                  </span>
                </div>
              </div>
            )}

            {/* Store Specific Items */}
            <div className="space-y-2 text-xs">
              <div className="font-black text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>الأصناف المطلوب تجهيزها من متجرك:</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {(selectedPreviewOrder.items || [])
                    .filter((i) => {
                      if (!i || !currentStore) return false;
                      if (i.storeId === currentStore.id) return true;
                      if (i.storeName && currentStore.name && i.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
                      if (i.productId && storeProdIds.has(i.productId)) return true;
                      if (i.productName && storeProdNames.has(i.productName.trim().toLowerCase())) return true;
                      return false;
                    })
                    .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)}{' '}
                  ج.م
                </span>
              </div>

              <div className="space-y-2 border border-slate-200 dark:border-white/10 rounded-2xl p-3 bg-white dark:bg-[#020617]">
                {(selectedPreviewOrder.items || [])
                  .filter((i) => {
                    if (!i || !currentStore) return false;
                    if (i.storeId === currentStore.id) return true;
                    if (i.storeName && currentStore.name && i.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
                    if (i.productId && storeProdIds.has(i.productId)) return true;
                    if (i.productName && storeProdNames.has(i.productName.trim().toLowerCase())) return true;
                    return false;
                  })
                  .map((item, idx) => (
                    <div
                      key={item.id || item.productId || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-white/5"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.quantity} x {item.price} ج.م
                        </div>
                      </div>
                      <div className="font-black text-slate-900 dark:text-white text-sm">
                        {item.price * item.quantity} ج.م
                      </div>
                    </div>
                  ))}

                {(selectedPreviewOrder.items || []).filter((i) => {
                  if (!i || !currentStore) return false;
                  if (i.storeId === currentStore.id) return true;
                  if (i.storeName && currentStore.name && i.storeName.trim().toLowerCase() === currentStore.name.trim().toLowerCase()) return true;
                  if (i.productId && storeProdIds.has(i.productId)) return true;
                  if (i.productName && storeProdNames.has(i.productName.trim().toLowerCase())) return true;
                  return false;
                }).length === 0 && (
                  <div className="text-slate-400 text-center py-2">لا توجد أصناف تابعة لمتجرك في هذا الطلب</div>
                )}
              </div>
            </div>

            {/* Order Status & Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">حالة الطلب الحالية:</span>
                <span className="font-black text-slate-900 dark:text-white text-xs">
                  {selectedPreviewOrder.status === 'confirmed'
                    ? 'قيد التجهيز في المتجر'
                    : selectedPreviewOrder.status === 'picking_up'
                    ? 'جاهز لتسليم المندوب'
                    : selectedPreviewOrder.status === 'in_transit'
                    ? 'استلمه المندوب وهو في الطريق'
                    : selectedPreviewOrder.status === 'delivered'
                    ? 'تم التسليم بنجاح'
                    : selectedPreviewOrder.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedPreviewOrder.status === 'confirmed' && (
                  <>
                    <button
                      onClick={async () => {
                        await onUpdateOrderStatus(selectedPreviewOrder.id, 'picking_up');
                        setSelectedPreviewOrder({
                          ...selectedPreviewOrder,
                          status: 'picking_up',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الجاهزية للتسليم</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (confirm('هل أنت تأكد من رفض هذا الطلب؟ سيتم إعادة كافة كميات الأصناف فوراً إلى مخزون المتجر.')) {
                          await onUpdateOrderStatus(selectedPreviewOrder.id, 'rejected');
                          setSelectedPreviewOrder({
                            ...selectedPreviewOrder,
                            status: 'rejected',
                          });
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 hover:dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span>رفض الطلب وإعادة للمخزون</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedPreviewOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 hover:dark:bg-slate-700 transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Add / Edit Product Modal */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#0b0f19] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-right border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد إلى المتجر'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  اسم المنتج:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: جبنة شيدر إنجليزية معتقة..."
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    السعر (ج.م):
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    الكمية بالمخزون (الستوك):
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">القسم:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
                >
                  {categories.length > 0 ? (
                    categories.map((cat, i) => (
                      <option key={i} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{cat}</option>
                    ))
                  ) : (
                    <>
                      <option value="أجبان وألبان" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">أجبان وألبان</option>
                      <option value="جزارة ولحوم" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">جزارة ولحوم</option>
                      <option value="سوبرماركت" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">سوبرماركت</option>
                      <option value="مخابز وحلويات" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">مخابز وحلويات</option>
                      <option value="خضار وفواكه" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">خضار وفواكه</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  رابط صورة المنتج (Image URL):
                </label>
                <input
                  type="url"
                  required
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  الوصف والمواصفات:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="تفاصيل الوزن، المكونات، والصلاحية..."
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 hover:dark:bg-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ المنتج</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
