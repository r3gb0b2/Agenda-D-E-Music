import React, { useState, useEffect } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  DollarSign, 
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
  Briefcase
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
          <p className="text-slate-400 mb-6 max-w-md">Ocorreu um erro crítico na aplicação. Isso geralmente ocorre por falha de carregamento de dependências.</p>
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
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    // Force remove HTML loader after React mounts
    const preloader = document.getElementById('initial-loader');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => preloader.remove(), 500);
    }

    let isMounted = true;

    const init = async () => {
      try {
        // Load data safely with timeout
        const userPromise = db.getCurrentUser();
        const eventsPromise = db.getEvents();
        const bandsPromise = db.getBands();
        const usersPromise = db.getUsers();
        const contractorsPromise = db.getContractors();

        // If data fetching takes too long (> 3s), we continue with what we have
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Tempo limite excedido"), 3000));

        try {
           await Promise.race([Promise.all([userPromise, eventsPromise, bandsPromise, usersPromise, contractorsPromise]), timeoutPromise]);
           const user = await userPromise;
           const loadedEvents = await eventsPromise;
           const loadedBands = await bandsPromise;
           const loadedUsers = await usersPromise;
           const loadedContractors = await contractorsPromise;
           
           if (isMounted) {
             setCurrentUser(user);
             setEvents(loadedEvents || []);
             setBands(loadedBands || []);
             setUsers(loadedUsers || []);
             setContractors(loadedContractors || []);
             setIsLoading(false);
           }
        } catch (err) {
           console.warn("Data load timeout or error, forcing UI load with fallbacks:", err);
           if (isMounted) {
              try {
                // Attempt to get whatever resolved
                const u = await userPromise.catch(() => null);
                const e = await eventsPromise.catch(() => []);
                const b = await bandsPromise.catch(() => []);
                const c = await contractorsPromise.catch(() => []);
                setCurrentUser(u);
                setEvents(e || []);
                setBands(b || []);
                setContractors(c || []);
                setUsers([]);
              } catch (criticalErr) {
                console.error("Critical fallback failure", criticalErr);
              }
              setIsLoading(false);
           }
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
        if (isMounted) {
          setLoadError("Falha ao inicializar. O aplicativo rodará em modo local.");
          setIsLoading(false);
        }
      }
    };

    init();
    
    return () => { isMounted = false; };
  }, []);

  const refreshData = async () => {
    setEvents(await db.getEvents());
    setBands(await db.getBands());
    setUsers(await db.getUsers());
    setContractors(await db.getContractors());
  };

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

  const handleAddUser = async () => {
    const name = window.prompt("Nome do usuário:");
    if (!name) return;
    const email = window.prompt("Email do usuário:");
    if (!email) return;
    alert(`Funcionalidade de convite enviada para ${email} (Simulação)`);
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await db.getCurrentUser();
      if (!user) {
         const mockUsers = await db.getUsers();
         if (mockUsers && mockUsers.length > 0) {
            setCurrentUser(mockUsers[0]);
         }
      } else {
         setCurrentUser(user);
      }
    } catch (e) {
      console.error("Login error", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Views ---

  const DashboardView = () => {
    const confirmedCount = events.filter(e => e.status === EventStatus.CONFIRMED).length;
    const reservedCount = events.filter(e => e.status === EventStatus.RESERVED).length;

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Bandas Section (Hero) */}
        <div>
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Music className="text-primary-500" /> Minhas Bandas
             </h2>
             <button onClick={() => setCurrentView('bands')} className="text-sm text-slate-400 hover:text-white">
               Gerenciar
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {bands.map(band => (
               <div key={band.id} className="bg-slate-950 border border-slate-800 p-6 rounded-xl hover:border-primary-500/50 transition-colors group cursor-pointer" onClick={() => setCurrentView('agenda')}>
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-primary-400 border border-slate-700 group-hover:scale-110 transition-transform shadow-lg">
                      <Mic2 size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-white tracking-wide">{band.name}</h3>
                 </div>
               </div>
             ))}
             
             {/* Add Band Card */}
             <button 
               onClick={handleAddBand}
               className="bg-slate-900/50 border border-slate-800 border-dashed p-6 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-primary-400 hover:border-primary-500/50 transition-all gap-3"
             >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                   <Plus size={24} />
                </div>
                <span className="font-medium">Cadastrar Nova Banda</span>
             </button>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-slate-500 text-xs uppercase font-semibold">Total de Shows</p>
             <p className="text-2xl font-bold text-white mt-1">{events.length}</p>
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
             <p className="text-2xl font-bold text-white mt-1">{new Set(events.map(e => e.city)).size}</p>
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
             {events.length === 0 ? (
               <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                  <CalendarDays size={48} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-400">Nenhum evento agendado.</p>
                  <button onClick={() => { setEditingEvent(null); setIsFormOpen(true); }} className="mt-4 text-primary-400 text-sm hover:underline">
                    + Criar primeiro evento
                  </button>
               </div>
             ) : (
               events.slice(0, 5).map(event => {
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
    const filteredEvents = events
      .filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()) || e.city.toLowerCase().includes(filterText.toLowerCase()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0">
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
                    Nenhum evento encontrado.
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
           
           {filteredContractors.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
               <Briefcase size={48} className="mx-auto text-slate-700 mb-3" />
               <p>Nenhum contratante encontrado.</p>
             </div>
           )}
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
                 Usuários do Sistema
               </h3>
               <button 
                 onClick={handleAddUser}
                 className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
               >
                 <Plus size={16} /> Convidar Usuário
               </button>
             </div>
             
             <div className="divide-y divide-slate-800">
               {/* Admin Row */}
               <div className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-900/50 text-primary-400 flex items-center justify-center font-bold text-sm border border-primary-500/20">
                       A
                    </div>
                    <div>
                      <p className="text-white font-medium">Admin (Você)</p>
                      <p className="text-slate-500 text-sm">admin@dne.music</p>
                    </div>
                  </div>
                  <span className="text-xs bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full border border-primary-500/20 font-medium">ADMIN</span>
               </div>
               
               {/* Other Users */}
               {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-white border border-slate-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-slate-500 text-sm">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-medium">{u.role}</span>
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
        {loadError && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14}/> {loadError}
          </div>
        )}
        <button 
          onClick={() => setIsLoading(false)} 
          className="mt-8 text-xs text-slate-600 hover:text-white underline"
        >
          Forçar Entrada (Demo)
        </button>
      </div>
    );
  }

  // State: Not Logged In (Fallback)
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-4">
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                <Music size={32} />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Agenda D&E MUSIC</h1>
          <p className="text-slate-400 mb-8">Sistema de gestão artística e logística.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-primary-600/20 group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" /> 
            Acessar Sistema
          </button>
          <p className="text-xs text-slate-600 mt-6">Modo Demo / Firebase</p>
        </div>
      </div>
    );
  }

  // State: Logged In
  return (
    <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView}>
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'agenda' && <AgendaView />}
      {currentView === 'contractors' && <ContractorsView />}
      {currentView === 'bands' && <BandManagerView />}

      {isFormOpen && (
        <EventForm 
          bands={bands} 
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