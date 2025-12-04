import React, { useState, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor, ContractorType, ContractFile, PipelineStage } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm';
import BandForm from './components/BandForm';
import ImportModal from './components/ImportModal'; // Import the new modal
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  FileCheck,
  EyeOff,
  FileText,
  Download,
  Share2,
  MessageCircle,
  Mail,
  Send,
  FolderOpen,
  ChevronDown,
  Kanban,
  DollarSign,
  Printer,
  Settings,
  CreditCard,
  KeyRound,
  ClipboardCopy,
  Check,
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  UploadCloud, // Added for the import button
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

  if (minimal) {
    return (
       <div className={`w-2.5 h-2.5 rounded-full ${style.replace('bg-', 'bg-').split(' ')[0]} border border-white/10`} title={label} />
    );
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
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
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  
  public declare props: Readonly<ErrorBoundaryProps> & Readonly<{ children?: ReactNode }>;

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

// --- Mask Helpers for Public Form ---
const maskCNPJ = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
const maskCPF = (value: string) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1').substring(0, 14);
const maskPhone = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15);

// --- NEW PUBLIC PROSPECTING FORM VIEW ---
const PublicProspectingFormView = ({ token, dbService }: { token: string, dbService: typeof db }) => {
    const [isValidToken, setIsValidToken] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for the new Contractor data
    const [contractorData, setContractorData] = useState<Omit<Contractor, 'id'>>({
        type: ContractorType.FISICA, name: '', responsibleName: '', repLegalAddress: '', repLegalPhone: '', birthDate: '', cpf: '', rg: '', cnpj: '', phone: '', whatsapp: '', email: '',
        address: { street: '', number: '', complement: '', neighborhood: '', zipCode: '', city: '', state: '', country: 'Brasil' },
        additionalInfo: { event: '', venue: '', notes: '' }
    });

    // State for the new Event data
    const [eventData, setEventData] = useState<Partial<Event>>({
       name: '', date: new Date().toISOString().split('T')[0], time: '21:00', city: '', venue: '', eventType: ''
    });
    const [bands, setBands] = useState<Band[]>([]);

    useEffect(() => {
        const checkToken = async () => {
            const valid = await dbService.validateProspectingToken(token);
            if (valid) {
                setIsValidToken(true);
                const allBands = await dbService.getBands();
                setBands(allBands);
                if(allBands.length > 0) {
                    setEventData(prev => ({...prev, bandId: allBands[0].id}));
                }
            } else {
                setError('Link de prospecção inválido ou já utilizado.');
            }
            setIsLoading(false);
        };
        checkToken();
    }, [token, dbService]);

    const handleContractorChange = (field: keyof Omit<Contractor, 'id'>, value: string) => {
        let formattedValue = value;
        if (field === 'phone' || field === 'whatsapp' || field === 'repLegalPhone') formattedValue = maskPhone(value);
        if (field === 'cpf') formattedValue = maskCPF(value);
        if (field === 'cnpj') formattedValue = maskCNPJ(value);
        setContractorData(prev => ({...prev, [field]: formattedValue}));
    };
    const handleAddressChange = (field: keyof Contractor['address'], value: string) => {
        setContractorData(prev => ({...prev, address: {...prev.address, [field]: value}}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventData.bandId) {
            alert("Por favor, selecione um artista.");
            return;
        }
        setIsSubmitting(true);
        try {
            await dbService.createProspectAndEvent({ contractor: contractorData, event: eventData });
            await dbService.invalidateProspectingToken(token);
            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao enviar a solicitação.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary-500" size={48}/></div>;
    if (!isValidToken || error) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4"><AlertTriangle className="w-12 h-12 text-red-500 mb-4"/><p>{error}</p></div>;
    if (isSubmitted) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4"><CheckCircle size={64} className="text-green-500 mb-4"/><h2 className="text-2xl font-bold">Solicitação Enviada!</h2><p className="text-slate-400 mt-2">Obrigado! Sua solicitação de evento foi recebida e entraremos em contato em breve.</p></div>;

    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
        <form onSubmit={handleSubmit} className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-800 bg-slate-950 text-center">
                <h1 className="text-2xl font-bold text-white">Solicitação de Novo Evento</h1>
                <p className="text-slate-400 mt-1">Preencha seus dados de contato e os detalhes do show desejado.</p>
            </div>
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* DADOS DO CONTRATANTE (DETAILED) */}
                <div>
                    <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><UserIcon size={18}/> DADOS DO CONTRATANTE</h3>
                    <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">Tipo de Cadastro</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-white"><input type="radio" name="type" checked={contractorData.type === 'FISICA'} onChange={() => setContractorData(p => ({...p, type: 'FISICA'}))} className="w-4 h-4 text-primary-600"/> Pessoa Física</label>
                                <label className="flex items-center gap-2 cursor-pointer text-white"><input type="radio" name="type" checked={contractorData.type === 'JURIDICA'} onChange={() => setContractorData(p => ({...p, type: 'JURIDICA'}))} className="w-4 h-4 text-primary-600"/> Pessoa Jurídica</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">{contractorData.type === 'FISICA' ? 'Nome Completo *' : 'Razão Social *'}</label><input required value={contractorData.name} onChange={e => handleContractorChange('name', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           {contractorData.type === 'FISICA' ? (
                                <>
                                <div><label className="block text-sm text-slate-400 mb-1">CPF *</label><input required value={contractorData.cpf} onChange={e => handleContractorChange('cpf', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                                <div><label className="block text-sm text-slate-400 mb-1">RG</label><input value={contractorData.rg} onChange={e => handleContractorChange('rg', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                                </>
                           ) : (
                                <div><label className="block text-sm text-slate-400 mb-1">CNPJ *</label><input required value={contractorData.cnpj} onChange={e => handleContractorChange('cnpj', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           )}
                           <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço Completo</label><input value={contractorData.address.street} onChange={e => handleAddressChange('street', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-300 mt-2 mb-2 border-t border-slate-700 pt-3">Representante Legal</label></div>
                           <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Nome do Representante</label><input value={contractorData.responsibleName} onChange={e => handleContractorChange('responsibleName', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço do Representante</label><input value={contractorData.repLegalAddress} onChange={e => handleContractorChange('repLegalAddress', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div><label className="block text-sm text-slate-400 mb-1">Telefone do Representante</label><input value={contractorData.repLegalPhone} onChange={e => handleContractorChange('repLegalPhone', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-300 mt-2 mb-2 border-t border-slate-700 pt-3">Contato Principal</label></div>
                           <div><label className="block text-sm text-slate-400 mb-1">E-mail *</label><input type="email" required value={contractorData.email} onChange={e => handleContractorChange('email', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div><label className="block text-sm text-slate-400 mb-1">Telefone Principal (WhatsApp) *</label><input required value={contractorData.phone} onChange={e => handleContractorChange('phone', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                           <div><label className="block text-sm text-slate-400 mb-1">Data de Nascimento</label><input type="date" value={contractorData.birthDate} onChange={e => handleContractorChange('birthDate', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                        </div>
                    </div>
                </div>
                {/* DADOS DO SHOW */}
                <div>
                    <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Mic2 size={18}/> DADOS DO SHOW</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">ARTISTA *</label>
                            <select value={eventData.bandId || ''} onChange={e => setEventData(prev => ({...prev, bandId: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white">
                                {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-sm text-slate-400 mb-1">Data do evento *</label><input type="date" required value={eventData.date} onChange={e => setEventData(prev => ({...prev, date: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                        <div><label className="block text-sm text-slate-400 mb-1">Cidade/estado do evento *</label><input required value={eventData.city} onChange={e => setEventData(prev => ({...prev, city: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                        <div><label className="block text-sm text-slate-400 mb-1">Local do evento</label><input value={eventData.venue} onChange={e => setEventData(prev => ({...prev, venue: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                        <div><label className="block text-sm text-slate-400 mb-1">Tipo de Festa</label><input value={eventData.eventType} onChange={e => setEventData(prev => ({...prev, eventType: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                        <div><label className="block text-sm text-slate-400 mb-1">Hora do Show</label><input type="time" value={eventData.time} onChange={e => setEventData(prev => ({...prev, time: e.target.value}))} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-primary-600 hover:bg-primary-500 text-white py-3 px-8 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin"/> : 'Enviar Solicitação'}
                </button>
            </div>
        </form>
      </div>
    );
};


// --- Contract Generator Modal (UPDATED TO MODEL) ---
interface Installment {
    value: number;
    date: string;
}

const ContractGeneratorModal = ({ event, contractors, bands, onClose }: { event: Event, contractors: Contractor[], bands: Band[], onClose: () => void }) => {
   const contractor = contractors.find(c => c.name === event.contractor);
   
   // --- Configuration State ---
   const [step, setStep] = useState<'config' | 'preview'>('config');
   
   // Default Data (placeholder)
   const [contractedData, setContractedData] = useState({
       razSocial: 'DAVIZAO PRODUCOES ARTISTICAS E EVENTOS LTDA',
       cnpj: '53.318.815/0001-80',
       address: 'AV WASHINGTON SOARES, 55. SALA 307 CEP: 60.811-341 EDSON QUEIROZ FORTALEZA/CE',
       repLegal: 'CAIO MACHADO VERISSIMO PINTO',
       cpf: '059.288.663-80',
       rg: '2004010341912',
       email: '85 9745-5751', 
       phone: '85 9745-5751'
   });

   const [bankData, setBankData] = useState({
       bank: 'ITAÚ',
       agency: '8142',
       account: '98803-2',
       favored: 'DAVIZAO PRODUCOES ARTISTICAS',
       cnpj: '53.318.815/0001-80',
       pix: '53318815000180'
   });

   // On Mount: Try to pull data from the specific Band
   useEffect(() => {
      const band = bands.find(b => b.id === event.bandId);
      if (band) {
          if (band.legalDetails && band.legalDetails.razSocial) {
              setContractedData({
                  razSocial: band.legalDetails.razSocial,
                  cnpj: band.legalDetails.cnpj,
                  address: band.legalDetails.address,
                  repLegal: band.legalDetails.repLegal,
                  cpf: band.legalDetails.cpfRep,
                  rg: band.legalDetails.rgRep,
                  email: band.legalDetails.email,
                  phone: band.legalDetails.phone
              });
          }
          if (band.bankDetails && band.bankDetails.bank) {
              setBankData({
                  bank: band.bankDetails.bank,
                  agency: band.bankDetails.agency,
                  account: band.bankDetails.account,
                  favored: band.bankDetails.favored,
                  cnpj: band.bankDetails.cnpj,
                  pix: band.bankDetails.pix
              });
          }
      }
   }, [event.bandId, bands]);

   // Installments Logic
   const [installments, setInstallments] = useState<Installment[]>([]);

   useEffect(() => {
       // Default logic: 2 installments (50/50)
       const total = event.financials.grossValue;
       if (total > 0) {
           const half = total / 2;
           setInstallments([
               { value: half, date: new Date().toISOString().split('T')[0] }, // Today
               { value: half, date: event.date.split('T')[0] } // Event day
           ]);
       }
   }, [event]);

   const handleInstallmentChange = (index: number, field: keyof Installment, value: any) => {
       const newInst = [...installments];
       newInst[index] = { ...newInst[index], [field]: value };
       setInstallments(newInst);
   };

   const addInstallment = () => {
       setInstallments([...installments, { value: 0, date: '' }]);
   };

   const removeInstallment = (index: number) => {
       setInstallments(installments.filter((_, i) => i !== index));
   };

   const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

   const handlePrint = () => {
      const printContent = document.getElementById('contract-preview');
      if (printContent) {
          const win = window.open('', '', 'width=900,height=800');
          if (win) {
              win.document.write(`
                  <html>
                    <head>
                        <title>Contrato - ${event.name}</title>
                        <style>
                           @page { margin: 2cm; size: A4; }
                           body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #000; padding: 20px; }
                           
                           /* Tables */
                           table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; }
                           th, td { border: 1px solid #000; padding: 4px 8px; vertical-align: top; text-align: left; }
                           th { background-color: #000; color: #fff; font-weight: bold; text-transform: uppercase; }
                           .table-header-black { background-color: #000; color: #fff; font-weight: bold; text-align: center; }
                           
                           /* Typography */
                           h1, h2, h3 { text-align: center; font-weight: bold; text-transform: uppercase; margin: 15px 0; font-size: 12pt; }
                           .contract-title { text-decoration: underline; margin-bottom: 20px; }
                           p { margin-bottom: 10px; text-align: justify; }
                           .clause-title { font-weight: bold; text-decoration: underline; }
                           
                           /* Specific Helpers */
                           .no-border { border: none; }
                           .text-center { text-align: center; }
                           .bold { font-weight: bold; }
                           .uppercase { text-transform: uppercase; }
                           .signature-box { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                           .sig-line { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px; font-size: 10pt; }
                           
                           /* Bank Table Styling specifically */
                           .bank-table td:first-child { background-color: #000; color: #fff; font-weight: bold; width: 30%; }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                    </body>
                  </html>
              `);
              win.document.close();
              win.focus();
              setTimeout(() => {
                  win.print();
                  win.close();
              }, 500);
          }
      }
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
         <div className="bg-slate-100 text-black w-full max-w-5xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
             
             {/* Header */}
             <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-white rounded-t-xl shrink-0">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                     <FileText className="text-primary-600"/> Gerador de Contrato
                 </h3>
                 <div className="flex gap-2">
                    {step === 'preview' && (
                        <button onClick={() => setStep('config')} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700">
                            Voltar para Configuração
                        </button>
                    )}
                    <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500"/></button>
                 </div>
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-y-auto bg-gray-100 flex">
                 
                 {/* STEP 1: CONFIGURATION */}
                 {step === 'config' && (
                     <div className="w-full max-w-3xl mx-auto p-8 space-y-6">
                         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CreditCard size={20}/> Configurar Pagamento (Cláusula 2)</h4>
                             <p className="text-sm text-gray-500 mb-4">Valor Total: <span className="font-bold text-green-600">{formatMoney(event.financials.grossValue)}</span></p>
                             
                             <div className="space-y-2">
                                 {installments.map((inst, idx) => (
                                     <div key={idx} className="flex gap-2 items-center">
                                         <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                                         <div className="flex-1">
                                             <label className="text-xs text-gray-500 block">Valor</label>
                                             <input 
                                                type="number" 
                                                value={inst.value} 
                                                onChange={e => handleInstallmentChange(idx, 'value', parseFloat(e.target.value))}
                                                className="w-full p-2 border rounded bg-gray-50"
                                             />
                                         </div>
                                         <div className="flex-1">
                                             <label className="text-xs text-gray-500 block">Data Pagamento</label>
                                             <input 
                                                type="date" 
                                                value={inst.date} 
                                                onChange={e => handleInstallmentChange(idx, 'date', e.target.value)}
                                                className="w-full p-2 border rounded bg-gray-50"
                                             />
                                         </div>
                                         <button onClick={() => removeInstallment(idx)} className="mt-4 p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                     </div>
                                 ))}
                                 <button onClick={addInstallment} className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1 mt-2">
                                     <Plus size={14}/> Adicionar Parcela
                                 </button>
                                 
                                 <div className="mt-2 text-right text-xs text-gray-500">
                                     Soma Parcelas: {formatMoney(installments.reduce((a, b) => a + (b.value || 0), 0))}
                                 </div>
                             </div>
                         </div>

                         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={20}/> Dados da Contratada & Banco</h4>
                             <p className="text-xs text-gray-500 mb-3">Estes dados foram puxados automaticamente da banda: <strong>{bands.find(b => b.id === event.bandId)?.name}</strong>.</p>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Razão Social Contratada</label>
                                     <input type="text" value={contractedData.razSocial} onChange={e => setContractedData({...contractedData, razSocial: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">CNPJ Contratada</label>
                                     <input type="text" value={contractedData.cnpj} onChange={e => setContractedData({...contractedData, cnpj: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Representante Legal</label>
                                     <input type="text" value={contractedData.repLegal} onChange={e => setContractedData({...contractedData, repLegal: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Chave PIX</label>
                                     <input type="text" value={bankData.pix} onChange={e => setBankData({...bankData, pix: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {/* STEP 2: PREVIEW HTML */}
                 <div className={`w-full bg-white p-12 shadow-inner overflow-y-auto ${step === 'config' ? 'hidden' : 'block'}`}>
                     <div id="contract-preview" className="max-w-[21cm] mx-auto bg-white text-black text-[11pt] leading-[1.4] font-sans">
                         
                         {/* HEADER LOGOS MOCK */}
                         <div className="flex justify-between items-center mb-8 px-4">
                             <div className="font-bold italic text-xl">D&E MUSIC</div>
                             <div className="font-black text-2xl tracking-tighter uppercase">{bands.find(b=>b.id === event.bandId)?.name || 'ARTISTA'}</div>
                             <div className="font-bold italic text-xl">D&E MUSIC</div>
                         </div>

                         <h1 className="contract-title">CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS</h1>

                         <div className="mb-6">
                             <div className="font-bold underline mb-2">IDENTIFICAÇÃO DAS PARTES:</div>
                             
                             {/* CONTRATANTE */}
                             <table className="mb-0">
                                 <thead>
                                     <tr><th colSpan={2} className="table-header-black">CONTRATANTE</th></tr>
                                 </thead>
                                 <tbody>
                                     <tr>
                                         <td className="font-bold w-[30%]">RAZÃO SOCIAL</td>
                                         <td className="uppercase">{contractor?.name || '____________________'}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">CPF/CNPJ</td>
                                         <td>{contractor?.type === 'JURIDICA' ? 'CNPJ' : 'CPF'}: {contractor?.type === 'JURIDICA' ? (contractor.cnpj || '_________________') : (contractor?.cpf || '_________________')}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">RG</td>
                                         <td>{contractor?.rg || '_________________'}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">ENDEREÇO</td>
                                         <td className="uppercase">
                                             {contractor?.address.street}, {contractor?.address.number} {contractor?.address.complement} - {contractor?.address.neighborhood} CEP: {contractor?.address.zipCode}
                                         </td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">TELEFONE:</td>
                                         <td>{contractor?.phone || contractor?.whatsapp}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">E-MAIL</td>
                                         <td>{contractor?.email}</td>
                                     </tr>
                                 </tbody>
                             </table>

                             {/* CONTRATADA */}
                             <table className="mt-0 border-t-0">
                                 <thead>
                                     <tr><th colSpan={2} className="table-header-black">CONTRATADA</th></tr>
                                 </thead>
                                 <tbody>
                                     <tr>
                                         <td className="font-bold w-[30%]">RAZÃO SOCIAL</td>
                                         <td className="uppercase">{contractedData.razSocial}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">CNPJ</td>
                                         <td>{contractedData.cnpj}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">ENDEREÇO</td>
                                         <td className="uppercase">{contractedData.address}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">REPRESENTANTE LEGAL</td>
                                         <td className="uppercase">{contractedData.repLegal}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">CPF</td>
                                         <td>{contractedData.cpf}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">RG</td>
                                         <td>{contractedData.rg}</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">E-MAIL/TEL</td>
                                         <td>{contractedData.email}</td>
                                     </tr>
                                 </tbody>
                             </table>
                         </div>

                         <p>
                             As partes acima identificadas têm, entre si, justas e acertadas o presente, CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS que acordam pelas cláusulas seguintes e pelas condições descritas no presente.
                         </p>

                         {/* CLAUSE 1 */}
                         <p>
                             <span className="clause-title">CLÁUSULA PRIMEIRA:</span> É objeto deste contrato, na condição de representante exclusivo do artista <span className="font-bold underline uppercase">{bands.find(b=>b.id === event.bandId)?.name}</span> a realização de uma apresentação artística nas cidades, datas e horários, conforme abaixo:
                         </p>

                         <table>
                             <thead>
                                 <tr>
                                     <th>CIDADE/UF</th>
                                     <th>DATA</th>
                                     <th>LOCAL</th>
                                     <th>DURAÇÃO</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 <tr>
                                     <td className="uppercase">{event.city}</td>
                                     <td>{new Date(event.date).toLocaleDateString('pt-BR')}</td>
                                     <td className="uppercase">{event.venue || 'A DEFINIR'}</td>
                                     <td className="uppercase">{event.durationHours} HORAS {event.durationHours % 1 !== 0 ? 'e 30 MINUTOS' : ''}</td>
                                 </tr>
                             </tbody>
                         </table>
                         <p className="text-sm italic mb-4">A que a data e o local acertados neste contrato não poderão ter modificação sem autorização da CONTRATADA.</p>

                         {/* CLAUSE 2 */}
                         <p>
                             <span className="clause-title">CLÁUSULA SEGUNDA:</span> Pelo cumprimento do exposto na Cláusula Primeira o <span className="font-bold">CONTRATANTE</span> pagará à <span className="font-bold">CONTRATADA</span>, um valor de <span className="font-bold">{formatMoney(event.financials.grossValue)}</span> de cachê livres de tributações, em moeda corrente nacional, sendo da seguinte forma:
                         </p>

                         <table>
                             <thead>
                                 <tr>
                                     <th>VALOR DA PARCELA</th>
                                     <th>DATA DO PAGAMENTO</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {installments.length > 0 ? installments.map((inst, idx) => (
                                     <tr key={idx}>
                                         <td>{formatMoney(inst.value)}</td>
                                         <td>{inst.date ? new Date(inst.date).toLocaleDateString('pt-BR') : '___/___/____'}</td>
                                     </tr>
                                 )) : (
                                     <tr><td colSpan={2} className="text-center italic">À combinar</td></tr>
                                 )}
                             </tbody>
                         </table>

                         <p>
                            <span className="font-bold">PARÁGRAFO PRIMEIRO:</span> Os valores deverão ser pagos em moeda corrente ou em deposito bancário com os seguintes dados:
                         </p>

                         {/* BANK INFO */}
                         <table className="bank-table w-[80%] mx-auto">
                             <tbody>
                                 <tr>
                                     <td>BANCO:</td>
                                     <td className="uppercase">{bankData.bank}</td>
                                 </tr>
                                 <tr>
                                     <td>AGÊNCIA:</td>
                                     <td>{bankData.agency}</td>
                                 </tr>
                                 <tr>
                                     <td>CONTA CORRENTE:</td>
                                     <td>{bankData.account}</td>
                                 </tr>
                                 <tr>
                                     <td>FAVORECIDO:</td>
                                     <td className="uppercase">{bankData.favored}</td>
                                 </tr>
                                 <tr>
                                     <td>CNPJ:</td>
                                     <td>{bankData.cnpj}</td>
                                 </tr>
                                 <tr>
                                     <td>PIX:</td>
                                     <td>{bankData.pix}</td>
                                 </tr>
                             </tbody>
                         </table>

                         <p>
                            <span className="font-bold">PARÁGRAFO SEGUNDO:</span> A efetiva quitação de todo e qualquer pagamento das parcelas contidas no caput da presente cláusula ficará condicionado à apresentação, pela Contratante, através do endereço eletrônico “financeirobandas@demusic.com.br” de todos dos comprovantes de depósito ou transferência(s) bancária(s) realizadas na conta supramencionada, ou em outra conta corrente que venha a ser apontada pela CONTRATADA.
                         </p>

                         <p>
                             <span className="clause-title">CLÁUSULA TERCEIRA:</span> Caso as cláusulas primeira e segunda deste contrato não sejam cumpridas na íntegra pelo CONTRATANTE fica a CONTRATADA desobrigada do cumprimento das obrigações a ele(a) atinentes, podendo inclusive reagendar outro compromisso para a mesma data e horário, sem que haja ônus ou penalidade para o mesmo, ficando ainda no direito de cobrar judicialmente a devida indenização e quando for o caso as perdas e danos.
                         </p>

                         <p>
                            <span className="clause-title">CLÁUSULA QUARTA:</span> O preço estabelecido na cláusula segunda é livre de qualquer despesa, cabendo ao CONTRATANTE providenciar por sua inteira responsabilidade os equipamentos de sonorização, iluminação, led, palco, camarins, serviços, publicidade, segurança, taxas de direitos autorais (ECAD), Nota Contratual, ISS local e outros afins que se façam necessários à realização do espetáculo, bem como fica responsável pelo devido recolhimento de todos os impostos decorrentes da prestação de serviços ora contratada, sejam eles Federais, Estaduais e/ou Municipais.
                         </p>

                         <p>
                             <span className="font-bold">PARÁGRAFO PRIMEIRO:</span> O CONTRATANTE responderá isoladamente todos e quaisquer danos materiais e/ou morais aos artistas e a terceiros que decorram direta ou indiretamente do objeto deste contrato.
                         </p>

                         {/* ... MORE CLAUSES TEXT BLOCKS ... */}
                         <p>
                             <span className="clause-title">CLÁUSULA QUINTA – DO TRANSPORTE:</span> As despesas com transportes (aéreo e terrestre) para os músicos, equipe técnica e produção ficam por conta do CONTRATANTE, nas condições do flylist.
                             <span className="font-bold text-red-600"> {event.logistics.transport ? '' : 'NÃO SE APLICA A ESTE CONTRATO.'}</span>
                         </p>

                         <p>
                             <span className="clause-title">CLÁUSULA SEXTA – DA HOSPEDAGEM E ALIMENTAÇÃO:</span> O CONTRATANTE fornecerá à CONTRATADA, sob sua responsabilidade financeira, hospedagem para a banda e sua equipe que deverão ficar no mesmo hotel, sendo ele de boa qualidade, acomodados de acordo com o room list da banda.
                             <span className="font-bold text-red-600"> {event.logistics.hotel ? '' : 'NÃO SE APLICA A ESTE CONTRATO.'}</span>
                         </p>

                         <p>
                             <span className="clause-title">CLÁUSULA SÉTIMA – DA CORTESIA:</span> A CONTRATANTE deverá fornecer gratuitamente 30 (trinta) ingressos simples, 15 (quinze) ingressos para camarote e credenciais de acesso para a equipe.
                             <span className="font-bold text-red-600"> NÃO SE APLICA A ESTE CONTRATO.</span>
                         </p>
                         
                         <p>
                             <span className="clause-title">CLÁUSULA OITAVA – DA PRODUÇÃO:</span> O CONTRATANTE obriga-se a oferecer boas condições para melhor desempenho dos trabalhos da CONTRATADA, tais como: palco que comporte os equipamentos da banda, suprimento de energia elétrica suficiente para alimentação dos equipamentos de som e luz de qualidade e dentro das especificações técnicas (Rider).
                         </p>

                         <div className="mt-12 mb-8">
                             <p className="text-center font-bold">
                                 Fortaleza, CE {new Date().toLocaleDateString('pt-BR', {day: 'numeric', month: 'long', year: 'numeric'})}
                             </p>
                         </div>

                         {/* Signatures */}
                         <div className="signature-box">
                             <div className="sig-line">
                                 <span className="font-bold uppercase">{contractor?.name}</span><br/>
                                 {contractor?.type === 'JURIDICA' ? contractor.responsibleName : 'Contratante'}
                             </div>
                             <div className="sig-line">
                                 <span className="font-bold uppercase">{contractedData.razSocial}</span><br/>
                                 Contratada
                             </div>
                         </div>
                         
                     </div>
                 </div>

             </div>

             {/* Footer Actions */}
             <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 rounded-b-xl shrink-0">
                 {step === 'config' ? (
                     <button onClick={() => setStep('preview')} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 font-medium">
                         Visualizar Contrato <ChevronRight size={16}/>
                     </button>
                 ) : (
                    <>
                        <button onClick={() => setStep('config')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Voltar</button>
                        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-lg">
                            <Printer size={16}/> Imprimir / Salvar PDF
                        </button>
                    </>
                 )}
             </div>
         </div>
      </div>
   )
};

// --- Send Modal Component ---

const SendContractModal = ({ 
  event, 
  contractor, 
  onClose 
}: { 
  event: Event, 
  contractor?: Contractor, 
  onClose: () => void 
}) => {
  const [method, setMethod] = useState<'email' | 'whatsapp'>('email');

  const handleSend = () => {
    // List all files in the message body
    const fileList = event.contractFiles && event.contractFiles.length > 0 
        ? event.contractFiles.map(f => `- ${f.name}`).join('\n') 
        : (event.contractUrl ? `- ${event.contractUrl}` : 'Sem arquivos anexados');

    const messageBase = `Segue em anexo os documentos referentes ao evento ${event.name} do dia ${new Date(event.date).toLocaleDateString()}.\n\nArquivos:\n${fileList}`;

    if (method === 'email') {
      const subject = `Documentos: ${event.name}`;
      const body = `Olá ${contractor?.responsibleName || 'Responsável'},\n\n${messageBase}\n\nAtenciosamente,\n${event.createdBy}`;
      const mailtoLink = `mailto:${contractor?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    } else {
      const text = `Olá ${contractor?.responsibleName || ''}, ${messageBase}`;
      const phone = contractor?.whatsapp?.replace(/\D/g, '') || contractor?.phone?.replace(/\D/g, '') || '';
      const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(waLink, '_blank');
    }
    onClose();
    alert('Ação de envio iniciada na plataforma externa!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             <Share2 size={18} className="text-primary-500"/> Enviar Contrato
           </h3>
           <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-white"/></button>
        </div>
        <div className="p-6 space-y-4">
           <p className="text-sm text-slate-400">
             Selecione como deseja enviar os documentos de <strong>{event.name}</strong> para o contratante.
           </p>
           
           <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs text-slate-500 mb-2">
              <strong>Arquivos incluídos:</strong>
              <ul className="list-disc pl-4 mt-1">
                  {event.contractFiles.map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
           </div>

           <div className="flex flex-col gap-3">
             <button 
               onClick={() => setMethod('email')}
               className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${method === 'email' ? 'bg-primary-900/20 border-primary-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
             >
               <div className={`p-2 rounded-full ${method === 'email' ? 'bg-primary-500 text-white' : 'bg-slate-700'}`}>
                 <Mail size={18} />
               </div>
               <div className="text-left">
                 <div className="font-medium">E-mail</div>
                 <div className="text-xs opacity-70">{contractor?.email || 'Email não cadastrado'}</div>
               </div>
             </button>

             <button 
               onClick={() => setMethod('whatsapp')}
               className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${method === 'whatsapp' ? 'bg-green-900/20 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
             >
               <div className={`p-2 rounded-full ${method === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-slate-700'}`}>
                 <MessageCircle size={18} />
               </div>
               <div className="text-left">
                 <div className="font-medium">WhatsApp</div>
                 <div className="text-xs opacity-70">{contractor?.whatsapp || contractor?.phone || 'Telefone não cadastrado'}</div>
               </div>
             </button>
           </div>
        </div>
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
           <button 
             onClick={handleSend}
             className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
           >
             <Send size={16} /> Enviar Agora
           </button>
        </div>
      </div>
    </div>
  )
};

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // CSV Import state
  
  // Send Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedEventForSend, setSelectedEventForSend] = useState<Event | null>(null);

  // Contract Generator State
  const [isContractGeneratorOpen, setIsContractGeneratorOpen] = useState(false);
  const [eventForContract, setEventForContract] = useState<Event | null>(null);
  
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
  
  const [zoomPercent, setZoomPercent] = useState(100); 

  const [isLoading, setIsLoading] = useState(true);
  
  // PUBLIC VIEW STATE
  const [publicView, setPublicView] = useState<{type: 'register' | 'prospect', token?: string} | null>(null);
  
  // Role Checks
  const isViewer = currentUser?.role === UserRole.VIEWER;
  const isSales = currentUser?.role === UserRole.SALES;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isContracts = currentUser?.role === UserRole.CONTRACTS;
  const isSuperAdmin = currentUser?.email === 'admin';
  const canManageUsers = isAdmin || isContracts;

  // Prospecting Link Modal
  const [isProspectingLinkModalOpen, setIsProspectingLinkModalOpen] = useState(false);
  const [prospectingLink, setProspectingLink] = useState('');


  // Initial Load & Session/Registration Check
  useEffect(() => {
    const initApp = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const prospectToken = urlParams.get('prospect_token');
      const requestAccess = urlParams.get('request_access') === 'true';

      if (prospectToken) {
        setPublicView({ type: 'prospect', token: prospectToken });
        setIsLoading(false);
        return;
      }
      if (requestAccess) {
        setPublicView({ type: 'register' });
        setIsLoading(false);
        return;
      }

      const savedUser = await db.getCurrentUser();
      if (savedUser) {
        setCurrentUser(savedUser);
      }

      setIsLoading(false);

      const preloader = document.getElementById('initial-loader');
      if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.remove(), 500);
      }
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

  // --- Handlers: Login & Registration ---
  const handleLoginSubmit = async (email: string, pass: string) => {
    const user = await db.login(email, pass);
    if (user) {
      await db.createSession(user);
      setCurrentUser(user);
      setCurrentView('dashboard');
      return null;
    } else {
      return 'Credenciais inválidas ou conta pendente de aprovação.';
    }
  };
  
  const handleRegistrationSubmit = async (userData: Pick<User, 'name' | 'email' | 'password'>) => {
      await db.registerUser(userData);
      window.location.href = `${window.location.pathname}?registration=success`;
  };

  const handleLogout = async () => {
    await db.clearSession();
    setCurrentUser(null);
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
  
  const handleImportEvents = async (importedEvents: Omit<Event, 'id' | 'createdAt' | 'createdBy'>[]) => {
    if (!currentUser) return;
    for (const eventData of importedEvents) {
      const newEvent: Event = {
        ...eventData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name,
        // Fill in missing defaults if any
        financials: eventData.financials || { grossValue: 0, commissionType: 'FIXED', commissionValue: 0, taxes: 0, netValue: 0, currency: 'BRL', notes: '' },
        logistics: eventData.logistics || { transport: '', departureTime: '', returnTime: '', hotel: '', flights: '', crew: '', rider: '', notes: '' },
        pipelineStage: eventData.pipelineStage || PipelineStage.LEAD,
        hasContract: false,
        contractFiles: [],
      } as Event;
      await db.saveEvent(newEvent);
    }
    await refreshData();
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento permanentemente?')) {
      await db.deleteEvent(id);
      refreshData();
    }
  };

  const openEditEvent = (event: Event) => {
    if (isViewer) return; // Viewers can't edit
    setEditingEvent(event);
    setNewEventDate('');
    setIsFormOpen(true);
  };

  const openContractGenerator = (event: Event) => {
     setEventForContract(event);
     setIsContractGeneratorOpen(true);
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
  
  const handleAddBand = () => {
      setEditingBand(null);
      setIsBandFormOpen(true);
  };

  const handleEditBand = (band: Band) => {
      setEditingBand(band);
      setIsBandFormOpen(true);
  };
  
  const handleDeleteBand = async (bandId: string) => {
    if (confirm('Tem certeza que deseja excluir esta banda? Esta ação não pode ser desfeita.')) {
      await db.deleteBand(bandId);
      refreshData();
    }
  };

  const handleSaveUser = async (user: User) => {
    const userToSave = { ...user };
    
    // On save from an edit form, if the user was pending, they become active.
    if (editingUser && editingUser.status === 'PENDING') {
      userToSave.status = 'ACTIVE';
    }

    await db.saveUser(userToSave);
    refreshData();
    setIsUserFormOpen(false);
    setEditingUser(null);
  }
  
  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.')) {
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

  const handleGenerateProspectingLink = async () => {
    const token = await db.generateProspectingToken();
    const link = `${window.location.origin}${window.location.pathname}?prospect_token=${token}`;
    setProspectingLink(link);
    setIsProspectingLinkModalOpen(true);
  };

  // --- Filter Logic based on User Role ---
  const getVisibleBands = () => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTS) return bands;
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

    // Logic for "Upcoming Events"
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = visibleEvents
       .filter(e => e.date >= today && e.status !== EventStatus.CANCELED)
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
       .slice(0, 5);

    // Stats visibility based on role
    const showFinancialStats = !isViewer && !isSales;

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Bandas Section */}
        <div>
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Music className="text-primary-500" /> Minhas Bandas
             </h2>
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
                   Você ainda não foi vinculado a nenhuma banda.
                 </p>
               )}
             </div>
           </div>
        </div>

        {/* Stats Row */}
        <div className={`grid grid-cols-2 ${showFinancialStats ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-slate-500 text-xs uppercase font-semibold">Total de Shows</p>
             <p className="text-2xl font-bold text-white mt-1">{visibleEvents.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
             <p className="text-green-500/80 text-xs uppercase font-semibold">Confirmados</p>
             <p className="text-2xl font-bold text-white mt-1">{confirmedCount}</p>
          </div>
          {showFinancialStats && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
               <p className="text-yellow-500/80 text-xs uppercase font-semibold">Reservados</p>
               <p className="text-2xl font-bold text-white mt-1">{reservedCount}</p>
            </div>
          )}
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
            {/* Últimas Adições - For Viewers, hide sensitive info */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <History className="text-primary-400" size={20} /> Últimas Atualizações
               </h3>
               <div className="space-y-3">
                 {latestEvents.length === 0 ? <p className="text-slate-500 text-sm">Nenhuma atividade recente.</p> : (
                   latestEvents.map(event => {
                     const band = bands.find(b => b.id === event.bandId);
                     const displayName = isViewer ? "Data Ocupada" : `${band?.name || 'Banda'} - ${event.name}`;
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 cursor-pointer transition-colors">
                          <div className="flex justify-between items-start">
                             <div>
                                <h4 className="text-white text-sm font-medium">{displayName}</h4>
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

            {/* Próximos Shows */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <CalendarDays className="text-green-400" size={20} /> Próximos Shows
               </h3>
               <div className="space-y-3">
                 {upcomingEvents.length === 0 ? <p className="text-slate-500 text-sm">Nenhum show próximo agendado.</p> : (
                   upcomingEvents.map(event => {
                     const band = bands.find(b => b.id === event.bandId);
                     const displayName = isViewer ? "Data Ocupada" : `${band?.name || 'Banda'} - ${event.name}`;
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900/50 rounded border border-green-900/20 hover:border-green-900/50 cursor-pointer transition-colors">
                          <div className="flex justify-between items-center">
                             <div>
                                <h4 className="text-white text-sm font-medium">{displayName}</h4>
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

  const PipelineView = () => {
    if (isViewer) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <Ban size={48} className="mb-4 text-slate-700"/>
                <p>Acesso restrito.</p>
            </div>
        )
    }

    const stages = Object.values(PipelineStage);
    const visibleEvents = getVisibleEvents();

    return (
        <div className="h-full flex flex-col pb-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Kanban className="text-primary-500" /> Pipeline de Vendas
                </h2>
                <div className="flex gap-2">
                  {!isViewer && (
                      <button 
                          onClick={() => { setEditingEvent(null); setNewEventDate(new Date().toISOString().split('T')[0]); setIsFormOpen(true); }}
                          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap"
                      >
                          <Plus size={18} /> Novo Evento
                      </button>
                  )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-[1200px]">
                    {stages.map(stage => {
                        const stageEvents = visibleEvents.filter(e => e.pipelineStage === stage);
                        const totalValue = stageEvents.reduce((acc, curr) => acc + curr.financials.grossValue, 0);

                        return (
                            <div key={stage} className="w-72 flex flex-col bg-slate-950 border border-slate-800 rounded-xl h-full">
                                <div className="p-3 border-b border-slate-800 bg-slate-900/50 rounded-t-xl shrink-0">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex justify-between">
                                        {stage === PipelineStage.LEAD ? 'Prospecção / Contato' : 
                                         stage === PipelineStage.QUALIFICATION ? 'Qualificação' :
                                         stage === PipelineStage.PROPOSAL ? 'Proposta' :
                                         stage === PipelineStage.NEGOTIATION ? 'Negociação' :
                                         stage === PipelineStage.CONTRACT ? 'Contrato' :
                                         stage === PipelineStage.WON ? 'Fechado' : 'Perdido'}
                                        <span className="text-slate-500 ml-2">{stageEvents.length}</span>
                                    </h3>
                                    <p className="text-xs text-primary-400 mt-1 font-medium">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)}
                                    </p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {stageEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            onClick={() => openEditEvent(event)}
                                            className="bg-slate-900 border border-slate-800 p-3 rounded-lg hover:border-primary-500/50 cursor-pointer shadow-sm group transition-all"
                                        >
                                            <div className="text-xs font-bold text-primary-400 mb-1">{bands.find(b=>b.id===event.bandId)?.name}</div>
                                            <div className="text-white font-medium text-sm mb-1">{event.name}</div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                                <span className="font-semibold text-slate-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(event.financials.grossValue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
  };

  const ContractsLibraryView = () => {
    if (!isAdmin && !isContracts) {
       return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
             <Ban size={48} className="mb-4 text-slate-700"/>
             <p>Acesso restrito a gestores de contratos.</p>
          </div>
       )
    }

    const eventsWithContracts = events.filter(e => 
      ((e.contractFiles && e.contractFiles.length > 0) || (e.contractUrl && e.contractUrl.trim() !== '')) &&
      (e.name.toLowerCase().includes(filterText.toLowerCase()) || 
       e.contractor.toLowerCase().includes(filterText.toLowerCase()))
    );

    const handleDownload = (event: Event, file: ContractFile) => {
      const content = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS\n\nEvento: ${event.name}\nData: ${new Date(event.date).toLocaleDateString()}\nContratante: ${event.contractor}\nLocal: ${event.venue || event.city}\n\nArquivo Original Referenciado: ${file.name}\nData Upload: ${new Date(file.uploadedAt).toLocaleString()}\n\n(Este arquivo foi gerado automaticamente pelo sistema)`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || `Contrato_${event.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    const openSendModal = (event: Event) => {
      setSelectedEventForSend(event);
      setIsSendModalOpen(true);
    };

    const bandsWithContracts = bands.filter(band => 
        eventsWithContracts.some(e => e.bandId === band.id)
    );

    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <FileText className="text-primary-500" /> Contratos Enviados
           </h2>
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar contrato..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
              />
           </div>
        </div>

        {eventsWithContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
                <FileText size={32} className="mb-2 opacity-50"/>
                <p>Nenhum contrato encontrado com os filtros atuais.</p>
            </div>
        ) : (
            <div className="space-y-8">
                {bandsWithContracts.map(band => {
                    const bandEvents = eventsWithContracts.filter(e => e.bandId === band.id);
                    if (bandEvents.length === 0) return null;

                    return (
                        <div key={band.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg animate-fade-in">
                           <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center gap-2">
                               <Music className="text-accent-500" size={20} />
                               <h3 className="text-white font-bold text-lg">{band.name}</h3>
                               <span className="text-slate-500 text-sm ml-2">({bandEvents.length} contratos)</span>
                           </div>

                           <div className="overflow-x-auto">
                             <table className="w-full text-left border-collapse">
                               <thead>
                                 <tr className="bg-slate-900/50 border-b border-slate-800">
                                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Evento</th>
                                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Contratante</th>
                                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Arquivos</th>
                                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800">
                                   {bandEvents.map(event => (
                                     <tr key={event.id} className="hover:bg-slate-900 transition-colors">
                                       <td className="p-4 align-top">
                                         <div className="text-white font-medium">{event.name}</div>
                                         <div className="text-xs text-slate-500">
                                           {new Date(event.date).toLocaleDateString()} • {event.city}
                                         </div>
                                       </td>
                                       <td className="p-4 align-top text-slate-400">
                                         {event.contractor || 'Não informado'}
                                       </td>
                                       <td className="p-4 align-top">
                                          <div className="flex flex-col gap-2">
                                             {event.contractFiles.map((file, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => handleDownload(event, file)}
                                                    className="flex items-center gap-2 text-sm text-primary-400 bg-primary-900/10 px-3 py-1 rounded-full w-fit hover:bg-primary-900/20 transition-colors text-left"
                                                    title="Clique para baixar"
                                                >
                                                    <FileText size={14} className="shrink-0"/>
                                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                                    <Download size={12} className="ml-1 opacity-50"/>
                                                </button>
                                             ))}
                                          </div>
                                       </td>
                                       <td className="p-4 align-top text-right">
                                          <div className="flex items-center justify-end">
                                             <button 
                                               onClick={() => openSendModal(event)}
                                               className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-700"
                                               title="Enviar via Plataforma"
                                             >
                                                <Share2 size={16} /> <span className="hidden md:inline">Enviar</span>
                                             </button>
                                          </div>
                                       </td>
                                     </tr>
                                   ))}
                               </tbody>
                             </table>
                           </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    );
  };

  const ContractorsView = () => {
     if (isViewer || isSales) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <Ban size={48} className="mb-4 text-slate-700"/>
                <p>Você não tem permissão para visualizar a lista de contratantes.</p>
            </div>
        )
     }

     const filtered = contractors.filter(c => 
       c.name.toLowerCase().includes(filterText.toLowerCase()) || 
       c.responsibleName.toLowerCase().includes(filterText.toLowerCase())
     );

     return (
       <div className="space-y-6 pb-20 md:pb-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="text-primary-500" /> Contratantes
              </h2>
              <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end">
                  {(isAdmin || isContracts) && (
                      <button 
                          onClick={handleGenerateProspectingLink}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700 whitespace-nowrap text-sm"
                      >
                          <LinkIcon size={16} /> Gerar Link de Prospecção
                      </button>
                  )}
                  <button 
                      onClick={() => { setEditingContractor(null); setIsContractorFormOpen(true); }}
                      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap text-sm"
                  >
                      <Plus size={18} /> Novo Contratante
                  </button>
              </div>
          </div>
          
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar contratantes..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-primary-500 transition-colors"
            />
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

                 <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
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

  const DayDetailsModal = () => {
    if (!selectedDateDetails) return null;
    
    // Parse date safely
    const [y, m, d] = selectedDateDetails.split('-');
    const dateObj = new Date(Number(y), Number(m)-1, Number(d));
    
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
                      {!isViewer && <p className="text-slate-600 text-xs mt-1">Toque em adicionar para criar um novo.</p>}
                   </div>
                )}
                
                {dayEvents.map(event => {
                   const band = bands.find(b => b.id === event.bandId);
                   const displayName = isViewer ? "Data Ocupada" : `${band?.name || 'Banda'} - ${event.name}`;
                   return (
                      <div 
                        key={event.id}
                        onClick={() => { setSelectedDateDetails(null); openEditEvent(event); }}
                        className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all cursor-pointer group relative"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                               <Clock size={10} /> {event.time}
                            </span>
                            <StatusBadge status={event.status} minimal />
                         </div>
                         <h4 className="text-white font-bold text-base mb-2">{displayName}</h4>
                         
                         <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                           {(event.venue || event.city) && (
                             <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded">
                                <MapPin size={12} /> 
                                {isViewer ? event.city : `${event.venue ? event.venue + ', ' : ''}${event.city}`}
                             </div>
                           )}
                           
                           {!isViewer && !event.hasContract && event.status !== EventStatus.CANCELED && (
                             <div className="flex items-center gap-1 bg-red-900/20 text-red-400 p-1.5 rounded border border-red-900/30">
                               <FileWarning size={12} /> Sem contrato
                             </div>
                           )}
                         </div>

                         {!isViewer && (
                            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-600 flex justify-between">
                                <span>Add: {event.createdBy}</span>
                                <span className="text-primary-400 group-hover:underline flex items-center gap-1">Editar <Edit2 size={10}/></span>
                            </div>
                         )}

                         {isSuperAdmin && (
                            <button
                                onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                                setSelectedDateDetails(null); // Close modal after delete
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-900/50 hover:bg-red-700 text-red-400 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir Permanentemente"
                            >
                                <Trash2 size={14} />
                            </button>
                         )}
                      </div>
                   )
                })}
             </div>

             {/* Footer - Hide "New Event" for Viewer */}
             {!isViewer && (
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
             )}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    let visibleEvents = getVisibleEvents();
    
    if (selectedBandFilter) {
      visibleEvents = visibleEvents.filter(e => e.bandId === selectedBandFilter);
    }

    const filteredEvents = visibleEvents.filter(e => 
      e.name.toLowerCase().includes(filterText.toLowerCase()) || 
      e.city.toLowerCase().includes(filterText.toLowerCase())
    );
    
    const selectedBandName = bands.find(b => b.id === selectedBandFilter)?.name;

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
      setSelectedDateDetails(dateStr);
    };

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0 max-h-[calc(100vh-100px)]">
        
        {/* Header da Agenda */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
               <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button onClick={() => setViewMode('calendar')} className={`p-2 rounded transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><CalendarIcon size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><List size={18} /></button>
               </div>

               {viewMode === 'calendar' && (
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><ChevronLeft size={18} /></button>
                  <div className="relative">
                     <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="px-3 py-1 font-semibold text-white w-32 text-center">
                        {monthNames[month]} {year}
                     </button>
                     {isMonthPickerOpen && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 rounded-lg shadow-xl z-10 p-2 grid grid-cols-3 gap-1">
                           {monthNames.map((mName, idx) => (
                              <button key={mName} onClick={() => { setCurrentMonth(new Date(year, idx, 1)); setIsMonthPickerOpen(false); }} className={`px-2 py-1 text-sm rounded ${idx === month ? 'bg-primary-600' : 'hover:bg-slate-800'}`}>{mName.substring(0,3)}</button>
                           ))}
                        </div>
                     )}
                  </div>
                  <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><ChevronRight size={18} /></button>
                </div>
               )}
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700 whitespace-nowrap text-sm"
                >
                  <UploadCloud size={16} /> Importar CSV
                </button>
                {!isViewer && (
                    <button 
                        onClick={() => { setEditingEvent(null); setNewEventDate(new Date().toISOString().split('T')[0]); setIsFormOpen(true); }}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap text-sm"
                    >
                        <Plus size={18} /> Novo Evento
                    </button>
                )}
            </div>
          </div>

          {(selectedBandFilter || filterText) && (
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              {selectedBandFilter && (
                <span className="text-xs font-medium text-white bg-primary-900/40 border border-primary-900 px-2 py-1 rounded-full flex items-center gap-1">
                  <Music size={12}/> {selectedBandName}
                </span>
              )}
              {filterText && (
                 <span className="text-xs font-medium text-white bg-slate-800 border border-slate-700 px-2 py-1 rounded-full flex items-center gap-1">
                   "{filterText}"
                 </span>
              )}
              <button 
                onClick={() => { setSelectedBandFilter(null); setFilterText(''); }} 
                className="ml-auto text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 text-xs flex items-center gap-1"
                title="Limpar filtros"
              >
                <FilterX size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {viewMode === 'calendar' ? (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => <div key={day} className="text-center text-xs text-slate-500 font-bold uppercase pb-2">{day}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: days }).map((_, i) => {
                  const dayNum = i + 1;
                  const d = String(dayNum).padStart(2, '0');
                  const m = String(month + 1).padStart(2, '0');
                  const dateStr = `${year}-${m}-${d}`;
                  const dayEvents = visibleEvents.filter(e => e.date && e.date.startsWith(dateStr));
                  const isToday = new Date().toISOString().startsWith(dateStr);

                  return (
                    <div 
                      key={dayNum} 
                      onClick={() => handleDayClick(dayNum)}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2 min-h-[110px] flex flex-col hover:border-slate-600 transition-all cursor-pointer relative"
                    >
                      <span className={`font-bold text-sm ${isToday ? 'text-primary-400' : 'text-slate-400'}`}>{dayNum}</span>
                      <div className="mt-1 flex-1 space-y-1">
                         {dayEvents.slice(0, 2).map(event => {
                             const band = bands.find(b => b.id === event.bandId);
                             const bgColor = event.status === EventStatus.CONFIRMED ? 'bg-green-600/50' : event.status === EventStatus.RESERVED ? 'bg-yellow-600/50' : 'bg-red-600/50';
                             return (
                                <div key={event.id} className={`${bgColor} text-white text-[10px] p-1 rounded truncate leading-tight`}>
                                   {isViewer ? 'Ocupado' : band?.name}
                                </div>
                             )
                         })}
                         {dayEvents.length > 2 && (
                            <div className="text-slate-500 text-[10px] p-1 rounded">+ {dayEvents.length - 2} mais</div>
                         )}
                      </div>
                    </div>
                  )
                })}
              </div>
           ) : (
             <div className="space-y-4">
               {filteredEvents.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                     <CalendarIcon size={48} className="mx-auto text-slate-700 mb-3" />
                     <p className="text-slate-400">Nenhum evento encontrado.</p>
                  </div>
               ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-900">
                          <tr>
                            <th className="p-3 text-xs text-slate-500 uppercase">Data</th>
                            <th className="p-3 text-xs text-slate-500 uppercase">Evento</th>
                            <th className="p-3 text-xs text-slate-500 uppercase hidden md:table-cell">Banda</th>
                            <th className="p-3 text-xs text-slate-500 uppercase hidden md:table-cell">Local</th>
                            <th className="p-3 text-xs text-slate-500 uppercase">Status</th>
                            <th className="p-3"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800">
                          {filteredEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                            <tr key={event.id} className="hover:bg-slate-900">
                               <td className="p-3 whitespace-nowrap">
                                  <div className="font-medium text-white">{new Date(event.date).toLocaleDateString('pt-BR')}</div>
                                  <div className="text-xs text-slate-500">{event.time}</div>
                               </td>
                               <td className="p-3">
                                  <div className="font-medium text-white">{isViewer ? "Data Ocupada" : event.name}</div>
                               </td>
                               <td className="p-3 text-slate-400 hidden md:table-cell">{bands.find(b=>b.id === event.bandId)?.name}</td>
                               <td className="p-3 text-slate-400 hidden md:table-cell">{event.venue}, {event.city}</td>
                               <td className="p-3"><StatusBadge status={event.status} /></td>
                               <td className="p-3 text-right">
                                  {!isViewer && <button onClick={() => openEditEvent(event)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16}/></button>}
                               </td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                  </div>
               )}
             </div>
           )}
        </div>
      </div>
    );
  };

  const BandsAndUsersView = () => {
    if (!isAdmin && !isContracts) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
          <Ban size={48} className="mb-4 text-slate-700"/>
          <p>Acesso restrito.</p>
        </div>
      )
    }

    const visibleBands = getVisibleBands();

    // Show pending users first
    const sortedUsers = [...users].sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-8 pb-20 md:pb-0">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Music className="text-primary-500" /> Bandas
            </h2>
            {isAdmin && (
              <button 
                onClick={handleAddBand}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus size={16} /> Nova Banda
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-800">
              {visibleBands.map(band => (
                <div key={band.id} className="p-4 flex justify-between items-center group">
                  <span className="font-medium text-white">{band.name}</span>
                  {isAdmin && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditBand(band)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded">
                        <Edit2 size={14} />
                      </button>
                       <button onClick={() => handleDeleteBand(band.id)} className="text-xs bg-slate-800 hover:bg-red-900/50 text-red-400 p-2 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-accent-500" /> Usuários
            </h2>
            {canManageUsers && (
              <button 
                onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}
                className="flex items-center gap-2 bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus size={16} /> Novo Usuário
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
             <div className="divide-y divide-slate-800">
                {sortedUsers.map(user => (
                   <div key={user.id} className={`p-4 flex justify-between items-center group ${user.status === 'PENDING' ? 'bg-yellow-900/20' : ''}`}>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="font-medium text-white">{user.name}</span>
                           {user.status === 'PENDING' && (
                              <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">PENDENTE</span>
                           )}
                        </div>
                        <span className="text-sm text-slate-500">{user.email} - <span className="capitalize">{user.role.toLowerCase()}</span></span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="hidden md:flex flex-wrap gap-1 justify-end max-w-xs">
                            {user.bandIds.map(bid => {
                               const b = bands.find(b=>b.id === bid);
                               return b ? <span key={bid} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{b.name}</span> : null;
                            })}
                         </div>
                         {canManageUsers && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditUser(user)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded">
                                <Edit2 size={14} />
                              </button>
                              {user.email !== 'admin' && (
                                <button onClick={() => handleDeleteUser(user.id)} className="text-xs bg-slate-800 hover:bg-red-900/50 text-red-400 p-2 rounded">
                                  <Trash2 size={14} />
                                </button>
                              )}
                          </div>
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
  
  // --- LOGIN VIEW ---
  const LoginView = ({ onLogin, onRegisterClick }: { onLogin: (e: string, p: string) => Promise<string | null>, onRegisterClick: () => void }) => {
    const [email, setLoginEmail] = useState('admin');
    const [password, setPassword] = useState('admin');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setIsLoggingIn(true);
      const error = await onLogin(email, password);
      if (error) {
        setLoginError(error);
      }
      setIsLoggingIn(false);
    };

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 mb-3">
                <Mic2 size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight text-center">
                Agenda D&E MUSIC
              </h1>
              <p className="text-slate-500 text-sm">Sistema de Gestão</p>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-6 text-center">Acessar Sistema</h2>
            {loginError && <p className="bg-red-500/10 text-red-400 border border-red-500/20 text-center text-sm p-3 rounded-lg mb-4">{loginError}</p>}
            
            <div className="mb-4">
              <label className="block text-slate-400 text-sm font-medium mb-1">Login</label>
              <input 
                type="text" 
                value={email} 
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none" 
              />
            </div>
            <div className="mb-6">
              <label className="block text-slate-400 text-sm font-medium mb-1">Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <><LogIn size={18}/> Entrar</>}
            </button>

            <div className="text-center mt-6">
               <button onClick={onRegisterClick} className="text-xs text-slate-500 hover:text-primary-400 underline">
                 Não tem acesso? Solicite aqui.
               </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- REGISTRATION VIEW ---
  const RegistrationView = ({ onRegister }: { onRegister: (userData: Pick<User, 'name' | 'email' | 'password'>) => Promise<void> }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setIsSubmitting(true);
       await onRegister({name, email, password});
       // The redirect is handled by the parent
    };

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
           <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
              <h2 className="text-lg font-semibold text-white mb-6 text-center">Solicitar Acesso</h2>
              <p className="text-sm text-slate-400 text-center mb-6">Seu acesso será liberado por um administrador após a solicitação.</p>
              <div className="mb-4"><label className="block text-slate-400 text-sm font-medium mb-1">Nome Completo</label><input type="text" value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-lg text-white border border-slate-700"/></div>
              <div className="mb-4"><label className="block text-slate-400 text-sm font-medium mb-1">E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-lg text-white border border-slate-700"/></div>
              <div className="mb-6"><label className="block text-slate-400 text-sm font-medium mb-1">Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-lg text-white border border-slate-700"/></div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Solicitar'}
              </button>
              <div className="text-center mt-6">
                 <a href={window.location.pathname} className="text-xs text-slate-500 hover:text-primary-400 underline">
                   Já tem acesso? Faça login.
                 </a>
              </div>
           </form>
        </div>
      </div>
    );
  };
  
  const RegistrationSuccessView = () => (
    <div className="flex items-center justify-center min-h-screen p-4 text-center">
       <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-sm">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Solicitação Enviada!</h2>
          <p className="text-sm text-slate-400 mb-6">Seu pedido de acesso foi recebido. Você será notificado por e-mail quando for aprovado por um administrador.</p>
          <a href={window.location.pathname} className="text-primary-400 font-medium underline">
             Voltar para o Login
          </a>
       </div>
    </div>
  );


  if (isLoading) {
    return null; // The preloader is handled by the initial HTML
  }

  // --- RENDER LOGIC ---

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans">
      <div id="initial-loader" className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center transition-opacity duration-500">
          <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-md">
                <Mic2 size={20} />
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">
                Agenda D&E MUSIC
              </h1>
          </div>
          <Loader2 size={24} className="animate-spin text-primary-500"/>
      </div>

      {!isLoading && !currentUser && publicView?.type === 'prospect' && publicView.token && <PublicProspectingFormView token={publicView.token} dbService={db} />}
      {!isLoading && !currentUser && publicView?.type === 'register' && <RegistrationView onRegister={handleRegistrationSubmit} />}
      {!isLoading && !currentUser && !publicView && (
        window.location.search.includes('registration=success')
          ? <RegistrationSuccessView />
          : <LoginView onLogin={handleLoginSubmit} onRegisterClick={() => setPublicView({ type: 'register' })} />
      )}
      {!isLoading && currentUser && (
        <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView} onLogout={handleLogout}>
          {/* Main content based on view */}
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'pipeline' && <PipelineView />}
          {currentView === 'agenda' && renderAgendaView()}
          {currentView === 'contractors' && <ContractorsView />}
          {currentView === 'contracts_library' && <ContractsLibraryView />}
          {currentView === 'bands' && <BandsAndUsersView />}
        </Layout>
      )}

      {/* Modals */}
      {isFormOpen && (
        <EventForm 
          bands={bands} 
          contractors={contractors}
          existingEvent={editingEvent} 
          currentUser={currentUser}
          initialDate={newEventDate}
          initialBandId={selectedBandFilter || undefined}
          onSave={handleSaveEvent}
          onGenerateContract={openContractGenerator}
          onClose={() => { setIsFormOpen(false); setEditingEvent(null); }}
        />
      )}
      {isContractorFormOpen && <ContractorForm existingContractor={editingContractor} onSave={handleSaveContractor} onClose={() => { setIsContractorFormOpen(false); setEditingContractor(null); }} />}
      {isUserFormOpen && <UserForm bands={bands} existingUser={editingUser} onSave={handleSaveUser} onClose={() => { setIsUserFormOpen(false); setEditingUser(null); }} />}
      {isBandFormOpen && <BandForm existingBand={editingBand} onSave={handleSaveBand} onClose={() => { setIsBandFormOpen(false); setEditingBand(null); }} />}
      {isContractGeneratorOpen && eventForContract && <ContractGeneratorModal event={eventForContract} contractors={contractors} bands={bands} onClose={() => setIsContractGeneratorOpen(false)} />}
      {isSendModalOpen && selectedEventForSend && <SendContractModal event={selectedEventForSend} contractor={contractors.find(c => c.name === selectedEventForSend.contractor)} onClose={() => setIsSendModalOpen(false)} />}
      {selectedDateDetails && <DayDetailsModal />}
      {isProspectingLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-slate-800 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl text-center p-8">
               <h3 className="text-xl font-bold text-white">Link de Prospecção</h3>
               <p className="text-slate-400 mt-2 mb-6">Envie este link para novos clientes solicitarem orçamentos. As informações serão adicionadas automaticamente ao seu pipeline.</p>
               <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-3">
                   <input type="text" readOnly value={prospectingLink} className="w-full bg-transparent text-slate-300 text-sm outline-none pr-12"/>
                   <button 
                       onClick={() => navigator.clipboard.writeText(prospectingLink)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white bg-slate-700 rounded"
                   >
                       <ClipboardCopy size={16}/>
                   </button>
               </div>
               <button onClick={() => setIsProspectingLinkModalOpen(false)} className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg font-medium">Fechar</button>
           </div>
        </div>
      )}
       {isImportModalOpen && currentUser && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportEvents}
          bands={bands}
          currentUser={currentUser}
        />
      )}
    </div>
  )
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

// FIX: Added default export for the App component
export default App;
