import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Store,
  Product,
  CartItem,
  ProductReview,
  OfferSlide,
} from '../types.ts';
import {
  Sparkles,
  MapPin,
  Star,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Store as StoreIcon,
  ShoppingBag,
  Clock,
  Flame,
  AlertCircle,
  MessageSquarePlus,
  Send,
  X,
  Truck,
  ShieldCheck,
  RotateCcw,
  Zap,
  Tag,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface CustomerViewProps {
  stores: Store[];
  products: Product[];
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStoreId: string | null;
  onSelectStore: (storeId: string | null) => void;
  onAddReview: (productId: string, rating: number, comment: string) => void;
  categories?: string[];
  offerSlides?: OfferSlide[];
  onOpenOrders?: () => void;
  ordersCount?: number;
  activeOrdersCount?: number;
  userPoints?: number;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  stores,
  products,
  cartItems,
  onAddToCart,
  onUpdateCartQuantity,
  searchQuery,
  onSearchChange,
  selectedStoreId,
  onSelectStore,
  onAddReview,
  categories,
  offerSlides,
  onOpenOrders,
  ordersCount = 0,
  activeOrdersCount = 0,
  userPoints = 0,
}) => {
  // Hero Slider state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Amazon Sidebar Filters
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(300);
  const [selectedStoresList, setSelectedStoresList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');

  // PDP (Product Detail Page) 3-column modal state
  const [pdpProduct, setPdpProduct] = useState<Product | null>(null);
  const [pdpQuantity, setPdpQuantity] = useState<number>(1);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);

  // Review Form inside PDP
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showAddReviewForm, setShowAddReviewForm] = useState(false);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);

  // Offer Card Countdown Timer
  const [countdown, setCountdown] = useState({ hours: 5, minutes: 42, seconds: 18 });
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // Lock body scroll when PDP is open
  useEffect(() => {
    if (!pdpProduct) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPdpProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdpProduct]);

  // Default Amazon Hero Offer Slides
  const DEFAULT_OFFER_SLIDES: OfferSlide[] = [
    {
      id: 'amazon_hero_1',
      title: 'عروض التوفير الكبرى في قنا',
      subtitle: 'خصومات تصل حتى 40% على الأجبان، السوبرماركت ومستلزمات المنزل مع توصيل موحد وسريع',
      tag: 'عروض اليوم',
      badge: 'توفير فوري',
      gradient: 'from-[#232F3E] via-[#131921] to-[#37475A]',
      buttonText: 'تسوق العروض الآن',
      couponCode: 'BADALIK20',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 'amazon_hero_2',
      title: 'منتجات طازجة يومياً من مزارع قنا',
      subtitle: 'ألبان، خضروات، ومخبوزات بلدي طازجة تصلك في غضون دقائق من أقرب متجر في منطقتك',
      tag: 'طازج وسريع',
      badge: 'خصم 25%',
      gradient: 'from-[#0F1111] via-[#232F3E] to-[#146EB4]',
      buttonText: 'تصفح الخضار والألبان',
      couponCode: 'FRESH10',
      image: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&q=80&w=1200',
    },
  ];

  const activeOfferSlides = offerSlides && offerSlides.length > 0 ? offerSlides : DEFAULT_OFFER_SLIDES;

  useEffect(() => {
    if (activeOfferSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeOfferSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeOfferSlides.length]);

  // Categories list
  const allCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return ['الكل', ...categories.filter((c) => c !== 'الكل')];
    }
    const catSet = new Set<string>();
    products.forEach((p) => {
      if (p.category) catSet.add(p.category);
    });
    return ['الكل', ...Array.from(catSet)];
  }, [categories, products]);

  // Store lists for filtering
  const allStores = stores;

  const handleToggleStoreFilter = (storeId: string) => {
    setSelectedStoresList((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedCategory('الكل');
    setMinRatingFilter(0);
    setInStockOnly(false);
    setPrimeOnly(false);
    setMaxPriceFilter(300);
    setSelectedStoresList([]);
    onSelectStore(null);
    onSearchChange('');
  };

  const hasActiveFilters =
    selectedCategory !== 'الكل' ||
    minRatingFilter > 0 ||
    inStockOnly ||
    primeOnly ||
    maxPriceFilter < 300 ||
    selectedStoresList.length > 0 ||
    selectedStoreId !== null ||
    searchQuery.trim() !== '';

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'الكل') count++;
    if (minRatingFilter > 0) count++;
    if (inStockOnly) count++;
    if (primeOnly) count++;
    if (maxPriceFilter < 300) count++;
    if (selectedStoresList.length > 0) count += selectedStoresList.length;
    if (selectedStoreId !== null) count++;
    return count;
  }, [
    selectedCategory,
    minRatingFilter,
    inStockOnly,
    primeOnly,
    maxPriceFilter,
    selectedStoresList,
    selectedStoreId,
  ]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesStore = p.storeName?.toLowerCase().includes(q) || false;
        const matchesCategory = p.category?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc && !matchesStore && !matchesCategory) {
          return false;
        }
      }

      // Selected single store prop
      if (selectedStoreId && p.storeId !== selectedStoreId) {
        return false;
      }

      // Multiple selected stores filter
      if (selectedStoresList.length > 0 && !selectedStoresList.includes(p.storeId)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'الكل' && p.category !== selectedCategory) {
        return false;
      }

      // Max price
      if (p.price > maxPriceFilter) {
        return false;
      }

      // Rating filter
      if (minRatingFilter > 0 && p.rating < minRatingFilter) {
        return false;
      }

      // In stock only
      if (inStockOnly && (p.isSoldOut || p.stockQuantity <= 0)) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedStoreId,
    selectedStoresList,
    selectedCategory,
    maxPriceFilter,
    minRatingFilter,
    inStockOnly,
    sortBy,
  ]);

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdpProduct) return;
    onAddReview(pdpProduct.id, reviewRating, reviewComment);
    setReviewSubmitSuccess(true);
    setReviewComment('');
    setTimeout(() => {
      setShowAddReviewForm(false);
      setReviewSubmitSuccess(false);
    }, 2000);
  };

  // Image zoom handler for PDP
  const handleMouseMoveZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleMouseLeaveZoom = () => {
    setZoomPos(null);
  };

  const activeStoreObj = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="space-y-6 pb-16 text-right">
      {/* ------------------------------------------------------------- */}
      {/* 1. Amazon Top Hero Banner & Promotions Carousel                */}
      {/* ------------------------------------------------------------- */}
      {!searchQuery && !selectedStoreId && (
        <section className="relative overflow-hidden rounded-md shadow-sm border border-[#D5D9D9] dark:border-[#37475A] bg-white dark:bg-[#1A1F26]">
          <div className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[340px] w-full overflow-hidden">
            {activeOfferSlides.map((slide, idx) => {
              const isCurrent = idx === currentSlide;
              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 md:p-10 bg-gradient-to-r from-[#232F3E] via-[#1A2533] to-[#2E3D4F] text-white">
                    {/* Background Overlay Image */}
                    {slide.image && (
                      <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none">
                        <img
                          src={slide.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative z-10 max-w-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#FF9900] text-[#0F1111] font-bold text-xs px-2.5 py-0.5 rounded-xs uppercase">
                          {slide.tag || 'عرض خاص'}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-[#FFD814] bg-black/40 px-2 py-0.5 rounded-xs">
                          <Clock className="w-3.5 h-3.5 text-[#FFD814]" />
                          <span>ينتهي خلال:</span>
                          <span className="font-bold">
                            {String(countdown.hours).padStart(2, '0')}:
                            {String(countdown.minutes).padStart(2, '0')}:
                            {String(countdown.seconds).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight text-white">
                        {slide.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed line-clamp-2">
                        {slide.subtitle}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            const el = document.getElementById('products-main-grid');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="amazon-btn-yellow px-5 py-2 text-xs sm:text-sm font-bold shadow-sm"
                        >
                          {slide.buttonText || 'تسوق العروض الآن'}
                        </button>

                        {slide.couponCode && (
                          <button
                            onClick={() => handleCopyCoupon(slide.couponCode || 'BADALIK')}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-2 rounded-xs text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5 text-[#FF9900]" />
                            <span>كود الخصم: {slide.couponCode}</span>
                            {copiedCoupon === slide.couponCode && (
                              <span className="text-[#007600] bg-white px-1.5 py-0.2 text-[10px] rounded-xs font-bold">
                                تم النسخ!
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image Preview Card on desktop */}
                    {slide.image && (
                      <div className="relative z-10 hidden md:block w-72 h-56 rounded-xs overflow-hidden shadow-lg border-2 border-white/20 shrink-0">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Slider Controls */}
            {activeOfferSlides.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentSlide(
                      (prev) => (prev - 1 + activeOfferSlides.length) % activeOfferSlides.length
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-14 bg-black/40 hover:bg-black/70 text-white flex items-center justify-center rounded-xs transition-colors cursor-pointer"
                  title="السابق"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % activeOfferSlides.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-14 bg-black/40 hover:bg-black/70 text-white flex items-center justify-center rounded-xs transition-colors cursor-pointer"
                  title="التالي"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1.5. Customer Orders & Loyalty Quick Access Strip             */}
      {/* ------------------------------------------------------------- */}
      {onOpenOrders && (
        <div className="bg-gradient-to-l from-amber-500/10 via-orange-500/5 to-slate-100 dark:to-slate-900/60 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF9900] text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Truck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  طلباتي ومتابعة الشحنات المباشرة
                </span>
                {activeOrdersCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                    {activeOrdersCount} طلب جاري الآن
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تتبع مسار الكابتن واستلام المتاجر في قنا لحظة بلحظة • نقاطك الحالية: <b className="text-amber-600 dark:text-amber-400">{userPoints} نقطة</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenOrders}
              className="amazon-btn-yellow px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>عرض سجل طلباتي والتتبع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Active Store Header (if filtering by store)                 */}
      {/* ------------------------------------------------------------- */}
      {activeStoreObj && (
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] p-4 rounded-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={activeStoreObj.logoUrl}
              alt={activeStoreObj.name}
              className="w-14 h-14 rounded-xs object-cover border border-[#D5D9D9]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#FF9900]/15 text-[#B12704] font-bold px-2 py-0.5 rounded-xs">
                  متجر رسمي معتمد
                </span>
                <h2 className="text-lg font-bold text-[#0F1111] dark:text-white">
                  {activeStoreObj.name}
                </h2>
              </div>
              <p className="text-xs text-[#565959] dark:text-[#9CA3AF] mt-0.5">
                {activeStoreObj.address} • {activeStoreObj.category}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#565959] dark:text-[#9CA3AF] mt-1">
                <span className="flex items-center gap-1 text-[#FFA41C] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#FFA41C] text-[#FFA41C]" />
                  {activeStoreObj.rating} ({activeStoreObj.reviewCount} تقييم)
                </span>
                <span>•</span>
                {activeStoreObj.isOpen !== false ? (
                  <span className="text-[#007600] font-bold">مفتوح الآن للتوصيل في قنا</span>
                ) : (
                  <span className="text-[#BA0933] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-900">
                    <Clock className="w-3.5 h-3.5 text-[#BA0933]" />
                    المتجر مغلق حالياً (المنتجات للعرض فقط)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectStore(null)}
            className="px-3 py-1.5 bg-[#F0F2F2] hover:bg-[#E3E6E6] border border-[#D5D9D9] text-[#0F1111] text-xs font-bold rounded-xs cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>عرض منتجات كل المتاجر</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Search Results Top Bar Banner                              */}
      {/* ------------------------------------------------------------- */}
      {searchQuery.trim() !== '' && (
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] p-3 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F1111] dark:text-white">
              نتائج البحث عن:
            </span>
            <span className="text-[#C7511F] font-bold text-sm">"{searchQuery}"</span>
            <span className="text-[#565959] dark:text-[#9CA3AF]">
              ({filteredProducts.length} منتج متطابق)
            </span>
          </div>

          <button
            onClick={() => onSearchChange('')}
            className="flex items-center gap-1 text-[#007185] hover:underline font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>إلغاء البحث والعودة للمتجر</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Filter Sidebar Drawer (Always closed by default, opens on demand) */}
      {/* ------------------------------------------------------------- */}
      {isFiltersDrawerOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex justify-start transition-opacity"
          onClick={() => setIsFiltersDrawerOpen(false)}
        >
          <div
            className="w-80 max-w-[90vw] h-full bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="bg-[#232F3E] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#FF9900]" />
                <span className="font-bold text-base">تصفية نتائج المنتجات</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#FF9900] text-[#0F1111] text-xs font-black px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsFiltersDrawerOpen(false)}
                className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#37475A] transition-colors cursor-pointer"
                title="إغلاق التصفية"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Reset Filters CTA if active */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7] dark:border-[#37475A]">
                  <span className="text-[#565959] dark:text-[#9CA3AF]">
                    لديك فلاتر مفعّلة حالياً
                  </span>
                  <button
                    onClick={handleClearAllFilters}
                    className="text-[#007185] hover:underline font-bold cursor-pointer"
                  >
                    مسح جميع الفلاتر
                  </button>
                </div>
              )}

              {/* Prime & Fast Delivery */}
              <div className="space-y-2 pb-3 border-b border-[#E7E7E7] dark:border-[#37475A]">
                <div className="font-bold text-xs text-[#0F1111] dark:text-white">توصيل سريع:</div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={primeOnly}
                    onChange={(e) => setPrimeOnly(e.target.checked)}
                    className="rounded-xs border-[#D5D9D9] text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
                  />
                  <span className="flex items-center gap-1 font-bold text-[#007185]">
                    <span className="text-[#00A8E1] italic font-black text-sm">prime</span>
                    <span className="text-[#0F1111] dark:text-white text-[11px]">بدالك إكسبريس</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded-xs border-[#D5D9D9] text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
                  />
                  <span className="text-[#007600] font-bold">متوفر في المخزون فقط</span>
                </label>
              </div>

              {/* Department / Category Filter */}
              <div className="space-y-1.5 pb-3 border-b border-[#E7E7E7] dark:border-[#37475A]">
                <div className="font-bold text-xs text-[#0F1111] dark:text-white">القسم:</div>
                <div className="space-y-1 max-h-44 overflow-y-auto pl-1">
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-right py-1.5 px-2 rounded-xs transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat
                          ? 'font-bold text-[#C7511F] bg-[#F7F7F7] dark:bg-[#232F3E]'
                          : 'text-[#0F1111] dark:text-[#CCCCCC] hover:text-[#007185]'
                      }`}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-[#C7511F]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Store / Brand Checkboxes */}
              <div className="space-y-2 pb-3 border-b border-[#E7E7E7] dark:border-[#37475A]">
                <div className="font-bold text-xs text-[#0F1111] dark:text-white">المتاجر والماركات:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1">
                  {allStores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-2 cursor-pointer select-none text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStoresList.includes(store.id)}
                        onChange={() => handleToggleStoreFilter(store.id)}
                        className="rounded-xs border-[#D5D9D9] text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
                      />
                      <span className="truncate text-[#0F1111] dark:text-[#CCCCCC] hover:text-[#007185] flex items-center gap-1.5">
                        <span>{store.name}</span>
                        {store.isOpen === false && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.2 rounded-xs font-bold">
                            مغلق
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Customer Reviews Rating Filter */}
              <div className="space-y-1.5 pb-3 border-b border-[#E7E7E7] dark:border-[#37475A]">
                <div className="font-bold text-xs text-[#0F1111] dark:text-white">تقييمات العملاء:</div>
                <div className="space-y-1">
                  {[4, 3, 2, 1].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRatingFilter(minRatingFilter === stars ? 0 : stars)}
                      className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded-xs transition-colors cursor-pointer ${
                        minRatingFilter === stars
                          ? 'bg-[#F7F7F7] dark:bg-[#232F3E] font-bold text-[#C7511F]'
                          : 'text-[#565959] dark:text-[#9CA3AF] hover:text-[#007185]'
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < stars
                                ? 'fill-[#FFA41C] text-[#FFA41C]'
                                : 'text-[#D5D9D9] dark:text-[#565959]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#0F1111] dark:text-white">
                        وأكثر ({stars} نجوم)
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="space-y-2 pb-2">
                <div className="flex items-center justify-between font-bold text-xs text-[#0F1111] dark:text-white">
                  <span>السعر حتى:</span>
                  <span className="text-[#B12704] font-black">{maxPriceFilter} ج.م</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-full accent-[#FF9900] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#565959] dark:text-[#9CA3AF]">
                  <span>10 ج.م</span>
                  <span>150 ج.م</span>
                  <span>300+ ج.م</span>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] border-t border-[#E7E7E7] dark:border-[#37475A] flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsFiltersDrawerOpen(false)}
                className="flex-1 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] font-bold rounded-md text-xs shadow-xs transition-colors cursor-pointer text-center"
              >
                عرض {filteredProducts.length} منتج
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className="px-3 py-2 bg-white dark:bg-[#1A1F26] hover:bg-gray-100 dark:hover:bg-[#2d3748] border border-[#D5D9D9] dark:border-[#37475A] text-[#0F1111] dark:text-white font-medium rounded-md text-xs transition-colors cursor-pointer"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Main Amazon Shopping Layout: Full-Width Products Grid      */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full">
        <main id="products-main-grid" className="w-full space-y-4">
          {/* Top Toolbar: Filters Button + Product Count + Sort Dropdown */}
          <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Trigger Button to Open Filters Sidebar Drawer */}
              <button
                id="open-filters-btn"
                type="button"
                onClick={() => setIsFiltersDrawerOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-bold cursor-pointer transition-all ${
                  hasActiveFilters
                    ? 'bg-[#FFF8E7] dark:bg-[#232F3E] border-[#FF9900] text-[#0F1111] dark:text-white ring-1 ring-[#FF9900]'
                    : 'bg-[#F0F2F2] dark:bg-[#232F3E] hover:bg-[#E3E6E6] border-[#D5D9D9] dark:border-[#37475A] text-[#0F1111] dark:text-white'
                }`}
                title="فتح لوحة الفلاتر وتصفية النتائج"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#FF9900]" />
                <span>فلاتر</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#BA0933] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs text-[#007185] hover:underline font-bold cursor-pointer"
                >
                  مسح الفلاتر
                </button>
              )}

              <div className="text-[#565959] dark:text-[#9CA3AF] text-xs">
                عرض <span className="font-bold text-[#0F1111] dark:text-white">{filteredProducts.length}</span> من أصل{' '}
                <span className="font-bold text-[#0F1111] dark:text-white">{products.length}</span> منتج
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-[#565959] dark:text-[#9CA3AF] whitespace-nowrap">
                الترتيب حسب:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#F0F2F2] dark:bg-[#232F3E] text-[#0F1111] dark:text-white border border-[#D5D9D9] dark:border-[#37475A] rounded-xs px-2.5 py-1 font-medium cursor-pointer focus:outline-hidden focus:border-[#FF9900]"
              >
                <option value="featured">المميز والموصى به</option>
                <option value="price-low">السعر: من الأقل إلى الأعلى</option>
                <option value="price-high">السعر: من الأعلى إلى الأقل</option>
                <option value="rating">متوسط مراجعات العملاء</option>
              </select>
            </div>
          </div>

          {/* Amazon High-Density Product Cards Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCartQty = getCartQuantity(product.id);
                const isSoldOut = product.isSoldOut || product.stockQuantity <= 0;
                const savings = product.originalPrice ? product.originalPrice - product.price : 0;
                const discountPercent = product.originalPrice
                  ? Math.round((savings / product.originalPrice) * 100)
                  : 0;

                const productStore = stores.find(
                  (s) => s.id === product.storeId || s.name === product.storeName
                );
                const isStoreClosed = productStore ? productStore.isOpen === false : false;

                return (
                  <div
                    key={product.id}
                    className="group bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#FF9900] transition-colors relative"
                  >
                    {/* Top Deal or Best Seller Badge or Closed Store Badge */}
                    {isStoreClosed ? (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-[#BA0933] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs flex items-center gap-1 shadow-xs">
                          <Clock className="w-3 h-3" />
                          المتجر مغلق
                        </span>
                      </div>
                    ) : product.originalPrice && !isSoldOut ? (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                          وفر {discountPercent}%
                        </span>
                      </div>
                    ) : null}

                    <div>
                      {/* Product Image with 1:1 Aspect Ratio and Micro-Interaction Hover Zoom */}
                      <div
                        onClick={() => setPdpProduct(product)}
                        className="relative aspect-square w-full bg-[#F7F7F7] dark:bg-[#232F3E] rounded-xs overflow-hidden flex items-center justify-center cursor-pointer mb-2.5 group/img"
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isSoldOut || isStoreClosed ? 'grayscale-40 opacity-75' : 'group-hover/img:scale-105'
                          }`}
                        />

                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2 text-center">
                            <span className="bg-[#BA0933] text-white font-bold text-[11px] px-2.5 py-1 rounded-xs">
                              نفذت الكمية
                            </span>
                          </div>
                        )}

                        {/* Quick View Button on Hover */}
                        <div className="absolute bottom-2 inset-x-2 opacity-0 group-hover/img:opacity-100 transition-opacity hidden sm:flex justify-center">
                          <span className="bg-white/95 dark:bg-[#0F1111]/95 text-[#0F1111] dark:text-white border border-[#D5D9D9] text-[11px] font-bold py-1 px-3 rounded-xs shadow-md flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-[#FF9900]" />
                            <span>عرض التفاصيل السريعة</span>
                          </span>
                        </div>
                      </div>

                      {/* Store / Brand */}
                      <div className="text-[11px] text-[#565959] dark:text-[#9CA3AF] truncate flex items-center justify-between">
                        <span>{product.storeName}</span>
                        {isStoreClosed && (
                          <span className="text-[10px] text-[#BA0933] font-bold">
                            (مغلق الآن)
                          </span>
                        )}
                      </div>

                      {/* Product Title (2 lines max with Amazon teal hover) */}
                      <h4
                        onClick={() => setPdpProduct(product)}
                        className="font-bold text-xs sm:text-sm text-[#0F1111] dark:text-white leading-snug line-clamp-2 hover:text-[#007185] cursor-pointer mt-0.5"
                        title={product.name}
                      >
                        {product.name}
                      </h4>

                      {/* Amazon Star Rating & Review Count */}
                      <div className="flex items-center gap-1 mt-1 text-xs">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(product.rating)
                                  ? 'fill-[#FFA41C] text-[#FFA41C]'
                                  : 'text-[#D5D9D9] dark:text-[#565959]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-[#007185] hover:underline cursor-pointer">
                          {product.reviewCount || 0}
                        </span>
                      </div>

                      {/* Amazon Price Presentation */}
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <div className="flex items-start text-[#0F1111] dark:text-white leading-none">
                          <span className="text-[11px] font-bold mt-0.5">ج.م</span>
                          <span className="text-lg sm:text-xl font-bold tracking-tight">
                            {product.price}
                          </span>
                        </div>
                        {product.originalPrice && (
                          <span className="text-xs text-[#565959] dark:text-[#9CA3AF] line-through">
                            {product.originalPrice} ج.م
                          </span>
                        )}
                      </div>

                      {/* Delivery and Stock Status */}
                      <div className="mt-1 text-[11px] space-y-0.5">
                        {isStoreClosed ? (
                          <div className="text-[#BA0933] font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#BA0933]" />
                            <span>المتجر مغلق (المنتج للعرض فقط)</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-[#007185]">
                              <span className="text-[#00A8E1] italic font-black text-xs">prime</span>
                              <span className="text-[#565959] dark:text-[#9CA3AF]">توصيل اليوم في قنا</span>
                            </div>

                            {isSoldOut ? (
                              <div className="text-[#BA0933] font-bold">غير متوفر حالياً</div>
                            ) : product.stockQuantity <= 3 ? (
                              <div className="text-[#B12704] font-bold">
                                تبقى {product.stockQuantity} فقط في المخزون!
                              </div>
                            ) : (
                              <div className="text-[#007600] font-bold">متوفر في المخزون</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (Amazon CTA) */}
                    <div className="mt-3 pt-2 border-t border-[#F0F2F2] dark:border-[#37475A]">
                      {isStoreClosed ? (
                        <button
                          disabled
                          className="w-full py-1.5 bg-[#F0F2F2] dark:bg-[#232F3E] text-[#565959] dark:text-[#9CA3AF] border border-[#D5D9D9] dark:border-[#37475A] text-xs font-bold rounded-xs cursor-not-allowed text-center flex items-center justify-center gap-1 select-none"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>المتجر مغلق حالياً</span>
                        </button>
                      ) : isSoldOut ? (
                        <button
                          disabled
                          className="w-full py-1.5 bg-[#E7E7E7] dark:bg-[#37475A] text-[#565959] dark:text-[#9CA3AF] text-xs font-bold rounded-xs cursor-not-allowed text-center"
                        >
                          غير متاح
                        </button>
                      ) : inCartQty > 0 ? (
                        <div className="flex items-center justify-between bg-[#F0F2F2] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-0.5">
                          <button
                            onClick={() => onUpdateCartQuantity(product.id, inCartQty - 1)}
                            className="w-7 h-7 bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs shadow-2xs flex items-center justify-center font-bold hover:bg-[#E3E6E6] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-[#0F1111] dark:text-white">
                            {inCartQty} في السلة
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(product.id, inCartQty + 1)}
                            className="w-7 h-7 bg-[#FFD814] text-[#0F1111] rounded-xs shadow-2xs flex items-center justify-center font-bold hover:bg-[#F7CA00] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart(product, 1)}
                          className="amazon-btn-yellow w-full py-1.5 text-xs font-medium shadow-xs"
                        >
                          أضف إلى عربة التسوق
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-10 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-[#565959] mx-auto" />
              <h4 className="font-bold text-base text-[#0F1111] dark:text-white">
                لم يتم العثور على أي منتج متطابق مع معايير البحث
              </h4>
              <p className="text-xs text-[#565959] dark:text-[#9CA3AF]">
                جرب إزالة بعض الفلاتر أو البحث بكلمات أخرى للحصول على نتائج أوسع
              </p>
              <button
                onClick={handleClearAllFilters}
                className="amazon-btn-yellow px-4 py-2 text-xs font-bold"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Amazon Product Detail Page (PDP) 3-Column Modal             */}
      {/* ------------------------------------------------------------- */}
      {pdpProduct && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
          onClick={() => setPdpProduct(null)}
        >
          <div
            className="bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs max-w-5xl w-full my-auto shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] overflow-hidden text-right animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#232F3E] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                <span>تفاصيل المنتج</span>
                <span>/</span>
                <span>{pdpProduct.category}</span>
                <span>/</span>
                <span className="text-white font-bold truncate max-w-xs">{pdpProduct.name}</span>
              </div>
              <button
                onClick={() => setPdpProduct(null)}
                className="p-1 rounded-xs hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Amazon 3-Column PDP Layout */}
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Column 1 (Images & Micro-interaction Hover Zoom) - 4 cols */}
              <div className="md:col-span-4 space-y-3">
                <div
                  onMouseMove={handleMouseMoveZoom}
                  onMouseLeave={handleMouseLeaveZoom}
                  className="relative aspect-square w-full bg-[#F7F7F7] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs overflow-hidden cursor-crosshair flex items-center justify-center"
                >
                  <img
                    src={pdpProduct.imageUrl}
                    alt={pdpProduct.name}
                    className="w-full h-full object-contain"
                  />

                  {/* Micro-interaction: Image Magnifier Zoom Lens */}
                  {zoomPos && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${pdpProduct.imageUrl})`,
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundSize: '220%',
                      }}
                    />
                  )}
                </div>

                <div className="text-[11px] text-[#565959] dark:text-[#9CA3AF] text-center">
                  مرر مؤشر الفأرة على الصورة لتكبيرها (Zoom)
                </div>

                {/* Additional badge */}
                <div className="p-3 bg-[#F0F2F2] dark:bg-[#232F3E] rounded-xs border border-[#D5D9D9] dark:border-[#37475A] text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#0F1111] dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#007600]" />
                    <span>ضمان الجودة والسلامة من بدالك</span>
                  </div>
                  <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                    مفحوص ومضمون طازجاً من تجار قنا المعتمدين، ويخضع لسياسة الاسترجاع السريع عند الاستلام.
                  </p>
                </div>
              </div>

              {/* Column 2 (Center: Details, Specs, Reviews) - 5 cols */}
              <div className="md:col-span-5 space-y-4">
                <div>
                  <div className="text-xs text-[#007185] font-bold hover:underline cursor-pointer">
                    زيارة متجر {pdpProduct.storeName}
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-[#0F1111] dark:text-white mt-1 leading-snug">
                    {pdpProduct.name}
                  </h1>

                  {/* Rating & Reviews summary */}
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(pdpProduct.rating)
                              ? 'fill-[#FFA41C] text-[#FFA41C]'
                              : 'text-[#D5D9D9]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-[#007185] hover:underline cursor-pointer">
                      {pdpProduct.rating} من 5 نجوم ({pdpProduct.reviewCount || 0} تقييم)
                    </span>
                  </div>
                </div>

                <div className="border-t border-b border-[#E7E7E7] dark:border-[#37475A] py-3 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#CC0C39] font-bold text-lg">
                      {pdpProduct.originalPrice
                        ? `-${Math.round(((pdpProduct.originalPrice - pdpProduct.price) / pdpProduct.originalPrice) * 100)}%`
                        : ''}
                    </span>
                    <div className="flex items-baseline text-2xl font-bold text-[#0F1111] dark:text-white">
                      <span>{pdpProduct.price}</span>
                      <span className="text-sm font-normal mr-1">ج.م</span>
                    </div>
                    {pdpProduct.originalPrice && (
                      <span className="text-xs text-[#565959] dark:text-[#9CA3AF] line-through">
                        {pdpProduct.originalPrice} ج.م
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                    الأسعار تشمل ضريبة القيمة المضافة ورسوم التغليف
                  </div>
                </div>

                {/* About this item (Bullet points - نمط أمازون الكلاسيكي) */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-sm text-[#0F1111] dark:text-white">
                    عن هذه السلعة:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-[#0F1111] dark:text-[#CCCCCC] leading-relaxed">
                    <li>{pdpProduct.description}</li>
                    <li>
                      <strong>القسم:</strong> {pdpProduct.category}
                    </li>
                    <li>
                      <strong>المتجر المورد:</strong> {pdpProduct.storeName} (قنا)
                    </li>
                    <li>
                      <strong>حالة المخزون:</strong>{' '}
                      {pdpProduct.stockQuantity > 0 ? 'متوفر وجاهز للتحضير الفوري' : 'غير متوفر'}
                    </li>
                    <li>توصيل سريع وموحد لجميع طلباتك في سلة واحدة داخل أحياء قنا.</li>
                  </ul>
                </div>

                {/* Reviews Section */}
                <div className="pt-3 border-t border-[#E7E7E7] dark:border-[#37475A] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#0F1111] dark:text-white">
                      مراجعات وتقييمات المشترين ({pdpProduct.reviews?.length || 0})
                    </h3>
                    <button
                      onClick={() => setShowAddReviewForm(!showAddReviewForm)}
                      className="text-[#007185] hover:underline font-bold cursor-pointer"
                    >
                      {showAddReviewForm ? 'إلغاء' : 'اكتب مراجعة'}
                    </button>
                  </div>

                  {/* Add Review Form */}
                  {showAddReviewForm && (
                    <form
                      onSubmit={handleSubmitReview}
                      className="bg-[#F7F7F7] dark:bg-[#232F3E] p-3 rounded-xs border border-[#D5D9D9] dark:border-[#37475A] space-y-2.5"
                    >
                      <div className="font-bold text-xs">تقييمك:</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= reviewRating
                                  ? 'fill-[#FFA41C] text-[#FFA41C]'
                                  : 'text-[#D5D9D9]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <textarea
                        required
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="شارك تجربتك مع هذا المنتج في قنا..."
                        className="w-full bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] rounded-xs p-2 text-xs focus:outline-hidden focus:border-[#FF9900]"
                      ></textarea>

                      {reviewSubmitSuccess ? (
                        <div className="text-[#007600] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم إرسال تقييمك بنجاح! شكراً لك.</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="amazon-btn-yellow px-4 py-1.5 text-xs font-bold"
                        >
                          نشر التقييم
                        </button>
                      )}
                    </form>
                  )}

                  {/* Reviews List */}
                  {(!pdpProduct.reviews || pdpProduct.reviews.length === 0) ? (
                    <p className="text-[#565959] dark:text-[#9CA3AF]">
                      لا توجد مراجعات سابقة بعد. كن أول من يكتب مراجعة لهذا المنتج!
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-36 overflow-y-auto pl-1">
                      {pdpProduct.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-[#F7F7F7] dark:bg-[#232F3E] p-2.5 rounded-xs border border-[#E7E7E7] dark:border-[#37475A] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold">{rev.userName}</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < rev.rating
                                      ? 'fill-[#FFA41C] text-[#FFA41C]'
                                      : 'text-[#D5D9D9]'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#0F1111] dark:text-[#CCCCCC]">
                            {rev.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3 (Left in LTR, Right in RTL: Buy Box - صندوق الشراء) - 3 cols */}
              <div className="md:col-span-3">
                {(() => {
                  const pdpStore = stores.find(
                    (s) => s.id === pdpProduct.storeId || s.name === pdpProduct.storeName
                  );
                  const isPdpStoreClosed = pdpStore ? pdpStore.isOpen === false : false;

                  return (
                    <div className="border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 bg-white dark:bg-[#1A1F26] space-y-3 text-xs shadow-xs sticky top-2">
                      <div className="text-xl font-bold text-[#B12704]">
                        {pdpProduct.price} <span className="text-xs font-normal text-[#0F1111] dark:text-white">ج.م</span>
                      </div>

                      {/* Store Closed Banner Notice */}
                      {isPdpStoreClosed && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xs p-2.5 text-rose-800 dark:text-rose-200 space-y-1 text-xs">
                          <div className="font-bold flex items-center gap-1.5 text-[#BA0933]">
                            <Clock className="w-4 h-4" />
                            <span>المتجر مغلق حالياً</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                            متجر "{pdpProduct.storeName}" مغلق مؤقتاً. المنتج معروض للاطلاع على المواصفات والتقييمات فقط، وسيصبح متاحاً للطلب فور إعادة فتح المتجر.
                          </p>
                        </div>
                      )}

                      <div className="text-[11px] space-y-1">
                        <div className="flex items-center gap-1 font-bold text-[#007185]">
                          <span className="text-[#00A8E1] italic font-black text-xs">prime</span>
                          <span>توصيل سريع مجدول</span>
                        </div>
                        <div className="text-[#565959] dark:text-[#9CA3AF]">
                          إلى عنوانك في مدينة قنا ومراكزها
                        </div>
                      </div>

                      {/* Stock Status */}
                      {isPdpStoreClosed ? (
                        <div className="text-[#BA0933] font-bold text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>غير متاح للطلب الآن (المتجر مغلق)</span>
                        </div>
                      ) : pdpProduct.stockQuantity > 0 && !pdpProduct.isSoldOut ? (
                        <div className="text-[#007600] font-bold text-sm">متوفر في المخزون</div>
                      ) : (
                        <div className="text-[#BA0933] font-bold text-sm">غير متوفر حالياً</div>
                      )}

                      {/* Quantity selector */}
                      {!isPdpStoreClosed && pdpProduct.stockQuantity > 0 && !pdpProduct.isSoldOut && (
                        <div className="space-y-1">
                          <label htmlFor="pdp-quantity" className="block text-[11px] font-bold">
                            الكمية:
                          </label>
                          <select
                            id="pdp-quantity"
                            value={pdpQuantity}
                            onChange={(e) => setPdpQuantity(Number(e.target.value))}
                            className="w-full bg-[#F0F2F2] dark:bg-[#232F3E] text-[#0F1111] dark:text-white border border-[#D5D9D9] rounded-xs p-1.5 font-bold cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <option key={num} value={num}>
                                {num}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="space-y-2 pt-1">
                        {isPdpStoreClosed ? (
                          <button
                            disabled
                            className="w-full py-2.5 bg-[#F0F2F2] dark:bg-[#232F3E] text-[#565959] dark:text-[#9CA3AF] border border-[#D5D9D9] dark:border-[#37475A] text-xs font-bold rounded-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span>المتجر مغلق حالياً (للعرض فقط)</span>
                          </button>
                        ) : (
                          <>
                            <button
                              disabled={pdpProduct.stockQuantity <= 0 || pdpProduct.isSoldOut}
                              onClick={() => {
                                onAddToCart(pdpProduct, pdpQuantity);
                                setPdpProduct(null);
                              }}
                              className="amazon-btn-yellow w-full py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                            >
                              أضف إلى عربة التسوق
                            </button>

                            <button
                              disabled={pdpProduct.stockQuantity <= 0 || pdpProduct.isSoldOut}
                              onClick={() => {
                                onAddToCart(pdpProduct, pdpQuantity);
                                setPdpProduct(null);
                                const openCartBtn = document.getElementById('open-cart-btn');
                                openCartBtn?.click();
                              }}
                              className="amazon-btn-orange w-full py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                            >
                              اشترِ الآن (Buy Now)
                            </button>
                          </>
                        )}
                      </div>

                      {/* Details table in Buy Box */}
                      <div className="pt-3 border-t border-[#E7E7E7] dark:border-[#37475A] text-[11px] space-y-1 text-[#565959] dark:text-[#9CA3AF]">
                        <div className="flex justify-between">
                          <span>يشحن من:</span>
                          <span className="text-[#0F1111] dark:text-white font-medium">بدالك إكسبريس</span>
                        </div>
                        <div className="flex justify-between">
                          <span>يباع بواسطة:</span>
                          <span className="text-[#007185] font-medium">{pdpProduct.storeName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>خدمة العملاء:</span>
                          <span className="text-[#0F1111] dark:text-white font-medium">فريق بدالك قنا</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
