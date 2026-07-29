'use client';

import React, { useState, DragEvent } from 'react';
import { LegoPieceDNA } from '@/types/lego';
import { LayoutGrid, Type, List, BarChart, Settings, X, Save, ArrowUp, ArrowDown, Trash2, Box, Lock } from 'lucide-react';
import { LegoEngine } from '@/components/lego/LegoEngine';

interface AvailablePiece {
  type: LegoPieceDNA['type'];
  name: string;
  icon: React.ReactNode;
  defaultConfig: any;
}

const CATALOG: AvailablePiece[] = [
  { type: 'stat-grid', name: 'Métricas Principales', icon: <BarChart size={18} />, defaultConfig: { title: 'KPIs', stats: [] } },
  { type: 'list-feed', name: 'Lista de Registros', icon: <List size={18} />, defaultConfig: { title: 'Lista', columns: [] } },
  { type: 'kpi-bar', name: 'Barra de Progreso', icon: <LayoutGrid size={18} />, defaultConfig: { title: 'Progreso', value: 0 } },
  // Futuras piezas: { type: 'document-builder', name: 'Caja / Facturación', ... }
];

interface LegoStudioProps {
  initialLayout: LegoPieceDNA[];
  onSave: (newLayout: LegoPieceDNA[]) => void;
  onClose: () => void;
}

export function LegoStudio({ initialLayout, onSave, onClose }: LegoStudioProps) {
  const [layout, setLayout] = useState<LegoPieceDNA[]>(initialLayout || []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Drag state
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // --- HANDLERS CATALOG -> CANVAS ---
  const handleDragStartCatalog = (e: DragEvent, type: string) => {
    setDraggedType(type);
    e.dataTransfer.setData('source', 'catalog');
  };

  const handleDropCanvas = (e: DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source');
    
    if (source === 'catalog' && draggedType) {
      // Add new piece
      const pieceDef = CATALOG.find(p => p.type === draggedType);
      if (pieceDef) {
        const newPiece: LegoPieceDNA = {
          id: `piece_${Math.random().toString(36).substr(2, 9)}`,
          type: pieceDef.type,
          config: pieceDef.defaultConfig,
          colSpan: 12
        };
        setLayout([...layout, newPiece]);
        setSelectedIndex(layout.length); // Select the newly added piece
      }
    } else if (source === 'canvas' && draggedIndex !== null) {
      // Reorder is handled in handleDropReorder for precision, but if dropped on empty canvas space, push to end
      const newLayout = [...layout];
      const [moved] = newLayout.splice(draggedIndex, 1);
      newLayout.push(moved);
      setLayout(newLayout);
      setSelectedIndex(newLayout.length - 1);
    }
    setDraggedType(null);
    setDraggedIndex(null);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  // --- HANDLERS REORDER (CANVAS -> CANVAS) ---
  const handleDragStartCanvas = (e: DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.setData('source', 'canvas');
  };

  const handleDropReorder = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const source = e.dataTransfer.getData('source');
    
    if (source === 'canvas' && draggedIndex !== null) {
      const newLayout = [...layout];
      const [moved] = newLayout.splice(draggedIndex, 1);
      newLayout.splice(targetIndex, 0, moved);
      setLayout(newLayout);
      setSelectedIndex(targetIndex);
    }
    setDraggedIndex(null);
  };

  // --- PIECE ACTIONS ---
  const removePiece = (index: number) => {
    const newLayout = [...layout];
    newLayout.splice(index, 1);
    setLayout(newLayout);
    if (selectedIndex === index) setSelectedIndex(null);
  };

  const movePiece = (index: number, dir: 1 | -1) => {
    if (index + dir < 0 || index + dir >= layout.length) return;
    const newLayout = [...layout];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index + dir];
    newLayout[index + dir] = temp;
    setLayout(newLayout);
    setSelectedIndex(index + dir);
  };

  const updateConfig = (key: string, value: any) => {
    if (selectedIndex === null) return;
    const newLayout = [...layout];
    newLayout[selectedIndex] = {
      ...newLayout[selectedIndex],
      config: {
        ...newLayout[selectedIndex].config,
        [key]: value
      }
    };
    setLayout(newLayout);
  };

  const selectedPiece = selectedIndex !== null ? layout[selectedIndex] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <X size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Lego Studio</h1>
            <p className="text-xs text-slate-500 font-medium">Modo Edición</p>
          </div>
        </div>
        <button 
          onClick={() => onSave(layout)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
        >
          <Save size={16} />
          Publicar Cambios
        </button>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: CATALOG */}
        <aside className="w-64 bg-white/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Catálogo</h3>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto">
            {CATALOG.map(piece => (
              <div 
                key={piece.type}
                draggable
                onDragStart={(e) => handleDragStartCatalog(e, piece.type)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md transition-all"
              >
                <div className="text-primary">{piece.icon}</div>
                <span className="font-semibold text-sm">{piece.name}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: CANVAS */}
        <main className="flex-1 bg-slate-50/50 dark:bg-[#0B1120] overflow-y-auto p-8">
          <div 
            className="max-w-4xl mx-auto min-h-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-6 transition-colors"
            onDrop={handleDropCanvas}
            onDragOver={handleDragOver}
          >
            {layout.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Box size={48} className="mb-4 opacity-50" />
                <p className="font-bold text-lg">Lienzo Vacío</p>
                <p className="text-sm">Arrastra bloques del catálogo aquí</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {layout.map((piece, idx) => (
                  <div 
                    key={piece.id || idx}
                    draggable
                    onDragStart={(e) => handleDragStartCanvas(e, idx)}
                    onDrop={(e) => handleDropReorder(e, idx)}
                    onDragOver={handleDragOver}
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative group cursor-pointer rounded-3xl transition-all ${
                      selectedIndex === idx 
                        ? 'ring-4 ring-primary ring-offset-4 ring-offset-slate-50 dark:ring-offset-[#0B1120] z-10' 
                        : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700'
                    }`}
                  >
                    {/* ACCIONES FLOTANTES */}
                    {selectedIndex === idx && (
                      <div className="absolute -top-4 -right-4 flex bg-slate-800 text-white rounded-xl shadow-xl overflow-hidden z-20">
                        <button onClick={(e) => { e.stopPropagation(); movePiece(idx, -1); }} className="p-2 hover:bg-slate-700"><ArrowUp size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); movePiece(idx, 1); }} className="p-2 hover:bg-slate-700"><ArrowDown size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); removePiece(idx); }} className="p-2 hover:bg-red-500 text-red-300 hover:text-white"><Trash2 size={16} /></button>
                      </div>
                    )}
                    
                    {/* VISTA PREVIA REAL (El Motor Lego de verdad) */}
                    <div className="pointer-events-none">
                      <LegoEngine dna={{ moduleId: piece.id, name: '', layout: [piece] }} customData={{}} />
                    </div>

                    {/* DRAG HANDLE VISUAL */}
                    <div className="absolute inset-y-0 left-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-black/5 to-transparent rounded-l-3xl">
                      <LayoutGrid size={16} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: INSPECTOR */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Settings size={16} /> Inspector
            </h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {!selectedPiece ? (
              <div className="text-center text-slate-400 mt-10">
                <Type size={32} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium text-sm">Selecciona una pieza<br/>en el lienzo para editarla</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="font-black text-lg text-foreground">{CATALOG.find(c => c.type === selectedPiece.type)?.name || selectedPiece.type}</h4>
                  <p className="text-xs text-slate-500 font-medium">Configuración de Componente</p>
                </div>
                
                {selectedPiece.isLocked ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-600 dark:text-amber-400">
                    <h5 className="font-bold mb-1 flex items-center gap-2"><Lock size={16} /> Bloqueo Fiscal / Legal</h5>
                    <p className="text-xs font-medium">Esta pieza contiene reglas de homologación y su configuración interna no puede ser modificada para garantizar el cumplimiento legal.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Título Visual</label>
                      <input 
                        type="text" 
                        value={selectedPiece.config.title || ''}
                        onChange={(e) => updateConfig('title', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-medium text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="Ej: Últimas Ventas"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Tamaño en Pantalla</label>
                      <select
                        value={selectedPiece.colSpan || 12}
                        onChange={(e) => {
                          const newLayout = [...layout];
                          newLayout[selectedIndex!].colSpan = Number(e.target.value);
                          setLayout(newLayout);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-medium text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
                      >
                        <option value={12}>Ancho Completo (100%)</option>
                        <option value={6}>Mitad de Pantalla (50%)</option>
                        <option value={4}>Tercio (33%)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
