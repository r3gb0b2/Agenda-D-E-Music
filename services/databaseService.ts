import { Band, Event, EventStatus, User, UserRole, Contractor, ContractorType, ContractFile, PipelineStage } from '../types';
import { dbFirestore, auth } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from "firebase/auth";

// --- CONFIGURAÇÃO ---
const USE_FIREBASE = true; 

// --- DADOS MOCK (Modo Demo Limpo) ---
const MOCK_BANDS: Band[] = [
  { 
    id: 'b_new_1', 
    name: 'Banda Principal', 
    legalDetails: {
      razSocial: '', cnpj: '', address: '', repLegal: '', cpfRep: '', rgRep: '', email: '', phone: ''
    },
    bankDetails: {
      bank: '', agency: '', account: '', favored: '', pix: '', cnpj: ''
    }
  }
];

// Admin padrão solicitado
const SUPER_ADMIN: User = { 
  id: 'u_admin_master', 
  name: 'Super Admin', 
  email: 'admin', // Login simplificado
  password: 'admin', // Senha simplificada
  role: UserRole.ADMIN, 
  bandIds: [], // Admin vê tudo
  status: 'ACTIVE'
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
  FORM_TOKENS: `${STORAGE_PREFIX}form_tokens`, // Key for public form links
  PROSPECTING_TOKENS: `${STORAGE_PREFIX}prospecting_tokens`, // Key for generic prospecting links
};

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
    role: data?.role || UserRole.MEMBER,
    bandIds: data?.bandIds || [],
    status: data?.status || 'ACTIVE' // Default to active for backward compatibility
  };
};

// CRITICAL: Helper to ensure Event object never crashes the UI
const sanitizeEvent = (data: any, id: string): Event => {
  // Default financials if missing
  const defaultFinancials = {
    grossValue: 0,
    commissionType: 'FIXED', // Changed default to FIXED
    commissionValue: 0,      // Changed default to 0
    taxes: 0,
    netValue: 0,
    currency: 'BRL',
    notes: '' // New field default
  };

  const safeFinancials = {
    ...defaultFinancials,
    ...(data?.financials || {})
  };
  
  // Ensure notes is defined
  if (safeFinancials.notes === undefined) safeFinancials.notes = '';

  // Ensure netValue is a number
  if (typeof safeFinancials.netValue !== 'number') {
     safeFinancials.netValue = 0;
  }

  // Handle createdAt stability for legacy data
  let safeCreatedAt = data?.createdAt;
  if (!safeCreatedAt) {
      safeCreatedAt = new Date(0).toISOString(); // '1970-01-01T00:00:00.000Z'
  }
  
  // Handle Contract Files Migration
  let safeContractFiles: ContractFile[] = data?.contractFiles || [];
  
  // Backward compatibility: If we have a single URL but empty array, migrate it
  if (safeContractFiles.length === 0 && data?.contractUrl) {
    safeContractFiles.push({
      name: data.contractUrl,
      url: data.contractUrl,
      uploadedAt: safeCreatedAt
    });
  }

  // CRM Pipeline Default
  let safePipelineStage = data?.pipelineStage;
  if (!safePipelineStage) {
      // Infer based on status if legacy
      if (data?.status === EventStatus.CONFIRMED) safePipelineStage = PipelineStage.WON;
      else if (data?.status === EventStatus.CANCELED) safePipelineStage = PipelineStage.LOST;
      else safePipelineStage = PipelineStage.LEAD;
  }

  // Logistics Defaults
  const defaultLogistics = {
      transport: '',
      departureTime: '',
      returnTime: '',
      hotel: '',
      flights: '',
      crew: '',
      rider: '',
      notes: ''
  };
  const safeLogistics = { ...defaultLogistics, ...(data?.logistics || {}) };

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
    venueAddress: data?.venueAddress || '',
    producerContact: data?.producerContact || '',
    contractor: data?.contractor || '',
    notes: data?.notes || '',
    status: data?.status || EventStatus.RESERVED,
    financials: safeFinancials,
    // New fields defaults
    createdBy: data?.createdBy || 'Sistema',
    createdAt: safeCreatedAt,
    hasContract: data?.hasContract !== undefined ? data.hasContract : true,
    contractUrl: data?.contractUrl || '',
    contractFiles: safeContractFiles,
    pipelineStage: safePipelineStage,
    logistics: safeLogistics,
    contractorFormToken: data?.contractorFormToken || '',
    contractorFormStatus: data?.contractorFormStatus || 'PENDING'
  } as Event;
};

// Helper for Contractors
const sanitizeContractor = (data: any, id: string): Contractor => {
  return {
    id: id,
    type: data?.type || ContractorType.FISICA,
    name: data?.name || '',
    responsibleName: data?.responsibleName || '',
    repLegalAddress: data?.repLegalAddress || '',
    repLegalPhone: data?.repLegalPhone || '',
    birthDate: data?.birthDate || '',
    cpf: data?.cpf || '',
    rg: data?.rg || '',
    cnpj: data?.cnpj || '',
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
    const normalizedLogin = loginInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    const allUsers = await db.getUsers();
    
    // Find user by email and check password (case-insensitive) and status
    const user = allUsers.find(u => 
      u.email.toLowerCase() === normalizedLogin && 
      u.password?.toLowerCase() === cleanPassword.toLowerCase()
    );

    // Only allow login if user exists and is ACTIVE
    if (user && user.status === 'ACTIVE') {
      return sanitizeUser(user, user.id);
    }

    return null;
  },

  // --- REGISTRATION WORKFLOW ---

  registerUser: async (userData: Pick<User, 'name' | 'email' | 'password'>): Promise<User> => {
    const newUser: User = {
        id: crypto.randomUUID(),
        name: userData.name,
        email: userData.email.trim().toLowerCase(),
        password: userData.password?.trim() || '',
        role: UserRole.MEMBER, // Default role
        bandIds: [],
        status: 'PENDING' // Start as pending approval
    };
    await db.saveUser(newUser); // This will save to local and potentially Firebase
    return newUser;
  },

  // --- SUGGESTIONS (Auto-Save/Learning) ---
  getUniqueValues: async (field: 'eventType' | 'venue' | 'city' | 'contractor'): Promise<string[]> => {
    // Basic defaults
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
    
    if (field === 'contractor' || field === 'city') {
        const contractors = await db.getContractors();
        contractors.forEach(c => {
            if (field === 'contractor') values.add(c.name);
            if (field === 'city' && c.address.city) values.add(c.address.city);
        });
    }

    return Array.from(values).sort();
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

  deleteBand: async (bandId: string): Promise<void> => {
    const bands = JSON.parse(localStorage.getItem(KEYS.BANDS) || '[]');
    const newBands = bands.filter((b: Band) => b.id !== bandId);
    localStorage.setItem(KEYS.BANDS, JSON.stringify(newBands));

    if (USE_FIREBASE && dbFirestore) {
      try {
        await deleteDoc(doc(dbFirestore, FB_COLLECTIONS.BANDS, bandId));
      } catch (e) {
        console.error("Firebase Band Delete Error", e);
      }
    }
  },
  
  // --- USERS ---
  
  saveUser: async (user: User): Promise<void> => {
    const normalizedUser = {
      ...user,
      email: user.email.trim().toLowerCase(),
      password: user.password?.trim() || ''
    };

    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const index = users.findIndex((u: User) => u.id === normalizedUser.id);
    if (index >= 0) users[index] = normalizedUser;
    else users.push(normalizedUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    if (USE_FIREBASE && dbFirestore) {
      try {
        const userId = normalizedUser.id || crypto.randomUUID();
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
    
    // Ensure Super Admin is always in the list locally
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
    const localEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS) || '[]');
    const index = localEvents.findIndex((e: Event) => e.id === event.id);
    if (index >= 0) localEvents[index] = event;
    else localEvents.push(event);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(localEvents));

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
  },
  
  // --- PUBLIC FORM TOKEN MGMT (Legacy for event editing) ---
  generateContractorFormToken: async (eventId: string): Promise<string> => {
    const token = `form_${crypto.randomUUID()}`;
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.FORM_TOKENS) || '{}');
    tokenMap[token] = eventId;
    localStorage.setItem(KEYS.FORM_TOKENS, JSON.stringify(tokenMap));
    return token;
  },

  getEventByContractorFormToken: async (token: string): Promise<{ event: Event, contractor: Contractor | null, band: Band | null } | null> => {
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.FORM_TOKENS) || '{}');
    const eventId = tokenMap[token];
    if (!eventId) return null;

    const events = await db.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return null;
    
    const contractors = await db.getContractors();
    const contractor = contractors.find(c => c.name.toLowerCase() === event.contractor.toLowerCase());
    
    const bands = await db.getBands();
    const band = bands.find(b => b.id === event.bandId);

    return { event, contractor, band };
  },

  invalidateContractorFormToken: async (token: string): Promise<void> => {
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.FORM_TOKENS) || '{}');
    delete tokenMap[token];
    localStorage.setItem(KEYS.FORM_TOKENS, JSON.stringify(tokenMap));
  },
  
  // --- PUBLIC PROSPECTING FLOW ---
  generateProspectingToken: async (): Promise<string> => {
    const token = `prospect_${crypto.randomUUID()}`;
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.PROSPECTING_TOKENS) || '{}');
    tokenMap[token] = { valid: true, createdAt: Date.now() }; // Store with validity
    localStorage.setItem(KEYS.PROSPECTING_TOKENS, JSON.stringify(tokenMap));
    return token;
  },

  validateProspectingToken: async (token: string): Promise<boolean> => {
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.PROSPECTING_TOKENS) || '{}');
    return tokenMap[token] && tokenMap[token].valid;
  },
  
  invalidateProspectingToken: async (token: string): Promise<void> => {
    const tokenMap = JSON.parse(localStorage.getItem(KEYS.PROSPECTING_TOKENS) || '{}');
    if (tokenMap[token]) {
      delete tokenMap[token];
    }
    localStorage.setItem(KEYS.PROSPECTING_TOKENS, JSON.stringify(tokenMap));
  },

  createProspectAndEvent: async (prospectData: { contractor: Omit<Contractor, 'id'>, event: Partial<Event> }): Promise<void> => {
    // 1. Create the new contractor
    const newContractor: Contractor = {
      ...prospectData.contractor,
      id: crypto.randomUUID(),
    };
    await db.saveContractor(newContractor);

    // 2. Create the new event and link it
    const newEvent: Event = {
      id: crypto.randomUUID(),
      bandId: prospectData.event.bandId || '',
      name: prospectData.event.name || `Evento - ${newContractor.name}`,
      eventType: prospectData.event.eventType || 'A definir',
      date: prospectData.event.date || new Date().toISOString(),
      time: prospectData.event.time || '21:00',
      durationHours: 2,
      city: prospectData.event.city || newContractor.address.city || '',
      venue: prospectData.event.venue || '',
      venueAddress: '',
      producerContact: '',
      contractor: newContractor.name, // Link to the new contractor
      notes: 'Evento criado via formulário público de prospecção.',
      status: EventStatus.RESERVED,
      financials: {
        grossValue: 0, commissionType: 'FIXED', commissionValue: 0, taxes: 0, netValue: 0, currency: 'BRL', notes: ''
      },
      createdBy: 'Formulário Público',
      createdAt: new Date().toISOString(),
      hasContract: false,
      contractFiles: [],
      pipelineStage: PipelineStage.LEAD, // Add to the start of the pipeline
      logistics: { transport: '', departureTime: '', returnTime: '', hotel: '', flights: '', crew: '', rider: '', notes: '' },
      contractorFormStatus: 'COMPLETED', // The form was just completed
    };
    await db.saveEvent(newEvent);
  },
};
