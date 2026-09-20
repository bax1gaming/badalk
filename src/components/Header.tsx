import React, { useState, useRef, useEffect } from 'react';
import {
  Store as StoreIcon,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Search,
  ShoppingCart,
  Award,
  Bell,
  UserCheck,
  X,
  Compass,
  Home,
  LogOut,
  Package,
  Sparkles,
  TrendingUp,
  Tag,
  ChevronDown,
  Menu,
  MapPin,
} from 'lucide-react';
import { UserRole, User, NotificationItem, Product, Store } from '../types.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  currentUser: User | null;
  cartCount: number;
  onOpenCart: () => void;
  onOpenOrders?: () => void;
  ordersCount?: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  products?: Product[];
  stores?: Store[];
  onSelectProduct?: (product: Product) => void;
  activeStoreName?: string | null;
  onResetStoreFilter?: () => void;
  onOpenRewards: () => void;
  onOpenNotifications: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead?: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onClearNotifications?: () => void;
  onOpenAuth: (defaultRole?: UserRole) => void;
  onGoHome?: () => void;
  isLandingActive?: boolean;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  currentUser,
  cartCount,
  onOpenCart,
  onOpenOrders,
  ordersCount = 0,
  searchQuery,
  onSearchChange,
  products = [],
  stores = [],
  onSelectProduct,
  activeStoreName,
  onResetStoreFilter,
  onOpenRewards,
  onOpenNotifications,
  notifications = [],
  onOpenAuth,
  onGoHome,
  isLandingActive = false,
  onLogout,
  isDarkMode = false,
  onToggleTheme,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('الكل');
  const [isSubnavDrawerOpen, setIsSubnavDrawerOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  // Handle clicking outside search container and account menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute live search suggestions based on query
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingProducts = normalizedQuery
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(normalizedQuery) ||
            p.category.toLowerCase().includes(normalizedQuery) ||
            (p.storeName && p.storeName.toLowerCase().includes(normalizedQuery)) ||
            (p.description && p.description.toLowerCase().includes(normalizedQuery))
        )
        .slice(0, 6)
    : [];

  const matchingStores = normalizedQuery
    ? stores
        .filter(
          (s) =>
            s.name.toLowerCase().includes(normalizedQuery) ||
            s.category.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 3)
    : [];

  const autocompleteKeywords = React.useMemo(() => {
    if (!normalizedQuery) return [];
    const keywordsSet = new Set<string>();
    products.forEach((p) => {
      if (p.name.toLowerCase().includes(normalizedQuery)) {
        keywordsSet.add(p.name);
      }
    });
    return Array.from(keywordsSet).slice(0, 5);
  }, [products, normalizedQuery]);

  const popularSearches = [
    'جبنة رومي',
    'جبنة بيضاء',
    'جبنة قريش',
    'فطير مشلتت',
    'لحم بلدي',
    'كفتة بلدي',
    'طماطم طازجة',
    'سوبرماركت',
  ];

  const amazonDepartments = [
    'الكل',
    'أجبان وألبان',
    'جزارة ولحوم',
    'سوبرماركت',
    'مخابز وحلويات',
    'خضار وفواكه',
  ];

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-[#0F1111] font-black bg-[#FFD814]/70 px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const handleSelectSuggestionItem = (prod: Product) => {
    onSearchChange(prod.name);
    if (onSelectProduct) {
      onSelectProduct(prod);
    }
    setIsSearchFocused(false);
  };

  const handleSelectKeyword = (keyword: string) => {
    onSearchChange(keyword);
    setIsSearchFocused(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md font-sans text-right">
      {/* ------------------------------------------------------------- */}
      {/* Top Bar: Amazon Dark (#131921)                                */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#131921] text-white px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Deliver-to */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Amazon-style Logo */}
          <button
            id="brand-logo-btn"
            onClick={() => {
              if (onGoHome) onGoHome();
            }}
            className="flex items-center gap-1.5 p-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer group text-right"
            title="الصفحة الرئيسية لمنصة بدالك"
          >
            <div className="flex items-baseline">
              <span className="font-black text-xl sm:text-2xl text-white tracking-tight">
                بدالك
              </span>
              <span className="text-[#FF9900] text-xs sm:text-sm font-bold ml-1">.قنا</span>
            </div>
            {/* Amazon Smile Arc */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF9900] shrink-0 hidden sm:block" />
          </button>

          {/* Amazon "Deliver To" Widget */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer text-xs">
            <MapPin className="w-4 h-4 text-[#CCCCCC] shrink-0" />
            <div className="leading-tight">
              <div className="text-[11px] text-[#CCCCCC]">التوصيل إلى</div>
              <div className="font-bold text-white text-xs">مدينة قنا ومراكزها</div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Global Amazon Search Bar with Department Selector & Orange CTA */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-3xl mx-1 sm:mx-2 min-w-0"
        >
          <div
            className={`flex items-stretch rounded-md overflow-hidden bg-white text-[#0F1111] transition-all ${
              isSearchFocused
                ? 'ring-3 ring-[#FF9900] shadow-md'
                : 'hover:ring-1 hover:ring-[#FF9900]'
            }`}
          >
            {/* Category / Department Dropdown (Amazon Style) */}
            <div className="hidden md:flex items-center bg-[#F3F3F3] hover:bg-[#DADADA] border-l border-[#CDCDCD] px-2 text-xs font-medium cursor-pointer shrink-0">
              <select
                aria-label="اختر القسم"
                value={selectedDepartment}
                onChange={(e) => {
                  const dept = e.target.value;
                  setSelectedDepartment(dept);
                  if (dept !== 'الكل') {
                    onSearchChange(dept);
                  }
                }}
                className="bg-transparent text-[#0F1111] py-1 cursor-pointer focus:outline-hidden text-xs font-semibold"
              >
                {amazonDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#565959] pointer-events-none" />
            </div>

            {/* Input */}
            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                id="header-search-input"
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  activeStoreName
                    ? `البحث في متجر "${activeStoreName}"...`
                    : 'ابحث في بدالك (أجبان، لحوم بلدية، خضار، مخبوزات...)'
                }
                className="w-full h-9 sm:h-10 px-3 text-xs sm:text-sm text-[#0F1111] bg-white placeholder-[#565959] focus:outline-hidden font-normal"
              />

              {/* Clear Query */}
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 left-2 flex items-center text-[#565959] hover:text-[#0F1111] cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Amazon Orange Magnifying Glass Search Button */}
            <button
              id="header-search-submit-btn"
              type="button"
              onClick={() => {
                setIsSearchFocused(false);
              }}
              className="bg-[#FEB969] hover:bg-[#F3A847] text-[#0F1111] px-3.5 sm:px-5 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="بحث"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F1111]" />
            </button>
          </div>

          {/* Amazon Autocomplete Suggestions Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-b-md border border-[#D5D9D9] shadow-xl overflow-hidden z-[9999] text-[#0F1111] max-h-[75vh] overflow-y-auto">
              {normalizedQuery ? (
                <div className="p-3 space-y-3">
                  {/* Matching Autocomplete Keywords */}
                  {autocompleteKeywords.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-[#565959] px-1 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>اقتراحات إكمال البحث:</span>
                      </div>
                      <div className="divide-y divide-[#E7E7E7]">
                        {autocompleteKeywords.map((kw, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectKeyword(kw)}
                            className="w-full py-1.5 px-2 hover:bg-[#F0F2F2] text-xs font-semibold text-[#0F1111] text-right flex items-center gap-2 cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5 text-[#565959] shrink-0" />
                            <span>{renderHighlightedText(kw, normalizedQuery)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products List (High Information Density) */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#565959] px-1 pb-1 border-b border-[#E7E7E7]">
                      <span>المنتجات المطابقة ({matchingProducts.length})</span>
                      <span className="text-[10px] text-[#007185]">اضغط للاختيار</span>
                    </div>

                    {matchingProducts.length > 0 ? (
                      <div className="divide-y divide-[#E7E7E7] mt-1">
                        {matchingProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectSuggestionItem(p)}
                            className="w-full py-2 px-2 hover:bg-[#F0F2F2] transition-colors flex items-center justify-between gap-3 text-right cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-9 h-9 object-contain bg-white border border-[#D5D9D9] rounded-xs shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-[#0F1111] group-hover:text-[#007185] truncate">
                                  {renderHighlightedText(p.name, normalizedQuery)}
                                </div>
                                <div className="text-[11px] text-[#565959] flex items-center gap-1.5 truncate">
                                  <span>{p.storeName}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{p.category}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-left shrink-0">
                              <span className="text-xs font-bold text-[#BA0933]">
                                {p.price} ج.م
                              </span>
                              {p.isSoldOut ? (
                                <div className="text-[10px] text-[#BA0933]">غير متوفر</div>
                              ) : (
                                <div className="text-[10px] text-[#007600] font-semibold">متوفر في المخزون</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-[#565959]">
                        لا توجد منتجات مطابقة لـ "{normalizedQuery}"
                      </div>
                    )}
                  </div>

                  {/* Matching Stores */}
                  {matchingStores.length > 0 && (
                    <div className="pt-2 border-t border-[#E7E7E7]">
                      <div className="text-[11px] font-bold text-[#565959] px-1 mb-1 flex items-center gap-1">
                        <StoreIcon className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>متاجر مطابقة في قنا:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {matchingStores.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onSearchChange(s.name);
                              setIsSearchFocused(false);
                            }}
                            className="p-1.5 rounded-sm bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#D5D9D9] text-right flex items-center gap-2 cursor-pointer"
                          >
                            <img
                              src={s.logoUrl}
                              alt={s.name}
                              className="w-6 h-6 rounded-xs object-cover"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0F1111] truncate">
                                {renderHighlightedText(s.name, normalizedQuery)}
                              </div>
                              <div className="text-[10px] text-[#565959] truncate">{s.address}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty query popular search pills */
                <div className="p-3 space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#0F1111] mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
                      <span>الأكثر طلباً وبحثاً في قنا:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {popularSearches.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectKeyword(item)}
                          className="px-2.5 py-1 rounded-full bg-[#F0F2F2] hover:bg-[#E3E6E6] text-[#0F1111] text-xs font-medium border border-[#D5D9D9] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Search className="w-3 h-3 text-[#565959]" />
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right Section: Account & Lists, Theme, Orders, Cart           */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-white">
          {/* If user is logged in, show account menus */}
          {currentUser && (
            <div className="relative" ref={accountMenuRef}>
              <button
                id="header-account-btn"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="p-1 sm:px-2 sm:py-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer text-right leading-tight"
                title="الحساب والقوائم"
              >
                <div className="text-[11px] text-[#CCCCCC] truncate max-w-[120px]">
                  مرحباً، {currentUser.name.split(' ')[0]}
                </div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-1 text-white">
                  <span>الحساب والقوائم</span>
                  <ChevronDown className="w-3 h-3 text-[#CCCCCC]" />
                </div>
              </button>

              {/* Account Menu Dropdown */}
              {isAccountMenuOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] py-3 px-3 z-[9999] text-right space-y-2.5 animate-in fade-in duration-150">
                  <div className="pb-2 border-b border-[#E7E7E7] dark:border-[#37475A]">
                    <div className="font-bold text-sm text-[#0F1111] dark:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-[#565959] dark:text-[#9CA3AF]">
                      {currentUser.email}
                    </div>
                    <div className="inline-block mt-1 bg-[#FFD814] text-[#0F1111] font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {currentUser.role === 'customer'
                        ? 'عميل بدالك'
                        : currentUser.role === 'merchant'
                        ? 'تاجر في قنا'
                        : currentUser.role === 'delivery'
                        ? 'كابتن توصيل قنا'
                        : 'مدير المنصة'}
                    </div>
                  </div>

                  {/* Role Switcher if applicable */}
                  {['merchant', 'delivery', 'admin'].includes(currentUser.role) && (
                    <div className="space-y-1 pb-2 border-b border-[#E7E7E7] dark:border-[#37475A]">
                      <div className="text-[11px] font-bold text-[#565959] dark:text-[#9CA3AF]">
                        لوحة التحكم:
                      </div>
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onSelectRole(currentUser.role);
                        }}
                        className="w-full text-right text-xs py-1.5 px-2 rounded-xs hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] text-[#007185] font-semibold cursor-pointer"
                      >
                        الانتقال إلى واجهة {currentUser.role === 'merchant' ? 'التاجر' : currentUser.role === 'delivery' ? 'المندوب' : 'الإدارة'}
                      </button>
                      {currentRole !== 'customer' && (
                        <button
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onSelectRole('customer');
                          }}
                          className="w-full text-right text-xs py-1.5 px-2 rounded-xs hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] text-[#007185] font-semibold cursor-pointer"
                        >
                          العودة لواجهة التسوق (عميل)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Orders & Tracking Link */}
                  {currentUser.role === 'customer' && (
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        if (onOpenOrders) {
                          onOpenOrders();
                        } else {
                          onOpenCart();
                        }
                      }}
                      className="w-full flex items-center justify-between py-1.5 px-2 rounded-xs hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] text-xs font-semibold cursor-pointer text-[#007185] dark:text-[#56D3F5]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#FF9900]" />
                        <span>طلباتي وتتبع الشحنات</span>
                      </span>
                      {ordersCount > 0 && (
                        <span className="bg-[#FF9900]/20 text-[#0F1111] dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {ordersCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Rewards Link */}
                  {currentUser.role === 'customer' && (
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenRewards();
                      }}
                      className="w-full flex items-center justify-between py-1.5 px-2 rounded-xs hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] text-xs font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#FF9900]" />
                        <span>مكافآت ونقاط بدالك</span>
                      </span>
                      <span className="text-[11px] text-[#007600] font-bold">
                        {currentUser.points ?? 0} نقطة
                      </span>
                    </button>
                  )}

                  {/* Notifications Link */}
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenNotifications();
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-xs hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] text-xs font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-[#565959]" />
                      <span>الإشعارات</span>
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-[#BA0933] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Sign out */}
                  {onLogout && (
                    <div className="pt-2 border-t border-[#E7E7E7] dark:border-[#37475A]">
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-xs hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#BA0933] text-xs font-bold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle (Always visible: صباحي / ليلي) */}
          {onToggleTheme && (
            <div className="p-1 rounded hover:outline hover:outline-1 hover:outline-white">
              <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
            </div>
          )}

          {/* Orders, notifications, and cart when logged in */}
          {currentUser && (
            <>
              {/* Orders & Returns */}
              <button
                onClick={() => {
                  if (onOpenOrders) {
                    onOpenOrders();
                  } else {
                    onOpenCart();
                  }
                }}
                className="hidden sm:block p-1 sm:px-2 sm:py-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer text-right leading-tight"
                title="عرض ومتابعة طلباتي"
              >
                <div className="text-[11px] text-[#CCCCCC]">المشتريات</div>
                <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1">
                  <span>والطلبات</span>
                  {ordersCount > 0 && (
                    <span className="bg-[#FF9900] text-slate-950 text-[10px] px-1 rounded-full font-black">
                      {ordersCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Notifications Bell (compact) */}
              <button
                id="notifications-bell-btn"
                onClick={onOpenNotifications}
                className="relative p-2 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer text-white"
                title={unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'الإشعارات'}
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#BA0933] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Amazon Shopping Cart (عربة التسوق) */}
              <button
                id="open-cart-btn"
                onClick={onOpenCart}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer text-white"
                title="عربة التسوق"
              >
                <div className="relative">
                  <ShoppingCart className="w-7 h-7 text-white" />
                  <span className="absolute -top-1 left-2 bg-[#FF9900] text-[#0F1111] text-xs font-black px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {cartCount}
                  </span>
                </div>
                <span className="hidden md:inline font-bold text-xs sm:text-sm text-white mt-2">
                  عربة التسوق
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Sub-Navigation Bar: Amazon Squid Ink (#232F3E)                */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#232F3E] text-white px-2 sm:px-4 py-1.5 text-xs flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 border-t border-[#37475A]">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Hamburger "الكل" (All) */}
          <button
            onClick={() => setIsSubnavDrawerOpen(!isSubnavDrawerOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white cursor-pointer font-bold text-white shrink-0"
          >
            <Menu className="w-4 h-4 text-white" />
            <span>الكل</span>
          </button>

          {/* Amazon Department Links */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap overflow-x-auto no-scrollbar">
            {[
              { name: 'عروض اليوم', query: 'عروض' },
              { name: 'السوبرماركت', query: 'سوبرماركت' },
              { name: 'الأجبان والألبان', query: 'أجبان وألبان' },
              { name: 'الجزارة واللحوم', query: 'جزارة ولحوم' },
              { name: 'المخابز والحلويات', query: 'مخابز وحلويات' },
              { name: 'الخضار والفواكه', query: 'خضار وفواكه' },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSearchChange(item.query)}
                className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white text-[#F3F3F3] hover:text-white cursor-pointer text-xs font-normal shrink-0"
              >
                {item.name}
              </button>
            ))}

            <button
              type="button"
              onClick={onOpenRewards}
              className="px-2 py-1 rounded hover:outline hover:outline-1 hover:outline-white text-[#FF9900] font-bold cursor-pointer text-xs flex items-center gap-1.5 shrink-0"
              title="عرض برنامج مكافآت بدالك"
            >
              <Award className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>المكافآت</span>
              {currentUser && typeof currentUser.points === 'number' && currentUser.points > 0 && (
                <span className="bg-[#ba0933] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {currentUser.points}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Local Fast Qena Badge */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[#CCCCCC] shrink-0 font-medium">
          <Truck className="w-3.5 h-3.5 text-[#00A8E1]" />
          <span>توصيل سريع موحد داخل قنا</span>
        </div>
      </div>

      {/* Subnav Drawer / Modal for "الكل" Menu */}
      {isSubnavDrawerOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-xs flex"
          onClick={() => setIsSubnavDrawerOpen(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white shadow-2xl flex flex-col text-right overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="bg-[#232F3E] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#FF9900]" />
                <span className="font-bold text-sm">
                  {currentUser ? `مرحباً، ${currentUser.name}` : 'مرحباً، سجل الدخول'}
                </span>
              </div>
              <button
                onClick={() => setIsSubnavDrawerOpen(false)}
                className="p-1 text-white hover:text-[#FF9900]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Lists */}
            <div className="p-4 space-y-4 text-xs divide-y divide-[#E7E7E7] dark:divide-[#37475A]">
              <div>
                <div className="font-bold text-sm text-[#0F1111] dark:text-white mb-2">
                  تسوق حسب الأقسام
                </div>
                <div className="space-y-1">
                  {amazonDepartments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => {
                        setIsSubnavDrawerOpen(false);
                        onSearchChange(dept === 'الكل' ? '' : dept);
                      }}
                      className="w-full text-right py-2 px-2 hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] rounded text-[#0F1111] dark:text-white font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>{dept}</span>
                      <span className="text-[#565959]">←</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <div className="font-bold text-sm text-[#0F1111] dark:text-white mb-2">
                  البرامج والمميزات
                </div>
                <button
                  onClick={() => {
                    setIsSubnavDrawerOpen(false);
                    onOpenRewards();
                  }}
                  className="w-full text-right py-2 px-2 hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] rounded font-medium flex items-center justify-between cursor-pointer"
                  title="عرض تفاصيل برنامج مكافآت بدالك"
                >
                  <span className="flex items-center gap-1.5 text-[#FF9900] font-bold">
                    <Award className="w-4 h-4" />
                    <span>برنامج مكافآت بدالك</span>
                  </span>
                  {currentUser ? (
                    <span className="text-[#007600] font-bold">{currentUser.points ?? 0} نقطة</span>
                  ) : (
                    <span className="text-[#007185] hover:underline font-bold text-[11px]">تعرف على المكافآت</span>
                  )}
                </button>
                {/* Orders button shown when logged in */}
                {currentUser && (
                  <button
                    onClick={() => {
                      setIsSubnavDrawerOpen(false);
                      if (onOpenOrders) onOpenOrders();
                    }}
                    className="w-full text-right py-2 px-2 hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] rounded font-medium flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#FF9900]" />
                      <span>طلباتي وسجل المشتريات</span>
                    </span>
                    {ordersCount > 0 && (
                      <span className="bg-[#FF9900]/20 text-[#0F1111] dark:text-amber-300 font-bold text-xs px-2 py-0.5 rounded-full">
                        {ordersCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Cart button only shown when logged in */}
                {currentUser && (
                  <button
                    onClick={() => {
                      setIsSubnavDrawerOpen(false);
                      onOpenCart();
                    }}
                    className="w-full text-right py-2 px-2 hover:bg-[#F0F2F2] dark:hover:bg-[#232F3E] rounded font-medium flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-[#565959]" />
                      <span>سلة الشراء المجمعة</span>
                    </span>
                    <span className="text-[#BA0933] font-bold">{cartCount} عنصر</span>
                  </button>
                )}
              </div>

              <div className="pt-3">
                <div className="font-bold text-sm text-[#0F1111] dark:text-white mb-2">
                  المساعدة والإعدادات
                </div>
                {currentUser ? (
                  <button
                    onClick={() => {
                      setIsSubnavDrawerOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-right py-2 px-2 text-[#BA0933] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsSubnavDrawerOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold rounded-md shadow-xs text-center block cursor-pointer"
                  >
                    تسجيل الدخول
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};



