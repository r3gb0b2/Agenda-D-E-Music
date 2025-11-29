
export enum EventStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED'
}

export enum PipelineStage {
  LEAD = 'LEAD',           // Prospecção / Contato Inicial
  QUALIFICATION = 'QUALIFICATION', // Qualificação
  PROPOSAL = 'PROPOSAL',   // Proposta Enviada
  NEGOTIATION = 'NEGOTIATION', // Negociação
  CONTRACT = 'CONTRACT',   // Emissão de Contrato
  WON = 'WON',             // Fechado (Ganha)
  LOST = 'LOST'            // Perdido
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',   // Gerente Geral
  SALES = 'SALES',       // Comercial (Cadastra datas)
  CONTRACTS = 'CONTRACTS', // Contratos (Gere contratos e users visualizadores)
  VIEWER = 'VIEWER',     // Visualizador (Só vê disponibilidade)
  MEMBER = 'MEMBER'      // Músico (Visualização básica)
}

export enum ContractorType {
  FISICA = 'FISICA',
  JURIDICA = 'JURIDICA'
}

export interface BandLegalDetails {
  razSocial: string;
  cnpj: string;
  address: string;
  repLegal: string;
  cpfRep: string;
  rgRep: string;
  email: string;
  phone: string;
}

export interface BandBankDetails {
  bank: string;
  agency: string;
  account: string;
  favored: string; // Favorecido
  pix: string;
  cnpj: string; // CNPJ vinculado a conta
}

export interface Band {
  id: string;
  name: string;
  genre: string;
  members: number;
  legalDetails?: BandLegalDetails;
  bankDetails?: BandBankDetails;
}

export interface User {
  id: string;
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
  notes?: string; // Informações Adicionais do Financeiro
}

export interface ContractFile {
  name: string;
  url: string; // In mock, this is the filename. In real app, the download URL.
  uploadedAt: string;
}

export interface Logistics {
  transport: string; // Van, Carro, Ônibus
  departureTime: string;
  returnTime: string;
  hotel: string; // Nome do hotel / Booking
  flights: string; // Voo detalhes
  crew: string; // Lista da equipe técnica (Roadies, Techs)
  rider: string; // Notas sobre Rider Técnico / Palco
  notes: string; // Obs gerais
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
  
  // New CRM & Logistics Fields
  pipelineStage: PipelineStage;
  logistics: Logistics;

  // Metadata
  createdBy: string; // Name of the user who created
  createdAt: string; // ISO String of creation timestamp
  hasContract: boolean; // If false, shows warning that contract is missing
  contractUrl?: string; // Legacy field (kept for safety)
  contractFiles: ContractFile[]; // Support multiple files
}

export interface Contractor {
  id: string;
  type: ContractorType;
  name: string; // Nome ou Razão Social
  responsibleName: string;
  cpf?: string;  // Novo
  rg?: string;   // Novo
  cnpj?: string; // Novo
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
