import React, { useState, useEffect, ReactNode, Component, ErrorInfo } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm'; // Imported
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  MoreVertical, 
  Trash2,
  Users,
  Music,
  Loader2,
  LogIn,
  AlertTriangle,
  RefreshCcw,
  CalendarDays,
  Mic2,
  Phone,
  Briefcase,
  Edit2,
  ChevronRight,
  FilterX,
  ChevronLeft,
  List,
  Calendar as CalendarIcon,
  User as UserIcon
} from 'lucide-react';

// --- Helper Components ---

const StatusBadge = ({ status }: { status: EventStatus }) => {
  const styles = {
    [EventStatus.CONFIRMED]: 'bg-green-500/10 text-green-400 border-green-500/20',
    [EventStatus.RESERVED]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    [EventStatus.CANCELED]: 'bg-red-500/10 text-red-400 border-red-500/20',
    [EventStatus.COMPLETED]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-slate-400 mb-6 max-w-md">Ocorreu um erro crítico na aplicação.</p>
          <pre className="bg-slate-900 p-2 rounded text-xs text-red-300 mb-6 max-w-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCcw size={18} /> Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Component ---

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Data State
  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isContractorFormOpen, setIsContractorFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false); // New state for User Form
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null); // New state for editing user
  
  const [filterText, setFilterText] = useState('');
  const [selectedBandFilter, setSelectedBandFilter] = useState<string | null>(null); // Filtro específico de banda

  // Agenda / Calendar specific state
  const [newEventDate, setNewEventDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initial Load & Session Check
  useEffect(() => {
    const initApp = async () => {
      // Force remove HTML loader after React mounts
      const preloader = document.getElementById('initial-loader');
      if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.remove(), 500);
      }

      // Check for saved session
      const savedUser = await db.getCurrentUser();
      if (savedUser) {
        setCurrentUser(savedUser);
      }

      // Stop general loading spinner
      setIsLoading(false);
    };

    initApp();
  }, []);

  const refreshData = async () => {
    // Only load data if logged in
    if (currentUser) {
      setEvents(await db.getEvents());
      setBands(await db.getBands());
      setUsers(await db.getUsers());
      setContractors(await db.getContractors());
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // --- Handlers: Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      const user = await db.login(loginEmail, loginPassword);
      if (user) {
        await db.createSession(user); // Persist login for 24h
        setCurrentUser(user);
        setCurrentView('dashboard');
      } else {
        setLoginError('Credenciais inválidas. Tente "admin" / "admin"');
      }
    } catch (err) {
      setLoginError('Erro ao conectar ao sistema.');
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await db.clearSession(); // Clear persisted session
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setEvents([]);
    setCurrentView('dashboard');
  }

  // --- Handlers: Events ---
  const handleSaveEvent = async (event: Event) => {
    await db.saveEvent(event);
    refreshData();
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      await db.deleteEvent(id);
      refreshData();
    }
  };

  const openEditEvent = (event: Event) => {
    setEditingEvent(event);
    setNewEventDate('');
    setIsFormOpen(true);
  };

  // --- Handlers: Contractors ---
  const handleSaveContractor = async (contractor: Contractor) => {
    await db.saveContractor(contractor);
    refreshData();
    setIsContractorFormOpen(false);
    setEditingContractor(null);
  }

  const handleDeleteContractor = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contratante?')) {
      await db.deleteContractor(id);
      refreshData();
    }
  }

  const openEditContractor = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setIsContractorFormOpen(true);
  }

  // --- Handlers: Bands/Users ---
  const handleAddBand = async () => {
    const name = window.prompt("Nome da nova banda:");
    if (name) {
      const newBand: Band = {
        id: crypto.randomUUID(),
        name: name,
        genre: 'Geral',
        members: 1
      };
      await db.saveBand(newBand);
      refreshData();
    }
  };

  const handleSaveUser = async (user: User) => {
    await db.saveUser(user);
    refreshData();
    setIsUserFormOpen(false);
    setEditingUser(null);
  }
  
  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      await db.deleteUser(id);
      refreshData();
    }
  }

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  }

  // Navegação Especial: Banda -> Agenda Filtrada
  const handleBandClick = (bandId: string) => {
    setSelectedBandFilter(bandId);
    setCurrentView('agenda');
  };

  // --- Filter Logic based on User Role ---
  const getVisibleBands = () => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return bands;
    return bands.filter(b => currentUser.bandIds.includes(b.id));
  };

  const getVisibleEvents = () => {
    const visibleBands = getVisibleBands();
    const visibleBandIds = visibleBands.map(b => b.id);
    return events.filter(e => visibleBandIds.includes(e.bandId));
  };

  // --- Views ---

  const DashboardView = () => {
    const visibleEvents = getVisibleEvents();
    const visibleBands = getVisibleBands();
    
    const confirmedCount = visibleEvents.filter(e => e.status === EventStatus.CONFIRMED).length;
    const reservedCount = visibleEvents.filter(e => e.status === EventStatus.RESERVED).length;

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Bandas Section - Lista Simples */}
        <div>
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Music className="text-primary-500" /> Minhas Bandas
             </h2>
             {currentUser?.role === UserRole.ADMIN && (
               <button onClick={handleAddBand} className="text-sm text-primary-400 hover:text-white flex items-center gap-1">
                 <Plus size={14} /> Nova Banda
               </button>
             )}
           </div>
           
           <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
             <div className="divide-y divide-slate-800">
               {visibleBands.map(band => (
                 <div 
                   key={band.id} 
                   onClick={() => handleBandClick(band.id)}
                   className="flex items-center justify-between p-4 hover:bg-slate-900 transition-colors cursor-pointer group"
                 >
                   <div className="flex items-center gap-3">
                     <span className="font-medium text-white text-lg">{band.name}</span>
                   </div>
                   <div className="flex items-center gap-2 text-slate-500 group-hover:text-primary-400 transition-colors">
                     <span className="text-xs uppercase tracking-wider hidden md:inline">Ver Agenda</span>
                     <ChevronRight size={18} />
                   </div>
                 </div>
               ))}
               
               {visibleBands.length === 0 && currentUser?.role !== UserRole.ADMIN && (
                 <p className="p-6 text-slate-500 text-center">
                   Você ainda não foi vinculado a nenhuma banda.
                 </p>
               )}
                {visibleBands.length === 0 && currentUser?.role === UserRole.ADMIN && (
                 <p className="p-6 text-slate-500 text-center">
                   Nenhuma banda cadastrada.
                 </p>
               )}
             </div>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-slate-500 text-xs uppercase font-semibold">Total de Shows</p>
             <p className="text-2xl font-bold text-white mt-1">{visibleEvents.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-green-500/80 text-xs uppercase font-semibold">Confirmados</p>
             <p className="text-2xl font-bold text-white mt-1">{confirmedCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-yellow-500/80 text-xs uppercase font-semibold">Reservados</p>
             <p className="text-2xl font-bold text-white mt-1">{reservedCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-blue-500/80 text-xs uppercase font-semibold">Cidades</p>
             <p className="text-2xl font-bold text-white mt-1">{new Set(visibleEvents.map(e => e.city)).size}</p>
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays className="text-accent-500" /> Próximos Eventos
              </h3>
              <button onClick={() => setCurrentView('agenda')} className="text-sm text-slate-400 hover:text-white">
                Ver Agenda Completa
              </button>
           </div>
           
           <div className="space-y-3">
             {visibleEvents.length === 0 ? (
               <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                  <CalendarDays size={48} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-400">Nenhum evento agendado.</p>
                  <button onClick={() => { setEditingEvent(null); setEditingContractor(null); setIsFormOpen(true); }} className="mt-4 text-primary-400 text-sm hover:underline">
                    + Criar primeiro evento
                  </button>
               </div>
             ) : (
               visibleEvents.slice(0, 5).map(event => {
                 const band = bands.find(b => b.id === event.bandId);
                 return (
                   <div key={event.id} onClick={() => openEditEvent(event)} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-600 transition-all cursor-pointer group">
                     <div className="flex items-center gap-4">
                       <div className="bg-slate-900 w-14 h-14 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-slate-800 group-hover:border-slate-600 group-hover:bg-slate-800 transition-colors">
                         <span className="text-xs font-bold uppercase">{event.date ? new Date(event.date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' }) : '--'}</span>
                         <span className="text-xl font-bold text-white">{event.date ? event.date.split('-')[2] : '--'}</span>
                       </div>
                       <div>
                         <h4 className="text-white font-medium text-lg">{event.name}</h4>
                         <div className="flex flex-col md:flex-row md:items-center md:gap-3 text-sm text-slate-500">
                           <span className="flex items-center gap-1"><MapPin size={12}/> {event.city}</span>
                           <span className="hidden md:inline">•</span>
                           <span className="text-primary-400">{band?.name}</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <StatusBadge status={event.status} />
                     </div>
                   </div>
                 );
               })
             )}
           </div>
        </div>
      </div>
    );
  };

  const AgendaView = () => {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    let visibleEvents = getVisibleEvents();
    
    // Aplicar Filtro de Banda (se houver)
    if (selectedBandFilter) {
      visibleEvents = visibleEvents.filter(e => e.bandId === selectedBandFilter);
    }

    // Filtragem por texto
    const filteredEvents = visibleEvents.filter(e => 
      e.name.toLowerCase().includes(filterText.toLowerCase()) || 
      e.city.toLowerCase().includes(filterText.toLowerCase())
    );
    
    const selectedBandName = bands.find(b => b.id === selectedBandFilter)?.name;

    // --- Calendar Helpers ---
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
      return { days, firstDay, year, month };
    };

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    
    const { days, firstDay, year, month } = getDaysInMonth(currentMonth);

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    // Improved Date Click
    const handleDayClick = (dayNum: number) => {
      const d = String(dayNum).padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${m}-${d}`;

      setNewEventDate(dateStr);
      setEditingEvent(null);
      setIsFormOpen(true);
    };

    // Helper to Normalize Date for Comparison (YYYY-MM-DD)
    const normalizeDate = (d: string) => {
      if (!d) return '';
      return d.includes('T') ? d.split('T')[0] : d;
    };

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0">
        
        {/* Header da Agenda */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Controles de Visualização e Mês */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
               <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <CalendarIcon size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <List size={18} />
                  </button>
               </div>

               {viewMode === 'calendar' && (
                 <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                   <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                   <span className="font-semibold text-white min-w-[140px] text-center uppercase tracking-wide">{monthNames[month]} {year}</span>
                   <button onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={18}/></button>
                 </div>
               )}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <button 
                onClick={() => { setEditingEvent(null); setNewEventDate(new Date().toISOString().split('T')[0]); setIsFormOpen(true); }}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap"
              >
                <Plus size={18} /> <span className="hidden md:inline">Novo Evento</span>
              </button>
            </div>
          </div>

          {/* Banner de Filtro Ativo */}
          {selectedBandFilter && (
            <div className="flex items-center justify-between bg-primary