

import { Band, Event, EventStatus, User, UserRole, Contractor, ContractorType } from '../types';
import { dbFirestore, auth } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from "firebase/auth";

// --- CONFIGURAÇÃO ---
const USE_FIREBASE = true; 

// --- DADOS MOCK (Modo Demo Limpo) ---
const MOCK_BANDS: Band[] = [
  { id: 'b_new_1', name: 'Banda Principal', genre: 'Variado', members: 5 }
];

// Admin padrão solicitado
const SUPER_ADMIN: User = { 
  id: 'u_admin_master', 
  name: 'Super Admin', 
  email: 'admin', // Login simplificado
  password: 'admin', // Senha simplificada
  role: UserRole.ADMIN, 
  bandIds: [] // Admin vê tudo
};

const MOCK_USERS: User[] = [
  SUPER_ADMIN
];

const MOCK_EVENTS: Event[] = [];
const MOCK_CONTRACTORS: Contractor[] = [];

// NOVAS CHAVES DE ARMAZENAMENTO E COLEÇÕES (Versão 4 - Isolamento Total)
const STORAGE_PREFIX = 'agendade_prod_v1_'; 
const FB_COLLECTIONS = {
  BANDS: 'ad_bands',
  USERS: 'ad_users',
  EVENTS: 'ad_events',
  CONTRACTORS: 'ad_contractors'
};

const KEYS = {
  BANDS: `${STORAGE_PREFIX}bands`,
  USERS: `${STORAGE_PREFIX}users`,
  EVENTS: `${STORAGE_PREFIX}events`,
  CONTRACTORS: `${STORAGE_PREFIX}contractors`,
  SESSION: `${STORAGE_PREFIX}session`, // Key for 24h session
  CONTRACT_TEMPLATE: `${STORAGE_PREFIX}contract_template`
};

const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE APRESENTAÇÃO ARTÍSTICA

Pelo presente instrumento, as partes:

CONTRATANTE: {{NOME_CONTRATANTE}}
Responsável: {{NOME_RESPONSAVEL}}
Endereço: {{ENDERECO_CONTRATANTE}}

CONTRATADA: {{NOME_BANDA}}
Agência: D&E MUSIC

Celebram o presente contrato para a apresentação artística no evento "{{NOME_EVENTO}}", a ser realizado em {{DATA_EVENTO_EXTENSO}} às {{HORARIO_EVENTO}}, no local "{{LOCAL_EVENTO}}, {{CIDADE_EVENTO}}".

O valor acordado para a apresentação é de {{VALOR_BRUTO_FORMATADO}}.

[... Inserir mais cláusulas sobre rider técnico, camarim, alimentação, transporte, cancelamento, etc. ...]

E por estarem justos e contratados, assinam o presente em duas vias de igual teor e forma.

_________________________
{{NOME_CONTRATANTE}}

_________________________
D&E MUSIC
`;


// Helper to initialize local data
const initLocalData = () => {
  try {
    if (!localStorage.getItem(KEYS.BANDS)) localStorage.setItem(KEYS.BANDS, JSON.stringify(MOCK_BANDS));
    if (!localStorage.getItem(KEYS.USERS)) localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
    if (!localStorage.getItem(KEYS.EVENTS)) localStorage.setItem(KEYS.EVENTS, JSON.stringify(MOCK_EVENTS));
    if (!localStorage.getItem(KEYS.CONTRACTORS)) localStorage.setItem(KEYS.CONTRACTORS, JSON.stringify(MOCK_CONTRACTORS));
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
    email: (data?.email || 'sem-email@dne.music').toLowerCase(),
    password: data?.password || '',
    // FIX: Property 'MEMBER' does not exist on type 'typeof UserRole'. Changed to VIEWER as a sensible default.
    role: data?.role || UserRole.VIEWER,
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

  // Handle createdAt stability for legacy data
  // If createdAt is missing, assign a very old, stable date (Unix epoch).
  // This ensures legacy data consistently appears at the bottom of "Latest Updates"
  // and does not get incorrectly sorted by its event date.
  let safeCreatedAt = data?.createdAt;
  if (!safeCreatedAt) {
      safeCreatedAt = new Date(0).toISOString(); // '1970-01-01T00:00:00.000Z'
  }

  return {
    id: id,
    bandId: data?.bandId || '',
    name: data?.name || 'Evento Sem Nome',
    eventType: data?.eventType || 'Geral', // Default value
    date: data?.date || new Date().toISOString(),
    time: data?.time || '00:00',
    durationHours: data?.durationHours || 0,
    city: data?.city || '',
    venue: data?.venue || '',
    contractor: data?.contractor || '',
    notes: data?.notes || '',
    status: data?.status || EventStatus.RESERVED,
    financials: safeFinancials,
    // New fields defaults
    createdBy: data?.createdBy || 'Sistema',
    createdAt: safeCreatedAt,
    hasContract: data?.hasContract !== undefined ? data.hasContract : true // Default to true for old events to avoid mass warnings
  } as Event;
};

// Helper for Contractors
const sanitizeContractor = (data: any, id: string): Contractor => {
  return {
    id: id,
    type: data?.type || ContractorType.FISICA,
    name: data?.name || '',
    responsibleName: data?.responsibleName || '',
    phone: data?.phone || '',
    whatsapp: data?.whatsapp || '',
    email: data?.email || '',
    address: {
      street: data?.address?.street || '',
      number: data?.address?.number || '',
      complement: data?.address?.complement || '',
      neighborhood: data?.address?.neighborhood || '',
      zipCode: data?.address?.zipCode || '',
      city: data?.address?.city || '',
      state: data?.address?.state || '',
      country: data?.address?.country || 'Brasil',
    },
    additionalInfo: {
      event: data?.additionalInfo?.event || '',
      venue: data?.additionalInfo?.venue || '',
      notes: data?.additionalInfo?.notes || '',
    }
  };
};

// --- SERVICE IMPLEMENTATION ---

export const db = {
  // --- AUTHENTICATION & SESSION ---
  
  createSession: async (user: User): Promise<void> => {
    // Save session with 24h expiry
    const sessionData = {
      user: user,
      expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(sessionData));
  },

  clearSession: async (): Promise<void> => {
    localStorage.removeItem(KEYS.SESSION);
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const sessionJson = localStorage.getItem(KEYS.SESSION);
      if (!sessionJson) return null;

      const session = JSON.parse(sessionJson);
      
      // Check for expiry
      if (Date.now() > session.expiry) {
        localStorage.removeItem(KEYS.SESSION); // Session expired
        return null;
      }

      return session.user;
    } catch (e) {
      console.error("Error reading session", e);
      return null;
    }
  },

  login: async (loginInput: string, passwordInput: string): Promise<User | null> => {
    // Normalização para minúsculo (Case Insensitive)
    const normalizedLogin = loginInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim(); // Ensure no trailing spaces from copy/paste

    // 1. Check Special Super Admin Hardcoded
    if (normalizedLogin === 'admin' && passwordInput === 'admin') {
      return SUPER_ADMIN;
    }

    // 2. Try Local Mock Data (Simulated Backend)
    const localUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const localMatch = localUsers.find((u: User) => 
      (u.email.toLowerCase() === normalizedLogin || (normalizedLogin === 'admin' && u.email.toLowerCase() === 'admin')) && 
      (u.password === passwordInput || u.password === cleanPassword)
    );
    
    if (localMatch) {
      return sanitizeUser(localMatch, localMatch.id);
    }

    // 3. Try Firebase
    if (USE_FIREBASE && dbFirestore) {
      // 3a. Try Firebase Auth (Main accounts)
      if (auth && normalizedLogin.includes('@')) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, normalizedLogin, passwordInput);
          const snapshot = await getDocs(query(collection(dbFirestore, FB_COLLECTIONS.USERS), where("email", "==", normalizedLogin)));
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return sanitizeUser(doc.data(), doc.id);
          } else {
             return {
               id: userCredential.user.uid,
               name: userCredential.user.displayName || 'Usuário Firebase',
               email: normalizedLogin,
               // FIX: Property 'MEMBER' does not exist on type 'typeof UserRole'. Changed to VIEWER as a sensible default.
               role: UserRole.VIEWER,
               bandIds: []
             };
          }
        } catch (e) {
          // Auth failed, proceed to check manual collection
        }
      }

      // 3b. Try Manual Firestore Collection (For Admin-created users without Firebase Auth)
      try {
        const usersRef = collection(dbFirestore, FB_COLLECTIONS.USERS);
        // Query by email
        const q = query(usersRef, where("email", "==", normalizedLogin));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Find the user with matching password
          // Note: In production, passwords should be hashed. This is a demo/internal tool approach.
          const userDoc = querySnapshot.docs.find(doc => {
            const data = doc.data();
            return data.password === passwordInput || data.password === cleanPassword;
          });

          if (userDoc) {
            return sanitizeUser(userDoc.data(), userDoc.id);
          }
        }
      } catch (e) {
        console.warn("Firestore manual login check failed:", e);
      }
    }

    return null;
  },

  // --- SUGGESTIONS (Auto-Save/Learning) ---
  getUniqueValues: async (field: 'eventType' | 'venue' | 'city' | 'contractor'): Promise<string[]> => {
    // Basic defaults to start with
    const defaults = {
        eventType: ['Casamento', 'Corporativo', 'Formatura', 'Aniversário', 'Show Público', 'Bar/Restaurante', 'Bodas'],
        city: [],
        venue: [],
        contractor: []
    };

    let values = new Set<string>(defaults[field]);
    
    // Get from Events
    const events = await db.getEvents();
    events.forEach(e => {
        if (field === 'eventType' && e.eventType) values.add(e.eventType);
        if (field === 'city' && e.city) values.add(e.city);
        if (field === 'venue' && e.venue) values.add(e.venue);
        if (field === 'contractor' && e.contractor) values.add(e.contractor);
    });
    
    // Get Contractors for specific fields
    if (field === 'contractor' || field === 'city') {
        const contractors = await db.getContractors();
        contractors.forEach(c => {
            if (field === 'contractor') values.add(c.name);
            if (field === 'city' && c.address.city) values.add(c.address.city);
        });
    }

    return Array.from(values).sort();
  },

  // --- CONTRACT TEMPLATE ---
  getContractTemplate: async (): Promise<string> => {
    // For now, using localStorage. Firebase would require a 'settings' collection.
    return localStorage.getItem(KEYS.CONTRACT_TEMPLATE) || DEFAULT_CONTRACT_TEMPLATE;
  },

  saveContractTemplate: async (template: string): Promise<void> => {
    localStorage.setItem(KEYS.CONTRACT_TEMPLATE, template);
    // In a full implementation, you'd save this to a specific document in Firebase,
    // e.g., db.collection('settings').doc('contract').set({ template });
  },

  // --- BANDS ---
  getBands: async (): Promise<Band[]> => {
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, FB_COLLECTIONS.BANDS));
        if (snapshot.empty) {
           const local = JSON.parse(localStorage.getItem(KEYS.BANDS) || '[]');
           return local.length > 0 ? local : MOCK_BANDS;
        }
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
        const bandId = band.id || crypto.randomUUID();
        await setDoc(doc(dbFirestore, FB_COLLECTIONS.BANDS, bandId), { ...band, id: bandId });
      } catch (e) {
         console.error(e);
      }
    }
  },
  
  // --- USERS ---
  
  saveUser: async (user: User): Promise<void> => {
    // Ensure email is always lowercase when saving
    const normalizedUser = {
      ...user,
      email: user.email.trim().toLowerCase(),
      // Optional: trim password here too if you want strict saving
      password: user.password?.trim() || ''
    };

    // Local save
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const index = users.findIndex((u: User) => u.id === normalizedUser.id);
    if (index >= 0) users[index] = normalizedUser;
    else users.push(normalizedUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    if (USE_FIREBASE && dbFirestore) {
      try {
        const userId = normalizedUser.id || crypto.randomUUID();
        // IMPORTANT: We save the password here so the 'manual login' check works for sub-users
        // created by the admin who don't have Firebase Auth accounts.
        await setDoc(doc(dbFirestore, FB_COLLECTIONS.USERS, userId), { ...normalizedUser, id: userId }, { merge: true });
      } catch (e) {
        console.error("Firebase User Save Error", e);
      }
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const newUsers = users.filter((u: User) => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(newUsers));

    if (USE_FIREBASE && dbFirestore) {
      try {
        await deleteDoc(doc(dbFirestore, FB_COLLECTIONS.USERS, userId));
      } catch (e) {
        console.error(e);
      }
    }
  },
  
  getUsers: async (): Promise<User[]> => {
    let rawUsers: any[] = [];
    if (USE_FIREBASE && dbFirestore) {
       try {
          const snapshot = await getDocs(collection(dbFirestore, FB_COLLECTIONS.USERS));
          if (!snapshot.empty) {
             rawUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
       } catch (e) {
         console.warn("Firebase User Read failed", e);
         rawUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(MOCK_USERS));
       }
    } else {
       rawUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(MOCK_USERS));
    }
    
    // Ensure Super Admin is always in the list locally for login purposes
    if (!rawUsers.find(u => u.email === 'admin')) {
      rawUsers.unshift(SUPER_ADMIN);
    }
    
    return rawUsers.map((u: any) => sanitizeUser(u, u.id));
  },
  
  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
    let rawEvents: any[] = [];

    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, FB_COLLECTIONS.EVENTS));
        if (!snapshot.empty) {
           rawEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
           rawEvents = []; 
        }
      } catch (e) {
        console.warn("Firebase Read Error (Events) - Using Local:", e);
        rawEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]');
      }
    } else {
      rawEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]');
    }

    return rawEvents.map(e => sanitizeEvent(e, e.id));
  },
  
  saveEvent: async (event: Event): Promise<void> => {
    // Local save
    const localEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]');
    const index = localEvents.findIndex((e: Event) => e.id === event.id);
    if (index >= 0) localEvents[index] = event;
    else localEvents.push(event);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(localEvents));

    // Firebase save
    if (USE_FIREBASE && dbFirestore) {
      try {
        const eventId = event.id || crypto.randomUUID();
        await setDoc(doc(dbFirestore, FB_COLLECTIONS.EVENTS, eventId), { ...event, id: eventId }, { merge: true });
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
        await deleteDoc(doc(dbFirestore, FB_COLLECTIONS.EVENTS, eventId));
      } catch (e) {
         console.warn("Firebase delete failed:", e);
      }
    } 
  },

  // --- CONTRACTORS ---
  getContractors: async (): Promise<Contractor[]> => {
    let rawContractors: any[] = [];
    if (USE_FIREBASE && dbFirestore) {
      try {
        const snapshot = await getDocs(collection(dbFirestore, FB_COLLECTIONS.CONTRACTORS));
        if (!snapshot.empty) {
          rawContractors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("Firebase Read Error (Contractors):", e);
        rawContractors = JSON.parse(localStorage.getItem(KEYS.CONTRACTORS) || '[]');
      }
    } else {
      rawContractors = JSON.parse(localStorage.getItem(KEYS.CONTRACTORS) || '[]');
    }
    return rawContractors.map(c => sanitizeContractor(c, c.id));
  },

  saveContractor: async (contractor: Contractor): Promise<void> => {
    // Local save
    const local = JSON.parse(localStorage.getItem(KEYS.CONTRACTORS) || '[]');
    const index = local.findIndex((c: Contractor) => c.id === contractor.id);
    if (index >= 0) local[index] = contractor;
    else local.push(contractor);
    localStorage.setItem(KEYS.CONTRACTORS, JSON.stringify(local));

    if (USE_FIREBASE && dbFirestore) {
      try {
        const id = contractor.id || crypto.randomUUID();
        await setDoc(doc(dbFirestore, FB_COLLECTIONS.CONTRACTORS, id), { ...contractor, id: id }, { merge: true });
      } catch (e) {
        console.error("Firebase Save Error:", e);
      }
    }
  },

  deleteContractor: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(KEYS.CONTRACTORS) || '[]');
    const newLocal = local.filter((c: Contractor) => c.id !== id);
    localStorage.setItem(KEYS.CONTRACTORS, JSON.stringify(newLocal));

    if (USE_FIREBASE && dbFirestore) {
      try {
        await deleteDoc(doc(dbFirestore, FB_COLLECTIONS.CONTRACTORS, id));
      } catch (e) {
        console.warn("Firebase delete failed:", e);
      }
    }
  }
};
