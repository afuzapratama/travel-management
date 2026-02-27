// ============================================
// TRAVEL PANEL - TYPE DEFINITIONS
// PT Global Teknik Multi Guna
// ============================================

export interface FlightInfo {
  flightNumber: string;
  routeFrom: string;
  routeTo: string;
  routeFromDetail: string;
  routeToDetail: string;
  departureDate: string;
  departureTime: string;
}

export type PaxTitle = 'MR' | 'MRS' | 'MS' | 'MSTR' | 'MISS';

export interface Passenger {
  id: string;
  title: PaxTitle;
  name: string;
  type: 'ADT' | 'CHD' | 'INF';
  dob: string;
  passport: string;
  passportExpiry: string;
  bookingRef: string;
  price: number;
}

export interface BillTo {
  name: string;
  phone: string;
  email: string;
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  status: 'belum-lunas' | 'lunas' | 'dp';
  statusNote: string;
}

export interface PaymentInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  signatureUrl: string;
  signerName: string;
  signerPosition: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  agentId?: string;
  status: BookingStatus;
  flight: FlightInfo;
  passengers: Passenger[];
  billTo: BillTo;
  invoice: InvoiceMeta;
  serviceFee: number;
  discount: number;
  payment: PaymentInfo;
  company: CompanyInfo;
  notes: string;
  hideKeterangan: boolean;
  hideHarga: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== DEFAULTS =====

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'PT GLOBAL TEKNIK MULTI GUNA',
  address: 'Marelan Psr 1 Rel. Jl. Serba Jadi, KOTA MEDAN, Sumatera Utara 20245',
  phone: '+62895320841777',
  email: 'call@gtmgroup.co.id',
  website: 'www.gtmgroup.co.id',
  logoUrl: '',
  signatureUrl: '',
  signerName: 'Antasari',
  signerPosition: 'PT Global Teknik Multi Guna',
};

export const DEFAULT_PAYMENT: PaymentInfo = {
  bankName: 'Bank OCBC NISP',
  accountName: 'PT Global Teknik Multi Guna',
  accountNumber: '693800132377',
};

export function createEmptyPassenger(): Passenger {
  return {
    id: crypto.randomUUID(),
    title: 'MR' as PaxTitle,
    name: '',
    type: 'ADT',
    dob: '',
    passport: '',
    passportExpiry: '',
    bookingRef: '',
    price: 0,
  };
}

export function createNewBooking(): Booking {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    agentId: undefined,
    status: 'pending',
    flight: {
      flightNumber: '',
      routeFrom: '',
      routeTo: '',
      routeFromDetail: '',
      routeToDetail: '',
      departureDate: '',
      departureTime: '',
    },
    passengers: [createEmptyPassenger()],
    billTo: { name: '', phone: '', email: '' },
    invoice: {
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      poNumber: '',
      status: 'belum-lunas',
      statusNote: '',
    },
    serviceFee: 0,
    discount: 0,
    payment: { ...DEFAULT_PAYMENT },
    company: { ...DEFAULT_COMPANY },
    notes: '',
    hideKeterangan: false,
    hideHarga: false,
    createdAt: now,
    updatedAt: now,
  };
}
