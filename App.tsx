import React, { Component, useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm';
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  Trash2,
  Users,
  Music,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  CalendarDays,
  Edit2,
  ChevronRight,
  ChevronLeft,
  List,
  Calendar as CalendarIcon,
  X,
  History,
  FileWarning,
  Mic2,
  LogIn,
  Briefcase,
  User as UserIcon,
  Phone
} from 'lucide-react';

// --- Helper Components ---

const StatusBadge = ({ status, minimal = false }: { status: EventStatus, minimal?: boolean }) => {
  const styles = {
    [EventStatus.CONFIRMED]: 'bg-green-500/10 text-green-400 border-green-500/20',
    [EventStatus.RESERVED]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    [EventStatus.CANCELED]: 'bg-red-500/10 text-red-400 border-red-500/20',
    [EventStatus.COMPLETED]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const labels = {
    [EventStatus.CONFIRMED]: 'Confirmado',
    [EventStatus.RESERVED]: 'Reservado',
    [EventStatus.CANCELED]: 'Cancelado',
    [EventStatus.COMPLETED]: 'Realizado',
  };

  if (minimal) {
    return (
       <div className={`w-2.5 h-2.5 rounded-full ${styles[status].replace('bg-', 'bg-').split(' ')[0]} border border-white/10`} title={labels[status]} />
    );
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

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
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false); 
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [filterText, setFilterText] = useState('');
  const [selectedBandFilter, setSelectedBandFilter] = useState<string | null>(null);

  // Agenda / Calendar specific state
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  
  // Hoisted Agenda State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isLoading, setIsLoading] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initial Load & Session Check
  useEffect(() => {
    const initApp = async () => {
      const preloader = document.getElementById('initial-loader');
      if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.remove(), 500);
      }

      const savedUser = await db.getCurrentUser();
      if (savedUser) {
        setCurrentUser(savedUser);
      }

      setIsLoading(false);
    };

    initApp();
  }, []);

  const refreshData = async () => {
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
        await db.createSession(user);
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
    await db.clearSession();
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
    const canceledCount = visibleEvents.filter(e => e.status === EventStatus.CANCELED).length;

    // Logic for "Latest Updates"
    const latestEvents = [...visibleEvents]
       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
       .slice(0, 5);

    // Logic for "Upcoming Events" (Replaces Canceled List)
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = visibleEvents
       .filter(e => e.date >= today && e.status !== EventStatus.CANCELED)
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
       .slice(0, 5);

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Bandas Section (MOVED TO TOP) */}
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
               
               {visibleBands.length === 0 && (
                 <p className="p-6 text-slate-500 text-center">
                   {currentUser?.role === UserRole.ADMIN ? 'Nenhuma banda cadastrada.' : 'Você ainda não foi vinculado a nenhuma banda.'}
                 </p>
               )}
             </div>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          {/* Nova Coluna: Cancelados */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-red-500/80 text-xs uppercase font-semibold">Cancelados</p>
             <p className="text-2xl font-bold text-white mt-1">{canceledCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-blue-500/80 text-xs uppercase font-semibold">Cidades</p>
             <p className="text-2xl font-bold text-white mt-1">{new Set(visibleEvents.map(e => e.city)).size}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Últimas Adições */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <History className="text-primary-400" size={20} /> Últimas Atualizações
               </h3>
               <div className="space-y-3">
                 {latestEvents.length === 0 ? <p className="text-slate-500 text-sm">Nenhuma atividade recente.</p> : (
                   latestEvents.map(event => {
                     const band = bands.find(b => b.id === event.bandId);
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 cursor-pointer transition-colors">
                          <div className="flex justify-between items-start">
                             <div>
                                <span className="text-xs text-primary-400 font-bold uppercase">{band?.name}</span>
                                <h4 className="text-white text-sm font-medium">{event.name}</h4>
                                <p className="text-xs text-slate-500">{new Date(event.date).toLocaleDateString()} - {event.city}</p>
                             </div>
                             <div className="text-right">
                                <StatusBadge status={event.status} minimal />
                             </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                             <span>Adicionado por: <span className="text-slate-300">{event.createdBy}</span></span>
                             <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                     )
                   })
                 )}
               </div>
            </div>

            {/* Próximos Shows (Replaces Canceled) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <CalendarDays className="text-green-400" size={20} /> Próximos Shows
               </h3>
               <div className="space-y-3">
                 {upcomingEvents.length === 0 ? <p className="text-slate-500 text-sm">Nenhum show próximo agendado.</p> : (
                   upcomingEvents.map(event => {
                     const band = bands.find(b => b.id === event.bandId);
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900/50 rounded border border-green-900/20 hover:border-green-900/50 cursor-pointer transition-colors">
                          <div className="flex justify-between items-center">
                             <div>
                                <span className="text-xs text-slate-400">{band?.name}</span>
                                <h4 className="text-white text-sm font-medium">{event.name}</h4>
                                <div className="flex gap-2 text-xs text-slate-500">
                                   <span className="flex items-center gap-1"><Clock size={10}/> {event.time}</span>
                                   <span>|</span>
                                   <span>{new Date(event.date).toLocaleDateString()}</span>
                                </div>
                             </div>
                             <div className="text-right">
                                <StatusBadge status={event.status} />
                             </div>
                          </div>
                       </div>
                     )
                   })
                 )}
               </div>
            </div>
        </div>
      </div>
    );
  };

  const DayDetailsModal = () => {
    if (!selectedDateDetails) return null;
    
    // Parse date safely
    const [y, m, d] = selectedDateDetails.split('-');
    const dateObj = new Date(Number(y), Number(m)-1, Number(d));
    
    // Filter events for this day from all accessible events
    const dayEvents = getVisibleEvents().filter(e => {
       if (!e.date) return false;
       return e.date.split('T')[0] === selectedDateDetails;
    }).sort((a, b) => a.time.localeCompare(b.time));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedDateDetails(null)}>
        <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative" onClick={e => e.stopPropagation()}>
             {/* Header */}
             <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
               <div>
                  <h3 className="text-white font-bold text-lg capitalize">{dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })}</h3>
                  <p className="text-slate-400 text-sm">{dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
               </div>
               <button onClick={() => setSelectedDateDetails(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                 <X size={20} />
               </button>
             </div>

             {/* Body */}
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {dayEvents.length === 0 && (
                   <div className="text-center py-8">
                      <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                         <CalendarIcon size={24} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400">Nenhum evento agendado.</p>
                      <p className="text-slate-600 text-xs mt-1">Toque em adicionar para criar um novo.</p>
                   </div>
                )}
                
                {dayEvents.map(event => {
                   const band = bands.find(b => b.id === event.bandId);
                   return (
                      <div 
                        key={event.id}
                        onClick={() => { setSelectedDateDetails(null); openEditEvent(event); }}
                        className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all cursor-pointer group"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                               <Clock size={10} /> {event.time}
                            </span>
                            <StatusBadge status={event.status} minimal />
                         </div>
                         <h4 className="text-white font-bold text-base mb-1">{band?.name || 'Banda Desconhecida'}</h4>
                         <p className="text-slate-300 text-sm mb-2">{event.name}</p>
                         
                         <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                           {(event.venue || event.city) && (
                             <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded">
                                <MapPin size={12} /> {event.venue ? `${event.venue}, ` : ''}{event.city}
                             </div>
                           )}
                           
                           {!event.hasContract && event.status !== EventStatus.CANCELED && (
                             <div className="flex items-center gap-1 bg-red-900/20 text-red-400 p-1.5 rounded border border-red-900/30">
                               <FileWarning size={12} /> Sem contrato
                             </div>
                           )}
                         </div>

                         <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-600 flex justify-between">
                            <span>Add: {event.createdBy}</span>
                            <span className="text-primary-400 group-hover:underline flex items-center gap-1">Editar <Edit2 size={10}/></span>
                         </div>
                      </div>
                   )
                })}
             </div>

             {/* Footer */}
             <div className="p-4 border-t border-slate-800 bg-slate-950">
                <button 
                  onClick={() => {
                     setNewEventDate(selectedDateDetails);
                     setSelectedDateDetails(null);
                     setEditingEvent(null);
                     setIsFormOpen(true);
                  }}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all"
                >
                  <Plus size={18} /> Novo Evento
                </button>
             </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
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
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    const { days, firstDay, year, month } = getDaysInMonth(currentMonth);

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    
    // Helpers for Month Picker
    const changeYear = (offset: number) => {
        const newDate = new Date(currentMonth);
        newDate.setFullYear(newDate.getFullYear() + offset);
        setCurrentMonth(newDate);
    };

    const selectMonth = (monthIndex: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(monthIndex);
        setCurrentMonth(newDate);
        setIsMonthPickerOpen(false);
    };

    const handleDayClick = (dayNum: number) => {
      const d = String(dayNum).padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${m}-${d}`;

      // Open Day Details Modal instead of Create Form directly
      setSelectedDateDetails(dateStr);
    };

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0 max-h-[calc(100vh-100px)]">
        
        {/* Header da Agenda */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Controles de Visualização e Mês */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                 <div className="relative ml-0 md:ml-2">
                   <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                     <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                     <button 
                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                        className="font-semibold text-white min-w-[140px] text-center uppercase tracking-wide hover:text-primary-400 transition-colors py-1"
                     >
                        {monthNames[month]} {year}
                     </button>
                     <button onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={18}/></button>
                   </div>
                   
                   {/* MONTH PICKER DROPDOWN */}
                   {isMonthPickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4 w-64 animate-fade-in origin-top-left">
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                              <button onClick={() => changeYear(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                              <span className="font-bold text-white text-lg">{year}</span>
                              <button onClick={() => changeYear(1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {monthNames.map((m, i) => (
                                  <button 
                                      key={i} 
                                      onClick={() => selectMonth(i)} 
                                      className={`text-xs py-2 rounded-lg font-medium transition-colors ${i === month ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                  >
                                      {m.substring(0, 3)}
                                  </button>
                              ))}
                          </div>
                      </div>
                   )}
                 </div>
               )}
            </div>

            {/* Filter Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Filtrar por nome ou cidade..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-primary-500 outline-none"
              />
            </div>
          </div>
          
          {selectedBandFilter && (
            <div className="flex items-center gap-2 bg-primary-900/20 text-primary-300 px-3 py-1.5 rounded-lg w-fit border border-primary-500/30">
              <span className="text-sm">Filtrando: <b>{selectedBandName}</b></span>
              <button onClick={() => setSelectedBandFilter(null)} className="hover:text-white"><X size={14}/></button>
            </div>
          )}
        </div>

        {/* Calendar Grid - Always Full Width / Detail */}
        {viewMode === 'calendar' ? (
          <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-xl shadow-inner relative custom-scrollbar">
            {/* Header Row (Days of Week) - Sticky */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 min-w-[1000px] md:min-w-0">
               {weekDays.map(day => (
                 <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-800 last:border-0">
                   {day}
                 </div>
               ))}
            </div>
            
            {/* Days Grid */}
             <div className="grid grid-cols-7 auto-rows-fr min-h-full min-w-[1000px] md:min-w-0">
                {/* Empty cells for start of month */}
                {Array.from({ length: firstDay }).map((_, i) => (
                   <div key={`empty-${i}`} className="bg-slate-900/30 border-b border-r border-slate-800/50 min-h-[120px]" />
                ))}

                {/* Actual Days */}
                {Array.from({ length: days }).map((_, i) => {
                   const dayNum = i + 1;
                   const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                   const dayEvents = visibleEvents.filter(e => e.date.split('T')[0] === dateStr);
                   const isToday = new Date().toISOString().split('T')[0] === dateStr;

                   return (
                      <div 
                        key={dayNum} 
                        onClick={() => handleDayClick(dayNum)}
                        className={`min-h-[120px] border-b border-r border-slate-800 relative p-2 transition-colors hover:bg-slate-900 cursor-pointer group ${isToday ? 'bg-primary-900/10' : ''}`}
                      >
                         <div className={`text-xs font-bold mb-1 ${isToday ? 'text-primary-400' : 'text-slate-500'}`}>
                            {dayNum} {isToday && '(Hoje)'}
                         </div>
                         
                         {/* Events List in Day Cell */}
                         <div className="space-y-1">
                            {dayEvents.map(event => {
                               const band = bands.find(b => b.id === event.bandId);
                               return (
                                  <div key={event.id} className="text-[10px] p-1.5 rounded border border-slate-700 bg-slate-800/50 hover:border-slate-500 transition-colors overflow-hidden">
                                     <div className="font-bold text-white truncate">{event.time} - {band?.name}</div>
                                     <div className="text-slate-400 truncate">{event.venue || event.city}</div>
                                     {!event.hasContract && event.status !== EventStatus.CANCELED && (
                                       <div className="text-red-400 text-[9px] mt-0.5 flex items-center gap-0.5"><FileWarning size={8}/> Sem Contrato</div>
                                     )}
                                  </div>
                               )
                            })}
                            {dayEvents.length > 3 && (
                               <div className="text-[9px] text-center text-slate-500 font-medium">
                                 + {dayEvents.length - 3} mais
                               </div>
                            )}
                         </div>
                         
                         {/* Add Button on Hover */}
                         <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              setNewEventDate(dateStr);
                              setEditingEvent(null);
                              setIsFormOpen(true);
                           }}
                           className="absolute bottom-2 right-2 p-1 bg-primary-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"
                         >
                           <Plus size={14} />
                         </button>
                      </div>
                   );
                })}
             </div>
          </div>
        ) : (
          /* List View */
          <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 custom-scrollbar">
            {filteredEvents.length === 0 ? (
               <div className="text-center py-12 text-slate-500">Nenhum evento encontrado para este filtro.</div>
            ) : (
               filteredEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => {
                 const band = bands.find(b => b.id === event.bandId);
                 return (
                    <div key={event.id} onClick={() => openEditEvent(event)} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="text-center bg-slate-950 p-3 rounded border border-slate-800 min-w-[70px]">
                             <span className="block text-xs text-slate-500 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                             <span className="block text-2xl font-bold text-white">{new Date(event.date).getDate()}</span>
                          </div>
                          <div>
                             <h4 className="text-lg font-bold text-white">{event.name}</h4>
                             <p className="text-sm text-primary-400 font-medium">{band?.name}</p>
                             <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={12}/> {event.time}</span>
                                <span className="flex items-center gap-1"><MapPin size={12}/> {event.city}</span>
                             </div>
                          </div>
                       </div>
                       <StatusBadge status={event.status} />
                    </div>
                 )
               })
            )}
          </div>
        )}
      </div>
    );
  };
  
  // --- Render ---

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/10 rounded-full blur-[100px]" />
        
        <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative z-10 mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white mb-4 shadow-lg shadow-primary-500/25">
              <Mic2 size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Agenda D&E MUSIC</h1>
            <p className="text-slate-400 mt-2">Acesse para gerenciar shows e contratos</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" size={20}/> : <><LogIn size={20}/> Entrar</>}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
             &copy; 2024 D&E Music Management
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={currentUser} 
      currentView={currentView} 
      onChangeView={setCurrentView}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && <DashboardView />}
      
      {currentView === 'agenda' && renderAgendaView()}

      {currentView === 'contractors' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
               <Briefcase className="text-primary-500" /> Contratantes
             </h2>
             <button onClick={() => { setEditingContractor(null); setIsContractorFormOpen(true); }} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all">
               <Plus size={18} /> Novo Contratante
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {contractors.length === 0 ? (
               <div className="col-span-full text-center py-12 text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                 Nenhum contratante cadastrado.
               </div>
             ) : (
               contractors.map(c => (
                 <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all group relative">
                    <div className="flex justify-between items-start mb-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700">
                          {c.name.charAt(0).toUpperCase()}
                       </div>
                       <button onClick={() => handleDeleteContractor(c.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">{c.name}</h3>
                    <p className="text-sm text-slate-400 mb-4 flex items-center gap-1"><UserIcon size={12}/> {c.responsibleName || 'Sem responsável'}</p>
                    
                    <div className="space-y-2 text-sm text-slate-500 border-t border-slate-800 pt-3">
                       <div className="flex items-center gap-2">
                          <Phone size={14} /> {c.whatsapp || c.phone || 'N/A'}
                       </div>
                       <div className="flex items-center gap-2 truncate">
                          <MapPin size={14} /> {c.address.city || 'Cidade N/A'}
                       </div>
                    </div>
                    
                    <button 
                       onClick={() => openEditContractor(c)}
                       className="absolute bottom-4 right-4 p-2 bg-slate-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-600 shadow-lg"
                    >
                       <Edit2 size={16}/>
                    </button>
                 </div>
               ))
             )}
           </div>
        </div>
      )}

      {currentView === 'bands' && (
        <div className="space-y-8">
           {/* Section 1: Bands Management */}
           <div>
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <Music className="text-primary-500" /> Bandas do Sistema
               </h2>
               <button onClick={handleAddBand} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-700 transition-all">
                 <Plus size={18} /> Nova Banda
               </button>
             </div>
             
             <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-4">Nome da Banda</th>
                      <th className="p-4">Gênero</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {bands.map(b => (
                      <tr key={b.id} className="text-slate-300 hover:bg-slate-900/50">
                        <td className="p-4 font-medium text-white">{b.name}</td>
                        <td className="p-4">{b.genre}</td>
                        <td className="p-4 text-right">
                           <button className="text-slate-500 hover:text-white transition-colors">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </div>

           {/* Section 2: Users Management */}
           <div>
              <div className="flex justify-between items-center mb-4">
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <Users className="text-accent-500" /> Usuários e Acesso
               </h2>
               <button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all">
                 <Plus size={18} /> Novo Usuário
               </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {users.map(u => (
                  <div key={u.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold border border-slate-600">
                           {u.name.charAt(0)}
                        </div>
                        <div>
                           <p className="font-bold text-white">{u.name}</p>
                           <p className="text-xs text-slate-500">{u.email}</p>
                           <span className="text-[10px] uppercase tracking-wider text-primary-400 font-bold">{u.role}</span>
                        </div>
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditUser(u)} className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded"><Edit2 size={14}/></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 rounded"><Trash2 size={14}/></button>
                     </div>
                  </div>
               ))}
             </div>
           </div>
        </div>
      )}

      {/* MODALS */}
      {isFormOpen && (
        <EventForm 
          bands={getVisibleBands()}
          contractors={contractors}
          existingEvent={editingEvent}
          currentUser={currentUser}
          initialDate={newEventDate}
          initialBandId={selectedBandFilter || undefined}
          onSave={handleSaveEvent}
          onClose={() => setIsFormOpen(false)}
        />
      )}
      
      {isContractorFormOpen && (
        <ContractorForm
          existingContractor={editingContractor}
          onSave={handleSaveContractor}
          onClose={() => setIsContractorFormOpen(false)}
        />
      )}

      {isUserFormOpen && (
        <UserForm
          bands={bands}
          existingUser={editingUser}
          onSave={handleSaveUser}
          onClose={() => setIsUserFormOpen(false)}
        />
      )}
      
      {/* Day Details Popup */}
      <DayDetailsModal />

    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}