'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/core/ToastProvider';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useERPStore } from '@/store/useERPStore';
import { bulkImportItemsAction, BulkImportItem } from '@/app/actions/bulkImport';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<unknown[]>([]);
  const [parsedItems, setParsedItems] = useState<BulkImportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const activeTenant = useTenantResolver();
  const { session } = useERPStore();

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setPreviewRows([]);
    setParsedItems([]);
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos.');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
      const skuIdx = headers.findIndex(h => h.includes('sku') || h.includes('codigo') || h.includes('code'));
      const categoryIdx = headers.findIndex(h => h.includes('categoria') || h.includes('category'));
      const priceIdx = headers.findIndex(h => h.includes('precio') || h.includes('price'));
      const costIdx = headers.findIndex(h => h.includes('costo') || h.includes('cost'));
      const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('inventario') || h.includes('cantidad'));

      if (nameIdx === -1) {
        throw new Error('No se encontró la columna "Nombre" o equivalente en el archivo.');
      }
      if (priceIdx === -1) {
        throw new Error('No se encontró la columna "Precio" o equivalente en el archivo.');
      }

      const parsed: BulkImportItem[] = [];
      const previews: unknown[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line handling quotes properly
        const rowText = lines[i];
        const row = [];
        let inQuotes = false;
        let currentValue = '';
        for (const char of rowText) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentValue);
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        row.push(currentValue);

        if (row.length < 2) continue;

        const name = row[nameIdx]?.trim().replace(/^"|"$/g, '');
        const sku = skuIdx !== -1 ? row[skuIdx]?.trim().replace(/^"|"$/g, '') : '';
        const category = categoryIdx !== -1 ? row[categoryIdx]?.trim().replace(/^"|"$/g, '') : 'General';
        const priceText = row[priceIdx]?.trim().replace(/^"|"$/g, '').replace(/[^0-9.-]+/g,"");
        const base_price = parseFloat(priceText) || 0;
        
        const costText = costIdx !== -1 ? row[costIdx]?.trim().replace(/^"|"$/g, '').replace(/[^0-9.-]+/g,"") : '0';
        const cost = parseFloat(costText) || 0;

        const stockText = stockIdx !== -1 ? row[stockIdx]?.trim().replace(/^"|"$/g, '').replace(/[^0-9.-]+/g,"") : '0';
        const stock_quantity = parseInt(stockText, 10) || 0;

        if (!name) continue;

        const item: BulkImportItem = {
          name,
          sku,
          category,
          base_price,
          cost,
          stock_quantity,
          type: 'product'
        };

        parsed.push(item);
        if (previews.length < 5) {
          previews.push({
            name, sku, category, base_price, cost, stock_quantity
          });
        }
      }

      if (parsed.length === 0) {
        throw new Error('No se encontraron datos válidos para importar.');
      }

      setParsedItems(parsed);
      setPreviewRows(previews);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error procesando el archivo CSV.');
      setParsedItems([]);
      setPreviewRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo.');
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(droppedFile, 'UTF-8');
    } else {
      setError('Por favor, suelta un archivo .csv válido.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!activeTenant) return;
    if (parsedItems.length === 0) return;

    setIsLoading(true);
    
    toast({
      title: 'Importación iniciada',
      description: `Importando ${parsedItems.length} ítems...`,
      variant: 'info'
    });

    try {
      const res = await bulkImportItemsAction(parsedItems, activeTenant.id, actor);
      if (res.success) {
        toast({
          title: 'Importación exitosa',
          description: `Se importaron ${res.count} ítems correctamente.`,
          variant: 'success'
        });
        onSuccess();
        handleClose();
      } else {
        toast({
          title: 'Error de importación',
          description: res.error || 'Hubo un error importando los datos.',
          variant: 'error'
        });
        setError(res.error || 'Error al importar.');
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message,
        variant: 'error'
      });
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border/50 bg-white/40 dark:bg-slate-900/40">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500 text-white shrink-0">
              <FileText size={18} />
            </div>
            Importar Catálogo (CSV)
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors btn-haptic"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {!file && (
            <div 
              className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Sube tu archivo CSV</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Arrastra y suelta tu archivo aquí, o haz clic para buscarlo. Debe contener las columnas Nombre y Precio.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en el archivo</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {file && !error && parsedItems.length > 0 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Archivo procesado correctamente</p>
                    <p className="text-sm opacity-90">{parsedItems.length} ítems listos para importar</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFile(null);
                    setParsedItems([]);
                    setPreviewRows([]);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                >
                  Cambiar archivo
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground mb-3">Vista Previa (Primeros 5 registros)</h4>
                <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Categoría</th>
                        <th className="p-3 text-right">Precio</th>
                        <th className="p-3 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="p-3 font-mono text-xs">{row.sku || '-'}</td>
                          <td className="p-3 font-medium">{row.name}</td>
                          <td className="p-3 text-slate-500">{row.category}</td>
                          <td className="p-3 text-right">${row.base_price.toFixed(2)}</td>
                          <td className="p-3 text-right">{row.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border/50 flex gap-3 bg-white/40 dark:bg-slate-900/40 sticky bottom-0">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 rounded-xl"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!file || parsedItems.length === 0 || !!error || isLoading}
            onClick={handleImport}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${parsedItems.length > 0 ? parsedItems.length : ''} Ítems`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
