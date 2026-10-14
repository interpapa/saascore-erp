'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  UserCheck, 
  Plus, 
  X, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  CreditCard,
  Calendar,
  ChevronRight,
  User
} from 'lucide-react';
import { Entity } from '@/lib/api/entities';

interface PatientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Entity[];
  onSelectPatient: (patient: Entity) => void;
  onOpenNewPatientModal: () => void;
  currentPatientId?: string;
}

export function PatientSelectModal({
  isOpen,
  onClose,
  patients,
  onSelectPatient,
  onOpenNewPatientModal,
  currentPatientId,
}: PatientSelectModalProps) {
  const [query, setQuery] = useState('');

  const filteredPatients = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.toLowerCase().trim();
    return patients.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const taxId = (p.tax_id || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(q) || taxId.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Seleccionar Paciente para Consulta
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Elige el paciente que se sentará en el sillón dental para revisar su odontograma
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors btn-haptic"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Buscador y Botón Nuevo Paciente */}
        <div className="pt-3 pb-2 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, cédula, teléfono o email..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewPatientModal();
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 btn-haptic"
          >
            <Plus size={16} />
            <span>+ Nuevo Paciente</span>
          </button>
        </div>

        {/* Indicador de conteo */}
        <div className="text-[11px] font-bold text-muted-foreground pb-2 flex items-center justify-between">
          <span>
            {filteredPatients.length} de {patients.length} pacientes disponibles
          </span>
          {query && (
            <span className="text-teal-600 dark:text-teal-400 font-semibold">
              Filtrado por &ldquo;{query}&rdquo;
            </span>
          )}
        </div>

        {/* Lista de Pacientes con Scroll Suave */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-1 max-h-[55vh]">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                <User size={24} />
              </div>
              <p className="text-xs font-bold text-foreground">
                No se encontraron pacientes que coincidan con &ldquo;{query}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewPatientModal();
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
              >
                + Registrar a &ldquo;{query}&rdquo; como nuevo paciente
              </button>
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = p.id === currentPatientId;
              const meta = (p.metadata as Record<string, any>) || {};
              const allergies = meta.allergies || meta.notes || '';
              const debt = Number(meta.pending_debt || meta.current_balance || 0);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPatient(p);
                    onClose();
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group btn-haptic ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/50 shadow-xs'
                      : 'bg-background hover:bg-muted/50 border-border hover:border-teal-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 group-hover:scale-105 transition-transform'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-teal-600 transition-colors">
                          {p.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-teal-500 text-white">
                            En Sillón
                          </span>
                        )}
                        {allergies && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 truncate max-w-[150px]"
                            title={`Alerta Médica: ${allergies}`}
                          >
                            ⚠️ {allergies}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-mono mt-0.5 flex-wrap">
                        {p.tax_id && <span>ID/C.I: <strong>{p.tax_id}</strong></span>}
                        {p.phone && <span>Tel: <strong>{p.phone}</strong></span>}
                        {debt > 0 ? (
                          <span className="text-red-500 font-bold font-sans">
                            Deuda: ${debt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-sans">Al día</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-muted text-foreground group-hover:bg-teal-600 group-hover:text-white'
                      }`}
                    >
                      <span>{isSelected ? 'Activo' : 'Atender'}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Haz clic en cualquier paciente para cargar su odontograma e historial</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted text-foreground transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
