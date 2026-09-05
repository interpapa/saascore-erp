import React, { useState } from 'react';
import { LegoModuleDNA, LegoPieceDNA } from '@/types/lego';
import { StatGrid } from './StatGrid';
import { ListFeed } from './ListFeed';

interface LegoEngineProps {
  dna: LegoModuleDNA;
  customData?: Record<string, unknown[]>;
  onPieceAction?: (pieceId: string, item: unknown) => void;
}

export const LegoEngine: React.FC<LegoEngineProps> = ({ dna, customData, onPieceAction }) => {
const [moduleData] = useState<Record<string, unknown[]>>(() => {
  const dataMap: Record<string, unknown[]> = {};
  if (dna && dna.layout) {
    for (const piece of dna.layout) {
      if (piece.dataSource) {
        dataMap[piece.id] = (customData && customData[piece.dataSource])
          ? customData[piece.dataSource]
          : piece.type === 'stat-grid'
          ? [{ dummy: true }]
          : [];
      }
    }
  }
  return dataMap;
});

  const renderPiece = (piece: LegoPieceDNA) => {
    const data = moduleData[piece.id] || [];

    switch (piece.type) {
      case 'stat-grid':
        return <StatGrid key={piece.id} dna={piece} data={data} />;
      case 'list-feed':
        return <ListFeed key={piece.id} dna={piece} data={data} onRowClick={onPieceAction ? (item) => onPieceAction(piece.id, item) : undefined} />;
      default:
        return (
          <div key={piece.id} className="p-6 border-2 border-dashed border-red-200 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
            <p className="font-bold text-sm">Bloque Lego Desconocido: {piece.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full p-4 md:p-8 animate-in fade-in duration-200">
      <div className="max-w-6xl mx-auto w-full">
        {/* Cabecera del Módulo */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground tracking-tight">{dna.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mt-1">Rendo OS Modular Engine</p>
        </div>

        {/* Bento Grid Layout (Lego Canvas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dna.layout.map((piece) => (
            <div key={piece.id} className={`${piece.span === 'full' ? 'md:col-span-2' : 'md:col-span-1'} flex flex-col min-h-[300px]`}>
              {renderPiece(piece)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
