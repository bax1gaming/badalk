import React, { useEffect } from 'react';
import { Bell, X, BellOff, Sparkles, Package, Truck, CheckCheck, Trash2, Wallet } from 'lucide-react';
import { NotificationItem } from '../types.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onClearNotifications,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

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
        className="bg-white dark:bg-[#1A1F26] text-[#0F1111] dark:text-white rounded-xs max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#D5D9D9] dark:border-[#37475A] text-right my-auto flex flex-col space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amazon Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9] dark:border-[#37475A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-[#232F3E] text-[#FF9900] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#0F1111] dark:text-white text-base">
                  إشعارات وتنبيهات بدالك
                </h3>
                {unreadCount > 0 ? (
                  <span className="text-[10px] bg-[#B12704] text-white font-bold px-1.5 py-0.5 rounded-xs">
                    {unreadCount} جديد
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#F0F2F2] dark:bg-[#232F3E] text-[#565959] dark:text-[#9CA3AF] px-1.5 py-0.5 rounded-xs">
                    لا توجد إشعارات جديدة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#565959] dark:text-[#9CA3AF]">
                متابعة حركة الطلبات، الكابتن، وتحديثات المتاجر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#565959] dark:text-[#9CA3AF] hover:text-[#0F1111] dark:hover:text-white cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {notifications && notifications.length > 0 && (
          <div className="flex items-center justify-between px-1 text-xs">
            <button
              type="button"
              onClick={onMarkAllNotificationsRead}
              className="flex items-center gap-1.5 text-[#007185] hover:underline font-bold cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>تحديد الكل كمقروء</span>
            </button>

            {onClearNotifications && (
              <button
                type="button"
                onClick={onClearNotifications}
                className="flex items-center gap-1 text-[#BA0933] hover:underline text-[11px] font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center rounded-xs bg-[#F7F7F7] dark:bg-[#232F3E] border border-[#D5D9D9] dark:border-[#37475A] space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#E7E7E7] dark:bg-[#131921] text-[#565959] flex items-center justify-center">
                <BellOff className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#0F1111] dark:text-white text-sm">
                لا توجد إشعارات حالياً
              </h4>
              <p className="text-xs text-[#565959] dark:text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
                ستصلك هنا التنبيهات فور تجهيز طلبك أو خروج كابتن التوصيل في شوارع قنا.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (onMarkNotificationRead && !n.read) {
                      onMarkNotificationRead(n.id);
                    }
                  }}
                  className={`p-3 rounded-xs text-xs space-y-1 border cursor-pointer transition-colors ${
                    isUnread
                      ? 'bg-[#FFF8E7] dark:bg-[#232F3E] border-[#FFD814] text-[#0F1111] dark:text-white'
                      : 'bg-white dark:bg-[#1A1F26] border-[#D5D9D9] dark:border-[#37475A] text-[#565959] dark:text-[#CCCCCC] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xs bg-[#F0F2F2] dark:bg-[#131921] text-[#0F1111] dark:text-white">
                        {n.type === 'order' && <Package className="w-3.5 h-3.5 text-[#007185]" />}
                        {n.type === 'delivery' && <Truck className="w-3.5 h-3.5 text-[#FF9900]" />}
                        {n.type === 'wallet' && <Wallet className="w-3.5 h-3.5 text-[#007600]" />}
                        {n.type === 'reward' && <Sparkles className="w-3.5 h-3.5 text-[#FFA41C]" />}
                        {(!n.type || n.type === 'system') && <Bell className="w-3.5 h-3.5 text-[#565959]" />}
                      </span>
                      <span className="font-bold text-[#0F1111] dark:text-white text-xs">
                        {n.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#565959] dark:text-[#9CA3AF]">
                        {n.timestamp}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#B12704] shrink-0" />
                      )}
                    </div>
                  </div>

                  <p className="text-[#565959] dark:text-[#CCCCCC] leading-relaxed text-[11.5px] pr-6">
                    {n.message}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-[#D5D9D9] dark:border-[#37475A]">
          <button
            type="button"
            onClick={onClose}
            className="amazon-btn-white w-full py-2 text-xs font-bold text-[#0F1111] cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
