
import React, { useState } from 'react';
import { Band } from '../types';
import { X, Save, Music, Building, CreditCard, Mic2, CheckCircle } from 'lucide-react';

interface BandFormProps {
  existingBand?: Band | null;
  onSave: (band: Band) => void;
  onClose: () => void;
}

// --- Mask Helpers ---
const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .substring(0, 14);
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .substring(0, 15);
};

// RG mask removed

const BandForm: React.FC<BandFormProps> = ({ existingBand, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'legal' | 'bank'>('general');
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<Band>(
    existingBand || {
      id: crypto.randomUUID(),
      name: '',
      legalDetails: {
        razSocial: '', cnpj: '', address: '', repLegal: '', cpfRep: '', rgRep: '', email: '', phone: ''
      },
      bankDetails: {
        bank: '', agency: '', account: '', favored: '', pix: '', cnpj: ''
      }
    }
  );

  const handleChange = (field: keyof Band, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLegalChange = (field: keyof typeof formData.legalDetails, value: string) => {
      let formattedValue = value;

      // Apply Masks based on field
      if (field === 'cnpj') formattedValue = maskCNPJ(value);
      if (field === 'cpfRep') formattedValue = maskCPF(value);
      if (field === 'phone') formattedValue = maskPhone(value);
      // RG mask removed

      setFormData(prev => ({
          ...prev,
          legalDetails: { ...prev.legalDetails, [field]: formattedValue }
      } as Band));
  };

  const handleBankChange = (field: keyof typeof formData.bankDetails, value: string) => {
      let formattedValue = value;

      // Apply Masks based on field
      if (field === 'cnpj') formattedValue = maskCNPJ(value); // CNPJ da conta

      setFormData(prev => ({
          ...prev,
          bankDetails: { ...prev.bankDetails, [field]: formattedValue }
      } as Band));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show Success Feedback
    setShowSuccess(true);

    // Wait 1.5s then Save & Close
    setTimeout(() => {
        onSave(formData);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] relative">
        
        {/* Success Overlay */}
        {showSuccess && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center animate-fade-in">
                <CheckCircle size={64} className="text-green-500 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-white">Salvo com Sucesso!</h3>
                <p className="text-slate-400 mt-2">Os dados da banda foram atualizados.</p>
            </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music size={24} className="text-primary-500" />
            {existingBand ? 'Editar Banda' : 'Nova Banda'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'general' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            <Mic2 size={16}/> Dados Gerais
          </button>
          <button
            onClick={() => setActiveTab('legal')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'legal' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            <Building size={16}/> Dados Jurídicos
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'bank' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}
          >
            <CreditCard size={16}/> Dados Bancários
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Banda</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
                  placeholder="Ex: Banda Show"
                />
              </div>
              {/* Removed Genre and Members inputs */}
            </div>
          )}

          {activeTab === 'legal' && (
              <div className="space-y-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-white font-medium mb-4 flex items-center gap-2">Empresa Contratada (Contrato)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Razão Social</label>
                              <input type="text" value={formData.legalDetails?.razSocial || ''} onChange={e => handleLegalChange('razSocial', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Nome jurídico da empresa da banda"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">CNPJ</label>
                              <input 
                                type="text" 
                                value={formData.legalDetails?.cnpj || ''} 
                                onChange={e => handleLegalChange('cnpj', e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                placeholder="00.000.000/0000-00"
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Representante Legal</label>
                              <input type="text" value={formData.legalDetails?.repLegal || ''} onChange={e => handleLegalChange('repLegal', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Endereço Completo</label>
                              <input type="text" value={formData.legalDetails?.address || ''} onChange={e => handleLegalChange('address', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">CPF Representante</label>
                              <input 
                                type="text" 
                                value={formData.legalDetails?.cpfRep || ''} 
                                onChange={e => handleLegalChange('cpfRep', e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                placeholder="000.000.000-00"
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">RG Representante</label>
                              <input 
                                type="text" 
                                value={formData.legalDetails?.rgRep || ''} 
                                onChange={e => handleLegalChange('rgRep', e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                placeholder=""
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                              <input type="email" value={formData.legalDetails?.email || ''} onChange={e => handleLegalChange('email', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Telefone</label>
                              <input 
                                type="text" 
                                value={formData.legalDetails?.phone || ''} 
                                onChange={e => handleLegalChange('phone', e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                placeholder="(00) 00000-0000"
                              />
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'bank' && (
              <div className="space-y-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-white font-medium mb-4 flex items-center gap-2">Conta para Recebimento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Banco</label>
                              <input type="text" value={formData.bankDetails?.bank || ''} onChange={e => handleBankChange('bank', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Agência</label>
                              <input type="text" value={formData.bankDetails?.agency || ''} onChange={e => handleBankChange('agency', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Conta Corrente</label>
                              <input type="text" value={formData.bankDetails?.account || ''} onChange={e => handleBankChange('account', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Chave PIX</label>
                              <input type="text" value={formData.bankDetails?.pix || ''} onChange={e => handleBankChange('pix', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Favorecido (Titular)</label>
                              <input type="text" value={formData.bankDetails?.favored || ''} onChange={e => handleBankChange('favored', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">CNPJ/CPF (Conta)</label>
                              <input 
                                type="text" 
                                value={formData.bankDetails?.cnpj || ''} 
                                onChange={e => handleBankChange('cnpj', e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                placeholder="00.000.000/0000-00"
                              />
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-600/20 transition-all"
          >
            <Save size={18} /> Salvar Banda
          </button>
        </div>
      </div>
    </div>
  );
};

export default BandForm;