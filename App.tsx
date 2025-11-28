

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm';
import BandForm from './components/BandForm'; // Importado
import ContractView from './components/ContractView';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Plus, Search, MapPin, Clock, Trash2, Users, Music, Loader2,
  AlertTriangle, RefreshCcw, CalendarDays, Edit2, ChevronRight, ChevronLeft,
  List, Calendar as CalendarIcon, X, History, FileWarning, Mic2, LogIn,
  Briefcase, User as UserIcon, Phone, ZoomIn, ZoomOut, DollarSign,
  Download, Printer, FileText, Settings, Save
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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Replaced constructor with a class property for state initialization.
  // This is a more modern syntax and resolves TypeScript errors where `this.state`
  // was not being correctly recognized on the class instance.
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
  const [isBandFormOpen, setIsBandFormOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false); 
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  
  const [filterText, setFilterText] = useState('');
  const [selectedBandFilter, setSelectedBandFilter] = useState<string | null>(null);

  // Agenda / Calendar specific state
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  
  // Hoisted Agenda State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1); 

  const [isLoading, setIsLoading] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New Feature State
  const [contractData, setContractData] = useState<{ event: Event, band: Band, contractor?: Contractor } | null>(null);
  const [contractTemplate, setContractTemplate] = useState('');

  // --- Initial Load & Data Management ---
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
  
  const loadTemplate = async () => {
    const template = await db.getContractTemplate();
    setContractTemplate(template);
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
      loadTemplate();
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
        setLoginError('Credenciais inválidas. Verifique seu login e senha.');
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
  const handleSaveBand = async (band: Band) => {
    await db.saveBand(band);
    refreshData();
    setIsBandFormOpen(false);
    setEditingBand(null);
  };

  const openEditBand = (band: Band) => {
    setEditingBand(band);
    setIsBandFormOpen(true);
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

  // --- Handlers: New Features ---
  const handleGenerateContract = (event: Event) => {
    const band = bands.find(b => b.id === event.bandId);
    const contractor = contractors.find(c => c.name === event.contractor);
    if (band) {
      setContractData({ event, band, contractor });
    } else {
      alert("Banda não encontrada para gerar o contrato.");
    }
  };

  const handleExportICS = (event: Event) => {
    const band = bands.find(b => b.id === event.bandId);
    
    if (!event.date || !event.time) return;

    const startDate = new Date(`${event.date.split('T')[0]}T${event.time}:00`);
    const endDate = new Date(startDate.getTime() + (event.durationHours || 2) * 60 * 60 * 1000);
    
    const toICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//D&E MUSIC//Agenda//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@demusic.com`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(startDate)}`,
      `DTEND:${toICSDate(endDate)}`,
      `SUMMARY:${event.name} - ${band?.name || ''}`,
      `DESCRIPTION:Contratante: ${event.contractor}. Notas: ${event.notes}`,
      `LOCATION:${event.venue}, ${event.city}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBandClick = (bandId: string) => {
    setSelectedBandFilter(bandId);
    setCurrentView('agenda');
  };

  // --- Filter Logic ---
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

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- Views ---

  const DashboardView = () => {
    const visibleEvents = getVisibleEvents();
    const visibleBands = getVisibleBands();
    
    const confirmedCount = visibleEvents.filter(e => e.status === EventStatus.CONFIRMED).length;
    const reservedCount = visibleEvents.filter(e => e.status === EventStatus.RESERVED).length;
    const canceledCount = visibleEvents.filter(e => e.status === EventStatus.CANCELED).length;
    const latestEvents = [...visibleEvents]
       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
       .slice(0, 5);
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = visibleEvents
       .filter(e => e.date >= today && e.status !== EventStatus.CANCELED)
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
       .slice(0, 5);

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        <div>
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Music className="text-primary-500" /> Minhas Bandas
             </h2>
             {currentUser?.role === UserRole.ADMIN && (
               <button onClick={() => { setEditingBand(null); setIsBandFormOpen(true); }} className="text-sm text-primary-400 hover:text-white flex items-center gap-1">
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
    
    const [y, m, d] = selectedDateDetails.split('-');
    const dateObj = new Date(Number(y), Number(m)-1, Number(d));
    const dayEvents = getVisibleEvents().filter(e => e.date.split('T')[0] === selectedDateDetails).sort((a, b) => a.time.localeCompare(b.time));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedDateDetails(null)}>
        <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
               <div>
                  <h3 className="text-white font-bold text-lg capitalize">{dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })}</h3>
                  <p className="text-slate-400 text-sm">{dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
               </div>
               <button onClick={() => setSelectedDateDetails(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                 <X size={20} />
               </button>
             </div>
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
                      <div key={event.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 transition-all group">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                               <Clock size={10} /> {event.time}
                            </span>
                            <StatusBadge status={event.status} minimal />
                         </div>
                         <h4 className="text-white font-bold text-base mb-1">{band?.name || 'Banda Desconhecida'}</h4>
                         <p className="text-slate-300 text-sm mb-2">{event.name}</p>
                         <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                           {(event.venue || event.city) && ( <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded"><MapPin size={12} /> {event.venue ? `${event.venue}, ` : ''}{event.city}</div> )}
                           {!event.hasContract && event.status !== EventStatus.CANCELED && ( <div className="flex items-center gap-1 bg-red-900/20 text-red-400 p-1.5 rounded border border-red-900/30"><FileWarning size={12} /> Sem contrato</div> )}
                         </div>
                         <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
                            <div className="flex gap-2">
                              {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.CONTRACT) && (
                                <button onClick={() => handleGenerateContract(event)} title="Gerar Contrato" className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400"><FileText size={10}/> Contrato</button>
                              )}
                              <button onClick={() => handleExportICS(event)} title="Adicionar ao Calendário" className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400"><Download size={10}/> Calendário</button>
                            </div>
                            <button onClick={() => { setSelectedDateDetails(null); openEditEvent(event); }} className="text-[10px] text-primary-400 group-hover:underline flex items-center gap-1">Editar <Edit2 size={10}/></button>
                         </div>
                      </div>
                   )
                })}
             </div>
             <div className="p-4 border-t border-slate-800 bg-slate-950">
                <button onClick={() => { setNewEventDate(selectedDateDetails); setSelectedDateDetails(null); setEditingEvent(null); setIsFormOpen(true); }} className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all">
                  <Plus size={18} /> Novo Evento
                </button>
             </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    let visibleEvents = getVisibleEvents();
    if (selectedBandFilter) {
      visibleEvents = visibleEvents.filter(e => e.bandId === selectedBandFilter);
    }
    const filteredEvents = visibleEvents.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()) || e.city.toLowerCase().includes(filterText.toLowerCase()));
    const selectedBandName = bands.find(b => b.id === selectedBandFilter)?.name;
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear(); const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      return { days, firstDay, year, month };
    };
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const { days, firstDay, year, month } = getDaysInMonth(currentMonth);
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const changeYear = (offset: number) => { const newDate = new Date(currentMonth); newDate.setFullYear(newDate.getFullYear() + offset); setCurrentMonth(newDate); };
    const selectMonth = (monthIndex: number) => { const newDate = new Date(currentMonth); newDate.setMonth(monthIndex); setCurrentMonth(newDate); setIsMonthPickerOpen(false); };
    const handleDayClick = (dayNum: number) => {
      const d = String(dayNum).padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      setSelectedDateDetails(`${year}-${m}-${d}`);
    };
    const ZOOM_STEP = 0.25; const MAX_ZOOM = 4; const MIN_ZOOM = 1;
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0 max-h-[calc(100vh-100px)]">
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
               <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button onClick={() => setViewMode('calendar')} className={`p-2 rounded transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`} title="Modo Calendário"><CalendarIcon size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`} title="Modo Lista"><List size={18} /></button>
               </div>
               {viewMode === 'calendar' && (
                 <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 items-center">
                    <button onClick={handleZoomOut} disabled={zoomLevel <= MIN_ZOOM} className="p-2 rounded transition-all text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="Diminuir Zoom"><ZoomOut size={18} /></button>
                    <span className="text-xs font-mono text-slate-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={handleZoomIn} disabled={zoomLevel >= MAX_ZOOM} className="p-2 rounded transition-all text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="Aumentar Zoom"><ZoomIn size={18} /></button>
                 </div>
               )}
               {viewMode === 'calendar' && (
                 <div className="relative ml-0 md:ml-2">
                   <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                     <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                     <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="font-semibold text-white min-w-[140px] text-center uppercase tracking-wide hover:text-primary-400 transition-colors py-1">{monthNames[month]} {year}</button>
                     <button onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={18}/></button>
                   </div>
                   {isMonthPickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4 w-64 animate-fade-in origin-top-left">
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                              <button onClick={() => changeYear(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                              <span className="font-bold text-white text-lg">{year}</span>
                              <button onClick={() => changeYear(1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {monthNames.map((m, i) => (<button key={i} onClick={() => selectMonth(i)} className={`text-xs py-2 rounded-lg font-medium transition-colors ${i === month ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{m.substring(0, 3)}</button>))}
                          </div>
                      </div>
                   )}
                 </div>
               )}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder="Filtrar por nome ou cidade..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-primary-500 outline-none" />
            </div>
          </div>
          {selectedBandFilter && (
            <div className="flex items-center gap-2 bg-primary-900/20 text-primary-300 px-3 py-1.5 rounded-lg w-fit border border-primary-500/30">
              <span className="text-sm">Filtrando: <b>{selectedBandName}</b></span>
              <button onClick={() => setSelectedBandFilter(null)} className="hover:text-white"><X size={14}/></button>
            </div>
          )}
        </div>
        {viewMode === 'calendar' ? (
          <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-xl shadow-inner relative custom-scrollbar">
            <div style={{ width: `${zoomLevel * 100}%` }}>
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                 {weekDays.map(day => (<div key={day} className="py-2 text-center font-bold text-slate-500 uppercase tracking-wider border-r border-slate-800 last:border-0 text-xs">{day}</div>))}
              </div>
               <div className="grid grid-cols-7 auto-rows-fr">
                  {Array.from({ length: firstDay }).map((_, i) => (<div key={`empty-${i}`} className="bg-slate-900/30 border-b border-r border-slate-800/50" style={{ minHeight: `${100 * zoomLevel}px` }} />))}
                  {Array.from({ length: days }).map((_, i) => {
                     const dayNum = i + 1;
                     const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                     const dayEvents = visibleEvents.filter(e => e.date.split('T')[0] === dateStr);
                     const isToday = new Date().toISOString().split('T')[0] === dateStr;
                     return (
                        <div key={dayNum} onClick={() => handleDayClick(dayNum)} className={`border-b border-r border-slate-800 relative p-2 transition-colors hover:bg-slate-900 cursor-pointer group ${isToday ? 'bg-primary-900/10' : ''}`} style={{ minHeight: `${100 * zoomLevel}px` }}>
                           <div className={`font-bold mb-1 ${isToday ? 'text-primary-400' : 'text-slate-500'}`} style={{ fontSize: `${12 + (zoomLevel - 1) * 4}px` }}>{dayNum} {isToday && '(Hoje)'}</div>
                           <div className="space-y-1">
                              {dayEvents.map(event => {
                                 const band = bands.find(b => b.id === event.bandId);
                                 return (
                                    <div key={event.id} className="rounded border border-slate-700 bg-slate-800/50 hover:border-slate-500 transition-colors overflow-hidden" style={{ fontSize: `${10 + (zoomLevel - 1) * 2}px`, padding: `${4 + (zoomLevel - 1) * 2}px`, marginBottom: `${4 + (zoomLevel - 1) * 2}px` }}>
                                       <div className="flex justify-between items-center gap-1"><span className="font-bold text-white truncate">{event.time} - {band?.name}</span></div>
                                       {zoomLevel > 1.5 && (<div className="mt-1 space-y-1"><div className="text-slate-400 truncate flex items-center gap-1"><MapPin size={12}/> {event.venue || event.city}</div>{!event.hasContract && event.status !== EventStatus.CANCELED && (<div className="text-red-400 text-xs flex items-center gap-1 font-medium bg-red-950/30 p-1 rounded"><FileWarning size={12}/> Sem Contrato</div>)}</div>)}
                                       {zoomLevel <= 1.5 && !event.hasContract && event.status !== EventStatus.CANCELED && (<div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-1 right-1" title="Sem Contrato" />)}
                                    </div>
                                 )
                              })}
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); setNewEventDate(dateStr); setEditingEvent(null); setIsFormOpen(true); }} className="absolute bottom-2 right-2 bg-primary-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg p-2"><Plus size={14 + (zoomLevel - 1) * 4} /></button>
                        </div>
                     );
                  })}
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 custom-scrollbar">
            {filteredEvents.length === 0 ? (<div className="text-center py-12 text-slate-500">Nenhum evento encontrado para este filtro.</div>) : (
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
  
  const FinancialView = () => {
    const visibleEvents = getVisibleEvents();
    const visibleBands = getVisibleBands();
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [filteredBandId, setFilteredBandId] = useState<string>('all');
    
    const availableYears = [...new Set(events.map(e => new Date(e.date).getFullYear()))].sort((a,b) => b-a);
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

    const filteredEvents = visibleEvents.filter(e => {
      const eventYear = new Date(e.date).getFullYear();
      const bandMatch = filteredBandId === 'all' || e.bandId === filteredBandId;
      return eventYear === selectedYear && bandMatch && e.status !== EventStatus.CANCELED;
    });

    // FIX: Ensure financial values are treated as numbers to prevent string concatenation.
    // This bug caused `totalGross` and `totalNet` to become strings, leading to an invalid
    // arithmetic operation (string - string) when calculating `totalCommission`.
    const totalGross = filteredEvents.reduce((sum, e) => sum + Number(e.financials?.grossValue || 0), 0);
    const totalNet = filteredEvents.reduce((sum, e) => sum + Number(e.financials?.netValue || 0), 0);
    const totalCommission = totalGross - totalNet - filteredEvents.reduce((s, e) => s + Number(e.financials?.taxes || 0), 0);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthEvents = filteredEvents.filter(e => new Date(e.date).getMonth() === i);
      // FIX: Also apply Number() conversion here to ensure chart data is correct.
      const gross = monthEvents.reduce((sum, e) => sum + Number(e.financials?.grossValue || 0), 0);
      const net = monthEvents.reduce((sum, e) => sum + Number(e.financials?.netValue || 0), 0);
      return { name: monthNames[i].substring(0,3), Bruto: gross, Líquido: net };
    });

    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-primary-500"/> Visão Financeira</h2>
          <div className="flex gap-2">
            <select value={filteredBandId} onChange={e => setFilteredBandId(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none">
              <option value="all">Todas as Bandas</option>
              {visibleBands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-green-500/80 text-sm uppercase font-semibold">Faturamento Bruto</p>
             <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-yellow-500/80 text-sm uppercase font-semibold">Comissões Pagas</p>
             <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalCommission)}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-blue-500/80 text-sm uppercase font-semibold">Receita Líquida</p>
             <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalNet)}</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl h-96">
          <h3 className="text-lg font-bold text-white mb-4">Receita Mensal ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
              <YAxis tickFormatter={(value) => `R$${Number(value)/1000}k`} tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              <Bar dataKey="Bruto" fill="#6366f1" name="Faturamento Bruto" />
              <Bar dataKey="Líquido" fill="#38bdf8" name="Receita Líquida" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <h3 className="text-lg font-bold text-white p-4">Detalhes dos Eventos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Data</th><th className="p-4">Evento</th><th className="p-4">Banda</th><th className="p-4">Bruto</th><th className="p-4">Líquido</th><th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredEvents.map(e => {
                  const band = bands.find(b => b.id === e.bandId);
                  return (
                    <tr key={e.id} className="text-slate-300 hover:bg-slate-900/50">
                      <td className="p-4">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-white">{e.name}</td>
                      <td className="p-4 text-primary-400">{band?.name}</td>
                      <td className="p-4">{formatCurrency(e.financials.grossValue)}</td>
                      <td className="p-4 font-semibold text-green-400">{formatCurrency(e.financials.netValue)}</td>
                      <td className="p-4"><StatusBadge status={e.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    )
  }

  const ContractorsView = () => {
    return (
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Briefcase className="text-primary-500"/> Contratantes</h2>
          <button onClick={() => { setEditingContractor(null); setIsContractorFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium">
            <Plus size={18} /> Novo Contratante
          </button>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="p-4">Nome / Razão Social</th><th className="p-4">Contato</th><th className="p-4">Cidade</th><th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {contractors.map(c => (
                <tr key={c.id} className="text-slate-300 hover:bg-slate-900/50">
                  <td className="p-4 font-medium text-white">{c.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2"><Phone size={12}/> {c.whatsapp || c.phone}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">{c.email}</div>
                  </td>
                  <td className="p-4">{c.address.city}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEditContractor(c)} className="p-2 hover:bg-slate-800 rounded"><Edit2 size={16} className="text-slate-400"/></button>
                      <button onClick={() => handleDeleteContractor(c.id)} className="p-2 hover:bg-slate-800 rounded"><Trash2 size={16} className="text-red-500"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const BandsAndUsersView = () => {
    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Music className="text-primary-500"/> Bandas</h2>
            <button onClick={() => { setEditingBand(null); setIsBandFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium">
              <Plus size={18} /> Nova Banda
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr><th className="p-4">Nome</th><th className="p-4">Gênero</th><th className="p-4">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {bands.map(b => (
                  <tr key={b.id} className="text-slate-300 hover:bg-slate-900/50">
                    <td className="p-4 font-medium text-white">{b.name}</td>
                    <td className="p-4">{b.genre}</td>
                    <td className="p-4">
                      <button onClick={() => openEditBand(b)} className="p-2 hover:bg-slate-800 rounded"><Edit2 size={16} className="text-slate-400"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-accent-500"/> Usuários</h2>
            <button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium">
              <Plus size={18} /> Novo Usuário
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr><th className="p-4">Nome</th><th className="p-4">Login</th><th className="p-4">Permissão</th><th className="p-4">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {users.map(u => (
                  <tr key={u.id} className="text-slate-300 hover:bg-slate-900/50">
                    <td className="p-4 font-medium text-white">{u.name}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-800 rounded text-xs font-semibold capitalize">{u.role}</span></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEditUser(u)} className="p-2 hover:bg-slate-800 rounded"><Edit2 size={16} className="text-slate-400"/></button>
                        {u.role !== UserRole.ADMIN && <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-slate-800 rounded"><Trash2 size={16} className="text-red-500"/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const [template, setTemplate] = useState(contractTemplate);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
      setIsSaving(true);
      await db.saveContractTemplate(template);
      setContractTemplate(template);
      setIsSaving(false);
      alert('Modelo salvo com sucesso!');
    };
    
    const variables = [
        { key: '{{NOME_BANDA}}', desc: 'Nome da banda contratada' },
        { key: '{{RAZAO_SOCIAL_BANDA}}', desc: 'Razão Social da banda' },
        { key: '{{CNPJ_BANDA}}', desc: 'CNPJ da banda' },
        { key: '{{ENDERECO_BANDA}}', desc: 'Endereço da banda' },
        { key: '{{REPRESENTANTE_BANDA}}', desc: 'Rep. legal da banda' },
        { key: '{{CPF_REP_BANDA}}', desc: 'CPF do rep. da banda' },
        { key: '{{RG_REP_BANDA}}', desc: 'RG do rep. da banda' },
        { key: '{{EMAIL_BANDA}}', desc: 'E-mail de contato da banda' },
        { key: '{{TELEFONE_BANDA}}', desc: 'Telefone da banda' },
        { key: '{{NOME_CONTRATANTE}}', desc: 'Nome/Razão Social do contratante' },
        { key: '{{CPF_CNPJ_CONTRATANTE}}', desc: 'CPF ou CNPJ do contratante' },
        { key: '{{RG_CONTRATANTE}}', desc: 'RG do contratante' },
        { key: '{{ENDERECO_CONTRATANTE}}', desc: 'Endereço do contratante' },
        { key: '{{EMAIL_CONTRATANTE}}', desc: 'E-mail do contratante' },
        { key: '{{TELEFONE_CONTRATANTE}}', desc: 'Telefone do contratante' },
        { key: '{{DATA_EVENTO}}', desc: 'Data (DD/MM/AAAA)' },
        { key: '{{LOCAL_EVENTO}}', desc: 'Local/Venue do evento' },
        { key: '{{CIDADE_EVENTO}}', desc: 'Cidade do evento' },
        { key: '{{DURACAO_EVENTO}}', desc: 'Duração em horas' },
        { key: '{{VALOR_BRUTO_FORMATADO}}', desc: 'Cachê bruto (Ex: R$ 1.000,00)' },
        { key: '{{VALOR_POR_EXTENSO}}', desc: 'Cachê por extenso' },
    ];

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-primary-500"/> Configurações do Sistema
        </h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Editor de Modelo de Contrato</h3>
          <p className="text-sm text-slate-400 mb-4">Personalize o texto padrão que será usado ao gerar contratos. Use as variáveis abaixo para inserir dados do evento automaticamente.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={25}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white font-mono text-sm leading-6 resize-y focus:border-primary-500 outline-none"
                placeholder="Cole ou escreva seu modelo de contrato aqui..."
              />
            </div>
            <div>
              <h4 className="text-md font-semibold text-white mb-2">Variáveis Disponíveis</h4>
              <p className="text-xs text-slate-500 mb-3">Clique para copiar</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {variables.map(v => (
                  <div key={v.key} onClick={() => navigator.clipboard.writeText(v.key)} className="bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-700">
                    <p className="font-mono text-xs text-accent-500">{v.key}</p>
                    <p className="text-xs text-slate-400">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-600/20 transition-all">
              {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
              Salvar Modelo
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'agenda': return renderAgendaView();
      case 'financials': return <FinancialView />;
      case 'contractors': return <ContractorsView />;
      case 'bands': return <BandsAndUsersView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }
  
  if (contractData) {
    return <ContractView {...contractData} contractTemplate={contractTemplate} onClose={() => setContractData(null)} />;
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 relative overflow-hidden">
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
              <label className="block text-sm font-medium text-slate-300 mb-1">Login / Usuário</label>
              <input type="text" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" placeholder="Digite seu usuário" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
              <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" placeholder="Digite sua senha" />
            </div>
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50">
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <LogIn size={18} />}
              Entrar no Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView} onLogout={handleLogout}>
      {renderView()}

      {isFormOpen && (
        <EventForm
          bands={getVisibleBands()}
          contractors={contractors}
          existingEvent={editingEvent}
          currentUser={currentUser}
          initialDate={newEventDate}
          onSave={handleSaveEvent}
          onClose={() => { setIsFormOpen(false); setEditingEvent(null); }}
        />
      )}
      
      {isContractorFormOpen && (
        <ContractorForm
          existingContractor={editingContractor}
          onSave={handleSaveContractor}
          onClose={() => { setIsContractorFormOpen(false); setEditingContractor(null); }}
        />
      )}
      
      {isUserFormOpen && (
        <UserForm
          bands={bands}
          existingUser={editingUser}
          onSave={handleSaveUser}
          onClose={() => { setIsUserFormOpen(false); setEditingUser(null); }}
        />
      )}
      
      {isBandFormOpen && (
        <BandForm
          existingBand={editingBand}
          onSave={handleSaveBand}
          onClose={() => { setIsBandFormOpen(false); setEditingBand(null); }}
        />
      )}

      {selectedDateDetails && <DayDetailsModal />}
    </Layout>
  );
}

const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;