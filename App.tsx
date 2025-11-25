import React, { useState, useEffect } from 'react';
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
  FilterX
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
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
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
                  <button onClick={() => { setEditingEvent(null); setIsFormOpen(true); }} className="mt-4 text-primary-400 text-sm hover:underline">
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
                         <span className="text-xs font-bold uppercase">{event.date ? new Date(event.date).toLocaleString('pt-BR', { month: 'short' }) : '--'}</span>
                         <span className="text-xl font-bold text-white">{event.date ? new Date(event.date).getDate() : '--'}</span>
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
    let visibleEvents = getVisibleEvents();
    
    // Aplicar Filtro de Banda (se houver)
    if (selectedBandFilter) {
      visibleEvents = visibleEvents.filter(e => e.bandId === selectedBandFilter);
    }

    const filteredEvents = visibleEvents
      .filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()) || e.city.toLowerCase().includes(filterText.toLowerCase()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const selectedBandName = bands.find(b => b.id === selectedBandFilter)?.name;

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0">
        
        {/* Cabeçalho / Filtros */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar evento, cidade..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <button 
              onClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20"
            >
              <Plus size={18} /> Novo Evento
            </button>
          </div>

          {/* Banner de Filtro Ativo */}
          {selectedBandFilter && (
            <div className="flex items-center justify-between bg-primary-900/20 border border-primary-500/30 text-primary-300 px-4 py-3 rounded-lg animate-fade-in">
              <span className="flex items-center gap-2">
                <Music size={16} /> 
                Mostrando apenas shows de: <strong className="text-white">{selectedBandName}</strong>
              </span>
              <button 
                onClick={() => setSelectedBandFilter(null)}
                className="flex items-center gap-1 text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded border border-slate-700 transition-colors"
              >
                <FilterX size={14} /> Limpar Filtro
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Data</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Evento</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Banda</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Local</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Horário</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEvents.map(event => {
                const band = bands.find(b => b.id === event.bandId);
                
                return (
                  <tr key={event.id} className="hover:bg-slate-900 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 md:hidden"><Clock size={10}/> {event.time}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-200 font-medium block">{event.name}</span>
                      <span className="text-xs text-slate-500 md:hidden">{event.city}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">{band?.name}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-slate-400">{event.venue}, {event.city}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-slate-400 flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditEvent(event)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg">
                           <MoreVertical size={16} />
                         </button>
                         <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg">
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum evento encontrado {selectedBandFilter ? 'para esta banda' : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const ContractorsView = () => {
    // Only Admin can manage contractors freely? Or everyone? Assuming everyone can see for now.
    const filteredContractors = contractors.filter(c => 
      c.name.toLowerCase().includes(filterText.toLowerCase()) || 
      c.email.toLowerCase().includes(filterText.toLowerCase()) ||
      c.address.city.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
       <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar contratante..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <button 
            onClick={() => { setEditingContractor(null); setIsContractorFormOpen(true); }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20"
          >
            <Plus size={18} /> Novo Contratante
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
           {filteredContractors.map(contractor => (
             <div key={contractor.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all group">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{contractor.name}</h3>
                    <p className="text-xs text-primary-400 mt-1 uppercase tracking-wider">{contractor.type}</p>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => openEditContractor(contractor)} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                      <MoreVertical size={16} />
                   </button>
                   <button onClick={() => handleDeleteContractor(contractor.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 rounded-lg hover:bg-slate-800">
                      <Trash2 size={16} />
                   </button>
                 </div>
               </div>

               <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users size={14} className="text-slate-500"/>
                    <span>Resp: <span className="text-slate-200">{contractor.responsibleName || 'Não informado'}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone size={14} className="text-slate-500"/>
                    <span>{contractor.whatsapp || contractor.phone || 'Sem contato'}</span>
                  </div>
                   <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin size={14} className="text-slate-500"/>
                    <span className="truncate">{contractor.address.city}, {contractor.address.state}</span>
                  </div>
               </div>
               
               {contractor.additionalInfo.notes && (
                 <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded italic">
                   "{contractor.additionalInfo.notes.substring(0, 60)}{contractor.additionalInfo.notes.length > 60 ? '...' : ''}"
                 </div>
               )}
             </div>
           ))}
        </div>
       </div>
    );
  }

  const BandManagerView = () => {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <h2 className="text-2xl font-bold text-white mb-6">Gerenciamento de Bandas & Usuários</h2>
        
        <div className="flex flex-col gap-8">
          {/* Bands List - Full Width */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
             <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
               <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                 <Music size={20} className="text-primary-500"/> 
                 Bandas Cadastradas
               </h3>
               <button 
                onClick={handleAddBand}
                className="flex items-center gap-2 text-sm bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary-500/20"
               >
                 <Plus size={16} /> Nova Banda
               </button>
             </div>
             
             <div className="divide-y divide-slate-800">
               {bands.map(band => (
                 <div key={band.id} className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                          <Music size={18} />
                       </div>
                       <div>
                          <p className="text-white font-medium text-lg">{band.name}</p>
                          <p className="text-slate-500 text-sm">Gênero: {band.genre}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-slate-500 text-sm bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                         Ativa
                       </span>
                    </div>
                 </div>
               ))}
               {bands.length === 0 && <p className="p-6 text-slate-500 text-center">Nenhuma banda cadastrada.</p>}
             </div>
          </div>

          {/* Users List - Full Width */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
             <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
               <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                 <Users size={20} className="text-accent-500"/> 
                 Usuários e Permissões
               </h3>
               <button 
                 onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}
                 className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
               >
                 <Plus size={16} /> Novo Usuário
               </button>
             </div>
             
             <div className="divide-y divide-slate-800">
               {/* List Users */}
               {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border ${u.role === UserRole.ADMIN ? 'bg-primary-900/50 text-primary-400 border-primary-500/20' : 'bg-slate-800 text-white border-slate-700'}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-white font-medium">{u.name}</p>
                           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.role === UserRole.ADMIN ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                              {u.role}
                           </span>
                        </div>
                        <p className="text-slate-500 text-sm">{u.email}</p>
                        {/* Show band access summary */}
                        <p className="text-xs text-slate-600 mt-1">
                          {u.role === UserRole.ADMIN ? 'Acesso total' : `Acesso a ${u.bandIds.length} banda(s)`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                          <Edit2 size={16} />
                       </button>
                       {u.email !== 'admin' && (
                         <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 rounded-lg hover:bg-slate-800">
                            <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Loading (Internal React State)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse tracking-wider">AGENDA D&E MUSIC</p>
      </div>
    );
  }

  // State: Not Logged In (Real Login Screen)
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-4">
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                <Music size={32} />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Agenda D&E MUSIC</h1>
          <p className="text-slate-400 mb-8 text-center">Gestão Artística Profissional</p>
          
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Login / Email</label>
              <input
                required
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                placeholder="Digite seu login"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                placeholder="Digite sua senha"
              />
            </div>
            
            {loginError && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                 <AlertTriangle size={16} /> {loginError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-primary-600/20 mt-4 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="animate-spin"/> : <LogIn size={20} />}
              {isLoggingIn ? 'Entrando...' : 'Acessar Sistema'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs text-slate-600">
             <p>Acesso restrito a colaboradores.</p>
             <p>v1.2.0 • D&E Music App</p>
          </div>
        </div>
      </div>
    );
  }

  // State: Logged In
  return (
    <Layout 
      user={currentUser} 
      currentView={currentView} 
      onChangeView={(view) => {
        // Se mudar a view pela sidebar, limpa o filtro de banda
        if (view !== 'agenda') {
          setSelectedBandFilter(null);
        }
        setCurrentView(view);
      }}
      onLogout={handleLogout}
    >
      {/* Logout Button in Sidebar is managed by Layout, but let's pass a way to logout if needed, usually Layout handles view switching but maybe we need a logout prop later */}
      <div className="absolute top-4 right-4 md:hidden">
         {/* Mobile logout if needed, currently Layout has sidebar */}
      </div>
      
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'agenda' && <AgendaView />}
      {currentView === 'contractors' && <ContractorsView />}
      {/* Only Admin sees Band Manager */}
      {currentView === 'bands' && currentUser.role === UserRole.ADMIN && <BandManagerView />}
      {currentView === 'bands' && currentUser.role !== UserRole.ADMIN && (
        <div className="text-center text-slate-500 mt-20">Acesso negado.</div>
      )}

      {isFormOpen && (
        <EventForm 
          bands={getVisibleBands()} // Only pass bands user is allowed to see
          contractors={contractors}
          existingEvent={editingEvent}
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

      {/* User Form Modal */}
      {isUserFormOpen && currentUser.role === UserRole.ADMIN && (
        <UserForm
          bands={bands}
          existingUser={editingUser}
          onSave={handleSaveUser}
          onClose={() => { setIsUserFormOpen(false); setEditingUser(null); }}
        />
      )}
    </Layout>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;