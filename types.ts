

export enum EventStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTRACT = 'CONTRACT', // Access to financials and contracts
  MANAGER = 'MANAGER', // Band Manager
  VIEWER = 'VIEWER'    // Read-only access
}

export enum ContractorType {
  FISICA = 'FISICA',
  JURIDICA = 'JURIDICA'
}

export interface Band {
  id: string;
  name: string;
  genre: string;
  members: number;
}

export interface User {
  id:string;
  name: string;
  email: string;
  password?: string; // Para autenticação local
  role: UserRole;
  bandIds: string[]; // Access to specific bands
}

export interface Financials {
  grossValue: number;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionValue: number; // If percentage, store as 10 (for 10%), if fixed, store absolute value
  taxes: number; // Absolute value
  netValue: number;
  currency: string;
}

export interface Event {
  id: string;
  bandId: string;
  name: string; // Event name e.g., "Wedding of X & Y"
  eventType: string; // Tipo de evento (Casamento, Corporativo, etc.)
  date: string; // ISO String
  time: string;
  durationHours: number;
  city: string;
  venue: string; // "Local do evento"
  contractor: string; // "Contratante"
  notes: string;
  status: EventStatus;
  financials: Financials;
  // New fields
  createdBy: string; // Name of the user who created
  createdAt: string; // ISO String of creation timestamp
  hasContract: boolean; // If false, shows warning that contract is missing
}

export interface Contractor {
  id: string;
  type: ContractorType;
  name: string; // Nome ou Razão Social
  responsibleName: string;
  phone: string;
  whatsapp: string;
  email: string;
  // Endereço
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };
  // Infos Adicionais
  additionalInfo: {
    event: string; // Campo "Evento" solicitado
    venue: string; // Campo "Local" solicitado
    notes: string;
  };
}

export interface DashboardStats {
  totalEvents: number;
  totalRevenue: number;
  confirmedCount: number;
  pendingCount: number;
}