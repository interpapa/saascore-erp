'use client';

import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

// Datos Mock del Kanban
const initialColumns = [
  { id: 'todo', title: 'Por Hacer', color: 'border-slate-200 bg-slate-100', cards: [
    { id: 't1', text: 'Revisión motor Toyota Yaris', client: 'Carlos Gómez' },
    { id: 't2', text: 'Presupuesto pintura', client: 'Ana Silva' }
  ]},
  { id: 'in_progress', title: 'En Proceso', color: 'border-blue-200 bg-blue-50', cards: [
    { id: 't3', text: 'Cambio de Aceite 5W30', client: 'Empresa X' }
  ]},
  { id: 'done', title: 'Completado', color: 'border-emerald-200 bg-emerald-50', cards: [
    { id: 't4', text: 'Cambio de pastillas', client: 'Juan Pérez' }
  ]}
];

export default function KanbanPage() {
  const [columns, setColumns] = useState(initialColumns);

  // Implementación muy simple de mover tarjetas para demostrar el UI sin dependencias complejas (dnd-kit)
  const moveCard = (cardId: string, toColId: string) => {
    let cardToMove: any = null;
    const newCols = columns.map(col => {
      const filtered = col.cards.filter(c => {
        if (c.id === cardId) {
          cardToMove = c;
          return false;
        }
        return true;
      });
      return { ...col, cards: filtered };
    });

    if (cardToMove) {
      setColumns(newCols.map(col => {
        if (col.id === toColId) {
          return { ...col, cards: [...col.cards, cardToMove] };
        }
        return col;
      }));
    }
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tablero de Tareas</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mt-1">SaaSCore Kanban Engine</p>
        </div>

        <div className="flex items-start gap-6 min-w-max">
          {columns.map(col => (
            <div key={col.id} className={`w-80 rounded-2xl border ${col.color} flex flex-col max-h-[70vh]`}>
              <div className="p-4 border-b border-black/5 font-bold text-slate-700 flex justify-between items-center">
                {col.title}
                <span className="text-xs bg-white px-2 py-1 rounded-full shadow-sm">{col.cards.length}</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {col.cards.map(card => (
                  <div key={card.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab">
                    <p className="text-sm font-semibold text-slate-800 leading-tight mb-2">{card.text}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{card.client}</p>
                    
                    {/* Botones simulados de movimiento */}
                    <div className="flex gap-2">
                      {col.id !== 'todo' && <button onClick={() => moveCard(card.id, 'todo')} className="text-[10px] font-bold bg-slate-100 text-slate-600 dark:text-slate-400 px-2 py-1 rounded hover:bg-slate-200">&larr; Volver</button>}
                      {col.id === 'todo' && <button onClick={() => moveCard(card.id, 'in_progress')} className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">A Proceso &rarr;</button>}
                      {col.id === 'in_progress' && <button onClick={() => moveCard(card.id, 'done')} className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200">Finalizar &rarr;</button>}
                    </div>
                  </div>
                ))}
                
                <button className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-foreground bg-white/50 hover:bg-white border border-dashed border-slate-300 p-3 rounded-xl transition-colors">
                  <Plus size={16} /> Añadir Tarjeta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
