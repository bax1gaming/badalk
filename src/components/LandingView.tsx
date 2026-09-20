import React from 'react';
import {
  ShoppingBag,
  MapPin,
  Truck,
  ChevronLeft,
  Banknote,
  PhoneCall,
  Lock,
  UserCheck,
  Star,
  ShieldCheck,
  Zap,
  Store as StoreIcon,
  Tag,
  Clock,
} from 'lucide-react';
import { Store as StoreType, Product, User, UserRole } from '../types.ts';

interface LandingViewProps {
  stores: StoreType[];
  products: Product[];
  availableUsers?: User[];
  onStartShopping: () => void;
  onOpenAuth: (defaultRole?: UserRole) => void;
  onDirectLogin?: (email: string, role?: UserRole) => Promise<void>;
}

export const LandingView: React.FC<LandingViewProps> = ({
  stores,
  products,
  availableUsers = [],
  onStartShopping,
  onOpenAuth,
  onDirectLogin,
}) => {
  return (
    <div className="space-y-8 pb-12 text-right">
      {/* Amazon Hero Banner - Squid Ink & Amazon Gold */}
      <section className="relative overflow-hidden rounded-xs bg-[#232F3E] text-white p-6 sm:p-10 md:p-12 shadow-sm border border-[#37475A]">
        {/* Background Amazon subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#131921] via-[#232F3E] to-[#37475A] opacity-90 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4 text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs bg-[#131921] border border-[#FF9900]/40 text-xs font-bold text-[#FF9900]">
            <span className="w-2 h-2 rounded-full bg-[#FF9900]"></span>
            <span>منصة التجارة الإلكترونية الموحدة لمدينة ومحافظة قنا</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
            كل تجار ومحلات قنا <br />
            <span className="text-[#FF9900]">في سلة تسوق موحدة</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-[#CCCCCC] leading-relaxed max-w-2xl">
            اطلب احتياجاتك اليومية من الأجبان البلدية، السوبرماركت، المخبوزات، اللحوم الطازجة، والخضروات من أفضل متاجر قنا المعتمدة في طلب ودليفري واحد بالجنيه المصري (ج.م) حتى باب بيتك.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="landing-login-btn"
              onClick={() => onOpenAuth('customer')}
              className="amazon-btn-yellow px-6 py-2.5 text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>تسجيل الدخول / إنشاء حساب</span>
            </button>

            <button
              id="landing-start-shopping-btn"
              onClick={onStartShopping}
              className="amazon-btn-orange px-6 py-2.5 text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح المنتجات والمتاجر كزائر</span>
            </button>
          </div>

          {/* City Coverage Badges */}
          <div className="pt-3 border-t border-[#37475A] flex flex-wrap items-center gap-1.5 text-[11px] text-[#CCCCCC]">
            <span className="font-bold text-white">نغطي كافة أحياء قنا:</span>
            {['وسط البلد', 'ميدان الساعة', 'شارع الجمهورية', 'المعنا', 'الجبلاو', 'الصالحية', 'دندرة', 'مدينة العمال', 'شارع المحطة'].map((area) => (
              <span key={area} className="bg-[#131921] px-2 py-0.5 rounded-xs border border-[#37475A]">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Amazon 4-Quad Cards (تسوق حسب الفئات والمميزات) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quad 1: Departments */}
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#0F1111] dark:text-white">
              الأقسام الأكثر طلباً في قنا
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div
                onClick={onStartShopping}
                className="cursor-pointer group text-center"
              >
                <div className="aspect-square bg-[#F7F7F7] dark:bg-[#232F3E] rounded-xs overflow-hidden border border-[#E7E7E7] dark:border-[#37475A]">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300"
                    alt="سوبرماركت"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="text-[11px] text-[#0F1111] dark:text-[#CCCCCC] font-medium mt-1 block">
                  سوبرماركت
                </span>
              </div>

              <div
                onClick={onStartShopping}
                className="cursor-pointer group text-center"
              >
                <div className="aspect-square bg-[#F7F7F7] dark:bg-[#232F3E] rounded-xs overflow-hidden border border-[#E7E7E7] dark:border-[#37475A]">
                  <img
                    src="https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&q=80&w=300"
                    alt="أجبان وألبان"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="text-[11px] text-[#0F1111] dark:text-[#CCCCCC] font-medium mt-1 block">
                  أجبان وألبان
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartShopping}
            className="text-xs font-bold text-[#007185] hover:underline text-right block pt-2 cursor-pointer"
          >
            تصفح جميع الأقسام ←
          </button>
        </div>

        {/* Quad 2: Fast Delivery */}
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#007185] font-bold">
              <span className="text-[#00A8E1] italic font-black text-sm">prime</span>
              <span>بدالك إكسبريس</span>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[#0F1111] dark:text-white mt-1">
              توصيل موحد وسريع في قنا
            </h3>
            <p className="text-xs text-[#565959] dark:text-[#9CA3AF] mt-2 leading-relaxed">
              اشترِ من عدة محلات في قنا في وقت واحد، وتصلك مشترياتك كاملة مع كابتن توصيل واحد ورسوم توصيل موحدة.
            </p>
            <div className="mt-3 p-2.5 bg-[#F0F2F2] dark:bg-[#232F3E] rounded-xs border border-[#D5D9D9] dark:border-[#37475A] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#FF9900]" />
              <span className="text-xs font-bold text-[#0F1111] dark:text-white">
                يبدأ التوصيل من 15 ج.م فقط
              </span>
            </div>
          </div>

          <button
            onClick={onStartShopping}
            className="text-xs font-bold text-[#007185] hover:underline text-right block pt-2 cursor-pointer"
          >
            تعرف على مناطق التوصيل ←
          </button>
        </div>

        {/* Quad 3: Verified Merchants */}
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#0F1111] dark:text-white">
              تجار قنا المعتمدون
            </h3>
            <p className="text-xs text-[#565959] dark:text-[#9CA3AF] mt-2 leading-relaxed">
              نضمن لك جودة المنتجات الطازجة والأسعار الرسمية للمتاجر دون أي زيادة.
            </p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[#007600] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>فحص وضمان الجودة عند الاستلام</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0F1111] dark:text-white">
                <Banknote className="w-4 h-4 text-[#FF9900]" />
                <span>دفع عند الاستلام أو بالمحافظ الإلكترونية</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenAuth('merchant')}
            className="text-xs font-bold text-[#007185] hover:underline text-right block pt-2 cursor-pointer"
          >
            هل أنت تاجر في قنا؟ انضم إلينا ←
          </button>
        </div>

        {/* Quad 4: Rewards & Loyalty */}
        <div className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#0F1111] dark:text-white">
              برنامج مكافآت ونقاط بدالك
            </h3>
            <p className="text-xs text-[#565959] dark:text-[#9CA3AF] mt-2 leading-relaxed">
              اكسب نقاطاً مع كل طلب تقوم به واستبدلها بكوبونات خصم وطلبات مجانية فورية.
            </p>
            <div className="mt-3 p-2.5 bg-[#FFF8E7] dark:bg-[#232F3E] rounded-xs border border-[#FFD814] text-xs space-y-1">
              <div className="font-bold text-[#B12704]">هدية ترحيبية 250 نقطة</div>
              <div className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                تضاف تلقائياً عند تسجيل حسابك الأول
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenAuth('customer')}
            className="text-xs font-bold text-[#007185] hover:underline text-right block pt-2 cursor-pointer"
          >
            سجل الآن واكسب النقاط ←
          </button>
        </div>
      </section>

      {/* Featured Stores Preview Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9] dark:border-[#37475A]">
          <div className="text-right">
            <h2 className="text-base sm:text-lg font-bold text-[#0F1111] dark:text-white flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-[#FF9900]" />
              <span>متاجر معتمدة على منصة بدالك</span>
            </h2>
            <p className="text-xs text-[#565959] dark:text-[#9CA3AF]">
              متاجر حقيقية في قنا جاهزة لتجهيز طلبك فورياً
            </p>
          </div>

          <button
            onClick={onStartShopping}
            className="text-xs font-bold text-[#007185] hover:underline cursor-pointer"
          >
            تصفح جميع المتاجر والمنتجات ←
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              onClick={onStartShopping}
              className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs overflow-hidden hover:border-[#FF9900] transition-colors text-right cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative h-28 w-full bg-[#F7F7F7] dark:bg-[#232F3E] overflow-hidden">
                  <img
                    src={store.bannerUrl}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-[#232F3E] text-white text-[10px] font-bold px-2 py-0.5 rounded-xs">
                    {store.category}
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <h3 className="font-bold text-xs sm:text-sm text-[#0F1111] dark:text-white truncate">
                    {store.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-[#FFA41C]">
                    <span>★ {store.rating}</span>
                    <span className="text-[#565959] dark:text-[#9CA3AF]">({store.reviewCount} تقييم)</span>
                  </div>
                  <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF] line-clamp-1">
                    {store.address}
                  </p>
                </div>
              </div>

              <div className="p-3 pt-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartShopping();
                  }}
                  className="amazon-btn-yellow w-full py-1 text-xs font-bold"
                >
                  تسوق من المتجر
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Customer Support Bar */}
      <section className="bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-right space-y-0.5">
          <h3 className="font-bold text-sm text-[#0F1111] dark:text-white">
            فريق خدمة عملاء بدالك في خدمتك يومياً
          </h3>
          <p className="text-xs text-[#565959] dark:text-[#9CA3AF]">
            من 8:00 صباحاً حتى 12:00 منتصف الليل لمتابعة كافة الطلبات في محافظة قنا
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#F0F2F2] dark:bg-[#232F3E] px-3 py-1.5 rounded-xs border border-[#D5D9D9] dark:border-[#37475A] text-xs font-bold text-[#0F1111] dark:text-white">
            <PhoneCall className="w-4 h-4 text-[#FF9900]" />
            <span dir="ltr">010 1234 5678</span>
          </div>
          <button
            onClick={() => onOpenAuth('customer')}
            className="amazon-btn-yellow px-4 py-1.5 text-xs font-bold"
          >
            سجل الآن
          </button>
        </div>
      </section>
    </div>
  );
};
