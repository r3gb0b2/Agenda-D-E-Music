import React from 'react';
import { Event, Band, Contractor } from '../types';
import { Printer, X } from 'lucide-react';

interface ContractViewProps {
  event: Event;
  band: Band;
  contractor: Contractor | undefined;
  contractTemplate: string;
  onClose: () => void;
}

const ContractTableField = ({ label, value }: { label: string, value: string | undefined }) => (
    <tr>
        <td className="w-1/3 px-2 py-1 bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider">{label}</td>
        <td className="w-2/3 px-2 py-1 font-mono text-sm">{value || 'Não informado'}</td>
    </tr>
);

const numberToWords = (num: number): string => {
    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (num === 0) return 'zero';
    if (num === 100) return 'cem';

    const format = (n: number) => {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' e ' + units[n % 10] : '');
        if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 !== 0 ? ' e ' + format(n % 100) : '');
        return '';
    };

    const integerPart = Math.floor(num);
    const thousands = Math.floor(integerPart / 1000);
    const remainder = integerPart % 1000;

    let result = '';
    if (thousands > 0) {
        result += (thousands === 1 ? 'mil' : format(thousands) + ' mil') + (remainder > 0 ? (remainder < 100 || remainder % 100 === 0 ? ' e ' : ', ') : '');
    }
    if (remainder > 0) {
        result += format(remainder);
    }
    
    return result.trim();
};


const ContractView: React.FC<ContractViewProps> = ({ event, band, contractor, contractTemplate, onClose }) => {
  
  const getProcessedTemplate = () => {
    let processedText = contractTemplate;
    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const replacements: { [key: string]: string } = {
        '{{NOME_BANDA}}': band.name,
        '{{VALOR_BRUTO_FORMATADO}}': currencyFormatter.format(event.financials.grossValue),
        '{{VALOR_POR_EXTENSO}}': numberToWords(event.financials.grossValue) + ' reais',
    };

    for (const [key, value] of Object.entries(replacements)) {
        processedText = processedText.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
    }
    
    return processedText;
  };

  const renderContractBody = () => {
    const processedText = getProcessedTemplate();
    return processedText.split('\n').map((line, index) => {
      if (line.trim() === '') return <div key={index} className="h-4" />;
      return <p key={index}>{line}</p>;
    });
  };

  const fullAddress = contractor ? `${contractor.address.street}, ${contractor.address.number} - ${contractor.address.complement || ''} ${contractor.address.neighborhood} CEP: ${contractor.address.zipCode}`.trim() : 'Não informado';
  const bandCompanyInfo = band.companyInfo;

  return (
    <div className="bg-slate-800 min-h-screen font-serif print:bg-white">
      <div className="fixed top-4 right-4 space-x-2 print:hidden z-50">
        <button onClick={() => window.print()} className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-500 transition-colors">
          <Printer size={20} />
        </button>
        <button onClick={onClose} className="p-3 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto my-8 p-12 bg-white text-slate-900 shadow-2xl print:shadow-none print:my-0 print:p-8 font-['Times_New_Roman'] text-sm">
        <header className="text-center mb-8">
            <h1 className="text-lg font-bold">CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS</h1>
        </header>

        <main className="space-y-6">
            <section>
                <h2 className="font-bold bg-slate-800 text-white px-2 py-1 mb-1 text-center text-sm">IDENTIFICAÇÃO DAS PARTES</h2>
                <div className="border border-slate-800">
                    <h3 className="font-bold bg-slate-300 px-2 py-0.5 text-xs">CONTRATANTE</h3>
                    <table className="w-full border-collapse">
                        <tbody>
                            <ContractTableField label="RAZÃO SOCIAL" value={contractor?.name} />
                            <ContractTableField label={contractor?.type === 'JURIDICA' ? 'CNPJ' : 'CPF'} value={contractor?.cpf} />
                            <ContractTableField label="RG" value={contractor?.rg} />
                            <ContractTableField label="ENDEREÇO" value={fullAddress} />
                            <ContractTableField label="TELEFONE" value={contractor?.phone} />
                            <ContractTableField label="E-MAIL" value={contractor?.email} />
                        </tbody>
                    </table>
                </div>
                <div className="border border-t-0 border-slate-800">
                    <h3 className="font-bold bg-slate-300 px-2 py-0.5 text-xs">CONTRATADA</h3>
                    <table className="w-full border-collapse">
                       <tbody>
                            <ContractTableField label="RAZÃO SOCIAL" value={bandCompanyInfo.razaoSocial} />
                            <ContractTableField label="CNPJ" value={bandCompanyInfo.cnpj} />
                            <ContractTableField label="ENDEREÇO" value={bandCompanyInfo.endereco} />
                            <ContractTableField label="REPRESENTANTE LEGAL" value={bandCompanyInfo.representanteLegal} />
                            <ContractTableField label="CPF" value={bandCompanyInfo.cpfRepresentante} />
                            <ContractTableField label="RG" value={bandCompanyInfo.rgRepresentante} />
                            <ContractTableField label="E-MAIL" value={bandCompanyInfo.email} />
                        </tbody>
                    </table>
                </div>
            </section>
            
            <section className="prose prose-sm max-w-none prose-p:mb-3">
                {renderContractBody()}
            </section>
            
            <section>
                <table className="w-full border-collapse border border-slate-800">
                    <thead>
                        <tr className="bg-slate-800 text-white text-xs">
                            <th className="p-1 text-center">CIDADE/UF</th>
                            <th className="p-1 text-center">DATA</th>
                            <th className="p-1 text-center">LOCAL</th>
                            <th className="p-1 text-center">DURAÇÃO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="text-center font-mono">
                            <td className="p-1 border border-slate-400">{event.city}</td>
                            <td className="p-1 border border-slate-400">{new Date(event.date).toLocaleDateString('pt-BR')}</td>
                            <td className="p-1 border border-slate-400">{event.venue}</td>
                            <td className="p-1 border border-slate-400">{event.durationHours} HORAS</td>
                        </tr>
                    </tbody>
                </table>
            </section>
            
            {/* Payment Installments - Simple example, can be expanded */}
            <section>
                <table className="w-full border-collapse border border-slate-800">
                    <thead>
                        <tr className="bg-slate-800 text-white text-xs">
                            <th className="p-1">VALOR DA PARCELA</th>
                            <th className="p-1 text-right">DATA DO PAGAMENTO</th>
                        </tr>
                    </thead>
                     <tbody>
                        <tr className="font-mono">
                            <td className="p-1 border border-slate-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.financials.grossValue / 2)}</td>
                            <td className="p-1 border border-slate-400 text-right">A combinar</td>
                        </tr>
                        <tr className="font-mono">
                           <td className="p-1 border border-slate-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.financials.grossValue / 2)}</td>
                            <td className="p-1 border border-slate-400 text-right">Na data do evento</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <footer className="pt-20 text-center text-xs space-y-6">
                <p>Fortaleza, CE, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                <div className="flex justify-around">
                    <div className="w-2/5 border-t border-slate-800 pt-1">
                        <p className="font-bold">{contractor?.name}</p>
                        <p>{contractor?.cpf}</p>
                        <p>Contratante</p>
                    </div>
                    <div className="w-2/5 border-t border-slate-800 pt-1">
                        <p className="font-bold">{bandCompanyInfo.razaoSocial || band.name}</p>
                        <p>{bandCompanyInfo.cnpj}</p>
                        <p>Contratada</p>
                    </div>
                </div>
            </footer>
        </main>
      </div>
    </div>
  );
};

export default ContractView;