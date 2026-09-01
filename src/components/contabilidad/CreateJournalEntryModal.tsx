'use client';

import React, { useState, useEffect } from 'react';
import { DEFAULT_CHART_OF_ACCOUNTS, AccountNode } from '@/lib/core/accounting/chartOfAccounts';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface CreateJournalEntryPayload {
  entry_date: string;
  description: string;
  lines: Array<{
    account_code: string;
    account_name?: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}

interface CreateJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateJournalEntryPayload) => Promise<void>;
  isSubmitting?: boolean;
}

interface FormLine {
  id: string;
  account_code: string;
  debit: string;
  credit: string;
  description: string;
}

export function CreateJournalEntryModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateJournalEntryModalProps) {
  const imputableAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((a) => !a.isHeader);

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<FormLine[]>([
    { id: '1', account_code: imputableAccounts[0]?.code || '1.1.01.01', debit: '0', credit: '0', description: '' },
    { id: '2', account_code: imputableAccounts[1]?.code || '4.1.01', debit: '0', credit: '0', description: '' },
  ]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line
      setEntryDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setLines([
        { id: '1', account_code: imputableAccounts[0]?.code || '1.1.01.01', debit: '0', credit: '0', description: '' },
        { id: '2', account_code: imputableAccounts[1]?.code || '4.1.01', debit: '0', credit: '0', description: '' },
      ]);
    }
  }, [isOpen, imputableAccounts]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        account_code: imputableAccounts[0]?.code || '1.1.01.01',
        debit: '0',
        credit: '0',
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof FormLine, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const updated = { ...l, [field]: value };
        // Clear opposite field if entering debit/credit to avoid dual entry on same line
        if (field === 'debit' && parseFloat(value) > 0) updated.credit = '0';
        if (field === 'credit' && parseFloat(value) > 0) updated.debit = '0';
        return updated;
      })
    );
  };

  // Calculations
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;
  const isValid = isBalanced && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const payload: CreateJournalEntryPayload = {
      entry_date: entryDate,
      description: description.trim(),
      lines: lines.map((l) => {
        const accMatch = imputableAccounts.find((a) => a.code === l.account_code);
        return {
          account_code: l.account_code,
          account_name: accMatch?.name || `Cuenta ${l.account_code}`,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim() || description.trim(),
        };
      }),
    };

    await onSubmit(payload);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Nuevo Asiento Contable NIIF
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro manual de partida doble balanceada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Fecha del Asiento
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Descripción / Concepto General
              </label>
              <input
                type="text"
                placeholder="Ej. Registro de inventario o provisión de servicio"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Movimientos de Partida Doble
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Línea</span>
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={line.id || idx}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
                >
                  {/* Account Selector */}
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] text-slate-400 font-bold sm:hidden mb-0.5">Cuenta</label>
                    <select
                      value={line.account_code}
                      onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {imputableAccounts.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Line Detail */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-[10px] text-slate-400 font-bold sm:hidden mb-0.5">Glosa / Detalle</label>
                    <input
                      type="text"
                      placeholder="Detalle línea (opcional)"
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Debit */}
                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold sm:hidden mb-0.5">Débito ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold sm:hidden mb-0.5">Crédito ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Eliminar línea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Balance Tracker Footer Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className="font-bold">
                {isBalanced
                  ? 'Asiento Cuadrado NIIF (Débitos = Créditos)'
                  : `Desbalance Detectado: Diferencia de ${formatCurrency(difference)}`}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 mr-1">Débitos:</span>
                <strong className="text-slate-900 dark:text-white">{formatCurrency(totalDebit)}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 mr-1">Créditos:</span>
                <strong className="text-slate-900 dark:text-white">{formatCurrency(totalCredit)}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 transition-all btn-haptic"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Asiento Contable</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
