import React, { useEffect, useState } from 'react';
import { LegoModuleDNA, LegoPieceDNA } from '@/types/lego';
import { StatGrid } from './StatGrid';
import { ListFeed } from './ListFeed';

interface LegoEngineProps {
  dna: LegoModuleDNA;
  customData?: Record<string, any[]>;
  onPieceAction?: (pieceId: string, item: any) => void;
}

// Simulador del StorageModule (Base de Datos en Memoria)
const mockDatabase: Record<string, any[]> = {
  'crm-clients': [
    { id: 1, name: 'Juan Pérez', phone: '+58 414 1234567', debt: 150.00, status: 'Activo' },
    { id: 2, name: 'Taller Los Hermanos', phone: '+58 412 9876543', debt: 0.00, status: 'Al día' },
    { id: 3, name: 'Ana Silva', phone: '+58 424 5556677', debt: 45.50, status: 'Pendiente' },
  ],
  'crm-stats-mock': [
    { dummy: true } // El stat-grid lee config, solo necesita un array no vacío para quitar el loading
  ],
  'inv-products': [
    { id: 1, name: 'Filtro de Aceite X1', sku: 'FLT-001', price: 15.50, stock: 45 },
    { id: 2, name: 'Batería 12V 700A', sku: 'BAT-12V', price: 120.00, stock: 8 },
    { id: 3, name: 'Bujía Iridium', sku: 'BUJ-IR', price: 8.00, stock: 120 },
  ],
  'inv-stats-mock': [{ dummy: true }],
  'tickets-stats-mock': [{ dummy: true }],
  'tickets-data': [
    { id: 1, title: 'Revisión Frenos', client: 'Juan Pérez', amount: 85.00, status: 'En Proceso' },
    { id: 2, title: 'Cambio de Aceite', client: 'Ana Silva', amount: 45.00, status: 'Pendiente' },
  ],
  'acc-stats-mock': [{ dummy: true }],
  'acc-journal-mock': [
    { id: 1, account: 'CAJA', ref: 'SALE-123', amount: 45.00, type: 'DEBIT' },
    { id: 2, account: 'INGRESO_VENTAS', ref: 'SALE-123', amount: 45.00, type: 'CREDIT' },
  ],
  'cal-stats-mock': [{ dummy: true }],
  'cal-events-mock': [
    { id: 1, title: 'Mantenimiento Preventivo', time: '09:00 AM', client: 'Carlos Gomez', status: 'Confirmado' },
    { id: 2, title: 'Revisión General', time: '11:30 AM', client: 'María Lopez', status: 'Pendiente' },
  ],
  'wa-stats-mock': [{ dummy: true }],
  'wa-queue-mock': [
    { id: 1, client: 'Juan Pérez', phone: '+58 414 123', type: 'Recordatorio Cita', status: 'Enviado' },
    { id: 2, client: 'Ana Silva', phone: '+58 424 555', type: 'Factura PDF', status: 'En Cola' },
  ],
  'cfg-options-mock': [
    { id: 1, setting: 'Moneda Base', desc: 'Moneda principal del sistema', value: 'USD ($)', status: 'Activo' },
    { id: 2, title: 'WhatsApp API', desc: 'Conexión con Meta', value: 'Conectado', status: 'Activo' },
    { id: 3, setting: 'Acceso Remoto a Soporte', desc: 'SaaSCore Support Mode', value: 'Bloqueado', status: 'Inactivo (Generar Token)' },
  ],
  'team-stats-mock': [{ dummy: true }],
  'team-list-mock': [
    { id: 1, name: 'Roberto Díaz', role: 'Mecánico Jefe', salary: 1200.00, status: 'Activo' },
    { id: 2, name: 'Laura Martínez', role: 'Atención Cliente', salary: 800.00, status: 'Activo' },
  ],
  'pur-stats-mock': [{ dummy: true }],
  'pur-orders-mock': [
    { id: 1, supplier: 'AutoParts Express', orderId: 'ORD-991', total: 1540.00, status: 'En Tránsito' },
    { id: 2, supplier: 'Lubricantes Global', orderId: 'ORD-992', total: 450.00, status: 'Entregado' },
  ],
  'fran-stats-mock': [{ dummy: true }],
  'fran-branches-mock': [
    { id: 1, name: 'Sucursal Norte', manager: 'Luis Gómez', revenue: 84000.00, status: 'Operativa' },
    { id: 2, name: 'Sucursal Sur', manager: 'Ana Torres', revenue: 70200.00, status: 'Operativa' },
  ],
  'int-apps-mock': [
    { id: 1, app: 'Zapier', desc: 'Automatización de Flujos', status: 'Conectado' },
    { id: 2, app: 'FCM Push', desc: 'Notificaciones Móviles', status: 'Inactivo' },
    { id: 3, app: 'ETL Data', desc: 'Importación Excel/CSV', status: 'Listo' },
  ]
};

export const LegoEngine: React.FC<LegoEngineProps> = ({ dna, customData, onPieceAction }) => {
  const [moduleData, setModuleData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const dataMap: Record<string, any[]> = {};
    
    if (dna && dna.layout) {
      for (const piece of dna.layout) {
        if (piece.dataSource) {
          // Si nos pasan customData lo usamos, de lo contrario usamos el mockDatabase
          if (customData && customData[piece.dataSource]) {
            dataMap[piece.id] = customData[piece.dataSource];
          } else {
            dataMap[piece.id] = mockDatabase[piece.dataSource] || [];
          }
        }
      }
    }
    
    setModuleData(dataMap);
  }, [dna, customData]);

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
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mt-1">SaaSCore OS Modular Engine</p>
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
