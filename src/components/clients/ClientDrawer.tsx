'use client';

import React from 'react';
import { X, User, Phone, Mail, MapPin, DollarSign, Calendar, Edit3, Trash2, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { Entity } from '@/lib/api/entities';

interface ClientDrawerProps {
  client: Entity | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientDrawer({ client, isOpen, onClose }: ClientDrawerProps) {
  if (!client) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer (Floating Sheet) */}
      <div 
        className={`fixed top-4 bottom-4 right-4 w-[calc(100%-2rem)] sm:w-full max-w-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10 z-[70] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground rounded-full backdrop-blur-md transition-colors btn-haptic z-50"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto relative pb-8">
          {/* Banner Cover (Ahora hace scroll con el contenido) */}
          <div className="h-32 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 w-full"></div>

          {/* Cabecera Perfil Flotante */}
          <div className="flex flex-col items-center -mt-12 mb-6 px-6 relative z-10">
            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-slate-900 text-4xl font-black rotate-3 hover:rotate-0 transition-transform duration-300">
              {client.name.charAt(0)}
            </div>
            <div className="text-center mt-4">
              <h3 className="text-2xl font-black text-foreground leading-tight tracking-tight">{client.name}</h3>
              <p className="text-slate-500 font-medium mt-1 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">ID: {client.id.split('-')[0]}</p>
            </div>
          </div>
          
          {/* Contenido (Añadido wrapper de padding) */}
          <div className="px-6 space-y-8">

          {/* Acciones Rápidas */}
          <div className="flex gap-3">
            <button className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 btn-haptic">
              <Edit3 size={16} />
              Editar Datos
            </button>
            <button className="flex-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 btn-haptic">
              <Trash2 size={16} />
              Eliminar
            </button>
          </div>

          {/* Información de Contacto */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-4 border border-border">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Información de Contacto</h4>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                <Phone size={14} />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Teléfono (WhatsApp)</p>
                <p className="font-semibold text-foreground">{client.phone || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                <Mail size={14} />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Correo Electrónico</p>
                <p className="font-semibold text-foreground">{client.email || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Dirección</p>
                <p className="font-semibold text-foreground">{client.address || 'No registrado'}</p>
              </div>
            </div>
          </div>

          {/* Estado Financiero */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Estado Financiero</h4>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Deuda Pendiente</p>
                <div className="flex items-center gap-2">
                  <DollarSign size={24} className={(client.metadata?.total_debt || 0) > 0 ? "text-red-400" : "text-emerald-400"} />
                  <span className="text-3xl font-black">{Number(client.metadata?.total_debt || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${(client.metadata?.total_debt || 0) > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {(client.metadata?.total_debt || 0) > 0 ? 'Con Deuda' : 'Al Día'}
                </span>
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>
    </>
  );
}
