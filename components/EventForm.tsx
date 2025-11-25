import React, { useState, useEffect } from 'react';
import { Band, Event, EventStatus, Contractor } from '../types';
import { X, Calculator, Sparkles, User, Phone, MapPin, Mail } from 'lucide-react';
import { generateEventBrief } from '../services/geminiService';

interface EventFormProps {
  bands: Band[];
  contractors: Contractor[];
  existingEvent?: Event | null;
  onSave: (event: Event) => void;
  onClose: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ bands, contractors, existingEvent, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'ai'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  
  // Estado local para exibir detalhes do contratante selecionado
  const [selectedContractorInfo, setSelectedContractorInfo] = useState<Contractor | undefined>(undefined);

  const [formData, setFormData] = useState<Event>({
    id: existingEvent?.id || crypto.randomUUID(),
    bandId: existingEvent?.bandId || bands[0]?.id || '',
    name: existingEvent?.name || '',
    date: existingEvent?.date ? new Date(existingEvent.date).toISOString().split('T')[0] : '',
    time: existingEvent?.time || '20:00',
    durationHours: existingEvent?.durationHours || 2,
    city: existingEvent?.city || '',
    venue: existingEvent?.venue || '',
    contractor: existingEvent?.contractor || '',
    notes: existingEvent?.notes || '',
    status: existingEvent?.status || EventStatus.RESERVED,
    financials: existingEvent?.financials || {
      grossValue: 0,
      commissionType: 'PERCENTAGE',
      commissionValue: 10,
      taxes: 0,
      netValue: 0,
      currency: 'BRL'
    }
  });

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
    if (!process.env.API_KEY) {
      setAiSummary("API Key not found in environment.");
      return;
    }
    setIsGenerating(true);
    const band = bands.find(b => b.id === formData.bandId);
    const summary = await generateEventBrief(formData, band?.name || 'Banda');
    setAiSummary(summary);
    setIsGenerating(false);
  };

  const handleChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContractorChange = (value: string) => {
    handleChange('contractor', value);
    // Tenta encontrar dados adicionais para auto-preencher cidade se estiver vazio
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

  const handleFinancialChange = (field: keyof typeof formData.financials, value: any) => {
    setFormData(prev => ({
      ...prev,
      financials: { ...prev.financials, [field]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950">
          <h2 className="text-xl font-bold text-white">
            {existingEvent ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            Detalhes & Logística
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'financials' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            Financeiro
          </button>
          {existingEvent && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles size={16} /> Assistente IA
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Local do Evento (Venue)</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => handleChange('venue', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              {/* Seção de Contratante Aprimorada */}
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
                      {/* Fallback para digitar caso não esteja na lista (embora o select acima restrinja, 
                          em um cenário real usaríamos um datalist ou combobox. 
                          Para simplificar mantendo o select, adicionamos um botão 'Outro' se necessário, 
                          mas aqui assumiremos seleção da lista ou input direto se transformássemos o componente) 
                      */}
                      
                      {/* Caso o usuário queira digitar um nome que não está na lista */}
                      <input 
                         type="text"
                         className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 placeholder-slate-600 focus:text-white focus:border-primary-500"
                         placeholder="Ou digite um novo contratante aqui..."
                         value={formData.contractor}
                         onChange={(e) => handleChange('contractor', e.target.value)}
                      />
                    </div>
                  </div>
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
                </div>

                {/* Card de Informações do Contratante */}
                {selectedContractorInfo && (
                  <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800 flex flex-col gap-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-primary-400 font-medium text-sm">
                      <User size={14} /> 
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

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Informações Adicionais</label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none resize-none"
                  placeholder="Detalhes técnicos, camarim, logística..."
                ></textarea>
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
                      type="number"
                      value={formData.financials.grossValue}
                      onChange={(e) => handleFinancialChange('grossValue', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-lg font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Impostos/Taxas (R$)</label>
                    <input
                      type="number"
                      value={formData.financials.taxes}
                      onChange={(e) => handleFinancialChange('taxes', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
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
                     <input
                      type="number"
                      value={formData.financials.commissionValue}
                      onChange={(e) => handleFinancialChange('commissionValue', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-700 w-full md:w-1/2">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-slate-400">Bruto</span>
                     <span className="text-white font-medium">R$ {formData.financials.grossValue.toLocaleString('pt-BR')}</span>
                   </div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-red-400">Comissão</span>
                     <span className="text-red-400 font-medium">- R$ {(formData.financials.commissionType === 'PERCENTAGE' ? (formData.financials.grossValue * formData.financials.commissionValue / 100) : formData.financials.commissionValue).toLocaleString('pt-BR')}</span>
                   </div>
                   <div className="flex justify-between items-center mb-4">
                     <span className="text-red-400">Impostos</span>
                     <span className="text-red-400 font-medium">- R$ {formData.financials.taxes.toLocaleString('pt-BR')}</span>
                   </div>
                   <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                     <span className="text-slate-300 text-lg">Líquido</span>
                     <span className="text-green-400 text-2xl font-bold">R$ {formData.financials.netValue.toLocaleString('pt-BR')}</span>
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
  );
};

export default EventForm;