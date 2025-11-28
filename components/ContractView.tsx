import React from 'react';
import { Event, Band, Contractor } from '../types';
import { Printer, X, Mic2 } from 'lucide-react';

interface ContractViewProps {
  event: Event;
  band: Band;
  contractor: Contractor | undefined;
  contractTemplate: string;
  onClose: () => void;
}

const ContractView: React.FC<ContractViewProps> = ({ event, band, contractor, contractTemplate, onClose }) => {
  
  const getProcessedTemplate = () => {
    let processedText = contractTemplate;
    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const replacements: { [key: string]: string } = {
        '{{NOME_EVENTO}}': event.name,
        '{{TIPO_EVENTO}}': event.eventType,
        '{{DATA_EVENTO}}': new Date(event.date).toLocaleDateString('pt-BR'),
        '{{DATA_EVENTO_EXTENSO}}': new Date(event.date).toLocaleDateString('pt-BR', dateOptions),
        '{{HORARIO_EVENTO}}': event.time,
        '{{DURACAO_EVENTO}}': `${event.durationHours} horas`,
        '{{CIDADE_EVENTO}}': event.city,
        '{{LOCAL_EVENTO}}': event.venue,
        '{{NOME_BANDA}}': band.name,
        '{{NOME_CONTRATANTE}}': contractor?.name || 'Não informado',
        '{{NOME_RESPONSAVEL}}': contractor?.responsibleName || contractor?.name || 'Não informado',
        '{{TELEFONE_CONTRATANTE}}': contractor?.whatsapp || contractor?.phone || 'Não informado',
        '{{EMAIL_CONTRATANTE}}': contractor?.email || 'Não informado',
        '{{ENDERECO_CONTRATANTE}}': `${contractor?.address.street || ''}, ${contractor?.address.number || ''} - ${contractor?.address.city || ''}/${contractor?.address.state || ''}`,
        '{{VALOR_BRUTO_FORMATADO}}': currencyFormatter.format(event.financials.grossValue),
        '{{VALOR_LIQUIDO_FORMATADO}}': currencyFormatter.format(event.financials.netValue),
    };

    for (const [key, value] of Object.entries(replacements)) {
        processedText = processedText.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
    }
    
    return processedText;
  };

  // Renderiza o contrato, tratando quebras de linha como parágrafos
  const renderContractBody = () => {
    const processedText = getProcessedTemplate();
    return processedText.split('\n').map((line, index) => {
      // Linhas vazias criam espaçamento entre parágrafos
      if (line.trim() === '') {
        return <div key={index} className="h-4" />;
      }
      // Renderiza cada linha de texto dentro de um parágrafo estilizado
      return <p key={index}>{line}</p>;
    });
  };

  return (
    <div className="bg-slate-800 min-h-screen font-serif print:bg-white">
      {/* Floating Action Buttons (Hidden on Print) */}
      <div className="fixed top-4 right-4 space-x-2 print:hidden z-50">
        <button onClick={() => window.print()} className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-500 transition-colors">
          <Printer size={20} />
        </button>
        <button onClick={onClose} className="p-3 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* A4-like page */}
      <div className="max-w-4xl mx-auto my-8 p-12 bg-white text-slate-900 shadow-2xl print:shadow-none print:my-0 print:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start mb-10 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-md print:hidden">
                    <Mic2 size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">CONTRATO DE APRESENTAÇÃO</h1>
                    <p className="text-slate-600 font-semibold font-sans">D&E MUSIC MANAGEMENT</p>
                </div>
            </div>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0 font-sans">
            <p className="text-sm text-slate-600">Contrato Nº: <span className="font-mono font-bold text-slate-800">{event.id.substring(0, 8).toUpperCase()}</span></p>
            <p className="text-sm text-slate-600">Data de Emissão: <span className="font-mono font-bold text-slate-800">{new Date().toLocaleDateString('pt-BR')}</span></p>
          </div>
        </header>

        <main>
          {/* Use Tailwind's typography plugin for beautiful text rendering */}
          <div className="prose prose-slate max-w-none prose-p:mb-4 prose-headings:font-sans prose-headings:font-bold">
            {renderContractBody()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContractView;
