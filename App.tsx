
import React, { useState, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import { db } from './services/databaseService';
import { Event, Band, User, EventStatus, UserRole, Contractor, ContractorType, ContractFile, PipelineStage } from './types';
import Layout from './components/Layout';
import EventForm from './components/EventForm';
import ContractorForm from './components/ContractorForm';
import UserForm from './components/UserForm';
import BandForm from './components/BandForm';
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
  CreditCard
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
  
  // Explicitly declare props to avoid TS errors in strict mode
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
                                         <td>{contractor?.type === 'JURIDICA' ? 'CNPJ' : 'CPF'}: _________________</td>
                                     </tr>
                                     <tr>
                                         <td className="font-bold">RG</td>
                                         <td>_________________</td>
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
  const [isBandFormOpen, setIsBandFormOpen] = useState(false); // NEW
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  
  // Send Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedEventForSend, setSelectedEventForSend] = useState<Event | null>(null);

  // Contract Generator State
  const [isContractGeneratorOpen, setIsContractGeneratorOpen] = useState(false);
  const [eventForContract, setEventForContract] = useState<Event | null>(null);
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingBand, setEditingBand] = useState<Band | null>(null); // NEW
  
  const [filterText, setFilterText] = useState('');
  const [selectedBandFilter, setSelectedBandFilter] = useState<string | null>(null);

  // Agenda / Calendar specific state
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  
  // Hoisted Agenda State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // REPLACED zoomLevel with zoomPercent for continuous 400% zoom
  const [zoomPercent, setZoomPercent] = useState(100); 

  const [isLoading, setIsLoading] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Role Checks
  const isViewer = currentUser?.role === UserRole.VIEWER;
  const isSales = currentUser?.role === UserRole.SALES;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isContracts = currentUser?.role === UserRole.CONTRACTS;
  const canManageUsers = isAdmin || isContracts;

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
        setLoginError('Credenciais inválidas.');
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
  // Updated Band Handler to use Form
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

    // Financial Chart Data Preparation
    const financialData = React.useMemo(() => {
       const monthlyStats: Record<string, {name: string, gross: number, net: number}> = {};
       
       visibleEvents.forEach(e => {
          if (e.status === EventStatus.CANCELED) return;
          const date = new Date(e.date);
          const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
          const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!monthlyStats[key]) {
             monthlyStats[key] = { name: label, gross: 0, net: 0 };
          }
          monthlyStats[key].gross += e.financials.grossValue;
          monthlyStats[key].net += e.financials.netValue;
       });

       return Object.keys(monthlyStats).sort().map(k => monthlyStats[k]);
    }, [visibleEvents]);

    return (
      <div className="space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Bandas Section */}
        <div>
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Music className="text-primary-500" /> Minhas Bandas
             </h2>
             {isAdmin && (
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

        {/* Financial Chart (New) */}
        {showFinancialStats && financialData.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 h-80">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="text-green-500" size={20} /> Faturamento Mensal (R$)
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`}/>
                        <ChartTooltip 
                           contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                           formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                        />
                        <Bar dataKey="gross" name="Bruto" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="net" name="Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )}

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
                     const displayName = isViewer ? "Data Ocupada" : event.name;
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 cursor-pointer transition-colors">
                          <div className="flex justify-between items-start">
                             <div>
                                <span className="text-xs text-primary-400 font-bold uppercase">{band?.name}</span>
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
                     const displayName = isViewer ? "Data Ocupada" : event.name;
                     return (
                       <div key={event.id} onClick={() => openEditEvent(event)} className="p-3 bg-slate-900/50 rounded border border-green-900/20 hover:border-green-900/50 cursor-pointer transition-colors">
                          <div className="flex justify-between items-center">
                             <div>
                                <span className="text-xs text-slate-400">{band?.name}</span>
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
    // Pipeline Kanban Board
    // Access Check
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
                {!isViewer && (
                    <button 
                        onClick={() => { setEditingEvent(null); setNewEventDate(new Date().toISOString().split('T')[0]); setIsFormOpen(true); }}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap"
                    >
                        <Plus size={18} /> Novo Evento
                    </button>
                )}
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
                                        {stage === PipelineStage.LEAD ? 'Prospecção' : 
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
    // Restricted Access Check
    if (!isAdmin && !isContracts) {
       return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
             <Ban size={48} className="mb-4 text-slate-700"/>
             <p>Acesso restrito a gestores de contratos.</p>
          </div>
       )
    }

    // Filter events containing contracts (checking files array or legacy string)
    const eventsWithContracts = events.filter(e => 
      ((e.contractFiles && e.contractFiles.length > 0) || (e.contractUrl && e.contractUrl.trim() !== '')) &&
      (e.name.toLowerCase().includes(filterText.toLowerCase()) || 
       e.contractor.toLowerCase().includes(filterText.toLowerCase()))
    );

    const handleDownload = (event: Event, file: ContractFile) => {
      // Create a blob to simulate a real file download
      const content = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS\n\nEvento: ${event.name}\nData: ${new Date(event.date).toLocaleDateString()}\nContratante: ${event.contractor}\nLocal: ${event.venue || event.city}\n\nArquivo Original Referenciado: ${file.name}\nData Upload: ${new Date(file.uploadedAt).toLocaleString()}\n\n(Este arquivo foi gerado automaticamente pelo sistema)`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use the stored filename if possible, else default
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

    // Get Bands that have contracts
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
                           {/* Band Header */}
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
     // Access Check
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
                   const displayName = isViewer ? "Data Ocupada" : event.name;
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
                         <h4 className="text-white font-bold text-base mb-1">{band?.name || 'Banda'}</h4>
                         <p className="text-slate-300 text-sm mb-2">{displayName}</p>
                         
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
      setSelectedDateDetails(dateStr);
    };

    return (
      <div className="space-y-6 h-full flex flex-col pb-20 md:pb-0 max-h-[calc(100vh-100px)]">
        
        {/* Header da Agenda */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Controles */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
               <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button onClick={() => setViewMode('calendar')} className={`p-2 rounded transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><CalendarIcon size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><List size={18} /></button>
               </div>

               {/* Zoom Controls */}
               {viewMode === 'calendar' && (
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 ml-0 md:ml-2">
                    <button onClick={() => setZoomPercent(prev => Math.max(100, prev - 50))} disabled={zoomPercent <= 100} className={`p-2 rounded transition-all ${zoomPercent <= 100 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ZoomOut size={18} /></button>
                    <div className="px-2 text-xs font-bold text-slate-300 min-w-[3rem] text-center">
                       {zoomPercent}%
                    </div>
                    <button onClick={() => setZoomPercent(prev => Math.min(400, prev + 50))} disabled={zoomPercent >= 400} className={`p-2 rounded transition-all ${zoomPercent >= 400 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ZoomIn size={18} /></button>
                </div>
               )}

               {viewMode === 'calendar' && (
                 <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 ml-0 md:ml-2 relative">
                   <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                   
                   {/* Month Picker Dropdown Trigger */}
                   <div className="relative z-30">
                      <button 
                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                        className="flex items-center justify-center gap-2 font-semibold text-white min-w-[160px] text-center uppercase tracking-wide hover:bg-slate-800 py-1 px-2 rounded transition-colors"
                      >
                        {monthNames[month]} {year}
                        <ChevronDown size={14} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isMonthPickerOpen && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 animate-fade-in z-50">
                           {/* Year Control */}
                           <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(year - 1, month, 1)); }} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                              <span className="font-bold text-white text-lg">{year}</span>
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(year + 1, month, 1)); }} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
                           </div>
                           {/* Month Grid */}
                           <div className="grid grid-cols-3 gap-2">
                              {monthNames.map((mName, idx) => (
                                <button
                                  key={mName}
                                  onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(year, idx, 1)); setIsMonthPickerOpen(false); }}
                                  className={`text-xs py-2 rounded font-medium transition-colors ${idx === month ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                  {mName.substring(0, 3)}
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

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
              {!isViewer && (
                <button 
                    onClick={() => { setEditingEvent(null); setNewEventDate(new Date().toISOString().split('T')[0]); setIsFormOpen(true); }}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 whitespace-nowrap"
                >
                    <Plus size={18} /> <span className="hidden md:inline">Novo Evento</span>
                </button>
              )}
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
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div 
                   className="flex flex-col min-h-full transition-all duration-300 ease-in-out"
                   style={{ width: zoomPercent === 100 ? '100%' : `${zoomPercent}%` }}
                >
                    
                    <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 shrink-0 sticky top-0 z-20 shadow-md">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-auto flex-1 bg-slate-900 gap-px">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-950/50 transition-all duration-300" style={{ minHeight: `${zoomPercent * 1.2}px` }}></div>
                    ))}

                    {Array.from({ length: days }).map((_, i) => {
                        const dayNum = i + 1;
                        const d = String(dayNum).padStart(2, '0');
                        const m = String(month + 1).padStart(2, '0');
                        const dateStr = `${year}-${m}-${d}`;
                        const dayEvents = filteredEvents.filter(e => {
                           if (!e.date) return false;
                           return (e.date.includes('T') ? e.date.split('T')[0] : e.date) === dateStr;
                        });

                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                        // Dynamic Zoom Sizing
                        const cellHeight = `${zoomPercent * 1.2}px`; // 100% = 120px, 400% = 480px
                        const cardPadding = zoomPercent > 150 ? 'p-3' : 'p-1.5';
                        
                        let titleClass = 'text-[10px] leading-tight truncate';
                        if (zoomPercent > 120) titleClass = 'text-xs font-semibold';
                        if (zoomPercent > 200) titleClass = 'text-sm font-bold leading-tight whitespace-normal';
                        
                        return (
                        <div 
                            key={dayNum} 
                            onClick={() => handleDayClick(dayNum)}
                            className="bg-slate-950 h-full p-1.5 border-r border-b border-slate-800 hover:bg-slate-900 transition-all duration-300 ease-in-out cursor-pointer relative group flex flex-col gap-1 min-w-0 overflow-hidden"
                            style={{ minHeight: cellHeight }}
                        >
                            <span className={`text-sm font-bold mb-1 ${isToday ? 'text-primary-400' : 'text-slate-600'}`}>
                              {dayNum} {isToday && '(Hoje)'}
                            </span>
                            
                            <div className="flex flex-col gap-1 w-full min-w-0">
                            {dayEvents.map(event => {
                                const band = bands.find(b => b.id === event.bandId);
                                const displayName = isViewer ? "Data Ocupada" : event.name;
                                
                                let statusColor = "bg-slate-700 border-slate-600";
                                if (event.status === EventStatus.CONFIRMED) statusColor = "bg-green-600/90 border-green-500";
                                if (event.status === EventStatus.RESERVED) statusColor = "bg-yellow-600/90 border-yellow-500";
                                if (event.status === EventStatus.CANCELED) statusColor = "bg-red-600/90 border-red-500";
                                
                                return (
                                <div 
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                    className={`${cardPadding} rounded border shadow-sm cursor-pointer hover:scale-[1.02] transition-all ${statusColor} text-white w-full h-auto relative block overflow-hidden`}
                                    title={`${event.time} - ${displayName}`}
                                >
                                    <div className={`flex ${zoomPercent <= 120 ? 'flex-row items-center gap-2' : 'flex-col gap-0.5'}`}>
                                       <div className="text-[10px] font-bold whitespace-nowrap">{event.time}</div>
                                       <div className={`${titleClass} break-words`}>{displayName}</div>
                                    </div>

                                    {zoomPercent > 120 && (
                                    <div className={`mt-1 ${zoomPercent > 200 ? 'space-y-1' : ''}`}>
                                        <div className="text-[10px] opacity-90 leading-tight flex items-center gap-1">
                                            {zoomPercent > 200 && <MapPin size={10} />}
                                            {event.city}
                                        </div>
                                        <div className="text-[10px] opacity-75 italic leading-tight flex items-center gap-1">
                                            {zoomPercent > 200 && <Music size={10} />}
                                            {band?.name}
                                        </div>
                                    </div>
                                    )}

                                    {zoomPercent > 200 && !isViewer && (
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
                                                <div title="Contrato Pendente" className="bg-red-500 text-white rounded-full p-0.5">
                                                    <FileWarning size={10} />
                                                </div>
                                            )}
                                            {event.hasContract && <div className="text-green-300"><FileCheck size={12}/></div>}
                                        </div>
                                    </div>
                                    )}
                                </div>
                                )
                            })}
                            </div>
                            
                            {!isViewer && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus size={14} className="text-primary-500" />
                                </div>
                            )}
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
                    {!isViewer && <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Contrato</th>}
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                    {!isViewer && <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEvents.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum evento encontrado.</td></tr>
                  ) : (
                    filteredEvents.map(event => {
                      const band = bands.find(b => b.id === event.bandId);
                      const displayName = isViewer ? "Data Ocupada" : event.name;
                      return (
                        <tr key={event.id} className="hover:bg-slate-900 transition-colors group">
                          <td className="p-4 text-slate-400 font-medium whitespace-nowrap">
                             {event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                             <div className="text-xs text-slate-600">{event.time}</div>
                          </td>
                          <td className="p-4 text-white font-medium">
                            {displayName}
                            {!isViewer && <div className="text-xs text-slate-600">Criado por: {event.createdBy}</div>}
                          </td>
                          <td className="p-4 text-slate-400">
                             {event.city}
                             {!isViewer && <div className="text-xs text-slate-600">{event.venue}</div>}
                          </td>
                          <td className="p-4 text-primary-400 text-sm">{band?.name}</td>
                          {!isViewer && (
                            <td className="p-4 text-center">
                                {!event.hasContract ? (
                                <span title="Pendente" className="text-red-400 flex justify-center"><FileWarning size={16} /></span>
                                ) : (
                                <span title="Ok" className="text-green-500/50 flex justify-center"><FileCheck size={16} /></span>
                                )}
                            </td>
                          )}
                          <td className="p-4 text-center">
                            <StatusBadge status={event.status} />
                          </td>
                          {!isViewer && (
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
                          )}
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

  const BandManagerView = () => {
    // Access Check: Admin or Contracts role
    if (!canManageUsers) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <Ban size={48} className="mb-4 text-slate-700"/>
                <p>Acesso restrito.</p>
            </div>
        )
    }

    // Filter users: Contracts role only sees Viewers (and maybe themselves in a real list, but here strict management is better)
    const visibleUsers = users.filter(u => {
        if (isAdmin) return true;
        if (isContracts) return u.role === UserRole.VIEWER;
        return false;
    });

    return (
      <div className="space-y-8 pb-20 md:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gerenciar Bandas (Admin Only) */}
          {isAdmin && (
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
                        <div>
                            <span className="text-white font-medium block">{band.name}</span>
                            <span className="text-xs text-slate-500">{band.members} integrantes</span>
                        </div>
                        <button 
                            onClick={() => handleEditBand(band)}
                            className="p-1.5 bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Editar Dados da Banda"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                ))}
                {bands.length === 0 && <p className="text-slate-500 text-sm">Nenhuma banda cadastrada.</p>}
                </div>
            </div>
          )}

          {/* Gerenciar Usuários (Admin or Contracts) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Users className="text-green-500" /> Usuários
               </h3>
               <button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-700 transition-colors">
                 + Novo Usuário
               </button>
            </div>
            <div className="space-y-3">
               {visibleUsers.map(u => {
                 const isSelf = currentUser?.id === u.id;
                 const isSuperAdmin = u.email === 'admin';
                 // Permissions: Admin can edit all. Contracts can only edit Viewers.
                 const canEdit = isAdmin || (isContracts && u.role === UserRole.VIEWER);
                 
                 return (
                 <div key={u.id} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800 group">
                    <div>
                       <div className="text-white font-medium flex items-center gap-2">
                         {u.name}
                         <span className={`text-[10px] px-1 rounded uppercase ${u.role === UserRole.ADMIN ? 'bg-primary-900/50 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
                           {u.role}
                         </span>
                       </div>
                       <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                    
                    {canEdit && (
                        <div className="flex gap-2">
                           <button onClick={() => openEditUser(u)} className="p-1.5 bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Editar"><Edit2 size={14}/></button>
                           {!isSuperAdmin && !isSelf && (
                             <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors" title="Excluir"><Trash2 size={14}/></button>
                           )}
                        </div>
                    )}
                 </div>
                 );
               })}
               {visibleUsers.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Nenhum usuário encontrado.</p>}
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
        {currentView === 'pipeline' && <PipelineView />}
        {currentView === 'agenda' && renderAgendaView()}
        {currentView === 'contractors' && <ContractorsView />}
        {currentView === 'bands' && <BandManagerView />}
        {currentView === 'contracts_library' && <ContractsLibraryView />}
      </div>

      {/* Modals */}
      {selectedDateDetails && <DayDetailsModal />}
      
      {isSendModalOpen && selectedEventForSend && (
        <SendContractModal 
          event={selectedEventForSend}
          contractor={contractors.find(c => c.name === selectedEventForSend.contractor)}
          onClose={() => setIsSendModalOpen(false)}
        />
      )}

      {isContractGeneratorOpen && eventForContract && (
         <ContractGeneratorModal 
            event={eventForContract}
            contractors={contractors}
            bands={bands} // Pass bands to generator
            onClose={() => setIsContractGeneratorOpen(false)}
         />
      )}
      
      {isFormOpen && (
        <EventForm 
          bands={getVisibleBands()} 
          contractors={contractors}
          existingEvent={editingEvent}
          currentUser={currentUser}
          initialDate={newEventDate} 
          initialBandId={selectedBandFilter || undefined} 
          onSave={handleSaveEvent}
          onGenerateContract={openContractGenerator}
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

      {isBandFormOpen && (
          <BandForm 
            existingBand={editingBand}
            onSave={handleSaveBand}
            onClose={() => setIsBandFormOpen(false)}
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
