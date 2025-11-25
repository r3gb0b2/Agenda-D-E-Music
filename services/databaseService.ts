import { Band, Event, EventStatus, User, UserRole } from '../types';
import { dbFirestore } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// --- CONFIGURAÇÃO ---
const USE_FIREBASE = true; 

// --- DADOS MOCK (Modo Demo Limpo) ---
const MOCK_BANDS: Band[] = [
  { id: 'b1', name: 'Banda Principal D&E', genre: 'Variado', members: 5 }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin D&E', email: 'admin@demusic.com', role: UserRole.ADMIN, bandIds: ['b1'] },
];

const MOCK_EVENTS: Event[] = [
  {
    id: 'e_demo_1',
    bandId: 'b1',
    name: 'Exemplo: Show Corporativo',
    date: new Date().toISOString(),
    time: '20:00',
    durationHours: 2,
    city: 'São Paulo, SP',
    venue: 'Espaço de Eventos',
    contractor: 'Empresa X',
    notes: 'Evento de exemplo do sistema novo.',
    status: EventStatus.RESERVED,
    financials: {
      grossValue: 5000,
      commissionType: 'PERCENTAGE',
      commissionValue: 10,
      taxes: 0,
      netValue: 4500,
      currency: 'BRL'
    }
  }
];

// NOVAS CHAVES DE LOCAL STORAGE (Para isolar o banco de dados antigo)
const KEYS = {
  BANDS: 'demusic_v2_bands',
  USERS: 'demusic_v2_users',
  EVENTS: 'demusic_v2_events'
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
    name: data?.name || 'Usuário',
    email: data?.email || 'sem-email@dne.music',
    role: data?.role || UserRole.MEMBER,
    bandIds: data?.bandIds || []
  };
};

// CRITICAL: Helper to ensure Event object never crashes the UI
const sanitizeEvent = (data: any, id: string): Event => {
  // Default financials if missing
  const defaultFinancials = {
    grossValue: 0,
    commissionType: 'PERCENTAGE',
    commissionValue: 0,
    taxes: 0,
    netValue: 0,
    currency: 'BRL'
  };

  const safeFinancials = {
    ...defaultFinancials,
    ...(data?.financials || {})
  };

  // Ensure netValue is a number
  if (typeof safeFinancials.netValue !== 'number') {
     safeFinancials.netValue = 0;
  }

  return {
    id: id,
    bandId: data?.bandId || '',
    name: data?.name || 'Evento Sem Nome',
    date: data?.date || new Date().toISOString(),
    time: data?.time || '00:00',
    durationHours: data?.durationHours || 0,
    city: data?.city || '',
    venue: data?.venue || '',
    contractor: data?.contractor || '',
    notes: data?.notes || '',
    status: data?.status || EventStatus.RESERVED,
    financials: safeFinancials
  } as Event;
};

// --- SERVICE IMPLEMENTATION ---

export const db = {
  // --- BANDS ---
  getBands: async (): Promise<Band[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'bands'));
        if (snapshot.empty) return JSON.parse(localStorage.getItem(KEYS.BANDS) || JSON.stringify(MOCK_BANDS)); 
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
    let rawEvents: any[] = [];

    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, 'events'));
        if (!snapshot.empty) {
           rawEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
           rawEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
        }
      } catch (e) {
        console.warn("Firebase Read Error (Events) - Using Local:", e);
        rawEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
      }
    } else {
      rawEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || JSON.stringify(MOCK_EVENTS));
    }

    // Sanitize ALL events to prevent UI crashes
    return rawEvents.map(e => sanitizeEvent(e, e.id));
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
        if (event.id && event.id.length > 5) { 
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