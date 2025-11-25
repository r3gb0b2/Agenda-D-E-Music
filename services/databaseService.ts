import { Band, Event, EventStatus, User, UserRole } from '../types';

// Mock Data Seeding
const MOCK_BANDS: Band[] = [
  { id: 'b1', name: 'The Nightwalkers', genre: 'Rock', members: 4 },
  { id: 'b2', name: 'Jazz & Soul Collective', genre: 'Jazz', members: 3 },
  { id: 'b3', name: 'Neon Pulse', genre: 'Electronic/Pop', members: 2 }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Principal', email: 'admin@system.com', role: UserRole.ADMIN, bandIds: ['b1', 'b2', 'b3'] },
  { id: 'u2', name: 'Manager John', email: 'john@band.com', role: UserRole.MANAGER, bandIds: ['b1'] },
];

const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    bandId: 'b1',
    name: 'Festival de Verão',
    date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    time: '20:00',
    durationHours: 2,
    city: 'São Paulo, SP',
    venue: 'Arena XP',
    contractor: 'Eventos Global Ltda',
    notes: 'Soundcheck às 16h. Palco Principal.',
    status: EventStatus.CONFIRMED,
    financials: {
      grossValue: 15000,
      commissionType: 'PERCENTAGE',
      commissionValue: 20,
      taxes: 1500,
      netValue: 10500,
      currency: 'BRL'
    }
  },
  {
    id: 'e2',
    bandId: 'b2',
    name: 'Casamento Julia & Marcos',
    date: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString(),
    time: '18:00',
    durationHours: 4,
    city: 'Campinas, SP',
    venue: 'Fazenda Santa Margarida',
    contractor: 'Julia Silva',
    notes: 'Traje passeio completo.',
    status: EventStatus.RESERVED,
    financials: {
      grossValue: 8000,
      commissionType: 'FIXED',
      commissionValue: 1000,
      taxes: 0,
      netValue: 7000,
      currency: 'BRL'
    }
  }
];

// Local Storage Keys
const KEYS = {
  BANDS: 'bmp_bands',
  USERS: 'bmp_users',
  EVENTS: 'bmp_events'
};

// Helper to initialize data
const initData = () => {
  if (!localStorage.getItem(KEYS.BANDS)) localStorage.setItem(KEYS.BANDS, JSON.stringify(MOCK_BANDS));
  if (!localStorage.getItem(KEYS.USERS)) localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
  if (!localStorage.getItem(KEYS.EVENTS)) localStorage.setItem(KEYS.EVENTS, JSON.stringify(MOCK_EVENTS));
};

initData();

// Service Methods
export const db = {
  getBands: (): Band[] => JSON.parse(localStorage.getItem(KEYS.BANDS) || '[]'),
  
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  
  getEvents: (): Event[] => JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]'),
  
  saveEvent: (event: Event): void => {
    const events = db.getEvents();
    const index = events.findIndex(e => e.id === event.id);
    if (index >= 0) {
      events[index] = event;
    } else {
      events.push(event);
    }
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  deleteEvent: (eventId: string): void => {
    const events = db.getEvents().filter(e => e.id !== eventId);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  saveBand: (band: Band): void => {
    const bands = db.getBands();
    const index = bands.findIndex(b => b.id === band.id);
    if (index >= 0) {
      bands[index] = band;
    } else {
      bands.push(band);
    }
    localStorage.setItem(KEYS.BANDS, JSON.stringify(bands));
  },

  // Simulate "Firebase" Auth
  getCurrentUser: (): User => MOCK_USERS[0], 
};
