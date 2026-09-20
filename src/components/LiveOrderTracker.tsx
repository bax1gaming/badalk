import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, PackageCheck, Truck, MapPin, Sparkles } from 'lucide-react';
import { OrderStatus } from '../types.ts';

interface LiveOrderTrackerProps {
  status: OrderStatus;
  driverName?: string;
  etaMinutes?: number;
  distanceKm?: number;
  className?: string;
}

interface StepInfo {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  activeColor: string;
  glowClass: string;
}

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({
  status,
  driverName = 'كابتن بدالك المعتمد',
  etaMinutes = 18,
  distanceKm = 1.4,
  className = '',
}) => {
  const steps: StepInfo[] = [
    {
      key: 'confirmed',
      label: 'تم التأكيد',
      sublabel: 'المتجر يجهز الأصناف',
      icon: Clock,
      activeColor: '#FF9900',
      glowClass: 'shadow-xs',
    },
    {
      key: 'picking_up',
      label: 'استلام الطلب',
      sublabel: 'الكابتن يستلم السلع',
      icon: PackageCheck,
      activeColor: '#FFA41C',
      glowClass: 'shadow-xs',
    },
    {
      key: 'in_transit',
      label: 'جاري التوصيل',
      sublabel: 'في الطريق إلى موقعك',
      icon: Truck,
      activeColor: '#007185',
      glowClass: 'shadow-xs',
    },
    {
      key: 'delivered',
      label: 'تم التسليم',
      sublabel: 'وصل إلى بابك في قنا',
      icon: CheckCircle2,
      activeColor: '#007600',
      glowClass: 'shadow-xs',
    },
  ];

  // Determine current step index
  let currentIndex = 0;
  if (status === 'assigned') currentIndex = 1;
  else if (status === 'picking_up') currentIndex = 1;
  else if (status === 'in_transit') currentIndex = 2;
  else if (status === 'delivered') currentIndex = 3;

  const progressPercent = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div
      className={`relative p-4 rounded-xs transition-all duration-200 border border-[#D5D9D9] dark:border-[#37475A] bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white shadow-xs ${className}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-2.5 border-b border-[#F0F2F2] dark:border-[#37475A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xs bg-[#232F3E] text-[#FF9900] flex items-center justify-center border border-[#37475A]">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-[#0F1111] dark:text-white">
                تتبع مسار شحن وتوصيل الطلب
              </h4>
              <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-[#FFF8E7] text-[#B12704] border border-[#FFD814]">
                مباشر
              </span>
            </div>
            <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
              المندوب: <span className="font-bold text-[#0F1111] dark:text-white">{driverName}</span>
            </p>
          </div>
        </div>

        {/* Live Distance & ETA Badges */}
        <div className="flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-xs bg-[#F0F2F2] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] text-xs">
            <span className="text-[10px] text-[#565959] dark:text-[#9CA3AF] ml-1">الوقت:</span>
            <span className="font-bold text-[#B12704]">{etaMinutes}</span>
            <span className="text-[10px] text-[#565959] dark:text-[#9CA3AF] mr-0.5">د</span>
          </div>
          <div className="px-2 py-0.5 rounded-xs bg-[#F0F2F2] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] text-xs">
            <span className="text-[10px] text-[#565959] dark:text-[#9CA3AF] ml-1">المسافة:</span>
            <span className="font-bold text-[#007185]">{distanceKm}</span>
            <span className="text-[10px] text-[#565959] dark:text-[#9CA3AF] mr-0.5">كم</span>
          </div>
        </div>
      </div>

      {/* Interactive Track Steps */}
      <div className="relative pt-3 pb-1 px-2">
        {/* Background Track Line */}
        <div className="absolute top-7 left-6 right-6 h-1 bg-[#D5D9D9] dark:bg-[#37475A] rounded-full z-0" />

        {/* Animated Active Progress Line */}
        <motion.div
          className="absolute top-7 right-6 h-1 rounded-full z-0 bg-[#007600]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Step Nodes */}
        <div className="relative z-10 flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center text-center max-w-[80px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCurrent
                      ? 'bg-[#FFA41C] text-[#0F1111] ring-2 ring-[#FF9900] scale-105'
                      : isCompleted
                      ? 'bg-[#007600] text-white'
                      : 'bg-[#F0F2F2] dark:bg-[#232F3E] text-[#565959] dark:text-[#9CA3AF] border border-[#D5D9D9] dark:border-[#37475A]'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>

                <div className="mt-1.5">
                  <span
                    className={`block text-[11px] font-bold leading-tight ${
                      isCurrent
                        ? 'text-[#B12704]'
                        : isCompleted
                        ? 'text-[#007600]'
                        : 'text-[#565959] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-[9px] text-[#565959] dark:text-[#9CA3AF] truncate mt-0.5">
                    {step.sublabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
