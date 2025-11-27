import React from 'react';
import { Event, Band, Contractor } from '../types';
import { Printer, X, Mic2 } from 'lucide-react';

interface ContractViewProps {
  event: Event;
  band: Band;
  contractor: Contractor | undefined;
  onClose: () => void;
}

const ContractView: React.FC<ContractViewProps> = ({ event, band, contractor, onClose }) => {
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // FIX: Made children optional to fix "Property 'children' is missing" error.
  const Section = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="mb-6">
      <h2 className="text-lg font-bold border-b-2 border-slate-700 pb-2 mb-3 text-primary-400">{title}</h2>
      {children}
    </div>
  );

  const InfoPair = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="mb-2">
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="text-base text-white">{value || 'Não informado'}</p>
    </div>
  );

  return (
    <div className="bg-slate-900 min-h-screen text-slate-300 font-sans">
      {/* Floating Action Buttons (Hidden on Print) */}
      <div className="fixed top-4 right-4 space-x-2 print:hidden z-50">
        <button onClick={() => window.print()} className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-500 transition-colors">
          <Printer size={20} />
        </button>
        <button onClick={onClose} className="p-3 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 md:p-12 bg-slate-950 border-x border-slate-800 shadow-2xl print:shadow-none print:border-none">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start mb-10 pb-4 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-md print:hidden">
                    <Mic2 size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">CONTRATO DE APRESENTAÇÃO</h1>
                    <p className="text-primary-400 font-semibold">D&E MUSIC MANAGEMENT</p>
                </div>
            </div>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0">
            <p className="text-sm">Contrato Nº: <span className="font-mono">{event.id.substring(0, 8).toUpperCase()}</span></p>
            <p className="text-sm">Data de Emissão: <span className="font-mono">{new Date().toLocaleDateString('pt-BR')}</span></p>
          </div>
        </header>

        <main>
          <Section title="1. PARTES CONTRATANTES">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-semibold text-white mb-2">CONTRATANTE</h3>
                <InfoPair label="Nome/Razão Social" value={contractor?.name} />
                <InfoPair label="Responsável" value={contractor?.responsibleName} />
                <InfoPair label="Email" value={contractor?.email} />
                <InfoPair label="Telefone" value={contractor?.whatsapp || contractor?.phone} />
                <InfoPair label="Endereço" value={`${contractor?.address.street || ''}, ${contractor?.address.number || ''} - ${contractor?.address.city || ''}/${contractor?.address.state || ''}`} />
              </div>
              <div>
                <h3 className="text-md font-semibold text-white mb-2">CONTRATADA (ARTISTA)</h3>
                <InfoPair label="Banda" value={band.name} />
                <InfoPair label="Gênero" value={band.genre} />
                <InfoPair label="Agência" value="D&E MUSIC" />
              </div>
            </div>
          </Section>

          <Section title="2. OBJETO DO CONTRATO">
            <p>O presente contrato tem por objeto a prestação de serviços de apresentação musical pela CONTRATADA para a CONTRATANTE, nas condições detalhadas a seguir.</p>
          </Section>

          <Section title="3. DETALHES DO EVENTO">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <InfoPair label="Nome do Evento" value={event.name} />
                    <InfoPair label="Tipo de Evento" value={event.eventType} />
                    <InfoPair label="Local (Venue)" value={event.venue} />
                    <InfoPair label="Cidade" value={event.city} />
                </div>
                <div>
                    <InfoPair label="Data" value={new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                    <InfoPair label="Horário de Início" value={event.time} />
                    <InfoPair label="Duração da Apresentação" value={`${event.durationHours} horas`} />
                </div>
             </div>
          </Section>

          <Section title="4. VALORES E PAGAMENTO">
             <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <InfoPair label="Valor Bruto do Cachê" value={<span className="text-2xl font-bold text-green-400">{currencyFormatter.format(event.financials.grossValue)}</span>} />
                <InfoPair label="Taxas e Impostos" value={currencyFormatter.format(event.financials.taxes)} />
                <InfoPair label="Comissão da Agência" value={`${event.financials.commissionType === 'PERCENTAGE' ? `${event.financials.commissionValue}%` : currencyFormatter.format(event.financials.commissionValue)}`} />
                <InfoPair label="Valor Líquido para a Banda" value={<span className="font-bold text-white">{currencyFormatter.format(event.financials.netValue)}</span>} />
                
                <p className="mt-4 text-xs text-slate-500">
                    Condições de pagamento a serem acordadas entre as partes em aditivo ou via comunicação oficial.
                </p>
             </div>
          </Section>
          
          <Section title="5. OBRIGAÇÕES E CLÁUSULAS">
              <p className="text-sm text-slate-400">[... Inserir cláusulas padrão sobre rider técnico, camarim, alimentação, transporte, cancelamento, etc. ...]</p>
          </Section>

          <div className="mt-20 pt-10 text-center">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="border-t border-slate-600 w-3/4 mx-auto pt-2">
                  <p className="text-white font-semibold">{contractor?.name}</p>
                  <p className="text-xs text-slate-500">CONTRATANTE</p>
                </div>
              </div>
              <div>
                <div className="border-t border-slate-600 w-3/4 mx-auto pt-2">
                   <p className="text-white font-semibold">D&E MUSIC</p>
                   <p className="text-xs text-slate-500">CONTRATADA</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContractView;