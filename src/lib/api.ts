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
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
  if (!res.ok) throw new ApiError(res.status, data.message || 'Request failed');
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

  // Bookings
  getBookings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Booking[]; meta: { total: number; page: number; limit: number } }>(`/bookings${qs}`);
  },
  updateBookingStatus: (id: string, status: string) =>
    request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Rooms
  getRooms: () => request<{ data: Room[] }>('/admin/rooms'),
  createRoom: (payload: Omit<Room, '_id' | 'isActive' | 'status' | 'rating' | 'images'> & { floor: number; type: string }) =>
    request<{ data: Room }>('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRoom: (id: string) =>
    request(`/rooms/${id}`, { method: 'DELETE' }),
  updateRoom: (id: string, payload: Partial<Room>) =>
    request(`/admin/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

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
  }) => request<{ data: Booking }>('/reception/book', { method: 'POST', body: JSON.stringify(payload) }),
  checkIn: (bookingId: string, advancePaymentMethod = 'cash') =>
    request<{ data: { bookingId: string; advancePaid: number; advancePct: number } }>(
      '/reception/checkin', { method: 'POST', body: JSON.stringify({ bookingId, advancePaymentMethod }) }
    ),
  checkOut: (bookingId: string, balancePaymentMethod = 'cash') =>
    request<{ data: { bookingId: string; invoice: Record<string, unknown>; guestName: string } }>(
      '/reception/checkout', { method: 'POST', body: JSON.stringify({ bookingId, balancePaymentMethod }) }
    ),
  addCharge: (bookingId: string, payload: { description: string; amount: number; category: string }) =>
    request<{ data: { extraCharges: ExtraCharge[]; invoicePreview: InvoicePreview } }>(
      `/reception/bookings/${bookingId}/charges`, { method: 'POST', body: JSON.stringify(payload) }
    ),
  removeCharge: (bookingId: string, chargeId: string) =>
    request<{ data: { extraCharges: ExtraCharge[]; invoicePreview: InvoicePreview } }>(
      `/reception/bookings/${bookingId}/charges/${chargeId}`, { method: 'DELETE' }
    ),
  getRooms: () => request<{ data: Room[] }>('/rooms?limit=50', { auth: false }),
};
