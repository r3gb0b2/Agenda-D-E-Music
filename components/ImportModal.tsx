import React, { useState, useCallback } from 'react';
import { X, UploadCloud, File, AlertTriangle, CheckCircle, Loader2, Download } from 'lucide-react';
import { Event, Band, EventStatus } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: Omit<Event, 'id' | 'createdAt' | 'createdBy'>[]) => Promise<void>;
  bands: Band[];
  currentUser: { name: string };
}

type ParsedRow = {
  original: Record<string, string>;
  data?: Partial<Omit<Event, 'id' | 'createdAt' | 'createdBy'>>;
  errors: string[];
  lineNumber: number;
};

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, bands, currentUser }) => {
  const [step, setStep] = useState<'upload' | 'validate' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedRows([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseAndValidate = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);
    
    const requiredHeaders = ['Banda', 'Nome do Evento', 'Data (DD/MM/AAAA)', 'Status'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        alert(`Arquivo CSV inválido. O cabeçalho deve conter as colunas: ${requiredHeaders.join(', ')}`);
        return;
    }

    const results: ParsedRow[] = rows.map((rowStr, index) => {
        const values = rowStr.split(',');
        const rowData: Record<string, string> = header.reduce((obj, h, i) => {
            obj[h] = values[i] ? values[i].trim() : '';
            return obj;
        }, {} as Record<string, string>);

        const errors: string[] = [];
        const data: Partial<Omit<Event, 'id' | 'createdAt' | 'createdBy'>> = {};

        // 1. Validate Band
        const bandName = rowData['Banda'];
        const band = bands.find(b => b.name.toLowerCase() === bandName?.toLowerCase());
        if (!band) errors.push(`Banda "${bandName}" não encontrada no sistema.`);
        else data.bandId = band.id;

        // 2. Validate Event Name
        data.name = rowData['Nome do Evento'];
        if (!data.name) errors.push('Nome do Evento é obrigatório.');

        // 3. Validate Date
        const dateStr = rowData['Data (DD/MM/AAAA)'];
        if (!dateStr) {
            errors.push('Data é obrigatória.');
        } else {
            const dateParts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (!dateParts) {
                errors.push('Formato de data inválido. Use DD/MM/AAAA.');
            } else {
                const [, day, month, year] = dateParts;
                const isoDate = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
                if (isNaN(isoDate.getTime())) {
                    errors.push('Data inválida.');
                } else {
                    data.date = isoDate.toISOString();
                }
            }
        }
        
        // 4. Validate Status
        const statusStr = rowData['Status']?.toUpperCase();
        if (Object.values(EventStatus).includes(statusStr as EventStatus)) {
            data.status = statusStr as EventStatus;
        } else {
            errors.push(`Status "${statusStr}" inválido. Use: ${Object.values(EventStatus).join(', ')}.`);
        }

        // 5. Optional Fields
        data.time = rowData['Hora'] || '21:00';
        data.city = rowData['Cidade'] || '';
        data.venue = rowData['Local'] || '';
        data.contractor = rowData['Contratante'] || '';
        const grossValue = parseFloat(rowData['Valor Bruto']?.replace(',', '.') || '0');
        data.financials = {
            grossValue: isNaN(grossValue) ? 0 : grossValue,
            commissionType: 'FIXED', commissionValue: 0, taxes: 0, netValue: isNaN(grossValue) ? 0 : grossValue, currency: 'BRL'
        };

        return { original: rowData, data, errors, lineNumber: index + 2 };
    });

    setParsedRows(results);
    setStep('validate');
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => parseAndValidate(e.target?.result as string);
      reader.readAsText(selectedFile);
    } else {
      alert('Por favor, selecione um arquivo CSV.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportClick = async () => {
      const validEvents = parsedRows.filter(r => r.errors.length === 0 && r.data).map(r => r.data as Omit<Event, 'id' | 'createdAt' | 'createdBy'>);
      setStep('importing');
      await onImport(validEvents);
      setStep('complete');
  };
  
  const handleDownloadTemplate = () => {
    const csvContent = "Banda,Nome do Evento,Data (DD/MM/AAAA),Hora,Cidade,Local,Status,Contratante,Valor Bruto\nExemplo Banda,Casamento Teste,25/12/2024,22:00,São Paulo,Buffet Exemplo,CONFIRMED,João da Silva,5000.00";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };
  
  if (!isOpen) return null;

  const validCount = parsedRows.filter(r => r.errors.length === 0).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-4xl h-[90vh] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <UploadCloud size={18} className="text-primary-500"/> Importar Agenda via CSV
          </h3>
          <button onClick={handleClose}><X size={20} className="text-slate-400 hover:text-white"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {step === 'upload' && (
                <div 
                    onDragOver={e => e.preventDefault()} 
                    onDragEnter={e => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-700 rounded-xl p-8 text-center"
                >
                    <UploadCloud size={48} className="text-slate-600 mb-4"/>
                    <h4 className="text-lg font-bold text-white">Arraste e solte o arquivo CSV aqui</h4>
                    <p className="text-slate-500 my-2">ou</p>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={e => e.target.files && handleFile(e.target.files[0])}/>
                    <label htmlFor="csv-upload" className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium cursor-pointer">
                        Selecionar Arquivo
                    </label>
                    <p className="text-xs text-slate-600 mt-6 max-w-sm">
                        Para garantir que os dados sejam lidos corretamente, use o nosso modelo.
                    </p>
                    <button onClick={handleDownloadTemplate} className="text-xs text-primary-400 hover:underline mt-1 flex items-center gap-1">
                      <Download size={12}/> Baixar modelo CSV
                    </button>
                </div>
            )}
            
            {step === 'validate' && (
                <div>
                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex justify-between items-center">
                        <div>
                            <span className="text-green-400 font-bold">{validCount}</span> eventos válidos. <span className="text-red-400 font-bold">{errorCount}</span> linhas com erros.
                        </div>
                        <button onClick={resetState} className="text-sm text-slate-400 hover:text-white">Carregar outro arquivo</button>
                    </div>
                    <div className="max-h-[60vh] overflow-auto border border-slate-800 rounded-lg">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-950">
                                <tr>
                                    <th className="p-2">#</th>
                                    <th className="p-2 text-left">Banda</th>
                                    <th className="p-2 text-left">Evento</th>
                                    <th className="p-2 text-left">Data</th>
                                    <th className="p-2 text-left">Status</th>
                                    <th className="p-2 text-left">Erros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {parsedRows.map(row => (
                                    <tr key={row.lineNumber} className={row.errors.length > 0 ? 'bg-red-900/20' : 'bg-green-900/10'}>
                                        <td className="p-2 text-slate-500">{row.lineNumber}</td>
                                        <td className="p-2">{row.original['Banda']}</td>
                                        <td className="p-2">{row.original['Nome do Evento']}</td>
                                        <td className="p-2">{row.original['Data (DD/MM/AAAA)']}</td>
                                        <td className="p-2">{row.original['Status']}</td>
                                        <td className="p-2 text-red-400">
                                            {row.errors.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Loader2 size={48} className="text-primary-500 animate-spin mb-4"/>
                    <h4 className="text-lg font-bold text-white">Importando eventos...</h4>
                    <p className="text-slate-500">Por favor, aguarde.</p>
                </div>
            )}

            {step === 'complete' && (
                 <div className="flex flex-col items-center justify-center h-full text-center">
                    <CheckCircle size={48} className="text-green-500 mb-4"/>
                    <h4 className="text-lg font-bold text-white">Importação Concluída!</h4>
                    <p className="text-slate-400"><span className="font-bold text-white">{validCount}</span> novos eventos foram adicionados à sua agenda.</p>
                </div>
            )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
            {step === 'validate' && (
                <button onClick={handleImportClick} disabled={validCount === 0} className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    Confirmar Importação de {validCount} Eventos
                </button>
            )}
            {step === 'complete' && (
                <button onClick={handleClose} className="px-6 py-2 bg-primary-600 text-white rounded-lg">
                    Fechar
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;