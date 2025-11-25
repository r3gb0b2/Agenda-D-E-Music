import React, { useState } from 'react';
import { User, UserRole, Band } from '../types';
import { X, Save, User as UserIcon, Lock, Shield, Music } from 'lucide-react';

interface UserFormProps {
  bands: Band[];
  existingUser?: User | null;
  onSave: (user: User) => void;
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ bands, existingUser, onSave, onClose }) => {
  const [formData, setFormData] = useState<User>(
    existingUser || {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      password: '',
      role: UserRole.MEMBER,
      bandIds: []
    }
  );

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBand = (bandId: string) => {
    setFormData(prev => {
      const currentBands = prev.bandIds || [];
      if (currentBands.includes(bandId)) {
        return { ...prev, bandIds: currentBands.filter(id => id !== bandId) };
      } else {
        return { ...prev, bandIds: [...currentBands, bandId] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon size={24} className="text-primary-500" />
            {existingUser ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Login / E-mail</label>
              <input
                required
                type="text"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <Lock size={14}/> Senha de Acesso
              </label>
              <input
                type="text" // Visible for admin convenience in this specific request context
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={existingUser ? "Manter atual" : "Definir senha"}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Shield size={14}/> Nível de Permissão
              </label>
              <select
                 value={formData.role}
                 onChange={(e) => handleChange('role', e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
              >
                <option value={UserRole.MEMBER}>Membro / Músico (Apenas Visualizar)</option>
                <option value={UserRole.MANAGER}>Gerente (Editar)</option>
                <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
              </select>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
                 <Music size={16} className="text-accent-500"/> Bandas Permitidas
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {bands.length === 0 && <p className="text-xs text-slate-500">Nenhuma banda cadastrada.</p>}
                {bands.map(band => (
                  <label key={band.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.bandIds.includes(band.id) ? 'bg-primary-600 border-primary-600' : 'border-slate-600'}`}>
                      {formData.bandIds.includes(band.id) && <X size={14} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={formData.bandIds.includes(band.id)}
                      onChange={() => toggleBand(band.id)}
                    />
                    <span className="text-sm text-slate-300">{band.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-600/20 transition-all"
            >
              <Save size={18} /> Salvar Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;