export type UserRole = 'customer' | 'merchant' | 'delivery' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  requestedRole?: 'merchant' | 'delivery' | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  storeName?: string;
  storeCategory?: string;
  storeAddress?: string;
  vehicleType?: string;
  plateNumber?: string;
  createdAt?: string;
  avatarUrl?: string;
  storeId?: string; // If merchant
  points?: number; // رصيد النقاط (نقطة لكل طلب، 10 نقاط = توصيل مجاني)
  ordersAbove500Count?: number; // عداد الطلبات فوق 500 جنيه (يصل إلى 3 ثم يعاد ضبطه)
  freeDeliveries?: number; // رصيد التوصيلات المجانية المتاحة
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  requestedRole: 'merchant' | 'delivery';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  // Merchant details
  storeId?: string;
  storeName?: string;
  storeCategory?: string;
  storeAddress?: string;
  // Delivery details
  driverId?: string;
  vehicleType?: string;
  plateNumber?: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  bannerUrl: string;
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$';
  lat: number;
  lng: number;
  address: string;
  phone: string;
  isOpen: boolean;
  distanceKm?: number;
  isApproved?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  storeName?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: string;
  stockQuantity: number;
  isSoldOut: boolean;
  rating: number;
  reviewCount: number;
  reviews?: ProductReview[];
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderPickupStop {
  storeId: string;
  storeName: string;
  address: string;
  lat: number;
  lng: number;
  items: { productName: string; quantity: number }[];
  isPickedUp: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  quantity: number;
  price: number;
  status: 'pending' | 'ready' | 'picked_up';
}

export type OrderStatus =
  | 'confirmed'
  | 'assigned'
  | 'picking_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'card' | 'apple_pay' | 'cash_on_delivery';
  paymentStatus: 'paid' | 'pending';
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  pickupStops: OrderPickupStop[];
  createdAt: string;
  deliveredAt?: string;
}

export interface DeliveryProfile {
  id: string;
  userId: string;
  driverName: string;
  vehicleType: 'موتوسيكل' | 'سيارة' | 'سكوتر كهربائي';
  plateNumber: string;
  currentLat: number;
  currentLng: number;
  isOnline: boolean;
  todayEarnings: number;
  totalCashCollected: number;
  todayKmDriven: number;
  fuelConsumedLiters: number; // calculated e.g. at 4L/100km or 8.5L/100km
  activeOrderId?: string;
  isApproved?: boolean;
}

export interface WithdrawalRequest {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  approvedDate?: string;
}

export interface DriverDistanceEvaluation {
  driverId: string;
  driverName: string;
  currentLocation: { lat: number; lng: number };
  storeDistances: { storeName: string; distanceKm: number }[];
  averageDistanceKm: number;
  isAssigned: boolean;
}

export interface OfferSlide {
  id: string;
  title: string;
  subtitle: string;
  tag?: string;
  badge?: string;
  gradient: string;
  image: string;
  categoryTarget?: string;
  storeId?: string;
  storeName?: string;
  // Dynamic controls for appearance and data
  showTag?: boolean;
  showBadge?: boolean;
  showTimer?: boolean;
  timerDurationHours?: number;
  timerLabel?: string;
  showCoupon?: boolean;
  couponCode?: string;
  couponLabel?: string;
  showButton?: boolean;
  buttonText?: string;
  // Dynamic display modes: clean image without filter, or pure image only
  imageOnly?: boolean;
  noFilter?: boolean;
}

export interface OfferBanner {
  id: string;
  title: string;
  subtitle: string;
  discountBadge: string;
  buttonText: string;
  bgGradient: string;
  imageUrl: string;
  categoryTarget?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'order' | 'delivery' | 'system' | 'reward' | 'wallet';
  read: boolean;
  userId?: string;
  driverId?: string;
  storeId?: string;
  orderId?: string;
  targetRole?: 'customer' | 'merchant' | 'delivery' | 'admin' | 'all';
}
