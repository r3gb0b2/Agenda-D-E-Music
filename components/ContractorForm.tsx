
import React, { useState } from 'react';
import { Contractor, ContractorType } from '../types';
import { X, Save, MapPin, User, FileText, Phone, Loader2, CreditCard, Cake } from 'lucide-react';

interface ContractorFormProps {
  existingContractor?: Contractor | null;
  onSave: (contractor: Contractor) => void;
  onClose: () => void;
}

// --- Mask Helpers (Reused from BandForm) ---
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

const ContractorForm: React.FC<ContractorFormProps> = ({ existingContractor, onSave, onClose }) => {
  const [formData, setFormData] = useState<Contractor>(
    existingContractor || {
      id: crypto.randomUUID(),
      type: ContractorType.FISICA,
      name: '',
      responsibleName: '',
      repLegalAddress: '',
      repLegalPhone: '',
      birthDate: '',
      cpf: '',
      rg: '',
      cnpj: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        zipCode: '',
        city: '',
        state: '',
        country: 'Brasil'
      },
      additionalInfo: {
        event: '',
        venue: '',
        notes: ''
      }
    }
  );

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const handleChange = (field: keyof Contractor, value: any) => {
    let formattedValue = value;
    if (field === 'phone' || field === 'whatsapp' || field === 'repLegalPhone') formattedValue = maskPhone(value);
    if (field === 'cpf') formattedValue = maskCPF(value);
    if (field === 'cnpj') formattedValue = maskCNPJ(value);
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleAddressChange = (field: keyof typeof formData.address, value: string) => {
    setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
           setFormData(prev => ({ ...prev, address: { ...prev.address, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf, country: 'Brasil' }}));
        }
      } catch (err) { console.warn("Error fetching CEP", err); } finally { setIsLoadingCep(false); }
    }
  };

  const handleInfoChange = (field: keyof typeof formData.additionalInfo, value: string) => {
    setFormData(prev => ({ ...prev, additionalInfo: { ...prev.additionalInfo, [field]: value } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><User size={24} className="text-primary-500"/>{existingContractor ? 'Editar Contratante' : 'Novo Contratante'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"><label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Cadastro</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={formData.type === ContractorType.FISICA} onChange={() => handleChange('type', ContractorType.FISICA)} className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-600 bg-slate-800"/><span className={`text-sm font-medium ${formData.type === ContractorType.FISICA ? 'text-white' : 'text-slate-400'}`}>Pessoa Física</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={formData.type === ContractorType.JURIDICA} onChange={() => handleChange('type', ContractorType.JURIDICA)} className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-600 bg-slate-800"/><span className={`text-sm font-medium ${formData.type === ContractorType.JURIDICA ? 'text-white' : 'text-slate-400'}`}>Pessoa Jurídica</span></label></div></div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2"><Phone size={18} className="text-accent-500"/> Contato e Documentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">{formData.type === ContractorType.FISICA ? 'Nome Completo' : 'Razão Social / Nome Fantasia'} *</label><input required type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder={formData.type === ContractorType.FISICA ? "Ex: João da Silva" : "Ex: Produções Eventos LTDA"}/></div>
              {formData.type === ContractorType.FISICA ? (<><div><label className="block text-sm font-medium text-slate-400 mb-1">CPF</label><input type="text" value={formData.cpf || ''} onChange={(e) => handleChange('cpf', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="000.000.000-00"/></div><div><label className="block text-sm font-medium text-slate-400 mb-1">RG</label><input type="text" value={formData.rg || ''} onChange={(e) => handleChange('rg', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder=""/></div></>) : (<><div><label className="block text-sm font-medium text-slate-400 mb-1">CNPJ</label><input type="text" value={formData.cnpj || ''} onChange={(e) => handleChange('cnpj', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="00.000.000/0000-00"/></div><div><label className="block text-sm font-medium text-slate-400 mb-1">Inscrição Estadual / RG Rep</label><input type="text" value={formData.rg || ''} onChange={(e) => handleChange('rg', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder=""/></div></>)}
              <div className="md:col-span-2 bg-slate-800/30 p-3 rounded border border-slate-800 mt-2">
                 <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Dados de Contato</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-400 mb-1">Responsável / Rep. Legal</label><input type="text" value={formData.responsibleName} onChange={(e) => handleChange('responsibleName', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="Nome do contato principal"/></div>
                    <div><label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label><input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
                    <div><label className="block text-sm font-medium text-slate-400 mb-1">Telefone Principal</label><input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="(00) 00000-0000"/></div>
                    <div><label className="block text-sm font-medium text-slate-400 mb-1">Whatsapp</label><input type="tel" value={formData.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="(00) 00000-0000"/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">Endereço do Rep. Legal</label><input type="text" value={formData.repLegalAddress || ''} onChange={(e) => handleChange('repLegalAddress', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" placeholder="Rua, Número, Bairro, Cidade, Estado..."/></div>
                    <div><label className="block text-sm font-medium text-slate-400 mb-1">Telefone do Rep. Legal</label><input type="tel" value={formData.repLegalPhone || ''} onChange={(e) => handleChange('repLegalPhone', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" placeholder="(00) 00000-0000"/></div>
                    <div><label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1"><Cake size={14}/> Data de Nascimento (Rep. Legal)</label><input type="date" value={formData.birthDate || ''} onChange={(e) => handleChange('birthDate', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"/></div>
                 </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2"><MapPin size={18} className="text-green-500"/> Endereço Principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-1 relative"><label className="block text-sm font-medium text-slate-400 mb-1">CEP</label><input type="text" value={formData.address.zipCode} onChange={(e) => handleAddressChange('zipCode', e.target.value)} onBlur={handleCepBlur} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="00000-000"/>{isLoadingCep && <div className="absolute right-3 top-9"><Loader2 className="animate-spin text-primary-500" size={16}/></div>}</div>
              <div className="md:col-span-4"><label className="block text-sm font-medium text-slate-400 mb-1">Logradouro / Rua</label><input type="text" value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
              <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-400 mb-1">Número</label><input type="text" value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">Bairro</label><input type="text" value={formData.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">Complemento</label><input type="text" value={formData.address.complement} onChange={(e) => handleAddressChange('complement', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">Cidade</label><input type="text" value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
              <div className="md:col-span-3"><label className="block text-sm font-medium text-slate-400 mb-1">Estado</label><input type="text" value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="Ex: Alagoas"/></div>
              <div className="md:col-span-3"><label className="block text-sm font-medium text-slate-400 mb-1">País</label><input type="text" value={formData.address.country} onChange={(e) => handleAddressChange('country', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"/></div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2"><FileText size={18} className="text-blue-500"/> Informações Adicionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-slate-400 mb-1">Evento (Padrão/Referência)</label><input type="text" value={formData.additionalInfo.event} onChange={(e) => handleInfoChange('event', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="Tipo de evento comum"/></div>
              <div><label className="block text-sm font-medium text-slate-400 mb-1">Local (Venue Padrão)</label><input type="text" value={formData.additionalInfo.venue} onChange={(e) => handleInfoChange('venue', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none" placeholder="Local de eventos frequente"/></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-400 mb-1">Observações Gerais</label><textarea rows={4} value={formData.additionalInfo.notes} onChange={(e) => handleInfoChange('notes', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none resize-none focus:border-primary-500" placeholder="Detalhes sobre negociação, preferências, etc."></textarea></div>
          </div>
        </form>
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-600/20 transition-all"><Save size={18}/> Salvar Contratante</button>
        </div>
      </div>
    </div>
  );
};

export default ContractorForm;
