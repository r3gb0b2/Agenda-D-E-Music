export enum EventStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER', // Band Manager
  MEMBER = 'MEMBER'    // Musician
}

export interface Band {
  id: string;
  name: string;
  genre: string;
  members: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
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
  date: string; // ISO String
  time: string;
  durationHours: number;
  city: string;
  venue: string; // "Local do evento"
  contractor: string; // "Contratante"
  notes: string;
  status: EventStatus;
  financials: Financials;
}

export interface DashboardStats {
  totalEvents: number;
  totalRevenue: number;
  confirmedCount: number;
  pendingCount: number;
}