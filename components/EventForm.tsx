import React, { useState, useEffect } from 'react';
import { Band, Event, EventStatus, Contractor, User, UserRole, ContractFile, PipelineStage } from '../types';
import { X, Calculator, Sparkles, User as UserIcon, Phone, MapPin, Mail, FileCheck, FileWarning, Tag, Upload, FileText, Trash2, Plus, Truck, Plane, Hotel, PenTool, Printer, ExternalLink, ClipboardCopy } from 'lucide-react';
import { generateEventBrief } from '../services/geminiService';
import { db } from '../services/databaseService';

interface EventFormProps {
  bands: Band[];
  contractors: Contractor[];
  existingEvent?: Event | null;
  currentUser: User | null;
  initialDate?: string;
  initialBandId?: string;
  onSave: (event: Event) => void;
  onGenerateContract: (event: Event) => void;
  onClose: () => void;
}

// Currency Formatter Helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Input Parser: converts "R$ 1.500,00" -> 1500.00
const parseCurrencyInput = (inputValue: string) => {
  // Remove non-digits
  const digits = inputValue.replace(/\D/g, '');
  // Treat as cents (divide by 100)
  return parseFloat(digits) / 100;
};

const EventForm: React.FC<EventFormProps> = ({ bands, contractors, existingEvent, currentUser, initialDate, initialBandId, onSave, onGenerateContract, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'logistics' | 'financials' | 'ai'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  
  // Suggestions State
  const [typeSuggestions, setTypeSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<string[]>([]);

  // Estado local para exibir detalhes do contratante selecionado
  const [selectedContractorInfo, setSelectedContractorInfo] = useState<Contractor | undefined>(undefined);

  // Link Sharing Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  // Access Control logic
  const canSeeFinancials = currentUser?.role === UserRole.ADMIN || 
                           currentUser?.role === UserRole.MANAGER || 
                           currentUser?.role === UserRole.CONTRACTS ||
                           currentUser?.role === UserRole.SALES;
                           
  const canEditContracts = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.CONTRACTS;

  const [formData, setFormData] = useState<Event>({
    id: existingEvent?.id || crypto.randomUUID(),
    bandId: existingEvent?.bandId || initialBandId || bands[0]?.id || '',
    name: existingEvent?.name || '',
    eventType: existingEvent?.eventType || '',
    date: existingEvent?.date 
      ? new Date(existingEvent.date).toISOString().split('T')[0] 
      : (initialDate || new Date().toISOString().split('T')[0]),
    time: existingEvent?.time || '20:00',
    durationHours: existingEvent?.durationHours || 2,
    city: existingEvent?.city || '',
    venue: existingEvent?.venue || '',
    venueAddress: existingEvent?.venueAddress || '',
    producerContact: existingEvent?.producerContact || '',
    contractor: existingEvent?.contractor || '',
    notes: existingEvent?.notes || '',
    status: existingEvent?.status || EventStatus.RESERVED,
    financials: existingEvent?.financials || {
      grossValue: 0,
      commissionType: 'FIXED', // Changed default
      commissionValue: 0,      // Changed default
      taxes: 0,
      netValue: 0,
      currency: 'BRL',
      notes: ''
    },
    createdBy: existingEvent?.createdBy || currentUser?.name || 'Sistema',
    createdAt: existingEvent?.createdAt || new Date().toISOString(),
    hasContract: existingEvent?.hasContract !== undefined ? existingEvent.hasContract : false,
    contractUrl: existingEvent?.contractUrl || '',
    contractFiles: existingEvent?.contractFiles || [],
    pipelineStage: existingEvent?.pipelineStage || PipelineStage.LEAD,
    logistics: existingEvent?.logistics || {
      transport: '',
      departureTime: '',
      returnTime: '',
      hotel: '',
      flights: '',
      crew: '',
      rider: '',
      notes: ''
    },
    contractorFormToken: existingEvent?.contractorFormToken || '',
    contractorFormStatus: existingEvent?.contractorFormStatus || 'PENDING'
  });

  // Load Suggestions on Mount
  useEffect(() => {
    const loadSuggestions = async () => {
      setTypeSuggestions(await db.getUniqueValues('eventType'));
      setCitySuggestions(await db.getUniqueValues('city'));
      setVenueSuggestions(await db.getUniqueValues('venue'));
    };
    loadSuggestions();
  }, []);

  // Atualiza infos do contratante se já houver um nome preenchido (edição)
  useEffect(() => {
    if (formData.contractor) {
      const match = contractors.find(c => c.name === formData.contractor);
      setSelectedContractorInfo(match);
    }
  }, [formData.contractor, contractors]);

  // Auto-calculate net value
  useEffect(() => {
    const { grossValue, commissionType, commissionValue, taxes } = formData.financials;
    let commissionAmount = 0;

    if (commissionType === 'PERCENTAGE') {
      commissionAmount = (grossValue * commissionValue) / 100;
    } else {
      commissionAmount = commissionValue;
    }

    const net = grossValue - commissionAmount - taxes;
    
    setFormData(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        netValue: net
      }
    }));
  }, [formData.financials.grossValue, formData.financials.commissionType, formData.financials.commissionValue, formData.financials.taxes]);

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    const band = bands.find(b => b.id === formData.bandId);
    // FIX: Removed redundant API key check. The service handles initialization.
    const summary = await generateEventBrief(formData, band?.name || 'Banda');
    setAiSummary(summary);
    setIsGenerating(false);
  };

  const handleChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogisticsChange = (field: keyof typeof formData.logistics, value: string) => {
    setFormData(prev => ({
       ...prev,
       logistics: { ...prev.logistics, [field]: value }
    }));
  };

  const handleContractorChange = (value: string) => {
    handleChange('contractor', value);
    const match = contractors.find(c => c.name === value);
    if (match) {
      if (!formData.city && match.address.city) {
         handleChange('city', match.address.city);
      }
      if (!formData.venue && match.additionalInfo.venue) {
         handleChange('venue', match.additionalInfo.venue);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: ContractFile[] = Array.from(e.target.files).map((file: any) => ({
        name: file.name,
        url: file.name, // Mock URL
        uploadedAt: new Date().toISOString()
      }));

      setFormData(prev => ({
        ...prev,
        contractFiles: [...(prev.contractFiles || []), ...newFiles],
        hasContract: true // Auto check "received" if file uploaded
      }));
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFormData(prev => {
        const updatedFiles = prev.contractFiles.filter((_, index) => index !== indexToRemove);
        return {
            ...prev,
            contractFiles: updatedFiles,
            hasContract: updatedFiles.length > 0
        };
    });
  };

  const handleFinancialChange = (field: keyof typeof formData.financials, value: any) => {
    setFormData(prev => ({
      ...prev,
      financials: { ...prev.financials, [field]: value }
    }));
  };

  const handleCurrencyChange = (field: keyof typeof formData.financials, inputValue: string) => {
     const numberValue = parseCurrencyInput(inputValue);
     handleFinancialChange(field, numberValue);
  };
  
  const handleGenerateShareLink = async () => {
    const token = await db.generateContractorFormToken(formData.id);
    const updatedEvent = { ...formData, contractorFormToken: token, contractorFormStatus: 'SENT' as const };
    await onSave(updatedEvent); // Save event with token
    setFormData(updatedEvent); // Update local form state
    const link = `${window.location.origin}${window.location.pathname}?form_token=${token}`;
    setShareableLink(link);
    setIsShareModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const PIPELINE_LABELS: Record<string, string> = {
     [PipelineStage.LEAD]: 'Lead / Contato',
     [PipelineStage.QUALIFICATION]: 'Qualificação',
     [PipelineStage.PROPOSAL]: 'Proposta Enviada',
     [PipelineStage.NEGOTIATION]: 'Negociação',
     [PipelineStage.CONTRACT]: 'Emissão Contrato',
     [PipelineStage.WON]: 'Fechado (Ganho)',
     [PipelineStage.LOST]: 'Perdido'
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white">
              {existingEvent ? 'Editar Evento' : 'Novo Evento'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Criado por: <span className="text-slate-300">{formData.createdBy}</span> em {new Date(formData.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Pipeline Status Bar (New) */}
        <div className="bg-slate-900 px-6 pt-4 pb-2">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status do Pipeline (CRM)</label>
           <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
              {Object.keys(PipelineStage).map((stage) => {
                 const currentIdx = Object.keys(PipelineStage).indexOf(formData.pipelineStage);
                 const thisIdx = Object.keys(PipelineStage).indexOf(stage);
                 const isActive = stage === formData.pipelineStage;
                 const isPast = thisIdx < currentIdx;
                 
                 let colorClass = 'bg-slate-800 text-slate-500 border-slate-700';
                 if (isActive) colorClass = 'bg-primary-600 text-white border-primary-500';
                 else if (isPast) colorClass = 'bg-primary-900/40 text-primary-300 border-primary-900';

                 return (
                   <button 
                     key={stage}
                     type="button"
                     onClick={() => handleChange('pipelineStage', stage)}
                     className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${colorClass}`}
                   >
                     {PIPELINE_LABELS[stage]}
                   </button>
                 )
              })}
           </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 min-w-[100px] py-4 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            Detalhes
          </button>
          
          <button
            onClick={() => setActiveTab('logistics')}
            className={`flex-1 min-w-[100px] py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'logistics' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
             <Truck size={16}/> Logística
          </button>

          {canSeeFinancials && (
            <button
              onClick={() => setActiveTab('financials')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium transition-colors ${activeTab === 'financials' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
            >
              Financeiro
            </button>
          )}
          
          {existingEvent && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles size={16} /> IA
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Evento</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ex: Casamento João & Maria"
                  />
                </div>
                
                {/* Tipo de Evento com Auto-Suggest */}
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                     <Tag size={12}/> Tipo de Evento
                   </label>
                   <input
                    type="text"
                    list="eventTypes"
                    value={formData.eventType}
                    onChange={(e) => handleChange('eventType', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    placeholder="Ex: Casamento, Corporativo..."
                   />
                   <datalist id="eventTypes">
                     {typeSuggestions.map((type, i) => <option key={i} value={type} />)}
                   </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Banda</label>
                  <select
                    value={formData.bandId}
                    onChange={(e) => handleChange('bandId', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  >
                    {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Data</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Horário</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleChange('time', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Duração (h)</label>
                  <input
                    type="number"
                    value={formData.durationHours}
                    onChange={(e) => handleChange('durationHours', parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Cidade/UF</label>
                  <input
                    type="text"
                    list="cities"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                  <datalist id="cities">
                     {citySuggestions.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Local do Evento (Venue)</label>
                  <input
                    type="text"
                    list="venues"
                    value={formData.venue}
                    onChange={(e) => handleChange('venue', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                   <datalist id="venues">
                     {venueSuggestions.map((v, i) => <option key={i} value={v} />)}
                   </datalist>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Endereço do Local</label>
                  <input type="text" value={formData.venueAddress} onChange={(e) => handleChange('venueAddress', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Contato do Produtor (Nome e Número)</label>
                  <input type="text" value={formData.producerContact} onChange={(e) => handleChange('producerContact', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                </div>
              </div>

              {/* Seção de Contratante */}
              <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Contratante</label>
                    <div className="relative">
                      <select
                        value={formData.contractor}
                        onChange={(e) => handleContractorChange(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none appearance-none"
                      >
                        <option value="">Selecione ou digite...</option>
                        {contractors.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      
                      <input 
                         type="text"
                         className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 placeholder-slate-600 focus:text-white focus:border-primary-500"
                         placeholder="Ou digite um novo contratante aqui..."
                         value={formData.contractor}
                         onChange={(e) => handleChange('contractor', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                      >
                        {Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Gestão de Contratos (Visible only for Admins & Contracts Role) */}
                    {(canEditContracts) && (
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Gestão de Contrato</label>
                        
                        <div className="flex gap-2 mb-3">
                           <button
                             type="button"
                             onClick={() => onGenerateContract(formData)}
                             className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs text-white py-2 rounded border border-slate-600 flex items-center justify-center gap-1"
                             title="Gerar minuta automática"
                           >
                             <PenTool size={12} /> Gerar Minuta
                           </button>
                           <button
                             type="button"
                             onClick={handleGenerateShareLink}
                             className="flex-1 bg-blue-800 hover:bg-blue-700 text-xs text-white py-2 rounded border border-blue-600 flex items-center justify-center gap-1"
                             title="Gerar link para o contratante preencher os dados"
                           >
                             <ExternalLink size={12} /> Gerar Link p/ Contratante
                           </button>
                        </div>

                        {/* Toggle Checkbox */}
                        <div 
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all mb-3 ${formData.hasContract ? 'bg-green-900/20' : 'bg-red-900/10'}`}
                          onClick={() => handleChange('hasContract', !formData.hasContract)}
                        >
                          <div className={`p-1.5 rounded-full ${formData.hasContract ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {formData.hasContract ? <FileCheck size={16} /> : <FileWarning size={16} />}
                          </div>
                          <div className="flex-1">
                            <span className={`block font-medium text-sm ${formData.hasContract ? 'text-green-400' : 'text-red-400'}`}>
                              {formData.hasContract ? 'Contrato Recebido' : 'Pendente'}
                            </span>
                          </div>
                          <div className={`w-8 h-5 rounded-full relative transition-colors ${formData.hasContract ? 'bg-green-500' : 'bg-slate-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.hasContract ? 'left-4' : 'left-1'}`} />
                          </div>
                        </div>

                        {/* File Upload Mock (Multi-file) */}
                        <div className="flex flex-col gap-2">
                           <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded px-3 py-2 text-center transition-colors">
                              <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Plus size={14}/> {formData.contractFiles.length > 0 ? 'Adicionar Outro Arquivo' : 'Enviar Contrato (PDF)'}
                              </span>
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx" multiple onChange={handleFileUpload} />
                           </label>
                           
                           {/* File List */}
                           {formData.contractFiles.length > 0 && (
                             <div className="space-y-1 mt-1">
                               {formData.contractFiles.map((file, idx) => (
                                 <div key={idx} className="flex justify-between items-center bg-slate-800 px-2 py-1 rounded text-xs">
                                    <div className="flex items-center gap-2 text-green-400 truncate">
                                      <FileText size={12} />
                                      <span className="truncate max-w-[150px]">{file.name}</span>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={() => removeFile(idx)}
                                      className="text-slate-500 hover:text-red-400 p-1"
                                      title="Remover arquivo"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                 </div>
                               ))}
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card de Informações do Contratante */}
                {selectedContractorInfo && (
                  <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800 flex flex-col gap-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-primary-400 font-medium text-sm">
                      <UserIcon size={14} /> 
                      <span>{selectedContractorInfo.responsibleName || 'Responsável não informado'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Phone size={12} /> {selectedContractorInfo.whatsapp || selectedContractorInfo.phone || 'Sem telefone'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} /> {selectedContractorInfo.email || 'Sem email'}
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                         <MapPin size={12} /> {selectedContractorInfo.address.city}, {selectedContractorInfo.address.state}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2"><Truck size={18} className="text-primary-500"/> Transporte Terrestre</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Tipo de Transporte</label>
                                <input type="text" value={formData.logistics.transport} onChange={e => handleLogisticsChange('transport', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Ex: Van Executiva, Carro Próprio"/>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Saída</label>
                                    <input type="time" value={formData.logistics.departureTime} onChange={e => handleLogisticsChange('departureTime', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Retorno</label>
                                    <input type="time" value={formData.logistics.returnTime} onChange={e => handleLogisticsChange('returnTime', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2"><Hotel size={18} className="text-primary-500"/> Hospedagem & Aéreo</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Hotel / Acomodação</label>
                                <input type="text" value={formData.logistics.hotel} onChange={e => handleLogisticsChange('hotel', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Nome do Hotel, Check-in/out"/>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Plane size={12}/> Voo / Detalhes</label>
                                <input type="text" value={formData.logistics.flights} onChange={e => handleLogisticsChange('flights', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Cia Aérea, Nº Voo, Horários"/>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-white font-medium mb-3">Equipe & Técnico</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Equipe (Roadies, Techs)</label>
                            <textarea rows={3} value={formData.logistics.crew} onChange={e => handleLogisticsChange('crew', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm resize-none" placeholder="Liste os nomes da equipe..."></textarea>
                        </div>
                        <div>
                             <label className="block text-xs text-slate-400 mb-1">Rider Técnico / Palco</label>
                             <textarea rows={3} value={formData.logistics.rider} onChange={e => handleLogisticsChange('rider', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm resize-none" placeholder="Inputs, Mapa de Palco, Voltagem..."></textarea>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Calculator size={20} className="text-primary-500"/> Cálculos do Cachê
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Valor Bruto (R$)</label>
                    <input
                      type="text"
                      value={formatCurrency(formData.financials.grossValue)}
                      onChange={(e) => handleCurrencyChange('grossValue', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-lg font-semibold outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Impostos/Taxas (R$)</label>
                    <input
                      type="text"
                      value={formatCurrency(formData.financials.taxes)}
                      onChange={(e) => handleCurrencyChange('taxes', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Comissão</label>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleFinancialChange('commissionType', 'PERCENTAGE')}
                        className={`flex-1 py-1.5 text-sm rounded-md transition-all ${formData.financials.commissionType === 'PERCENTAGE' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}
                      >
                        Porcentagem (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinancialChange('commissionType', 'FIXED')}
                        className={`flex-1 py-1.5 text-sm rounded-md transition-all ${formData.financials.commissionType === 'FIXED' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}
                      >
                        Valor Fixo (R$)
                      </button>
                    </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-1">
                       {formData.financials.commissionType === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Valor (R$)'}
                     </label>
                     {formData.financials.commissionType === 'PERCENTAGE' ? (
                       <input
                        type="number"
                        value={formData.financials.commissionValue}
                        onChange={(e) => handleFinancialChange('commissionValue', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                       />
                     ) : (
                       <input
                        type="text"
                        value={formatCurrency(formData.financials.commissionValue)}
                        onChange={(e) => handleCurrencyChange('commissionValue', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                        placeholder="R$ 0,00"
                       />
                     )}
                  </div>
                </div>
              </div>

              {/* Informações Adicionais (New Field) */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Informações Adicionais (Financeiro)</label>
                <textarea
                  rows={3}
                  value={formData.financials.notes || ''}
                  onChange={(e) => handleFinancialChange('notes', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none resize-none"
                  placeholder="Detalhes sobre pagamentos, parcelas, contas bancárias..."
                ></textarea>
              </div>

              <div className="flex justify-end">
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-700 w-full md:w-1/2">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-slate-400">Bruto</span>
                     <span className="text-white font-medium">{formatCurrency(formData.financials.grossValue)}</span>
                   </div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-red-400">Comissão</span>
                     <span className="text-red-400 font-medium">- {formatCurrency(formData.financials.commissionType === 'PERCENTAGE' ? (formData.financials.grossValue * formData.financials.commissionValue / 100) : formData.financials.commissionValue)}</span>
                   </div>
                   <div className="flex justify-between items-center mb-4">
                     <span className="text-red-400">Impostos</span>
                     <span className="text-red-400 font-medium">- {formatCurrency(formData.financials.taxes)}</span>
                   </div>
                   <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                     <span className="text-slate-300 text-lg">Líquido</span>
                     <span className="text-green-400 text-2xl font-bold">{formatCurrency(formData.financials.netValue)}</span>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && existingEvent && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-6 text-center">
                 <Sparkles className="w-12 h-12 text-accent-500 mx-auto mb-3" />
                 <h3 className="text-white font-bold text-lg">AI Event Summarizer</h3>
                 <p className="text-slate-400 text-sm mb-4">Gere um resumo formatado automaticamente para enviar no grupo da banda.</p>
                 <button
                  type="button"
                  onClick={handleGenerateBrief}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-accent-500 hover:bg-accent-500/80 text-white rounded-full font-medium transition-all shadow-lg shadow-accent-500/20 disabled:opacity-50"
                 >
                   {isGenerating ? 'Gerando...' : 'Gerar Resumo WhatsApp'}
                 </button>
              </div>
              
              {aiSummary && (
                <div className="mt-4">
                  <label className="text-sm text-slate-400 mb-2 block">Resumo Gerado:</label>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative group">
                    <pre className="text-slate-300 whitespace-pre-wrap font-sans text-sm">{aiSummary}</pre>
                    <button 
                      type="button"
                      onClick={() => navigator.clipboard.writeText(aiSummary)}
                      className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
             >
               Cancelar
             </button>
             <button
               type="submit"
               className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-600/20 transition-all"
             >
               Salvar Evento
             </button>
          </div>
        </form>
      </div>
    </div>
    
    {isShareModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
            <div className="bg-slate-800 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl text-center p-8">
                <div className="w-16 h-16 bg-blue-500/10 border-4 border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink size={32} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Link Gerado com Sucesso!</h3>
                <p className="text-slate-400 mt-2 mb-6">Envie este link para o contratante preencher os dados do evento.</p>
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <input type="text" readOnly value={shareableLink} className="w-full bg-transparent text-slate-300 text-sm outline-none pr-12"/>
                    <button 
                        onClick={() => navigator.clipboard.writeText(shareableLink)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white bg-slate-700 rounded"
                    >
                        <ClipboardCopy size={16}/>
                    </button>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg font-medium">Fechar</button>
            </div>
        </div>
    )}
    </>
  );
};

export default EventForm;