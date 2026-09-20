import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { ChevronLeft, Check, Sparkles, ShoppingBag } from 'lucide-react';

interface SwipeButtonProps {
  onConfirm: () => void;
  text?: string;
  confirmedText?: string;
  disabled?: boolean;
  isConfirmed?: boolean;
  className?: string;
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  onConfirm,
  text = 'اسحب لتأكيد الطلب فوراً',
  confirmedText = 'تم تأكيد الطلب بنجاح! 🎉',
  disabled = false,
  isConfirmed = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState(0);
  const [success, setSuccess] = useState(isConfirmed);
  const x = useMotionValue(0);

  useEffect(() => {
    setSuccess(isConfirmed);
  }, [isConfirmed]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Leave 56px for button knob
        setDragWidth(Math.max(0, containerRef.current.offsetWidth - 56));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate progress from 0 to 1
  // In RTL, dragging is typically towards -x (leftwards)
  const progress = useTransform(x, [0, -dragWidth || -1], [0, 1]);
  const bgOpacity = useTransform(progress, [0, 1], [0.15, 1]);

  const handleDragEnd = () => {
    const currentX = x.get();
    const distance = Math.abs(currentX);
    // If dragged at least 70% of the width
    if (distance >= dragWidth * 0.7 && !disabled && !success) {
      setSuccess(true);
      onConfirm();
    } else {
      // Spring back
      x.set(0);
    }
  };

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className={`relative h-12 w-full rounded-full overflow-hidden select-none transition-all duration-300 p-1 flex items-center ${
        disabled
          ? 'opacity-50 pointer-events-none bg-[#E3E6E6]'
          : success
          ? 'bg-[#FFA41C] shadow-md'
          : 'bg-[#FFD814] border border-[#FCD200]'
      } ${className}`}
    >
      {/* Dynamic Background Fill that transitions to Amazon Orange */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-l from-[#FFA41C] to-[#FF8F00] rounded-full pointer-events-none"
        style={{ opacity: success ? 1 : bgOpacity }}
      />

      {/* Centered Track Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-12">
        <span
          className={`text-xs md:text-sm font-bold tracking-wide transition-colors duration-200 ${
            success
              ? 'text-[#0F1111] font-extrabold flex items-center gap-2 animate-in zoom-in-95'
              : 'text-[#0F1111]'
          }`}
        >
          {success ? (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{confirmedText}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 font-bold">
              <span>{text}</span>
              <ChevronLeft className="w-4 h-4 text-[#0F1111] animate-pulse" />
            </span>
          )}
        </span>
      </div>

      {/* Draggable Knob */}
      {!success && dragWidth > 0 && (
        <motion.div
          drag="x"
          dragConstraints={{ left: -dragWidth, right: 0 }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="relative z-20 w-10 h-10 rounded-full bg-white text-[#0F1111] flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform border border-[#D5D9D9] shrink-0"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </motion.div>
      )}
    </div>
  );
};
