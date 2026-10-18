'use client';

import React, { useState } from 'react';
import { JournalEntry } from '@/types/accounting';
import { EmptyState } from '@/components/core/EmptyState';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Ban,
  Package,
  Clock,
} from 'lucide-react';

interface GeneralJournalTableProps {
  entries: JournalEntry[];
  isLoading?: boolean;
  onNewEntry?: () => void;
}

export function GeneralJournalTable({
  entries = [],
  isLoading = false,
  onNewEntry,
}: GeneralJournalTableProps) {
  const [search, setSearch] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      (e.entry_number && e.entry_number.toLowerCase().includes(query)) ||
      e.description.toLowerCase().includes(query) ||
      (e.source_document_ref && e.source_document_ref.toLowerCase().includes(query)) ||
      (e.products && e.products.some((p) => p.toLowerCase().includes(query))) ||
      e.lines.some(
        (l) =>
          l.account_code.toLowerCase().includes(query) ||
          l.account_name.toLowerCase().includes(query)
      )
    );
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const date = d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const time = d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse w-full max-w-sm" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por asiento, ref, cuenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
          Mostrando <span className="text-slate-900 dark:text-white font-bold">{filteredEntries.length}</span> de {entries.length} asientos
        </div>
      </div>

      {/* Main Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={36} />}
          title={search ? 'Sin coincidencias' : 'No hay asientos contables'}
          description={
            search
              ? `No se encontraron asientos que coincidan con "${search}".`
              : 'Aún no se han registrado asientos en el Libro Diario NIIF para este período.'
          }
          action={
            onNewEntry
              ? {
                  label: 'Registrar Primer Asiento',
                  onClick: onNewEntry,
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10"></th>
                <th className="py-3 px-3">Asiento #</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Descripción / Productos</th>
                <th className="py-3 px-3">Ref. Doc</th>
                <th className="py-3 px-3 text-right">Débito Total</th>
                <th className="py-3 px-3 text-right">Crédito Total</th>
                <th className="py-3 px-3 text-center">Estado NIIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredEntries.map((entry) => {
                const isExpanded = !!expandedEntries[entry.id];
                const isBalanced = Math.abs(entry.total_debit - entry.total_credit) < 0.01;
                const dt = formatDateTime(entry.created_at || entry.entry_date);

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => toggleExpand(entry.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {entry.entry_number || `AS-${entry.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{dt.date}</div>
                        {dt.time && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{dt.time}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {entry.description}
                        </div>
                        {entry.products && entry.products.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.products.slice(0, 2).map((prod, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700/60"
                              >
                                <Package className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                                <span className="truncate max-w-[120px]">{prod}</span>
                              </span>
                            ))}
                            {entry.products.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium self-center">
                                +{entry.products.length - 2} más
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono">
                        {entry.source_document_ref || entry.document_id?.slice(0, 8) || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(entry.total_debit)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(entry.total_credit)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {isBalanced ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              NIIF OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Descuadre
                            </span>
                          )}

                          {entry.status === 'annulled' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                              <Ban className="w-3 h-3" /> Anulado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Journal Lines Sub-Table */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 dark:bg-slate-800/50">
                        <td colSpan={8} className="p-3 sm:p-4">
                          <div className="pl-6 border-l-2 border-primary/50 space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <span>Movimientos de Partida Doble ({entry.lines.length} líneas)</span>
                              <span>Asiento NIIF ID: {entry.id}</span>
                            </div>

                            {entry.products && entry.products.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                  <Package size={13} className="text-primary" /> Productos / Ítems de la Operación:
                                </span>
                                {entry.products.map((p, pIdx) => (
                                  <span key={pIdx} className="px-2 py-0.5 rounded-md bg-card text-foreground font-semibold text-xs border border-border">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}

                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700/60 pb-1 text-[11px]">
                                  <th className="py-1 px-2">Código Cuenta</th>
                                  <th className="py-1 px-2">Nombre de Cuenta</th>
                                  <th className="py-1 px-2">Detalle / Glosa</th>
                                  <th className="py-1 px-2 text-right">Débito</th>
                                  <th className="py-1 px-2 text-right">Crédito</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
                                {entry.lines.map((line, idx) => (
                                  <tr key={line.id || idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/30">
                                    <td className="py-2 px-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                                      {line.account_code}
                                    </td>
                                    <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                                      {line.account_name}
                                    </td>
                                    <td className="py-2 px-2 text-slate-500 dark:text-slate-400 italic">
                                      {line.description || entry.description}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                      {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                      {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
