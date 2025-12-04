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

// Helper to normalize strings for accent-insensitive comparison
const normalizeString = (str: string | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose combined graphemes into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, ''); // Remove the diacritics
};

// Helper to parse Brazilian currency format like "400.000,00"
const parseBrazilianCurrency = (value: string | undefined): number => {
  if (!value || typeof value !== 'string') return 0;
  // Handle cases where the value might already be a simple number string
  if (!value.includes(',') && !value.includes('.')) {
    const simpleNumber = parseFloat(value);
    return isNaN(simpleNumber) ? 0 : simpleNumber;
  }
  const numberString = value
    .replace(/\./g, '')  // remove thousand separators
    .replace(',', '.'); // replace decimal comma with a dot
  const parsed = parseFloat(numberString);
  return isNaN(parsed) ? 0 : parsed;
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
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);
    
    const requiredHeaders = ['Artista', 'Data', 'Status'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        alert(`Arquivo CSV inválido. O cabeçalho deve conter pelo menos as colunas: ${requiredHeaders.join(', ')}`);
        return;
    }

    const results: ParsedRow[] = rows.map((rowStr, index) => {
        // Handle commas inside quoted fields
        const values = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
        
        const rowData: Record<string, string> = header.reduce((obj, h, i) => {
            obj[h] = values[i] || '';
            return obj;
        }, {} as Record<string, string>);

        const errors: string[] = [];
        const data: Partial<Omit<Event, 'id' | 'createdAt' | 'createdBy'>> = {};

        // 1. Validate Band (with normalization for accent-insensitivity)
        const bandName = rowData['Artista'];
        const normalizedCsvBandName = normalizeString(bandName);
        const band = bands.find(b => normalizeString(b.name) === normalizedCsvBandName);
        
        if (!bandName) errors.push('Coluna "Artista" não encontrada.');
        else if (!band) errors.push(`Artista "${bandName}" não encontrado no sistema.`);
        else data.bandId = band.id;

        // 2. Validate Event Name (using Título or fallback)
        data.name = rowData['Título'] || rowData['Evento'] || `Show ${bandName}`;
        if (!data.name) errors.push('Nome do Evento (coluna "Título" ou "Evento") é obrigatório.');

        // 3. Validate Date (DD-MM-YYYY)
        const dateStr = rowData['Data'];
        if (!dateStr) {
            errors.push('Coluna "Data" é obrigatória.');
        } else {
            const dateParts = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (!dateParts) {
                errors.push('Formato de data inválido. Use DD-MM-AAAA.');
            } else {
                const [, day, month, year] = dateParts;
                // JavaScript months are 0-indexed
                const isoDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
                if (isNaN(isoDate.getTime())) {
                    errors.push('Data inválida.');
                } else {
                    data.date = isoDate.toISOString();
                }
            }
        }
        
        // 4. Validate and Translate Status
        const statusStr = rowData['Status']?.toUpperCase();
        const statusMap: Record<string, EventStatus> = {
            'CONFIRMADO': EventStatus.CONFIRMED,
            'RESERVA': EventStatus.RESERVED,
            'CANCELADO': EventStatus.CANCELED,
            'REALIZADO': EventStatus.COMPLETED,
            'RESERVED': EventStatus.RESERVED,
            'CONFIRMED': EventStatus.CONFIRMED,
            'CANCELED': EventStatus.CANCELED,
            'COMPLETED': EventStatus.COMPLETED,
        };
        if (!statusStr) errors.push('Coluna "Status" é obrigatória.');
        else if (statusMap[statusStr]) {
            data.status = statusMap[statusStr];
        } else {
            errors.push(`Status "${statusStr}" inválido.`);
        }

        // 5. Optional Fields
        data.time = '21:00'; // Default time
        
        // Combine Cidade and Estado
        const city = rowData['Cidade'] || '';
        const state = rowData['Estado'] || '';
        data.city = [city, state].filter(Boolean).join(' - ');

        data.venue = rowData['Local'] || '';
        data.contractor = rowData['Contratante'] || '';
        data.notes = ''; // Main notes are now separate

        // Use correct currency parser for Cachê
        const grossValue = parseBrazilianCurrency(rowData['Cachê']);
        data.financials = {
            grossValue: grossValue,
            commissionType: 'FIXED', 
            commissionValue: 0, 
            taxes: 0, 
            netValue: grossValue, // Set net value initially to gross
            currency: 'BRL', 
            // Map "Info. Adicionais" to financial notes
            notes: rowData['Info. Adicionais'] || ''
        };

        return { original: rowData, data, errors, lineNumber: index + 2 };
    });

    setParsedRows(results);
    setStep('validate');
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => parseAndValidate(e.target?.result as string);
      // Explicitly read the file as UTF-8 to correctly handle special characters like 'ã'.
      reader.readAsText(selectedFile, 'UTF-8');
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
    const csvContent = `"ID","Artista","Data","Cidade","Estado","País","Status","Tipo de Lançamento","Título","Info. Adicionais","Contratante","Local","Evento","Vendendor","Comissão","Tipo de Negociação","Cachê","Bilheteria","Garantia","Resultado bilheteria","Valor Nota","Total Imposto","Criado por","Criado em"\n"E233277","FELIPÃO","14-02-2026","CASCAVEL - CAPONGA","CE","","CONFIRMADO","SHOW","-","20/6","-","-","-","-","-","-","20.000,00","-","-","-","-","-","Rafael ","30-09-2025 16:07"`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao_agenda.csv");
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
      <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
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
                        Para garantir que os dados sejam lidos corretamente, use o nosso modelo ou um arquivo com as colunas necessárias.
                        <br/>
                        <strong className="text-yellow-400/80">Dica: Salve sua planilha como "CSV UTF-8".</strong>
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
                            <thead className="sticky top-0 bg-slate-950 z-10">
                                <tr>
                                    <th className="p-2">#</th>
                                    <th className="p-2 text-left">Artista</th>
                                    <th className="p-2 text-left">Evento (Título)</th>
                                    <th className="p-2 text-left">Data</th>
                                    <th className="p-2 text-left">Cidade</th>
                                    <th className="p-2 text-left">Cachê</th>
                                    <th className="p-2 text-left">Status</th>
                                    <th className="p-2 text-left">Erros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {parsedRows.map(row => (
                                    <tr key={row.lineNumber} className={row.errors.length > 0 ? 'bg-red-900/20' : ''}>
                                        <td className="p-2 text-slate-500">{row.lineNumber}</td>
                                        <td className="p-2">{row.original['Artista']}</td>
                                        <td className="p-2 text-white">{row.data?.name || row.original['Título']}</td>
                                        <td className="p-2">{row.original['Data']}</td>
                                        <td className="p-2">{row.data?.city}</td>
                                        <td className="p-2 text-right">{row.data?.financials?.grossValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.data.financials.grossValue) : '-'}</td>
                                        <td className="p-2">
                                            {row.data?.status ? (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    row.data.status === 'CONFIRMED' ? 'bg-green-500/10 text-green-400' :
                                                    row.data.status === 'RESERVED' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    row.data.status === 'CANCELED' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-300'
                                                }`}>
                                                    {row.data.status}
                                                </span>
                                            ) : <span className="text-slate-500">{row.original['Status']}</span>}
                                        </td>
                                        <td className="p-2 text-red-400 font-medium">{row.errors.join(', ')}</td>
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