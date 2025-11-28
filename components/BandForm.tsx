import React, { useState } from 'react';
import { Band, BandCompanyInfo } from '../types';
import { X, Save, Music, Building, User, Hash, MapPin, Mail, Phone } from 'lucide-react';

interface BandFormProps {
  existingBand?: Band | null;
  onSave: (band: Band) => void;
  onClose: () => void;
}

const BandForm: React.FC<BandFormProps> = ({ existingBand, onSave, onClose }) => {
  const [formData, setFormData] = useState<Band>(
    existingBand || {
      id: crypto.randomUUID(),
      name: '',
      genre: '',
      members: 1,
      companyInfo: {
        razaoSocial: '',
        cnpj: '',
        endereco: '',
        representanteLegal: '',
        cpfRepresentante: '',
        rgRepresentante: '',
        email: '',
        telefone: ''
      }
    }
  );

  const handleChange = (field: keyof Band, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompanyInfoChange = (field: keyof BandCompanyInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      companyInfo: { ...prev.companyInfo, [field]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music size={24} className="text-primary-500" />
            {existingBand ? 'Editar Banda' : 'Nova Banda'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <Music size={16} /> Informações da Banda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Banda *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Gênero Musical</label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => handleChange('genre', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nº de Integrantes</label>
                <input
                  type="number"
                  value={formData.members}
                  onChange={(e) => handleChange('members', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <Building size={16} /> Dados da Empresa (Contratada)
            </h3>
            <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Razão Social</label>
                    <input type="text" value={formData.companyInfo.razaoSocial} onChange={(e) => handleCompanyInfoChange('razaoSocial', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">CNPJ</label>
                    <input type="text" value={formData.companyInfo.cnpj} onChange={(e) => handleCompanyInfoChange('cnpj', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1"><MapPin size={12} className="inline mr-1"/> Endereço Completo</label>
                    <input type="text" value={formData.companyInfo.endereco} onChange={(e) => handleCompanyInfoChange('endereco', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1"><User size={12} className="inline mr-1"/> Representante Legal</label>
                        <input type="text" value={formData.companyInfo.representanteLegal} onChange={(e) => handleCompanyInfoChange('representanteLegal', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1"><Hash size={12} className="inline mr-1"/> CPF do Representante</label>
                        <input type="text" value={formData.companyInfo.cpfRepresentante} onChange={(e) => handleCompanyInfoChange('cpfRepresentante', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1"><Hash size={12} className="inline mr-1"/> RG do Representante</label>
                        <input type="text" value={formData.companyInfo.rgRepresentante} onChange={(e) => handleCompanyInfoChange('rgRepresentante', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1"><Mail size={12} className="inline mr-1"/> E-mail de Contato</label>
                        <input type="email" value={formData.companyInfo.email} onChange={(e) => handleCompanyInfoChange('email', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1"><Phone size={12} className="inline mr-1"/> Telefone de Contato</label>
                        <input type="tel" value={formData.companyInfo.telefone} onChange={(e) => handleCompanyInfoChange('telefone', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"/>
                    </div>
                </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium">
            <Save size={18} /> Salvar Banda
          </button>
        </div>
      </div>
    </div>
  );
};

export default BandForm;
