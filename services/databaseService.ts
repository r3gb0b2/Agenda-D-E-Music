import { Band, Event, EventStatus, User, UserRole } from '../types';
import { dbFirestore } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// --- CONFIGURAÇÃO ---
// Mude para true para usar o Firebase real.
// Certifique-se de ter configurado as chaves em firebaseConfig.ts primeiro.
const USE_FIREBASE = false; 

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

if (!USE_FIREBASE) {
  initLocalData();
}

// --- SERVICE IMPLEMENTATION ---

export const db = {
  // --- BANDS ---
  getBands: async (): Promise<Band[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'bands'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Band));
      } catch (e) {
        console.error("Firebase Error:", e);
        return [];
      }
    } else {
      // Local Fallback
      return JSON.parse(localStorage.getItem(KEYS.BANDS) || JSON.stringify(MOCK_BANDS));
    }
  },

  saveBand: async (band: Band): Promise<void> => {
    if (USE_FIREBASE && dbFirestore) {
      // Logic for Firebase save/update
      // Note: Simplified for demo
    } else {
      const bands = await db.getBands();
      const index = bands.findIndex(b => b.id === band.id);
      if (index >= 0) bands[index] = band;
      else bands.push(band);
      localStorage.setItem(KEYS.BANDS, JSON.stringify(bands));
    }
  },
  
  // --- USERS ---
  getCurrentUser: async (): Promise<User | null> => {
    // In a real Firebase app, you would use onAuthStateChanged from firebase/auth
    // For this demo structure, we return the Mock Admin
    if (USE_FIREBASE && dbFirestore) {
       // Placeholder for real auth fetch
       return MOCK_USERS[0];
    } else {
       try {
         const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
         return users.length > 0 ? users[0] : MOCK_USERS[0];
       } catch {
         return MOCK_USERS[0];
       }
    }
  },
  
  getUsers: async (): Promise<User[]> => {
    if (USE_FIREBASE && dbFirestore) {
       const snapshot = await getDocs(collection(dbFirestore, 'users'));
       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    }
    return JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(MOCK_USERS));
  },
  
  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'events'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      } catch (e) {
        console.error("Firebase Error:", e);
        return [];
      }
    } else {
      return JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
    }
  },
  
  saveEvent: async (event: Event): Promise<void> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        if (event.id && event.id.length > 10) { 
           // Assuming existing ID. In real app check if doc exists or use setDoc
           // For simplicity in this hybrid setup:
           // await updateDoc(doc(dbFirestore, 'events', event.id), event as any);
        }
        // await addDoc(collection(dbFirestore, 'events'), event);
        console.log("Firebase Save triggered (Check implementation details in databaseService.ts)");
      } catch (e) {
        console.error("Firebase Save Error:", e);
      }
    } else {
      const events = await db.getEvents();
      const index = events.findIndex(e => e.id === event.id);
      if (index >= 0) {
        events[index] = event;
      } else {
        events.push(event);
      }
      localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
    }
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        await deleteDoc(doc(dbFirestore, 'events', eventId));
      } catch (e) {
         console.error(e);
      }
    } else {
      const events = await db.getEvents();
      const newEvents = events.filter(e => e.id !== eventId);
      localStorage.setItem(KEYS.EVENTS, JSON.stringify(newEvents));
    }
  }
};
