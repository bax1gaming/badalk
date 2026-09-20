import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle, className = '' }) => {
  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={onToggle}
      aria-label={isDarkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن (Cyber Glass)'}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden ${
        isDarkMode
          ? 'bg-slate-800/90 text-[#FFD700] hover:bg-slate-700 border border-white/15 shadow-[0_0_15px_rgba(255,215,0,0.35)]'
          : 'bg-white/95 text-[#FF6B00] hover:bg-slate-100 border border-slate-200 shadow-xs'
      } ${className}`}
      title={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن (Cyber Glass)'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDarkMode ? (
          <motion.div
            key="moon"
            initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 180, scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex items-center justify-center"
          >
            <Moon className="w-5 h-5 fill-[#FFD700]/25" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 180, scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex items-center justify-center"
          >
            <Sun className="w-5 h-5 fill-[#FF6B00]/25 text-[#FF6B00]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
