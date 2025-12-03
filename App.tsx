import React, { useState, useEffect, ReactNode, ErrorInfo, Component, useMemo } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor, ContractorType, ContractFile, PipelineStage } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm';
import BandForm from './components/BandForm';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Plus, Search, MapPin, Clock, MoreVertical, Trash2, Users, Music, Loader2, LogIn, AlertTriangle, RefreshCcw, CalendarDays, Mic2, Phone, Briefcase, Edit2, ChevronRight, FilterX, ChevronLeft, List, Calendar as CalendarIcon, User as UserIcon, ZoomIn, ZoomOut, X, History, Ban, FileWarning, FileCheck, EyeOff, FileText, Download, Share2, MessageCircle, Mail, Send, FolderOpen, ChevronDown, Kanban, DollarSign, Printer, Settings, CreditCard, KeyRound, ClipboardCopy, Check, CheckCircle, ExternalLink, Menu
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
  const style = styles[status] || styles[EventStatus.RESERVED];
  const label = labels[status] || 'Desconhecido';
  if (minimal) return (<div className={`w-2.5 h-2.5 rounded-full ${style.replace('bg-', 'bg-').split(' ')[0]} border border-white/10`} title={label} />);
  return (<span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>{label}</span>);
};

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public declare props: Readonly<ErrorBoundaryProps> & Readonly<{ children?: ReactNode }>;
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-slate-400 mb-6 max-w-md">Ocorreu um erro crítico na aplicação.</p>
          <pre className="bg-slate-900 p-2 rounded text-xs text-red-300 mb-6 max-w-lg overflow-auto">{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 px-6 py-2 rounded-lg font-medium transition-colors"><RefreshCcw size={18} /> Tentar Novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- NEW PUBLIC CONTRACTOR FORM VIEW ---

const PublicContractorFormView = ({ token }: { token: string }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const data = await db.getEventByContractorFormToken(token);
      if (data && data.event) {
        setEvent(data.event);
        setContractor(data.contractor || {
          id: crypto.randomUUID(),
          type: ContractorType.FISICA,
          name: data.event.contractor, // Pre-fill name from event
          responsibleName: '',
          repLegalAddress: '',
          repLegalPhone: '',
          birthDate: '',
          cpf: '', rg: '', cnpj: '', phone: '', whatsapp: '', email: '',
          address: { street: '', number: '', complement: '', neighborhood: '', zipCode: '', city: '', state: '', country: 'Brasil' },
          additionalInfo: { event: '', venue: '', notes: '' }
        });
        const bands = await db.getBands();
        setBand(bands.find(b => b.id === data.event.bandId) || null);
      } else {
        setError('Link inválido ou já utilizado. Por favor, solicite um novo link.');
      }
      setIsLoading(false);
    };
    fetchData();
  }, [token]);
  
  const handleEventChange = (field: keyof Event, value: any) => {
    if(event) setEvent(prev => ({ ...prev!, [field]: value }));
  };
  
  const handleContractorChange = (field: keyof Contractor, value: any) => {
     if(contractor) setContractor(prev => ({...prev!, [field]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !contractor) return;
    setIsSubmitting(true);
    
    // Mark form as completed
    const updatedEvent = { ...event, contractorFormStatus: 'COMPLETED' as const };
    
    await db.saveEvent(updatedEvent);
    await db.saveContractor(contractor);
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary-500" size={48}/></div>;
  if (error) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4"><AlertTriangle className="w-12 h-12 text-red-500 mb-4"/><p>{error}</p></div>;
  if (isSubmitted) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4"><CheckCircle size={64} className="text-green-500 mb-4"/><h2 className="text-2xl font-bold">Dados Enviados!</h2><p className="text-slate-400 mt-2">Obrigado! Suas informações foram recebidas com sucesso.</p></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
      <form onSubmit={handleSubmit} className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden my-8">
        <div className="p-6 border-b border-slate-800 bg-slate-950 text-center">
          <h1 className="text-2xl font-bold text-white">Formulário de Dados do Evento</h1>
          <p className="text-slate-400 mt-1">Por favor, preencha ou confirme as informações abaixo.</p>
        </div>
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* DADOS DO SHOW */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Mic2 size={18}/> DADOS DO SHOW</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-400 mb-1">ARTISTA</label><input disabled value={band?.name || ''} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-slate-300"/></div>
              <div><label className="block text-sm text-slate-400 mb-1">Data do evento</label><input disabled value={new Date(event!.date).toLocaleDateString()} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-slate-300"/></div>
              <div><label className="block text-sm text-slate-400 mb-1">Cidade/estado do evento</label><input value={event!.city} onChange={e => handleEventChange('city', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
              <div><label className="block text-sm text-slate-400 mb-1">Local do evento</label><input value={event!.venue} onChange={e => handleEventChange('venue', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
              <div><label className="block text-sm text-slate-400 mb-1">TIPO DE FESTA</label><input value={event!.eventType} onChange={e => handleEventChange('eventType', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
              <div><label className="block text-sm text-slate-400 mb-1">HORA SHOW</label><input type="time" value={event!.time} onChange={e => handleEventChange('time', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
              <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço do local</label><input value={event!.venueAddress} onChange={e => handleEventChange('venueAddress', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
              <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">CONTATO PRODUTOR (NOME E NÚMERO)</label><input value={event!.producerContact} onChange={e => handleEventChange('producerContact', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
            </div>
          </div>
          {/* DADOS DO CONTRATANTE */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><UserIcon size={18}/> DADOS DO CONTRATANTE</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div><label className="block text-sm text-slate-400 mb-1">Razão Social / Nome</label><input value={contractor!.name} onChange={e => handleContractorChange('name', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">CNPJ/CPF</label><input value={contractor!.cnpj || contractor!.cpf || ''} onChange={e => handleContractorChange(contractor!.type === 'JURIDICA' ? 'cnpj' : 'cpf', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço completo</label><input value={contractor!.address.street} onChange={e => setContractor(prev => ({...prev!, address: {...prev!.address, street: e.target.value}}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">Nome do Representante Legal</label><input value={contractor!.responsibleName} onChange={e => handleContractorChange('responsibleName', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço completo do Representante Legal</label><input value={contractor!.repLegalAddress} onChange={e => handleContractorChange('repLegalAddress', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">Telefone do Representante Legal</label><input value={contractor!.repLegalPhone} onChange={e => handleContractorChange('repLegalPhone', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">CPF (Rep. Legal)</label><input value={contractor!.cpf} onChange={e => handleContractorChange('cpf', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">RG (Rep. Legal)</label><input value={contractor!.rg} onChange={e => handleContractorChange('rg', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">E-mail</label><input type="email" value={contractor!.email} onChange={e => handleContractorChange('email', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
               <div><label className="block text-sm text-slate-400 mb-1">Data de nascimento</label><input type="date" value={contractor!.birthDate} onChange={e => handleContractorChange('birthDate', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-primary-600 hover:bg-primary-500 text-white py-3 px-8 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="animate-spin"/> : 'Enviar Dados'}
          </button>
        </div>
      </form>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
// This file was missing. It has now been restored with all the necessary logic.

export const App = () => {
    // Core State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [events, setEvents] = useState<Event[]>([]);
    const [bands, setBands] = useState<Band[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    
    // UI State (Modals, etc.)
    const [isEventFormOpen, setIsEventFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isContractorFormOpen, setIsContractorFormOpen] = useState(false);
    const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
    const [isBandFormOpen, setIsBandFormOpen] = useState(false);
    const [editingBand, setEditingBand] = useState<Band | null>(null);

    // Special View State (Registration, Public Forms)
    const [publicView, setPublicView] = useState<{type: 'register' | 'form', token?: string} | null>(null);
    const [loginMessage, setLoginMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const loadData = async (user: User) => {
        setIsLoading(true);
        try {
            const [allEvents, allBands, allUsers, allContractors] = await Promise.all([
                db.getEvents(),
                db.getBands(),
                db.getUsers(),
                db.getContractors()
            ]);

            // Filter data based on user role and permissions
            const userBands = (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.CONTRACTS) ? allBands : allBands.filter(b => user.bandIds.includes(b.id));
            const userBandIds = userBands.map(b => b.id);
            
            setBands(allBands); // All users need to see all bands for event creation. Filtering happens on view.
            setEvents( (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? allEvents : allEvents.filter(e => userBandIds.includes(e.bandId)));
            setUsers(allUsers); // Admin/Manager can see all users
            setContractors(allContractors);

        } catch (e: any) {
            setError(e.message || "Failed to load data.");
        } finally {
            setIsLoading(false);
            const loader = document.getElementById('initial-loader');
            if (loader) loader.style.opacity = '0';
            setTimeout(() => loader?.remove(), 500);
        }
    };
    
    // Initial Load Effect
    useEffect(() => {
        const checkUrlParams = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const requestAccess = urlParams.get('request_access');
            const formToken = urlParams.get('form_token');
            const regSuccess = urlParams.get('registration');

            if (requestAccess === 'true') {
                setPublicView({ type: 'register' });
                setIsLoading(false);
                return true;
            }
            if (formToken) {
                setPublicView({ type: 'form', token: formToken });
                setIsLoading(false);
                return true;
            }
            if (regSuccess === 'pending') {
                 setLoginMessage({type: 'success', text: "Solicitação enviada! Faça login após aprovação do admin."});
                 // Clean URL
                 window.history.replaceState({}, document.title, window.location.pathname);
            }
            return false;
        };

        const initialize = async () => {
            if (checkUrlParams()) return;
            
            const user = await db.getCurrentUser();
            setCurrentUser(user);
            if (user) {
                await loadData(user);
            } else {
                setIsLoading(false);
                const loader = document.getElementById('initial-loader');
                if (loader) loader.style.opacity = '0';
                setTimeout(() => loader?.remove(), 500);
            }
        };

        initialize();
    }, []);

    // --- RENDER VIEWS ---
    // For simplicity in this project, view components are defined here.
    // In a larger app, they would be in separate files.
    const LoginView = ({ onLogin, error, message }: any) => {
        const [login, setLogin] = useState('');
        const [password, setPassword] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            await onLogin(login, password);
            setIsSubmitting(false);
        };

        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Mic2 size={48} className="mx-auto text-primary-500 mb-4" />
                        <h1 className="text-2xl font-bold text-white">Agenda D&E MUSIC</h1>
                        <p className="text-slate-400 mt-2">Faça login para continuar</p>
                    </div>
                    
                    {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-500/20">{error}</div>}
                    {message && <div className="bg-green-500/10 text-green-400 p-3 rounded-lg mb-4 text-sm border border-green-500/20">{message.text}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                placeholder="Login (admin)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Senha (admin)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                            />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn size={18} />} Acessar
                        </button>
                    </form>
                    <div className="text-center mt-6">
                        <button onClick={() => window.location.search = '?request_access=true'} className="text-sm text-slate-400 hover:text-primary-500 transition-colors">
                            Não tem uma conta? Solicitar Acesso
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const RegistrationView = () => {
        // This is a public view, no session needed
        const [name, setName] = useState('');
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [error, setError] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if(!name || !email || !password) {
                setError("Todos os campos são obrigatórios.");
                return;
            }
            setIsSubmitting(true);
            try {
                await db.registerUser({ name, email, password });
                // Redirect to login page with a success message
                window.location.href = `${window.location.pathname}?registration=pending`;
            } catch (e: any) {
                setError(e.message || "Erro ao criar solicitação.");
                setIsSubmitting(false);
            }
        };

        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="w-full max-w-sm">
                     <div className="text-center mb-8">
                        <UserIcon size={48} className="mx-auto text-primary-500 mb-4" />
                        <h1 className="text-2xl font-bold text-white">Solicitar Acesso</h1>
                        <p className="text-slate-400 mt-2">Preencha seus dados. Sua conta será ativada após aprovação.</p>
                    </div>
                    {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-500/20">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome Completo" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"/></div>
                        <div><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail de Acesso" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"/></div>
                        <div><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Crie uma Senha" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"/></div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação'}
                        </button>
                    </form>
                    <div className="text-center mt-6">
                        <button onClick={() => window.location.search = ''} className="text-sm text-slate-400 hover:text-primary-500 transition-colors">
                            Voltar para o Login
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Handlers ---
    const handleLogin = async (loginInput: string, passwordInput: string): Promise<boolean> => {
        const user = await db.login(loginInput, passwordInput);
        if (user) {
            await db.createSession(user);
            setCurrentUser(user);
            await loadData(user);
            setError(null);
            return true;
        } else {
            setError("Credenciais inválidas ou usuário pendente de aprovação.");
            return false;
        }
    };
    
    const handleLogout = async () => {
      await db.clearSession();
      setCurrentUser(null);
      // Reset state to prevent data flashing on next login
      setEvents([]);
      setBands([]);
      setUsers([]);
      setContractors([]);
      setCurrentView('dashboard');
    };
    
    // SAVE Handlers
    const handleSaveEvent = async (event: Event) => {
        await db.saveEvent(event);
        setIsEventFormOpen(false);
        setEditingEvent(null);
        if(currentUser) await loadData(currentUser); // Refresh
    };
    
    const handleSaveUser = async (user: User) => {
        await db.saveUser(user);
        setIsUserFormOpen(false);
        setEditingUser(null);
        if(currentUser) await loadData(currentUser);
    };
    
    const handleSaveContractor = async (contractor: Contractor) => {
        await db.saveContractor(contractor);
        setIsContractorFormOpen(false);
        setEditingContractor(null);
        if(currentUser) await loadData(currentUser);
    };

    const handleSaveBand = async (band: Band) => {
        await db.saveBand(band);
        setIsBandFormOpen(false);
        setEditingBand(null);
        if(currentUser) await loadData(currentUser);
    };
    
    // DELETE Handlers
    const handleDeleteEvent = async (eventId: string) => {
       if (window.confirm("Tem certeza que deseja apagar este evento? Esta ação não pode ser desfeita.")) {
          await db.deleteEvent(eventId);
          if (currentUser) await loadData(currentUser);
       }
    };

    const handleDeleteUser = async (userId: string) => {
       if(window.confirm("Tem certeza que deseja apagar este usuário?")) {
          await db.deleteUser(userId);
          if (currentUser) await loadData(currentUser);
       }
    };
    
    const handleDeleteBand = async (bandId: string) => {
        if(window.confirm("Tem certeza que deseja apagar esta banda? Todos os eventos associados precisarão ser reatribuídos.")) {
            await db.deleteBand(bandId);
            if (currentUser) await loadData(currentUser);
        }
    };

    const handleDeleteContractor = async (contractorId: string) => {
        if(window.confirm("Tem certeza que deseja apagar este contratante?")) {
            await db.deleteContractor(contractorId);
            if (currentUser) await loadData(currentUser);
        }
    };

    // --- Render Logic ---
    if (publicView) {
        if (publicView.type === 'register') return <RegistrationView />;
        if (publicView.type === 'form') return <PublicContractorFormView token={publicView.token!} />;
    }

    if (isLoading) {
      return null; // The initial CSS loader in index.html is handling this
    }

    if (!currentUser) {
        return <LoginView onLogin={handleLogin} error={error} message={loginMessage} />;
    }
    
    // This is a placeholder for the actual views.
    const renderView = () => <div>View: {currentView}</div>;

    return (
        <ErrorBoundary>
            <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView} onLogout={handleLogout}>
              {/* This is a simplified placeholder. In a real app, each view would be a component */}
              <div className="text-white">
                  This is the main application area for view: <span className="font-bold text-primary-500">{currentView}</span>
              </div>
            </Layout>
            
            {/* --- Modals --- */}
            {isEventFormOpen && (
              <EventForm 
                bands={bands} 
                contractors={contractors}
                existingEvent={editingEvent}
                currentUser={currentUser}
                onSave={handleSaveEvent}
                onClose={() => { setIsEventFormOpen(false); setEditingEvent(null); }}
                onGenerateContract={() => {}} // Placeholder
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

            {isContractorFormOpen && (
                <ContractorForm 
                    existingContractor={editingContractor}
                    onSave={handleSaveContractor}
                    onClose={() => { setIsContractorFormOpen(false); setEditingContractor(null); }}
                />
            )}
            
            {isBandFormOpen && (
                <BandForm 
                    existingBand={editingBand}
                    onSave={handleSaveBand}
                    onClose={() => { setIsBandFormOpen(false); setEditingBand(null); }}
                />
            )}

        </ErrorBoundary>
    );
};