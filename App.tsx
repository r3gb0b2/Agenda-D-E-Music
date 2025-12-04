

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
  LayoutDashboard,
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
                                         <td className="font-bold">CONTATO</td>
                                         <td>{contractedData.phone} / {contractedData.email}</td>
                                     </tr>
                                 </tbody>
                             </table>
                         </div>

                         {/* CLAUSES */}
                         <p>As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Artísticos, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.</p>
                         
                         <h2 className="clause-title">DO OBJETO DO CONTRATO</h2>
                         <p><strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO, a apresentação artística musical da <strong>CONTRATADA</strong>, no evento denominado “<span className="uppercase bold">{event.name}</span>”, a ser realizado no dia <span className="bold">{new Date(event.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>, com início previsto para as <span className="bold">{event.time}</span> horas, com duração de <span className="bold">{event.durationHours}</span> horas, no seguinte endereço: <span className="uppercase bold">{event.venue}, {event.venueAddress}, {event.city}</span>.</p>
                         
                         <h2 className="clause-title">DO VALOR E FORMA DE PAGAMENTO</h2>
                         <p>
                             <strong>Cláusula 2ª.</strong> Pela prestação dos serviços artísticos, objeto deste contrato, a <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong> o valor total de <span className="uppercase bold">{formatMoney(event.financials.grossValue)}</span>, da seguinte forma:
                         </p>
                         <ul>
                             {installments.map((inst, idx) => (
                                 <li key={idx}>
                                     - <span className="bold">{formatMoney(inst.value)}</span> a ser pago até a data de <span className="bold">{new Date(inst.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>.
                                 </li>
                             ))}
                         </ul>
                         <p><strong>Parágrafo Único.</strong> O pagamento deverá ser efetuado através de depósito/transferência bancária ou PIX, nos seguintes dados:</p>
                         
                         <table className="bank-table">
                           <tbody>
                               <tr><td>BANCO:</td><td>{bankData.bank}</td></tr>
                               <tr><td>AGÊNCIA:</td><td>{bankData.agency}</td></tr>
                               <tr><td>CONTA CORRENTE:</td><td>{bankData.account}</td></tr>
                               <tr><td>FAVORECIDO:</td><td className="uppercase">{bankData.favored}</td></tr>
                               <tr><td>CNPJ:</td><td>{bankData.cnpj}</td></tr>
                               <tr><td>CHAVE PIX:</td><td>{bankData.pix}</td></tr>
                           </tbody>
                         </table>

                         <h2 className="clause-title">DAS OBRIGAÇÕES</h2>
                         <p><strong>Cláusula 3ª.</strong> Constituem obrigações da <strong>CONTRATANTE</strong>:</p>
                         <ol type="a" style={{paddingLeft: '20px'}}>
                             <li>Efetuar os pagamentos conforme Cláusula 2ª;</li>
                             <li>Disponibilizar palco e estrutura de som e luz, conforme Rider Técnico previamente enviado e aprovado pela <strong>CONTRATADA</strong>;</li>
                             <li>Providenciar camarim com alimentação e bebidas para a equipe;</li>
                             <li>Garantir a segurança da equipe e dos equipamentos da <strong>CONTRATADA</strong> no local do evento.</li>
                         </ol>
                         <p><strong>Cláusula 4ª.</strong> Constituem obrigações da <strong>CONTRATADA</strong>:</p>
                         <ol type="a" style={{paddingLeft: '20px'}}>
                              <li>Realizar a apresentação artística na data, horário e local estipulados;</li>
                              <li>Disponibilizar todos os músicos e equipe técnica necessários para a apresentação.</li>
                         </ol>
                         
                         <h2 className="clause-title">DA RESCISÃO</h2>
                         <p><strong>Cláusula 5ª.</strong> O presente contrato poderá ser rescindido por qualquer uma das partes, mediante comunicação por escrito com antecedência mínima de 30 dias. Em caso de descumprimento, a parte infratora arcará com multa de 50% do valor total do contrato.</p>
                         
                         <h2 className="clause-title">DO FORO</h2>
                         <p><strong>Cláusula 6ª.</strong> Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de {event.city.split('-')[0] || 'Fortaleza/CE'}.</p>
                         
                         <p>Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor, juntamente com 2 (duas) testemunhas.</p>
                         
                         <p className="text-center mt-8">{event.city.split('-')[0] || 'Fortaleza'}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                         
                         {/* SIGNATURES */}
                         <div className="signature-box">
                           <div className="sig-line">
                               <span className="uppercase bold">{contractedData.razSocial}</span><br/>
                               <span>CONTRATADA</span>
                           </div>
                           <div className="sig-line">
                               <span className="uppercase bold">{contractor?.name}</span><br/>
                               <span>CONTRATANTE</span>
                           </div>
                         </div>
                     </div>
                 </div>

             </div>

             {/* Footer Actions */}
             <div className="p-4 bg-white border-t border-gray-300 flex justify-end gap-3 shrink-0">
                 {step === 'config' && (
                     <button
                         onClick={() => setStep('preview')}
                         className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow"
                     >
                         <EyeOff size={18} /> Visualizar e Imprimir Contrato
                     </button>
                 )}
                 {step === 'preview' && (
                     <button
                         onClick={handlePrint}
                         className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow"
                     >
                         <Printer size={18} /> Imprimir Contrato
                     </button>
                 )}
             </div>
         </div>
      </div>
   );
};



const DayDetailsModal = ({ day, events, onEdit, onClose }: { day: Date, events: Event[], onEdit: (event: Event) => void, onClose: () => void }) => {
  const bandNames = new Map<string, string>(); // Assuming you pass bands to get names
  
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            Eventos de {day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nenhum evento para este dia.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-white">{event.name}</h4>
                  <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                    <MapPin size={12}/> {event.city} <span className="text-slate-600">•</span> <Clock size={12}/> {event.time}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={event.status} />
                  <button onClick={() => onEdit(event)} className="p-2 text-slate-500 hover:bg-slate-700 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                     <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};


// --- PUBLIC CONTRACTOR FORM VIEW ---
const PublicContractorFormView = ({ token, dbService }: { token: string, dbService: typeof db }) => {
    const [event, setEvent] = useState<Event | null>(null);
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [band, setBand] = useState<Band | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await dbService.getEventByContractorFormToken(token);
                if (data) {
                    setEvent(data.event);
                    setBand(data.band);
                    // Initialize form data with existing contractor data or defaults
                    setContractor(data.contractor || {
                        id: crypto.randomUUID(),
                        type: ContractorType.FISICA,
                        name: data.event.contractor,
                        responsibleName: '',
                        repLegalAddress: '',
                        repLegalPhone: '',
                        birthDate: '',
                        cpf: '', rg: '', cnpj: '',
                        phone: '', whatsapp: '', email: '',
                        address: { street: '', number: '', complement: '', neighborhood: '', zipCode: '', city: data.event.city, state: '', country: 'Brasil' },
                        additionalInfo: { event: data.event.name, venue: data.event.venue, notes: '' }
                    });
                } else {
                    setError('Link inválido ou expirado.');
                }
            } catch (err: any) {
                setError(err.message || 'Ocorreu um erro ao carregar os dados.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token, dbService]);

    const handleContractorChange = (field: keyof Contractor, value: string) => {
        if (!contractor) return;
        let formattedValue = value;
        if (field === 'phone' || field === 'whatsapp' || field === 'repLegalPhone') formattedValue = maskPhone(value);
        if (field === 'cpf') formattedValue = maskCPF(value);
        if (field === 'cnpj') formattedValue = maskCNPJ(value);
        setContractor({ ...contractor, [field]: formattedValue });
    };

    const handleAddressChange = (field: keyof Contractor['address'], value: string) => {
        if (!contractor) return;
        setContractor({ ...contractor, address: { ...contractor.address, [field]: value } });
    };
    
    const handleInfoChange = (field: keyof Contractor['additionalInfo'], value: string) => {
        if (!contractor) return;
        setContractor({ ...contractor, additionalInfo: { ...contractor.additionalInfo, [field]: value } });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractor || !event) return;
        setIsSubmitting(true);
        try {
            // Save the contractor data
            await dbService.saveContractor(contractor);
            
            // Update the event to mark the form as completed
            const updatedEvent = { ...event, contractorFormStatus: 'COMPLETED' as const };
            await dbService.saveEvent(updatedEvent);

            // Invalidate the token so it can't be used again
            await dbService.invalidateContractorFormToken(token);
            setIsSubmitted(true);
            
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar os dados.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary-500" size={48}/></div>;
    if (error) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4"><AlertTriangle className="w-12 h-12 text-red-500 mb-4"/><p>{error}</p></div>;
    if (!event || !contractor) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white">Evento não encontrado.</div>;
    
    if (isSubmitted) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white text-center p-4">
                <CheckCircle size={64} className="text-green-500 mb-4"/>
                <h2 className="text-2xl font-bold">Dados Enviados com Sucesso!</h2>
                <p className="text-slate-400 mt-2">Obrigado por completar as informações. Entraremos em contato em breve para finalizar os detalhes.</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden my-8">
                <div className="p-6 border-b border-slate-800 bg-slate-950">
                    <h1 className="text-2xl font-bold text-white">Preenchimento de Dados para Contrato</h1>
                    <p className="text-slate-400 mt-1">Olá, <span className="text-primary-400 font-bold">{event.contractor}</span>! Por favor, confirme e complete os dados abaixo para o evento com <span className="font-bold text-white">{band?.name}</span>.</p>
                </div>
                
                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* INFO EVENTO */}
                    <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                        <h3 className="text-lg font-medium text-white mb-2">Detalhes do Evento</h3>
                        <p className="text-slate-300"><strong>Evento:</strong> {event.name}</p>
                        <p className="text-slate-300"><strong>Data:</strong> {new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {event.time}</p>
                        <p className="text-slate-300"><strong>Local:</strong> {event.venue}, {event.city}</p>
                    </div>

                    {/* DADOS DO CONTRATANTE */}
                    <div>
                        <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-800 pb-2">Seus Dados de Contratante</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-400 mb-2 block">Tipo de Cadastro</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-white"><input type="radio" name="type" checked={contractor.type === 'FISICA'} onChange={() => setContractor({...contractor, type: 'FISICA'})} className="w-4 h-4 text-primary-600"/> Pessoa Física</label>
                                    <label className="flex items-center gap-2 cursor-pointer text-white"><input type="radio" name="type" checked={contractor.type === 'JURIDICA'} onChange={() => setContractor({...contractor, type: 'JURIDICA'})} className="w-4 h-4 text-primary-600"/> Pessoa Jurídica</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">{contractor.type === 'FISICA' ? 'Nome Completo *' : 'Razão Social *'}</label><input required value={contractor.name} onChange={e => handleContractorChange('name', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                               {contractor.type === 'FISICA' ? (
                                    <>
                                    <div><label className="block text-sm text-slate-400 mb-1">CPF *</label><input required value={contractor.cpf} onChange={e => handleContractorChange('cpf', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                                    <div><label className="block text-sm text-slate-400 mb-1">RG</label><input value={contractor.rg} onChange={e => handleContractorChange('rg', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                                    </>
                               ) : (
                                    <div><label className="block text-sm text-slate-400 mb-1">CNPJ *</label><input required value={contractor.cnpj} onChange={e => handleContractorChange('cnpj', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                               )}
                               <div><label className="block text-sm text-slate-400 mb-1">E-mail *</label><input type="email" required value={contractor.email} onChange={e => handleContractorChange('email', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                               <div><label className="block text-sm text-slate-400 mb-1">Telefone (WhatsApp) *</label><input required value={contractor.phone} onChange={e => handleContractorChange('phone', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                               <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Endereço Completo</label><input value={contractor.address.street} onChange={e => handleAddressChange('street', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                               <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-300 mt-2 mb-2 border-t border-slate-700 pt-3">Representante Legal (se aplicável)</label></div>
                               <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Nome do Representante</label><input value={contractor.responsibleName} onChange={e => handleContractorChange('responsibleName', e.target.value)} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white"/></div>
                            </div>
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


// --- LOGIN VIEW ---
const LoginView = ({ onLogin, onSwitchToRegister }: { onLogin: (user: User) => void, onSwitchToRegister: () => void }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await db.login(login, password);
      if (user) {
        await db.createSession(user);
        onLogin(user);
      } else {
        setError("Login ou senha inválidos, ou sua conta está pendente de aprovação.");
      }
    } catch (err) {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="w-full max-w-sm p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg mx-auto mb-4">
              <Mic2 size={32} />
            </div>
          <h1 className="text-2xl font-bold text-white">Agenda D&E MUSIC</h1>
          <p className="text-slate-400">Acesse sua conta</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Login</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="admin"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><LogIn size={18}/> Entrar</>}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-500 mt-6">
            Não tem uma conta?{' '}
            <button onClick={onSwitchToRegister} className="font-medium text-primary-400 hover:underline">
                Cadastre-se aqui
            </button>
        </p>
      </div>
    </div>
  );
};


// --- REGISTRATION VIEW ---
const RegisterView = ({ onRegisterSuccess, onSwitchToLogin }: { onRegisterSuccess: () => void, onSwitchToLogin: () => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const allUsers = await db.getUsers();
            if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
                setError("Este e-mail já está cadastrado.");
                setIsLoading(false);
                return;
            }

            await db.registerUser({ name, email, password });
            onRegisterSuccess();
        } catch (err) {
            setError("Ocorreu um erro durante o cadastro. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="w-full max-w-sm p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
                <h1 className="text-2xl font-bold text-white text-center mb-2">Criar Nova Conta</h1>
                <p className="text-slate-400 text-center mb-6">Sua conta precisará de aprovação de um administrador.</p>
                
                {error && <div className="bg-red-500/10 text-red-300 p-3 rounded-lg mb-4 text-center">{error}</div>}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Seu Nome Completo</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-800 border-slate-700 p-3 rounded-lg text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Seu E-mail (Login)</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-800 border-slate-700 p-3 rounded-lg text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Crie uma Senha</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-slate-800 border-slate-700 p-3 rounded-lg text-white"/>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin"/> : 'Finalizar Cadastro'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Já tem uma conta?{' '}
                    <button onClick={onSwitchToLogin} className="font-medium text-primary-400 hover:underline">
                        Faça o login
                    </button>
                </p>
            </div>
        </div>
    );
};

// --- GENERAL HEADER ---
const Header = ({ title, children, icon: Icon }: { title: string, children?: ReactNode, icon: React.ElementType }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
        <Icon size={24} className="text-primary-500"/>
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-500">Visão geral e ações rápidas</p>
      </div>
    </div>
    {children && <div className="mt-6 flex flex-col md:flex-row items-center gap-4">{children}</div>}
  </div>
);

// --- LOADING SCREEN ---
const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
    <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
    <p>{message}</p>
  </div>
);


// --- MAIN APP COMPONENT ---
const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [authStatus, setAuthStatus] = useState<'pending' | 'login' | 'register' | 'registered' | 'authenticated'>('pending');
  const [isPublicView, setIsPublicView] = useState<false | 'contractorForm' | 'prospectingForm'>(false);
  const [publicToken, setPublicToken] = useState('');

  // Data states
  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isContractorFormOpen, setIsContractorFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isBandFormOpen, setIsBandFormOpen] = useState(false);
  const [isContractGenOpen, setIsContractGenOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // New state for import modal
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  
  const [initialDate, setInitialDate] = useState<string | undefined>();
  const [initialBandId, setInitialBandId] = useState<string | undefined>();
  

  const fetchData = async (force = false) => {
    if (!force && !isInitialLoad) return;
    setIsLoading(true);
    setError(null);
    try {
      const [bandsData, usersData, eventsData, contractorsData] = await Promise.all([
        db.getBands(),
        db.getUsers(),
        db.getEvents(),
        db.getContractors()
      ]);
      setBands(bandsData);
      setUsers(usersData);
      setEvents(eventsData);
      setContractors(contractorsData);
    } catch (err: any) {
      console.error("Data Fetch Error:", err);
      setError(`Falha ao carregar dados: ${err.message}. Tente recarregar a página.`);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      
      // Remove the initial HTML loader once React has taken over
      const initialLoader = document.getElementById('initial-loader');
      if (initialLoader) {
        initialLoader.style.opacity = '0';
        setTimeout(() => initialLoader.remove(), 500);
      }
    }
  };
  
  // Check session on initial load
  useEffect(() => {
    const checkSessionAndUrl = async () => {
        // Check for public form tokens first
        const urlParams = new URLSearchParams(window.location.search);
        const formToken = urlParams.get('form_token');
        const prospectToken = urlParams.get('prospect_token');

        if (formToken) {
            setIsPublicView('contractorForm');
            setPublicToken(formToken);
            return;
        }
        if (prospectToken) {
            setIsPublicView('prospectingForm');
            setPublicToken(prospectToken);
            return;
        }

        // If no public tokens, proceed with normal auth flow
        const user = await db.getCurrentUser();
        if (user) {
            setCurrentUser(user);
            setAuthStatus('authenticated');
            await fetchData(true); // Force data fetch for logged-in user
        } else {
            setAuthStatus('login');
        }
    };
    checkSessionAndUrl();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthStatus('authenticated');
    fetchData(true);
  };

  const handleLogout = async () => {
    await db.clearSession();
    setCurrentUser(null);
    setAuthStatus('login');
    // Clear data to prevent flashing old data on next login
    setEvents([]); 
    setBands([]);
    setUsers([]);
    setContractors([]);
  };

  // --- CRUD Handlers ---

  const handleSaveEvent = async (event: Event) => {
    await db.saveEvent(event);
    await fetchData(true);
    setIsEventFormOpen(false);
    setEditingEvent(null);
  };
  
  const handleGenerateContract = (event: Event) => {
     setEditingEvent(event);
     setIsContractGenOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
      await db.deleteEvent(eventId);
      await fetchData(true);
    }
  };

  const handleSaveContractor = async (contractor: Contractor) => {
    await db.saveContractor(contractor);
    await fetchData(true);
    setIsContractorFormOpen(false);
    setEditingContractor(null);
  };

  const handleDeleteContractor = async (id: string) => {
    if (confirm('Tem certeza? Excluir um contratante não remove os eventos associados.')) {
      await db.deleteContractor(id);
      await fetchData(true);
    }
  };

  const handleSaveUser = async (user: User) => {
    await db.saveUser(user);
    await fetchData(true);
    setIsUserFormOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      await db.deleteUser(userId);
      await fetchData(true);
    }
  };

  const handleSaveBand = async (band: Band) => {
    await db.saveBand(band);
    await fetchData(true);
    setIsBandFormOpen(false);
    setEditingBand(null);
  };
  
  const handleDeleteBand = async (bandId: string) => {
    if (confirm('Tem certeza que deseja excluir esta banda e TODOS os seus eventos associados? Esta ação é IRREVERSÍVEL.')) {
        // Delete associated events first
        const eventsToDelete = events.filter(e => e.bandId === bandId);
        for (const event of eventsToDelete) {
            await db.deleteEvent(event.id);
        }
        // Then delete the band
        await db.deleteBand(bandId);
        await fetchData(true);
    }
  };
  
  // --- Import Handler ---
  const handleImportEvents = async (newEventsData: Omit<Event, 'id' | 'createdAt' | 'createdBy'>[]) => {
      const now = new Date().toISOString();
      const creatorName = currentUser?.name || 'Sistema';

      for (const eventData of newEventsData) {
          const newEvent: Event = {
              ...eventData,
              id: crypto.randomUUID(),
              createdBy: creatorName,
              createdAt: now,
              // Ensure defaults for any potentially missing fields from the base object
              durationHours: eventData.durationHours || 2,
              eventType: eventData.eventType || 'Importado',
              venueAddress: eventData.venueAddress || '',
              producerContact: eventData.producerContact || '',
              hasContract: false,
              contractFiles: [],
              pipelineStage: PipelineStage.LEAD,
              logistics: { transport: '', departureTime: '', returnTime: '', hotel: '', flights: '', crew: '', rider: '', notes: '' },
          } as Event;
          await db.saveEvent(newEvent);
      }
      await fetchData(true); // Refresh data after import
  };


  // --- UI Triggers ---
  
  const openNewEventForm = (date?: Date, bandId?: string) => {
    setEditingEvent(null);
    setInitialDate(date ? date.toISOString().split('T')[0] : undefined);
    setInitialBandId(bandId);
    setIsEventFormOpen(true);
  };

  const openEditEventForm = (event: Event) => {
    setEditingEvent(event);
    setIsEventFormOpen(true);
  };
  
  const openNewContractorForm = () => {
    setEditingContractor(null);
    setIsContractorFormOpen(true);
  };
  
  const openEditContractorForm = (c: Contractor) => {
    setEditingContractor(c);
    setIsContractorFormOpen(true);
  };

  const openNewUserForm = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const openEditUserForm = (user: User) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };
  
  const openNewBandForm = () => {
    setEditingBand(null);
    setIsBandFormOpen(true);
  };
  
  const openEditBandForm = (band: Band) => {
    setEditingBand(band);
    setIsBandFormOpen(true);
  };
  
  // --- View Render Logic ---
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView events={events} contractors={contractors} bands={bands} currentUser={currentUser} onNewEvent={openNewEventForm} onNewContractor={openNewContractorForm} />;
      case 'pipeline':
        return <PipelineView events={events} onEditEvent={openEditEventForm} onSaveEvent={handleSaveEvent} bands={bands} />;
      case 'agenda':
        return <AgendaView events={events} bands={bands} onNewEvent={openNewEventForm} onEditEvent={openEditEventForm} currentUser={currentUser} />;
      case 'contractors':
        return <ContractorsView contractors={contractors} onNew={openNewContractorForm} onEdit={openEditContractorForm} onDelete={handleDeleteContractor} />;
      case 'contracts_library':
        return <ContractsLibraryView events={events} bands={bands} />;
      case 'bands':
        return <BandsAndUsersView 
                 bands={bands} 
                 users={users} 
                 onNewBand={openNewBandForm} 
                 onEditBand={openEditBandForm}
                 onDeleteBand={handleDeleteBand}
                 onNewUser={openNewUserForm}
                 onEditUser={openEditUserForm}
                 onDeleteUser={handleDeleteUser}
                 onSaveUser={handleSaveUser}
                 currentUser={currentUser}
               />;
      default:
        return <DashboardView events={events} contractors={contractors} bands={bands} currentUser={currentUser} onNewEvent={openNewEventForm} onNewContractor={openNewContractorForm}/>;
    }
  };

  // --- Auth & Public View Routing ---
  if (isPublicView === 'contractorForm') {
      return <PublicContractorFormView token={publicToken} dbService={db} />;
  }
  if (isPublicView === 'prospectingForm') {
      return <PublicProspectingFormView token={publicToken} dbService={db} />;
  }

  if (authStatus === 'pending') {
      return <LoadingScreen message="Verificando sessão..." />;
  }
  
  if (authStatus === 'login') {
      return <LoginView onLogin={handleLogin} onSwitchToRegister={() => setAuthStatus('register')} />;
  }
  
  if (authStatus === 'register') {
      return <RegisterView onRegisterSuccess={() => setAuthStatus('registered')} onSwitchToLogin={() => setAuthStatus('login')} />;
  }
  
  if (authStatus === 'registered') {
      return (
          <div className="flex items-center justify-center min-h-screen bg-slate-950 text-center text-white">
              <div>
                  <h2 className="text-2xl font-bold">Cadastro Realizado!</h2>
                  <p className="text-slate-400 mt-2">Sua conta foi criada e está aguardando aprovação de um administrador.</p>
                  <button onClick={() => setAuthStatus('login')} className="mt-6 bg-primary-600 px-6 py-2 rounded-lg">Voltar para Login</button>
              </div>
          </div>
      );
  }

  if (!currentUser || isLoading) {
    return <LoadingScreen message="Carregando dados..." />;
  }

  return (
    <ErrorBoundary>
      <Layout 
        user={currentUser} 
        currentView={currentView}
        onChangeView={setCurrentView}
        onLogout={handleLogout}
      >
        <div className="flex justify-end mb-4 -mt-4">
             <button
               onClick={() => setIsImportModalOpen(true)}
               className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
             >
               <UploadCloud size={14} /> Importar CSV
             </button>
        </div>
        {renderContent()}
      </Layout>

      {isEventFormOpen && (
        <EventForm
          bands={bands}
          contractors={contractors}
          existingEvent={editingEvent}
          currentUser={currentUser}
          initialDate={initialDate}
          initialBandId={initialBandId}
          onSave={handleSaveEvent}
          onGenerateContract={handleGenerateContract}
          onClose={() => {
            setIsEventFormOpen(false);
            setEditingEvent(null);
          }}
        />
      )}
      
      {isContractGenOpen && editingEvent && (
         <ContractGeneratorModal
            event={editingEvent}
            contractors={contractors}
            bands={bands}
            onClose={() => {
                setIsContractGenOpen(false);
                setEditingEvent(null);
            }}
         />
      )}

      {isContractorFormOpen && (
        <ContractorForm
          existingContractor={editingContractor}
          onSave={handleSaveContractor}
          onClose={() => {
            setIsContractorFormOpen(false);
            setEditingContractor(null);
          }}
        />
      )}
      
      {isUserFormOpen && (
        <UserForm
          bands={bands}
          existingUser={editingUser}
          onSave={handleSaveUser}
          onClose={() => {
            setIsUserFormOpen(false);
            setEditingUser(null);
          }}
        />
      )}

      {isBandFormOpen && (
        <BandForm
          existingBand={editingBand}
          onSave={handleSaveBand}
          onClose={() => {
            setIsBandFormOpen(false);
            setEditingBand(null);
          }}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportEvents}
          bands={bands}
          currentUser={{ name: currentUser.name }}
        />
      )}
    </ErrorBoundary>
  );
};

// --- Child Views ---

const DashboardView = ({ events, contractors, bands, currentUser, onNewEvent, onNewContractor }: { events: Event[], contractors: Contractor[], bands: Band[], currentUser: User | null, onNewEvent: () => void, onNewContractor: () => void }) => {
  const confirmedEvents = events.filter(e => e.status === EventStatus.CONFIRMED);
  const totalRevenue = confirmedEvents.reduce((sum, e) => sum + e.financials.grossValue, 0);

  const eventsByMonth = events.reduce((acc, event) => {
    const month = new Date(event.date).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(eventsByMonth)
    .map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }))
    .slice(-6); // Last 6 months

  return (
    <>
      <Header title={`Olá, ${currentUser?.name.split(' ')[0]}!`} icon={LayoutDashboard}>
        <div className="flex-1"></div>
        <div className="flex gap-2">
           <button onClick={onNewContractor} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">
             <Briefcase size={16} /> Novo Contratante
           </button>
           <button onClick={onNewEvent} className="flex items-center gap-2 text-sm bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-primary-600/20">
             <Plus size={16} /> Novo Evento
           </button>
        </div>
      </Header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Receita Bruta (Confirmados)</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          </p>
        </div>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Total de Eventos</h3>
          <p className="text-3xl font-bold text-white mt-2">{events.length}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Eventos Confirmados</h3>
          <p className="text-3xl font-bold text-green-400 mt-2">{confirmedEvents.length}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Contratantes Cadastrados</h3>
          <p className="text-3xl font-bold text-white mt-2">{contractors.length}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800">
           <h3 className="text-lg font-bold text-white mb-4">Eventos por Mês (Últimos 6)</h3>
           <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <ChartTooltip
                  cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
           </ResponsiveContainer>
        </div>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Próximos Eventos</h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {events.filter(e => new Date(e.date) >= new Date() && e.status !== EventStatus.CANCELED)
                     .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                     .slice(0, 5)
                     .map(event => (
                       <div key={event.id} className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-800 rounded-lg flex flex-col items-center justify-center font-bold text-primary-400">
                           <span className="text-xs -mb-1">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })}</span>
                           <span className="text-xl">{new Date(event.date).getUTCDate()}</span>
                         </div>
                         <div>
                           <p className="text-sm font-medium text-white truncate">{event.name}</p>
                           <p className="text-xs text-slate-500">{bands.find(b => b.id === event.bandId)?.name}</p>
                         </div>
                       </div>
                     ))
              }
            </div>
        </div>
      </div>
    </>
  );
};

const PipelineView = ({ events, onEditEvent, onSaveEvent, bands }: { events: Event[], onEditEvent: (event: Event) => void, onSaveEvent: (event: Event) => Promise<void>, bands: Band[] }) => {
  const STAGES = Object.values(PipelineStage);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("eventId", eventId);
  };

  const handleDrop = async (e: React.DragEvent, newStage: PipelineStage) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    const eventToMove = events.find(ev => ev.id === eventId);
    if (eventToMove && eventToMove.pipelineStage !== newStage) {
      const updatedEvent = { ...eventToMove, pipelineStage: newStage };
      
      // Auto-update status when moving to WON/LOST
      if (newStage === PipelineStage.WON && updatedEvent.status !== EventStatus.CONFIRMED) {
        updatedEvent.status = EventStatus.CONFIRMED;
      } else if (newStage === PipelineStage.LOST && updatedEvent.status !== EventStatus.CANCELED) {
        updatedEvent.status = EventStatus.CANCELED;
      }
      
      await onSaveEvent(updatedEvent);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const STAGE_CONFIG: Record<PipelineStage, { title: string; icon: React.ElementType; color: string }> = {
    [PipelineStage.LEAD]: { title: 'Lead / Contato', icon: MessageCircle, color: 'text-gray-400' },
    [PipelineStage.QUALIFICATION]: { title: 'Qualificação', icon: Check, color: 'text-sky-400' },
    [PipelineStage.PROPOSAL]: { title: 'Proposta Enviada', icon: Send, color: 'text-blue-400' },
    [PipelineStage.NEGOTIATION]: { title: 'Negociação', icon: DollarSign, color: 'text-purple-400' },
    [PipelineStage.CONTRACT]: { title: 'Emissão Contrato', icon: Printer, color: 'text-indigo-400' },
    [PipelineStage.WON]: { title: 'Fechado (Ganho)', icon: CheckCircle, color: 'text-green-400' },
    [PipelineStage.LOST]: { title: 'Perdido', icon: Ban, color: 'text-red-400' }
  };
  
  const calculateStageValue = (stage: PipelineStage) => {
     return events
       .filter(e => e.pipelineStage === stage)
       .reduce((sum, e) => sum + e.financials.grossValue, 0);
  };

  return (
    <>
      <Header title="Pipeline de Vendas" icon={Kanban} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const IconComponent = STAGE_CONFIG[stage].icon;
          return (
            <div 
              key={stage} 
              className="w-72 flex-shrink-0 bg-slate-950/50 rounded-xl border border-slate-800"
              onDrop={(e) => handleDrop(e, stage)}
              onDragOver={handleDragOver}
            >
              <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur-sm rounded-t-xl">
                <h3 className={`font-bold flex items-center gap-2 ${STAGE_CONFIG[stage].color}`}>
                   <IconComponent size={16}/>
                   {STAGE_CONFIG[stage].title}
                   <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{events.filter(e => e.pipelineStage === stage).length}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateStageValue(stage))}
                </p>
              </div>
              <div className="p-2 space-y-2 h-[65vh] overflow-y-auto">
                {events
                  .filter(e => e.pipelineStage === stage)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(event => (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onClick={() => onEditEvent(event)}
                      className="bg-slate-800 p-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700/50 hover:border-primary-500"
                    >
                      <p className="text-sm font-bold text-white">{event.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{bands.find(b=>b.id === event.bandId)?.name}</p>
                      <div className="flex justify-between items-center mt-2">
                         <p className="text-xs font-medium text-green-400">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.financials.grossValue)}
                         </p>
                         <p className="text-xs text-slate-500">
                           {new Date(event.date).toLocaleDateString('pt-BR', { day:'2-digit', month: '2-digit', timeZone: 'UTC' })}
                         </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};


const AgendaView = ({ events, bands, onNewEvent, onEditEvent, currentUser }: { events: Event[], bands: Band[], onNewEvent: (date: Date, bandId: string) => void, onEditEvent: (event: Event) => void, currentUser: User | null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [zoom, setZoom] = useState(1);
  const [dayDetails, setDayDetails] = useState<{ day: Date, events: Event[] } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBand, setSelectedBand] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const bandName = bands.find(b => b.id === event.bandId)?.name || '';

      const searchMatch = search ? (
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.city.toLowerCase().includes(search.toLowerCase()) ||
        event.venue.toLowerCase().includes(search.toLowerCase()) ||
        event.contractor.toLowerCase().includes(search.toLowerCase()) ||
        bandName.toLowerCase().includes(search.toLowerCase())
      ) : true;

      const bandMatch = selectedBand === 'all' || event.bandId === selectedBand;
      const statusMatch = selectedStatus === 'all' || event.status === selectedStatus;

      const startDateMatch = dateRange.start ? eventDate >= new Date(dateRange.start) : true;
      const endDateMatch = dateRange.end ? eventDate <= new Date(dateRange.end) : true;
      
      // User-specific filter
      const userCanSee = currentUser?.role === UserRole.ADMIN || (currentUser?.bandIds || []).includes(event.bandId);

      return searchMatch && bandMatch && statusMatch && startDateMatch && endDateMatch && userCanSee;
    });
  }, [events, search, selectedBand, selectedStatus, dateRange, currentUser, bands]);

  const clearFilters = () => {
    setSearch('');
    setSelectedBand('all');
    setSelectedStatus('all');
    setDateRange({ start: '', end: '' });
  };
  
  const handleDayClick = (day: Date) => {
    const eventsOnDay = filteredEvents.filter(e => new Date(e.date).toDateString() === day.toDateString());
    
    // MODIFICATION: Respect active band filter in the modal
    const modalEvents = selectedBand !== 'all' 
      ? eventsOnDay.filter(e => e.bandId === selectedBand) 
      : eventsOnDay;

    if (modalEvents.length > 0) {
       setDayDetails({ day, events: modalEvents });
    } else {
       // If empty, but a day was clicked, still open form but with potential band filter
       const bandToPreselect = selectedBand !== 'all' ? selectedBand : bands[0]?.id;
       if (bandToPreselect) {
           onNewEvent(day, bandToPreselect);
       }
    }
  };


  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...

    const days = [];
    // Previous month's days
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`prev-${i}`} className="p-1 border border-slate-800/50 bg-slate-950/30"></div>);
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const eventsOnDay = filteredEvents.filter(e => new Date(e.date).toDateString() === dayDate.toDateString());
      const isToday = dayDate.toDateString() === new Date().toDateString();

      days.push(
        <div 
          key={i} 
          className={`relative p-1.5 border border-slate-800/50 cursor-pointer transition-colors ${isToday ? 'bg-primary-900/20' : 'bg-slate-900'} hover:bg-slate-800`}
          onClick={() => handleDayClick(dayDate)}
        >
          <span className={`text-xs font-bold ${isToday ? 'text-primary-400' : 'text-slate-400'}`}>{i}</span>
          <div className="mt-1 space-y-1">
            {eventsOnDay.map(e => {
               const band = bands.find(b => b.id === e.bandId);
               return (
                  <div key={e.id} className="text-white text-[10px] leading-tight px-1 py-0.5 rounded bg-slate-700/50 truncate flex items-center gap-1.5">
                    <StatusBadge status={e.status} minimal />
                    <span className="truncate">{e.name}</span>
                  </div>
               )
            })}
          </div>
        </div>
      );
    }
    
    const totalCells = days.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      days.push(<div key={`next-${i}`} className="p-1 border border-slate-800/50 bg-slate-950/30"></div>);
    }
    
    return (
      <div className="grid grid-cols-7 text-xs text-center border-t border-l border-slate-800/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-2 font-bold text-slate-500 border-b border-r border-slate-800/50 bg-slate-950">{day}</div>
        ))}
        {days}
      </div>
    );
  };
  
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  
  const hasActiveFilters = search || selectedBand !== 'all' || selectedStatus !== 'all' || dateRange.start || dateRange.end;

  return (
    <>
      <Header title="Agenda de Eventos" icon={CalendarDays}>
        {/* Filters */}
        <div className="flex-1 w-full relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Pesquisar por evento, cidade, local..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white"
          />
        </div>
        <select value={selectedBand} onChange={e => setSelectedBand(e.target.value)} className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
          <option value="all">Todas as Bandas</option>
          {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
          <option value="all">Todos os Status</option>
          {Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
            <FilterX size={18}/>
          </button>
        )}
      </Header>
      
      {/* View Mode Toggle and Navigation */}
      <div className="flex items-center justify-between mb-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
         <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button>
            <h2 className="text-xl font-bold text-white w-48 text-center capitalize">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight/></button>
         </div>
         <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}><CalendarIcon size={18}/></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}><List size={18}/></button>
         </div>
      </div>

      {viewMode === 'calendar' ? (
        renderCalendar()
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left text-slate-400 font-medium">Data</th>
                <th className="p-3 text-left text-slate-400 font-medium">Evento</th>
                <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">Banda</th>
                <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">Local</th>
                <th className="p-3 text-center text-slate-400 font-medium">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEvents
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(event => (
                  <tr key={event.id} className="hover:bg-slate-900">
                    <td className="p-3 text-white font-medium">{new Date(event.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td className="p-3 text-white">{event.name}</td>
                    <td className="p-3 text-slate-300 hidden md:table-cell">{bands.find(b => b.id === event.bandId)?.name}</td>
                    <td className="p-3 text-slate-400 hidden md:table-cell">{event.city}</td>
                    <td className="p-3 text-center"><StatusBadge status={event.status}/></td>
                    <td className="p-3 text-right">
                      <button onClick={() => onEditEvent(event)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {dayDetails && (
        <DayDetailsModal 
          day={dayDetails.day}
          events={dayDetails.events}
          onEdit={onEditEvent}
          onClose={() => setDayDetails(null)}
        />
      )}
    </>
  );
};


const ContractorsView = ({ contractors, onNew, onEdit, onDelete }: { contractors: Contractor[], onNew: () => void, onEdit: (c: Contractor) => void, onDelete: (id: string) => void }) => {
  const [search, setSearch] = useState('');
  
  const filtered = contractors.filter(c => 
     c.name.toLowerCase().includes(search.toLowerCase()) ||
     c.email.toLowerCase().includes(search.toLowerCase()) ||
     (c.cpf && c.cpf.includes(search)) ||
     (c.cnpj && c.cnpj.includes(search))
  );

  return (
    <>
      <Header title="Contratantes" icon={Briefcase}>
        <div className="flex-1 relative">
           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
           <input type="text" placeholder="Pesquisar por nome, email ou documento..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white"/>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 text-sm bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium">
          <Plus size={16} /> Novo Contratante
        </button>
      </Header>
      
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3 text-left text-slate-400 font-medium">Nome / Razão Social</th>
              <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">Contato</th>
              <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">Cidade/UF</th>
              <th className="p-3 text-left text-slate-400 font-medium">Documento</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-900">
                <td className="p-3 text-white font-medium">{c.name}</td>
                <td className="p-3 text-slate-300 hidden md:table-cell">
                  <div>{c.email}</div>
                  <div className="text-xs text-slate-500">{c.phone || c.whatsapp}</div>
                </td>
                <td className="p-3 text-slate-400 hidden md:table-cell">{c.address.city}, {c.address.state}</td>
                <td className="p-3 text-slate-400 font-mono text-xs">{c.type === 'FISICA' ? c.cpf : c.cnpj}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(c)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                    <button onClick={() => onDelete(c.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};


// --- NEW VIEW for Contract Files ---
const ContractsLibraryView = ({ events, bands }: { events: Event[], bands: Band[] }) => {
  const [search, setSearch] = useState('');

  const eventsWithContracts = events
    .filter(e => e.contractFiles && e.contractFiles.length > 0)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = eventsWithContracts.filter(e => 
     e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.contractor.toLowerCase().includes(search.toLowerCase()) ||
     bands.find(b => b.id === e.bandId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="Biblioteca de Contratos" icon={FolderOpen}>
        <div className="flex-1 relative">
           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
           <input type="text" placeholder="Pesquisar por evento, contratante, banda..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white"/>
        </div>
      </Header>
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
         <table className="w-full text-sm">
           <thead className="bg-slate-900">
             <tr>
               <th className="p-3 text-left text-slate-400 font-medium">Evento</th>
               <th className="p-3 text-left text-slate-400 font-medium">Contratante</th>
               <th className="p-3 text-left text-slate-400 font-medium">Data Upload</th>
               <th className="p-3 text-left text-slate-400 font-medium">Arquivos</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-800">
              {filtered.map(event => (
                 <tr key={event.id} className="hover:bg-slate-900">
                    <td className="p-3">
                       <p className="text-white font-medium">{event.name}</p>
                       <p className="text-xs text-slate-500">{bands.find(b=>b.id === event.bandId)?.name}</p>
                    </td>
                    <td className="p-3 text-slate-300">{event.contractor}</td>
                    <td className="p-3 text-slate-400 text-xs">
                        {new Date(event.contractFiles[0].uploadedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">
                       <div className="flex flex-col gap-1">
                         {event.contractFiles.map((file, idx) => (
                           <a href={file.url} target="_blank" rel="noopener noreferrer" key={idx} className="text-primary-400 hover:underline text-xs flex items-center gap-1">
                             <Download size={12}/> {file.name}
                           </a>
                         ))}
                       </div>
                    </td>
                 </tr>
              ))}
           </tbody>
         </table>
      </div>
    </>
  );
};


const BandsAndUsersView = ({ bands, users, onNewBand, onEditBand, onDeleteBand, onNewUser, onEditUser, onDeleteUser, onSaveUser, currentUser }: { bands: Band[], users: User[], onNewBand: () => void, onEditBand: (b: Band) => void, onDeleteBand: (id: string) => void, onNewUser: () => void, onEditUser: (u: User) => void, onDeleteUser: (id: string) => void, onSaveUser: (u: User) => Promise<void>, currentUser: User | null }) => {
  
  const [expandedBandId, setExpandedBandId] = useState<string | null>(null);

  const toggleUserDetails = (bandId: string) => {
    setExpandedBandId(prevId => prevId === bandId ? null : bandId);
  };
  
  const handleUserStatusChange = async (user: User, newStatus: 'ACTIVE' | 'PENDING') => {
      if (confirm(`Tem certeza que deseja ${newStatus === 'ACTIVE' ? 'aprovar' : 'suspender'} o acesso de ${user.name}?`)) {
          await onSaveUser({ ...user, status: newStatus });
      }
  };
  
  // Only Admins can see this page
  if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.CONTRACTS) {
    return <div className="text-red-400">Acesso negado.</div>
  }

  const canManageUsers = currentUser?.role === UserRole.ADMIN;
  
  return (
    <>
      <Header title="Bandas & Usuários" icon={Music}>
         <div className="flex-1"></div>
         <button onClick={onNewUser} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">
           <UserIcon size={16} /> Novo Usuário
         </button>
         {canManageUsers && (
            <button onClick={onNewBand} className="flex items-center gap-2 text-sm bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium">
             <Plus size={16} /> Nova Banda
            </button>
         )}
      </Header>
      
      {/* Bands Section */}
      {canManageUsers && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-8">
            <h3 className="p-4 text-lg font-bold text-white border-b border-slate-800">Bandas Cadastradas</h3>
            <div className="divide-y divide-slate-800">
                {bands.map(band => (
                    <div key={band.id} className="p-4 flex justify-between items-center hover:bg-slate-900">
                        <span className="font-medium text-white">{band.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEditBand(band)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                            <button onClick={() => onDeleteBand(band.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {/* Users Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <h3 className="p-4 text-lg font-bold text-white border-b border-slate-800">Usuários do Sistema</h3>
        <table className="w-full text-sm">
           <thead className="bg-slate-900">
             <tr>
               <th className="p-3 text-left text-slate-400 font-medium">Nome</th>
               <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">Login/Email</th>
               <th className="p-3 text-left text-slate-400 font-medium">Permissão</th>
               <th className="p-3 text-left text-slate-400 font-medium">Status</th>
               <th></th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-800">
             {users.map(user => (
               <tr key={user.id} className="hover:bg-slate-900">
                  <td className="p-3">
                    <p className="text-white font-medium">{user.name}</p>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-1 mt-1">
                      {user.role === UserRole.ADMIN ? (
                         <span className="px-1.5 py-0.5 bg-accent-500/10 text-accent-400 rounded">Todas as Bandas</span>
                      ) : (
                        (user.bandIds || []).map(id => (
                           <span key={id} className="px-1.5 py-0.5 bg-slate-700 rounded">{bands.find(b=>b.id===id)?.name}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 hidden md:table-cell">{user.email}</td>
                  <td className="p-3 text-slate-300 font-medium capitalize">{user.role.toLowerCase()}</td>
                  <td className="p-3">
                     {user.status === 'ACTIVE' ? (
                        <button 
                            onClick={() => handleUserStatusChange(user, 'PENDING')}
                            className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded-full border border-green-500/10"
                            title="Ativo. Clique para suspender."
                        >
                            <CheckCircle size={12}/> Ativo
                        </button>
                     ) : (
                        <button 
                            onClick={() => handleUserStatusChange(user, 'ACTIVE')}
                            className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded-full border border-yellow-500/10"
                            title="Pendente. Clique para aprovar."
                        >
                            <History size={12}/> Pendente
                        </button>
                     )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => onEditUser(user)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                      {/* Prevent self-deletion and deletion by non-admins */}
                      {currentUser?.id !== user.id && canManageUsers && (
                        <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                      )}
                    </div>
                  </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </>
  );
};
export default App;