import React, { useEffect } from 'react';
import { Award, X, Truck, Coins } from 'lucide-react';
import { User } from '../types.ts';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints?: number;
  currentUser?: User | null;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  userPoints = 0,
  currentUser = null,
}) => {
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

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] space-y-4 text-right my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amazon Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9] dark:border-[#37475A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#232F3E] text-[#FF9900] flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#0F1111] dark:text-white text-base">
                برنامج مكافآت بدالك
              </h3>
              <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                {currentUser ? 'اكسب نقاطاً مع كل طلب واستمتع بتوصيل مجاني' : 'تعرف على مميزات وتفاصيل برنامج المكافآت'}
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

        {/* Current Points Balance Box (Shown ONLY if logged in) */}
        {currentUser && (
          <div className="bg-[#232F3E] text-white rounded-md p-4 border border-[#37475A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#CCCCCC]">
                رصيدك الحالي من النقاط:
              </span>
              <span className="bg-[#FF9900] text-[#0F1111] px-2 py-0.5 rounded-full text-[11px] font-bold">
                حساب نشط ★
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#FFD814]">
                {userPoints.toLocaleString()}
              </span>
              <span className="text-xs text-[#CCCCCC]">نقطة</span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#CCCCCC] pt-2 border-t border-[#37475A]">
              <span>الطلبات فوق 500 ج.م:</span>
              <span className="font-bold text-[#FF9900]">{currentUser.ordersAbove500Count ?? 0} من 3 طلبات</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#CCCCCC]">
              <span>توصيلات مجانية متوفرة:</span>
              <span className="font-bold text-[#00A8E1]">{currentUser.freeDeliveries ?? 0} توصيل مجاني</span>
            </div>
          </div>
        )}

        {/* Simplified Explanation of Rewards System */}
        <div className="space-y-2.5 text-xs">
          <h4 className="font-bold text-[#0F1111] dark:text-white text-sm flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-[#FF9900]" />
            <span>كيف يعمل نظام المكافآت في بدالك؟</span>
          </h4>

          <div className="space-y-2">
            {/* Rule 1 */}
            <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] rounded-md border border-[#D5D9D9] dark:border-[#37475A] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#007600]/15 text-[#007600] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-[#0F1111] dark:text-white text-xs">
                  نقطة مع كل أوردر
                </div>
                <div className="text-[11px] text-[#565959] dark:text-[#CCCCCC] leading-relaxed">
                  كل أوردر تطلبه من المنصة يضيف تلقائياً <span className="font-bold text-[#007600]">1 نقطة</span> إلى رصيدك.
                </div>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] rounded-md border border-[#D5D9D9] dark:border-[#37475A] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-[#0F1111] dark:text-white text-xs flex items-center gap-1">
                  <span>3 أوردرات فوق 500 ج.م = توصيل رابع مجاناً!</span>
                  <Truck className="w-3.5 h-3.5 text-[#00A8E1]" />
                </div>
                <div className="text-[11px] text-[#565959] dark:text-[#CCCCCC] leading-relaxed">
                  عند إتمام 3 أوردرات بقيمة إجمالية للسلة أكثر من 500 ج.م لكل منها، ستحصل تلقائياً على <span className="font-bold text-[#00A8E1]">توصيل مجاني للطلب الرابع</span> ويعاد العداد للبدء من جديد.
                </div>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="p-3 bg-[#F7F7F7] dark:bg-[#232F3E] rounded-md border border-[#D5D9D9] dark:border-[#37475A] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#007185]/20 text-[#007185] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-[#0F1111] dark:text-white text-xs">
                  استبدال 10 نقاط بتوصيل مجاني
                </div>
                <div className="text-[11px] text-[#565959] dark:text-[#CCCCCC] leading-relaxed">
                  بإمكانك في أي وقت صرف <span className="font-bold text-[#C7511F]">10 نقاط</span> من رصيدك للحصول على توصيل مجاني فوري لأي أوردر.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-[#0F1111] dark:text-white bg-[#F0F2F2] dark:bg-[#232F3E] hover:bg-[#E3E6E6] dark:hover:bg-[#2d3748] border border-[#D5D9D9] dark:border-[#37475A] rounded-md cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
