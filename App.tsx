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
  User as UserIcon,
  ZoomIn,
  ZoomOut,
  X,
  History,
  Ban,
  FileWarning,
  FileCheck
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
    error: null
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
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [filterText, setFilterText] = useState('');
  const [selectedBandFilter, setSelectedBandFilter] = useState<string | null>(null);

  // Agenda / Calendar specific state
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  
  // Hoisted Agenda State (to prevent reset on re-renders)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // 0: Compact, 1: Normal, 2: Detailed
  const [zoomLevel, setZoomLevel] = useState(1);

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
            
            {/* Controles de Visualização, Zoom e Mês */}
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

               {/* Zoom Controls */}
               {viewMode === 'calendar' && (
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 ml-0 md:ml-2">
                    <button 
                      onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))} 
                      disabled={zoomLevel === 0}
                      className={`p-2 rounded transition-all ${zoomLevel === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      title="Menos Detalhes"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <div className="flex gap-0.5 px-1">
                       <div className={`w-1.5 h-1.5 rounded-full transition-colors ${zoomLevel === 0 ? 'bg-primary-500' : 'bg-slate-700'}`} />
                       <div className={`w-1.5 h-1.5 rounded-full transition-colors ${zoomLevel === 1 ? 'bg-primary-500' : 'bg-slate-700'}`} />
                       <div className={`w-1.5 h-1.5 rounded-full transition-colors ${zoomLevel === 2 ? 'bg-primary-500' : 'bg-slate-700'}`} />
                    </div>
                    <button 
                      onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))} 
                      disabled={zoomLevel === 2}
                      className={`p-2 rounded transition-all ${zoomLevel === 2 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      title="Mais Detalhes"
                    >
                      <ZoomIn size={18} />
                    </button>
                </div>
               )}

               {viewMode === 'calendar' && (
                 <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 ml-0 md:ml-2">
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
            <div className="flex items-center justify-between bg-primary-900/20 border border-primary-900/50 p-3 rounded-lg text-primary-200">
               <span className="flex items-center gap-2 text-sm"><FilterX size={14}/> Filtrando por: <strong>{selectedBandName}</strong></span>
               <button onClick={() => setSelectedBandFilter(null)} className="text-xs hover:text-white underline">Limpar filtro</button>
            </div>
          )}
        </div>

        {/* MODO CALENDÁRIO */}
        {viewMode === 'calendar' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0 relative">
            
            {/* Scroll Container */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className={`flex flex-col min-h-full transition-all duration-300 ease-in-out ${zoomLevel === 2 ? 'min-w-[200vw] md:min-w-[150vw]' : 'w-full'}`}>
                    
                    {/* Week Days Header - Sticky */}
                    <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 shrink-0 sticky top-0 z-20 shadow-md">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid - SCROLLABLE with Dynamic Rows */}
                    <div className="grid grid-cols-7 auto-rows-auto flex-1 bg-slate-900 gap-px">
                    {/* Empty cells for previous month */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className={`bg-slate-950/50 ${zoomLevel === 0 ? 'min-h-[80px]' : zoomLevel === 2 ? 'min-h-[200px]' : 'min-h-[120px]'} transition-all duration-300`}></div>
                    ))}

                    {/* Days of current month */}
                    {Array.from({ length: days }).map((_, i) => {
                        const dayNum = i + 1;
                        // Construct date string YYYY-MM-DD
                        const d = String(dayNum).padStart(2, '0');
                        const m = String(month + 1).padStart(2, '0');
                        const dateStr = `${year}-${m}-${d}`;

                        // Strict string comparison to find events
                        const dayEvents = filteredEvents.filter(e => {
                        if (!e.date) return false;
                        const eventDate = e.date.includes('T') ? e.date.split('T')[0] : e.date;
                        return eventDate === dateStr;
                        });

                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                        // Define zoom-dependent classes
                        let cellMinHeight = 'min-h-[120px]';
                        let cardPadding = 'p-1.5';
                        let cardGap = 'gap-0.5';
                        let showDetails = true;
                        let showExtras = false;
                        let titleClass = 'text-xs font-semibold';
                        let timeClass = 'text-xs font-bold';
                        
                        if (zoomLevel === 0) { // Compact
                            cellMinHeight = 'min-h-[80px]';
                            cardPadding = 'p-0.5';
                            cardGap = 'gap-1';
                            showDetails = false;
                            titleClass = 'text-[10px] leading-tight truncate';
                            timeClass = 'text-[10px] font-bold';
                        } else if (zoomLevel === 2) { // Detailed
                            cellMinHeight = 'min-h-[200px]';
                            cardPadding = 'p-3';
                            cardGap = 'gap-2';
                            showExtras = true;
                            // Whitespace normal allows text wrapping when width is expanded
                            titleClass = 'text-sm font-bold leading-tight whitespace-normal';
                            timeClass = 'text-sm font-bold bg-black/20 px-1.5 py-0.5 rounded';
                        }

                        return (
                        <div 
                            key={dayNum} 
                            onClick={() => handleDayClick(dayNum)}
                            className={`bg-slate-950 ${cellMinHeight} h-full p-1.5 border-r border-b border-slate-800 hover:bg-slate-900 transition-all duration-300 ease-in-out cursor-pointer relative group flex flex-col gap-1 min-w-0 overflow-hidden`}
                        >
                            <span className={`text-sm font-bold mb-1 ${isToday ? 'text-primary-400' : 'text-slate-600'}`}>
                            {dayNum} {isToday && '(Hoje)'}
                            </span>
                            
                            <div className="flex flex-col gap-1 w-full min-w-0">
                            {dayEvents.map(event => {
                                const band = bands.find(b => b.id === event.bandId);
                                
                                // Determine color based on status
                                let statusColor = "bg-slate-700 border-slate-600";
                                if (event.status === EventStatus.CONFIRMED) statusColor = "bg-green-600/90 border-green-500";
                                if (event.status === EventStatus.RESERVED) statusColor = "bg-yellow-600/90 border-yellow-500";
                                if (event.status === EventStatus.CANCELED) statusColor = "bg-red-600/90 border-red-500";
                                
                                return (
                                <div 
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                    className={`${cardPadding} rounded border shadow-sm cursor-pointer hover:scale-[1.02] transition-all ${statusColor} text-white w-full h-auto relative block overflow-hidden`}
                                    title={`${event.time} - ${event.name}`}
                                >
                                    <div className={`flex ${zoomLevel === 0 ? 'flex-row items-center gap-2' : 'flex-col gap-0.5'}`}>
                                    <div className={`${timeClass} whitespace-nowrap`}>
                                        {event.time}
                                    </div>
                                    <div className={`${titleClass} break-words`}>
                                        {event.name}
                                    </div>
                                    </div>

                                    {showDetails && (
                                    <div className={`mt-1 ${zoomLevel === 2 ? 'space-y-1' : ''}`}>
                                        <div className={`text-[10px] opacity-90 leading-tight ${zoomLevel === 2 ? 'flex items-center gap-1 text-xs' : ''}`}>
                                            {zoomLevel === 2 && <MapPin size={10} />}
                                            {event.city}
                                        </div>
                                        <div className={`text-[10px] opacity-75 italic leading-tight ${zoomLevel === 2 ? 'flex items-center gap-1 text-xs not-italic' : ''}`}>
                                            {zoomLevel === 2 && <Music size={10} />}
                                            {band?.name}
                                        </div>
                                    </div>
                                    )}

                                    {showExtras && (
                                    <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                                        {event.venue && (
                                            <div className="text-[10px] bg-black/20 p-1 rounded flex items-start gap-1">
                                            <MapPin size={10} className="mt-0.5 shrink-0" /> 
                                            <span className="leading-tight">{event.venue}</span>
                                            </div>
                                        )}
                                        {event.contractor && (
                                            <div className="text-[10px] bg-black/20 p-1 rounded flex items-center gap-1">
                                                <UserIcon size={10} className="shrink-0" />
                                                <span className="truncate">{event.contractor}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-1">
                                            {!event.hasContract && event.status !== EventStatus.CANCELED && (
                                                <div title="Contrato não enviado" className="bg-red-500 text-white rounded-full p-0.5">
                                                    <FileWarning size={10} />
                                                </div>
                                            )}
                                            <StatusBadge status={event.status} />
                                        </div>
                                    </div>
                                    )}
                                    
                                    {/* Compact mode indicator for no contract */}
                                    {zoomLevel !== 2 && !event.hasContract && event.status !== EventStatus.CANCELED && (
                                        <div className="absolute top-0.5 right-0.5 text-red-300">
                                            <FileWarning size={10} />
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                            </div>

                            {/* Add button on hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={14} className="text-primary-500" />
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* MODO LISTA */}
        {viewMode === 'list' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Evento</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Local</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Banda</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Contrato</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Nenhum evento encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(event => {
                      const band = bands.find(b => b.id === event.bandId);
                      return (
                        <tr key={event.id} className="hover:bg-slate-900 transition-colors group">
                          <td className="p-4 text-slate-400 font-medium whitespace-nowrap">
                             {event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                             <div className="text-xs text-slate-600">{event.time}</div>
                          </td>
                          <td className="p-4 text-white font-medium">
                            {event.name}
                            <div className="text-xs text-slate-600">Criado por: {event.createdBy}</div>
                          </td>
                          <td className="p-4 text-slate-400">
                             {event.city}
                             <div className="text-xs text-slate-600">{event.venue}</div>
                          </td>
                          <td className="p-4 text-primary-400 text-sm">{band?.name}</td>
                          <td className="p-4 text-center">
                             {!event.hasContract ? (
                               <span title="Pendente" className="text-red-400 flex justify-center"><FileWarning size={16} /></span>
                             ) : (
                               <span title="Ok" className="text-green-500/50 flex justify-center"><FileCheck size={16} /></span>
                             )}
                          </td>
                          <td className="p-4 text-center">
                            <StatusBadge status={event.status} />
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => openEditEvent(event)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Editar">
                                 <Edit2 size={16} />
                               </button>
                               <button onClick={() => handleDeleteEvent(event.id)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400" title="Excluir">
                                 <Trash2 size={16} />
                               </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ContractorsView = () => {
     // Filter Logic
     const filtered = contractors.filter(c => 
       c.name.toLowerCase().includes(filterText.toLowerCase()) || 
       c.responsibleName.toLowerCase().includes(filterText.toLowerCase())
     );

     return (
       <div className="space-y-6 pb-20 md:pb-0">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar contratantes..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
              />
           </div>
           <button 
              onClick={() => { setEditingContractor(null); setIsContractorFormOpen(true); }}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap w-full md:w-auto justify-center"
            >
              <Plus size={18} /> Novo Contratante
           </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && (
               <div className="col-span-full text-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                  <Briefcase size={48} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-400">Nenhum contratante encontrado.</p>
               </div>
            )}
            {filtered.map(contractor => (
              <div key={contractor.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all group relative">
                 <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{contractor.name}</h3>
                      <p className="text-xs text-slate-500 uppercase font-semibold">{contractor.type}</p>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-primary-500">
                       <UserIcon size={20} />
                    </div>
                 </div>
                 
                 <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                       <UserIcon size={14} className="text-slate-600"/> {contractor.responsibleName || 'Responsável não inf.'}
                    </div>
                    <div className="flex items-center gap-2">
                       <Phone size={14} className="text-slate-600"/> {contractor.whatsapp || contractor.phone || '--'}
                    </div>
                    <div className="flex items-center gap-2">
                       <MapPin size={14} className="text-slate-600"/> {contractor.address.city || 'Cidade não inf.'} - {contractor.address.state}
                    </div>
                 </div>

                 <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditContractor(contractor)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                       <Edit2 size={12} /> Editar
                    </button>
                    <button onClick={() => handleDeleteContractor(contractor.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800 hover:border-red-900">
                       <Trash2 size={12} /> Excluir
                    </button>
                 </div>
              </div>
            ))}
         </div>
       </div>
     )
  }

  const BandManagerView = () => {
    return (
      <div className="space-y-8 pb-20 md:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gerenciar Bandas */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Music className="text-accent-500" /> Bandas
               </h3>
               <button onClick={handleAddBand} className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-700 transition-colors">
                 + Adicionar
               </button>
            </div>
            <div className="space-y-2">
               {bands.map(band => (
                 <div key={band.id} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-white font-medium">{band.name}</span>
                    <span className="text-xs text-slate-500">{band.members} integrantes</span>
                 </div>
               ))}
               {bands.length === 0 && <p className="text-slate-500 text-sm">Nenhuma banda cadastrada.</p>}
            </div>
          </div>

          {/* Gerenciar Usuários */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Users className="text-green-500" /> Usuários do Sistema
               </h3>
               <button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-700 transition-colors">
                 + Novo Usuário
               </button>
            </div>
            <div className="space-y-3">
               {users.map(u => (
                 <div key={u.id} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800 group">
                    <div>
                       <div className="text-white font-medium flex items-center gap-2">
                         {u.name}
                         {u.role === UserRole.ADMIN && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">ADMIN</span>}
                       </div>
                       <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEditUser(u)} className="p-1 text-slate-400 hover:text-white"><Edit2 size={14}/></button>
                       {u.email !== 'admin' && (
                         <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <Loader2 className="animate-spin mr-2" /> Carregando sistema...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 animate-fade-in-up">
           <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
               <Mic2 size={32} className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">Agenda D&E MUSIC</h1>
             <p className="text-slate-400">Acesse o sistema para gerenciar seus shows.</p>
           </div>

           <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {loginError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">E-mail ou Usuário</label>
                <input 
                  type="text" 
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  placeholder="ex: admin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                <input 
                  type="password" 
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={20}/> : <><LogIn size={20} /> Entrar no Sistema</>}
              </button>
           </form>

           <div className="mt-8 text-center text-xs text-slate-600">
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
      <div className="max-w-7xl mx-auto h-full">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'agenda' && renderAgendaView()}
        {currentView === 'contractors' && <ContractorsView />}
        {currentView === 'bands' && <BandManagerView />}
      </div>

      {/* Modals */}
      {selectedDateDetails && <DayDetailsModal />}
      
      {isFormOpen && (
        <EventForm 
          bands={getVisibleBands()} 
          contractors={contractors}
          existingEvent={editingEvent}
          currentUser={currentUser}
          initialDate={newEventDate} // Pass calendar click date
          initialBandId={selectedBandFilter || undefined} // Pass active filter band
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

    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;