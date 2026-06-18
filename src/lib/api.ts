/**
 * Admin / Receptionist API client
 * Talks to the backend at VITE_API_URL (proxied via Vite in dev)
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getAccessToken = () => localStorage.getItem('adminAccessToken');
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('adminAccessToken', access);
  localStorage.setItem('adminRefreshToken', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminUser');
};
export const getStoredUser = (): User | null => {
  try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); } catch { return null; }
};
export const storeUser = (u: User) => localStorage.setItem('adminUser', JSON.stringify(u));

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'receptionist' | 'user';
  loyaltyTier?: string;
  totalStays?: number;
  memberSince?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface Room {
  _id: string;
  roomNumber: string;
  floor: number;
  type: string;
  price: number;
  customPrice?: number;
  capacity: number;
  size?: string;
  beds?: string;
  amenities: string[];
  status: string;
  isActive: boolean;
  description?: string;
  rating?: { average: number; count: number };
  images?: string[];
}

export interface Booking {
  _id: string;
  bookingId: string;
  user: User | null;
  room: Room | null;
  roomType: string;
  pricePerNight?: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  nights: number;
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  source: string;
  guestDetails?: { name: string; email: string; phone: string; idProof?: string };
  specialRequests?: string;
  extraCharges: ExtraCharge[];
  advancePaid: number;
  advancePaidAt?: string;
  advancePaymentMethod?: string;
  discount?: number;
  actualCheckOut?: string;
  invoicePreview?: InvoicePreview;
  createdAt: string;
}

export interface Staff {
  _id: string;
  employeeId: string;
  name: string;
  role: string;
  shift: string;
  salary?: number;
  contact?: { phone?: string; email?: string };
  isActive: boolean;
  joiningDate?: string;
  address?: string;
  notes?: string;
}

export interface ExtraCharge {
  _id: string;
  description: string;
  amount: number;
  category: 'food' | 'laundry' | 'room_service' | 'minibar' | 'transport' | 'other';
  addedBy?: { name: string };
  addedAt: string;
}

export interface InvoicePreview {
  roomSubtotal: number;
  discount?: number;
  extraChargesTotal: number;
  extraCharges: { description: string; amount: number; category: string }[];
  subtotal: number;
  cgstPercentage: number;
  sgstPercentage: number;
  cgst: number;
  sgst: number;
  tax: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
}

export interface HotelSettings {
  cgstPercentage: number;
  sgstPercentage: number;
  advancePaymentPercent: number;
  hotelName: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelAddress: string;
  hotelTagline: string;
  gstNumber: string;
}

export interface DashboardData {
  rooms: { total: number; occupied: number; available: number; maintenance: number };
  bookings: { total: number; todayCheckIns: number; todayCheckOuts: number; pending: number; confirmed: number };
  users: { total: number };
  staff: { total: number };
  revenue: { allTime: number; currentMonth: number };
  occupancyRate: number;
  recentBookings: Booking[];
}

export interface ReceptionToday {
  todayCheckIns: Booking[];
  todayCheckOuts: Booking[];
  currentlyOccupied: Booking[];
}

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];
  constructor(status: number, message: string, errors?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers: extra, ...rest } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra as Record<string, string>) };
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { headers, ...rest });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retried = await fetch(`${BASE_URL}${endpoint}`, { headers, ...rest });
      if (!retried.ok) { clearTokens(); throw new ApiError(retried.status, 'Session expired'); }
      return retried.json();
    }
    clearTokens();
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data.message || 'Request failed', data.errors);
  return data;
}

async function tryRefresh(): Promise<boolean> {
  const rt = localStorage.getItem('adminRefreshToken');
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const d = await res.json();
    setTokens(d.data.accessToken, d.data.refreshToken);
    return true;
  } catch { return false; }
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), auth: false }
    ),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ data: User }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => request<{ data: DashboardData }>('/admin/dashboard'),
  getRevenueReport: (months = 6) => request<{ data: { month: string; revenue: number }[] }>(`/admin/reports/revenue?months=${months}`),
  getOccupancyReport: () => request<{ data: unknown }>('/admin/reports/occupancy'),
  getBookingsByRoomType: () => request<{ data: unknown[] }>('/admin/reports/bookings-by-room-type'),

  // Staff
  getStaff: () => request<{ data: Staff[] }>('/admin/staff'),
  createStaff: (payload: Partial<Staff>) => request<{ data: Staff }>('/admin/staff', { method: 'POST', body: JSON.stringify(payload) }),
  updateStaff: (id: string, payload: Partial<Staff>) => request<{ data: Staff }>(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteStaff: (id: string) => request(`/admin/staff/${id}`, { method: 'DELETE' }),

  // Users (guests)
  getUsers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: User[] }>(`/admin/users${qs}`);
  },
  changeUserPassword: (userId: string, payload: { password: string }) =>
    request<{ success: boolean; message: string }>(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Bookings
  getBookings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Booking[]; meta: { total: number; page: number; limit: number } }>(`/bookings${qs}`);
  },
  updateBookingStatus: (id: string, status: string) =>
    request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteBooking: (id: string) =>
    request(`/admin/bookings/${id}`, { method: 'DELETE' }),
  deletePayment: (id: string) =>
    request(`/admin/payments/${id}`, { method: 'DELETE' }),
  deleteInvoice: (id: string) =>
    request(`/admin/invoices/${id}`, { method: 'DELETE' }),
  deleteUser: (id: string) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Rooms
  getRooms: () => request<{ data: Room[] }>('/admin/rooms'),
  createRoom: (payload: Omit<Room, '_id' | 'isActive' | 'status' | 'rating' | 'images'> & { floor: number; type: string }) =>
    request<{ data: Room }>('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRoom: (id: string) =>
    request(`/rooms/${id}`, { method: 'DELETE' }),
  updateRoom: (id: string, payload: Partial<Room>) =>
    request(`/admin/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateRoomPricing: (payload: { pricing: Record<string, number> }) =>
    request('/admin/rooms/pricing', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Settings
  getSettings: () => request<{ data: HotelSettings }>('/admin/settings'),
  updateSettings: (payload: Partial<HotelSettings>) =>
    request('/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Active guests
  getActiveGuests: () => request<{ data: Booking[] }>('/admin/active-guests'),
  changeGuestRoom: (bookingMongoId: string, newRoomId: string) =>
    request<{ data: Booking }>(`/admin/bookings/${bookingMongoId}/change-room`, {
      method: 'PATCH',
      body: JSON.stringify({ newRoomId }),
    }),

  // Activity history
  getActivityLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ logs: ActivityLog[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      `/admin/activity-logs${qs}`
    );
  },
  exportActivityLogsUrl: (params?: Record<string, string>) => {
    const token = getAccessToken();
    const allParams = { ...params, token: token || '' };
    const qs = '?' + new URLSearchParams(allParams).toString();
    return `${BASE_URL}/admin/activity-logs/export${qs}`;
  }
};

// ── Payments API ──────────────────────────────────────────────────────────────
export interface Payment {
  _id: string;
  booking: { bookingId: string; roomType: string; checkInDate: string; checkOutDate: string; totalAmount: number; status: string } | null;
  user: { name: string; email: string; phone?: string } | null;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  razorpayPaymentId?: string;
  refundId?: string;
  refundAmount?: number;
  refundDate?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

export const paymentsApi = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Payment[]; meta: { total: number; page: number; limit: number; pages: number } }>(`/payments${qs}`);
  },
  refund: (id: string, reason?: string, refundAmount?: number, password?: string) =>
    request<{ data: { refundId: string; refundAmount: number; status: string } }>(
      `/payments/${id}/refund`,
      { method: 'POST', body: JSON.stringify({ reason, refundAmount, password }) }
    ),
};

// ── Reception API ─────────────────────────────────────────────────────────────
export const receptionApi = {
  getToday: () => request<{ data: ReceptionToday }>('/reception/today'),
  getBookings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Booking[]; meta: { total: number; page: number; limit: number } }>(`/reception/bookings${qs}`);
  },
  getBookingDetail: (bookingId: string) =>
    request<{ data: Booking }>(`/reception/bookings/${bookingId}`),
  createOfflineBooking: (payload: {
    roomId: string; checkInDate: string; checkOutDate: string; guests: number;
    guestDetails: { name: string; email: string; phone: string; idProof?: string };
    specialRequests?: string; source?: string;
    customPricePerNight?: number;
    discount?: number;
  }) => request<{ data: Booking }>('/reception/book', { method: 'POST', body: JSON.stringify(payload) }),
  checkIn: (bookingId: string, advancePaymentMethod = 'cash', roomId?: string) =>
    request<{ data: { bookingId: string; room: string; advancePaid: number; advancePct: number } }>(
      '/reception/checkin', { method: 'POST', body: JSON.stringify({ bookingId, advancePaymentMethod, ...(roomId ? { roomId } : {}) }) }
    ),
  checkOut: (bookingId: string, balancePaymentMethod = 'cash', customRoomSubtotal?: number, discount?: number) =>
    request<{ data: { bookingId: string; invoice: Record<string, unknown>; guestName: string } }>(
      '/reception/checkout', { method: 'POST', body: JSON.stringify({ bookingId, balancePaymentMethod, customRoomSubtotal, discount }) }
    ),
  addCharge: (bookingId: string, payload: { description: string; amount: number; category: string }) =>
    request<{ data: { extraCharges: ExtraCharge[]; invoicePreview: InvoicePreview } }>(
      `/reception/bookings/${bookingId}/charges`, { method: 'POST', body: JSON.stringify(payload) }
    ),
  removeCharge: (bookingId: string, chargeId: string) =>
    request<{ data: { extraCharges: ExtraCharge[]; invoicePreview: InvoicePreview } }>(
      `/reception/bookings/${bookingId}/charges/${chargeId}`, { method: 'DELETE' }
    ),
  getRooms: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Room[] }>(`/rooms${qs}`, { auth: false });
  },
  getRoomsByType: (type: string) => {
    const qs = new URLSearchParams({ type, status: 'available', limit: '50' }).toString();
    return request<{ data: Room[] }>(`/rooms?${qs}`, { auth: false });
  },
  getAssignableRooms: (bookingId: string) =>
    request<{ data: Room[] }>(`/reception/bookings/${bookingId}/assignable-rooms`),
  extendStay: (bookingId: string, newCheckOutDate: string) =>
    request<{ success: boolean; message: string }>(`/reception/bookings/${bookingId}/extend`, {
      method: 'PATCH',
      body: JSON.stringify({ newCheckOutDate }),
    }),
};

// ── Invoices API ──────────────────────────────────────────────────────────────
export interface Invoice {
  _id: string;
  invoiceNumber: string;
  booking: { _id: string; bookingId: string; checkInDate: string; checkOutDate: string; actualCheckOut?: string; nights: number; status: string } | null;
  user: { name: string; email: string; phone?: string } | null;
  room: { roomNumber: string; type: string } | null;
  roomSubtotal: number;
  extraCharges: { description: string; amount: number; category: string }[];
  extraChargesTotal: number;
  subtotal: number;
  cgstPercentage: number;
  sgstPercentage: number;
  cgst: number;
  sgst: number;
  tax: number;
  totalAmount: number;
  advancePaid: number;
  advancePaymentMethod: string;
  balanceDue: number;
  balancePaymentMethod: string;
  generatedAt: string;
}

export const invoicesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Invoice[]; meta: { total: number; page: number; limit: number; pages: number } }>(`/invoices${qs}`);
  },
  getByBooking: (mongoBookingId: string) =>
    request<{ data: Invoice }>(`/invoices/${mongoBookingId}`),
  downloadPdfUrl: (mongoBookingId: string) =>
    `${BASE_URL}/invoices/${mongoBookingId}/pdf`,
  sendEmail: (mongoBookingId: string) =>
    request<{ message: string }>(`/invoices/${mongoBookingId}/email`, { method: 'POST' }),
};

export interface Notification {
  _id: string;
  recipientId?: string | null;
  recipientRole?: 'admin' | 'receptionist' | 'user' | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  userId?: string | null;
  userName: string;
  role: string;
  action: string;
  module: string;
  entityId?: string | null;
  entityType?: string | null;
  description: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: (page = 1, limit = 50) =>
    request<{ notifications: Notification[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      `/notifications?page=${page}&limit=${limit}`
    ),
  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),
  readNotification: (id: string) =>
    request<{ notification: Notification }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () =>
    request<{ message: string }>('/notifications/read-all', { method: 'PATCH' }),
  getStreamUrl: () => {
    const token = getAccessToken();
    return `${BASE_URL}/notifications/stream?token=${token}`;
  }
};
