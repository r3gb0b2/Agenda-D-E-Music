import { Band, Event, EventStatus, User, UserRole } from '../types';
import { dbFirestore } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// --- CONFIGURAÇÃO ---
const USE_FIREBASE = true; 

// --- DADOS MOCK (Modo Demo) ---
const MOCK_BANDS: Band[] = [
  { id: 'b1', name: 'The Nightwalkers', genre: 'Rock', members: 4 },
  { id: 'b2', name: 'Jazz & Soul Collective', genre: 'Jazz', members: 3 },
  { id: 'b3', name: 'Neon Pulse', genre: 'Electronic/Pop', members: 2 }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Principal', email: 'admin@dne.music', role: UserRole.ADMIN, bandIds: ['b1', 'b2', 'b3'] },
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

// Helper to initialize local data
const initLocalData = () => {
  try {
    if (!localStorage.getItem(KEYS.BANDS)) localStorage.setItem(KEYS.BANDS, JSON.stringify(MOCK_BANDS));
    if (!localStorage.getItem(KEYS.USERS)) localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
    if (!localStorage.getItem(KEYS.EVENTS)) localStorage.setItem(KEYS.EVENTS, JSON.stringify(MOCK_EVENTS));
  } catch (e) {
    console.warn("LocalStorage access failed", e);
  }
};

// Initialize local data as backup
initLocalData();

// Helper to ensure User object has valid fields
const sanitizeUser = (data: any, id: string): User => {
  return {
    id: id,
    name: data.name || 'Usuário',
    email: data.email || 'sem-email@dne.music',
    role: data.role || UserRole.MEMBER,
    bandIds: data.bandIds || []
  };
};

// --- SERVICE IMPLEMENTATION ---

export const db = {
  // --- BANDS ---
  getBands: async (): Promise<Band[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'bands'));
        if (snapshot.empty) return MOCK_BANDS; 
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Band));
      } catch (e) {
        console.warn("Firebase Read Error (Bands):", e);
        return JSON.parse(localStorage.getItem(KEYS.BANDS) || JSON.stringify(MOCK_BANDS));
      }
    } else {
      return JSON.parse(localStorage.getItem(KEYS.BANDS) || JSON.stringify(MOCK_BANDS));
    }
  },

  saveBand: async (band: Band): Promise<void> => {
    // Local update
    const bands = JSON.parse(localStorage.getItem(KEYS.BANDS) || '[]');
    const index = bands.findIndex((b: Band) => b.id === band.id);
    if (index >= 0) bands[index] = band;
    else bands.push(band);
    localStorage.setItem(KEYS.BANDS, JSON.stringify(bands));

    if (USE_FIREBASE && dbFirestore) {
      try {
         // Placeholder for Firebase save
      } catch (e) {
         console.error(e);
      }
    }
  },
  
  // --- USERS ---
  getCurrentUser: async (): Promise<User | null> => {
    if (USE_FIREBASE && dbFirestore) {
       try {
          // Attempt to get users from remote, if none, use fallback mock user
          const snapshot = await getDocs(collection(dbFirestore, 'users'));
          if (!snapshot.empty) {
             const doc = snapshot.docs[0];
             return sanitizeUser(doc.data(), doc.id);
          }
       } catch (e) {
         console.warn("Firebase Auth check failed, using local user.", e);
       }
    }
    
    // Fallback to local
    try {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
      const user = users.length > 0 ? users[0] : MOCK_USERS[0];
      return sanitizeUser(user, user.id);
    } catch {
      return sanitizeUser(MOCK_USERS[0], MOCK_USERS[0].id);
    }
  },
  
  getUsers: async (): Promise<User[]> => {
    const localUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(MOCK_USERS));
    return localUsers.map((u: any) => sanitizeUser(u, u.id));
  },
  
  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'events'));
        if (snapshot.empty) return JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      } catch (e) {
        console.warn("Firebase Read Error (Events) - Using Local:", e);
        return JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
      }
    } else {
      return JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
    }
  },
  
  saveEvent: async (event: Event): Promise<void> => {
    // Local save
    const localEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
    const index = localEvents.findIndex((e: Event) => e.id === event.id);
    if (index >= 0) localEvents[index] = event;
    else localEvents.push(event);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(localEvents));

    // Firebase save
    if (USE_FIREBASE && dbFirestore) {
      try {
        if (event.id && event.id.length > 5) { // Simple check if it looks like a real ID
           // In a real app we'd use setDoc or addDoc
        }
      } catch (e) {
        console.error("Firebase Save Error:", e);
      }
    }
  },

  deleteEvent: async (eventId: string): Promise<void> => {
     const events = JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]');
     const newEvents = events.filter((e: Event) => e.id !== eventId);
     localStorage.setItem(KEYS.EVENTS, JSON.stringify(newEvents));

    if (USE_FIREBASE && dbFirestore) {
      try {
        await deleteDoc(doc(dbFirestore, 'events', eventId));
      } catch (e) {
         console.warn("Firebase delete failed:", e);
      }
    } 
  }
};