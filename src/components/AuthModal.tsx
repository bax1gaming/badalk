import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import {
  Lock,
  Mail,
  User as UserIcon,
  X,
  Store,
  ShoppingBag,
  Truck,
  CheckCircle2,
  MapPin,
  Phone,
  UserPlus,
  LogIn,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface AuthModalProps {
  categories?: string[];
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogin: (email: string, password?: string, role?: UserRole) => Promise<void>;
  onRegister: (userData: {
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
  }) => Promise<void>;
  defaultRole?: UserRole;
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onRegister,
  defaultRole,
  promptMessage,
  categories = [],
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('سوبرماركت');
  const [storeAddress, setStoreAddress] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('موتوسيكل');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      if (currentUser) {
        setEmail(currentUser.email);
      } else {
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
      }
      if (defaultRole) {
        setSelectedRole(defaultRole);
      }
    }
  }, [isOpen, currentUser, defaultRole]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await onLogin(email.trim(), password.trim(), selectedRole);
      setSuccessMessage('مرحباً بك! تم تسجيل الدخول بنجاح.');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر تسجيل الدخول. يرجى التحقق من البريد أو إنشاء حساب جديد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await onRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role: selectedRole,
        storeName: selectedRole === 'merchant' ? storeName.trim() : undefined,
        storeCategory: selectedRole === 'merchant' ? storeCategory : undefined,
        storeAddress: selectedRole === 'merchant' ? storeAddress.trim() : undefined,
        plateNumber: selectedRole === 'delivery' ? plateNumber.trim() : undefined,
        vehicleType: selectedRole === 'delivery' ? vehicleType : undefined,
      });

      if (selectedRole === 'merchant' || selectedRole === 'delivery') {
        setSuccessMessage('تم تسجيل طلبك بنجاح! حسابك بانتظار موافقة مدير النظام قبل تفعيله على المنصة.');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setSuccessMessage('تم إنشاء حسابك بنجاح! جاري تسجيل الدخول...');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] space-y-4 text-right my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amazon Squid Ink Top Bar Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9] dark:border-[#37475A]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xs bg-[#232F3E] text-[#FF9900] flex items-center justify-center font-black text-base border border-[#37475A]">
              ب
            </div>
            <div>
              <div className="text-sm font-black text-[#0F1111] dark:text-white flex items-center gap-1">
                <span>بدالك</span>
                <span className="text-[10px] text-[#FF9900] font-bold">Qena</span>
              </div>
              <p className="text-[10px] text-[#565959] dark:text-[#9CA3AF]">
                سوق ومتاجر قنا الموحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#565959] dark:text-[#9CA3AF] hover:text-[#0F1111] dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amazon Mode Tabs */}
        <div className="grid grid-cols-2 border-b border-[#D5D9D9] dark:border-[#37475A] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 text-center transition-colors cursor-pointer border-b-2 ${
              authMode === 'login'
                ? 'border-[#FF9900] text-[#0F1111] dark:text-white font-extrabold'
                : 'border-transparent text-[#565959] dark:text-[#9CA3AF] hover:text-[#0F1111]'
            }`}
          >
            تسجيل الدخول
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 text-center transition-colors cursor-pointer border-b-2 ${
              authMode === 'register'
                ? 'border-[#FF9900] text-[#0F1111] dark:text-white font-extrabold'
                : 'border-transparent text-[#565959] dark:text-[#9CA3AF] hover:text-[#0F1111]'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Informative Context / Action Prompt Banner */}
        {promptMessage && (
          <div className="p-2.5 bg-[#FFF8E7] border border-[#FFD814] rounded-xs text-xs text-[#0F1111] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{promptMessage}</span>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-2.5 bg-[#FFF5F5] border border-[#BA0933] rounded-xs text-[#BA0933] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 bg-[#F2FBF2] border border-[#007600] rounded-xs text-[#007600] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* LOGIN FORM */}
        {/* ------------------------------------------------------------- */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                البريد الإلكتروني:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#0F1111] dark:text-[#CCCCCC]">
                  كلمة المرور:
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="amazon-btn-yellow w-full py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </div>

            <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF] leading-relaxed pt-1">
              من خلال تسجيل الدخول، فإنك توافق على شروط الاستخدام وسياسة الخصوصية لمنصة بدالك في محافظة قنا.
            </p>

            <div className="pt-2 border-t border-[#D5D9D9] dark:border-[#37475A] text-center">
              <span className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                جديد في بدالك؟
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                className="amazon-btn-white w-full py-1.5 mt-2 text-xs font-bold text-[#0F1111] cursor-pointer"
              >
                أنشئ حسابك في بدالك
              </button>
            </div>
          </form>
        ) : (
          /* ------------------------------------------------------------- */
          /* REGISTER FORM */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            {/* Account Role Selection */}
            <div>
              <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                اختر نوع الحساب:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'customer'
                      ? 'border-[#FF9900] bg-[#FFF8E7] text-[#0F1111] font-bold ring-1 ring-[#FF9900]'
                      : 'border-[#D5D9D9] dark:border-[#37475A] bg-white dark:bg-[#1A1F26] text-[#565959] dark:text-[#9CA3AF]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#FF9900]" />
                  <span className="text-[11px]">عميل / متسوق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('merchant')}
                  className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'merchant'
                      ? 'border-[#FF9900] bg-[#FFF8E7] text-[#0F1111] font-bold ring-1 ring-[#FF9900]'
                      : 'border-[#D5D9D9] dark:border-[#37475A] bg-white dark:bg-[#1A1F26] text-[#565959] dark:text-[#9CA3AF]'
                  }`}
                >
                  <Store className="w-4 h-4 text-[#FF9900]" />
                  <span className="text-[11px]">تاجر في قنا</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('delivery')}
                  className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'delivery'
                      ? 'border-[#FF9900] bg-[#FFF8E7] text-[#0F1111] font-bold ring-1 ring-[#FF9900]'
                      : 'border-[#D5D9D9] dark:border-[#37475A] bg-white dark:bg-[#1A1F26] text-[#565959] dark:text-[#9CA3AF]'
                  }`}
                >
                  <Truck className="w-4 h-4 text-[#FF9900]" />
                  <span className="text-[11px]">كابتن توصيل</span>
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد القنائي"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                  رقم الهاتف (11 رقم):
                </label>
                <input
                  id="register-phone-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  required
                  value={phone}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhone(cleanValue);
                  }}
                  placeholder="01012345678"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                  البريد الإلكتروني:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F1111] dark:text-[#CCCCCC] mb-1">
                  كلمة المرور (6 أحرف فأكثر):
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1A1F26] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs focus:outline-hidden focus:border-[#FF9900] text-[#0F1111] dark:text-white"
                />
              </div>
            </div>

            {/* Merchant Details conditional fields */}
            {selectedRole === 'merchant' && (
              <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs space-y-2">
                <div className="font-bold text-[#0F1111] dark:text-white flex items-center justify-between text-[11px]">
                  <span>بيانات متجرك في قنا:</span>
                  <span className="text-[#B12704] text-[10px]">يتطلب اعتماد الإدارة</span>
                </div>

                <div>
                  <label className="block font-bold text-[#565959] dark:text-[#CCCCCC] mb-0.5 text-[11px]">
                    اسم المتجر:
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: سوبرماركت النور - قنا"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-white text-black dark:text-black font-medium border border-[#D5D9D9] rounded-xs text-xs placeholder:text-gray-500 focus:outline-hidden focus:border-[#FF9900]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#565959] dark:text-[#CCCCCC] mb-0.5 text-[11px]">
                      تصنيف المتجر:
                    </label>
                    <select
                      value={storeCategory}
                      onChange={(e) => setStoreCategory(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-white text-black dark:text-black font-medium border border-[#D5D9D9] rounded-xs text-xs focus:outline-hidden focus:border-[#FF9900]"
                    >
                      {categories.length > 0 ? (
                        categories.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))
                      ) : (
                        <>
                          <option value="سوبرماركت">سوبرماركت</option>
                          <option value="أجبان وألبان">أجبان وألبان</option>
                          <option value="جزارة ولحوم">جزارة ولحوم</option>
                          <option value="مخابز وحلويات">مخابز وحلويات</option>
                          <option value="خضار وفواكه">خضار وفواكه</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#565959] dark:text-[#CCCCCC] mb-0.5 text-[11px]">
                      عنوان المتجر في قنا:
                    </label>
                    <input
                      type="text"
                      required
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="شارع الجمهورية"
                      className="w-full px-2 py-1.5 bg-white dark:bg-white text-black dark:text-black font-medium border border-[#D5D9D9] rounded-xs text-xs placeholder:text-gray-500 focus:outline-hidden focus:border-[#FF9900]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Details conditional fields */}
            {selectedRole === 'delivery' && (
              <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] rounded-xs space-y-2">
                <div className="font-bold text-[#0F1111] dark:text-white flex items-center justify-between text-[11px]">
                  <span>بيانات مركبة التوصيل:</span>
                  <span className="text-[#007600] text-[10px]">كابتن بدالك</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#565959] dark:text-[#CCCCCC] mb-0.5 text-[11px]">
                      نوع المركبة:
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-white text-black dark:text-black font-medium border border-[#D5D9D9] rounded-xs text-xs focus:outline-hidden focus:border-[#FF9900]"
                    >
                      <option value="موتوسيكل">موتوسيكل</option>
                      <option value="سيارة">سيارة</option>
                      <option value="عجلة">عجلة (دراجة)</option>
                      <option value="تروسيكل">تروسيكل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#565959] dark:text-[#CCCCCC] mb-0.5 text-[11px]">
                      رقم اللوحة:
                    </label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="ق ن أ 1234"
                      className="w-full px-2 py-1.5 bg-white dark:bg-white text-black dark:text-black font-medium border border-[#D5D9D9] rounded-xs text-xs text-center placeholder:text-gray-500 focus:outline-hidden focus:border-[#FF9900]"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="amazon-btn-yellow w-full py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حسابك في بدالك'}
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                className="text-xs text-[#007185] hover:underline cursor-pointer"
              >
                لديك حساب بالفعل؟ تسجيل الدخول
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
