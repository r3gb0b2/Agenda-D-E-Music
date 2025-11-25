import React, { useState, useEffect } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
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
  LogIn
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

// --- Main App Component ---

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load
  useEffect(() => {
    // Force remove loader after React mounts
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

        // If data fetching takes too long (> 3s), we stop loading to show UI
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 3000));

        try {
           await Promise.race([Promise.all([userPromise, eventsPromise, bandsPromise]), timeoutPromise]);
           const user = await userPromise;
           const loadedEvents = await eventsPromise;
           const loadedBands = await bandsPromise;
           
           if (isMounted) {
             setCurrentUser(user);
             setEvents(loadedEvents || []);
             setBands(loadedBands || []);
           }
        } catch (err) {
           console.warn("Data load timeout or error, using fallbacks:", err);
           // Try to set what we have
           if (isMounted) {
              const u = await userPromise.catch(() => null);
              setCurrentUser(u);
           }
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    
    return () => { isMounted = false; };
  }, []);

  const refreshData = async () => {
    setEvents(await db.getEvents());
    setBands(await db.getBands());
  };

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

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await db.getCurrentUser();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Views ---

  const DashboardView = () => {
    // Calculate stats
    const totalRevenue = events.reduce((acc, curr) => acc + (curr.status === EventStatus.CONFIRMED || curr.status === EventStatus.COMPLETED ? curr.financials.grossValue : 0), 0);
    const totalNet = events.reduce((acc, curr) => acc + (curr.status === EventStatus.CONFIRMED || curr.status === EventStatus.COMPLETED ? curr.financials.netValue : 0), 0);
    const confirmedCount = events.filter(e => e.status === EventStatus.CONFIRMED).length;
    
    // Prepare Chart Data (Revenue by Month)
    const chartData = events.reduce((acc: any[], event) => {
      if (!event.date) return acc;
      const month = new Date(event.date).toLocaleString('pt-BR', { month: 'short' });
      const existing = acc.find(item => item.name === month);
      if (existing) {
        existing.value += event.financials.grossValue;
      } else {
        acc.push({ name: month, value: event.financials.grossValue });
      }
      return acc;
    }, []).slice(0, 6);

    return (
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-medium mb-2">Faturamento Total (Bruto)</h3>
            <p className="text-3xl font-bold text-white">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <DollarSign size={12}/> Confirmados & Completos
            </p>
          </div>
          
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-accent-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-medium mb-2">Lucro Líquido Estimado</h3>
            <p className="text-3xl font-bold text-white">R$ {totalNet.toLocaleString('pt-BR')}</p>
             <p className="text-xs text-slate-500 mt-2">Após comissões e impostos</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-medium mb-2">Shows Confirmados</h3>
            <p className="text-3xl font-bold text-white">{confirmedCount}</p>
            <p className="text-xs text-slate-500 mt-2">Próximos 30 dias</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-white font-semibold mb-6">Receita Mensal</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                   {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
           <h3 className="text-white font-semibold mb-4">Próximos Eventos</h3>
           <div className="space-y-3">
             {events.slice(0, 3).map(event => (
               <div key={event.id} onClick={() => openEdit(event)} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer">
                 <div className="flex items-center gap-4">
                   <div className="bg-slate-900 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-slate-800">
                     <span className="text-xs font-bold uppercase">{event.date ? new Date(event.date).toLocaleString('pt-BR', { month: 'short' }) : '--'}</span>
                     <span className="text-lg font-bold text-white">{event.date ? new Date(event.date).getDate() : '--'}</span>
                   </div>
                   <div>
                     <h4 className="text-white font-medium">{event.name}</h4>
                     <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12}/> {event.city}</p>
                   </div>
                 </div>
                 <StatusBadge status={event.status} />
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  const AgendaView = () => {
    // Sort and Filter
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
                <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Valor (Líq)</th>
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
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> {event.time}</span>
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
                      <span className="text-sm text-green-400 font-medium">R$ {event.financials.netValue.toLocaleString('pt-BR')}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEdit(event)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg">
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

  const BandManagerView = () => {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <h2 className="text-2xl font-bold text-white mb-6">Gerenciamento de Bandas & Usuários</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bands List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Music size={20} className="text-primary-500"/> Bandas</h3>
               <button className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors">+ Adicionar</button>
             </div>
             <div className="space-y-3">
               {bands.map(band => (
                 <div key={band.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-white font-medium">{band.name}</p>
                      <p className="text-xs text-slate-500">{band.genre} • {band.members} integrantes</p>
                    </div>
                 </div>
               ))}
               {bands.length === 0 && <p className="text-slate-500 text-sm">Nenhuma banda cadastrada.</p>}
             </div>
          </div>

          {/* Users List (Mock) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Users size={20} className="text-accent-500"/> Usuários</h3>
               <button className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors">+ Convidar</button>
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">A</div>
                    <div>
                      <p className="text-white font-medium text-sm">Admin (Você)</p>
                      <p className="text-xs text-slate-500">admin@dne.music</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">ADMIN</span>
               </div>
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
          <p className="text-slate-400 mb-8">Sistema de gestão artística e financeira.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-primary-600/20 group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" /> 
            Acessar Sistema
          </button>
          <p className="text-xs text-slate-600 mt-6">Modo Demo Local (Firebase Habilitado)</p>
        </div>
      </div>
    );
  }

  // State: Logged In
  return (
    <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView}>
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'agenda' && <AgendaView />}
      {currentView === 'bands' && <BandManagerView />}

      {isFormOpen && (
        <EventForm 
          bands={bands} 
          existingEvent={editingEvent}
          onSave={handleSaveEvent} 
          onClose={() => { setIsFormOpen(false); setEditingEvent(null); }} 
        />
      )}
    </Layout>
  );
};

export default App;